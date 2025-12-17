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

})();
