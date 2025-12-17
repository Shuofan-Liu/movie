// 图片上传管理模块
(function(){
  // 文件大小限制
  const MAX_AVATAR_SIZE = 2 * 1024 * 1024;  // 2MB
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  // 验证文件
  function validateFile(file, isAvatar = false) {
    if (!file) return { valid: false, error: '请选择文件' };
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: '只支持 JPG、PNG、GIF、WebP 格式' };
    }
    
    const maxSize = isAvatar ? MAX_AVATAR_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return { valid: false, error: `文件大小不能超过 ${maxMB}MB` };
    }
    
    return { valid: true };
  }

  // 上传单个文件
  window.uploadImage = async function(file, userId, path) {
    const validation = validateFile(file, path.includes('avatar'));
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!window.storage) {
      throw new Error('Storage 未初始化');
    }

    const storageRef = window.storage.ref();
    const fileRef = storageRef.child(`users/${userId}/${path}`);
    
    try {
      const snapshot = await fileRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error('上传失败:', error);
      throw new Error('上传失败: ' + error.message);
    }
  }

  // 删除文件
  window.deleteImage = async function(userId, path) {
    if (!window.storage) {
      throw new Error('Storage 未初始化');
    }

    const storageRef = window.storage.ref();
    const fileRef = storageRef.child(`users/${userId}/${path}`);
    
    try {
      await fileRef.delete();
      return true;
    } catch (error) {
      console.error('删除失败:', error);
      return false;
    }
  }

  // 批量上传文件（最多3张）
  window.uploadMultipleImages = async function(files, userId, fieldName) {
    if (!files || files.length === 0) return [];
    if (files.length > 3) {
      throw new Error('最多只能上传3张图片');
    }

    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${fieldName}_${i}.${file.name.split('.').pop()}`;
      const url = await window.uploadImage(file, userId, path);
      urls.push(url);
    }
    return urls;
  }

  // 创建图片预览
  window.createImagePreview = function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

})();
