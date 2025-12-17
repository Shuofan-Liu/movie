// 用户管理模块 - 注册、登录、用户页面
(function(){
  
  // 当前登录用户信息
  window.currentUser = null;

  // 关系类型配置
  window.RELATIONSHIP_TYPES = {
    lifelong: { key: 'lifelong', name: 'Lifelong Relationship', emoji: '💫' },
    partner: { key: 'partner', name: 'The Best Partner', emoji: '🤝' },
    friend: { key: 'friend', name: 'Sincere Friend', emoji: '👭' },
    communication: { key: 'communication', name: 'Further Communication', emoji: '💬' }
  };

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
    // 检查是否应该显示首字母头像：
    // 1. avatar 不存在
    // 2. avatar.type 是 'default'
    // 3. avatar.type 是空字符串或无效值
    if (!avatar || avatar.type === 'default' || !avatar.type || avatar.type.trim() === '') {
      const defaultAvatar = generateDefaultAvatar(nickname);
        return `<div class="default-avatar" style="color: ${defaultAvatar.color}">${defaultAvatar.value}</div>`;
    }
    
    const avatarMap = {
      wave: '🌊', tomato: '🍅', lightning: '⚡', star: '⭐',
      saturn: '🪐', comet: '☄️', alien: '👽', devil: '👿', wing: '🪽', potato: '🥔',
      // 兼容旧数据
      wonderwoman: '⚡', captainmarvel: '⭐'
    };
    
    // 如果找到对应的emoji就显示，找不到就显示首字母头像（而不是默认人形图标）
    if (avatarMap[avatar.type]) {
      return `<div class="avatar-emoji">${avatarMap[avatar.type]}</div>`;
    } else {
      // 无效的 avatar.type，回退到首字母头像
      const defaultAvatar = generateDefaultAvatar(nickname);
      return `<div class="default-avatar" style="color: ${defaultAvatar.color}">${defaultAvatar.value}</div>`;
    }
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
    const selectedAvatarType = document.getElementById('selectedAvatar').value.trim();
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
  
  // 关系标题工具
  function relationTitle(rel){
    const t = window.RELATIONSHIP_TYPES[rel.type];
    return t ? `${t.emoji} ${t.name}` : rel.type;
  }

  // 关系中心：查看已建立与待处理，并进行处理
  window.showRelationshipCenter = async function(){
    if (!window.currentUser) {
      alert('请先登录');
      return;
    }
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
    const userId = window.currentUser.id;
    const [all, pendings] = await Promise.all([
      window.getRelationshipsForUser ? window.getRelationshipsForUser(userId) : Promise.resolve([]),
      window.getPendingRelationshipRequests ? window.getPendingRelationshipRequests(userId) : Promise.resolve([])
    ]);

    const accepted = (all || []).filter(r=> r.status === 'accepted' || r.status === 'dissolve_pending');

    function otherOf(r){
      const isFrom = r.fromUserId === userId;
      return {
        id: isFrom ? r.toUserId : r.fromUserId,
        name: isFrom ? (r.toNickname||'对方') : (r.fromNickname||'对方'),
        avatar: isFrom ? r.toAvatar : r.fromAvatar,
        initiatedByMe: isFrom
      };
    }

    function statusTip(r, viewerId){
      if (r.status === 'dissolve_pending') {
        return r.fromUserId === viewerId ? '等待对方确认解除' : '对方请求解除';
      }
      return '';
    }

    const acceptedHtml = accepted.length ? accepted.map(r=>{
      const o = otherOf(r);
      const tip = statusTip(r, userId);
      const tipHtml = tip ? `<div style="color:#ffb347; font-size:12px;">${tip}</div>` : '';
      const disableDissolveBtn = r.status === 'dissolve_pending' && o.initiatedByMe; // 我发起解除，等待对方时按钮仍可提示
      return `
        <div class="message-item" style="display:flex; align-items:center; gap:12px;">
          <div class="message-from" onclick="showUserPage('${o.id}')">
            <div class="message-from-avatar">${window.renderAvatar(o.avatar, o.name)}</div>
            <div class="message-from-name">${o.name}</div>
          </div>
          <div style="flex:1; color:#d4af37; font-size:14px;">${relationTitle(r)}${tipHtml}</div>
          <button class="view-messages-btn" onclick="requestDissolve('${r.id}')" ${disableDissolveBtn ? '' : ''}>解除关系</button>
        </div>
      `;
    }).join('') : '<p style="text-align:center;color:#888;padding:12px;">暂无已建立关系</p>';

    const pendingHtml = pendings.length ? pendings.map(r=>{
      const o = otherOf(r);
      const isDissolve = r.status === 'dissolve_pending';
      const actionHtml = isDissolve
        ? `<button class="view-messages-btn" onclick="respondRel('${r.id}','dissolved')">同意解除</button>
           <button class="view-messages-btn" onclick="respondRel('${r.id}','dissolve_rejected')">拒绝解除</button>`
        : `<button class="view-messages-btn" onclick="respondRel('${r.id}','accepted')">接受</button>
           <button class="view-messages-btn" onclick="respondRel('${r.id}','rejected')">拒绝</button>`;
      const tip = isDissolve ? '向你发起了解除关系' : '想与你建立关系';
      return `
        <div class="message-item">
          <div class="message-from" onclick="showUserPage('${o.id}')">
            <div class="message-from-avatar">${window.renderAvatar(o.avatar, o.name)}</div>
            <div class="message-from-name">${o.name}</div>
          </div>
          <div class="message-content">${relationTitle(r)} · ${tip}${r.message? ' · 留言：'+r.message : ''}</div>
          <div style="display:flex; gap:8px; margin-top:6px;">${actionHtml}</div>
        </div>
      `;
    }).join('') : '<p style="text-align:center;color:#888;padding:12px;">暂无待处理申请</p>';

    const html = `
      <div class="user-section"><h3>✅ 已建立</h3>${acceptedHtml}</div>
      <div class="user-section"><h3>📨 待处理</h3>${pendingHtml}</div>
    `;
    document.getElementById('relationshipCenterContent').innerHTML = html;
    document.getElementById('relationshipCenterOverlay').classList.add('active');
    document.getElementById('relationshipCenterPage').classList.add('active');
  }

  window.closeRelationshipCenter = function(){
    document.getElementById('relationshipCenterOverlay').classList.remove('active');
    document.getElementById('relationshipCenterPage').classList.remove('active');
  }

  window.respondRel = async function(relId, status){
    if (!window.respondRelationship) return;
    const ok = await window.respondRelationship(relId, status);
    if (!ok) { alert('操作失败'); return; }
    await window.updateMessageBadge();
    window.showRelationshipCenter();
  }

  window.requestDissolve = async function(relId){
    if (!window.requestDissolveRelationship) return;
    const ok = await window.requestDissolveRelationship(relId);
    if (!ok) { alert('发起解除失败'); return; }
    await window.updateMessageBadge();
    window.showRelationshipCenter();
  }

  // 折叠的关系展开弹出（详情页与下拉复用）
  window.togglePairRelations = function(list){
    const content = (list||[]).map(r=>{
      const t = window.RELATIONSHIP_TYPES[r.type];
      const byMe = r.fromUserId === (window.currentUser && window.currentUser.id);
      const by = byMe ? '由我建立' : '由对方建立';
      const other = byMe ? (r.toNickname||'对方') : (r.fromNickname||'对方');
      return `${t?t.emoji:'🤝'} ${t?t.name:r.type} · ${other} · ${by}`;
    }).join('\n');
    alert(content || '暂无关系');
  }

  window.showUserPage = async function(userId){
    // 打开用户详情前，若用户侧边栏处于打开状态，则关闭以免遮挡
    try {
      const overlay = document.getElementById('usersSidebarOverlay');
      if (overlay && overlay.classList.contains('active')) {
        closeUsersSidebar();
      }
    } catch (_) {}
    // 关系工具函数
    function resolveRelationLabel(type){
      const t = window.RELATIONSHIP_TYPES[type];
      return t ? `${t.emoji} ${t.name}` : type;
    }
    
    function renderRelationshipsSection(relations, viewerId){
      const list = relations || [];
      if (!list.length) {
        return `
          <div class="user-section">
            <h3>🤝 关系</h3>
            <p style="color:#888;">暂无关系</p>
          </div>
        `;
      }
    
      const items = list.map(r => {
        const isFrom = r.fromUserId === viewerId;
        const otherAvatar = isFrom ? r.toAvatar : r.fromAvatar;
        const otherName = isFrom ? (r.toNickname || '对方') : (r.fromNickname || '对方');
        const otherId = isFrom ? r.toUserId : r.fromUserId;
        return `
          <div class="user-card" style="text-align:left; display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <div class="user-card-avatar" style="width:56px; height:56px;">${renderAvatar(otherAvatar, otherName)}</div>
            <div style="flex:1;">
              <div style="font-size:14px; color:#d4af37; margin-bottom:4px;">${resolveRelationLabel(r.type)}</div>
              <div style="font-size:14px; color:#f5f5f5; cursor:pointer;" onclick="showUserPage('${otherId}')">${otherName}</div>
            </div>
          </div>
        `;
      }).join('');
    
      return `
        <div class="user-section">
          <h3>🤝 关系</h3>
          <div style="display:flex; flex-direction:column; gap:6px;">${items}</div>
        </div>
      `;
    }
    
    // 发起关系申请（使用弹窗面板选择关系类型）
    window._pendingRelationshipTargetId = null; // 暂存目标用户ID
    
    window.applyRelationship = async function(targetUserId){
      if (!window.currentUser) {
        alert('请先登录');
        return;
      }
      if (!targetUserId) return;
      if (targetUserId === window.currentUser.id) {
        alert('不能与自己建立关系');
        return;
      }
    
      window._pendingRelationshipTargetId = targetUserId;
      
      // 显示关系类型选择弹窗
      const overlay = document.getElementById('relationshipPromptOverlay');
      const panel = document.getElementById('relationshipPrompt');
      if (overlay && panel) {
        overlay.classList.add('active');
        panel.classList.add('active');
      }
    }
    
    // 关系类型选择完成后（在面板中被调用）
    window.submitRelationshipRequest = async function(relType){
      const targetUserId = window._pendingRelationshipTargetId;
      if (!targetUserId) {
        alert('缺少目标用户ID');
        return;
      }
      
      if (!relType) {
        alert('请先选择关系类型');
        return;
      }
      
      const message = document.getElementById('relationshipMessage').value.trim();
      if (!message) {
        alert('申请留言不能为空');
        return;
      }
    
      if (!window.createRelationshipRequest) {
        alert('关系功能未加载');
        return;
      }

      // 补充对方信息，便于双方列表正确展示头像与昵称
      const targetUser = await window.getUserById?.(targetUserId);
    
      const ok = await window.createRelationshipRequest({
        fromUserId: window.currentUser.id,
        fromNickname: window.currentUser.nickname,
        fromAvatar: window.currentUser.avatar || null,
        toUserId: targetUserId,
        toNickname: targetUser?.nickname || '',
        toAvatar: targetUser?.avatar || null,
        type: relType,
        message: message
      });
    
      if (ok && ok.ok) {
        alert('申请已发送，等待对方处理');
        closeRelationshipPrompt();
      } else {
        alert(ok.msg || '申请失败');
      }
    }
    
    window.closeRelationshipPrompt = function(){
      const overlay = document.getElementById('relationshipPromptOverlay');
      const panel = document.getElementById('relationshipPrompt');
      if (overlay) overlay.classList.remove('active');
      if (panel) panel.classList.remove('active');
      window._pendingRelationshipTargetId = null;
      window._selectedRelationType = null;
      document.getElementById('relationshipMessage').value = '';
      // 清除所有按钮的选中状态
      const btns = document.querySelectorAll('.relationship-type-btn');
      btns.forEach(b => b.classList.remove('selected'));
    }
    
    // 选择关系类型
    window.selectRelationshipType = function(type){
      window._selectedRelationType = type;
      // 更新按钮选中状态
      const btns = document.querySelectorAll('.relationship-type-btn');
      btns.forEach(b => {
        if (b.getAttribute('data-type') === type) {
          b.classList.add('selected');
        } else {
          b.classList.remove('selected');
        }
      });
    }
    
    // 关系中心：查看已建立与待处理，并进行处理（接收、拒绝、发起解除、同意/拒绝解除）
    window.showRelationshipCenter = async function(){
      if (!window.currentUser) {
        alert('请先登录');
        return;
      }
      document.getElementById('userDropdown').classList.remove('active');
      const userId = window.currentUser.id;
      const [all, pendings] = await Promise.all([
        window.getRelationshipsForUser ? window.getRelationshipsForUser(userId) : Promise.resolve([]),
        window.getPendingRelationshipRequests ? window.getPendingRelationshipRequests(userId) : Promise.resolve([])
      ]);

      const accepted = (all || []).filter(r=> r.status === 'accepted' || r.status === 'dissolve_pending');

      function relationTitle(r){
        const t = window.RELATIONSHIP_TYPES[r.type];
        return t ? `${t.emoji} ${t.name}` : r.type;
      }
      function otherOf(r){
        const isFrom = r.fromUserId === userId;
        return {
          id: isFrom ? r.toUserId : r.fromUserId,
          name: isFrom ? (r.toNickname||'对方') : (r.fromNickname||'对方'),
          avatar: isFrom ? r.toAvatar : r.fromAvatar,
          initiatedByMe: isFrom
        };
      }
      function statusTip(r, viewerId){
        if (r.status === 'dissolve_pending') {
          return r.fromUserId === viewerId ? '等待对方确认解除' : '对方请求解除';
        }
        return '';
      }

      // 已建立 + 等待解除
      const acceptedHtml = accepted.length ? accepted.map(r=>{
        const o = otherOf(r);
        const tip = statusTip(r, userId);
        const tipHtml = tip ? `<div style="color:#ffb347; font-size:12px;">${tip}</div>` : '';
        return `
          <div class="message-item" style="display:flex; align-items:center; gap:12px;">
            <div class="message-from" onclick="showUserPage('${o.id}')">
              <div class="message-from-avatar">${window.renderAvatar(o.avatar, o.name)}</div>
              <div class="message-from-name">${o.name}</div>
            </div>
            <div style="flex:1; color:#d4af37; font-size:14px;">${relationTitle(r)}${tipHtml}</div>
            <button class="view-messages-btn" onclick="requestDissolve('${r.id}')">解除关系</button>
          </div>
        `;
      }).join('') : '<p style="text-align:center;color:#888;padding:12px;">暂无已建立关系</p>';

      // 待处理（建立/解除）
      const pendingHtml = pendings.length ? pendings.map(r=>{
        const o = otherOf(r);
        const isDissolve = r.status === 'dissolve_pending';
        const actionHtml = isDissolve
          ? `<button class="view-messages-btn" onclick="respondRel('${r.id}','dissolved')">同意解除</button>
             <button class="view-messages-btn" onclick="respondRel('${r.id}','dissolve_rejected')">拒绝解除</button>`
          : `<button class="view-messages-btn" onclick="respondRel('${r.id}','accepted')">接受</button>
             <button class="view-messages-btn" onclick="respondRel('${r.id}','rejected')">拒绝</button>`;
        const extra = isDissolve && r.dissolveMessage ? ` · 理由：${r.dissolveMessage}` : '';
        const tip = isDissolve ? '向你发起了解除关系' : '想与你建立关系';
        return `
          <div class="message-item">
            <div class="message-from" onclick="showUserPage('${o.id}')">
              <div class="message-from-avatar">${window.renderAvatar(o.avatar, o.name)}</div>
              <div class="message-from-name">${o.name}</div>
            </div>
            <div class="message-content">${relationTitle(r)} · ${tip}${r.message? ' · 留言：'+r.message : ''}${extra}</div>
            <div style="display:flex; gap:8px; margin-top:6px;">${actionHtml}</div>
          </div>
        `;
      }).join('') : '<p style="text-align:center;color:#888;padding:12px;">暂无待处理申请</p>';

      const html = `
        <div class="user-section"><h3>✅ 已建立</h3>${acceptedHtml}</div>
        <div class="user-section"><h3>📨 待处理</h3>${pendingHtml}</div>
      `;
      document.getElementById('relationshipCenterContent').innerHTML = html;
      document.getElementById('relationshipCenterOverlay').classList.add('active');
      document.getElementById('relationshipCenterPage').classList.add('active');
      if (window.updateDropdownContent) window.updateDropdownContent();
    }

    window.closeRelationshipCenter = function(){
      document.getElementById('relationshipCenterOverlay').classList.remove('active');
      document.getElementById('relationshipCenterPage').classList.remove('active');
    }

    // 关系中心操作的全局包装
    window.respondRel = async function(relId, status){
      if (!window.respondRelationship) return;
      const ok = await window.respondRelationship(relId, status);
      if (!ok) { alert('操作失败'); return; }
      await window.updateMessageBadge();
      if (window.updateDropdownContent) window.updateDropdownContent();
      window.showRelationshipCenter();
    }
    window.requestDissolve = async function(relId){
      if (!window.requestDissolveRelationship) return;
      const reason = prompt('请输入解除关系的原因（可选）：') || '';
      const ok = await window.requestDissolveRelationship(relId, reason.trim());
      if (!ok) { alert('发起解除失败'); return; }
      await window.updateMessageBadge();
      if (window.updateDropdownContent) window.updateDropdownContent();
      window.showRelationshipCenter();
    }
    window.currentViewingUserId = userId; // 保存当前查看的用户ID
    currentModalView = 'profile'; // 切换到详情界面
    await (typeof syncIndex === 'function' ? syncIndex(userId) : Promise.resolve());
    
    const user = await window.getUserById(userId);
    if (!user) {
      alert('用户不存在');
      return;
    }

    // 获取关系数据（接受的关系用于展示，同时用于判断按钮显示）
    let acceptedRelations = [];
    let allRelationsForUser = [];
    if (window.getRelationshipsForUser) {
      const rels = await window.getRelationshipsForUser(userId);
      allRelationsForUser = rels || [];
      acceptedRelations = allRelationsForUser.filter(r => r.status === 'accepted');
    }

    const isOwn = window.currentUser && window.currentUser.id === userId;
    const isAdmin = window.APP_STATE && window.APP_STATE.isAdmin;

    // 徽章显示逻辑
    let badgesHtml = '';
    let hasBadges = false;
    if (user.badges && typeof user.badges === 'object') {
      if (user.badges.oscar) { badgesHtml += '<span class="badge-icon-small" title="奥斯卡小金人">🏅</span>'; hasBadges = true; }
      if (user.badges.cannes) { badgesHtml += '<span class="badge-icon-small" title="戛纳金棕榈">🌴</span>'; hasBadges = true; }
      if (user.badges.berlin) { badgesHtml += '<span class="badge-icon-small" title="柏林金熊">🐻</span>'; hasBadges = true; }
      if (user.badges.venice) { badgesHtml += '<span class="badge-icon-small" title="威尼斯金狮">🦁</span>'; hasBadges = true; }
      if (user.badges.potato) { badgesHtml += '<span class="badge-icon-small" title="瓦尔达土豆">🥔</span>'; hasBadges = true; }
    }
    // 如果没有徽章，显示提示
    if (!hasBadges) {
      badgesHtml = '<span style="font-size: 12px; color: #888;">暂无徽章</span>';
    }

    // 电影风格显示逻辑
    let styleText = '';
    if (user.userStyle) {
      if (typeof user.userStyle === 'object') {
        styleText = user.userStyle.name || JSON.stringify(user.userStyle);
      } else if (typeof user.userStyle === 'string' && user.userStyle.trim() !== '') {
        styleText = user.userStyle;
      }
    }
    
    const userIdHtml = isAdmin ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">ID: ${userId}</div>` : '';

    const relationHtml = renderRelationshipsSection(acceptedRelations, userId);

    // 名字右侧：与当前登录者的关系徽标（>2 折叠）
    let pairBadges = '';
    let pairList = [];
    if (window.currentUser && window.currentUser.id !== userId) {
      pairList = (acceptedRelations||[]).filter(r=>{
        const ids = [r.fromUserId, r.toUserId];
        return ids.includes(userId) && ids.includes(window.currentUser.id);
      });
      if (pairList.length > 0) {
        window.__pairRelationsTemp = pairList; // 供折叠弹出使用
        if (pairList.length > 2) {
          pairBadges = `<span class="badge-icon-small" style="cursor:pointer;" onclick="togglePairRelations(window.__pairRelationsTemp)">${pairList.length}个关系</span>`;
        } else {
          pairBadges = pairList.map(r=>{
            const t = window.RELATIONSHIP_TYPES[r.type];
            return `<span class="badge-icon-small" title="${t?t.name:r.type}">${t?t.emoji:'🤝'}</span>`;
          }).join('');
        }
      }
    }

    // 已经存在的关系或待处理申请时隐藏“建立关系”按钮
    const hasRelationWithViewer = window.currentUser && window.currentUser.id !== userId && (allRelationsForUser||[]).some(r => {
      const ids = [r.fromUserId, r.toUserId];
      if (!(ids.includes(userId) && ids.includes(window.currentUser.id))) return false;
      return ['pending', 'accepted', 'dissolve_pending'].includes(r.status);
    });
    const canApplyRelation = window.currentUser && window.currentUser.id !== userId && !hasRelationWithViewer;

    const html = `
      <div class="user-header">
        <div class="user-avatar-display">${renderAvatar(user.avatar, user.nickname)}</div>
        <div class="user-info">
          <h2 style="display:flex; align-items:center; gap:8px;">${user.nickname} ${pairBadges}</h2>
          ${userIdHtml}
          <div class="user-badges">${badgesHtml}</div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap: wrap;">
          <button class="view-messages-btn" onclick="showUserMessages('${userId}')">📬 查看留言</button>
          ${canApplyRelation ? `<button class="view-messages-btn" onclick="applyRelationship('${userId}')">🤝 建立关系</button>` : ''}
        </div>
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

      ${relationHtml}
    `;

    document.getElementById('userContent').innerHTML = html;
    document.getElementById('userModalOverlay').classList.add('active');
    document.getElementById('userModal').classList.add('active');
  }
  
  // ============ 用户留言板界面 ============
  
  // 渲染用户留言板 HTML（供实时监听回调复用）
  function renderUserMessagesView(user, userId, messages){
    let messagesHtml = '<div class="user-messages-section">';
    messagesHtml += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';
    messagesHtml += '<h3 style="margin: 0;">📬 ' + user.nickname + ' 的留言板</h3>';
    messagesHtml += '<button class="back-to-profile-btn" onclick="showUserPage(\'' + userId + '\')">&larr; 返回资料</button>';
    messagesHtml += '</div><div class="messages-board">';

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

    // 发送框 / 编辑框（仅当我访问别人页面时显示）
    if (window.currentUser && window.currentUser.id !== userId) {
      const myMessage = (messages || []).find(m => m.fromUserId === window.currentUser.id && m.toUserId === userId) || null;
      if (myMessage) {
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

    const mount = document.getElementById('userContent');
    if (mount) mount.innerHTML = messagesHtml;
    document.getElementById('userModalOverlay').classList.add('active');
    document.getElementById('userModal').classList.add('active');
  }

  window.showUserMessages = async function(userId){
    window.currentViewingUserId = userId; // 保存当前查看的用户ID
    currentModalView = 'messages'; // 切换到留言板界面
    await (typeof syncIndex === 'function' ? syncIndex(userId) : Promise.resolve());
    
    const user = await window.getUserById(userId);
    if (!user) {
      alert('用户不存在');
      return;
    }
    
    // 若存在旧的监听，先解绑
    if (window._userMessagesUnsub) {
      try { window._userMessagesUnsub(); } catch(_){}
      window._userMessagesUnsub = null;
    }

    // 建立实时监听：别人给该用户的所有留言（按时间倒序）
    if (window.db) {
      const q = window.db.collection('messages')
        .where('toUserId', '==', userId)
        .orderBy('timestamp', 'desc');
      window._userMessagesUnsub = q.onSnapshot((snap)=>{
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUserMessagesView(user, userId, messages);
      }, (err)=>{
        console.error('[user] 用户留言板监听失败:', err);
      });
    }
  }

  window.closeUserModal = function(){
    document.getElementById('userModalOverlay').classList.remove('active');
    document.getElementById('userModal').classList.remove('active');
    currentModalView = 'profile';
    // 关闭用户留言板的实时监听
    if (window._userMessagesUnsub) {
      try { window._userMessagesUnsub(); } catch(_){}
      window._userMessagesUnsub = null;
    }
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
        const styleLine = user.userStyle ? `<div style="font-size:11px;color:#888;margin-top:6px;">${user.userStyle}</div>` : '';
        
        return `
          <div class="user-card" onclick="showUserPage('${user.id}')">
            <div class="user-card-avatar">${renderAvatar(user.avatar, user.nickname)}</div>
            <div class="user-card-name">${user.nickname}</div>
            ${userIdHtml}
            <div class="user-card-badges">${badgesHtml}</div>
            ${styleLine}
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
    
    // 获取当前头像类型（用于预选）
    const currentAvatarType = (user.avatar && user.avatar.type !== 'default') ? user.avatar.type : '';
    
    // 创建编辑表单HTML
    const editFormHtml = `
      <div style="max-width: 500px; margin: 0 auto;">
        <h3 style="text-align: center; margin-bottom: 20px;">编辑资料</h3>
        
        <!-- 头像选择 -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; color: #d4af37;">头像</label>
          <small style="display: block; margin-bottom: 10px; color: #888; font-size: 12px;">点击选择emoji头像，或留空使用首字母头像</small>
          <div class="avatar-selector" id="editAvatarSelector" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 12px; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 12px; border: 1px solid rgba(212,175,55,0.2);">
            <div class="avatar-option ${currentAvatarType === 'wave' ? 'selected' : ''}" data-avatar="wave" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">🌊</div>
            <div class="avatar-option ${currentAvatarType === 'tomato' ? 'selected' : ''}" data-avatar="tomato" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">🍅</div>
            <div class="avatar-option ${currentAvatarType === 'lightning' ? 'selected' : ''}" data-avatar="lightning" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">⚡</div>
            <div class="avatar-option ${currentAvatarType === 'star' ? 'selected' : ''}" data-avatar="star" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">⭐</div>
            <div class="avatar-option ${currentAvatarType === 'saturn' ? 'selected' : ''}" data-avatar="saturn" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">🪐</div>
            <div class="avatar-option ${currentAvatarType === 'comet' ? 'selected' : ''}" data-avatar="comet" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">☄️</div>
            <div class="avatar-option ${currentAvatarType === 'alien' ? 'selected' : ''}" data-avatar="alien" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">👽</div>
            <div class="avatar-option ${currentAvatarType === 'devil' ? 'selected' : ''}" data-avatar="devil" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">👿</div>
            <div class="avatar-option ${currentAvatarType === 'wing' ? 'selected' : ''}" data-avatar="wing" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">🪽</div>
            <div class="avatar-option ${currentAvatarType === 'potato' ? 'selected' : ''}" data-avatar="potato" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; background: rgba(255,255,255,0.05); transition: all 0.3s ease;">🥔</div>
          </div>
          <input type="hidden" id="editSelectedAvatar" value="${currentAvatarType}" />
        </div>
        
        <!-- 昵称 -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #d4af37;">昵称</label>
          <input type="text" id="editNickname" value="${user.nickname || ''}" 
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
          <small style="display: block; margin-top: 5px; color: #888; font-size: 12px;">修改昵称将影响首字母头像显示</small>
        </div>
        
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
    
    // 初始化头像选择器交互
    initEditAvatarSelector();
  }
  
  // 初始化编辑页面的头像选择器
  function initEditAvatarSelector(){
    const avatarOptions = document.querySelectorAll('#editAvatarSelector .avatar-option');
    const selectedInput = document.getElementById('editSelectedAvatar');
    
    if (!avatarOptions || !selectedInput) return;
    
    avatarOptions.forEach(option => {
      option.addEventListener('click', function(){
        // 移除所有选中状态
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        // 添加当前选中
        this.classList.add('selected');
        selectedInput.value = this.getAttribute('data-avatar');
      });
      
      // 双击取消选择（回到首字母头像）
      option.addEventListener('dblclick', function(){
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        selectedInput.value = '';
      });
    });
  }
  
  window.saveProfileEdit = async function(){
    if (!window.currentUser) return;
    
    const nickname = document.getElementById('editNickname').value.trim();
    const selectedAvatarType = document.getElementById('editSelectedAvatar').value.trim();
    const director = document.getElementById('editDirector').value.trim();
    const film = document.getElementById('editFilm').value.trim();
    const recentFilm = document.getElementById('editRecentFilm').value.trim();
    const thoughts = document.getElementById('editThoughts').value.trim();
    
    // 验证昵称
    if (!nickname) {
      alert('昵称不能为空');
      return;
    }
    
    // 如果修改了昵称，检查是否与其他用户重复
    if (nickname !== window.currentUser.nickname) {
      const existingUser = await window.getUserByNickname(nickname);
      if (existingUser && existingUser.id !== window.currentUser.id) {
        alert('昵称已被使用，请换一个');
        return;
      }
    }
    
    const updateData = {};
    
    // 检查昵称变化
    if (nickname !== window.currentUser.nickname) {
      updateData.nickname = nickname;
    }
    
    // 检查头像变化
    const currentAvatarType = (window.currentUser.avatar && window.currentUser.avatar.type !== 'default') 
      ? window.currentUser.avatar.type : '';
    
    if (selectedAvatarType !== currentAvatarType) {
      // 如果选择了emoji头像
      if (selectedAvatarType) {
        updateData.avatar = { type: selectedAvatarType };
      } else {
        // 如果清空了选择，使用首字母头像
        updateData.avatar = { 
          type: 'default', 
          value: nickname.charAt(0).toUpperCase(), 
          color: '#d4af37' 
        };
      }
    }
    
    // 检查其他字段变化
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
      if (updateData.nickname !== undefined) window.currentUser.nickname = updateData.nickname;
      if (updateData.avatar !== undefined) window.currentUser.avatar = updateData.avatar;
      if (updateData.favoriteDirector !== undefined) window.currentUser.favoriteDirector = updateData.favoriteDirector;
      if (updateData.favoriteFilm !== undefined) window.currentUser.favoriteFilm = updateData.favoriteFilm;
      if (updateData.recentFilm !== undefined) window.currentUser.recentFilm = updateData.recentFilm;
      if (updateData.thoughts !== undefined) window.currentUser.thoughts = updateData.thoughts;
      
      // 更新下拉菜单和左上角头像显示
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
      
      // 更新留言角标：优先启用实时监听，否则回退一次性查询
      if (window.startMessageBadgeListener) {
        window.startMessageBadgeListener(window.currentUser.id);
      } else if (window.updateMessageBadge) {
        window.updateMessageBadge();
      }
      
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

      // 停止未读角标监听
      if (window.stopMessageBadgeListener) window.stopMessageBadgeListener();
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
  
    function renderRelationsPanel(){
      const panelId = 'dropdownRelationsPanel';
      const container = document.getElementById('dropdownRelations');
      if (!container) return;
      let panel = document.getElementById(panelId);
      if (panel) { panel.remove(); panel = null; }
      const list = window.__dropdownAcceptedRelations || [];
      if (!list.length) return;
      panel = document.createElement('div');
      panel.id = panelId;
      panel.style.position = 'absolute';
      panel.style.top = '24px';
      panel.style.left = '0';
      panel.style.zIndex = '9999';
      panel.style.background = 'rgba(20,20,20,0.95)';
      panel.style.border = '1px solid rgba(212,175,55,0.4)';
      panel.style.borderRadius = '8px';
      panel.style.padding = '8px';
      panel.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
      panel.style.minWidth = '180px';
      panel.style.maxHeight = '220px';
      panel.style.overflowY = 'auto';
      panel.innerHTML = list.map(r=>{
        const byMe = r.fromUserId === window.currentUser.id;
        const otherName = byMe ? (r.toNickname||'对方') : (r.fromNickname||'对方');
        const otherAvatar = byMe ? r.toAvatar : r.fromAvatar;
        const t = window.RELATIONSHIP_TYPES[r.type];
        const badge = t ? t.emoji : '🤝';
        return `<div style="display:flex; align-items:center; gap:8px; padding:6px 4px;">
          <div style="width:32px; height:32px; border:1px solid rgba(212,175,55,0.3); border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center;">${window.renderAvatar(otherAvatar, otherName)}</div>
          <div style="display:flex; flex-direction:column;">
            <span style="color:#f5f5f5; font-size:13px;">${otherName}</span>
            <span style="color:#d4af37; font-size:12px;">${badge} ${(t&&t.name)||r.type}</span>
          </div>
        </div>`;
      }).join('');
      container.style.position = 'relative';
      container.appendChild(panel);
      // 点击外部关闭
      const closeHandler = (e)=>{
        if (!panel.contains(e.target) && !container.contains(e.target)) {
          panel.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      setTimeout(()=> document.addEventListener('click', closeHandler), 50);
    }

    function updateDropdownContent(){
    if (!window.currentUser) return;
    
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const dropdownNickname = document.getElementById('dropdownNickname');
    const dropdownStyle = document.getElementById('dropdownStyle');
    const dropdownStyleBelow = document.getElementById('dropdownStyleBelow');
    const dropdownDirector = document.getElementById('dropdownDirector');
    const dropdownFilm = document.getElementById('dropdownFilm');
    const dropdownBadges = document.getElementById('dropdownBadges');
    const dropdownRelations = document.getElementById('dropdownRelations');
    
    if (dropdownAvatar) dropdownAvatar.innerHTML = window.renderAvatar(window.currentUser.avatar, window.currentUser.nickname);
    if (dropdownNickname) dropdownNickname.textContent = window.currentUser.nickname;
    // 旧位置的风格行不再展示
    if (dropdownStyle) dropdownStyle.textContent = '';
    if (dropdownStyleBelow) dropdownStyleBelow.textContent = window.currentUser.userStyle || '未完成测验';
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

    // 关系徽标（名字右侧，>2 折叠）
    if (dropdownRelations) {
      dropdownRelations.textContent = '';
      (async ()=>{
        let pairBadges = '';
        if (window.getRelationshipsForUser) {
          const rels = await window.getRelationshipsForUser(window.currentUser.id);
          const accepted = (rels||[]).filter(r=>r.status==='accepted');
          window.__dropdownAcceptedRelations = accepted;
          if (accepted.length > 0) {
            const label = accepted.length > 2 ? `${accepted.length}个关系` : accepted.map(r=>{
              const t = window.RELATIONSHIP_TYPES[r.type];
              return `${t?t.emoji:'🤝'}`;
            }).join('');
            pairBadges = `<span class=\"badge-icon-small\" style=\"cursor:pointer;\" onclick=\"toggleDropdownRelationsPanel()\">${label}</span>`;
          } else {
            pairBadges = '';
          }
        }
        dropdownRelations.innerHTML = pairBadges;
      })();
    }
  }
  
  // 暴露为全局函数，供外部调用
  window.updateDropdownContent = updateDropdownContent;

  // 下拉菜单关系折叠展开
  window.toggleDropdownRelationsPanel = function(){
    renderRelationsPanel();
  }
  
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
