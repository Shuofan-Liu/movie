// 时间感知主题系统
(function(){

  // 获取当前时段的主题配置
  function getTimeTheme() {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 9) {
      // 清晨 6-9点 - 雾蓝偏白
      return {
        name: 'dawn',
        avatarBorder: '#9bc9ff',
        avatarGlow: 'rgba(155, 201, 255, 0.4)',
        filmOpacity: 0.15,
        filmFilter: 'brightness(1.1) saturate(0.75) hue-rotate(-5deg)',
        directorBaseColor: '#cfe8ff',
        directorHoverColor: '#9bc9ff',
        badgeGlow: 'rgba(155, 201, 255, 0.4)',
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
      // 黄昏 19-21点 - 莓紫偏红
      return {
        name: 'dusk',
        avatarBorder: '#d781b5',
        avatarGlow: 'rgba(179, 107, 156, 0.55)',
        filmOpacity: 0.3,
        filmFilter: 'brightness(0.92) saturate(1.05) hue-rotate(8deg)',
        directorBaseColor: '#f1d8e8',
        directorHoverColor: '#d781b5',
        badgeGlow: 'rgba(179, 107, 156, 0.55)',
        badgeGlowSize: '18px'
      };
    } else if (hour >= 21 && hour < 24) {
      // 夜晚 21-24点 - 深蓝带紫
      return {
        name: 'night',
        avatarBorder: '#5a63b8',
        avatarGlow: 'rgba(63, 75, 138, 0.6)',
        filmOpacity: 0.35,
        filmFilter: 'brightness(0.82) saturate(1.1) contrast(1.12)',
        directorBaseColor: '#d7dcf5',
        directorHoverColor: '#5a63b8',
        badgeGlow: 'rgba(63, 75, 138, 0.65)',
        badgeGlowSize: '22px'
      };
    } else {
      // 深夜 0-6点 - 深蓝
      return {
        name: 'midnight',
        avatarBorder: '#274a7c',
        avatarGlow: 'rgba(15, 35, 71, 0.7)',
        filmOpacity: 0.4,
        filmFilter: 'brightness(0.72) saturate(1.15) contrast(1.18)',
        directorBaseColor: '#c7d4e8',
        directorHoverColor: '#274a7c',
        badgeGlow: 'rgba(15, 35, 71, 0.7)',
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

  // 首屏尽早应用，减少主题闪烁
  applyTimeTheme();
})();
