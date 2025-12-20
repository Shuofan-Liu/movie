// 剧照猜电影名游戏数据层
(function(){
  const GRID_ROWS = 3;
  const GRID_COLS = 4;
  const GRID_SIZE = GRID_ROWS * GRID_COLS;

  function countTrue(list) {
    return Array.isArray(list) ? list.filter(Boolean).length : 0;
  }

  function validateGrid(revealed) {
    if (!Array.isArray(revealed) || revealed.length !== GRID_SIZE) {
      return { valid: false, message: '网格长度需要 12 个布尔值' };
    }
    if (countTrue(revealed) < 3) {
      return { valid: false, message: '至少揭晓 3 个格子' };
    }
    return { valid: true };
  }

  // 获取未解决题目数量（剧照玩法，包含自己出的题目）
  window.getStillOpenPuzzlesCount = async function() {
    try {
      if (!window.currentUser) return 0;
      const db = firebase.firestore();
      const snapshot = await db.collection('still_puzzles')
        .where('is_deleted', '==', false)
        .where('status', '==', 'open')
        .get();
      return snapshot.size;
    } catch (err) {
      console.error('获取 still 题目数量失败:', err);
      return 0;
    }
  };

  // 发布剧照题目
  window.publishStillPuzzle = async function(puzzleData) {
    try {
      if (!window.currentUser) throw new Error('请先登录');
      const gridValid = validateGrid(puzzleData.grid_revealed);
      if (!gridValid.valid) throw new Error(gridValid.message);
      const db = firebase.firestore();
      const puzzleRef = puzzleData.id
        ? db.collection('still_puzzles').doc(puzzleData.id)
        : db.collection('still_puzzles').doc();
      const userStatsRef = db.collection('still_user_stats').doc(window.currentUser.id);

      await db.runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(userStatsRef);
        const docData = {
          author_id: window.currentUser.id,
          author_name: window.currentUser.nickname,
          author_avatar_url: window.currentUser.avatar || '',
          image_url: puzzleData.image_url,
          thumb_url: puzzleData.thumb_url,
          grid_revealed: puzzleData.grid_revealed,
          grid_rows: GRID_ROWS,
          grid_cols: GRID_COLS,
          hint: puzzleData.hint || '',
          answer_display: puzzleData.answer_display,
          answer_norm: window.normalizeAnswer(puzzleData.answer_display),
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
    } catch (err) {
      console.error('发布剧照题目失败:', err);
      return { success: false, error: err.message };
    }
  };

  // 获取剧照题目列表
  window.getStillPuzzlesList = async function() {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('still_puzzles')
        .where('is_deleted', '==', false)
        .orderBy('created_at', 'desc')
        .get();
      const puzzles = [];
      snapshot.forEach(doc => puzzles.push({ id: doc.id, ...doc.data() }));
      return puzzles;
    } catch (err) {
      console.error('获取剧照题目列表失败:', err);
      return [];
    }
  };

  // 猜剧照题
  window.guessStillPuzzle = async function(puzzleId, guessText) {
    try {
      if (!window.currentUser) throw new Error('请先登录');
      const db = firebase.firestore();
      const puzzleRef = db.collection('still_puzzles').doc(puzzleId);
      const guesserStatsRef = db.collection('still_user_stats').doc(window.currentUser.id);

      const result = await db.runTransaction(async (transaction) => {
        const puzzleDoc = await transaction.get(puzzleRef);
        const guesserStatsDoc = await transaction.get(guesserStatsRef);
        if (!puzzleDoc.exists) throw new Error('题目不存在');
        const puzzleData = puzzleDoc.data();

        if (puzzleData.author_id === window.currentUser.id) {
          return { success: false, isAuthor: true };
        }
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

        const guessNorm = window.normalizeAnswer(guessText);
        const correctNorm = puzzleData.answer_norm;
        if (guessNorm !== correctNorm) {
          return { success: false, incorrect: true };
        }

        // 读取作者统计
        const authorStatsRef = db.collection('still_user_stats').doc(puzzleData.author_id);
        const authorStatsDoc = await transaction.get(authorStatsRef);

        transaction.update(puzzleRef, {
          status: 'solved',
          solved_at: firebase.firestore.FieldValue.serverTimestamp(),
          solved_by_user_id: window.currentUser.id,
          solved_by_user_name: window.currentUser.nickname,
          solved_by_user_avatar_url: window.currentUser.avatar || '',
          solved_answer_text: guessText
        });

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
    } catch (err) {
      console.error('猜剧照题失败:', err);
      return { success: false, error: err.message };
    }
  };

  // 删除剧照题（仅 open）
  window.deleteStillPuzzle = async function(puzzleId) {
    try {
      if (!window.currentUser) throw new Error('请先登录');
      const db = firebase.firestore();
      const puzzleRef = db.collection('still_puzzles').doc(puzzleId);
      const userStatsRef = db.collection('still_user_stats').doc(window.currentUser.id);

      await db.runTransaction(async (transaction) => {
        const puzzleDoc = await transaction.get(puzzleRef);
        const statsDoc = await transaction.get(userStatsRef);
        if (!puzzleDoc.exists) throw new Error('题目不存在');
        const puzzleData = puzzleDoc.data();
        if (puzzleData.author_id !== window.currentUser.id) {
          throw new Error('只能删除自己的题目');
        }
        if (puzzleData.status !== 'open') {
          throw new Error('已被猜出的题目不可删除');
        }

        transaction.update(puzzleRef, {
          is_deleted: true,
          deleted_at: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (statsDoc.exists) {
          transaction.update(userStatsRef, {
            puzzle_created_count: firebase.firestore.FieldValue.increment(-1),
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      return { success: true };
    } catch (err) {
      console.error('删除剧照题失败:', err);
      return { success: false, error: err.message };
    }
  };

  // 猜对榜
  window.getStillLeaderboard = async function(limit = 20) {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('still_user_stats')
        .orderBy('correct_guess_count', 'desc')
        .limit(limit)
        .get();
      const leaderboard = [];
      snapshot.forEach(doc => leaderboard.push({ id: doc.id, ...doc.data() }));
      return leaderboard;
    } catch (err) {
      console.error('获取剧照榜失败:', err);
      return [];
    }
  };

  // 影响力榜
  window.getStillInfluenceLeaderboard = async function(limit = 20) {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('still_user_stats').get();
      const leaderboard = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const puzzleCreated = data.puzzle_created_count || 0;
        const puzzleSolved = data.puzzle_solved_count || 0;
        const influenceScore = puzzleCreated * 1 + puzzleSolved * 2;
        leaderboard.push({
          id: doc.id,
          ...data,
          influenceScore
        });
      });
      leaderboard.sort((a, b) => b.influenceScore - a.influenceScore);
      return leaderboard.slice(0, limit);
    } catch (err) {
      console.error('获取剧照影响力榜失败:', err);
      return [];
    }
  };

})();
