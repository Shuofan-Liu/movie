// 关系中心与关系操作
(function(){
  let pendingDissolveRelId = null;

  function relationTitle(rel){
    const t = window.RELATIONSHIP_TYPES[rel.type];
    return t ? `${t.emoji} ${t.name}` : rel.type;
  }

  function otherOf(rel, userId){
    const isFrom = rel.fromUserId === userId;
    return {
      id: isFrom ? rel.toUserId : rel.fromUserId,
      name: isFrom ? (rel.toNickname || '对方') : (rel.fromNickname || '对方'),
      avatar: isFrom ? rel.toAvatar : rel.fromAvatar,
      initiatedByMe: isFrom
    };
  }

  function statusTip(rel, viewerId){
    if (rel.status === 'dissolve_pending') {
      return rel.fromUserId === viewerId ? '等待对方确认解除' : '对方请求解除';
    }
    return '';
  }

  // 关系中心：查看已建立与待处理，并进行处理
  window.showRelationshipCenter = async function(){
    if (!window.currentUser) {
      showInlineAlert('请先登录', 'warn');
      return;
    }
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
    const userId = window.currentUser.id;
    const [all, pendings] = await Promise.all([
      window.getRelationshipsForUser ? window.getRelationshipsForUser(userId) : Promise.resolve([]),
      window.getPendingRelationshipRequests ? window.getPendingRelationshipRequests(userId) : Promise.resolve([])
    ]);

    const accepted = (all || []).filter(r => r.status === 'accepted' || r.status === 'dissolve_pending');

    const acceptedHtml = accepted.length ? accepted.map(r=>{
      const o = otherOf(r, userId);
      const tip = statusTip(r, userId);
      const tipHtml = tip ? `<div style="color:var(--avatar-border-color); font-size:12px;">${tip}</div>` : '';
      let buttonHtml = '';
      if (r.status === 'dissolve_pending') {
        if (r.fromUserId === userId) {
          buttonHtml = '';
        } else {
          buttonHtml = '';
        }
      } else {
        buttonHtml = `<button class="view-messages-btn" onclick="requestDissolve('${r.id}')">解除关系</button>`;
      }
      return `
        <div class="message-item" style="display:flex; align-items:center; gap:12px;">
          <div class="message-from" onclick="showUserPage('${o.id}')">
            <div class="message-from-avatar">${window.renderAvatar(o.avatar, o.name)}</div>
            <div class="message-from-name">${o.name}</div>
          </div>
          <div style="flex:1; color:var(--avatar-border-color); font-size:14px;">${relationTitle(r)}${tipHtml}</div>
          ${buttonHtml}
        </div>
      `;
    }).join('') : '<p style="text-align:center;color:#888;padding:12px;">暂无已建立关系</p>';

    const pendingHtml = pendings.length ? pendings.map(r=>{
      const o = otherOf(r, userId);
      const isDissolve = r.status === 'dissolve_pending';
      const actionHtml = isDissolve
        ? `<button class="view-messages-btn" onclick="respondRel('${r.id}','dissolved')">同意解除</button>
           <button class="view-messages-btn" onclick="respondRel('${r.id}','dissolve_rejected')">拒绝解除</button>`
        : `<button class="view-messages-btn" onclick="respondRel('${r.id}','accepted')">接受</button>
           <button class="view-messages-btn" onclick="respondRel('${r.id}','rejected')">拒绝</button>`;
      const extra = isDissolve && r.dissolveMessage ? ` · 理由：${r.dissolveMessage}` : '';
      const messagePart = (!isDissolve && r.message) ? ` · 留言：${r.message}` : '';
      const tip = isDissolve ? '向你发起了解除关系' : '想与你建立关系';
      return `
        <div class="message-item">
          <div class="message-from" onclick="showUserPage('${o.id}')">
            <div class="message-from-avatar">${window.renderAvatar(o.avatar, o.name)}</div>
            <div class="message-from-name">${o.name}</div>
          </div>
          <div class="message-content">${relationTitle(r)} · ${tip}${messagePart}${extra}</div>
          <div style="display:flex; gap:8px; margin-top:6px;">${actionHtml}</div>
        </div>
      `;
    }).join('') : '<p style="text-align:center;color:#888;padding:12px;">暂无待处理申请</p>';

    const html = `
      <div class="user-section"><h3>✅ 已建立</h3>${acceptedHtml}</div>
      <div class="user-section"><h3>📨 待处理</h3>${pendingHtml}</div>
    `;
    const centerContent = document.getElementById('relationshipCenterContent');
    if (centerContent) centerContent.innerHTML = html;
    document.getElementById('relationshipCenterOverlay')?.classList.add('active');
    document.getElementById('relationshipCenterPage')?.classList.add('active');
    if (window.updateDropdownContent) await window.updateDropdownContent();
  };

  window.closeRelationshipCenter = function(){
    document.getElementById('relationshipCenterOverlay')?.classList.remove('active');
    document.getElementById('relationshipCenterPage')?.classList.remove('active');
  };

  // 关系中心操作的全局包装
  window.respondRel = async function(relId, status){
    if (!window.respondRelationship) return;
    const ok = await window.respondRelationship(relId, status);
    if (!ok) { showInlineAlert('操作失败', 'error'); return; }
    if (window.updateMessageBadge) await window.updateMessageBadge();
    if (window.updateDropdownContent) await window.updateDropdownContent();
    window.showRelationshipCenter();
  };

  // 发起解除关系（优先使用自定义弹窗，回退 prompt）
  window.requestDissolve = async function(relId){
    if (!window.requestDissolveRelationship) return;
    const overlay = document.getElementById('dissolvePromptOverlay');
    const panel = document.getElementById('dissolvePrompt');
    if (overlay && panel) {
      pendingDissolveRelId = relId;
      overlay.classList.add('active');
      panel.classList.add('active');
      return;
    }
    const reason = prompt('请输入解除关系的原因（可选）：') || '';
    const ok = await window.requestDissolveRelationship(relId, reason.trim());
    if (!ok) { showInlineAlert('发起解除失败', 'error'); return; }
    if (window.updateMessageBadge) await window.updateMessageBadge();
    if (window.updateDropdownContent) await window.updateDropdownContent();
    window.showRelationshipCenter();
  };

  window.closeDissolvePrompt = function(){
    const overlay = document.getElementById('dissolvePromptOverlay');
    const panel = document.getElementById('dissolvePrompt');
    overlay?.classList.remove('active');
    panel?.classList.remove('active');
    pendingDissolveRelId = null;
    const input = document.getElementById('dissolveReasonInput');
    if (input) input.value = '';
  };

  window.submitDissolveRequest = async function(){
    const relId = pendingDissolveRelId;
    if (!relId || !window.requestDissolveRelationship) return;
    const input = document.getElementById('dissolveReasonInput');
    const reason = input ? input.value.trim() : '';
    if (!reason) {
      if (input) {
        input.focus();
        input.style.borderColor = '#ff4444';
        setTimeout(()=>{ if (input) input.style.borderColor = 'rgba(255,255,255,0.2)'; }, 1200);
      }
      showInlineAlert('请填写解除原因', 'warn');
      return;
    }
    const ok = await window.requestDissolveRelationship(relId, reason);
    if (!ok) { showInlineAlert('发起解除失败', 'error'); return; }
    window.closeDissolvePrompt();
    if (window.updateMessageBadge) await window.updateMessageBadge();
    window.showRelationshipCenter();
  };

  // 折叠的关系展开弹出（详情页与下拉复用）
  window.togglePairRelations = function(list){
    const content = (list||[]).map(r=>{
      const t = window.RELATIONSHIP_TYPES[r.type];
      const byMe = r.fromUserId === (window.currentUser && window.currentUser.id);
      const by = byMe ? '由我建立' : '由对方建立';
      const other = byMe ? (r.toNickname||'对方') : (r.fromNickname||'对方');
      return `${t?t.emoji:'🤝'} ${t?t.name:r.type} · ${other} · ${by}`;
    }).join('\n');
    showInlineAlert(content || '暂无关系', 'info');
  };
})();
