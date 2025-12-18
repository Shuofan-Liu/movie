// 留言系统模块
(function(){
  // ============ 实时监听（统一角标）============
  let _unreadUnsub = null;           // 留言未读监听
  let _relPendingUnsub1 = null;      // 关系 pending 监听
  let _relPendingUnsub2 = null;      // 关系 dissolve_pending 监听
  let _relAcceptedUnsub = null;      // 关系 accepted 监听（用于右下角徽章）
  let _unreadMsgCount = 0;
  let _pendingRelCount = 0;

  function updateCornerBadgeDom(){
    const total = _unreadMsgCount + _pendingRelCount;
    const badge = document.getElementById('cornerBadge');
    if (!badge) return;
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    // 同步下拉菜单细分计数
    const msgPill = document.getElementById('dropdownMsgPill');
    const relPill = document.getElementById('dropdownRelPill');
    if (msgPill) {
      if (_unreadMsgCount > 0) {
        msgPill.style.display = 'inline-block';
        msgPill.textContent = _unreadMsgCount > 99 ? '99+' : _unreadMsgCount;
      } else {
        msgPill.style.display = 'none';
      }
    }
    if (relPill) {
      if (_pendingRelCount > 0) {
        relPill.style.display = 'inline-block';
        relPill.textContent = _pendingRelCount > 99 ? '99+' : _pendingRelCount;
      } else {
        relPill.style.display = 'none';
      }
    }
  }

  // 启动统一角标监听
  window.startMessageBadgeListener = function(userId){
    try {
      if (!window.db || !userId) return;
      // 清理旧监听
      if (_unreadUnsub) { try { _unreadUnsub(); } catch(_){} _unreadUnsub = null; }
      if (_relPendingUnsub1) { try { _relPendingUnsub1(); } catch(_){} _relPendingUnsub1 = null; }
      if (_relPendingUnsub2) { try { _relPendingUnsub2(); } catch(_){} _relPendingUnsub2 = null; }

      // 未读留言
      const qMsg = window.db.collection('messages')
        .where('toUserId', '==', userId)
        .where('isRead', '==', false);
      _unreadUnsub = qMsg.onSnapshot((snap)=>{
        _unreadMsgCount = snap.size;
        updateCornerBadgeDom();
      }, (err)=>{
        console.error('[messages] 未读角标监听失败:', err);
      });

      // 待处理关系（建立）
      const qRel1 = window.db.collection('relationships')
        .where('toUserId', '==', userId)
        .where('status', '==', 'pending');
      _relPendingUnsub1 = qRel1.onSnapshot((snap)=>{
        const a = snap.size;
        // 另一监听更新后统一计算
        // 暂存合计在 _pendingRelCount 中由两个监听共同维护
        // 这里先取另一监听的数 b，然后设置 _pendingRelCount = a + b
        const b = (_relPendingUnsub2 && typeof _pendingRelCount === 'number') ? (_pendingRelCount - (typeof window.__relPendingB === 'number' ? window.__relPendingB : 0)) : 0;
        window.__relPendingA = a;
        const sum = a + (typeof window.__relPendingB === 'number' ? window.__relPendingB : 0);
        _pendingRelCount = sum;
        updateCornerBadgeDom();
      }, (err)=>{
        console.error('[relationships] 待处理(建立)监听失败:', err);
      });

      // 待处理关系（解除）
      const qRel2 = window.db.collection('relationships')
        .where('toUserId', '==', userId)
        .where('status', '==', 'dissolve_pending');
      _relPendingUnsub2 = qRel2.onSnapshot((snap)=>{
        const b = snap.size;
        window.__relPendingB = b;
        const sum = (typeof window.__relPendingA === 'number' ? window.__relPendingA : 0) + b;
        _pendingRelCount = sum;
        updateCornerBadgeDom();
      }, (err)=>{
        console.error('[relationships] 待处理(解除)监听失败:', err);
      });

      // 监听已建立关系（用于右下角关系徽章）
      const qAccepted = window.db.collection('relationships')
        .where('status', '==', 'accepted')
        .orderBy('createdAt', 'asc');
      _relAcceptedUnsub = qAccepted.onSnapshot((snap)=>{
        // 过滤出与当前用户相关的关系
        const allRels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const myRels = allRels.filter(r => r.fromUserId === userId || r.toUserId === userId);
        // 更新关系徽章显示
        if (window.updateCornerRelationBadge) {
          window.updateCornerRelationBadge(myRels);
        }
      }, (err)=>{
        console.error('[relationships] 已建立关系监听失败:', err);
      });
    } catch (e) {
      console.error('[messages] startMessageBadgeListener error:', e);
    }
  };

  // 停止未读角标监听
  window.stopMessageBadgeListener = function(){
    if (_unreadUnsub) { try { _unreadUnsub(); } catch(_){ } _unreadUnsub = null; }
    if (_relPendingUnsub1) { try { _relPendingUnsub1(); } catch(_){ } _relPendingUnsub1 = null; }
    if (_relAcceptedUnsub) { try { _relAcceptedUnsub(); } catch(_){ } _relAcceptedUnsub = null; }
    if (_relPendingUnsub2) { try { _relPendingUnsub2(); } catch(_){ } _relPendingUnsub2 = null; }
    window.__relPendingA = undefined;
    window.__relPendingB = undefined;
    _unreadMsgCount = 0;
    _pendingRelCount = 0;
    updateCornerBadgeDom();
  };

  // 如果页面加载时已经有当前用户，立即启动角标监听
  try {
    if (window.currentUser && window.startMessageBadgeListener) {
      window.startMessageBadgeListener(window.currentUser.id);
    }
  } catch (_) {}
  
  // ============ Firestore 留言操作 ============
  
  // 获取用户收到的所有留言
  window.getMessagesForUser = async function(userId){
    try {
      const snapshot = await window.db.collection('messages')
        .where('toUserId', '==', userId)
        .orderBy('timestamp', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('获取留言失败:', error);
      return [];
    }
  }
  
  // 获取用户A给用户B的留言
  window.getMessageBetween = async function(fromUserId, toUserId){
    try {
      const snapshot = await window.db.collection('messages')
        .where('fromUserId', '==', fromUserId)
        .where('toUserId', '==', toUserId)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('获取留言失败:', error);
      return null;
    }
  }
  
  // 创建留言
  window.createMessage = async function(messageData){
    try {
      const docRef = await window.db.collection('messages').add({
        ...messageData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        isRead: false
      });
      return docRef.id;
    } catch (error) {
      console.error('创建留言失败:', error);
      throw error;
    }
  }
  
  // 更新留言
  window.updateMessage = async function(messageId, content){
    try {
      await window.db.collection('messages').doc(messageId).update({
        content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        // 留言被更新后，对接收者来说应作为“新内容”提醒
        isRead: false
      });
    } catch (error) {
      console.error('更新留言失败:', error);
      throw error;
    }
  }
  
  // 删除留言
  window.deleteMessage = async function(messageId){
    try {
      await window.db.collection('messages').doc(messageId).delete();
    } catch (error) {
      console.error('删除留言失败:', error);
      throw error;
    }
  }
  
  // 标记留言为已读
  window.markMessagesAsRead = async function(userId){
    try {
      const snapshot = await window.db.collection('messages')
        .where('toUserId', '==', userId)
        .where('isRead', '==', false)
        .get();
      
      const batch = window.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }
  
  // 获取未读留言数量
  window.getUnreadMessageCount = async function(userId){
    try {
      const snapshot = await window.db.collection('messages')
        .where('toUserId', '==', userId)
        .where('isRead', '==', false)
        .get();
      return snapshot.size;
    } catch (error) {
      console.error('获取未读数失败:', error);
      return 0;
    }
  }
  
  // ============ UI 操作 ============
  
  // 显示"我的留言"页面
  window.showMyMessages = async function(){
    if (!window.currentUser) {
      showInlineAlert('请先登录', 'warn');
      return;
    }
    
    // 关闭下拉菜单
    document.getElementById('userDropdown').classList.remove('active');
    
    const messages = await window.getMessagesForUser(window.currentUser.id);
    
    let html = '';
    if (messages.length === 0) {
      html = '<p style="text-align:center;color:#888;padding:40px;">还没有人给你留言</p>';
    } else {
      html = messages.map(msg => `
        <div class="message-item">
          <div class="message-from" onclick="showUserPage('${msg.fromUserId}')">
            <div class="message-from-avatar">${window.renderAvatar(msg.fromAvatar, msg.fromNickname)}</div>
            <div class="message-from-name">${msg.fromNickname}</div>
          </div>
          <div class="message-content">${msg.content}</div>
          <div class="message-time">${formatTime(msg.timestamp)}</div>
        </div>
      `).join('');
    }
    
    document.getElementById('myMessagesList').innerHTML = html;
    document.getElementById('myMessagesOverlay').classList.add('active');
    document.getElementById('myMessagesPage').classList.add('active');
    
    // 标记为已读并更新角标
    await window.markMessagesAsRead(window.currentUser.id);
    await updateMessageBadge();
  }
  
  window.closeMyMessages = function(){
    document.getElementById('myMessagesOverlay').classList.remove('active');
    document.getElementById('myMessagesPage').classList.remove('active');
  }
  
  // 更新头像角标
  window.updateMessageBadge = async function(){
    if (!window.currentUser) return;
    const [msgCount, relCount] = await Promise.all([
      window.getUnreadMessageCount(window.currentUser.id),
      (typeof window.getPendingRelationshipCount === 'function' ? window.getPendingRelationshipCount(window.currentUser.id) : Promise.resolve(0))
    ]);
    _unreadMsgCount = msgCount || 0;
    _pendingRelCount = relCount || 0;
    updateCornerBadgeDom();
  }
  
  // 格式化时间
  window.formatTime = function(timestamp){
    if (!timestamp) return '刚刚';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
    return date.toLocaleDateString('zh-CN');
  }
  
})();
