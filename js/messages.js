// 留言系统模块
(function(){
  // ============ 实时监听（可选启用）============
  // 未读角标监听的取消句柄
  let _unreadUnsub = null;
  
  // 启动未读角标实时监听（根据 toUserId 与 isRead=false）
  window.startMessageBadgeListener = function(userId){
    try {
      if (!window.db || !userId) return;
      if (_unreadUnsub) { try { _unreadUnsub(); } catch(_){} _unreadUnsub = null; }
      const q = window.db.collection('messages')
        .where('toUserId', '==', userId)
        .where('isRead', '==', false);
      _unreadUnsub = q.onSnapshot((snap)=>{
        const count = snap.size;
        const badge = document.getElementById('cornerBadge');
        if (!badge) return;
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : String(count);
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }, (err)=>{
        console.error('[messages] 未读角标监听失败:', err);
      });
    } catch (e) {
      console.error('[messages] startMessageBadgeListener error:', e);
    }
  };

  // 停止未读角标监听
  window.stopMessageBadgeListener = function(){
    if (_unreadUnsub) {
      try { _unreadUnsub(); } catch(_){}
      _unreadUnsub = null;
    }
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
      alert('请先登录');
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
    
    const count = await window.getUnreadMessageCount(window.currentUser.id);
    const badge = document.getElementById('cornerBadge');
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
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
