// 管理员功能与用户状态
(function(){
  function el(id){ return document.getElementById(id); }

  // 使用 Firebase Auth 登录，依赖自定义声明 admin=true
  async function signInWithGoogle(){
    if (!window.auth) return showInlineAlert('Auth 未初始化', 'error');
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  }
  // 暴露给全局，便于控制台调用
  window.signInWithGoogle = signInWithGoogle;

  async function promptAdminSecret(){
    const secret = prompt('请输入管理员密码：');
    if (!secret) return false;
    const expected = window.ADMIN_PASSWORD || 'cinema2026';
    if (secret.trim() === expected) {
      window.APP_STATE.isAdmin = true;
      const bar = el('adminStatus'); if (bar) bar.style.display = 'block';
      const panel = el('adminPanel'); if (panel) panel.classList.add('active');
      const userBar = el('userStatus'); if (userBar) userBar.style.display = 'block';
      // 刷新侧边栏，使管理员能看到所有留言的操作按钮
      if (window.updateSidebarContent) window.updateSidebarContent();
      return true;
    }
    showInlineAlert('密码错误', 'error');
    return false;
  }

  window.logoutAdmin = function(){
    // 退出管理员模式
    window.APP_STATE.isAdmin = false;
    const bar = el('adminStatus'); if (bar) bar.style.display = 'none';
    const panel = el('adminPanel'); if (panel) panel.classList.remove('active');
    const userBar = el('userStatus'); if (userBar) userBar.style.display = 'none';
    if (window.updateSidebarContent) window.updateSidebarContent();
    console.log('[admin] 已通过退出按钮退出管理员模式');
  }

  window.checkAdminStatus = function(){
    const isAdmin = !!window.APP_STATE.isAdmin;
    const bar = el('adminStatus'); if (bar) bar.style.display = isAdmin ? 'block' : 'none';
    const panel = el('adminPanel'); if (panel) panel.style.display = isAdmin ? 'block' : 'none';
    const userBar = el('userStatus'); if (userBar) userBar.style.display = isAdmin ? 'block' : 'none';
    const span = el('currentUserDisplay'); if (span) span.textContent = isAdmin ? '管理员' : '';
  }

  window.checkUserStatus = function(){
    // 显示用户栏（非登录用户的提示）
    const userBar = el('userStatus');
    if (userBar) userBar.style.display = 'block';
  }

  // 注意：不要覆盖 user.js 中的 logoutUser 函数
  // window.logoutUser 由 user.js 提供

  window.toggleAdminPanel = function(){
    const panel = el('adminPanel');
    if (!panel) return;
    const isActive = panel.classList.contains('active');
    if (isActive) {
      // 关闭：隐藏面板，退出管理员模式
      panel.classList.remove('active');
      window.APP_STATE.isAdmin = false;
      const bar = el('adminStatus'); 
      if (bar) {
        bar.style.display = 'none';
      }
      const userBar = el('userStatus'); 
      if (userBar) {
        userBar.style.display = 'none';
      }
      if (window.updateSidebarContent) window.updateSidebarContent();
      console.log('[admin] 已退出管理员模式');
    } else {
      // 打开
      panel.classList.add('active');
      console.log('[admin] 打开管理后台面板');
    }
  }

  function handleHotkey(e){
    // 避免在输入框内误触
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.isContentEditable) return;
    if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
    const key = (e.key || '').toLowerCase();
    if (key === 'a' || key === 'l') {
      e.preventDefault();
      // 先尝试密钥模式，更简单可靠；若失败可在控制台运行 signInWithGoogle()
      promptAdminSecret();
    }
  }

  // 在捕获阶段监听，避免被其他监听器阻断
  document.addEventListener('keydown', handleHotkey, true);
  // 兜底：在 keyup 也监听一次
  document.addEventListener('keyup', handleHotkey, true);

  // Ctrl+Shift+M 切换管理面板
  document.addEventListener('keydown', (e)=>{
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
      window.toggleAdminPanel();
    }
  });
})();
