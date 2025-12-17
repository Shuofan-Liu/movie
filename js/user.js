// 用户管理模块 - 注册、登录、用户页面
(function(){
  
  // 当前登录用户信息
  window.currentUser = null;

  // ============ 模态框控制 ============
  
  window.showLoginModal = function(){
    document.getElementById('loginModalOverlay').classList.add('active');
    document.getElementById('loginModal').classList.add('active');
    showLoginChoice();
  }

  window.closeLoginModal = function(){
    document.getElementById('loginModalOverlay').classList.remove('active');
    document.getElementById('loginModal').classList.remove('active');
    // 重置表单
    document.getElementById('loginChoice').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  }

  window.showLoginChoice = function(){
    document.getElementById('loginChoice').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  }

  window.showLoginForm = function(){
    document.getElementById('loginChoice').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  }

  window.showRegisterForm = function(){
    document.getElementById('loginChoice').classList.add('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
  }

  // ============ 头像选择器 ============
  
  // 初始化头像选择器
  window.initAvatarSelector = function(){
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const selectedInput = document.getElementById('selectedAvatar');
    
    if (!avatarOptions || !selectedInput) return;
    
    avatarOptions.forEach(option => {
      option.addEventListener('click', function(){
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedInput.value = this.getAttribute('data-avatar');
      });
    });
  }

  // 生成默认首字母头像
  function generateDefaultAvatar(nickname){
      if (!nickname) return { type: 'default', value: '?', color: '#d4af37' };
    
    const firstChar = nickname.charAt(0).toUpperCase();
    
    return {
      type: 'default',
      value: firstChar,
        color: '#d4af37'
    };
  }

  // 渲染头像（用于显示）
  window.renderAvatar = function(avatar, nickname){
    if (!avatar || avatar.type === 'default') {
      const defaultAvatar = generateDefaultAvatar(nickname);
        return `<div class="default-avatar" style="color: ${defaultAvatar.color}">${defaultAvatar.value}</div>`;
    }
    
    const avatarMap = {
      wave: '🌊', tomato: '🍅', lightning: '⚡', star: '⭐',
      saturn: '🪐', comet: '☄️', alien: '👽', devil: '👿', wing: '🪽',
      // 兼容旧数据
      wonderwoman: '⚡', captainmarvel: '⭐'
    };
    
    const emoji = avatarMap[avatar.type] || '👤';
    return `<div class="avatar-emoji">${emoji}</div>`;
  }

  // ============ 登录 ============
  
  let isLoggingIn = false; // 防止重复提交
  
  window.handleLogin = async function(event){
    event.preventDefault();
    
    // 防止重复提交
    if (isLoggingIn) {
      console.log('正在登录中，请勿重复提交');
      return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    const nickname = document.getElementById('loginNickname').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!nickname || !password) {
      alert('请填写昵称和密码');
      return;
    }

    // 设置登录状态
    isLoggingIn = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '登录中...';
    }

    try {
      const user = await window.getUserByNickname(nickname);
      if (!user) {
        alert('用户不存在');
        return;
      }

      if (user.password !== password) {
        alert('密码错误');
        return;
      }

      // 登录成功
      window.currentUser = user;
      localStorage.setItem('currentUserId', user.id);
      updateUserStatus();
      closeLoginModal();
      alert(`欢迎回来，${nickname}！`);
    } finally {
      // 恢复按钮状态
      isLoggingIn = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '登录';
      }
    }
  }

  // ============ 注册 ============
  
  let isRegistering = false; // 防止重复提交
  
  window.handleRegister = async function(event){
    event.preventDefault();
    
    // 防止重复提交
    if (isRegistering) {
      console.log('正在注册中，请勿重复提交');
      return;
    }

    // 获取提交按钮
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // 获取表单数据
    const nickname = document.getElementById('regNickname').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();
    const favoriteDirector = document.getElementById('favoriteDirector').value.trim();
    const favoriteFilm = document.getElementById('favoriteFilm').value.trim();
    const recentFilm = document.getElementById('recentFilm').value.trim();
    const thoughts = document.getElementById('thoughts').value.trim();

    // 验证
    if (!nickname || !password || !favoriteDirector || !favoriteFilm) {
      alert('请填写所有必填字段');
      return;
    }

    if (password.length < 4) {
      alert('密码至少需要4个字符');
      return;
    }

    if (password !== passwordConfirm) {
      alert('两次输入的密码不一致');
      return;
    }

    // 检查昵称是否已存在
    const existing = await window.getUserByNickname(nickname);
    if (existing) {
      alert('昵称已被使用，请换一个');
      return;
    }

    // 获取选择的头像
    const selectedAvatarType = document.getElementById('selectedAvatar').value;
    const avatar = selectedAvatarType 
      ? { type: selectedAvatarType } 
      : generateDefaultAvatar(nickname);

    // 设置提交状态
    isRegistering = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '注册中...';
    }

    const loadingEl = document.getElementById('loadingOverlay');
    loadingEl.classList.add('active');

    try {
      console.log('开始创建用户...');
      
      // 创建用户数据（无图片上传）
      const userData = {
        nickname,
        password,
        avatar,
        favoriteDirector,
        favoriteFilm,
        recentFilm: recentFilm || '',
        thoughts: thoughts || '',
        badges: {},
        userStyle: ''
      };

      const userId = await window.createUser(userData);
      console.log('用户创建结果:', userId);
      
      if (!userId) {
        alert('注册失败：无法创建用户，请稍后再试');
        loadingEl.classList.remove('active');
        return;
      }

      console.log('注册成功，用户ID:', userId);
      
      // 登录新用户
      window.currentUser = { id: userId, ...userData };
      localStorage.setItem('currentUserId', userId);
      updateUserCorner();
      closeLoginModal();
      loadingEl.classList.remove('active');
      alert(`注册成功，欢迎 ${nickname}！`);

      // 清空表单
      document.getElementById('regForm').reset();
      document.getElementById('selectedAvatar').value = '';
      document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));

    } catch (error) {
      console.error('注册失败:', error);
      alert('注册失败: ' + error.message);
      loadingEl.classList.remove('active');
    } finally {
      // 恢复提交按钮状态
      isRegistering = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
      }
    }
  }

  // ============ 用户状态更新 ============
  
  window.logoutUser = function(){
    window.currentUser = null;
    localStorage.removeItem('currentUserId');
    
    // 关闭用户下拉菜单
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    // 重置应用状态
    if (window.APP_STATE) {
      window.APP_STATE.currentUser = null;
      window.APP_STATE.isAdmin = false;
    }
    
    updateUserCorner();
    alert('已退出登录');
    
    // 如果用户模态框打开，关闭它
    const userModal = document.getElementById('userModal');
    const userModalOverlay = document.getElementById('userModalOverlay');
    if (userModal) userModal.classList.remove('active');
    if (userModalOverlay) userModalOverlay.classList.remove('active');

    // 隐藏右侧抽屉标签
    const tab = document.getElementById('usersSidebarTab');
    if (tab) tab.style.display = 'none';
  }

  // ============ 用户界面状态管理 ============
  let currentModalView = 'profile'; // 'profile' or 'messages'
  
  // ============ 用户页面显示 ============
  
  window.showUserPage = async function(userId){
    // 打开用户详情前，若用户侧边栏处于打开状态，则关闭以免遮挡
    try {
      const overlay = document.getElementById('usersSidebarOverlay');
      if (overlay && overlay.classList.contains('active')) {
        closeUsersSidebar();
      }
    } catch (_) {}
    window.currentViewingUserId = userId; // 保存当前查看的用户ID
    currentModalView = 'profile'; // 切换到详情界面
    await (typeof syncIndex === 'function' ? syncIndex(userId) : Promise.resolve());
    
    const user = await window.getUserById(userId);
    if (!user) {
      alert('用户不存在');
      return;
    }

    const isOwn = window.currentUser && window.currentUser.id === userId;
    const isAdmin = window.APP_STATE && window.APP_STATE.isAdmin;

    let badgesHtml = '';
    if (user.badges) {
      if (user.badges.oscar) badgesHtml += '<span class="badge-icon-small" title="奥斯卡小金人">🏅</span>';
      if (user.badges.cannes) badgesHtml += '<span class="badge-icon-small" title="戛纳金棕榈">🌴</span>';
      if (user.badges.berlin) badgesHtml += '<span class="badge-icon-small" title="柏林金熊">🐻</span>';
      if (user.badges.venice) badgesHtml += '<span class="badge-icon-small" title="威尼斯金狮">🦁</span>';
      if (user.badges.potato) badgesHtml += '<span class="badge-icon-small" title="瓦尔达土豆">🥔</span>';
    }

    let styleHtml = user.userStyle ? `
      <div class="user-section">
        <h3>🎬 电影风格</h3>
        <p>${typeof user.userStyle === 'object' ? (user.userStyle.name || JSON.stringify(user.userStyle)) : user.userStyle}</p>
      </div>
    ` : '';

    const userIdHtml = isAdmin ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">ID: ${userId}</div>` : '';

    const html = `
      <div class="user-header">
        <div class="user-avatar-display">${renderAvatar(user.avatar, user.nickname)}</div>
        <div class="user-info">
          <h2>${user.nickname}</h2>
          ${userIdHtml}
          <div class="user-badges">${badgesHtml}</div>
        </div>
        <button class="view-messages-btn" onclick="showUserMessages('${userId}')">📬 查看留言</button>
      </div>

      <div class="user-section">
        <h3>💖 最喜欢的女导演</h3>
        <p>${user.favoriteDirector}</p>
      </div>

      <div class="user-section">
        <h3>🎬 最喜欢的女性电影</h3>
        <p>${user.favoriteFilm}</p>
      </div>

      ${user.recentFilm ? `
        <div class="user-section">
          <h3>🎞️ 最近看的电影</h3>
          <p>${user.recentFilm}</p>
        </div>
      ` : ''}

      ${user.thoughts ? `
        <div class="user-section">
          <h3>💭 最近的想法</h3>
          <p>${user.thoughts}</p>
        </div>
      ` : ''}

      ${styleHtml}
    `;

    document.getElementById('userContent').innerHTML = html;
    document.getElementById('userModalOverlay').classList.add('active');
    document.getElementById('userModal').classList.add('active');
  }
  
  // ============ 用户留言板界面 ============
  
  window.showUserMessages = async function(userId){
    window.currentViewingUserId = userId; // 保存当前查看的用户ID
    currentModalView = 'messages'; // 切换到留言板界面
    await (typeof syncIndex === 'function' ? syncIndex(userId) : Promise.resolve());
    
    const user = await window.getUserById(userId);
    if (!user) {
      alert('用户不存在');
      return;
    }
    
    if (!window.getMessagesForUser) {
      alert('消息系统未加载');
      return;
    }
    
    const messages = await window.getMessagesForUser(userId);
    const myMessage = window.currentUser && window.currentUser.id !== userId ? 
      await window.getMessageBetween(window.currentUser.id, userId) : null;

    let messagesHtml = '<div class="user-messages-section">';
    messagesHtml += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';
    messagesHtml += '<h3 style="margin: 0;">📬 ' + user.nickname + ' 的留言板</h3>';
    messagesHtml += '<button class="back-to-profile-btn" onclick="showUserPage(\'' + userId + '\')">&larr; 返回资料</button>';
    messagesHtml += '</div><div class="messages-board">';

    // 显示所有留言
    if (messages && messages.length > 0) {
      messages.forEach(msg => {
        const timeStr = window.formatTime ? window.formatTime(msg.timestamp) : '不久前';
        messagesHtml += `
          <div class="message-item">
            <div class="message-header">
              <div class="message-from-avatar">${renderAvatar(msg.fromAvatar, msg.fromNickname)}</div>
              <div class="message-from-info">
                <div class="message-from-name">${msg.fromNickname}</div>
                <div class="message-time">${timeStr}</div>
              </div>
            </div>
            <div class="message-content">${msg.content}</div>
          </div>
        `;
      });
    } else {
      messagesHtml += '<p style="color: #888; text-align: center; padding: 20px;">还没有留言</p>';
    }

    messagesHtml += '</div>';

    // 显示留言输入框（只有登录且不是自己的页面才显示）
    if (window.currentUser && window.currentUser.id !== userId) {
      if (myMessage) {
        // 编辑模式
        messagesHtml += `
          <div class="message-compose">
            <textarea id="messageContent" maxlength="500">${myMessage.content}</textarea>
            <div class="message-compose-actions">
              <button class="message-action-btn update-btn" onclick="updateMyMessage('${myMessage.id}')">更新</button>
              <button class="message-action-btn delete-btn" onclick="deleteMyMessage('${myMessage.id}')">删除</button>
            </div>
          </div>
        `;
      } else {
        // 新留言模式
        messagesHtml += `
          <div class="message-compose">
            <textarea id="messageContent" placeholder="写下你的留言..." maxlength="500"></textarea>
            <div class="message-compose-actions">
              <button class="message-action-btn send-btn" onclick="sendMessage('${userId}', '${user.nickname}')">发送</button>
            </div>
          </div>
        `;
      }
    }

    messagesHtml += '</div>';

    document.getElementById('userContent').innerHTML = messagesHtml;
    document.getElementById('userModalOverlay').classList.add('active');
    document.getElementById('userModal').classList.add('active');
  }

  window.closeUserModal = function(){
    document.getElementById('userModalOverlay').classList.remove('active');
    document.getElementById('userModal').classList.remove('active');
    currentModalView = 'profile';
  }
  
  // 获取当前界面状态
  window.getCurrentModalView = function(){
    return currentModalView;
  }

  // 点击切换逻辑已移除，改用按钮导航

  // ============ 左右切换（资料/留言保持当前视图）===========
  async function ensureUsersCache(){
    if (!Array.isArray(allUsersCache) || allUsersCache.length === 0) {
      allUsersCache = await window.getAllUsers();
    }
  }
  async function syncIndex(userId){
    await ensureUsersCache();
    let idx = allUsersCache.findIndex(u => u.id === userId);
    if (idx < 0) {
      allUsersCache = await window.getAllUsers();
      idx = allUsersCache.findIndex(u => u.id === userId);
    }
    currentUserIndex = idx >= 0 ? idx : 0;
  }
  window.userChevronNext = async function(){
    await ensureUsersCache();
    let uid = window.currentViewingUserId || (window.currentUser && window.currentUser.id) || (allUsersCache[0] && allUsersCache[0].id);
    await syncIndex(uid);
    if (allUsersCache.length === 0) return;
    currentUserIndex = (currentUserIndex + 1) % allUsersCache.length;
    const next = allUsersCache[currentUserIndex];
    if (window.getCurrentModalView && window.getCurrentModalView() === 'messages') {
      await showUserMessages(next.id);
    } else {
      await showUserPage(next.id);
    }
  };
  window.userChevronPrev = async function(){
    await ensureUsersCache();
    let uid = window.currentViewingUserId || (window.currentUser && window.currentUser.id) || (allUsersCache[0] && allUsersCache[0].id);
    await syncIndex(uid);
    if (allUsersCache.length === 0) return;
    currentUserIndex = (currentUserIndex - 1 + allUsersCache.length) % allUsersCache.length;
    const prev = allUsersCache[currentUserIndex];
    if (window.getCurrentModalView && window.getCurrentModalView() === 'messages') {
      await showUserMessages(prev.id);
    } else {
      await showUserPage(prev.id);
    }
  };

  // ============ 用户列表页面 ============
  
  window.showUsersPage = async function(){
    const users = await window.getAllUsers();
    const isAdmin = window.APP_STATE && window.APP_STATE.isAdmin;
    
    if (!users || users.length === 0) {
      document.getElementById('usersGrid').innerHTML = '<p style="text-align:center;color:#888;">还没有用户注册</p>';
    } else {
      const html = users.map(user => {
        let badgesHtml = '';
        if (user.badges) {
          if (user.badges.oscar) badgesHtml += '<span class="badge-icon-small">🏅</span>';
          if (user.badges.cannes) badgesHtml += '<span class="badge-icon-small">🌴</span>';
          if (user.badges.berlin) badgesHtml += '<span class="badge-icon-small">🐻</span>';
          if (user.badges.venice) badgesHtml += '<span class="badge-icon-small">🦁</span>';
          if (user.badges.potato) badgesHtml += '<span class="badge-icon-small">🥔</span>';
        }
        
        const userIdHtml = isAdmin ? `<div class="user-card-id">ID: ${user.id.substring(0, 8)}...</div>` : '';
        
        return `
          <div class="user-card" onclick="showUserPage('${user.id}')">
            <div class="user-card-avatar">${renderAvatar(user.avatar, user.nickname)}</div>
            <div class="user-card-name">${user.nickname}</div>
            ${userIdHtml}
            <div class="user-card-badges">${badgesHtml}</div>
          </div>
        `;
      }).join('');
      
      document.getElementById('usersGrid').innerHTML = html;
    }

    document.getElementById('usersPageOverlay').classList.add('active');
    document.getElementById('usersPage').classList.add('active');
  }

  window.closeUsersPage = function(){
    document.getElementById('usersPageOverlay').classList.remove('active');
    document.getElementById('usersPage').classList.remove('active');
  }

  // ============ 编辑和删除 ============
  
  window.editOwnProfile = function(){
    if (!window.currentUser) return;
    
    const user = window.currentUser;
    
    // 创建编辑表单HTML
    const editFormHtml = `
      <div style="max-width: 500px; margin: 0 auto;">
        <h3 style="text-align: center; margin-bottom: 20px;">编辑资料</h3>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #d4af37;">最喜欢的女导演</label>
          <input type="text" id="editDirector" value="${user.favoriteDirector || ''}" 
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #d4af37;">最喜欢的女性电影</label>
          <input type="text" id="editFilm" value="${user.favoriteFilm || ''}" 
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #d4af37;">最近看的电影</label>
          <input type="text" id="editRecentFilm" value="${user.recentFilm || ''}" 
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; color: #d4af37;">最近的想法</label>
          <textarea id="editThoughts" rows="4" 
                    style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px; resize: vertical;">${user.thoughts || ''}</textarea>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="saveProfileEdit()" style="padding: 10px 30px; background: rgba(212,175,55,0.2); border: 1px solid rgba(212,175,55,0.4); color: #d4af37; border-radius: 8px; cursor: pointer; font-size: 14px;">保存</button>
          <button onclick="closeUserModal()" style="padding: 10px 30px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #ccc; border-radius: 8px; cursor: pointer; font-size: 14px;">取消</button>
        </div>
      </div>
    `;
    
    document.getElementById('userContent').innerHTML = editFormHtml;
    document.getElementById('userModalOverlay').classList.add('active');
    document.getElementById('userModal').classList.add('active');
  }
  
  window.saveProfileEdit = async function(){
    if (!window.currentUser) return;
    
    const director = document.getElementById('editDirector').value.trim();
    const film = document.getElementById('editFilm').value.trim();
    const recentFilm = document.getElementById('editRecentFilm').value.trim();
    const thoughts = document.getElementById('editThoughts').value.trim();
    
    const updateData = {};
    if (director !== window.currentUser.favoriteDirector) updateData.favoriteDirector = director;
    if (film !== window.currentUser.favoriteFilm) updateData.favoriteFilm = film;
    if (recentFilm !== window.currentUser.recentFilm) updateData.recentFilm = recentFilm;
    if (thoughts !== window.currentUser.thoughts) updateData.thoughts = thoughts;
    
    if (Object.keys(updateData).length === 0) {
      alert('没有修改任何内容');
      return;
    }
    
    const success = await window.updateUser(window.currentUser.id, updateData);
    
    if (success) {
      // 更新本地缓存
      if (updateData.favoriteDirector !== undefined) window.currentUser.favoriteDirector = updateData.favoriteDirector;
      if (updateData.favoriteFilm !== undefined) window.currentUser.favoriteFilm = updateData.favoriteFilm;
      if (updateData.recentFilm !== undefined) window.currentUser.recentFilm = updateData.recentFilm;
      if (updateData.thoughts !== undefined) window.currentUser.thoughts = updateData.thoughts;
      
      // 更新下拉菜单显示
      if (window.updateUserCorner) {
        window.updateUserCorner();
      }
      
      alert('资料已更新！');
      closeUserModal();
      
      // 刷新显示
      setTimeout(() => {
        showUserPage(window.currentUser.id);
      }, 300);
    } else {
      alert('更新失败，请稍后再试');
    }
  }

  window.deleteUserAccount = async function(userId){
    const confirm = window.confirm('确定要删除此账户吗？此操作无法撤销！');
    if (!confirm) return;

    const success = await window.deleteUser(userId);
    if (success) {
      alert('账户已删除');
      closeUserModal();
      if (window.currentUser && window.currentUser.id === userId) {
        logoutUser();
      }
    } else {
      alert('删除失败');
    }
  }

  // ============ 初始化 ============
  
  // 页面加载时检查是否有登录用户
  window.addEventListener('DOMContentLoaded', async function(){
    const userId = localStorage.getItem('currentUserId');
    if (userId) {
      const user = await window.getUserById(userId);
      if (user) {
        window.currentUser = user;
        updateUserCorner();
      } else {
        localStorage.removeItem('currentUserId');
      }
    }
    updateUserCorner();
  });

  // ============ 新的左上角用户入口 ============
  
  let allUsersCache = [];
  let currentUserIndex = -1;
  
  window.initUserCorner = function(){
    // 初始化时更新状态
    updateUserCorner();
  }
  
  function updateUserCorner(){
    const cornerFlame = document.getElementById('cornerFlame');
    const cornerAvatar = document.getElementById('cornerAvatar');
    const quizButton = document.getElementById('quizIconButton');
    const sidebarTab = document.getElementById('usersSidebarTab');
    
    if (window.currentUser) {
      // 已登录：显示头像
      if (cornerFlame) cornerFlame.style.display = 'none';
      if (cornerAvatar) cornerAvatar.style.display = 'flex';
      const avatarImg = document.getElementById('cornerAvatarImg');
      if (avatarImg) avatarImg.innerHTML = window.renderAvatar(window.currentUser.avatar, window.currentUser.nickname);
      
      // 显示测验按钮
      if (quizButton) quizButton.style.display = 'flex';
      // 显示右侧抽屉标签
      if (sidebarTab) sidebarTab.style.display = 'flex';
      
      // 更新留言角标
      if (window.updateMessageBadge) window.updateMessageBadge();
      
      // 更新下拉菜单内容
      updateDropdownContent();
    } else {
      // 未登录：显示火焰
      if (cornerFlame) cornerFlame.style.display = 'flex';
      if (cornerAvatar) cornerAvatar.style.display = 'none';
      
        // 隐藏测验按钮
        if (quizButton) quizButton.style.display = 'none';
        // 隐藏右侧抽屉标签
        if (sidebarTab) sidebarTab.style.display = 'none';
    }
  }
  
  window.toggleUserMenu = function(){
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
    
    // 点击其他地方关闭
    if (dropdown.classList.contains('active')) {
      setTimeout(() => {
        document.addEventListener('click', closeDropdownOnClickOutside);
      }, 100);
    }
  }
  
  function closeDropdownOnClickOutside(e){
    const dropdown = document.getElementById('userDropdown');
    const avatar = document.getElementById('cornerAvatar');
    if (!dropdown.contains(e.target) && !avatar.contains(e.target)) {
      dropdown.classList.remove('active');
      document.removeEventListener('click', closeDropdownOnClickOutside);
    }
  }
  
  function updateDropdownContent(){
    if (!window.currentUser) return;
    
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const dropdownNickname = document.getElementById('dropdownNickname');
    const dropdownStyle = document.getElementById('dropdownStyle');
    const dropdownDirector = document.getElementById('dropdownDirector');
    const dropdownFilm = document.getElementById('dropdownFilm');
    const dropdownBadges = document.getElementById('dropdownBadges');
    
    if (dropdownAvatar) dropdownAvatar.innerHTML = window.renderAvatar(window.currentUser.avatar, window.currentUser.nickname);
    if (dropdownNickname) dropdownNickname.textContent = window.currentUser.nickname;
    if (dropdownStyle) dropdownStyle.textContent = window.currentUser.userStyle || '未完成测验';
    if (dropdownDirector) dropdownDirector.textContent = window.currentUser.favoriteDirector || '-';
    if (dropdownFilm) dropdownFilm.textContent = window.currentUser.favoriteFilm || '-';
    
    let badgesHtml = '';
    if (window.currentUser.badges) {
      if (window.currentUser.badges.oscar) badgesHtml += '🏅';
      if (window.currentUser.badges.cannes) badgesHtml += '🌴';
      if (window.currentUser.badges.berlin) badgesHtml += '🐻';
      if (window.currentUser.badges.venice) badgesHtml += '🦁';
      if (window.currentUser.badges.potato) badgesHtml += '🥔';
    }
    if (dropdownBadges) dropdownBadges.innerHTML = badgesHtml || '<span style="color:#888;">暂无徽章</span>';
  }
  
  // 暴露为全局函数，供外部调用
  window.updateDropdownContent = updateDropdownContent;
  
  // ============ 用户列表侧边栏 ============
  
  window.showUsersSidebar = async function(){
    const users = await window.getAllUsers();
    allUsersCache = users;
    
    if (!users || users.length === 0) {
      document.getElementById('usersSidebarGrid').innerHTML = '<p style="text-align:center;color:#888;padding:40px;">还没有用户注册</p>';
    } else {
      const html = users.map(user => {
        let badgesHtml = '';
        if (user.badges) {
          if (user.badges.oscar) badgesHtml += '<span class="badge-icon-small">🏅</span>';
          if (user.badges.cannes) badgesHtml += '<span class="badge-icon-small">🌴</span>';
          if (user.badges.berlin) badgesHtml += '<span class="badge-icon-small">🐻</span>';
          if (user.badges.venice) badgesHtml += '<span class="badge-icon-small">🦁</span>';
          if (user.badges.potato) badgesHtml += '<span class="badge-icon-small">🥔</span>';
        }
        
        const styleTag = user.userStyle ? `<div style="font-size:11px;color:#888;margin-top:4px;">${user.userStyle}</div>` : '';
        
        return `
          <div class="user-card" onclick="showUserPage('${user.id}')">
            <div class="user-card-avatar">${window.renderAvatar(user.avatar, user.nickname)}</div>
            <div class="user-card-name">${user.nickname}</div>
            ${styleTag}
            <div class="user-card-badges">${badgesHtml}</div>
          </div>
        `;
      }).join('');
      
      document.getElementById('usersSidebarGrid').innerHTML = html;
    }
    
    const overlay = document.getElementById('usersSidebarOverlay');
    const sidebar = document.getElementById('usersSidebar');
    const tab = document.getElementById('usersSidebarTab');
    if (overlay) overlay.classList.add('active');
    if (sidebar) {
      sidebar.classList.add('active');
      sidebar.style.transform = 'translateX(0px)';
    }
    if (overlay) overlay.style.opacity = '0.6';
    // 标签固定在视窗右侧：打开时移动到抽屉左缘之外（框外）
    if (tab) {
      const width = sidebar ? (sidebar.getBoundingClientRect().width || 320) : 320;
      const margin = 4; // 与抽屉金色边框的间距
      tab.style.right = Math.max(0, width + margin) + 'px';
    }
  }
  
  window.closeUsersSidebar = function(){
    const overlay = document.getElementById('usersSidebarOverlay');
    const sidebar = document.getElementById('usersSidebar');
    const tab = document.getElementById('usersSidebarTab');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.classList.remove('active');
    }
    if (sidebar) {
      const width = sidebar.getBoundingClientRect().width || 320;
      sidebar.style.transform = `translateX(${width}px)`;
      sidebar.classList.remove('active');
    }
    // 标签固定在视窗右侧：关闭时复位到右缘
    if (tab) {
      tab.style.right = '0px';
    }
  }
  
  // ============ 用户详情页（带留言板）============
  
  window.showNextUser = async function(){
    await (typeof ensureUsersCache === 'function' ? ensureUsersCache() : Promise.resolve());
    if (allUsersCache.length === 0) return;
    const uid = window.currentViewingUserId || (window.currentUser && window.currentUser.id) || (allUsersCache[0] && allUsersCache[0].id);
    await (typeof syncIndex === 'function' ? syncIndex(uid) : Promise.resolve());
    currentUserIndex = (currentUserIndex + 1) % allUsersCache.length;
    const nextUser = allUsersCache[currentUserIndex];
    if (window.getCurrentModalView && window.getCurrentModalView() === 'messages') {
      await showUserMessages(nextUser.id);
    } else {
      await showUserPage(nextUser.id);
    }
  }

  // ============ 右侧标签按钮：切换侧边栏 ==========
  window.initUsersSidebarTab = function(){
    const tab = document.getElementById('usersSidebarTab');
    if (!tab) return;
    // 初始箭头
    const overlay = document.getElementById('usersSidebarOverlay');
    const sidebar = document.getElementById('usersSidebar');
    // 仅登录显示标签
    if (window.currentUser) {
      tab.style.display = 'flex';
    } else {
      tab.style.display = 'none';
    }
    // 初始靠右缘
    tab.style.right = tab.style.right || '0px';
  }

  window.toggleUsersSidebarTab = function(){
    const sidebar = document.getElementById('usersSidebar');
    const tab = document.getElementById('usersSidebarTab');
    const isOpen = sidebar && sidebar.classList.contains('active');
    if (isOpen) {
      // 关闭并更新箭头
      closeUsersSidebar();
    } else {
      // 打开侧边栏
      showUsersSidebar();
    }
  }
  
  // ============ 管理员密码弹窗 ============
  
  window.showAdminPrompt = function(){
    document.getElementById('userDropdown').classList.remove('active');
    document.getElementById('adminPromptOverlay').classList.add('active');
    document.getElementById('adminPrompt').classList.add('active');
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminPasswordInput').focus();
  }
  
  window.closeAdminPrompt = function(){
    document.getElementById('adminPromptOverlay').classList.remove('active');
    document.getElementById('adminPrompt').classList.remove('active');
  }
  
  window.confirmAdminPassword = function(){
    const password = document.getElementById('adminPasswordInput').value;
    if (password === 'cinema2026') {
      window.APP_STATE.isAdmin = true;
      closeAdminPrompt();
      alert('已进入管理员模式');
      // 刷新当前页面显示
      if (document.getElementById('userModal').classList.contains('active')) {
        const currentUserId = document.querySelector('[data-current-user-id]')?.dataset.currentUserId;
        if (currentUserId) showUserPage(currentUserId);
      }
    } else {
      alert('密码错误');
    }
  }
  
  // ============ 删除自己的账户 ============
  
  window.deleteOwnAccount = async function(){
    if (!window.currentUser) return;
    
    const confirmed = confirm(`确定要注销账户吗？此操作不可恢复！\n\n你的昵称：${window.currentUser.nickname}`);
    if (!confirmed) return;
    
    const doubleConfirm = confirm('再次确认：真的要删除你的账户吗？');
    if (!doubleConfirm) return;
    
    try {
      await window.deleteUser(window.currentUser.id);
      alert('账户已注销');
      window.currentUser = null;
      localStorage.removeItem('currentUserId');
      document.getElementById('userDropdown').classList.remove('active');
      updateUserCorner();
    } catch (error) {
      alert('注销失败：' + error.message);
    }
  }
  
  // ============ 留言操作 ============
  
  window.sendMessage = async function(toUserId, toNickname){
    if (!window.currentUser) {
      alert('请先登录');
      return;
    }
    
    const content = document.getElementById('messageContent').value.trim();
    if (!content) {
      alert('请输入留言内容');
      return;
    }
    
    if (content.length > 500) {
      alert('留言不能超过500字');
      return;
    }
    
    try {
      await window.createMessage({
        toUserId: toUserId,
        fromUserId: window.currentUser.id,
        fromNickname: window.currentUser.nickname,
        fromAvatar: window.currentUser.avatar,
        content: content,
        isRead: false
      });
      
      alert('留言发送成功');
      window.currentViewingUserId = toUserId; // 保存当前查看的用户
      // 发送后留在留言板，直接刷新当前用户的留言视图
      showUserMessages(toUserId);
    } catch (error) {
      alert('发送失败：' + error.message);
    }
  }
  
  window.updateMyMessage = async function(messageId){
    const content = document.getElementById('messageContent').value.trim();
    if (!content) {
      alert('留言内容不能为空');
      return;
    }
    
    if (content.length > 500) {
      alert('留言不能超过500字');
      return;
    }
    
    try {
      await window.updateMessage(messageId, content);
      alert('留言已更新');
      // 刷新当前留言板并停留
      if (window.currentViewingUserId) {
        showUserMessages(window.currentViewingUserId);
      }
    } catch (error) {
      alert('更新失败：' + error.message);
    }
  }
  
  window.deleteMyMessage = async function(messageId){
    const confirmed = confirm('确定要删除这条留言吗？');
    if (!confirmed) return;
    
    try {
      await window.deleteMessage(messageId);
      alert('留言已删除');
      // 刷新当前留言板并停留
      if (window.currentViewingUserId) {
        showUserMessages(window.currentViewingUserId);
      }
    } catch (error) {
      alert('删除失败：' + error.message);
    }
  }

  // 兼容旧函数名
  window.updateUserStatus = updateUserCorner;
  window.showUsersPage = showUsersSidebar;
  window.closeUsersPage = closeUsersSidebar;

})();
