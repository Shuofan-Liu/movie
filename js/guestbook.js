// 留言簿与留言墙 - 完全按照原版本实现
(function(){
  function el(id){ return document.getElementById(id); }
  function setHidden(id, hidden){ 
    const x = el(id); 
    if (!x) return; 
    x.classList[hidden?'add':'remove']('hidden'); 
  }

  async function callUserUpdateSubmission(id, data, password){
    // 优先走 Cloud Functions 进行密码校验；若不可用则回退到直接更新
    if (window.functions) {
      try {
        const fn = window.functions.httpsCallable('userUpdateSubmission');
        const res = await fn({ id, data, password });
        return !!(res && res.data && res.data.ok);
      } catch (err) {
        console.error('[userUpdateSubmission] failed', err);
        alert(err?.message || '更新失败');
        return false;
      }
    }
    return await window.updateSubmissionById?.(id, data);
  }

  async function callUserDeleteSubmission(id, password){
    if (window.functions) {
      try {
        const fn = window.functions.httpsCallable('userDeleteSubmission');
        const res = await fn({ id, password });
        return !!(res && res.data && res.data.ok);
      } catch (err) {
        console.error('[userDeleteSubmission] failed', err);
        alert(err?.message || '删除失败');
        return false;
      }
    }
    return await window.deleteSubmissionById?.(id);
  }

  // 显示加载提示
  function showLoading(){
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('active');
  }
  
  // 隐藏加载提示
  function hideLoading(){
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('active');
  }

  // 提交留言
  window.handleSubmit = async function(event) {
    event.preventDefault();
    
    const nickname = el('nickname').value.trim();
    const favorite = el('favorite').value.trim();
    const dream = el('dream').value.trim();
    const password = el('password').value.trim();

    if (!nickname || !favorite || !dream) {
      alert('请填写所有必填字段！');
      return;
    }

    // 显示加载提示
    showLoading();

    // 检查是否为编辑模式
    let passwordToUse;
    let editingId = window.editingId;
    
    if (editingId !== undefined) {
      // 编辑模式：使用原有密码
      const submissions = await window.getSubmissions?.() || [];
      const existingSubmission = submissions.find(s => s.id === editingId);
      if (!existingSubmission) {
        hideLoading();
        alert('留言不存在！');
        return;
      }
      passwordToUse = existingSubmission.password;
    } else {
      // 新建模式：先检查是否已有该昵称的留言
      const submissions = await window.getSubmissions?.() || [];
      const existingSubmission = submissions.find(s => s.nickname === nickname);
      
      if (existingSubmission) {
        hideLoading();
        const editExisting = confirm(`你已经有一条留言了！\n昵称：${nickname}\n\n点击"确定"编辑现有留言，点击"取消"使用不同昵称。`);
        if (editExisting) {
          // 加载现有留言用于编辑
          window.editingId = existingSubmission.id;
          el('nickname').value = existingSubmission.nickname;
          el('favorite').value = existingSubmission.favorite || '';
          el('dream').value = existingSubmission.dream || '';
          el('password').value = existingSubmission.password;
          const submitBtn = document.querySelector('#guestbookForm button[type="submit"]');
          if (submitBtn) submitBtn.textContent = '更新留言';
        }
        return;
      }
      
      // 要求设置密码
      hideLoading();
      passwordToUse = prompt('请设置一个密码来保护你的留言：\n（用于以后修改和删除留言）');
      
      if (passwordToUse === null) {
        alert('需要设置密码才能提交留言！');
        return;
      }
      
      passwordToUse = passwordToUse.trim();
      
      if (!passwordToUse) {
        alert('密码不能为空！');
        return;
      }
      
      if (passwordToUse.length < 4) {
        alert('密码至少需要4个字符！');
        return;
      }
      
      // 确认密码
      const confirmPassword = prompt('请再次输入密码确认：');
      if (confirmPassword !== passwordToUse) {
        alert('两次输入的密码不一致！');
        return;
      }
      
      showLoading();
    }

    const submission = {
      nickname,
      favorite,
      dream,
      badges: window.APP_STATE?.badges || {},
      userStyle: window.APP_STATE?.userStyle || '',
      password: passwordToUse
    };

    let success;
    let newSubmissionId = null;
    
    // 检查是否为编辑模式
    if (editingId !== undefined) {
      // 编辑模式：直接更新 Firestore（规则已放开）
      const dataToUpdate = { nickname, favorite, dream, badges: window.APP_STATE?.badges || {}, userStyle: window.APP_STATE?.userStyle || '' };
      success = await window.updateSubmissionById?.(editingId, dataToUpdate);

      delete window.editingId;
      
      // 保存当前用户昵称（用于识别是否为本人留言）
      localStorage.setItem('currentUserNickname', nickname);
      
      // 恢复提交按钮文本
      const submitBtn = document.querySelector('#guestbookForm button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '提交留言';
    } else {
      // 添加新留言
      newSubmissionId = await window.addSubmission?.(submission);
      success = !!newSubmissionId;
      
      // 保存当前用户昵称（用于识别是否为本人留言）
      localStorage.setItem('currentUserNickname', nickname);
      
      // 保存新留言 ID 以便立即可编辑
      if (success) {
        localStorage.setItem('lastSubmissionId', newSubmissionId);
      }
    }
    
    hideLoading();
    
    if (!success) {
      alert('提交失败，请稍后再试');
      return;
    }

    // 清空表单
    el('nickname').value = '';
    el('favorite').value = '';
    el('dream').value = '';
    el('password').value = '';

    // 更新侧边栏内容
    await updateSidebarContent();

    // 显示留言墙
    await showWall();
  }


  // 显示留言墙
  window.showWall = async function() {
    setHidden('quizPage', true);
    setHidden('guestbookPage', true);
    setHidden('wallPage', false);

    showLoading();
    const submissions = await window.getSubmissions?.() || [];
    hideLoading();

    const grid = el('submissionsGrid');
    const emptyState = el('emptyState');

    if (submissions.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (grid) grid.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (!grid) return;
    
    grid.innerHTML = '';

    // 获取当前用户昵称
    const currentUser = localStorage.getItem('currentUserNickname');

    submissions.forEach((sub, i) => {
      const card = document.createElement('div');
      card.className = 'submission-card';
      card.style.animationDelay = `${i * 0.1}s`;
      
      let badgesHtml = '';
      if (sub.badges?.oscar) badgesHtml += '<span class="badge-icon-small" title="奥斯卡小金人">🏅</span>';
      if (sub.badges?.cannes) badgesHtml += '<span class="badge-icon-small" title="戛纳金棕榈">🌴</span>';
      if (sub.badges?.berlin) badgesHtml += '<span class="badge-icon-small" title="柏林金熊">🐻</span>';
      if (sub.badges?.venice) badgesHtml += '<span class="badge-icon-small" title="威尼斯金狮">🦁</span>';
      if (sub.badges?.potato) badgesHtml += '<span class="badge-icon-small" title="瓦尔达土豆">🥔</span>';

      // 显示操作按钮：当前用户 / 管理员
      const userActions = (currentUser === sub.nickname) ? `
        <button class="action-btn" onclick="userEditSubmission('${sub.id}')">✏️ 编辑</button>
        <button class="action-btn delete" onclick="userDeleteSubmission('${sub.id}')">🗑️ 删除</button>
      ` : '';
      const adminActions = (window.APP_STATE?.isAdmin) ? `
        <button class="action-btn" onclick="adminEditSubmission('${sub.id}')">👑 改</button>
        <button class="action-btn delete" onclick="adminDeleteSubmission('${sub.id}')">👑 删</button>
      ` : '';
      const actionsHtml = (userActions || adminActions) ? `<div class="card-actions">${userActions}${adminActions}</div>` : '';

      // 用户风格HTML
      const styleHtml = sub.userStyle ? `
        <div class="info-row" style="background: rgba(212, 175, 55, 0.1); padding: 8px; border-radius: 5px; margin-top: 10px;">
          <span class="label" style="color: #d4af37;">🎬 电影风格</span>
          <span class="value" style="color: #d4af37; font-weight: bold;">${typeof sub.userStyle === 'object' ? (sub.userStyle.name || JSON.stringify(sub.userStyle)) : sub.userStyle}</span>
        </div>
      ` : '';

      card.innerHTML = `
        <div class="card-header">
          <span class="nickname">
            ${sub.nickname}
            ${badgesHtml}
          </span>
          ${actionsHtml}
        </div>
        <div class="card-content">
          <div class="info-row">
            <span class="label">最爱</span>
            <span class="value">${sub.favorite || '-'}</span>
          </div>
          ${styleHtml}
          <div class="dream-section">
            <span class="dream-icon">⭐</span>
            <span class="dream-text">${sub.dream || ''}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // 返回留言簿
  window.backToGuestbook = function() {
    setHidden('wallPage', true);
    setHidden('guestbookPage', false);
  }

  // 关闭测验覆盖层
  window.closeQuiz = function() {
    const overlay = el('quizOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 关闭留言簿返回首页
  window.closeGuestbook = function(){
    const overlay = document.getElementById('quizOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 删除留言（用户版：密码校验；管理员有单独入口）
  window.userDeleteSubmission = async function(id) {
    showLoading();
    const submissions = await window.getSubmissions?.() || [];
    const submission = submissions.find(s => s.id === id);
    const currentUser = localStorage.getItem('currentUserNickname');
    
    hideLoading();
    
    if (!submission) {
      alert('留言不存在！');
      return;
    }
    
    // 权限检查：只能删除自己的留言
    if (currentUser !== submission.nickname) {
      alert('你只能删除自己的留言！');
      return;
    }
    
    const password = prompt('请输入留言密码以删除：');
    if (password === null) return;
    
    if (!confirm(`确定要删除 "${submission.nickname}" 的留言吗？`)) {
      return;
    }
    
    showLoading();
    const success = await callUserDeleteSubmission(id, password.trim());
    hideLoading();
    
    if (success) {
      // 刷新显示
      await showWall();
      await updateSidebarContent();
    }
  }

  // 编辑留言（用户版：密码校验）
  window.userEditSubmission = async function(id) {
    showLoading();
    const submissions = await window.getSubmissions?.() || [];
    const submission = submissions.find(s => s.id === id);
    const currentUser = localStorage.getItem('currentUserNickname');
    
    hideLoading();
    
    if (!submission) {
      alert('留言不存在！');
      return;
    }
    
    // 权限检查：只能编辑自己的留言
    if (currentUser !== submission.nickname) {
      alert('你只能编辑自己的留言！');
      return;
    }
    
    // 显示 quiz-overlay 弹窗
    el('quizOverlay').classList.add('active');
    
    // 显示留言簿页面并填充数据
    setHidden('quizPage', true);
    setHidden('wallPage', true);
    setHidden('guestbookPage', false);
    
    // 填充表单
    el('nickname').value = submission.nickname;
    el('favorite').value = submission.favorite || '';
    el('dream').value = submission.dream || '';
    el('password').value = submission.password;
    
    // 保存编辑 ID
    window.editingId = id;
    
    // 修改提交按钮文本
    const submitBtn = document.querySelector('#guestbookForm button[type="submit"]');
    if (submitBtn) submitBtn.textContent = '更新留言';
  }



  // 更新侧边栏内容
  window.updateSidebarContent = async function(){
    const wrap = el('sidebarSubmissions');
    const empty = el('sidebarEmpty');
    const notice = el('sidebarNotice');
    
    if (!wrap) return;
    
    const submissions = await window.getSubmissions?.() || [];
    
    // 如果有留言，隐藏提示
    if (submissions.length > 0) {
      if (notice) notice.style.display = 'none';
      if (empty) empty.classList.add('hidden');
    } else {
      if (empty) empty.classList.remove('hidden');
      return;
    }

    wrap.innerHTML = '';

    // 获取当前用户昵称
    const currentUser = localStorage.getItem('currentUserNickname');

    submissions.slice(0, 10).forEach((sub, i) => {
      const card = document.createElement('div');
      card.className = 'sidebar-card';
      card.style.animationDelay = `${i * 0.05}s`;
      
      let badgesHtml = '';
      if (sub.badges?.oscar) badgesHtml += '<span class="badge-icon-small" title="奥斯卡小金人">🏅</span>';
      if (sub.badges?.cannes) badgesHtml += '<span class="badge-icon-small" title="戛纳金棕榈">🌴</span>';
      if (sub.badges?.berlin) badgesHtml += '<span class="badge-icon-small" title="柏林金熊">🐻</span>';
      if (sub.badges?.venice) badgesHtml += '<span class="badge-icon-small" title="威尼斯金狮">🦁</span>';
      if (sub.badges?.potato) badgesHtml += '<span class="badge-icon-small" title="瓦尔达土豆">🥔</span>';

      // 显示操作按钮：当前用户 / 管理员
      const userActions = (currentUser === sub.nickname) ? `
        <button class="action-btn" onclick="userEditSubmission('${sub.id}'); closeSidebar();">✏️ 编辑</button>
        <button class="action-btn delete" onclick="userDeleteSubmission('${sub.id}')">🗑️ 删除</button>
      ` : '';
      const adminActions = (window.APP_STATE?.isAdmin) ? `
        <button class="action-btn" onclick="adminEditSubmission('${sub.id}'); closeSidebar();">👑 改</button>
        <button class="action-btn delete" onclick="adminDeleteSubmission('${sub.id}')">👑 删</button>
      ` : '';
      const actionsHtml = (userActions || adminActions) ? `<div class="card-actions">${userActions}${adminActions}</div>` : '';

      // 用户风格HTML
      const styleHtml = sub.userStyle ? `
        <div class="info-row" style="background: rgba(212, 175, 55, 0.1); padding: 8px; border-radius: 5px; margin-top: 10px;">
          <span class="label" style="color: #d4af37;">🎬 电影风格</span>
          <span class="value" style="color: #d4af37; font-weight: bold;">${typeof sub.userStyle === 'object' ? (sub.userStyle.name || JSON.stringify(sub.userStyle)) : sub.userStyle}</span>
        </div>
      ` : '';

      card.innerHTML = `
        <div class="card-header">
          <span class="nickname">
            ${sub.nickname}
            ${badgesHtml}
          </span>
          ${actionsHtml}
        </div>
        <div class="card-content">
          <div class="info-row">
            <span class="label">最爱</span>
            <span class="value">${sub.favorite || '-'}</span>
          </div>
          ${styleHtml}
          <div class="dream-section">
            <span class="dream-icon">⭐</span>
            <span class="dream-text">${sub.dream || ''}</span>
          </div>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  // 侧边栏功能
  window.openSidebar = function() {
    el('sidebarWall').classList.add('active');
    el('sidebarOverlay').classList.add('active');
  }

  window.closeSidebar = function() {
    el('sidebarWall').classList.remove('active');
    el('sidebarOverlay').classList.remove('active');
  }

  // 绑定表单提交
  document.addEventListener('DOMContentLoaded', function(){
    const form = el('guestbookForm');
    if (form) form.addEventListener('submit', handleSubmit);
  });

  // 关闭留言簿返回首页
  window.closeGuestbook = function(){
    const overlay = document.getElementById('quizOverlay');
    if (overlay) overlay.classList.remove('active');
  }
})();
