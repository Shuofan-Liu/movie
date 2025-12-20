// Emoji 猜电影名游戏 UI 模块
(function(){

  let currentRandomTitle = '';
  let currentPuzzle = null; // 当前正在查看的题目
  let emojiPickerData = [];
  let activeEmojiCategory = 'smileys';
  let emojiPickerSearch = '';
  let emojiPickerPage = 1;
  let hallPuzzles = [];
  let hallActiveTab = 'open';
  const EMOJI_PAGE_SIZE = 64;
  // Emoji 关键字搜索映射（支持中英文关键词）
  const EMOJI_KEYWORD_MAP = {
    '车': ['🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜'],
    '汽车': ['🚗', '🚙'],
    '公交': ['🚌', '🚍'],
    'bus': ['🚌'],
    'car': ['🚗', '🚙', '🏎️'],
    '火车': ['🚂', '🚆', '🚇', '🚈', '🚉'],
    'train': ['🚂', '🚆', '🚇'],
    '地铁': ['🚇'],
    '飞机': ['✈️', '🛩️'],
    'plane': ['✈️', '🛩️'],
    '飞船': ['🚀'],
    '火箭': ['🚀'],
    '船': ['🚢', '⛵', '🛶'],
    '船只': ['🚢', '⛵', '🛶'],
    'boat': ['🚢', '⛵', '🛶'],
    '地球': ['🌍', '🌎', '🌏'],
    'earth': ['🌍', '🌎', '🌏'],
    '世界': ['🌍', '🌎', '🌏'],
    '太阳': ['☀️', '🌞'],
    'sun': ['☀️', '🌞'],
    '月亮': ['🌙'],
    'moon': ['🌙'],
    '星星': ['⭐', '🌟'],
    '星': ['⭐', '🌟'],
    'star': ['⭐', '🌟'],
    '彗星': ['☄️'],
    '流星': ['🌠', '☄️'],
    'comet': ['☄️'],
    '天气': ['☀️', '⛅', '☁️', '🌧️', '🌩️', '🌨️', '🌪️', '🌈'],
    '雨': ['🌧️'],
    '雪': ['❄️', '🌨️'],
    '雷': ['🌩️'],
    '风暴': ['🌪️'],
    '云': ['☁️', '⛅', '🌧️'],
    '彩虹': ['🌈'],
    '海洋': ['🌊'],
    '波浪': ['🌊'],
    'water': ['🌊', '💧'],
    'tree': ['🌳', '🌴', '🌲'],
    '树': ['🌳', '🌴', '🌲'],
    '植物': ['🌱', '🌿', '🍃'],
    '植物叶子': ['🍃', '🍂', '🍁'],
    '花': ['🌸', '🌼', '🌹', '🌷', '💐'],
  };

  function setHallTabBadge(type, count) {
    const id = type === 'emoji' ? 'hallTabEmojiBadge' : 'hallTabStillBadge';
    const el = document.getElementById(id);
    if (!el) return;
    const safeCount = Math.max(0, Number(count) || 0);
    el.textContent = safeCount;
    el.style.display = safeCount > 0 ? 'flex' : 'none';
  }
  window.setHallTabBadge = setHallTabBadge;

  // ============ 初始化 ============

  window.initEmojiQuizUI = async function() {
    // 初始化emoji输入校验
    const emojiInput = document.getElementById('emojiInput');
    if (emojiInput) {
      emojiInput.addEventListener('input', validateEmojiInputUI);
    }
    await initEmojiPicker();

    // 更新所有badge数字
    await updateHallBadge();
    await updateDanmakuBadge();
    await updateMainFunctionBadge();

    // 定期更新badge（每30秒）
    setInterval(async () => {
      await updateHallBadge();
      await updateDanmakuBadge();
      await updateMainFunctionBadge();
    }, 30000);

    // 默认切换到 emoji 出题 tab
    if (window.switchCreateQuizType) window.switchCreateQuizType('emoji');
  };

  // ============ Task 1: 更新大厅badge数字 ============

  async function updateHallBadge() {
    if (!window.currentUser) return;

    const count = await window.getOpenPuzzlesCount();
    const stillCount = window.getStillOpenPuzzlesCount ? await window.getStillOpenPuzzlesCount() : 0;
    const total = count + stillCount;

    setHallTabBadge('emoji', count);
    setHallTabBadge('still', stillCount);

    const badgeEl = document.getElementById('emojiHallBadge');
    if (badgeEl) {
      badgeEl.textContent = total;
      badgeEl.style.display = total > 0 ? 'flex' : 'none';
    }
  }

  // 暴露为全局函数，供其他模块使用
  window.updateHallBadge = updateHallBadge;

  // 更新留言墙badge数字
  async function updateDanmakuBadge() {
    if (!window.currentUser) return;

    const count = await window.getUnreadDanmakuCount();
    const badgeEl = document.getElementById('danmakuBadge');
    if (badgeEl) {
      badgeEl.textContent = count;
      badgeEl.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  // 暴露为全局函数，供 danmaku.js 调用
  window.updateDanmakuBadge = updateDanmakuBadge;

  // 更新主功能键badge数字（留言墙未读数 + 猜题大厅未猜数）
  async function updateMainFunctionBadge() {
    if (!window.currentUser) return;

    const hallCount = await window.getOpenPuzzlesCount();
    const stillCount = window.getStillOpenPuzzlesCount ? await window.getStillOpenPuzzlesCount() : 0;
    const danmakuCount = await window.getUnreadDanmakuCount();
    const totalCount = hallCount + stillCount + danmakuCount;

    const badgeEl = document.getElementById('mainFunctionBadge');
    if (badgeEl) {
      badgeEl.textContent = totalCount;
      badgeEl.style.display = totalCount > 0 ? 'flex' : 'none';
    }
  }

  // 暴露为全局函数，供 danmaku.js 调用
  window.updateMainFunctionBadge = updateMainFunctionBadge;

  // ============ Task 2: 出题页 ============

  window.showEmojiCreatePage = function() {
    if (!window.currentUser) {
      showToast('请先登录', 'warn');
      return;
    }

    if (window.switchCreateQuizType) window.switchCreateQuizType('emoji');
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

    if (window.switchHallQuizType) window.switchHallQuizType('emoji');
    document.getElementById('emojiHallOverlay').style.display = 'flex';

    hallActiveTab = 'open';
    updateHallTabButtons();

    // 加载题目列表
    await loadPuzzlesList();

    // 更新徽章（确保数字最新）
    await updateHallBadge();
  };

  window.closeEmojiHallPage = function() {
    document.getElementById('emojiHallOverlay').style.display = 'none';
  };

  async function loadPuzzlesList() {
    showLoading('加载中...');

    updateHallTabButtons();
    hallPuzzles = await window.getPuzzlesList();
    setHallTabBadge('emoji', (Array.isArray(hallPuzzles) ? hallPuzzles : []).filter(p => p.status === 'open').length);

    hideLoading();

    renderHallList();
  }

  window.switchHallTab = function(tab) {
    if (tab === hallActiveTab) return;
    hallActiveTab = tab;
    updateHallTabButtons();
    renderHallList();
  };

  function updateHallTabButtons() {
    const openBtn = document.getElementById('hallTabOpenBtn');
    const solvedBtn = document.getElementById('hallTabSolvedBtn');
    if (!openBtn || !solvedBtn) return;

    openBtn.classList.toggle('active', hallActiveTab === 'open');
    solvedBtn.classList.toggle('active', hallActiveTab === 'solved');
  }

  function getTimestampValue(ts) {
    if (!ts) return 0;
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function renderHallList() {
    const listEl = document.getElementById('emojiHallList');
    if (!listEl) return;

    const source = Array.isArray(hallPuzzles) ? hallPuzzles : [];
    const filtered = source.filter(p => hallActiveTab === 'open' ? p.status === 'open' : p.status === 'solved');

    const sorted = filtered.sort((a, b) => {
      if (hallActiveTab === 'open') {
        return getTimestampValue(b.created_at) - getTimestampValue(a.created_at);
      }
      const bTime = getTimestampValue(b.solved_at || b.created_at);
      const aTime = getTimestampValue(a.solved_at || a.created_at);
      return bTime - aTime;
    });

    if (sorted.length === 0) {
      const emptyText = hallActiveTab === 'open' ? '暂无未猜出的题目' : '暂无已猜出的题目';
      listEl.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#888; font-size:16px;">${emptyText}</div>`;
      return;
    }

    listEl.innerHTML = sorted.map(puzzle => `
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
        <div class="emoji-hall-item-emoji">${puzzle.emoji_text}</div>
        <div style="text-align: center; color: #aaa; font-size: 13px;">${puzzle.emoji_count}个emoji</div>
      </div>
    `).join('');
  }

  function getDefaultAvatar(name) {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  // 统一轻量提示（替代 alert），跟随站内主题
  function showToast(message, type = 'info', icon, options) {
    if (window.showInlineAlert) {
      // 有跳转动作或图标时使用内置 toast 组件
      if ((options && options.actionText) || (icon && window.showBadgeToast && type === 'success')) {
        window.showBadgeToast(message, icon, options);
      } else {
        window.showInlineAlert(message, type, options);
      }
    } else {
      alert(message);
    }
  }

  // 暴露为全局函数，供其他模块使用
  window.showToast = showToast;

  // 统一确认对话（替代 confirm）
  function showConfirmDialogSafe(options) {
    if (window.showConfirmDialog) {
      return window.showConfirmDialog(options);
    }
    return Promise.resolve(confirm(options.message || '确认操作？'));
  }

  // 暴露为全局函数，供其他模块使用
  window.showConfirmDialogSafe = showConfirmDialogSafe;

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

  // 暴露为全局函数，供其他模块使用
  window.renderAvatarInline = renderAvatarInline;

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

  // ============ Emoji 快选面板 ============
  async function initEmojiPicker() {
    const searchInput = document.getElementById('emojiPickerSearch');
    if (searchInput && !searchInput.__bound) {
      searchInput.addEventListener('input', (e) => {
        emojiPickerSearch = (e.target.value || '').trim();
        emojiPickerPage = 1;
        renderEmojiPickerGrid(activeEmojiCategory);
      });
      searchInput.__bound = true;
    }
    const prevBtn = document.getElementById('emojiPagerPrev');
    const nextBtn = document.getElementById('emojiPagerNext');
    if (prevBtn && !prevBtn.__bound) {
      prevBtn.addEventListener('click', () => {
        if (emojiPickerPage > 1) {
          emojiPickerPage -= 1;
          renderEmojiPickerGrid(activeEmojiCategory);
        }
      });
      prevBtn.__bound = true;
    }
    if (nextBtn && !nextBtn.__bound) {
      nextBtn.addEventListener('click', () => {
        emojiPickerPage += 1;
        renderEmojiPickerGrid(activeEmojiCategory);
      });
      nextBtn.__bound = true;
    }

    try {
      const res = await fetch('./data/emojiCatalog.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('加载表情库失败');
      const json = await res.json();
      if (Array.isArray(json) && json.length) {
        emojiPickerData = json;
      } else {
        throw new Error('表情库格式不正确');
      }
    } catch (err) {
      console.warn('[EmojiPicker] 使用内置表情列表，原因：', err);
      emojiPickerData = getFallbackEmojiData();
    }

    if (!emojiPickerData || !emojiPickerData.length) {
      emojiPickerData = getFallbackEmojiData();
    }

    activeEmojiCategory = emojiPickerData[0]?.key || 'smileys';
    emojiPickerPage = 1;
    emojiPickerSearch = '';

    renderEmojiPickerTabs();
    renderEmojiPickerGrid(activeEmojiCategory);
  }

  function getFallbackEmojiData() {
    return [
      { key: 'smileys', label: '😊 Smileys & Emotion', emojis: '😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤨 🧐 🤓 😎 🥳 😏 😒 🙄 😬 😳 😱 😡 😤 😴 🤢 🤮 🤧 🥵 🥶 🥴 😇'.split(' ') },
      { key: 'people', label: '🧑 People & Body', emojis: '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦿 🦶 👂 🦻 👃 👀 👁️ 🧠 🫀 🫁 🦷 👅 👄 🧑‍🎓 🧑‍💻'.split(' ') },
      { key: 'animals', label: '🐾 Animals & Nature', emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🦉 🦇 🐺 🦄 🐝 🦋 🐌 🐢 🐍 🦎 🦂 🦀 🦞 🦐 🦑 🐙 🐠 🐟 🐡 🦈 🐬 🐳 🐋 🦭 🐊 🐆 🐅 🦓 🦒 🦘 🐫 🐘 🌍 🌎 🌏 ☀️ 🌞 🌤️ ⛅ ☁️ 🌧️ 🌩️ 🌨️ 🌪️ 🌊 ☄️ 🌈 🌙 ⭐ 🌟 ✨ 🌋 🪐 🌱 🌿 🍃 🍂 🍁 🌳 🌴 🌲 🌵 🌻 🌼 🌸 🌹 🌷 💐 🍄'.split(' ') },
      { key: 'food', label: '🍔 Food & Drink', emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🧇 🧀 🥚 🍳 🥞 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥗 🍝 🍣'.split(' ') },
      { key: 'travel', label: '🚌 Travel & Places', emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🏍️ 🛵 🚲 🛴 🛹 🚨 🚧 🚦 🛑 🚏 🗺️ 🧭 🏖️ 🏝️ 🏜️ 🏕️ 🏔️ 🗻 🏞️ 🏟️ 🏛️ 🏗️ 🏠 🏡 🏢 🏬 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏭 🏯 🏰'.split(' ') },
      { key: 'activities', label: '🎾 Activities', emojis: '⚽️ 🏀 🏈 ⚾️ 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🥅 🥊 🥋 🎣 🏆 🎖️ 🏅 🥇 🥈 🥉 🎯 🎳 🎮 🎲 🪁 🎷 🎸 🎺 🎻 🎹 🥁 🎤 🎧 🎬 🎭 🎨 🧵 🧶 ✂️ 🪢 🚴 🚵 🏊 🤿 🧗 🧘 🤸 🏇'.split(' ') },
      { key: 'objects', label: '💡 Objects', emojis: '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🕹️ 🧮 💽 💾 💿 📷 📸 🎥 🎞️ 📺 📻 ⏰ ⏳ 🔋 🔌 💡 🔦 🕯️ 🧲 🧪 🧫 🧬 🔬 🔭 📡 📕 📗 📘 📙 📒 📃 📄 📜 📑 📰 📎 📐 📏 🧷 🪜 🧰 🔧 🔨 ⚙️'.split(' ') },
      { key: 'symbols', label: '💖 Symbols', emojis: '❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 🔥 ✨ 💫 🌟 ⭐ ⚡ 💥 🎇 🎆 🌈 ☀️ 🌙 ☁️ ⛅ 🌧️ 🌩️ 🌨️ ❄️ ☔ 💯 ✅ ❌ ⚠️ ⛔ 🚫 🔞 ♻️ ➡️ ⬅️ ⬆️ ⬇️'.split(' ') },
      { key: 'flags', label: '🎌 Flags', emojis: '🏳️ 🏴 🏁 🏳️‍🌈 🏳️‍⚧️ 🎌 🇨🇳 🇭🇰 🇹🇼 🇯🇵 🇰🇷 🇺🇸 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇬🇧 🇫🇷 🇩🇪 🇪🇸 🇮🇹 🇵🇹 🇷🇺 🇺🇦 🇵🇱 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇳🇱 🇧🇪 🇨🇭 🇦🇹 🇨🇿 🇸🇰 🇭🇺 🇷🇴 🇹🇷 🇸🇦 🇦🇪 🇮🇱 🇮🇳 🇵🇰 🇸🇬 🇻🇳 🇹🇭 🇮🇩 🇵🇭 🇦🇺'.split(' ') }
    ];
  }

  function renderEmojiPickerTabs() {
    const tabsEl = document.getElementById('emojiPickerTabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = emojiPickerData.map(cat => `
      <button class="emoji-picker-tab ${cat.key === activeEmojiCategory ? 'active' : ''}" data-key="${cat.key}">
        ${cat.label || cat.category || cat.key}
      </button>
    `).join('');

    tabsEl.querySelectorAll('.emoji-picker-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeEmojiCategory = btn.dataset.key;
        emojiPickerPage = 1;
        renderEmojiPickerTabs();
        renderEmojiPickerGrid(activeEmojiCategory);
      });
    });
  }

  function renderEmojiPickerGrid(key) {
    const gridEl = document.getElementById('emojiPickerGrid');
    const inputEl = document.getElementById('emojiInput');
    const pagerInfo = document.getElementById('emojiPagerInfo');
    const prevBtn = document.getElementById('emojiPagerPrev');
    const nextBtn = document.getElementById('emojiPagerNext');
    if (!gridEl || !inputEl) return;
    const cat = emojiPickerData.find(c => c.key === key);
    if (!cat) return;

    // 搜索时在全部分类中查找，未搜索时按当前分类
    let baseList;
    if (emojiPickerSearch) {
      const seen = new Set();
      baseList = [];
      emojiPickerData.forEach(c => {
        (c.emojis || []).forEach(e => {
          if (e && !seen.has(e)) {
            seen.add(e);
            baseList.push(e);
          }
        });
      });
    } else {
      baseList = (cat.emojis || []).filter(Boolean);
    }
    const searchLower = emojiPickerSearch.toLowerCase();
    let keywordMatches = new Set();
    if (searchLower) {
      Object.entries(EMOJI_KEYWORD_MAP).forEach(([keyword, emojiChars]) => {
        const kw = keyword.toLowerCase();
        if (kw.includes(searchLower) || searchLower.includes(kw)) {
          emojiChars.forEach(char => keywordMatches.add(char));
        }
      });
    }

    const filtered = searchLower
      ? baseList.filter(e => {
          const text = (e || '').toString().toLowerCase();
          return text.includes(searchLower) || keywordMatches.has(e);
        })
      : baseList;

    const totalPages = Math.max(1, Math.ceil(filtered.length / EMOJI_PAGE_SIZE));
    if (emojiPickerPage > totalPages) emojiPickerPage = totalPages;
    if (emojiPickerPage < 1) emojiPickerPage = 1;
    const start = (emojiPickerPage - 1) * EMOJI_PAGE_SIZE;
    const pageItems = filtered.slice(start, start + EMOJI_PAGE_SIZE);

    gridEl.innerHTML = pageItems.map(e => `
      <button class="emoji-picker-item" data-char="${e}">${e}</button>
    `).join('');

    gridEl.querySelectorAll('.emoji-picker-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = inputEl.value || '';
        const next = `${current}${btn.dataset.char}`.trim();
        inputEl.value = next;
        validateEmojiInputUI();
      });
    });

    if (pagerInfo) {
      pagerInfo.textContent = `${emojiPickerPage} / ${totalPages}`;
    }
    if (prevBtn) prevBtn.disabled = emojiPickerPage <= 1;
    if (nextBtn) nextBtn.disabled = emojiPickerPage >= totalPages;
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
          <h2 class="emoji-guess-title">已被猜出</h2>

          <div class="emoji-display-large" style="margin: 30px 0;">${currentPuzzle.emoji_text}</div>

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
          <h2 class="emoji-guess-title">猜猜这是什么电影</h2>

          <div class="emoji-display-large" style="margin: 30px 0;">${currentPuzzle.emoji_text}</div>

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
              ${renderAvatarInline(currentPuzzle.author_avatar_url, currentPuzzle.author_name, 40, 20)}
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
      const solvedId = currentPuzzle ? currentPuzzle.id : null;
      showToast('恭喜你猜对了', 'success', '!', solvedId ? {
        actionText: '查看详情',
        onAction: () => showPuzzleDetail(solvedId),
        duration: 3000
      } : { duration: 3000 });
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

  let currentLeaderboardTab = 'guess'; // 'guess' 或 'influence'

  window.showEmojiLeaderboard = async function() {
    if (!window.currentUser) {
      showToast('请先登录', 'warn');
      return;
    }

    if (window.switchLeaderboardQuizType) window.switchLeaderboardQuizType('emoji');
    document.getElementById('emojiLeaderboardOverlay').style.display = 'flex';

    // 默认显示猜对榜
    currentLeaderboardTab = 'guess';
    updateTabButtons();
    await loadLeaderboard();
  };

  window.closeEmojiLeaderboard = function() {
    document.getElementById('emojiLeaderboardOverlay').style.display = 'none';
  };

  // Tab 切换函数
  window.switchLeaderboardTab = async function(tab) {
    if (currentLeaderboardTab === tab) return;

    currentLeaderboardTab = tab;
    updateTabButtons();

    if (tab === 'guess') {
      await loadLeaderboard();
    } else if (tab === 'influence') {
      await loadInfluenceLeaderboard();
    }
  };

  // 更新 Tab 按钮样式
  function updateTabButtons() {
    const guessBtn = document.getElementById('guessTabBtn');
    const influenceBtn = document.getElementById('influenceTabBtn');

    if (currentLeaderboardTab === 'guess') {
      guessBtn.style.background = 'var(--avatar-glow-color)';
      guessBtn.style.borderColor = 'var(--avatar-border-color)';
      guessBtn.style.color = 'var(--avatar-border-color)';

      influenceBtn.style.background = 'rgba(255,255,255,0.05)';
      influenceBtn.style.borderColor = 'rgba(255,255,255,0.2)';
      influenceBtn.style.color = '#ccc';
    } else {
      influenceBtn.style.background = 'var(--avatar-glow-color)';
      influenceBtn.style.borderColor = 'var(--avatar-border-color)';
      influenceBtn.style.color = 'var(--avatar-border-color)';

      guessBtn.style.background = 'rgba(255,255,255,0.05)';
      guessBtn.style.borderColor = 'rgba(255,255,255,0.2)';
      guessBtn.style.color = '#ccc';
    }
  }

  // 加载猜对榜
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
          <div class="emoji-leaderboard-rank" style="color: ${rankColor};">
            ${rankIcon || (index + 1)}
          </div>
          <div style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid ${rankColor}; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 0 15px rgba(212,175,55,0.3); transition: all 2s ease; overflow: hidden;">
            ${avatarContent}
          </div>
          <div style="flex: 1;">
            <div class="emoji-leaderboard-name" style="color: ${rankColor};">${user.user_name}</div>
            <div style="font-size: 14px; color: #888;">猜对 ${user.correct_guess_count} 道题</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 加载影响力榜（新增）
  async function loadInfluenceLeaderboard() {
    showLoading('加载中...');

    const leaderboard = await window.getInfluenceLeaderboard(20);

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

      const puzzleCreated = user.puzzle_created_count || 0;
      const puzzleSolved = user.puzzle_solved_count || 0;
      const influenceScore = user.influenceScore || 0;

      // 使用renderAvatarInline正确渲染头像对象
      const avatarHtml = renderAvatarInline(user.user_avatar_url, user.user_name, 50, 24, false);
      const avatarContentMatch = avatarHtml.match(/<div[^>]*>(.*?)<\/div>/);
      const avatarContent = avatarContentMatch ? avatarContentMatch[1] : (user.user_avatar_url || getDefaultAvatar(user.user_name));

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
            <div style="font-size: 14px; color: #aaa; margin-top: 4px;">出题 ${puzzleCreated} | 猜中 ${puzzleSolved}</div>
            <div style="font-size: 13px; color: ${rankColor}; margin-top: 4px;">⭐ 综合: ${influenceScore}分</div>
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
