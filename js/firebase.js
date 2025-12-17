// Firebase 初始化与 Firestore + Storage CRUD
(function(){
  if (!window.firebase || !window.firebaseConfig) {
    console.warn('[firebase] SDK或配置缺失');
    return;
  }
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(window.firebaseConfig);
    }
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.storage = firebase.storage();
    try {
      window.functions = firebase.functions(); // 默认区域
    } catch (_) { /* ignore */ }
  } catch (e) {
    console.error('[firebase] 初始化失败', e);
  }

  function showLoading(){
    var el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('active');
  }
  function hideLoading(){
    var el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('active');
  }

  // ================= 用户CRUD操作 =================
  
  // 获取所有用户
  window.getAllUsers = async function(){
    if (!window.db) return [];
    try {
      const snap = await db.collection('users').orderBy('createdAt','desc').get();
      const list = snap.docs.map(d=>({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      console.error('[firebase] 获取用户失败', err);
      return [];
    }
  }

  // 根据昵称查找用户
  window.getUserByNickname = async function(nickname){
    if (!window.db) return null;
    try {
      const snap = await db.collection('users').where('nickname','==',nickname).limit(1).get();
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (err) {
      console.error('[firebase] 查找用户失败', err);
      return null;
    }
  }

  // 根据ID获取用户
  window.getUserById = async function(id){
    if (!window.db) return null;
    try {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (err) {
      console.error('[firebase] 获取用户失败', err);
      return null;
    }
  }

  // 创建新用户
  window.createUser = async function(userData){
    if (!window.db) return null;
    showLoading();
    try {
      const withMeta = { 
        ...userData, 
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        badges: userData.badges || {},
        userStyle: userData.userStyle || ''
      };
      const ref = await db.collection('users').add(withMeta);
      hideLoading();
      return ref.id;
    } catch (err) {
      console.error('[firebase] 创建用户失败', err);
      hideLoading();
      return null;
    }
  }

  // 更新用户信息
  window.updateUser = async function(id, data){
    if (!window.db) return false;
    showLoading();
    try {
      await db.collection('users').doc(id).update({ 
        ...data, 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
      });
      hideLoading();
      return true;
    } catch (err) {
      console.error('[firebase] 更新用户失败', err);
      hideLoading();
      return false;
    }
  }

  // 删除用户
  window.deleteUser = async function(id){
    if (!window.db) return false;
    showLoading();
    try {
      await db.collection('users').doc(id).delete();
      hideLoading();
      return true;
    } catch (err) {
      console.error('[firebase] 删除用户失败', err);
      hideLoading();
      return false;
    }
  }

  // ================= 管理员操作（直接 Firestore）=================
  window.adminDeleteUser = async function(id){
    return await window.deleteUser(id);
  }

  window.adminUpdateUser = async function(id, data){
    return await window.updateUser(id, data);
  }

  // ================= 关系 (Relationships) =================
  // 创建或更新关系申请（同一对用户只保留一条关系，拒绝后可再次申请）
  window.createRelationshipRequest = async function(params){
    if (!window.db) return { ok: false, msg: 'DB 未初始化' };
    const { fromUserId, toUserId, type, message, fromNickname, toNickname, fromAvatar, toAvatar } = params || {};
    if (!fromUserId || !toUserId || !type || !message) {
      return { ok: false, msg: '缺少必要字段' };
    }
    showLoading();
    try {
      // 查询是否已存在 A-B 或 B-A 关系
      const q1 = db.collection('relationships')
        .where('fromUserId','==', fromUserId)
        .where('toUserId','==', toUserId)
        .limit(1);
      const q2 = db.collection('relationships')
        .where('fromUserId','==', toUserId)
        .where('toUserId','==', fromUserId)
        .limit(1);
      const [s1, s2] = await Promise.all([q1.get(), q2.get()]);
      const existing = !s1.empty ? s1.docs[0] : (!s2.empty ? s2.docs[0] : null);
      const existingData = existing ? existing.data() : null;
      if (existingData && existingData.status === 'accepted') {
        hideLoading();
        return { ok: false, msg: '你们已经建立关系，无需重复申请' };
      }

      const payload = {
        fromUserId,
        toUserId,
        fromNickname: fromNickname || '',
        toNickname: toNickname || '',
        fromAvatar: fromAvatar || null,
        toAvatar: toAvatar || null,
        type,
        status: 'pending',
        message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        respondedAt: null
      };

      if (existing) {
        await existing.ref.update(payload);
      } else {
        await db.collection('relationships').add(payload);
      }
      hideLoading();
      return { ok: true };
    } catch (err) {
      console.error('[firebase] 创建关系失败', err);
      hideLoading();
      return { ok: false, msg: '创建关系失败' };
    }
  }

  // 获取与指定用户相关的所有关系（包含自己作为 from 或 to）
  window.getRelationshipsForUser = async function(userId){
    if (!window.db || !userId) return [];
    try {
      const [a, b] = await Promise.all([
        db.collection('relationships').where('fromUserId','==',userId).get(),
        db.collection('relationships').where('toUserId','==',userId).get()
      ]);
      const list = [];
      a.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      b.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      return list;
    } catch (err) {
      console.error('[firebase] 获取关系失败', err);
      return [];
    }
  }

  // 仅获取待我处理的申请（我是 toUser，建立/解除两类待处理）
  window.getPendingRelationshipRequests = async function(userId){
    if (!window.db || !userId) return [];
    try {
      // 为避免复合索引依赖，拆成两次查询再合并
      const [buildSnap, dissolveSnap] = await Promise.all([
        db.collection('relationships')
          .where('toUserId','==', userId)
          .where('status','==','pending')
          .get(),
        db.collection('relationships')
          .where('toUserId','==', userId)
          .where('status','==','dissolve_pending')
          .get()
      ]);
      const list = [];
      buildSnap.forEach(d=>list.push({ id: d.id, ...d.data() }));
      dissolveSnap.forEach(d=>list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      console.error('[firebase] 获取关系申请失败', err);
      return [];
    }
  }

  // 响应关系（建立或解除的接受/拒绝/同意解除/拒绝解除等）
  // 允许状态：accepted, rejected, dissolve_pending, dissolved, dissolve_rejected
  window.respondRelationship = async function(relId, status){
    if (!window.db || !relId || !status) return false;
    const allowed = ['accepted','rejected','dissolve_pending','dissolved','dissolve_rejected'];
    if (!allowed.includes(status)) return false;
    showLoading();
    try {
      await db.collection('relationships').doc(relId).update({
        status,
        respondedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      hideLoading();
      return true;
    } catch (err) {
      console.error('[firebase] 更新关系失败', err);
      hideLoading();
      return false;
    }
  }

  // 发起解除关系（将已建立的关系置为解除待处理）
  window.requestDissolveRelationship = async function(relId){
    if (!window.db || !relId) return false;
    showLoading();
    try {
      await db.collection('relationships').doc(relId).update({
        status: 'dissolve_pending',
        respondedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      hideLoading();
      return true;
    } catch (err) {
      console.error('[firebase] 发起解除失败', err);
      hideLoading();
      return false;
    }
  }

  // 获取待处理关系数量（建立 + 解除）
  window.getPendingRelationshipCount = async function(userId){
    if (!window.db || !userId) return 0;
    try {
      const [a, b] = await Promise.all([
        db.collection('relationships').where('toUserId','==', userId).where('status','==','pending').get(),
        db.collection('relationships').where('toUserId','==', userId).where('status','==','dissolve_pending').get()
      ]);
      return a.size + b.size;
    } catch (err) {
      console.error('[firebase] 获取待处理关系数量失败', err);
      return 0;
    }
  }

})();
