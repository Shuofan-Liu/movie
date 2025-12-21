// 用户注册 / 登录与登录模态
(function(){
  const $id = window.$id || ((id)=>document.getElementById(id));

  // ============ 模态框控制 ============
  window.showLoginModal = function(){
    $id('loginModalOverlay')?.classList.add('active');
    $id('loginModal')?.classList.add('active');
    window.showLoginChoice();
  };

  window.closeLoginModal = function(){
    $id('loginModalOverlay')?.classList.remove('active');
    $id('loginModal')?.classList.remove('active');
    // 重置表单（存在才操作，避免缺失节点时报错）
    $id('loginChoice')?.classList.remove('hidden');
    $id('loginForm')?.classList.add('hidden');
    $id('registerForm')?.classList.add('hidden');
  };

  window.showLoginChoice = function(){
    $id('loginChoice')?.classList.remove('hidden');
    $id('loginForm')?.classList.add('hidden');
    $id('registerForm')?.classList.add('hidden');
  };

  window.showLoginForm = function(){
    $id('loginChoice')?.classList.add('hidden');
    $id('loginForm')?.classList.remove('hidden');
    $id('registerForm')?.classList.add('hidden');
  };

  window.showRegisterForm = function(){
    $id('loginChoice')?.classList.add('hidden');
    $id('loginForm')?.classList.add('hidden');
    $id('registerForm')?.classList.remove('hidden');
  };

  // ============ 登录 ============
  let isLoggingIn = false; // 防止重复提交

  window.handleLogin = async function(event){
    event.preventDefault();
    if (isLoggingIn) {
      console.log('正在登录中，请勿重复提交');
      return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const nickname = document.getElementById('loginNickname').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!nickname || !password) {
      showInlineAlert('请填写昵称和密码', 'warn');
      return;
    }

    isLoggingIn = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '登录中...';
    }

    try {
      const user = await window.getUserByNickname(nickname);
      if (!user) {
        showInlineAlert('用户不存在', 'warn');
        return;
      }

      if (user.password !== password) {
        showInlineAlert('密码错误', 'warn');
        return;
      }

      window.currentUser = user;
      localStorage.setItem('currentUserId', user.id);
      if (window.updateUserStatus) window.updateUserStatus();
      closeLoginModal();
      showInlineAlert(`欢迎回来，${nickname}`, 'success');
      if (window.startMyPuzzleWatcher) window.startMyPuzzleWatcher(true);
    } finally {
      isLoggingIn = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '登录';
      }
    }
  };

  // ============ 注册 ============
  let isRegistering = false; // 防止重复提交

  window.handleRegister = async function(event){
    event.preventDefault();
    if (isRegistering) {
      console.log('正在注册中，请勿重复提交');
      return;
    }
    isRegistering = true;

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '注册中...';
    }

    const nickname = document.getElementById('regNickname').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();
    const favoriteDirector = document.getElementById('favoriteDirector').value.trim();
    const favoriteFilm = document.getElementById('favoriteFilm').value.trim();
    const recentFilm = document.getElementById('recentFilm').value.trim();
    const thoughts = document.getElementById('thoughts').value.trim();

    if (!nickname || !password || !favoriteDirector || !favoriteFilm) {
      showInlineAlert('请填写所有必填字段', 'warn');
      isRegistering = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
      }
      return;
    }

    if (password.length < 4) {
      showInlineAlert('密码至少需要4个字符', 'warn');
      isRegistering = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
      }
      return;
    }

    if (password !== passwordConfirm) {
      showInlineAlert('两次输入的密码不一致', 'warn');
      isRegistering = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
      }
      return;
    }

    const existing = await window.getUserByNickname(nickname);
    if (existing) {
      showInlineAlert('昵称已被使用，请换一个', 'warn');
      isRegistering = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
      }
      return;
    }

    const selectedAvatarType = document.getElementById('selectedAvatar').value.trim();
    const avatar = selectedAvatarType
      ? { type: selectedAvatarType }
      : window.generateDefaultAvatar(nickname);

    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) loadingEl.classList.add('active');

    try {
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
      window.currentUser = { id: userId, ...userData };
      localStorage.setItem('currentUserId', userId);
      if (window.updateUserCorner) window.updateUserCorner();
      closeLoginModal();
      if (loadingEl) loadingEl.classList.remove('active');
      showInlineAlert(`注册成功，欢迎 ${nickname}`, 'success');
      if (window.startMyPuzzleWatcher) window.startMyPuzzleWatcher(true);

      const regForm = document.getElementById('regForm');
      if (regForm) regForm.reset();
      const avatarInput = document.getElementById('selectedAvatar');
      if (avatarInput) avatarInput.value = '';
      document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
    } catch (error) {
      console.error('注册失败:', error);
      showInlineAlert('注册失败: ' + error.message, 'error');
      if (loadingEl) loadingEl.classList.remove('active');
    } finally {
      isRegistering = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '注册';
      }
    }
  };

  // ============ 初始化 ============
  window.addEventListener('DOMContentLoaded', async function(){
    const userId = localStorage.getItem('currentUserId');
    if (userId) {
      const user = await window.getUserById(userId);
      if (user) {
        window.currentUser = user;
        if (window.updateUserCorner) window.updateUserCorner();
      } else {
        localStorage.removeItem('currentUserId');
      }
    }
    if (window.updateUserCorner) window.updateUserCorner();
  });
})();
