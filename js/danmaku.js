// 弹幕墙系统
(function(){

  let danmakuPaused = false;
  let danmakuMessages = [];
  let currentDisplayIndex = 0;
  let displayInterval = null;

  // 打开/关闭弹幕墙
  window.toggleDanmakuWall = function() {
    const overlay = document.getElementById('danmakuWallOverlay');
    const isActive = overlay.classList.contains('active');

    if (isActive) {
      closeDanmakuWall();
    } else {
      openDanmakuWall();
    }
  }

  // 打开弹幕墙
  async function openDanmakuWall() {
    if (!window.currentUser) {
      if (window.showBadgeToast) {
        window.showBadgeToast('请先登录', '🔒');
      }
      return;
    }

    const overlay = document.getElementById('danmakuWallOverlay');
    overlay.classList.add('active');

    // 等待 DOM 渲染完成后更新用户头像
    setTimeout(() => {
      updateDanmakuUserAvatar();
    }, 50);

    // 加载最近50条留言
    await loadDanmakuMessages();

    // 开始循环显示
    startDanmakuDisplay();
  }

  // 关闭弹幕墙
  window.closeDanmakuWall = function() {
    const overlay = document.getElementById('danmakuWallOverlay');
    overlay.classList.remove('active');

    // 停止显示
    stopDanmakuDisplay();

    // 清空弹幕容器
    const container = document.getElementById('danmakuContainer');
    if (container) {
      container.innerHTML = '';
    }

    danmakuPaused = false;
    currentDisplayIndex = 0;
  }

  // 加载弹幕留言
  async function loadDanmakuMessages() {
    if (!window.db) return;

    try {
      const snapshot = await window.db.collection('danmaku_messages')
        .orderBy('timestamp', 'asc')
        .limit(50)
        .get();

      danmakuMessages = [];
      snapshot.forEach(doc => {
        danmakuMessages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`[Danmaku] Loaded ${danmakuMessages.length} messages`);
    } catch (error) {
      console.error('[Danmaku] Failed to load messages:', error);
    }
  }

  // 开始循环显示弹幕
  function startDanmakuDisplay() {
    if (danmakuMessages.length === 0) return;

    currentDisplayIndex = 0;

    // 确保“重新播放”按钮始终存在
    const header = document.querySelector('.danmaku-header .danmaku-controls');
    if (header && !document.getElementById('danmakuReplayBtn')) {
      const replayBtn = document.createElement('button');
      replayBtn.id = 'danmakuReplayBtn';
      replayBtn.title = '重新播放';
      replayBtn.style = 'width:40px;height:40px;padding:0;display:flex;align-items:center;justify-content:center;background:var(--avatar-glow-color);border:1px solid var(--avatar-border-color);border-radius:50%;color:var(--avatar-border-color);cursor:pointer;transition:all 0.3s ease;';
      replayBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="width:20px;height:20px;"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.3-.42 2.5-1.13 3.47l1.46 1.46C19.07 16.07 20 14.13 20 12c0-4.42-3.58-8-8-8zm-6.87.13L3.13 6.54C2.42 7.5 2 8.7 2 10c0 4.42 3.58 8 8 8v4l5-5-5-5v4c-3.31 0-6-2.69-6-6 0-1.3.42-2.5 1.13-3.47z"/></svg>';
      replayBtn.onclick = function() {
        const container = document.getElementById('danmakuContainer');
        if (container) container.innerHTML = '';
        startDanmakuDisplay();
      };
      header.appendChild(replayBtn);
    }

    currentDisplayIndex = 0;
    // 每1.5秒显示一条弹幕，只显示一次
    displayInterval = setInterval(() => {
      if (danmakuPaused) return;
      if (currentDisplayIndex < danmakuMessages.length) {
        showDanmakuItem(danmakuMessages[currentDisplayIndex]);
        currentDisplayIndex++;
      } else {
        stopDanmakuDisplay();
      }
    }, 1500);
  }

  // 停止显示弹幕
  function stopDanmakuDisplay() {
    if (displayInterval) {
      clearInterval(displayInterval);
      displayInterval = null;
    }
  }

  // 显示一条弹幕
  function showDanmakuItem(data) {
    const container = document.getElementById('danmakuContainer');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'danmaku-item';

    // 随机高度（15%-85%之间）
    const randomTop = Math.random() * 70 + 15;
    item.style.top = `${randomTop}%`;

    // 头像
    const avatar = document.createElement('div');
    avatar.className = 'danmaku-avatar';

    // 头像渲染逻辑与 renderAvatar 保持一致
    const avatarMap = {
      moon: '🌔', earth: '🌏', saturn: '🪐', comet: '☄️', rocket: '🚀', star: '⭐', lightning: '⚡', tornado: '🌪️', wave: '🌊',
      chick: '🐤', penguin: '🐧', lion: '🦁', bear: '🐻', unicorn: '🦄', owl: '🦉', wolf: '🐺', seal: '🦭', shark: '🦈',
      tomato: '🍅', potato: '🥔', avocado: '🥑', cheese: '🧀',
      alien: '👽', devil: '👿', ninja: '🥷', ghost: '👻', invader: '👾', skull: '💀', robot: '🤖', wing: '🪽',
      wonderwoman: '⚡', captainmarvel: '⭐'
    };

    if (data.avatar) {
      if (typeof data.avatar === 'string') {
        avatar.textContent = data.avatar;
      } else if (data.avatar.type === 'emoji' && data.avatar.value) {
        avatar.textContent = data.avatar.value;
      } else if (data.avatar.type === 'default' && data.avatar.value) {
        avatar.textContent = data.avatar.value;
        avatar.style.background = 'transparent';
        avatar.style.color = 'var(--avatar-border-color)';
      } else if (avatarMap[data.avatar.type]) {
        avatar.textContent = avatarMap[data.avatar.type];
      } else {
        // 回退首字母
        const nickname = data.nickname || '';
        const firstChar = nickname.charAt(0).toUpperCase() || '?';
        avatar.textContent = firstChar;
        avatar.style.background = 'transparent';
        avatar.style.color = 'var(--avatar-border-color)';
      }
    } else {
      avatar.textContent = '?';
    }


    // 昵称
    const nickname = document.createElement('span');
    nickname.className = 'danmaku-nickname';
    nickname.textContent = data.nickname || '匿名';

    // 内容
    const content = document.createElement('span');
    content.className = 'danmaku-content';
    content.textContent = data.content || '';

    // 时间
    const time = document.createElement('div');
    time.className = 'danmaku-time';
    time.style.fontSize = '10px';
    time.style.marginTop = '6px';
    time.style.textAlign = 'left';
    time.style.color = 'var(--avatar-border-color)';
    let dateObj = null;
    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
      dateObj = data.timestamp.toDate();
    } else if (data.timestamp instanceof Date) {
      dateObj = data.timestamp;
    } else if (typeof data.timestamp === 'number') {
      dateObj = new Date(data.timestamp);
    }
    if (dateObj) {
      // 格式：YYYY-MM-DD HH:mm:ss
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth()+1).padStart(2,'0');
      const d = String(dateObj.getDate()).padStart(2,'0');
      const hh = String(dateObj.getHours()).padStart(2,'0');
      const mm = String(dateObj.getMinutes()).padStart(2,'0');
      const ss = String(dateObj.getSeconds()).padStart(2,'0');
      time.textContent = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    } else {
      time.textContent = '';
    }

    // 头像单独
    item.appendChild(avatar);
    item.appendChild(nickname);
    item.appendChild(document.createTextNode(': '));
    item.appendChild(content);
    // 时间放在底部左下角
    item.appendChild(time);

    container.appendChild(item);

    // 添加交互事件
    addDanmakuInteraction(item);

    // 20秒后移除
    setTimeout(() => {
      if (item.parentNode) {
        item.remove();
      }
    }, 20000);
  }

  // 添加弹幕交互（鼠标悬停/触摸暂停+发光）
  function addDanmakuInteraction(item) {
    // 获取当前主题的发光颜色
    const getGlowColor = () => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--avatar-glow-color').trim();
    };

    // 桌面端：鼠标悬停
    item.addEventListener('mouseenter', () => {
      item.style.animationPlayState = 'paused';
      item.style.boxShadow = `0 0 20px ${getGlowColor()}`;
      item.style.transform = 'scale(1.05)';
      item.style.zIndex = '10';
    });

    item.addEventListener('mouseleave', () => {
      item.style.animationPlayState = 'running';
      item.style.boxShadow = 'none';
      item.style.transform = 'scale(1)';
      item.style.zIndex = '1';
    });

    // 移动端：触摸
    let touchActive = false;

    item.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      touchActive = true;
      item.style.animationPlayState = 'paused';
      item.style.boxShadow = `0 0 20px ${getGlowColor()}`;
      item.style.transform = 'scale(1.05)';
      item.style.zIndex = '10';
    });

    item.addEventListener('touchend', (e) => {
      e.stopPropagation();
      if (touchActive) {
        setTimeout(() => {
          item.style.animationPlayState = 'running';
          item.style.boxShadow = 'none';
          item.style.transform = 'scale(1)';
          item.style.zIndex = '1';
          touchActive = false;
        }, 300);
      }
    });
  }

  // 暂停/继续弹幕
  window.toggleDanmakuPause = function() {
    danmakuPaused = !danmakuPaused;
    const icon = document.getElementById('danmakuPauseIcon');
    if (danmakuPaused) {
      // 切换到播放图标
      if (icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      document.querySelectorAll('.danmaku-item').forEach(item => {
        item.style.animationPlayState = 'paused';
      });
    } else {
      // 切换到暂停图标
      if (icon) icon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>';
      document.querySelectorAll('.danmaku-item').forEach(item => {
        item.style.animationPlayState = 'running';
      });
    }
  }

  // 发送弹幕
  window.sendDanmaku = async function() {
    if (!window.currentUser) {
      if (window.showBadgeToast) {
        window.showBadgeToast('请先登录', '🔒');
      }
      return;
    }

    const input = document.getElementById('danmakuInput');
    const content = input.value.trim();

    if (!content) return;
    if (content.length > 50) {
      if (window.showBadgeToast) {
        window.showBadgeToast('留言最多50个字', '⚠️');
      }
      return;
    }

    try {
      // 检查当前总数
      const countSnapshot = await window.db.collection('danmaku_messages').get();
      const currentCount = countSnapshot.size;

      // 如果超过50条，删除最早的一条
      if (currentCount >= 50) {
        const oldestSnapshot = await window.db.collection('danmaku_messages')
          .orderBy('timestamp', 'asc')
          .limit(1)
          .get();

        if (!oldestSnapshot.empty) {
          await oldestSnapshot.docs[0].ref.delete();
          console.log('[Danmaku] Deleted oldest message');
        }
      }

      // 添加新留言
      const newMessage = {
        userId: window.currentUser.id,
        nickname: window.currentUser.nickname,
        avatar: window.currentUser.avatar,
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db.collection('danmaku_messages').add(newMessage);

      // 立即显示在屏幕上
      showDanmakuItem({
        ...newMessage,
        timestamp: new Date()
      });

      // 添加到本地数组
      danmakuMessages.push(newMessage);
      if (danmakuMessages.length > 50) {
        danmakuMessages.shift();
      }

      // 清空输入框
      input.value = '';

      console.log('[Danmaku] Message sent successfully');

      // 显示成功提示
      if (window.showBadgeToast) {
        window.showBadgeToast('发送成功', '✨');
      }

    } catch (error) {
      console.error('[Danmaku] Failed to send message:', error);
      if (window.showBadgeToast) {
        window.showBadgeToast('发送失败，请重试', '❌');
      }
    }
  }

  // 更新输入区的用户头像
  function updateDanmakuUserAvatar() {
    if (!window.currentUser) return;

    const avatarDiv = document.getElementById('danmakuUserAvatar');
    if (!avatarDiv) return;

    // 使用renderAvatar函数来生成头像HTML
    if (window.renderAvatar) {
      avatarDiv.innerHTML = window.renderAvatar(window.currentUser.avatar, window.currentUser.nickname);
    } else {
      // 降级方案：如果renderAvatar不存在
      avatarDiv.innerHTML = '';
      const avatar = window.currentUser.avatar;
      if (!avatar) {
        avatarDiv.textContent = '?';
        avatarDiv.style.background = 'var(--avatar-bg,rgba(212,175,55,0.1))';
        return;
      }

      if (typeof avatar === 'string') {
        avatarDiv.textContent = avatar;
        avatarDiv.style.background = 'transparent';
        avatarDiv.style.color = 'var(--avatar-border-color)';
      } else if (avatar.type === 'emoji') {
        avatarDiv.textContent = avatar.value || '?';
        avatarDiv.style.background = 'transparent';
      } else if (avatar.type === 'default') {
        avatarDiv.textContent = avatar.value || '?';
        avatarDiv.style.background = 'transparent';
        avatarDiv.style.color = 'var(--avatar-border-color)';
      }
    }
  }

  // 回车发送
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('danmakuInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendDanmaku();
        }
      });
    }
  });

  // 显示删除所有弹幕确认弹窗
  window.showDeleteAllDanmakuPrompt = async function() {
    if (!window.currentUser) {
      if (window.showBadgeToast) {
        window.showBadgeToast('请先登录', '🔒');
      }
      return;
    }

    try {
      // 查询当前用户的弹幕数量
      const snapshot = await window.db.collection('danmaku_messages')
        .where('userId', '==', window.currentUser.id)
        .get();

      const count = snapshot.size;

      if (count === 0) {
        if (window.showBadgeToast) {
          window.showBadgeToast('你还没有发送过弹幕留言', 'ℹ️');
        }
        return;
      }

      // 显示弹幕数量
      const countElement = document.getElementById('deleteAllDanmakuCount');
      if (countElement) {
        countElement.textContent = `共找到 ${count} 条弹幕留言`;
      }

      // 显示确认弹窗
      const overlay = document.getElementById('deleteAllDanmakuOverlay');
      const prompt = document.getElementById('deleteAllDanmakuPrompt');
      if (overlay) overlay.classList.add('active');
      if (prompt) prompt.classList.add('active');

      console.log(`[Danmaku] Found ${count} messages to delete`);

    } catch (error) {
      console.error('[Danmaku] Failed to count messages:', error);
      if (window.showBadgeToast) {
        window.showBadgeToast('查询弹幕失败，请重试', '❌');
      }
    }
  }

  // 关闭删除所有弹幕确认弹窗
  window.closeDeleteAllDanmakuPrompt = function() {
    const overlay = document.getElementById('deleteAllDanmakuOverlay');
    const prompt = document.getElementById('deleteAllDanmakuPrompt');
    if (overlay) overlay.classList.remove('active');
    if (prompt) prompt.classList.remove('active');
  }

  // 确认删除所有弹幕
  window.confirmDeleteAllDanmaku = async function() {
    if (!window.currentUser) {
      if (window.showBadgeToast) {
        window.showBadgeToast('请先登录', '🔒');
      }
      closeDeleteAllDanmakuPrompt();
      return;
    }

    try {
      // 显示加载提示
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.classList.add('active');

      // 关闭确认弹窗
      closeDeleteAllDanmakuPrompt();

      // 查询所有该用户的弹幕
      const snapshot = await window.db.collection('danmaku_messages')
        .where('userId', '==', window.currentUser.id)
        .get();

      const deleteCount = snapshot.size;

      // 批量删除
      const batch = window.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // 重新加载弹幕列表
      await loadDanmakuMessages();

      // 清空当前屏幕上的弹幕（只清除当前用户的）
      const container = document.getElementById('danmakuContainer');
      if (container) {
        const items = container.querySelectorAll('.danmaku-item');
        items.forEach(item => {
          // 这里简单起见，清空所有弹幕，让系统重新显示
          item.remove();
        });
      }

      // 隐藏加载提示
      if (loadingOverlay) loadingOverlay.classList.remove('active');

      // 显示成功提示
      if (window.showBadgeToast) {
        window.showBadgeToast(`成功删除 ${deleteCount} 条弹幕留言`, '✅');
      }

      console.log(`[Danmaku] Successfully deleted ${deleteCount} messages`);

    } catch (error) {
      console.error('[Danmaku] Failed to delete messages:', error);

      // 隐藏加载提示
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) loadingOverlay.classList.remove('active');

      if (window.showBadgeToast) {
        window.showBadgeToast('删除失败，请重试', '❌');
      }
    }
  }

  console.log('[Danmaku] Module loaded');

})();
