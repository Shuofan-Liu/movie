// 用户角落入口、下拉菜单与侧边栏
(function(){
  window.initUserCorner = function(){
    if (window.updateUserCorner) window.updateUserCorner();
  };

  // 缓存已建立关系（仅 accepted）
  let acceptedRelationsCache = [];
  let acceptedRelationsMap = {};

  function relTimestampMs(rel){
    const ts = rel && rel.createdAt;
    if (!ts) return Number.MAX_SAFE_INTEGER;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000 + (ts.nanoseconds||0)/1e6;
    return Number.MAX_SAFE_INTEGER;
  }

  function buildAcceptedMap(list, currentUserId){
    const map = {};
    (list||[]).forEach(r=>{
      const ids = [r.fromUserId, r.toUserId];
      if (!ids.includes(currentUserId)) return;
      const otherId = r.fromUserId === currentUserId ? r.toUserId : r.fromUserId;
      if (!map[otherId]) map[otherId] = [];
      map[otherId].push(r);
    });
    Object.keys(map).forEach(k=>{
      map[k].sort((a,b)=> relTimestampMs(a) - relTimestampMs(b));
    });
    return map;
  }

  function getBadgeIndexStorageKey(){
    return window.currentUser ? `relationBadgeIndex_${window.currentUser.id}` : null;
  }

  function loadBadgeIndex(){
    const key = getBadgeIndexStorageKey();
    if (!key) return 0;
    try {
      const stored = localStorage.getItem(key);
      return stored ? parseInt(stored) : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBadgeIndex(index){
    const key = getBadgeIndexStorageKey();
    if (!key) return;
    try {
      localStorage.setItem(key, index.toString());
    } catch (e) {
      console.warn('Failed to save badge index:', e);
    }
  }

  // 批量获取各用户的已建立关系，供用户列表展示徽章使用
  async function fetchAcceptedRelationsForUsers(userIds){
    if (!window.getRelationshipsForUser) return {};
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
    const pairs = await Promise.all(ids.map(async uid=>{
      try {
        const rels = await window.getRelationshipsForUser(uid);
        const accepted = (rels||[]).filter(r=>r.status === 'accepted').sort((a,b)=> relTimestampMs(a) - relTimestampMs(b));
        return [uid, accepted];
      } catch (err) {
        console.warn('[relations] failed to load for user', uid, err);
        return [uid, []];
      }
    }));
    return pairs.reduce((map,[uid,list])=>{
      map[uid] = list || [];
      return map;
    }, {});
  }

  async function refreshAcceptedRelations(){
    if (!window.currentUser || !window.getRelationshipsForUser) {
      acceptedRelationsCache = [];
      acceptedRelationsMap = {};
      window.__dropdownAcceptedRelations = [];
      return acceptedRelationsCache;
    }
    const rels = await window.getRelationshipsForUser(window.currentUser.id);
    acceptedRelationsCache = (rels||[]).filter(r=>r.status === 'accepted').sort((a,b)=> relTimestampMs(a) - relTimestampMs(b));
    acceptedRelationsMap = buildAcceptedMap(acceptedRelationsCache, window.currentUser.id);
    window.__dropdownAcceptedRelations = acceptedRelationsCache;
    window.__currentRelationBadgeIndex = loadBadgeIndex();
    return acceptedRelationsCache;
  }

  function relationBadgeData(list){
    if (!list || list.length === 0) return null;
    let idx = window.__currentRelationBadgeIndex || 0;
    if (idx >= list.length) idx = 0;
    const primary = list[idx];
    const emoji = (window.RELATIONSHIP_TYPES[primary.type] && window.RELATIONSHIP_TYPES[primary.type].emoji) || '🤝';
    return { emoji, count: list.length, idx };
  }

  function renderRelationChip(list, extraClass){
    const data = relationBadgeData(list);
    if (!data) return '';
    let cls = extraClass ? `relation-chip ${extraClass}` : 'relation-chip';
    return `<span class="${cls}">${data.emoji}</span>`;
  }

  // 实时更新右下角关系徽章（由消息监听器调用）
  window.updateCornerRelationBadge = function(acceptedRelsList){
    const badgeHolder = document.getElementById('cornerRelationBadge');
    if (!badgeHolder) return;

    acceptedRelationsCache = acceptedRelsList || [];
    if (window.currentUser) {
      acceptedRelationsMap = buildAcceptedMap(acceptedRelationsCache, window.currentUser.id);
      window.__dropdownAcceptedRelations = acceptedRelationsCache;
    }

    const badgeHtml = renderRelationChip(acceptedRelationsCache, 'relation-chip-embedded');
    if (badgeHtml) {
      badgeHolder.style.display = 'inline-flex';
      badgeHolder.innerHTML = badgeHtml;
      if (acceptedRelationsCache.length > 1) {
        const badgeEl = badgeHolder.querySelector('.relation-chip-embedded');
        if (badgeEl) {
          badgeEl.style.pointerEvents = 'auto';
          badgeEl.style.cursor = 'pointer';
          badgeEl.onclick = function(e) {
            e.stopPropagation();
            window.__currentRelationBadgeIndex = (window.__currentRelationBadgeIndex || 0) + 1;
            if (window.__currentRelationBadgeIndex >= acceptedRelationsCache.length) window.__currentRelationBadgeIndex = 0;
            saveBadgeIndex(window.__currentRelationBadgeIndex);
            window.updateCornerRelationBadge(acceptedRelationsCache);
            if (window.updateUsersSidebarAvatars) window.updateUsersSidebarAvatars();
          };
        }
      } else {
        window.__currentRelationBadgeIndex = 0;
      }
    } else {
      badgeHolder.style.display = 'none';
      window.__currentRelationBadgeIndex = 0;
    }

    if (window.updateDropdownContent) {
      window.updateDropdownContent(acceptedRelationsCache, acceptedRelationsMap);
    }
  };

  async function updateUserCorner(){
    const cornerFlame = document.getElementById('cornerFlame');
    const cornerAvatar = document.getElementById('cornerAvatar');
    const functionMenuContainer = document.getElementById('functionMenuContainer');
    const sidebarTab = document.getElementById('usersSidebarTab');

    if (window.currentUser) {
      if (cornerFlame) cornerFlame.style.display = 'none';
      if (cornerAvatar) cornerAvatar.style.display = 'flex';
      const avatarImg = document.getElementById('cornerAvatarImg');
      if (avatarImg) avatarImg.innerHTML = window.renderAvatar(window.currentUser.avatar, window.currentUser.nickname);
      const badgeHolderId = 'cornerRelationBadge';
      let badgeHolder = document.getElementById(badgeHolderId);
      if (!badgeHolder && cornerAvatar) {
        badgeHolder = document.createElement('div');
        badgeHolder.id = badgeHolderId;
        badgeHolder.className = '';
        cornerAvatar.appendChild(badgeHolder);
      }
      const accepted = await refreshAcceptedRelations();
      const badgeHtml = renderRelationChip(accepted, 'relation-chip-embedded');
      if (badgeHolder) {
        if (badgeHtml) {
          badgeHolder.style.display = 'inline-flex';
          badgeHolder.innerHTML = badgeHtml;
          if (accepted.length > 1) {
            const badgeEl = badgeHolder.querySelector('.relation-chip-embedded');
            if (badgeEl) {
              badgeEl.style.pointerEvents = 'auto';
              badgeEl.style.cursor = 'pointer';
              badgeEl.onclick = function(e) {
                e.stopPropagation();
                window.__currentRelationBadgeIndex = (window.__currentRelationBadgeIndex || 0) + 1;
                if (window.__currentRelationBadgeIndex >= accepted.length) window.__currentRelationBadgeIndex = 0;
                saveBadgeIndex(window.__currentRelationBadgeIndex);
                window.updateCornerRelationBadge(accepted);
                if (window.updateUsersSidebarAvatars) window.updateUsersSidebarAvatars();
              };
            }
          } else {
            window.__currentRelationBadgeIndex = 0;
            saveBadgeIndex(0);
          }
        } else {
          badgeHolder.style.display = 'none';
        }
      }

      if (functionMenuContainer) functionMenuContainer.style.display = 'flex';
      if (sidebarTab) sidebarTab.style.display = 'flex';

      if (window.startMessageBadgeListener) {
        window.startMessageBadgeListener(window.currentUser.id);
      } else if (window.updateMessageBadge) {
        window.updateMessageBadge();
      }

      if (window.updateDropdownContent) await window.updateDropdownContent(acceptedRelationsCache, acceptedRelationsMap);
    } else {
      if (cornerFlame) cornerFlame.style.display = 'flex';
      if (cornerAvatar) cornerAvatar.style.display = 'none';
      if (functionMenuContainer) functionMenuContainer.style.display = 'none';
      if (sidebarTab) sidebarTab.style.display = 'none';
      if (window.stopMessageBadgeListener) window.stopMessageBadgeListener();
    }
  }
  window.updateUserCorner = updateUserCorner;
  window.updateUserStatus = updateUserCorner;

  window.logoutUser = function(){
    if (window.stopMyPuzzleWatcher) window.stopMyPuzzleWatcher();
    window.currentUser = null;
    localStorage.removeItem('currentUserId');
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
    if (window.APP_STATE) {
      window.APP_STATE.currentUser = null;
      window.APP_STATE.isAdmin = false;
    }
    updateUserCorner();
    showInlineAlert('已退出登录', 'success');
    const userModal = document.getElementById('userModal');
    const userModalOverlay = document.getElementById('userModalOverlay');
    if (userModal) userModal.classList.remove('active');
    if (userModalOverlay) userModalOverlay.classList.remove('active');
    const tab = document.getElementById('usersSidebarTab');
    if (tab) tab.style.display = 'none';
  };

  window.toggleUserMenu = function(){
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
    if (dropdown.classList.contains('active')) {
      setTimeout(() => {
        document.addEventListener('click', closeDropdownOnClickOutside);
      }, 100);
    }
  };

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
    if (panel) { panel.remove(); panel = null; return; }
    const list = window.__dropdownAcceptedRelations || [];
    if (!list.length) return;
    panel = document.createElement('div');
    panel.id = panelId;
    panel.style.position = 'fixed';
    const rect = container.getBoundingClientRect();
    const viewportW = window.innerWidth || document.documentElement.clientWidth;
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const panelPadding = 8;
    const margin = 12;
    const desiredWidth = Math.min(260, viewportW - margin * 2);
    panel.style.minWidth = `${desiredWidth}px`;
    panel.style.maxWidth = `${desiredWidth}px`;
    let maxHeight = Math.min(260, viewportH - rect.bottom - margin);
    let top;
    if (maxHeight < 140) {
      maxHeight = Math.min(260, Math.max(140, viewportH - margin * 2));
      top = Math.max(margin, rect.top - maxHeight - panelPadding);
    } else {
      top = rect.bottom + panelPadding;
    }
    const left = Math.max(margin, Math.min(rect.left, viewportW - desiredWidth - margin));
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.maxHeight = `${maxHeight}px`;
    panel.style.zIndex = '9999';
    panel.style.background = 'rgba(20,20,20,0.95)';
    panel.style.border = '1px solid var(--avatar-border-color)';
    panel.style.borderRadius = '8px';
    panel.style.padding = '8px';
    panel.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    panel.style.overflowY = 'auto';
    panel.innerHTML = `
      <div>
      ${list.map((r, idx)=>{
        const t = window.RELATIONSHIP_TYPES[r.type];
        const badge = t ? t.emoji : '🤝';
        const isFrom = r.fromUserId === (window.currentUser && window.currentUser.id);
        const otherName = isFrom ? (r.toNickname || '对方') : (r.fromNickname || '对方');
        const otherAvatar = isFrom ? r.toAvatar : r.fromAvatar;
        const otherAvatarHtml = window.renderAvatar ? window.renderAvatar(otherAvatar, otherName) : '';
        return `<div class="relation-panel-item" data-idx="${idx}" style="display:flex; align-items:center; gap:12px; padding:8px 6px; cursor:pointer; border-radius:6px; transition:background 0.2s;">
          <span style="font-size:20px; flex-shrink:0; width:24px; text-align:center;">${badge}</span>
          <span style="color:var(--avatar-border-color); font-size:14px; width:100px; flex-shrink:0;">${(t&&t.name)||r.type}</span>
          <span style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
            <span style="width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;">${otherAvatarHtml}</span>
            <span style="font-size:13px; color:#eee; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${otherName}</span>
          </span>
        </div>`;
      }).join('')}
      </div>
    `;
    setTimeout(()=>{
      panel.querySelectorAll('.relation-panel-item').forEach(item=>{
        item.onclick = function(){
          const idx = parseInt(this.getAttribute('data-idx'));
          window.__currentRelationBadgeIndex = idx;
          saveBadgeIndex(idx);
          if(window.updateCornerRelationBadge) window.updateCornerRelationBadge(window.__dropdownAcceptedRelations||[]);
          if(window.updateUsersSidebarAvatars) window.updateUsersSidebarAvatars();
          panel.remove();
        };
      });
    }, 10);
    document.body.appendChild(panel);

    setTimeout(() => {
      const handleClickOutside = function(e) {
        const chip = container.querySelector('.relation-chip-clickable');
        if (!panel.contains(e.target) && (!chip || !chip.contains(e.target))) {
          panel.remove();
          document.removeEventListener('click', handleClickOutside);
        }
      };
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }

  async function updateDropdownContent(preAccepted, preMap){
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

    if (dropdownRelations) {
      dropdownRelations.textContent = '';
      const accepted = preAccepted && Array.isArray(preAccepted) ? preAccepted : await refreshAcceptedRelations();
      const map = preMap || acceptedRelationsMap;
      const badgeHtml = renderRelationChip(accepted, 'relation-chip-clickable');
      if (badgeHtml) {
        dropdownRelations.innerHTML = badgeHtml;
        const chip = dropdownRelations.querySelector('.relation-chip-clickable');
        if (chip) {
          chip.style.cursor = 'pointer';
          chip.addEventListener('click', function(e) {
            e.stopPropagation();
            const panel = document.getElementById('dropdownRelationsPanel');
            if (panel) {
              panel.remove();
            } else {
              window.toggleDropdownRelationsPanel && window.toggleDropdownRelationsPanel();
            }
          });
        }
      } else {
        dropdownRelations.innerHTML = '';
      }
      window.__dropdownAcceptedRelations = accepted;
      acceptedRelationsMap = map;
    }
  }
  window.updateDropdownContent = updateDropdownContent;

  window.toggleDropdownRelationsPanel = function(){
    renderRelationsPanel();
  };

  window.showUsersSidebar = async function(){
    const users = await window.getAllUsers();
    window.allUsersCache = users;
    const acceptedList = await refreshAcceptedRelations();
    const relMap = acceptedRelationsMap;
    const allAcceptedMap = await fetchAcceptedRelationsForUsers((users||[]).map(u=>u.id));

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
        let relList = (allAcceptedMap && allAcceptedMap[user.id]) ? allAcceptedMap[user.id] : [];
        if (user.id === (window.currentUser && window.currentUser.id)) {
          if (relList.length > 1 && typeof window.__currentRelationBadgeIndex === 'number') {
            relList = [relList[window.__currentRelationBadgeIndex % relList.length]];
          }
        } else if (relList.length > 1) {
          relList = [relList[0]]; // 其他用户暂默认展示第一段关系
        }
        const badgeHtml = renderRelationChip(relList, 'relation-chip-embedded');
        const avatarHtml = badgeHtml
          ? `<div class="avatar-with-badge">${window.renderAvatar(user.avatar, user.nickname)}${badgeHtml}</div>`
          : window.renderAvatar(user.avatar, user.nickname);

        return `
          <div class="user-card" onclick="showUserPage('${user.id}')">
            <div class="user-card-avatar">${avatarHtml}</div>
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
    if (tab) {
      const width = sidebar ? (sidebar.getBoundingClientRect().width || 320) : 320;
      const margin = 4;
      tab.style.right = Math.max(0, width + margin) + 'px';
    }
  };

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
    if (tab) {
      tab.style.right = '0px';
    }
  };

  window.initUsersSidebarTab = function(){
    const tab = document.getElementById('usersSidebarTab');
    if (!tab) return;
    if (window.currentUser) {
      tab.style.display = 'flex';
    } else {
      tab.style.display = 'none';
    }
    tab.style.right = tab.style.right || '0px';
  };

  window.toggleUsersSidebarTab = function(){
    const sidebar = document.getElementById('usersSidebar');
    const isOpen = sidebar && sidebar.classList.contains('active');
    if (isOpen) {
      window.closeUsersSidebar();
    } else {
      window.showUsersSidebar();
    }
  };

  window.showUsersPage = window.showUsersSidebar;
  window.closeUsersPage = window.closeUsersSidebar;

  // 管理员密码弹窗
  window.showAdminPrompt = function(){
    document.getElementById('userDropdown')?.classList.remove('active');
    document.getElementById('adminPromptOverlay')?.classList.add('active');
    document.getElementById('adminPrompt')?.classList.add('active');
    const input = document.getElementById('adminPasswordInput');
    if (input) {
      input.value = '';
      input.focus();
    }
  };

  window.closeAdminPrompt = function(){
    document.getElementById('adminPromptOverlay')?.classList.remove('active');
    document.getElementById('adminPrompt')?.classList.remove('active');
  };

  window.confirmAdminPassword = function(){
    const password = document.getElementById('adminPasswordInput').value;
    if (password === 'cinema2026') {
      window.APP_STATE.isAdmin = true;
      window.closeAdminPrompt();
      showInlineAlert('已进入管理员模式', 'success');
      if (document.getElementById('userModal')?.classList.contains('active')) {
        const currentUserId = document.querySelector('[data-current-user-id]')?.dataset.currentUserId;
        if (currentUserId) showUserPage(currentUserId);
      }
    } else {
      showInlineAlert('密码错误', 'error');
    }
  };
})();
