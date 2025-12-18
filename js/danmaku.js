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
      alert('请先登录');
      return;
    }

    const overlay = document.getElementById('danmakuWallOverlay');
    overlay.classList.add('active');

    // 更新用户头像
    updateDanmakuUserAvatar();

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

    // 每1.5秒显示一条弹幕
    displayInterval = setInterval(() => {
      if (danmakuPaused) return;

      showDanmakuItem(danmakuMessages[currentDisplayIndex]);
      currentDisplayIndex = (currentDisplayIndex + 1) % danmakuMessages.length;
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

    if (data.avatar) {
      if (typeof data.avatar === 'string') {
        avatar.textContent = data.avatar;
      } else if (data.avatar.type === 'emoji') {
        avatar.textContent = data.avatar.value || '?';
      } else if (data.avatar.type === 'default') {
        avatar.textContent = data.avatar.value || '?';
        avatar.style.background = data.avatar.color || '#d4af37';
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

    item.appendChild(avatar);
    item.appendChild(nickname);
    item.appendChild(document.createTextNode(': '));
    item.appendChild(content);

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
    // 桌面端：鼠标悬停
    item.addEventListener('mouseenter', () => {
      item.style.animationPlayState = 'paused';
      item.style.boxShadow = '0 0 20px rgba(212,175,55,0.6)';
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
      item.style.boxShadow = '0 0 20px rgba(212,175,55,0.6)';
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
    const btn = document.getElementById('danmakuPauseBtn');

    if (danmakuPaused) {
      btn.textContent = '▶️ 继续';
      // 暂停所有正在飘的弹幕
      document.querySelectorAll('.danmaku-item').forEach(item => {
        item.style.animationPlayState = 'paused';
      });
    } else {
      btn.textContent = '⏸️ 暂停';
      // 继续所有弹幕
      document.querySelectorAll('.danmaku-item').forEach(item => {
        item.style.animationPlayState = 'running';
      });
    }
  }

  // 发送弹幕
  window.sendDanmaku = async function() {
    if (!window.currentUser) {
      alert('请先登录');
      return;
    }

    const input = document.getElementById('danmakuInput');
    const content = input.value.trim();

    if (!content) return;
    if (content.length > 50) {
      alert('留言最多50个字');
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

    } catch (error) {
      console.error('[Danmaku] Failed to send message:', error);
      alert('发送失败，请重试');
    }
  }

  // 更新输入区的用户头像
  function updateDanmakuUserAvatar() {
    if (!window.currentUser) return;

    const avatarDiv = document.getElementById('danmakuUserAvatar');
    if (!avatarDiv) return;

    // 清空
    avatarDiv.innerHTML = '';

    const avatar = window.currentUser.avatar;
    if (!avatar) {
      avatarDiv.textContent = '?';
      return;
    }

    if (typeof avatar === 'string') {
      avatarDiv.textContent = avatar;
    } else if (avatar.type === 'emoji') {
      avatarDiv.textContent = avatar.value || '?';
    } else if (avatar.type === 'default') {
      avatarDiv.textContent = avatar.value || '?';
      avatarDiv.style.background = avatar.color || '#d4af37';
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

  console.log('[Danmaku] Module loaded');

})();
