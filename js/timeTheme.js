// 时间感知主题系统
(function(){

  // 获取当前时段的主题配置
  function getTimeTheme() {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 9) {
      // 清晨 6-9点 - 浅蓝色调
      return {
        name: 'dawn',
        avatarBorder: '#87ceeb',
        avatarGlow: 'rgba(135, 206, 235, 0.4)',
        filmOpacity: 0.15,
        filmFilter: 'brightness(1.1) saturate(0.8) hue-rotate(-10deg)',
        directorBaseColor: '#f0f8ff',
        directorHoverColor: '#87ceeb',
        badgeGlow: 'rgba(135, 206, 235, 0.4)',
        badgeGlowSize: '10px'
      };
    } else if (hour >= 9 && hour < 12) {
      // 上午 9-12点 - 金黄色
      return {
        name: 'morning',
        avatarBorder: '#ffd700',
        avatarGlow: 'rgba(255, 215, 0, 0.4)',
        filmOpacity: 0.15,
        filmFilter: 'brightness(1.1) saturate(0.7)',
        directorBaseColor: '#fffacd',
        directorHoverColor: '#ffd700',
        badgeGlow: 'rgba(255, 215, 0, 0.4)',
        badgeGlowSize: '10px'
      };
    } else if (hour >= 12 && hour < 16) {
      // 午后 12-16点 - 橙金色
      return {
        name: 'afternoon',
        avatarBorder: '#ffb347',
        avatarGlow: 'rgba(255, 179, 71, 0.4)',
        filmOpacity: 0.2,
        filmFilter: 'brightness(1.05) saturate(0.8)',
        directorBaseColor: '#fff8e7',
        directorHoverColor: '#ffb347',
        badgeGlow: 'rgba(255, 179, 71, 0.4)',
        badgeGlowSize: '12px'
      };
    } else if (hour >= 16 && hour < 19) {
      // 傍晚 16-19点 - 橙红色
      return {
        name: 'evening',
        avatarBorder: '#ff6347',
        avatarGlow: 'rgba(255, 99, 71, 0.45)',
        filmOpacity: 0.25,
        filmFilter: 'brightness(0.95) saturate(0.95) hue-rotate(5deg)',
        directorBaseColor: '#ffe4e1',
        directorHoverColor: '#ff6347',
        badgeGlow: 'rgba(255, 99, 71, 0.45)',
        badgeGlowSize: '15px'
      };
    } else if (hour >= 19 && hour < 21) {
      // 黄昏 19-21点 - 蓝色调
      return {
        name: 'dusk',
        avatarBorder: '#4682b4',
        avatarGlow: 'rgba(70, 130, 180, 0.5)',
        filmOpacity: 0.3,
        filmFilter: 'brightness(0.9) saturate(1.0) contrast(1.05)',
        directorBaseColor: '#e0f2ff',
        directorHoverColor: '#4682b4',
        badgeGlow: 'rgba(70, 130, 180, 0.6)',
        badgeGlowSize: '18px'
      };
    } else if (hour >= 21 && hour < 24) {
      // 夜晚 21-24点 - 紫色调
      return {
        name: 'night',
        avatarBorder: '#9370db',
        avatarGlow: 'rgba(147, 112, 219, 0.6)',
        filmOpacity: 0.35,
        filmFilter: 'brightness(0.85) saturate(1.1) contrast(1.1)',
        directorBaseColor: '#e6e6fa',
        directorHoverColor: '#9370db',
        badgeGlow: 'rgba(147, 112, 219, 0.7)',
        badgeGlowSize: '22px'
      };
    } else {
      // 深夜 0-6点 - 深紫蓝
      return {
        name: 'midnight',
        avatarBorder: '#483d8b',
        avatarGlow: 'rgba(72, 61, 139, 0.6)',
        filmOpacity: 0.4,
        filmFilter: 'brightness(0.75) saturate(1.2) contrast(1.15)',
        directorBaseColor: '#dcd0ff',
        directorHoverColor: '#6a5acd',
        badgeGlow: 'rgba(72, 61, 139, 0.75)',
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
