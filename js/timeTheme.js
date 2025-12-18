// 时间感知主题系统
(function(){

  // 获取当前时段的主题配置
  function getTimeTheme() {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 9) {
      // 清晨 6-9点
      return {
        name: 'dawn',
        avatarBorder: '#ffd700',
        avatarGlow: 'rgba(255, 215, 0, 0.4)',
        filmOpacity: 0.15,
        filmFilter: 'brightness(1.1) saturate(0.7)',
        directorBaseColor: '#f5f5f5',
        directorHoverColor: '#f4c430',
        badgeGlow: 'rgba(212, 175, 55, 0.4)',
        badgeGlowSize: '10px'
      };
    } else if (hour >= 9 && hour < 12) {
      // 上午 9-12点
      return {
        name: 'morning',
        avatarBorder: '#f4c430',
        avatarGlow: 'rgba(244, 196, 48, 0.35)',
        filmOpacity: 0.15,
        filmFilter: 'brightness(1.1) saturate(0.7)',
        directorBaseColor: '#f5f5f5',
        directorHoverColor: '#f4c430',
        badgeGlow: 'rgba(212, 175, 55, 0.4)',
        badgeGlowSize: '10px'
      };
    } else if (hour >= 12 && hour < 16) {
      // 午后 12-16点
      return {
        name: 'afternoon',
        avatarBorder: '#f5a623',
        avatarGlow: 'rgba(245, 166, 35, 0.3)',
        filmOpacity: 0.2,
        filmFilter: 'brightness(1.05) saturate(0.75)',
        directorBaseColor: '#f0f0f0',
        directorHoverColor: '#f5a623',
        badgeGlow: 'rgba(212, 175, 55, 0.4)',
        badgeGlowSize: '10px'
      };
    } else if (hour >= 16 && hour < 19) {
      // 傍晚 16-19点
      return {
        name: 'evening',
        avatarBorder: '#ff8c42',
        avatarGlow: 'rgba(255, 140, 66, 0.4)',
        filmOpacity: 0.25,
        filmFilter: 'brightness(0.95) saturate(0.9) hue-rotate(10deg)',
        directorBaseColor: '#ffe4e1',
        directorHoverColor: '#ff8c42',
        badgeGlow: 'rgba(212, 175, 55, 0.4)',
        badgeGlowSize: '10px'
      };
    } else if (hour >= 19 && hour < 21) {
      // 黄昏 19-21点
      return {
        name: 'dusk',
        avatarBorder: '#ff6b6b',
        avatarGlow: 'rgba(255, 107, 107, 0.5)',
        filmOpacity: 0.3,
        filmFilter: 'brightness(0.95) saturate(1.0) contrast(1.05)',
        directorBaseColor: '#ffe4e1',
        directorHoverColor: '#ff8c42',
        badgeGlow: 'rgba(255, 140, 66, 0.5)',
        badgeGlowSize: '15px'
      };
    } else if (hour >= 21 && hour < 24) {
      // 夜晚 21-24点
      return {
        name: 'night',
        avatarBorder: '#9b59b6',
        avatarGlow: 'rgba(155, 89, 182, 0.6)',
        filmOpacity: 0.35,
        filmFilter: 'brightness(0.9) saturate(1.1) contrast(1.1)',
        directorBaseColor: '#e6e6fa',
        directorHoverColor: '#bb86fc',
        badgeGlow: 'rgba(155, 89, 182, 0.7)',
        badgeGlowSize: '25px'
      };
    } else {
      // 深夜 0-6点
      return {
        name: 'midnight',
        avatarBorder: '#6c5ce7',
        avatarGlow: 'rgba(108, 92, 231, 0.5)',
        filmOpacity: 0.4,
        filmFilter: 'brightness(0.8) saturate(1.2) contrast(1.15)',
        directorBaseColor: '#dcd0ff',
        directorHoverColor: '#9b59b6',
        badgeGlow: 'rgba(155, 89, 182, 0.7)',
        badgeGlowSize: '25px'
      };
    }
  }

  // 应用主题到页面
  function applyTimeTheme() {
    const theme = getTimeTheme();
    const root = document.documentElement;

    // 设置CSS变量
    root.style.setProperty('--avatar-border-color', theme.avatarBorder);
    root.style.setProperty('--avatar-glow-color', theme.avatarGlow);
    root.style.setProperty('--film-opacity', theme.filmOpacity);
    root.style.setProperty('--film-filter', theme.filmFilter);
    root.style.setProperty('--director-base-color', theme.directorBaseColor);
    root.style.setProperty('--director-hover-color', theme.directorHoverColor);
    root.style.setProperty('--badge-glow-color', theme.badgeGlow);
    root.style.setProperty('--badge-glow-size', theme.badgeGlowSize);

    console.log(`[TimeTheme] Applied theme: ${theme.name} (${new Date().getHours()}:00)`);
  }

  // 初始化
  function initTimeTheme() {
    // 立即应用主题
    applyTimeTheme();

    // 每1小时检查一次（3600000毫秒）
    setInterval(applyTimeTheme, 3600000);

    console.log('[TimeTheme] Initialized. Theme will update every hour.');
  }

  // 暴露到全局（方便调试）
  window.initTimeTheme = initTimeTheme;
  window.applyTimeTheme = applyTimeTheme;
  window.getTimeTheme = getTimeTheme;

})();
