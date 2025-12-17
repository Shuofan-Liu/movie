const functions = require('firebase-functions');
const admin = require('firebase-admin');

try { admin.initializeApp(); } catch (_) {}
const db = admin.firestore();
const adminPassword = process.env.ADMIN_PASSWORD || 'cinema2026';

function assertAdminOrPassword(context, data) {
  if (data && data.adminPassword && data.adminPassword === adminPassword) return;
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '请先登录或提供管理员密码');
  }
  const claims = context.auth.token || {};
  if (!claims.admin) {
    throw new functions.https.HttpsError('permission-denied', '需要管理员权限或管理员密码');
  }
}

async function assertPasswordMatch(id, password) {
  const doc = await db.collection('submissions').doc(id).get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', '留言不存在');
  }
  const data = doc.data() || {};
  const stored = (data.password || '').toString();
  if (!password || stored !== password) {
    throw new functions.https.HttpsError('permission-denied', '密码不正确');
  }
  return { doc, data };
}

exports.adminDeleteSubmission = functions.https.onCall(async (data, context) => {
  assertAdminOrPassword(context, data);
  const id = (data && data.id || '').trim();
  if (!id) throw new functions.https.HttpsError('invalid-argument', '缺少 id');
  await db.collection('submissions').doc(id).delete();
  return { ok: true };
});

exports.adminUpdateSubmission = functions.https.onCall(async (data, context) => {
  assertAdminOrPassword(context, data);
  const id = (data && data.id || '').trim();
  const patch = (data && data.data) || {};
  if (!id) throw new functions.https.HttpsError('invalid-argument', '缺少 id');
  if (typeof patch !== 'object') throw new functions.https.HttpsError('invalid-argument', '缺少更新数据');
  await db.collection('submissions').doc(id).update({ ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});

// 普通用户：凭密码编辑留言（不要求登录）；管理员也可直接编辑
exports.userUpdateSubmission = functions.https.onCall(async (data, context) => {
  const id = (data && data.id || '').trim();
  const patch = (data && data.data) || {};
  const password = (data && data.password || '').toString();
  if (!id) throw new functions.https.HttpsError('invalid-argument', '缺少 id');
  if (typeof patch !== 'object') throw new functions.https.HttpsError('invalid-argument', '缺少更新数据');

  // 管理员可直接跳过密码
  const claims = (context.auth && context.auth.token) || {};
  if (!claims.admin) {
    await assertPasswordMatch(id, password);
  }

  await db.collection('submissions').doc(id).update({ ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});

// 普通用户：凭密码删除留言；管理员可直接删除
exports.userDeleteSubmission = functions.https.onCall(async (data, context) => {
  const id = (data && data.id || '').trim();
  const password = (data && data.password || '').toString();
  if (!id) throw new functions.https.HttpsError('invalid-argument', '缺少 id');

  const claims = (context.auth && context.auth.token) || {};
  if (!claims.admin) {
    await assertPasswordMatch(id, password);
  }

  await db.collection('submissions').doc(id).delete();
  return { ok: true };
});
