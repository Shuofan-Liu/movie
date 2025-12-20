// 剧照猜电影 UI 层
(function(){
  const GRID_ROWS = 3;
  const GRID_COLS = 4;
  const GRID_SIZE = GRID_ROWS * GRID_COLS;
  const MAX_MAIN_LIMIT = 800 * 1024;
  const MAIN_STEPS = [
    { size: 1280, quality: 0.78 },
    { size: 1280, quality: 0.72 },
    { size: 1280, quality: 0.66 },
    { size: 1024, quality: 0.72 },
    { size: 900, quality: 0.66 },
  ];
  const THUMB_STEPS = [
    { size: 480, quality: 0.78 },
    { size: 480, quality: 0.72 },
    { size: 480, quality: 0.66 },
  ];

  let createGrid = Array(GRID_SIZE).fill(true); // 默认全部显示，点击遮挡
  let createImageState = {
    previewUrl: '',
    mainBlob: null,
    mainMime: '',
    thumbBlob: null,
    thumbMime: ''
  };
  let stillHallActive = 'open';
  let stillHallPuzzles = [];
  let currentStillPuzzle = null;
  let currentStillLeaderboardTab = 'guess';

  window.initStillQuizUI = function() {
    renderCreateGrid();
    bindStillFileInput();
  };

  // ============ 入口 Tab 切换 ============
  window.switchCreateQuizType = function(type) {
    const emojiBtn = document.getElementById('createTabEmoji');
    const stillBtn = document.getElementById('createTabStill');
    const emojiSection = document.getElementById('emojiCreateSection');
    const stillSection = document.getElementById('stillCreateSection');
    if (!emojiBtn || !stillBtn || !emojiSection || !stillSection) return;

    const isEmoji = type === 'emoji';
    emojiBtn.classList.toggle('active', isEmoji);
    stillBtn.classList.toggle('active', !isEmoji);
    emojiSection.style.display = isEmoji ? 'block' : 'none';
    stillSection.style.display = isEmoji ? 'none' : 'block';
  };

  window.switchHallQuizType = async function(type) {
    const emojiBtn = document.getElementById('hallTabEmoji');
    const stillBtn = document.getElementById('hallTabStill');
    const emojiSection = document.getElementById('emojiHallSection');
    const stillSection = document.getElementById('stillHallSection');
    if (!emojiBtn || !stillBtn || !emojiSection || !stillSection) return;

    const isEmoji = type === 'emoji';
    emojiBtn.classList.toggle('active', isEmoji);
    stillBtn.classList.toggle('active', !isEmoji);
    emojiSection.style.display = isEmoji ? 'block' : 'none';
    stillSection.style.display = isEmoji ? 'none' : 'block';

    if (!isEmoji) {
      await loadStillPuzzlesList();
    }
  };

  window.switchLeaderboardQuizType = async function(type) {
    const emojiBtn = document.getElementById('leaderboardTabEmoji');
    const stillBtn = document.getElementById('leaderboardTabStill');
    const emojiSection = document.getElementById('emojiLeaderboardSection');
    const stillSection = document.getElementById('stillLeaderboardSection');
    if (!emojiBtn || !stillBtn || !emojiSection || !stillSection) return;

    const isEmoji = type === 'emoji';
    emojiBtn.classList.toggle('active', isEmoji);
    stillBtn.classList.toggle('active', !isEmoji);
    emojiSection.style.display = isEmoji ? 'block' : 'none';
    stillSection.style.display = isEmoji ? 'none' : 'block';

    if (!isEmoji) {
      await loadStillLeaderboard();
    }
  };

  // ============ 出题：文件处理与网格 ============

  function bindStillFileInput() {
    const input = document.getElementById('stillImageInput');
    if (input && !input.__bound) {
      input.addEventListener('change', handleStillFileSelect);
      input.__bound = true;
    }
  }

  function renderCreateGrid() {
    const gridEl = document.getElementById('stillGridOverlay');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    createGrid.forEach((revealed, idx) => {
      const cell = document.createElement('div');
      cell.className = `still-cell ${revealed ? 'revealed' : ''}`;
      cell.dataset.idx = idx;
      const mask = document.createElement('div');
      mask.className = 'mask';
      cell.appendChild(mask);
      cell.addEventListener('click', () => {
        toggleGridCell(idx);
      });
      gridEl.appendChild(cell);
    });
  }

  function toggleGridCell(idx) {
    createGrid[idx] = !createGrid[idx];
    if (createGrid.filter(Boolean).length < 3) {
      // 确保至少 3 个
      createGrid[idx] = true;
    }
    renderCreateGrid();
    updateStillPublishState();
  }

  async function handleStillFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    showLoading('压缩图片中...');
    try {
      const main = await compressImage(file, MAIN_STEPS, MAX_MAIN_LIMIT);
      const thumb = await compressImage(file, THUMB_STEPS, 80 * 1024);
      createImageState.mainBlob = main.blob;
      createImageState.mainMime = main.mime;
      createImageState.thumbBlob = thumb.blob;
      createImageState.thumbMime = thumb.mime;
      createImageState.previewUrl = main.dataUrl;
      const imgEl = document.getElementById('stillPreviewImage');
      if (imgEl) {
        imgEl.src = main.dataUrl;
      }
      updateStillPublishState();
    } catch (err) {
      console.error(err);
      showToast(err.message || '图片处理失败', 'error');
    } finally {
      hideLoading();
    }
  }

  function updateStillPublishState() {
    const btn = document.getElementById('publishStillBtn');
    if (!btn) return;
    const ready = !!createImageState.mainBlob && createGrid.filter(Boolean).length >= 3;
    btn.disabled = !ready;
    btn.style.opacity = ready ? '1' : '0.5';
  }

  async function compressImage(file, steps, maxBytes) {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const preferWebp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

    for (const step of steps) {
      const { size, quality } = step;
      const { targetW, targetH } = getScaledSize(img.width, img.height, size);
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const mime = preferWebp ? 'image/webp' : 'image/jpeg';
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
      if (!blob) continue;
      const dataUrl = await blobToDataUrl(blob);
      if (blob.size <= maxBytes) {
        return { blob, mime, dataUrl };
      }
    }
    throw new Error('压缩后仍超过大小限制，请尝试换一张或降低分辨率');
  }

  function getScaledSize(w, h, maxSide) {
    const longest = Math.max(w, h);
    if (longest <= maxSide) return { targetW: w, targetH: h };
    const ratio = maxSide / longest;
    return { targetW: Math.round(w * ratio), targetH: Math.round(h * ratio) };
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('生成预览失败'));
      reader.readAsDataURL(blob);
    });
  }

  // ============ 发布剧照题 ============
  window.publishStillPuzzleUI = async function() {
    if (!window.currentUser) {
      showToast('请先登录', 'warn');
      return;
    }
    if (!createImageState.mainBlob || !createImageState.thumbBlob) {
      showToast('请先选择并处理剧照', 'warn');
      return;
    }
    if (createGrid.filter(Boolean).length < 3) {
      showToast('至少揭晓 3 个格子', 'warn');
      return;
    }

    const customTitle = document.getElementById('customTitleInput')?.value.trim() || '';
    const answerDisplay = customTitle || document.getElementById('randomTitleDisplay')?.textContent || '';
    if (!answerDisplay) {
      showToast('请先选择电影名', 'warn');
      return;
    }

    showLoading('处理中...');
    try {
      const docId = firebase.firestore().collection('still_puzzles').doc().id;

      // 转换为 Base64（不使用 Storage，直接存 Firestore）
      const mainDataUrl = await blobToDataUrl(createImageState.mainBlob);
      const thumbDataUrl = await blobToDataUrl(createImageState.thumbBlob);

      const result = await window.publishStillPuzzle({
        id: docId,
        image_url: mainDataUrl,
        thumb_url: thumbDataUrl,
        grid_revealed: createGrid.slice(),
        hint: document.getElementById('stillHintInput')?.value || '',
        answer_display: answerDisplay
      });

      if (result.success) {
        showToast('发布成功！', 'success', '!');
        resetStillCreate();
        closeEmojiCreatePage();
        await updateHallBadge();
      } else {
        throw new Error(result.error || '发布失败');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || '发布失败', 'error');
    } finally {
      hideLoading();
    }
  };

  function resetStillCreate() {
    createGrid = Array(GRID_SIZE).fill(true); // 默认全部显示
    createImageState = { previewUrl: '', mainBlob: null, mainMime: '', thumbBlob: null, thumbMime: '' };
    const imgEl = document.getElementById('stillPreviewImage');
    if (imgEl) imgEl.src = '';
    const fileInput = document.getElementById('stillImageInput');
    if (fileInput) fileInput.value = '';
    document.getElementById('stillHintInput') && (document.getElementById('stillHintInput').value = '');
    renderCreateGrid();
    updateStillPublishState();
  }

  // ============ 大厅 ============
  window.switchStillHallTab = function(tab) {
    if (tab === stillHallActive) return;
    stillHallActive = tab;
    const openBtn = document.getElementById('stillHallTabOpenBtn');
    const solvedBtn = document.getElementById('stillHallTabSolvedBtn');
    if (openBtn && solvedBtn) {
      openBtn.classList.toggle('active', tab === 'open');
      solvedBtn.classList.toggle('active', tab === 'solved');
    }
    renderStillHallList();
  };

  async function loadStillPuzzlesList() {
    showLoading('加载剧照题目...');
    stillHallPuzzles = await window.getStillPuzzlesList();
    if (window.setHallTabBadge) {
      const openCount = (Array.isArray(stillHallPuzzles) ? stillHallPuzzles : []).filter(p => p.status === 'open').length;
      window.setHallTabBadge('still', openCount);
    }
    hideLoading();
    renderStillHallList();
  }

  function renderStillHallList() {
    const listEl = document.getElementById('stillHallList');
    if (!listEl) return;
    const filtered = (Array.isArray(stillHallPuzzles) ? stillHallPuzzles : []).filter(p => stillHallActive === 'open' ? p.status === 'open' : p.status === 'solved');
    const sorted = filtered.sort((a, b) => {
      const getTs = (ts, fallback) => {
        if (!ts) return fallback || 0;
        if (typeof ts.toDate === 'function') return ts.toDate().getTime();
        const t = new Date(ts).getTime();
        return Number.isNaN(t) ? 0 : t;
      };
      if (stillHallActive === 'open') {
        return getTs(b.created_at) - getTs(a.created_at);
      }
      return getTs(b.solved_at || b.created_at) - getTs(a.solved_at || a.created_at);
    });

    if (!sorted.length) {
      const emptyText = stillHallActive === 'open' ? '暂无未猜出的剧照题目' : '暂无已猜出的剧照题目';
      listEl.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#888; font-size:16px;">${emptyText}</div>`;
      return;
    }

    listEl.innerHTML = sorted.map(p => `
      <div class="emoji-hall-item still-hall-item" onclick="showStillPuzzleDetail('${p.id}')" style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s ease;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          ${renderAvatarInline(p.author_avatar_url, p.author_name, 40, 20)}
          <div style="flex:1;">
            <div style="font-size:15px; font-weight:600; color: var(--avatar-border-color); margin-bottom:4px;">${p.author_name}</div>
            <div style="font-size:12px; color:#888;">${window.formatDateTime(p.created_at)}</div>
          </div>
          ${p.status === 'solved' ? '<span style="color: var(--avatar-border-color); font-size:16px;">✓</span>' : ''}
        </div>
        <div class="still-hall-thumb">
          <img src="${p.thumb_url}" alt="thumb" class="still-hall-thumb-img">
          <div style="position:absolute; inset:0; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(3,1fr); background:rgba(0,0,0,0.6);">
            ${Array.from({length: GRID_SIZE}).map((_, idx) => {
              const revealed = (p.grid_revealed || [])[idx];
              return `<div style="border:1px solid rgba(255,255,255,0.08); ${revealed ? 'background:transparent;' : 'background:rgba(0,0,0,1);'}"></div>`;
            }).join('')}
          </div>
        </div>
        ${p.hint ? `<div style="margin-top:10px; color:#aaa; font-size:13px;">💡 提示：${p.hint}</div>` : ''}
      </div>
    `).join('');
  }

  // ============ 猜题 ============
  window.showStillPuzzleDetail = async function(puzzleId) {
    showLoading('加载中...');
    const puzzles = await window.getStillPuzzlesList();
    currentStillPuzzle = puzzles.find(p => p.id === puzzleId);
    hideLoading();
    if (!currentStillPuzzle) {
      showToast('题目不存在', 'error');
      return;
    }
    document.getElementById('stillGuessOverlay').style.display = 'flex';
    renderStillGuessContent();
  };

  window.closeStillGuessModal = function() {
    document.getElementById('stillGuessOverlay').style.display = 'none';
    currentStillPuzzle = null;
  };

  function renderStillGuessContent() {
    const el = document.getElementById('stillGuessContent');
    if (!el || !currentStillPuzzle) return;

    const isSolved = currentStillPuzzle.status === 'solved';
    const isAuthor = window.currentUser && currentStillPuzzle.author_id === window.currentUser.id;
    const canDelete = isAuthor && !isSolved;
    const revealGrid = currentStillPuzzle.grid_revealed || [];

    if (isSolved) {
      el.innerHTML = `
        <div style="text-align:center; padding:20px;">
          <h2 class="emoji-guess-title">已被猜出</h2>
          <div style="position:relative; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); margin:20px 0;">
            <img src="${currentStillPuzzle.image_url}" alt="full" style="width:100%; display:block; object-fit:cover;">
          </div>
          <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--avatar-border-color); border-radius: 12px; padding: 18px; margin: 20px 0;">
            <div style="font-size: 14px; color: #888; margin-bottom: 8px;">答案是</div>
            <div style="font-size: 26px; font-weight: 600; color: var(--avatar-border-color); margin-bottom: 12px;">${currentStillPuzzle.answer_display}</div>
            <div style="display:flex; align-items:center; justify-content:center; gap:12px;">
              ${renderAvatarInline(currentStillPuzzle.solved_by_user_avatar_url, currentStillPuzzle.solved_by_user_name, 48, 22)}
              <div style="text-align:left;">
                <div style="font-size:16px; color: var(--avatar-border-color); font-weight:600;">${currentStillPuzzle.solved_by_user_name}</div>
                <div style="font-size:12px; color:#888;">${window.formatDateTime(currentStillPuzzle.solved_at)} 猜对</div>
              </div>
            </div>
          </div>
          <button onclick="closeStillGuessModal()" style="padding:12px 30px; background: var(--avatar-glow-color); border:1px solid var(--avatar-border-color); color: var(--avatar-border-color); border-radius:8px; cursor:pointer; font-size:14px; font-weight:600;">关闭</button>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <h2 class="emoji-guess-title">猜猜这是什么电影</h2>
        <div style="position:relative; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); margin:20px 0;">
          <img src="${currentStillPuzzle.image_url}" alt="still" style="width:100%; display:block; object-fit:cover; filter: brightness(0.9);">
          <div style="position:absolute; inset:0; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(3,1fr);">
            ${Array.from({length: GRID_SIZE}).map((_, idx) => {
              const revealed = revealGrid[idx];
              return `<div style="border:1px solid rgba(255,255,255,0.08); ${revealed ? 'background: transparent;' : 'background: rgba(0,0,0,1);'}"></div>`;
            }).join('')}
          </div>
        </div>
        ${currentStillPuzzle.hint ? `<div style="margin-bottom:16px; color:#aaa;">💡 提示：${currentStillPuzzle.hint}</div>` : ''}
        ${isAuthor ? `
          <div style="margin: 10px 0 18px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; color: #aaa; font-size: 14px;">
            你是出题人，电影名：<span style="color: var(--avatar-border-color); font-weight: 600;">${currentStillPuzzle.answer_display}</span>
          </div>
        ` : ''}
        <div style="margin:20px 0;">
          <input type="text" id="stillGuessInput" placeholder="输入你的答案..." ${isAuthor ? 'disabled' : ''} style="width:100%; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 15px; color: #f5f5f5; font-size: 18px; text-align: center;">
          <div id="stillGuessError" style="margin-top:8px; color:#ff4444; min-height:20px;">${isAuthor ? '不能猜自己出的题目' : ''}</div>
        </div>
        <div style="display:flex; gap:12px; justify-content:center;">
          <button onclick="submitStillGuess()" ${isAuthor ? 'disabled' : ''} style="padding: 12px 30px; background: var(--avatar-glow-color); border: 1px solid var(--avatar-border-color); color: var(--avatar-border-color); border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; ${isAuthor ? 'opacity:0.6; cursor:not-allowed;' : ''}">提交答案</button>
          ${canDelete ? `<button onclick="deleteStillPuzzleConfirm('${currentStillPuzzle.id}')" style="padding: 12px 30px; background: rgba(255,68,68,0.15); border: 1px solid rgba(255,68,68,0.4); color: #ff4444; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">删除题目</button>` : ''}
          <button onclick="closeStillGuessModal()" style="padding: 12px 30px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #ccc; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">返回</button>
        </div>
        <div style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 8px;">
          <div style="display:flex; align-items:center; gap:12px; justify-content:center;">
              ${renderAvatarInline(currentStillPuzzle.author_avatar_url, currentStillPuzzle.author_name, 40, 20)}
            <div style="text-align:left;">
              <div style="font-size:14px; color:#ccc;">${currentStillPuzzle.author_name}</div>
              <div style="font-size:12px; color:#666;">${window.formatDateTime(currentStillPuzzle.created_at)} 出题</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.submitStillGuess = async function() {
    const input = document.getElementById('stillGuessInput');
    const errorEl = document.getElementById('stillGuessError');
    if (!input || !currentStillPuzzle) return;
    if (window.currentUser && currentStillPuzzle.author_id === window.currentUser.id) {
      errorEl.textContent = '不能猜自己出的题目';
      return;
    }
    const guess = input.value.trim();
    if (!guess) {
      errorEl.textContent = '请输入答案';
      input.style.borderColor = '#ff4444';
      return;
    }

    showLoading('提交中...');
    const result = await window.guessStillPuzzle(currentStillPuzzle.id, guess);
    hideLoading();

    if (result.success) {
      showToast('恭喜你猜对了', 'success', '!');
      closeStillGuessModal();
      if (document.getElementById('emojiHallOverlay').style.display === 'flex') {
        await loadStillPuzzlesList();
      }
      await updateHallBadge();
    } else if (result.alreadySolved) {
      showToast(`已被 ${result.solverInfo.name} 抢先猜对了！`, 'warn');
      await showStillPuzzleDetail(currentStillPuzzle.id);
    } else if (result.isAuthor) {
      errorEl.textContent = '不能猜自己出的题目';
    } else if (result.incorrect) {
      errorEl.textContent = '❌ 答案不正确，再想想';
      input.style.borderColor = '#ff4444';
      input.value = '';
      input.focus();
      input.style.animation = 'shake 0.5s';
      setTimeout(() => {
        input.style.animation = '';
        errorEl.textContent = '';
        input.style.borderColor = 'rgba(255,255,255,0.2)';
      }, 2000);
    } else {
      showToast('提交失败: ' + (result.error || '未知错误'), 'error');
    }
  };

  window.deleteStillPuzzleConfirm = function(puzzleId) {
    showConfirmDialogSafe({
      title: '删除题目',
      message: '确定要删除这道剧照题吗？已被猜出的题目不可删除。',
      confirmText: '删除',
      cancelText: '取消'
    }).then(confirmed => {
      if (confirmed) deleteStillPuzzleAction(puzzleId);
    });
  };

  async function deleteStillPuzzleAction(puzzleId) {
    showLoading('删除中...');
    const result = await window.deleteStillPuzzle(puzzleId);
    hideLoading();
    if (result.success) {
      showToast('删除成功', 'success', '🗑️');
      closeStillGuessModal();
      if (document.getElementById('emojiHallOverlay').style.display === 'flex') {
        await loadStillPuzzlesList();
      }
      await updateHallBadge();
    } else {
      showToast('删除失败: ' + (result.error || '未知错误'), 'error');
    }
  }

  // ============ 排行榜 ============
  window.switchStillLeaderboardTab = async function(tab) {
    if (currentStillLeaderboardTab === tab) return;
    currentStillLeaderboardTab = tab;
    const guessBtn = document.getElementById('stillGuessTabBtn');
    const influenceBtn = document.getElementById('stillInfluenceTabBtn');
    if (guessBtn && influenceBtn) {
      guessBtn.style.background = tab === 'guess' ? 'var(--avatar-glow-color)' : 'rgba(255,255,255,0.05)';
      guessBtn.style.borderColor = tab === 'guess' ? 'var(--avatar-border-color)' : 'rgba(255,255,255,0.2)';
      guessBtn.style.color = tab === 'guess' ? 'var(--avatar-border-color)' : '#ccc';
      influenceBtn.style.background = tab === 'influence' ? 'var(--avatar-glow-color)' : 'rgba(255,255,255,0.05)';
      influenceBtn.style.borderColor = tab === 'influence' ? 'var(--avatar-border-color)' : 'rgba(255,255,255,0.2)';
      influenceBtn.style.color = tab === 'influence' ? 'var(--avatar-border-color)' : '#ccc';
    }
    if (tab === 'guess') {
      await loadStillLeaderboard();
    } else {
      await loadStillInfluenceLeaderboard();
    }
  };

  async function loadStillLeaderboard() {
    showLoading('加载中...');
    const leaderboard = await window.getStillLeaderboard(20);
    hideLoading();
    renderStillLeaderboardList(leaderboard, false);
  }

  async function loadStillInfluenceLeaderboard() {
    showLoading('加载中...');
    const leaderboard = await window.getStillInfluenceLeaderboard(20);
    hideLoading();
    renderStillLeaderboardList(leaderboard, true);
  }

  function renderStillLeaderboardList(list, isInfluence) {
    const listEl = document.getElementById('stillLeaderboardList');
    if (!listEl) return;
    if (!list || !list.length) {
      listEl.innerHTML = '<div style="text-align:center; padding:60px 20px; color:#888; font-size:16px;">暂无数据</div>';
      return;
    }
    listEl.innerHTML = list.map((user, index) => {
      const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--avatar-border-color)';
      const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const avatarHtml = renderAvatarInline(user.user_avatar_url, user.user_name, 50, 24, false);
      const avatarContentMatch = avatarHtml.match(/<div[^>]*>(.*?)<\/div>/);
      const avatarContent = avatarContentMatch ? avatarContentMatch[1] : (user.user_avatar_url || user.user_name?.charAt(0) || '?');
      const puzzleCreated = user.puzzle_created_count || 0;
      const puzzleSolved = user.puzzle_solved_count || 0;
      const influenceScore = user.influenceScore || (puzzleCreated * 1 + puzzleSolved * 2);
      return `
        <div style="background: rgba(20,20,20,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 12px; display: flex; align-items: center; gap: 20px;">
          <div class="emoji-leaderboard-rank" style="color: ${rankColor};">
            ${rankIcon || (index + 1)}
          </div>
          <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid ${rankColor}; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 0 15px rgba(212,175,55,0.3); transition: all 2s ease; overflow: hidden;">
            ${avatarContent}
          </div>
          <div style="flex: 1;">
            <div class="emoji-leaderboard-name" style="color: ${rankColor};">${user.user_name}</div>
            ${isInfluence
              ? `<div style="font-size: 14px; color: #aaa; margin-top: 4px;">出题 ${puzzleCreated} | 猜中 ${puzzleSolved}</div>
                 <div style="font-size: 13px; color: ${rankColor}; margin-top: 4px;">⭐ 综合: ${influenceScore}分</div>`
              : `<div style="font-size: 14px; color: #888;">猜对 ${user.correct_guess_count || 0} 道题</div>`}
          </div>
        </div>
      `;
    }).join('');
  }

})();
