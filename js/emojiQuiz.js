// Emoji 猜电影名游戏模块
(function(){

  // ============ 工具函数 ============

  // 格式化时间戳为具体时间
  window.formatDateTime = function(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // 标准化答案（去空格、转小写）
  window.normalizeAnswer = function(text) {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/\s+/g, '');
  };

  // 兼容国旗/肤色/ZWJ 组合的 emoji 匹配（包含非强制呈现的 Emoji 字符）
  // 兼容：国旗、ZWJ 组合、肤色、keycap（数字/#/* + 20E3）、tag 序列（如国旗/海盗旗）
  const EMOJI_SEQUENCE_REGEX = /(?:\p{Regional_Indicator}{2}|[\u0023\u002A\u0030-\u0039]\uFE0F?\u20E3|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|(?:\p{Extended_Pictographic}|\p{Emoji})(?:\uFE0E|\uFE0F)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji})(?:\uFE0E|\uFE0F)?)*|(?:\p{Extended_Pictographic}|\p{Emoji})(?:\uFE0E|\uFE0F)?[\uE0020-\uE007E]+\uE007F)/gu;

  function getEmojiMatches(text) {
    if (!text) return [];
    return text.match(EMOJI_SEQUENCE_REGEX) || [];
  }

  // 校验是否为 emoji（单个序列）
  function isEmoji(char) {
    const matches = getEmojiMatches(char);
    return matches.length === 1 && matches[0] === char;
  }

  // 计算 emoji 数量（按序列统计，支持 ZWJ/国旗）
  function countEmojis(text) {
    return getEmojiMatches(text).length;
  }

  // 预处理输入：去除零宽字符/不可见空白
  function normalizeEmojiInput(text) {
    if (!text) return '';
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 去掉零宽空格/连接符/换行标记
      .replace(/\u00A0/g, ' ') // NBSP 转普通空格
      .trim();
  }

  // 校验 emoji 输入（1-6个emoji）
  window.validateEmojiInput = function(text) {
    const normalized = normalizeEmojiInput(text);
    if (!normalized) {
      return { valid: false, message: '请输入emoji' };
    }

    const count = countEmojis(normalized);
    if (count === 0) {
      return { valid: false, message: '请输入有效的emoji' };
    }
    if (count > 6) {
      return { valid: false, message: 'emoji数量不能超过6个' };
    }

    // 检查是否只包含emoji（允许空格）
    const cleaned = normalized.replace(EMOJI_SEQUENCE_REGEX, '').replace(/\s/g, '');
    if (cleaned.length > 0) {
      return { valid: false, message: '只允许输入emoji' };
    }

    return { valid: true, count: count };
  };

  // ============ Firestore 操作 ============

  // 获取未解决题目数量（包含自己出的题目）
  window.getOpenPuzzlesCount = async function() {
    try {
      if (!window.currentUser) return 0;

      const db = firebase.firestore();
      const snapshot = await db.collection('puzzles')
        .where('is_deleted', '==', false)
        .where('status', '==', 'open')
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('获取题目数量失败:', error);
      return 0;
    }
  };

  // 发布新题目
  window.publishPuzzle = async function(puzzleData) {
    try {
      if (!window.currentUser) {
        throw new Error('请先登录');
      }

      const db = firebase.firestore();
      const puzzleRef = db.collection('puzzles').doc();
      const userStatsRef = db.collection('user_stats').doc(window.currentUser.id);

      // 使用 transaction 确保原子性
      await db.runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(userStatsRef);

        // 创建题目
        const docData = {
          author_id: window.currentUser.id,
          author_name: window.currentUser.nickname,
          author_avatar_url: window.currentUser.avatar || '',
          emoji_text: puzzleData.emoji_text,
          emoji_count: countEmojis(puzzleData.emoji_text),
          answer_display: puzzleData.answer_display,
          answer_norm: normalizeAnswer(puzzleData.answer_display),
          status: 'open',
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          solved_at: null,
          solved_by_user_id: null,
          solved_by_user_name: null,
          solved_by_user_avatar_url: null,
          solved_answer_text: null,
          is_deleted: false,
          deleted_at: null
        };
        transaction.set(puzzleRef, docData);

        // 更新出题人的 user_stats（新增 puzzle_created_count）
        if (statsDoc.exists) {
          transaction.update(userStatsRef, {
            puzzle_created_count: firebase.firestore.FieldValue.increment(1),
            user_name: window.currentUser.nickname,
            user_avatar_url: window.currentUser.avatar || '',
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(userStatsRef, {
            user_id: window.currentUser.id,
            user_name: window.currentUser.nickname,
            user_avatar_url: window.currentUser.avatar || '',
            correct_guess_count: 0,
            puzzle_created_count: 1,
            puzzle_solved_count: 0,
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      return { success: true, id: puzzleRef.id };
    } catch (error) {
      console.error('发布题目失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 获取题目列表
  window.getPuzzlesList = async function() {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('puzzles')
        .where('is_deleted', '==', false)
        .orderBy('created_at', 'desc')
        .get();

      const puzzles = [];
      snapshot.forEach(doc => {
        puzzles.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return puzzles;
    } catch (error) {
      console.error('获取题目列表失败:', error);
      return [];
    }
  };

  // 猜题（带 transaction 锁定）
  window.guessPuzzle = async function(puzzleId, guessText) {
    try {
      if (!window.currentUser) {
        throw new Error('请先登录');
      }

      const db = firebase.firestore();
      const puzzleRef = db.collection('puzzles').doc(puzzleId);
      const guesserStatsRef = db.collection('user_stats').doc(window.currentUser.id);

      const result = await db.runTransaction(async (transaction) => {
        // 读取所需文档（全部读取完成后再进行任何写操作）
        const puzzleDoc = await transaction.get(puzzleRef);
        const guesserStatsDoc = await transaction.get(guesserStatsRef);

        if (!puzzleDoc.exists) {
          throw new Error('题目不存在');
        }

        const puzzleData = puzzleDoc.data();

        // 作者不能猜自己的题目
        if (puzzleData.author_id === window.currentUser.id) {
          return { success: false, isAuthor: true };
        }

        // 检查是否已被解答
        if (puzzleData.status === 'solved') {
          return {
            success: false,
            alreadySolved: true,
            solverInfo: {
              name: puzzleData.solved_by_user_name,
              avatar: puzzleData.solved_by_user_avatar_url,
              answer: puzzleData.solved_answer_text || puzzleData.answer_display,
              solvedAt: puzzleData.solved_at
            }
          };
        }

        // 检查答案是否正确
        const guessNorm = normalizeAnswer(guessText);
        const correctNorm = puzzleData.answer_norm;

        if (guessNorm !== correctNorm) {
          return { success: false, incorrect: true };
        }

        // 读取出题人的统计文档（在任何写入前完成所有读取）
        const authorStatsRef = db.collection('user_stats').doc(puzzleData.author_id);
        const authorStatsDoc = await transaction.get(authorStatsRef);

        // 答案正确，更新为 solved
        transaction.update(puzzleRef, {
          status: 'solved',
          solved_at: firebase.firestore.FieldValue.serverTimestamp(),
          solved_by_user_id: window.currentUser.id,
          solved_by_user_name: window.currentUser.nickname,
          solved_by_user_avatar_url: window.currentUser.avatar || '',
          solved_answer_text: guessText
        });

        // 更新猜题者的 correct_guess_count
        if (guesserStatsDoc.exists) {
          transaction.update(guesserStatsRef, {
            correct_guess_count: firebase.firestore.FieldValue.increment(1),
            user_name: window.currentUser.nickname,
            user_avatar_url: window.currentUser.avatar || '',
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(guesserStatsRef, {
            user_id: window.currentUser.id,
            user_name: window.currentUser.nickname,
            user_avatar_url: window.currentUser.avatar || '',
            correct_guess_count: 1,
            puzzle_created_count: 0,
            puzzle_solved_count: 0,
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        // 读取并更新出题人的 puzzle_solved_count（新增）
        if (authorStatsDoc.exists) {
          transaction.update(authorStatsRef, {
            puzzle_solved_count: firebase.firestore.FieldValue.increment(1),
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(authorStatsRef, {
            user_id: puzzleData.author_id,
            user_name: puzzleData.author_name,
            user_avatar_url: puzzleData.author_avatar_url || '',
            correct_guess_count: 0,
            puzzle_created_count: 0,
            puzzle_solved_count: 1,
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        return { success: true };
      });

      return result;
    } catch (error) {
      console.error('猜题失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 删除题目（仅限 open 状态）
  window.deletePuzzle = async function(puzzleId) {
    try {
      if (!window.currentUser) {
        throw new Error('请先登录');
      }

      const db = firebase.firestore();
      const puzzleRef = db.collection('puzzles').doc(puzzleId);
      const userStatsRef = db.collection('user_stats').doc(window.currentUser.id);

      // 使用 transaction 确保原子性
      await db.runTransaction(async (transaction) => {
        const puzzleDoc = await transaction.get(puzzleRef);
        const statsDoc = await transaction.get(userStatsRef);

        if (!puzzleDoc.exists) {
          throw new Error('题目不存在');
        }

        const puzzleData = puzzleDoc.data();

        // 检查权限
        if (puzzleData.author_id !== window.currentUser.id) {
          throw new Error('只能删除自己的题目');
        }

        // 检查状态
        if (puzzleData.status !== 'open') {
          throw new Error('已被猜出的题目不可删除');
        }

        // 软删除题目
        transaction.update(puzzleRef, {
          is_deleted: true,
          deleted_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 减少出题人的 puzzle_created_count（新增）
        if (statsDoc.exists) {
          transaction.update(userStatsRef, {
            puzzle_created_count: firebase.firestore.FieldValue.increment(-1),
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      return { success: true };
    } catch (error) {
      console.error('删除题目失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 获取猜对榜（原有排行榜）
  window.getLeaderboard = async function(limit = 20) {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('user_stats')
        .orderBy('correct_guess_count', 'desc')
        .limit(limit)
        .get();

      const leaderboard = [];
      snapshot.forEach(doc => {
        leaderboard.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return leaderboard;
    } catch (error) {
      console.error('获取排行榜失败:', error);
      return [];
    }
  };

  // 获取影响力排行榜（新增）
  window.getInfluenceLeaderboard = async function(limit = 20) {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('user_stats').get();

      const leaderboard = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const puzzleCreated = data.puzzle_created_count || 0;
        const puzzleSolved = data.puzzle_solved_count || 0;

        // 加权公式：出题数 * 1 + 被猜对数 * 2
        const influenceScore = puzzleCreated * 1 + puzzleSolved * 2;

        leaderboard.push({
          id: doc.id,
          ...data,
          influenceScore: influenceScore
        });
      });

      // 按影响力得分降序排序，取前 limit 条
      leaderboard.sort((a, b) => b.influenceScore - a.influenceScore);
      return leaderboard.slice(0, limit);
    } catch (error) {
      console.error('获取影响力排行榜失败:', error);
      return [];
    }
  };

  // ============ 数据迁移工具（一次性执行）============

  /**
   * 迁移历史题目数据到 user_stats
   * 统计每个用户的历史出题数和被猜对数
   *
   * 使用方法：在浏览器控制台执行 migrateHistoricalPuzzleData()
   */
  window.migrateHistoricalPuzzleData = async function() {
    try {
      console.log('[迁移] 开始迁移历史题目数据...');

      const db = firebase.firestore();

      // 1. 获取所有题目（包括已删除的，因为需要统计历史）
      const puzzlesSnapshot = await db.collection('puzzles').get();

      // 2. 统计每个用户的出题数和被猜对数
      const userStats = {}; // { userId: { created: 0, solved: 0 } }

      puzzlesSnapshot.forEach(doc => {
        const puzzle = doc.data();
        const authorId = puzzle.author_id;

        if (!authorId) return;

        // 初始化用户统计
        if (!userStats[authorId]) {
          userStats[authorId] = {
            created: 0,
            solved: 0,
            user_name: puzzle.author_name,
            user_avatar_url: puzzle.author_avatar_url || ''
          };
        }

        // 统计出题数（不包括已删除的）
        if (!puzzle.is_deleted) {
          userStats[authorId].created += 1;
        }

        // 统计被猜对数
        if (puzzle.status === 'solved' && !puzzle.is_deleted) {
          userStats[authorId].solved += 1;
        }
      });

      console.log(`[迁移] 统计完成，共 ${Object.keys(userStats).length} 个用户需要更新`);

      // 3. 批量更新 user_stats（使用 batch 提高效率）
      const batch = db.batch();
      let updateCount = 0;

      for (const [userId, stats] of Object.entries(userStats)) {
        const userStatsRef = db.collection('user_stats').doc(userId);

        // 获取现有数据
        const existingDoc = await userStatsRef.get();

        if (existingDoc.exists) {
          // 更新现有记录
          batch.update(userStatsRef, {
            puzzle_created_count: stats.created,
            puzzle_solved_count: stats.solved,
            user_name: stats.user_name,
            user_avatar_url: stats.user_avatar_url,
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // 创建新记录
          batch.set(userStatsRef, {
            user_id: userId,
            user_name: stats.user_name,
            user_avatar_url: stats.user_avatar_url,
            correct_guess_count: 0,
            puzzle_created_count: stats.created,
            puzzle_solved_count: stats.solved,
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        updateCount++;

        // Firestore batch 最多 500 个操作，需要分批提交
        if (updateCount % 500 === 0) {
          await batch.commit();
          console.log(`[迁移] 已提交 ${updateCount} 条更新`);
        }
      }

      // 提交剩余的更新
      if (updateCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`[迁移] ✅ 迁移完成！共更新 ${updateCount} 个用户的数据`);
      console.log('[迁移] 详细统计:', userStats);

      return {
        success: true,
        userCount: updateCount,
        details: userStats
      };

    } catch (error) {
      console.error('[迁移] ❌ 迁移失败:', error);
      return { success: false, error: error.message };
    }
  };

})();
