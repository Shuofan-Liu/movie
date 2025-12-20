// 全局配置与常量（挂到 window 以便非模块脚本共享）
(function(){
  window.firebaseConfig = {
    apiKey: "AIzaSyBT_H10b30bFly8RvQgOUZ9bHuSaeBzUW8",
    authDomain: "movie-2adbd.firebaseapp.com",
    projectId: "movie-2adbd",
    storageBucket: "movie-2adbd.appspot.com",
    messagingSenderId: "743700785980",
    appId: "1:743700785980:web:f6361d70a24375f3b9cc39",
    measurementId: "G-1W8MM3NTDK"
  };

  // 警告：前端的“管理员密码”对用户可见，仅适合演示
  window.ADMIN_PASSWORD = 'cinema2026';

  // 应用状态（测验/徽章/风格等）
  window.APP_STATE = {
    currentQuestion: 0,
    answers: [],
    badges: { oscar: false, cannes: false, berlin: false, venice: false, potato: false },
    userStyle: null,
    isAdmin: false,
    currentUser: null,
  };
})();
