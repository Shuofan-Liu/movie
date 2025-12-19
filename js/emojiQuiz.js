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

  // 校验是否为 emoji
  function isEmoji(char) {
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    return emojiRegex.test(char);
  }

  // 计算 emoji 数量
  function countEmojis(text) {
    if (!text) return 0;
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
  }

  // 校验 emoji 输入（1-6个emoji）
  window.validateEmojiInput = function(text) {
    if (!text || text.trim() === '') {
      return { valid: false, message: '请输入emoji' };
    }

    const count = countEmojis(text);
    if (count === 0) {
      return { valid: false, message: '请输入有效的emoji' };
    }
    if (count > 6) {
      return { valid: false, message: 'emoji数量不能超过6个' };
    }

    // 检查是否只包含emoji（允许空格）
    const cleaned = text.replace(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)/gu, '');
    if (cleaned.length > 0) {
      return { valid: false, message: '只允许输入emoji' };
    }

    return { valid: true, count: count };
  };

  // ============ Firestore 操作 ============

  // 获取未解决题目数量
  window.getOpenPuzzlesCount = async function() {
    try {
      const db = firebase.firestore();
      const query = db.collection('puzzles')
        .where('is_deleted', '==', false)
        .where('status', '==', 'open');

      // 使用 getCountFromServer 如果可用（Firebase 9.6+）
      if (typeof query.count === 'function') {
        const snapshot = await query.count().get();
        return snapshot.data().count;
      } else {
        // 降级方案：限制50条统计
        const snapshot = await query.limit(50).get();
        return snapshot.size;
      }
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

      const docRef = await db.collection('puzzles').add(docData);
      return { success: true, id: docRef.id };
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

      const result = await db.runTransaction(async (transaction) => {
        const puzzleDoc = await transaction.get(puzzleRef);

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

        // 答案正确，更新为 solved
        transaction.update(puzzleRef, {
          status: 'solved',
          solved_at: firebase.firestore.FieldValue.serverTimestamp(),
          solved_by_user_id: window.currentUser.id,
          solved_by_user_name: window.currentUser.nickname,
          solved_by_user_avatar_url: window.currentUser.avatar || '',
          solved_answer_text: guessText
        });

        // 同步更新用户统计（方案A）
        const userStatsRef = db.collection('user_stats').doc(window.currentUser.id);
        const statsDoc = await transaction.get(userStatsRef);

        if (statsDoc.exists) {
          transaction.update(userStatsRef, {
            correct_guess_count: firebase.firestore.FieldValue.increment(1),
            user_name: window.currentUser.nickname,
            user_avatar_url: window.currentUser.avatar || '',
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.set(userStatsRef, {
            user_id: window.currentUser.id,
            user_name: window.currentUser.nickname,
            user_avatar_url: window.currentUser.avatar || '',
            correct_guess_count: 1,
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
      const puzzleDoc = await puzzleRef.get();

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

      // 软删除
      await puzzleRef.update({
        is_deleted: true,
        deleted_at: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('删除题目失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 获取排行榜
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

})();
