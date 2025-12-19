// Emoji 猜电影名游戏 UI 模块
(function(){

  let currentRandomTitle = '';
  let currentPuzzle = null; // 当前正在查看的题目

  // ============ 初始化 ============

  window.initEmojiQuizUI = async function() {
    // 初始化emoji输入校验
    const emojiInput = document.getElementById('emojiInput');
    if (emojiInput) {
      emojiInput.addEventListener('input', validateEmojiInputUI);
    }

    // 更新badge数字
    await updateHallBadge();

    // 定期更新badge（每30秒）
    setInterval(updateHallBadge, 30000);
  };

  // ============ Task 1: 更新大厅badge数字 ============

  async function updateHallBadge() {
    if (!window.currentUser) return;

    const count = await window.getOpenPuzzlesCount();
    const badgeEl = document.getElementById('emojiHallBadge');
    if (badgeEl) {
      badgeEl.textContent = count;
      badgeEl.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  // ============ Task 2: 出题页 ============

  window.showEmojiCreatePage = function() {
    if (!window.currentUser) {
      showToast('请先登录', 'warn');
      return;
    }

    document.getElementById('emojiCreateOverlay').style.display = 'flex';

    // 显示随机电影名
    refreshRandomTitle();

    // 重置输入框
    document.getElementById('customTitleInput').value = '';
    document.getElementById('emojiInput').value = '';
    document.getElementById('emojiValidationMsg').textContent = '';
    document.getElementById('publishPuzzleBtn').disabled = true;
    document.getElementById('publishPuzzleBtn').style.opacity = '0.5';
  };

  window.closeEmojiCreatePage = function() {
    document.getElementById('emojiCreateOverlay').style.display = 'none';
  };

  window.refreshRandomTitle = function() {
    currentRandomTitle = window.getRandomMovieTitle();
    document.getElementById('randomTitleDisplay').textContent = currentRandomTitle;
  };

  function validateEmojiInputUI() {
    const emojiText = document.getElementById('emojiInput').value;
    const validation = window.validateEmojiInput(emojiText);
    const msgEl = document.getElementById('emojiValidationMsg');
    const btnEl = document.getElementById('publishPuzzleBtn');

    if (validation.valid) {
      msgEl.textContent = `✓ ${validation.count}个emoji`;
      msgEl.style.color = 'var(--avatar-border-color)';
      btnEl.disabled = false;
      btnEl.style.opacity = '1';
    } else {
      msgEl.textContent = validation.message;
      msgEl.style.color = '#ff4444';
      btnEl.disabled = true;
      btnEl.style.opacity = '0.5';
    }
  }

  window.publishPuzzleUI = async function() {
    const customTitle = document.getElementById('customTitleInput').value.trim();
    const answerDisplay = customTitle || currentRandomTitle;
    const emojiText = document.getElementById('emojiInput').value.trim();

    if (!answerDisplay) {
      showToast('请选择或输入电影名', 'warn');
      return;
    }

    const validation = window.validateEmojiInput(emojiText);
    if (!validation.valid) {
      showToast(validation.message, 'warn');
      return;
    }

    // 显示加载
    showLoading('发布中...');

    // 调用后端发布逻辑（emojiQuiz.js）
    const result = await window.publishPuzzle({
      emoji_text: emojiText,
      answer_display: answerDisplay
    });

    hideLoading();

    if (result.success) {
      showToast('发布成功！', 'success', '!');
      closeEmojiCreatePage();
      // 更新badge
      await updateHallBadge();
    } else {
      showToast('发布失败: ' + (result.error || '未知错误'), 'error');
    }
  };

  // ============ Task 3: 大厅列表页 ============

  window.showEmojiHallPage = async function() {
    if (!window.currentUser) {
      showToast('请先登录', 'warn');
      return;
    }

    document.getElementById('emojiHallOverlay').style.display = 'flex';

    // 加载题目列表
    await loadPuzzlesList();
  };

  window.closeEmojiHallPage = function() {
    document.getElementById('emojiHallOverlay').style.display = 'none';
  };

  async function loadPuzzlesList() {
    showLoading('加载中...');

    const puzzles = await window.getPuzzlesList();

    hideLoading();

    const listEl = document.getElementById('emojiHallList');
    if (!listEl) return;

    if (puzzles.length === 0) {
      listEl.innerHTML = '<div style="text-align:center; padding:60px 20px; color:#888; font-size:16px;">暂无题目</div>';
      return;
    }

    listEl.innerHTML = puzzles.map(puzzle => `
      <div class="emoji-hall-item" onclick="showPuzzleDetail('${puzzle.id}')" style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s ease;">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
          ${renderAvatarInline(puzzle.author_avatar_url, puzzle.author_name, 45, 22)}
          <div style="flex: 1;">
            <div style="font-size: 16px; font-weight: 600; color: var(--avatar-border-color); margin-bottom: 4px; transition: color 2s ease;">${puzzle.author_name}</div>
            <div style="font-size: 13px; color: #888;">${window.formatDateTime(puzzle.created_at)}</div>
          </div>
          ${puzzle.status === 'solved' ? `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="var(--avatar-border-color)" style="width: 28px; height: 28px; transition: fill 2s ease;">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          ` : ''}
        </div>
        <div style="font-size: 48px; text-align: center; margin: 20px 0; line-height: 1.2;">${puzzle.emoji_text}</div>
        <div style="text-align: center; color: #aaa; font-size: 13px;">${puzzle.emoji_count}个emoji</div>
      </div>
    `).join('');
  }

  function getDefaultAvatar(name) {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  // 统一轻量提示（替代 alert），跟随站内主题
  function showToast(message, type = 'info', icon) {
    if (window.showInlineAlert) {
      if (icon && window.showBadgeToast && type === 'success') {
        window.showBadgeToast(message, icon);
      } else {
        window.showInlineAlert(message, type);
      }
    } else {
      alert(message);
    }
  }

  // 统一确认对话（替代 confirm）
  function showConfirmDialogSafe(options) {
    if (window.showConfirmDialog) {
      return window.showConfirmDialog(options);
    }
    return Promise.resolve(confirm(options.message || '确认操作？'));
  }

  // 头像渲染：优先使用全局 renderAvatar，兼容 avatar 对象/字符串
  function renderAvatarInline(avatarData, nickname, size = 45, fontSize = 22, useLightBorder = false) {
    const borderColor = useLightBorder ? 'rgba(255,255,255,0.2)' : 'var(--avatar-border-color)';
    const boxShadow = useLightBorder ? 'none' : '0 0 15px var(--avatar-glow-color)';
    const content = window.renderAvatar
      ? window.renderAvatar(avatarData, nickname)
      : fallbackAvatarContent(avatarData, nickname);
    return `
      <div style="width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid ${borderColor}; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; box-shadow: ${boxShadow}; transition: all 2s ease; overflow:hidden;">
        ${content}
      </div>
    `;
  }

  function fallbackAvatarContent(avatarData, nickname) {
    if (!avatarData || typeof avatarData === 'string') {
      return avatarData || getDefaultAvatar(nickname);
    }
    if (avatarData.type === 'emoji' && avatarData.value) {
      return avatarData.value;
    }
    if (avatarData.type === 'default' && avatarData.value) {
      return avatarData.value;
    }
    if (avatarData.type) {
      const map = {
        moon: '🌔', earth: '🌏', saturn: '🪐', comet: '☄️', rocket: '🚀', star: '⭐', lightning: '⚡', tornado: '🌪️', wave: '🌊',
        chick: '🐤', penguin: '🐧', lion: '🦁', bear: '🐻', unicorn: '🦄', owl: '🦉', wolf: '🐺', seal: '🦭', shark: '🦈',
        tomato: '🍅', potato: '🥔', avocado: '🥑', cheese: '🧀',
        alien: '👽', devil: '👿', ninja: '🥷', ghost: '👻', invader: '👾', skull: '💀', robot: '🤖', wing: '🪽',
        wonderwoman: '⚡', captainmarvel: '⭐'
      };
      if (map[avatarData.type]) return map[avatarData.type];
    }
    return getDefaultAvatar(nickname);
  }

  // ============ Task 4: 猜题弹窗 ============

  window.showPuzzleDetail = async function(puzzleId) {
    showLoading('加载中...');

    const puzzles = await window.getPuzzlesList();
    currentPuzzle = puzzles.find(p => p.id === puzzleId);

    hideLoading();

    if (!currentPuzzle) {
      showToast('题目不存在', 'error');
      return;
    }

    document.getElementById('emojiGuessOverlay').style.display = 'flex';
    renderGuessContent();
  };

  window.closeEmojiGuessModal = function() {
    document.getElementById('emojiGuessOverlay').style.display = 'none';
    currentPuzzle = null;
  };

  function renderGuessContent() {
    const contentEl = document.getElementById('emojiGuessContent');
    if (!contentEl || !currentPuzzle) return;

    const isSolved = currentPuzzle.status === 'solved';
    const isAuthor = window.currentUser && currentPuzzle.author_id === window.currentUser.id;
    const canDelete = isAuthor && !isSolved;

    if (isSolved) {
      // Task 4: solved 状态 - 只读显示胜者信息
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 32px; color: var(--avatar-border-color); margin-bottom: 30px; transition: color 2s ease;">已被猜出</h2>

          <div style="font-size: 64px; margin: 30px 0; line-height: 1.2;">${currentPuzzle.emoji_text}</div>

          <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--avatar-border-color); border-radius: 12px; padding: 25px; margin: 30px 0; transition: border-color 2s ease;">
            <div style="font-size: 14px; color: #888; margin-bottom: 10px;">答案是</div>
            <div style="font-size: 28px; font-weight: 600; color: var(--avatar-border-color); margin-bottom: 20px; transition: color 2s ease;">${currentPuzzle.answer_display}</div>

            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 20px 0;"></div>

            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 20px;">
              ${renderAvatarInline(currentPuzzle.solved_by_user_avatar_url, currentPuzzle.solved_by_user_name, 50, 24)}
              <div style="text-align: left;">
                <div style="font-size: 16px; font-weight: 600; color: var(--avatar-border-color); margin-bottom: 4px; transition: color 2s ease;">${currentPuzzle.solved_by_user_name}</div>
                <div style="font-size: 13px; color: #888;">${window.formatDateTime(currentPuzzle.solved_at)} 猜对</div>
              </div>
            </div>
          </div>

          <button onclick="closeEmojiGuessModal()" style="padding: 12px 30px; background: var(--avatar-glow-color); border: 1px solid var(--avatar-border-color); color: var(--avatar-border-color); border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease, background 2s ease, border-color 2s ease;">关闭</button>
        </div>
      `;
    } else {
      // Task 4: open 状态 - 允许输入答案
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 32px; color: var(--avatar-border-color); margin-bottom: 30px; transition: color 2s ease;">猜猜这是什么电影</h2>

          <div style="font-size: 64px; margin: 30px 0; line-height: 1.2;">${currentPuzzle.emoji_text}</div>

          ${isAuthor ? `
            <div style="margin: 10px 0 24px; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; color: #aaa; font-size: 14px;">
              你是出题人，电影名：<span style="color: var(--avatar-border-color); font-weight: 600;">${currentPuzzle.answer_display}</span>
            </div>
          ` : ''}

          <div style="margin: 30px 0;">
            <input
              type="text"
              id="guessAnswerInput"
              placeholder="输入你的答案..."
              style="width: 100%; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 15px; color: #f5f5f5; font-size: 18px; text-align: center; transition: border-color 0.3s ease;"
              onkeypress="if(event.key==='Enter') submitGuess()"
              ${isAuthor ? 'disabled' : ''}
            />
            <div id="guessErrorMsg" style="margin-top: 10px; font-size: 14px; color: #ff4444; min-height: 20px;">${isAuthor ? '不能猜自己出的题目' : ''}</div>
          </div>

          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 30px;">
            <button onclick="submitGuess()" ${isAuthor ? 'disabled' : ''} style="padding: 12px 30px; background: var(--avatar-glow-color); border: 1px solid var(--avatar-border-color); color: var(--avatar-border-color); border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease, background 2s ease, border-color 2s ease; ${isAuthor ? 'opacity:0.6; cursor:not-allowed;' : ''}">提交答案</button>
            ${canDelete ? `
              <button onclick="deletePuzzleConfirm('${currentPuzzle.id}')" style="padding: 12px 30px; background: rgba(255,68,68,0.15); border: 1px solid rgba(255,68,68,0.4); color: #ff4444; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease;">删除题目</button>
            ` : ''}
            <button onclick="closeEmojiGuessModal()" style="padding: 12px 30px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #ccc; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">返回</button>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 10px;">
              ${renderAvatarInline(currentPuzzle.author_avatar_url, currentPuzzle.author_name, 40, 20, true)}
              <div style="text-align: left;">
                <div style="font-size: 14px; color: #ccc;">${currentPuzzle.author_name}</div>
                <div style="font-size: 12px; color: #666;">${window.formatDateTime(currentPuzzle.created_at)} 出题</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // ============ Task 5 & 6: 提交答案（transaction）和删除 ============

  window.submitGuess = async function() {
    const inputEl = document.getElementById('guessAnswerInput');
    const errorEl = document.getElementById('guessErrorMsg');

    if (!inputEl || !currentPuzzle) return;
    if (window.currentUser && currentPuzzle.author_id === window.currentUser.id) {
      errorEl.textContent = '不能猜自己出的题目';
      return;
    }

    const guessText = inputEl.value.trim();
    if (!guessText) {
      errorEl.textContent = '请输入答案';
      inputEl.style.borderColor = '#ff4444';
      return;
    }

    showLoading('提交中...');

    const result = await window.guessPuzzle(currentPuzzle.id, guessText);

    hideLoading();

    if (result.success) {
      // 猜对了！
      showToast('恭喜你猜对了', 'success', '!');
      closeEmojiGuessModal();
      // 刷新列表和badge
      if (document.getElementById('emojiHallOverlay').style.display === 'flex') {
        await loadPuzzlesList();
      }
      await updateHallBadge();
    } else if (result.alreadySolved) {
      // 被别人抢先了
      showToast(`已被 ${result.solverInfo.name} 抢先猜对了！`, 'warn');
      // 重新加载题目信息并显示
      await showPuzzleDetail(currentPuzzle.id);
    } else if (result.isAuthor) {
      errorEl.textContent = '不能猜自己出的题目';
      inputEl.style.borderColor = '#ff4444';
    } else if (result.incorrect) {
      // 答案错误
      errorEl.textContent = '❌ 答案不正确，再想想';
      inputEl.style.borderColor = '#ff4444';
      inputEl.value = '';
      inputEl.focus();
      // 添加抖动动画
      inputEl.style.animation = 'shake 0.5s';
      setTimeout(() => {
        inputEl.style.animation = '';
        errorEl.textContent = '';
        inputEl.style.borderColor = 'rgba(255,255,255,0.2)';
      }, 2000);
    } else {
      showToast('提交失败: ' + (result.error || '未知错误'), 'error');
    }
  };

  // Task 6: 删除题目（仅限open状态）
  window.deletePuzzleConfirm = function(puzzleId) {
    showConfirmDialogSafe({
      title: '删除题目',
      message: '确定要删除这道题吗？已被猜出的题目不可删除。',
      confirmText: '删除',
      cancelText: '取消'
    }).then(confirmed => {
      if (confirmed) deletePuzzleAction(puzzleId);
    });
  };

  async function deletePuzzleAction(puzzleId) {
    showLoading('删除中...');

    const result = await window.deletePuzzle(puzzleId);

    hideLoading();

    if (result.success) {
      showToast('删除成功', 'success', '🗑️');
      closeEmojiGuessModal();
      // 刷新列表和badge
      if (document.getElementById('emojiHallOverlay').style.display === 'flex') {
        await loadPuzzlesList();
      }
      await updateHallBadge();
    } else {
      showToast('删除失败: ' + (result.error || '未知错误'), 'error');
    }
  }

  // ============ Task 8: 排行榜 ============

  window.showEmojiLeaderboard = async function() {
    if (!window.currentUser) {
      showToast('请先登录', 'warn');
      return;
    }

    document.getElementById('emojiLeaderboardOverlay').style.display = 'flex';

    // 加载排行榜
    await loadLeaderboard();
  };

  window.closeEmojiLeaderboard = function() {
    document.getElementById('emojiLeaderboardOverlay').style.display = 'none';
  };

  async function loadLeaderboard() {
    showLoading('加载中...');

    const leaderboard = await window.getLeaderboard(20);

    hideLoading();

    const listEl = document.getElementById('emojiLeaderboardList');
    if (!listEl) return;

    if (leaderboard.length === 0) {
      listEl.innerHTML = '<div style="text-align:center; padding:60px 20px; color:#888; font-size:16px;">暂无数据</div>';
      return;
    }

    listEl.innerHTML = leaderboard.map((user, index) => {
      const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--avatar-border-color)';
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

      // 使用renderAvatarInline正确渲染头像对象
      const avatarHtml = renderAvatarInline(user.user_avatar_url, user.user_name, 50, 24, false);
      // 提取内部内容（去掉外层div容器，因为我们自己定义了容器）
      const avatarContentMatch = avatarHtml.match(/<div[^>]*>(.*?)<\/div>/);
      const avatarContent = avatarContentMatch ? avatarContentMatch[1] : (user.user_avatar_url || getDefaultAvatar(user.user_name));

      return `
        <div style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 12px; display: flex; align-items: center; gap: 20px;">
          <div style="font-size: 28px; font-weight: 700; color: ${rankColor}; min-width: 50px; text-align: center; transition: color 2s ease;">
            ${rankIcon || (index + 1)}
          </div>
          <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid ${rankColor}; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 0 15px rgba(212,175,55,0.3); transition: all 2s ease; overflow: hidden;">
            ${avatarContent}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 18px; font-weight: 600; color: ${rankColor}; margin-bottom: 4px; transition: color 2s ease;">${user.user_name}</div>
            <div style="font-size: 14px; color: #888;">猜对 ${user.correct_guess_count} 道题</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============ 工具函数 ============

  function showLoading(text = '加载中...') {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.querySelector('.loading-text');
    if (overlay) overlay.style.display = 'flex';
    if (textEl) textEl.textContent = text;
  }

  function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

})();
