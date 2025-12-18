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
  window.showBadgeToast = function(text, icon){
    const toast = el('badgeToast');
    if (!toast) return;
    // 前缀图标不再显示，图标后置到文本末尾
    el('badgeToastIcon').textContent = '';
    el('badgeToastText').textContent = icon ? `${text || ''} ${icon}` : (text || '');
    toast.classList.remove('hidden');
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(()=> toast.classList.add('hidden'), 2500);
  }

  // 统一的页面内提示（替代 alert）
  // type: info | success | warn | error
  window.showInlineAlert = function(message, type){
    const toast = el('badgeToast');
    if (!toast) return;
    const t = (type || 'info').toLowerCase();
    toast.classList.remove('info','success','warn','error','hidden');
    if (['success','warn','error'].includes(t)) toast.classList.add(t); else toast.classList.add('info');
    el('badgeToastIcon').textContent = '';
    el('badgeToastText').textContent = message || '';
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(()=> toast.classList.add('hidden'), 2500);
  }

  // 手势已移除：不再监听滚轮左右滑动
  // (intentionally left blank)

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
