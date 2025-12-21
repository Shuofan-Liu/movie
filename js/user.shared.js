// 用户模块共享工具与常量
(function(){
  // 当前登录用户信息（全局）
  window.currentUser = window.currentUser || null;

  // 关系类型配置
  window.RELATIONSHIP_TYPES = {
    eternal: { key: 'eternal', name: 'Eternal Bond', emoji: '🪢' },
    backforth: { key: 'backforth', name: 'Back and Forth', emoji: '🏸' },
    investor: { key: 'investor', name: 'Angel Investor', emoji: '💸' },
    teddy: { key: 'teddy', name: 'Needy Teddy', emoji: '🧸' },
    time: { key: 'time', name: 'Time Needed', emoji: '⏳' },
    blah: { key: 'blah', name: 'Blah Blah', emoji: '💬' }
  };

  // DOM 便捷获取
  window.$id = function(id){
    return document.getElementById(id);
  };

  // 头像目录
  window.AVATAR_CATALOG = [
    // 太空/天气（Space/Weather）
    { key: 'moon', emoji: '🌔' },
    { key: 'earth', emoji: '🌏' },
    { key: 'saturn', emoji: '🪐' },
    { key: 'comet', emoji: '☄️' },
    { key: 'rocket', emoji: '🚀' },
    { key: 'star', emoji: '⭐' },
    { key: 'lightning', emoji: '⚡' },
    { key: 'tornado', emoji: '🌪️' },
    { key: 'wave', emoji: '🌊' },

    // 动物（Animals）
    { key: 'chick', emoji: '🐤' },
    { key: 'penguin', emoji: '🐧' },
    { key: 'lion', emoji: '🦁' },
    { key: 'bear', emoji: '🐻' },
    { key: 'unicorn', emoji: '🦄' },
    { key: 'owl', emoji: '🦉' },
    { key: 'wolf', emoji: '🐺' },
    { key: 'seal', emoji: '🦭' },
    { key: 'shark', emoji: '🦈' },

    // 食物（Food）
    { key: 'tomato', emoji: '🍅' },
    { key: 'potato', emoji: '🥔' },
    { key: 'avocado', emoji: '🥑' },
    { key: 'cheese', emoji: '🧀' },

    // 角色/生物（Characters）
    { key: 'alien', emoji: '👽' },
    { key: 'devil', emoji: '👿' },
    { key: 'ninja', emoji: '🥷' },
    { key: 'ghost', emoji: '👻' },
    { key: 'invader', emoji: '👾' },
    { key: 'skull', emoji: '💀' },
    { key: 'robot', emoji: '🤖' },
    { key: 'wing', emoji: '🪽' }
  ];

  // 生成默认首字母头像
  window.generateDefaultAvatar = function(nickname){
    if (!nickname) return { type: 'default', value: '?' };
    const firstChar = nickname.charAt(0).toUpperCase();
    return { type: 'default', value: firstChar };
  };

  // 根据目录渲染头像选项
  window.renderAvatarOptions = function(containerId, currentType){
    const container = document.getElementById(containerId);
    if (!container) return;
    const html = (window.AVATAR_CATALOG || []).map(item => {
      const selected = currentType && currentType === item.key ? ' selected' : '';
      return `<div class="avatar-option${selected}" data-avatar="${item.key}">${item.emoji}</div>`;
    }).join('');
    container.innerHTML = html;
  };

  // 渲染头像（用于显示）
  window.renderAvatar = function(avatar, nickname){
    // 检查是否应该显示首字母头像
    if (!avatar || avatar.type === 'default' || !avatar.type || avatar.type.trim() === '') {
      const defaultAvatar = window.generateDefaultAvatar(nickname);
      return `<div class="default-avatar">${defaultAvatar.value}</div>`;
    }

    const avatarMap = {
      // 太空/天气
      moon: '🌔', earth: '🌏', saturn: '🪐', comet: '☄️', rocket: '🚀', star: '⭐', lightning: '⚡', tornado: '🌪️', wave: '🌊',
      // 动物
      chick: '🐤', penguin: '🐧', lion: '🦁', bear: '🐻', unicorn: '🦄', owl: '🦉', wolf: '🐺', seal: '🦭', shark: '🦈',
      // 食物
      tomato: '🍅', potato: '🥔', avocado: '🥑', cheese: '🧀',
      // 角色/生物
      alien: '👽', devil: '👿', ninja: '🥷', ghost: '👻', invader: '👾', skull: '💀', robot: '🤖', wing: '🪽',
      // 兼容旧数据
      wonderwoman: '⚡', captainmarvel: '⭐'
    };

    if (avatarMap[avatar.type]) {
      return `<div class="avatar-emoji">${avatarMap[avatar.type]}</div>`;
    } else {
      const defaultAvatar = window.generateDefaultAvatar(nickname);
      return `<div class="default-avatar">${defaultAvatar.value}</div>`;
    }
  };

  // 初始化头像选择器（注册页）
  window.initAvatarSelector = function(){
    const containerId = 'avatarSelector';
    const selectedInput = document.getElementById('selectedAvatar');
    if (!selectedInput) return;
    window.renderAvatarOptions(containerId, '');
    const container = document.getElementById(containerId);
    if (!container) return;
    const avatarOptions = container.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
      option.addEventListener('click', function(){
        const alreadySelected = this.classList.contains('selected');
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        if (alreadySelected) {
          selectedInput.value = '';
        } else {
          this.classList.add('selected');
          selectedInput.value = this.getAttribute('data-avatar');
        }
      });
    });
  };
})();
