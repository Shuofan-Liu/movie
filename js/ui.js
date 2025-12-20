// UI 组件与事件
(function(){
  function el(id){ return document.getElementById(id); }

  window.showLoading = function(){ var o=el('loadingOverlay'); if(o) o.classList.add('active'); }
  window.hideLoading = function(){ var o=el('loadingOverlay'); if(o) o.classList.remove('active'); }

  // 初始化电影胶片背景
  window.initFilmBackground = function(){
    const container = el('filmBackground');
    if (!container) return;
    container.innerHTML = '';
    const imgs = (window.filmImages||[]).slice(0,40);
    const total = imgs.length || 40;
    for (let i = 0; i < total; i++) {
      const frame = document.createElement('div');
      frame.className = 'film-frame';
      const img = document.createElement('img');
      img.alt = 'film-poster';
      img.loading = 'lazy';
      if (imgs[i]) img.src = imgs[i];
      frame.appendChild(img);
      container.appendChild(frame);
    }
  }

  // 初始化导演滚动层
  window.initDirectorsLayer = function(){
    const layer = el('directorsLayer');
    if (!layer) return;
    layer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'credits-scroll';

    function createCard(d) {
      const div = document.createElement('div');
      div.className = 'director-name size-' + (d.size||'m');
      div.innerHTML = `${d.name}`;
      const card = document.createElement('div');
      card.className = 'director-info-card';
      card.innerHTML = `
        <div class="info-line">${d.name} (${d.birth || ''}) · ${d.country || ''}</div>
        <div class="info-line masterpiece">代表作：${d.masterpiece || ''}</div>
        <div class="info-line">${d.bio || ''}</div>
      `;
      div.appendChild(card);
      div.addEventListener('click', ()=> showDirectorModal(d));
      return div;
    }

    const rows = document.createElement('div');
    rows.style.padding = '80px 0';
    for (let i = 0; i < (window.directors||[]).length; i+=3) {
      const row = document.createElement('div');
      row.className = 'director-row';
      [i, i+1, i+2].forEach(idx => { if (directors[idx]) row.appendChild(createCard(directors[idx])); });
      rows.appendChild(row);
    }

    wrapper.appendChild(rows);
    layer.appendChild(wrapper);

    // 悬停暂停滚动
    wrapper.addEventListener('mouseenter', ()=> wrapper.style.animationPlayState = 'paused');
    wrapper.addEventListener('mouseleave', ()=> wrapper.style.animationPlayState = 'running');
  }

  // 弹窗
  window.showDirectorModal = function(d){
    const modal = el('directorModal');
    const body = el('modalBody');
    if (!modal || !body) return;
    body.innerHTML = `
      <div class="modal-name">${d.nameZh || d.name}</div>
      <div class="modal-meta">${d.name} · ${d.country || ''} · ${d.birth || ''}</div>
      <div class="modal-bio">${d.bio || ''}</div>
    `;
    modal.style.display = 'block';
  }
  window.closeModal = function(){ const m=el('directorModal'); if(m) m.style.display='none'; }
  window.onclick = function(e){ const m=el('directorModal'); if(e.target===m) closeModal(); }

  // 侧边栏
  window.openSidebar = function(){ el('sidebarWall')?.classList.add('active'); el('sidebarOverlay')?.classList.add('active'); }
  window.closeSidebar = function(){ el('sidebarWall')?.classList.remove('active'); el('sidebarOverlay')?.classList.remove('active'); }

  // 徽章提示
  let badgeTimer = null;
  window.showBadgeToast = function(text, icon, options){
    const toast = el('badgeToast');
    if (!toast) return;
    const opts = options || {};
    const iconEl = el('badgeToastIcon');
    const textEl = el('badgeToastText');
    const actionBtn = el('badgeToastAction');

    if (iconEl) iconEl.textContent = icon || '';
    if (textEl) textEl.textContent = text || '';

    if (actionBtn) {
      if (opts.actionText && typeof opts.onAction === 'function') {
        actionBtn.textContent = opts.actionText;
        actionBtn.onclick = () => {
          opts.onAction();
          toast.classList.add('hidden');
        };
        actionBtn.classList.remove('hidden');
      } else {
        actionBtn.classList.add('hidden');
        actionBtn.onclick = null;
      }
    }

    toast.classList.remove('hidden');
    clearTimeout(badgeTimer);
    const duration = opts.duration || 3000;
    badgeTimer = setTimeout(()=> toast.classList.add('hidden'), duration);
  }

  // 统一的页面内提示（替代 alert）
  // type: info | success | warn | error
  window.showInlineAlert = function(message, type, options){
    const toast = el('badgeToast');
    if (!toast) return;
    const actionBtn = el('badgeToastAction');
    if (actionBtn) {
      actionBtn.classList.add('hidden');
      actionBtn.onclick = null;
    }
    const t = (type || 'info').toLowerCase();
    toast.classList.remove('info','success','warn','error','hidden');
    if (['success','warn','error'].includes(t)) toast.classList.add(t); else toast.classList.add('info');
    el('badgeToastIcon').textContent = '';
    el('badgeToastText').textContent = message || '';
    clearTimeout(badgeTimer);
    const duration = (options && options.duration) || 2500;
    badgeTimer = setTimeout(()=> toast.classList.add('hidden'), duration);
  }

  // 手势已移除：不再监听滚轮左右滑动
  // (intentionally left blank)

  // 通用确认对话框（替代原生 confirm）
  window.showConfirmDialog = function(options){
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirmDialogOverlay');
      const dialog = document.getElementById('confirmDialog');
      const titleEl = document.getElementById('confirmDialogTitle');
      const messageEl = document.getElementById('confirmDialogMessage');
      const cancelBtn = document.getElementById('confirmDialogCancelBtn');
      const confirmBtn = document.getElementById('confirmDialogConfirmBtn');

      // 设置内容
      titleEl.textContent = options.title || '确认操作';
      messageEl.textContent = options.message || '确定要执行此操作吗？';
      cancelBtn.textContent = options.cancelText || '取消';
      confirmBtn.textContent = options.confirmText || '确定';

      // 自定义确认按钮样式（危险操作用红色）
      const isDanger = options.isDanger || options.type === 'danger';
      if (isDanger) {
        confirmBtn.style.background = 'rgba(255,68,68,0.25)';
        confirmBtn.style.borderColor = 'rgba(255,68,68,0.5)';
        confirmBtn.style.color = '#ff4444';
      } else {
        confirmBtn.style.background = 'rgba(212,175,55,0.2)';
        confirmBtn.style.borderColor = 'rgba(212,175,55,0.4)';
        confirmBtn.style.color = '#d4af37';
      }

      // 显示对话框
      overlay.classList.add('active');
      dialog.classList.add('active');

      // 关闭对话框的函数
      const closeDialog = () => {
        overlay.classList.remove('active');
        dialog.classList.remove('active');
        cancelBtn.onclick = null;
        confirmBtn.onclick = null;
        overlay.onclick = null;
      };

      // 取消按钮
      cancelBtn.onclick = () => {
        closeDialog();
        resolve(false);
      };

      // 确认按钮
      confirmBtn.onclick = () => {
        closeDialog();
        resolve(true);
      };

      // 点击遮罩层关闭（等同于取消）
      overlay.onclick = () => {
        closeDialog();
        resolve(false);
      };
    });
  };

  // 功能菜单展开/收起切换
  window.toggleFunctionMenu = function() {
    const subButtons = document.getElementById('subFunctionButtons');
    if (!subButtons) return;

    if (subButtons.classList.contains('expanded')) {
      // 收起
      subButtons.classList.remove('expanded');
    } else {
      // 展开
      subButtons.classList.add('expanded');
    }
  };

  // 初始挂载
  document.addEventListener('DOMContentLoaded', function(){
    try {
      initFilmBackground();
      initDirectorsLayer();
      if (window.updateSidebarContent) updateSidebarContent();
      if (window.checkAdminStatus) checkAdminStatus();
      if (window.checkUserStatus) checkUserStatus();
    } catch (e) { console.warn('[ui] init error', e); }
  });
})();
