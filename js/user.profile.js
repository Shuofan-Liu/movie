// 用户详情、留言板与资料编辑
(function(){
  const renderAvatar = window.renderAvatar;
  let currentModalView = 'profile'; // 'profile' or 'messages'

  // 共享缓存
  window.allUsersCache = window.allUsersCache || [];
  window.currentUserIndex = window.currentUserIndex || -1;
  window.currentViewingUserId = window.currentViewingUserId || null;

  // 关系申请弹窗状态
  let pendingRelationshipTargetId = null;
  window._selectedRelationType = window._selectedRelationType || null;

  async function ensureUsersCache(){
    if (!Array.isArray(window.allUsersCache) || window.allUsersCache.length === 0) {
      window.allUsersCache = await window.getAllUsers();
    }
  }

  async function syncIndex(userId){
    await ensureUsersCache();
    let idx = window.allUsersCache.findIndex(u => u.id === userId);
    if (idx < 0) {
      window.allUsersCache = await window.getAllUsers();
      idx = window.allUsersCache.findIndex(u => u.id === userId);
    }
    window.currentUserIndex = idx >= 0 ? idx : 0;
  }

  // 选择关系类型
  window.selectRelationshipType = function(type){
    window._selectedRelationType = type;
    const btns = document.querySelectorAll('.relationship-type-btn');
    btns.forEach(b => {
      if (b.getAttribute('data-type') === type) {
        b.classList.add('selected');
      } else {
        b.classList.remove('selected');
      }
    });
  };

  window.closeRelationshipPrompt = function(){
    const overlay = document.getElementById('relationshipPromptOverlay');
    const panel = document.getElementById('relationshipPrompt');
    overlay?.classList.remove('active');
    panel?.classList.remove('active');
    pendingRelationshipTargetId = null;
    window._selectedRelationType = null;
    const msg = document.getElementById('relationshipMessage');
    if (msg) msg.value = '';
    const btns = document.querySelectorAll('.relationship-type-btn');
    btns.forEach(b => b.classList.remove('selected'));
  };

  // 发起关系申请（弹窗选择关系类型）
  window.applyRelationship = async function(targetUserId){
    if (!window.currentUser) {
      showInlineAlert('请先登录', 'warn');
      return;
    }
    if (!targetUserId) return;
    if (targetUserId === window.currentUser.id) {
      showInlineAlert('不能与自己建立关系', 'warn');
      return;
    }
    pendingRelationshipTargetId = targetUserId;
    const overlay = document.getElementById('relationshipPromptOverlay');
    const panel = document.getElementById('relationshipPrompt');
    if (overlay && panel) {
      overlay.classList.add('active');
      panel.classList.add('active');
    }
  };

  // 关系类型选择完成后（在面板中被调用）
  window.submitRelationshipRequest = async function(relType){
    const targetUserId = pendingRelationshipTargetId;
    if (!targetUserId) {
      showInlineAlert('缺少目标用户ID', 'error');
      return;
    }
    if (!relType) {
      showInlineAlert('请先选择关系类型', 'warn');
      return;
    }
    const messageInput = document.getElementById('relationshipMessage');
    const message = messageInput ? messageInput.value.trim() : '';
    if (!message) {
      showInlineAlert('申请留言不能为空', 'warn');
      return;
    }
    if (!window.createRelationshipRequest) {
      showInlineAlert('关系功能未加载', 'error');
      return;
    }
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
      showInlineAlert('申请已发送，等待对方处理', 'success');
      window.closeRelationshipPrompt();
    } else {
      showInlineAlert(ok.msg || '申请失败', 'error');
    }
  };

  // 用户详情页
  window.showUserPage = async function(userId){
    try {
      const overlay = document.getElementById('usersSidebarOverlay');
      if (overlay && overlay.classList.contains('active')) {
        window.closeUsersSidebar && window.closeUsersSidebar();
      }
    } catch (_) {}

    pendingRelationshipTargetId = null;
    window.currentViewingUserId = userId;
    currentModalView = 'profile';
    await (typeof syncIndex === 'function' ? syncIndex(userId) : Promise.resolve());

    const user = await window.getUserById(userId);
    if (!user) {
      showInlineAlert('用户不存在', 'error');
      return;
    }

    let acceptedRelations = [];
    let allRelationsForUser = [];
    if (window.getRelationshipsForUser) {
      const rels = await window.getRelationshipsForUser(userId);
      allRelationsForUser = rels || [];
      acceptedRelations = allRelationsForUser.filter(r => r.status === 'accepted');
    }

    const isOwn = window.currentUser && window.currentUser.id === userId;
    const isAdmin = window.APP_STATE && window.APP_STATE.isAdmin;

    let badgesHtml = '';
    let hasBadges = false;
    if (user.badges && typeof user.badges === 'object') {
      if (user.badges.oscar) { badgesHtml += '<span class="badge-icon-small" title="奥斯卡小金人">🏅</span>'; hasBadges = true; }
      if (user.badges.cannes) { badgesHtml += '<span class="badge-icon-small" title="戛纳金棕榈">🌴</span>'; hasBadges = true; }
      if (user.badges.berlin) { badgesHtml += '<span class="badge-icon-small" title="柏林金熊">🐻</span>'; hasBadges = true; }
      if (user.badges.venice) { badgesHtml += '<span class="badge-icon-small" title="威尼斯金狮">🦁</span>'; hasBadges = true; }
      if (user.badges.potato) { badgesHtml += '<span class="badge-icon-small" title="瓦尔达土豆">🥔</span>'; hasBadges = true; }
    }
    if (!hasBadges) {
      badgesHtml = '<span style="font-size: 12px; color: #888;">暂无徽章</span>';
    }

    let styleText = '';
    if (user.userStyle) {
      if (typeof user.userStyle === 'object') {
        styleText = user.userStyle.name || JSON.stringify(user.userStyle);
      } else if (typeof user.userStyle === 'string' && user.userStyle.trim() !== '') {
        styleText = user.userStyle;
      }
    }

    const userIdHtml = isAdmin ? `<div style="font-size: 12px; color: #888; margin-top: 5px;">ID: ${userId}</div>` : '';

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
        const t = window.RELATIONSHIP_TYPES[r.type];
        const typeLabel = t ? t.name : r.type;
        return `
          <div class="user-card" style="text-align:left; display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <div class="user-card-avatar" style="width:56px; height:56px;">${renderAvatar(otherAvatar, otherName)}</div>
            <div style="flex:1;">
              <div style="font-size:14px; color:var(--avatar-border-color); margin-bottom:4px;">${t?t.emoji:'🤝'} ${typeLabel}</div>
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

    let pairBadges = '';
    let pairList = [];
    if (window.currentUser && window.currentUser.id !== userId) {
      pairList = (acceptedRelations||[]).filter(r=>{
        const ids = [r.fromUserId, r.toUserId];
        return ids.includes(userId) && ids.includes(window.currentUser.id);
      });
      if (pairList.length > 0) {
        window.__pairRelationsTemp = pairList;
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

    const hasRelationWithViewer = window.currentUser && window.currentUser.id !== userId && (allRelationsForUser||[]).some(r => {
      const ids = [r.fromUserId, r.toUserId];
      if (!(ids.includes(userId) && ids.includes(window.currentUser.id))) return false;
      return ['pending', 'accepted', 'dissolve_pending'].includes(r.status);
    });
    const canApplyRelation = window.currentUser && window.currentUser.id !== userId && !hasRelationWithViewer;

    const relationHtml = renderRelationshipsSection(acceptedRelations, userId);

    const html = `
      <div class="user-header">
        <div class="user-avatar-display">${renderAvatar(user.avatar, user.nickname)}</div>
        <div class="user-info">
          <h2 style="display:flex; align-items:center; gap:8px;">${user.nickname} ${pairBadges}</h2>
          ${userIdHtml}
          <div class="user-badges">${badgesHtml}</div>
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

      <div class="user-actions" style="margin-top: 16px; display:flex; gap:10px; flex-wrap: wrap; justify-content:flex-start;">
        <button class="view-messages-btn" style="flex:1; min-width: 140px;" onclick="showUserMessages('${userId}')">📬 查看留言</button>
        ${canApplyRelation ? `<button class="view-messages-btn" style="flex:1; min-width: 140px;" onclick="applyRelationship('${userId}')">🤝 建立关系</button>` : ''}
      </div>
    `;

    const mount = document.getElementById('userContent');
    if (mount) mount.innerHTML = html;
    document.getElementById('userModalOverlay')?.classList.add('active');
    document.getElementById('userModal')?.classList.add('active');
  };

  // 渲染用户留言板
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
    document.getElementById('userModalOverlay')?.classList.add('active');
    document.getElementById('userModal')?.classList.add('active');
  }

  window.showUserMessages = async function(userId){
    window.currentViewingUserId = userId;
    currentModalView = 'messages';
    await (typeof syncIndex === 'function' ? syncIndex(userId) : Promise.resolve());

    const user = await window.getUserById(userId);
    if (!user) {
      showInlineAlert('用户不存在', 'error');
      return;
    }

    if (window._userMessagesUnsub) {
      try { window._userMessagesUnsub(); } catch(_){}
      window._userMessagesUnsub = null;
    }

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
  };

  window.closeUserModal = function(){
    document.getElementById('userModalOverlay')?.classList.remove('active');
    document.getElementById('userModal')?.classList.remove('active');
    currentModalView = 'profile';
    if (window._userMessagesUnsub) {
      try { window._userMessagesUnsub(); } catch(_){}
      window._userMessagesUnsub = null;
    }
  };

  window.getCurrentModalView = function(){
    return currentModalView;
  };

  window.userChevronNext = async function(){
    await ensureUsersCache();
    let uid = window.currentViewingUserId || (window.currentUser && window.currentUser.id) || (window.allUsersCache[0] && window.allUsersCache[0].id);
    await syncIndex(uid);
    if (window.allUsersCache.length === 0) return;
    window.currentUserIndex = (window.currentUserIndex + 1) % window.allUsersCache.length;
    const next = window.allUsersCache[window.currentUserIndex];
    if (window.getCurrentModalView && window.getCurrentModalView() === 'messages') {
      await window.showUserMessages(next.id);
    } else {
      await window.showUserPage(next.id);
    }
  };

  window.userChevronPrev = async function(){
    await ensureUsersCache();
    let uid = window.currentViewingUserId || (window.currentUser && window.currentUser.id) || (window.allUsersCache[0] && window.allUsersCache[0].id);
    await syncIndex(uid);
    if (window.allUsersCache.length === 0) return;
    window.currentUserIndex = (window.currentUserIndex - 1 + window.allUsersCache.length) % window.allUsersCache.length;
    const prev = window.allUsersCache[window.currentUserIndex];
    if (window.getCurrentModalView && window.getCurrentModalView() === 'messages') {
      await window.showUserMessages(prev.id);
    } else {
      await window.showUserPage(prev.id);
    }
  };

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

    document.getElementById('usersPageOverlay')?.classList.add('active');
    document.getElementById('usersPage')?.classList.add('active');
  };

  window.closeUsersPage = function(){
    document.getElementById('usersPageOverlay')?.classList.remove('active');
    document.getElementById('usersPage')?.classList.remove('active');
  };

  window.editOwnProfile = function(){
    if (!window.currentUser) return;
    const user = window.currentUser;
    const currentAvatarType = (user.avatar && user.avatar.type !== 'default') ? user.avatar.type : '';
    const editFormHtml = `
      <div style="max-width: 500px; margin: 0 auto;">
        <h3 style="text-align: center; margin-bottom: 20px;">编辑资料</h3>

        <!-- 头像选择 -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; color: var(--avatar-border-color);">头像</label>
          <small style="display: block; margin-bottom: 10px; color: #888; font-size: 12px;">点击选择emoji头像，或留空使用首字母头像</small>
          <div class="avatar-selector" id="editAvatarSelector" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 12px; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 12px; border: 1px solid var(--avatar-border-color);"></div>
          <input type="hidden" id="editSelectedAvatar" value="${currentAvatarType}" />
        </div>

        <!-- 昵称 -->
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--avatar-border-color);">昵称</label>
          <input type="text" id="editNickname" value="${user.nickname || ''}"
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
          <small style="display: block; margin-top: 5px; color: #888; font-size: 12px;">修改昵称将影响首字母头像显示</small>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--avatar-border-color);">最喜欢的女导演</label>
          <input type="text" id="editDirector" value="${user.favoriteDirector || ''}"
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--avatar-border-color);">最喜欢的女性电影</label>
          <input type="text" id="editFilm" value="${user.favoriteFilm || ''}"
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: var(--avatar-border-color);">最近看的电影</label>
          <input type="text" id="editRecentFilm" value="${user.recentFilm || ''}"
                 style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px;" />
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; color: var(--avatar-border-color);">最近的想法</label>
          <textarea id="editThoughts" rows="4"
                    style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #f5f5f5; font-size: 14px; resize: vertical;">${user.thoughts || ''}</textarea>
        </div>

        <div style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="saveProfileEdit()" style="padding: 10px 30px; background: var(--avatar-glow-color); border: 1px solid var(--avatar-border-color); color: var(--avatar-border-color); border-radius: 8px; cursor: pointer; font-size: 14px;">保存</button>
          <button onclick="closeUserModal()" style="padding: 10px 30px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #ccc; border-radius: 8px; cursor: pointer; font-size: 14px;">取消</button>
        </div>
      </div>
    `;

    const mount = document.getElementById('userContent');
    if (mount) mount.innerHTML = editFormHtml;
    document.getElementById('userModalOverlay')?.classList.add('active');
    document.getElementById('userModal')?.classList.add('active');
    initEditAvatarSelector();
  };

  function initEditAvatarSelector(){
    const containerId = 'editAvatarSelector';
    const selectedInput = document.getElementById('editSelectedAvatar');
    if (!selectedInput) return;
    const currentType = selectedInput.value || '';
    window.renderAvatarOptions(containerId, currentType);
    const container = document.getElementById(containerId);
    if (!container) return;
    const avatarOptions = container.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
      option.addEventListener('click', function(){
        const alreadySelected = this.classList.contains('selected');
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        if (alreadySelected) {
          selectedInput.value = '';
        } else {
          this.classList.add('selected');
          selectedInput.value = this.getAttribute('data-avatar');
        }
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

    if (!nickname) {
      showInlineAlert('昵称不能为空', 'warn');
      return;
    }

    if (nickname !== window.currentUser.nickname) {
      const existingUser = await window.getUserByNickname(nickname);
      if (existingUser && existingUser.id !== window.currentUser.id) {
        showInlineAlert('昵称已被使用，请换一个', 'warn');
        return;
      }
    }

    const updateData = {};
    if (nickname !== window.currentUser.nickname) {
      updateData.nickname = nickname;
    }
    const currentAvatarType = (window.currentUser.avatar && window.currentUser.avatar.type !== 'default')
      ? window.currentUser.avatar.type : '';

    if (selectedAvatarType !== currentAvatarType) {
      if (selectedAvatarType) {
        updateData.avatar = { type: selectedAvatarType };
      } else {
        updateData.avatar = {
          type: 'default',
          value: nickname.charAt(0).toUpperCase(),
          color: 'var(--avatar-border-color)'
        };
      }
    }

    if (director !== window.currentUser.favoriteDirector) updateData.favoriteDirector = director;
    if (film !== window.currentUser.favoriteFilm) updateData.favoriteFilm = film;
    if (recentFilm !== window.currentUser.recentFilm) updateData.recentFilm = recentFilm;
    if (thoughts !== window.currentUser.thoughts) updateData.thoughts = thoughts;

    if (Object.keys(updateData).length === 0) {
      showInlineAlert('没有修改任何内容', 'warn');
      return;
    }

    const success = await window.updateUser(window.currentUser.id, updateData);
    if (success) {
      if (updateData.nickname !== undefined) window.currentUser.nickname = updateData.nickname;
      if (updateData.avatar !== undefined) window.currentUser.avatar = updateData.avatar;
      if (updateData.favoriteDirector !== undefined) window.currentUser.favoriteDirector = updateData.favoriteDirector;
      if (updateData.favoriteFilm !== undefined) window.currentUser.favoriteFilm = updateData.favoriteFilm;
      if (updateData.recentFilm !== undefined) window.currentUser.recentFilm = updateData.recentFilm;
      if (updateData.thoughts !== undefined) window.currentUser.thoughts = updateData.thoughts;

      showInlineAlert('资料已更新', 'success');
      if (window.updateUserCorner) {
        await window.updateUserCorner();
      }
      closeUserModal();
      setTimeout(() => {
        showUserPage(window.currentUser.id);
      }, 300);
    } else {
      showInlineAlert('更新失败，请稍后再试', 'error');
    }
  };

  window.deleteUserAccount = async function(userId){
    const confirmed = await showConfirmDialog({
      title: '删除账户',
      message: '确定要删除此账户吗？此操作无法撤销！',
      confirmText: '确认删除',
      cancelText: '取消',
      isDanger: true
    });
    if (!confirmed) return;

    const success = await window.deleteUser(userId);
    if (success) {
      showInlineAlert('账户已删除', 'success');
      closeUserModal();
      if (window.currentUser && window.currentUser.id === userId) {
        window.logoutUser && window.logoutUser();
      }
    } else {
      showInlineAlert('删除失败', 'error');
    }
  };

  window.deleteAccountStep = window.deleteAccountStep || 0;

  window.showDeleteAccountPrompt = function(message, step){
    window.deleteAccountStep = step;
    const overlay = document.getElementById('deleteAccountOverlay');
    const prompt = document.getElementById('deleteAccountPrompt');
    const messageEl = document.getElementById('deleteAccountMessage');
    const confirmBtn = prompt ? prompt.querySelector('button:nth-child(2)') : null;

    if (messageEl) messageEl.textContent = message;
    overlay?.classList.add('active');
    prompt?.classList.add('active');
    if (confirmBtn) {
      confirmBtn.textContent = step === 0 ? '继续' : '确认注销';
    }
  };

  window.closeDeleteAccountPrompt = function(){
    const overlay = document.getElementById('deleteAccountOverlay');
    const prompt = document.getElementById('deleteAccountPrompt');
    overlay?.classList.remove('active');
    prompt?.classList.remove('active');
    window.deleteAccountStep = 0;
  };

  window.deleteOwnAccount = async function(){
    if (!window.currentUser) return;
    window.showDeleteAccountPrompt(`确定要注销账户吗？此操作不可恢复！\n\n你的昵称：${window.currentUser.nickname}`, 0);
  };

  window.confirmDeleteAccount = async function(){
    if (window.deleteAccountStep === 0) {
      window.showDeleteAccountPrompt('再次确认：真的要删除你的账户吗？这将删除所有相关数据。', 1);
    } else if (window.deleteAccountStep === 1) {
      window.closeDeleteAccountPrompt();
      try {
        await window.deleteUser(window.currentUser.id);
        showInlineAlert('账户已注销', 'success');
        window.currentUser = null;
        localStorage.removeItem('currentUserId');
        document.getElementById('userDropdown')?.classList.remove('active');
        if (window.updateUserCorner) window.updateUserCorner();
      } catch (error) {
        showInlineAlert('注销失败：' + error.message, 'error');
      }
    }
  };

  // 留言操作
  window.sendMessage = async function(toUserId, toNickname){
    if (!window.currentUser) {
      showInlineAlert('请先登录', 'warn');
      return;
    }
    const content = document.getElementById('messageContent').value.trim();
    if (!content) {
      showInlineAlert('请输入留言内容', 'warn');
      return;
    }
    if (content.length > 500) {
      showInlineAlert('留言不能超过500字', 'warn');
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
      showInlineAlert('留言发送成功', 'success');
      window.currentViewingUserId = toUserId;
      showUserMessages(toUserId);
    } catch (error) {
      showInlineAlert('发送失败：' + error.message, 'error');
    }
  };

  window.updateMyMessage = async function(messageId){
    const content = document.getElementById('messageContent').value.trim();
    if (!content) {
      showInlineAlert('留言内容不能为空', 'warn');
      return;
    }
    if (content.length > 500) {
      showInlineAlert('留言不能超过500字', 'warn');
      return;
    }
    try {
      await window.updateMessage(messageId, content);
      showInlineAlert('留言已更新', 'success');
      if (window.currentViewingUserId) {
        showUserMessages(window.currentViewingUserId);
      }
    } catch (error) {
      showInlineAlert('更新失败：' + error.message, 'error');
    }
  };

  window.deleteMyMessage = async function(messageId){
    const confirmed = await showConfirmDialog({
      title: '删除留言',
      message: '确定要删除这条留言吗？',
      confirmText: '删除',
      cancelText: '取消',
      isDanger: true
    });
    if (!confirmed) return;

    try {
      await window.deleteMessage(messageId);
      showInlineAlert('留言已删除', 'success');
      if (window.currentViewingUserId) {
        showUserMessages(window.currentViewingUserId);
      }
      const danmakuOverlay = document.getElementById('danmakuWallOverlay');
      if (danmakuOverlay && danmakuOverlay.classList.contains('active') && window.loadDanmakuMessages && window.startDanmakuDisplay) {
        await window.loadDanmakuMessages();
        const danmakuContainer = document.getElementById('danmakuContainer');
        if (danmakuContainer) danmakuContainer.innerHTML = '';
        window.startDanmakuDisplay();
      }
    } catch (error) {
      showInlineAlert('删除失败：' + error.message, 'error');
    }
  };

  window.showNextUser = async function(){
    await (typeof ensureUsersCache === 'function' ? ensureUsersCache() : Promise.resolve());
    if (window.allUsersCache.length === 0) return;
    const uid = window.currentViewingUserId || (window.currentUser && window.currentUser.id) || (window.allUsersCache[0] && window.allUsersCache[0].id);
    await (typeof syncIndex === 'function' ? syncIndex(uid) : Promise.resolve());
    window.currentUserIndex = (window.currentUserIndex + 1) % window.allUsersCache.length;
    const nextUser = window.allUsersCache[window.currentUserIndex];
    if (window.getCurrentModalView && window.getCurrentModalView() === 'messages') {
      await showUserMessages(nextUser.id);
    } else {
      await showUserPage(nextUser.id);
    }
  };
})();
