// 土豆桌宠与日帧玩法（框架版，瓦尔达短句请后续填充 quotes）
(function () {
  const layerId = 'potatoLayer';
  const petId = 'potatoPet';
  const bubbleId = 'potatoBubble';
  const PET_SIZE = 80;
  const BLINK_MIN = 2600;
  const BLINK_MAX = 5200;
  const RANDOM_MOVE_MIN = 2000;
  const RANDOM_MOVE_MAX = 8000;

  const quotes = [
    // 可在此替换/增补瓦尔达英文短句
    "If we opened people up, we'd find landscapes.",
    "You have to invent life.",
    "I am still alive. I am still curious.",
    "I don't want to show things, but to give people the desire to see.",
    "Cinema is my home.",
    "There's only one age: alive.",
    "I didn't have a career; I made films.",
    "I'm just saying, I'm not dead yet.",
    "I enjoy the time passing.",
    "I'm curious. Period.",
    "Aging is interesting, you know?",
    "Aging for me is not a condition but a subject.",
    "Hands are the tool of the painter, the artist.",
    "My mind is often half-sleeping, like in a daydream.",
    "I had flops, I had success.",
    "I am small.",
    "I've always loved polka dots.",
    "It was so silent.",
    "What is before and after the snapshot intrigues me.",
    "The tool of every self-portrait is the mirror.",
    "Cinema is my home.",
    "In my films, I always wanted to make people see deeply.",
    "I don't want to show things, but to give people the desire to see.",
    "I think I was a feminist before being born.",
    "I started to get old at a very young age.",
    "There's only one age: alive.",
    "It's not protecting the old age."
  ];

  const state = {
    userId: null,
    profile: null,
    pos: { x: 120, y: 120 },
    vel: { x: 0, y: 40 },
    rot: 0,
    eyeMode: 'open',
    drag: { active: false, offsetX: 0, offsetY: 0 },
    timers: {
      blinkAt: 0,
      randomAt: 0,
      bubbleHide: null,
    },
    frameWriting: false,
    svgKey: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function nowMs() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  function todayId() {
    return new Date().toISOString().slice(0, 10);
  }

  function diffDays(prev, curr) {
    if (!prev) return null;
    const a = new Date(prev + 'T00:00:00');
    const b = new Date(curr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  function toast(msg, type) {
    if (window.showInlineAlert) {
      window.showInlineAlert(msg, type || 'info');
    } else {
      console.log('[potato]', msg);
    }
  }

  // ===== Firestore helpers (轻量版，失败时退到 localStorage) =====
  const storage = {
    async loadProfile(userId) {
      const localKey = 'potato_profile_' + userId;
      if (window.db) {
        try {
          const ref = db.collection('potato_users').doc(userId);
          const snap = await ref.get();
          if (snap.exists) return snap.data();
        } catch (e) {
          console.warn('[potato] load profile from db failed', e);
        }
      }
      const cached = localStorage.getItem(localKey);
      return cached ? JSON.parse(cached) : null;
    },
    async saveProfile(userId, profile) {
      const localKey = 'potato_profile_' + userId;
      localStorage.setItem(localKey, JSON.stringify(profile));
      if (window.db) {
        try {
          const ref = db.collection('potato_users').doc(userId);
          await ref.set(profile, { merge: true });
        } catch (e) {
          console.warn('[potato] save profile failed', e);
        }
      }
    },
    async getFrame(userId, day) {
      if (window.db) {
        try {
          const ref = db.collection('potato_users').doc(userId).collection('frames').doc(day);
          const snap = await ref.get();
          if (snap.exists) return snap.data();
        } catch (e) {
          console.warn('[potato] get frame failed', e);
        }
      }
      return null;
    },
    async saveFrame(userId, day, data) {
      if (window.db) {
        const ref = db.collection('potato_users').doc(userId).collection('frames').doc(day);
        await ref.set(data, { merge: true });
      } else {
        const key = 'potato_frames_' + userId;
        const cached = JSON.parse(localStorage.getItem(key) || '{}');
        cached[day] = data;
        localStorage.setItem(key, JSON.stringify(cached));
      }
    },
  };
  // ===== UI & motion =====
  function updateVisual() {
    const petEl = $(petId);
    if (!petEl) return;
    const profile = state.profile;
    const variant = profile ? profile.variant : 'seed';
    const variantKey = variant === 'normal' ? 'mature' : variant; // 与 SVG 文件名对齐
    const eyes = state.eyeMode === 'closed' ? 'Slit' : 'Dot';
    const svgKey = `${variantKey}-${eyes}`;

    // 将当前状态同步到 DOM，用于 CSS 选择器
    petEl.dataset.variant = variant || 'seed';
    petEl.dataset.eyes = state.eyeMode;

    // 仅在 variant/眼睛状态变化时加载对应 SVG，避免在动画帧里重复请求
    if (state.svgKey !== svgKey) {
      state.svgKey = svgKey;
      const svgFile = `/SVG/${variantKey}${eyes}-px96.svg`;
      fetch(svgFile)
        .then(res => (res.ok ? res.text() : Promise.reject(res.status)))
        .then(svg => { petEl.innerHTML = svg; })
        .catch(err => console.warn('[potato] load svg failed', svgFile, err));
    }

    positionBubble();
  }

  function positionPet() {
    const petEl = $(petId);
    if (!petEl) return;
    petEl.style.transform = `translate(${state.pos.x}px, ${state.pos.y}px) rotate(${state.rot}deg)`;
    positionBubble();
  }

  function scheduleBlink() {
    state.timers.blinkAt = nowMs() + rand(BLINK_MIN, BLINK_MAX);
  }

  function scheduleRandomMove() {
    state.timers.randomAt = nowMs() + rand(RANDOM_MOVE_MIN, RANDOM_MOVE_MAX);
  }

  function pulseQuote() {
    const petEl = $(petId);
    if (!petEl) return;
    const quote = quotes.length ? quotes[Math.floor(Math.random() * quotes.length)] : 'Keep growing.';
    hopTwice(() => showBubble(quote));
  }

  function randomizeVelocity() {
    const stop = Math.random() < 0.35;
    if (stop) {
      state.vel.x = 0;
      state.vel.y = 0;
      return;
    }
    const speed = rand(20, 80);
    const angle = rand(0, Math.PI * 2);
    state.vel.x = Math.cos(angle) * speed;
    state.vel.y = Math.sin(angle) * speed;
  }

  function positionBubble() {
    const bubble = $(bubbleId);
    if (!bubble) return;
    if (!bubble.classList.contains('show')) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 头部右上角：以pet为基准，右上偏移
    const offsetX = PET_SIZE * 0.62; // 右上角
    const offsetY = -bubble.offsetHeight * 0.6;
    let left = state.pos.x + offsetX;
    let top = state.pos.y + offsetY;
    // 边界限制
    left = Math.max(8, Math.min(left, vw - bubble.offsetWidth - 8));
    top = Math.max(8, Math.min(top, vh - bubble.offsetHeight - 8));
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
  }

  function hopTwice(done) {
    const petEl = $(petId);
    if (!petEl) return;
    state.rot = 0;
    positionPet();
    petEl.classList.remove('potato-hop');
    petEl.style.setProperty('--px', `${state.pos.x}px`);
    petEl.style.setProperty('--py', `${state.pos.y}px`);
    void petEl.offsetWidth;
    petEl.classList.add('potato-hop');
    petEl.addEventListener('animationend', () => {
      petEl.classList.remove('potato-hop');
      if (typeof done === 'function') done();
    }, { once: true });
  }

  function showBubble(msg, durationMs) {
    const bubble = $(bubbleId);
    if (!bubble) return;
    bubble.textContent = msg;
    bubble.classList.add('show');
    positionBubble();
    if (state.timers.bubbleHide) {
      clearTimeout(state.timers.bubbleHide);
    }
    const delay = durationMs || 3200;
    state.timers.bubbleHide = setTimeout(() => {
      bubble.classList.remove('show');
      state.timers.bubbleHide = null;
    }, delay);
  }

  function tick(last) {
    const petEl = $(petId);
    if (!petEl) return;
    const loop = (ts) => {
      const dt = last ? (ts - last) / 1000 : 0;
      last = ts;

      if (!state.drag.active) {
        state.pos.x += state.vel.x * dt;
        state.pos.y += state.vel.y * dt;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const maxX = Math.max(0, vw - PET_SIZE);
        const maxY = Math.max(0, vh - PET_SIZE);

        if (state.pos.x <= 0 || state.pos.x >= maxX) {
          state.vel.x *= -1;
          state.pos.x = Math.min(Math.max(state.pos.x, 0), maxX);
        }
        if (state.pos.y <= 0 || state.pos.y >= maxY) {
          state.vel.y *= -1;
          state.pos.y = Math.min(Math.max(state.pos.y, 0), maxY);
        }

        state.rot += (state.vel.x + state.vel.y) * 0.02;
      }

      const now = nowMs();
      if (now > state.timers.blinkAt) {
        state.eyeMode = 'closed';
        setTimeout(() => {
          state.eyeMode = 'open';
          updateVisual();
        }, 180);
        scheduleBlink();
      }

      if (now > state.timers.randomAt && !state.drag.active) {
        randomizeVelocity();
        scheduleRandomMove();
      }

      positionPet();
      updateVisual();
      state._raf = requestAnimationFrame(loop);
    };
    state._raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (state._raf) cancelAnimationFrame(state._raf);
    state._raf = null;
  }

  function onDragStart(e) {
    e.preventDefault();
    state.drag.active = true;
    state.drag.offsetX = e.clientX - state.pos.x;
    state.drag.offsetY = e.clientY - state.pos.y;
    state.vel.x = 0;
    state.vel.y = 0;
  }

  function onDragMove(e) {
    if (!state.drag.active) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxX = Math.max(0, vw - PET_SIZE);
    const maxY = Math.max(0, vh - PET_SIZE);
    state.pos.x = Math.min(Math.max(e.clientX - state.drag.offsetX, 0), maxX);
    state.pos.y = Math.min(Math.max(e.clientY - state.drag.offsetY, 0), maxY);
    positionPet();
  }

  function onDragEnd() {
    if (!state.drag.active) return;
    state.drag.active = false;
    scheduleRandomMove();
    persistProfile();
  }

  // ===== 数据与事件 =====
  function defaultProfile(userId) {
    return {
      userId,
      variant: 'seed',
      heartUnlocked: false,
      streak: 0,
      totalFrames: 0,
      lastFrameDay: null,
      pos: { x: rand(80, Math.max(100, window.innerWidth - 180)), y: rand(10, 60) },
      vel: { x: rand(-20, 20), y: rand(30, 60) },
      rot: 0,
    };
  }

  async function loadProfile(userId) {
    const existing = await storage.loadProfile(userId);
    state.profile = existing || defaultProfile(userId);
    state.pos = { ...(state.profile.pos || {}) };
    state.vel = { ...(state.profile.vel || { x: 0, y: 30 }) };
    state.rot = state.profile.rot || 0;
    randomizeVelocity();
    scheduleBlink();
    scheduleRandomMove();
    updateVisual();
    positionPet();
  }

  async function persistProfile() {
    if (!state.userId || !state.profile) return;
    state.profile.pos = { ...state.pos };
    state.profile.vel = { ...state.vel };
    state.profile.rot = state.rot;
    await storage.saveProfile(state.userId, state.profile);
  }

  async function ensureProfile(userId) {
    if (!state.profile) {
      await loadProfile(userId);
      await storage.saveProfile(userId, state.profile);
    }
  }

  async function claimSeed() {
    if (!state.userId) return toast('请先登录', 'warn');
    await ensureProfile(state.userId);
    if (state.profile.variant !== 'seed') return;
    state.profile.variant = 'sprout';
    state.profile.totalFrames = state.profile.totalFrames || 0;
    await storage.saveProfile(state.userId, state.profile);
    updateVisual();
  }

  async function leaveFrame() {
    if (!state.userId) return toast('请先登录', 'warn');
    if (state.frameWriting) return;
    const day = todayId();
    try {
      state.frameWriting = true;
      await ensureProfile(state.userId);

      const exists = await storage.getFrame(state.userId, day);
      if (exists) {
        toast('今天已经留过一帧了', 'warn');
        return;
      }

      const quoteId = quotes.length ? Math.floor(Math.random() * quotes.length) : null;
      const metadata = {
        day,
        quoteId,
        eyeMode: Math.random() > 0.5 ? 'open' : 'closed',
        bob: rand(-3, 3),
        tilt: rand(-4, 4),
        createdAt: window.firebase ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
      };

      await storage.saveFrame(state.userId, day, metadata);

      // streak & unlock
      const last = state.profile.lastFrameDay;
      const diff = diffDays(last, day);
      if (diff === 1) {
        state.profile.streak = (state.profile.streak || 0) + 1;
      } else if (diff === 0) {
        // same day; no-op
      } else {
        state.profile.streak = 1;
      }
      state.profile.totalFrames = (state.profile.totalFrames || 0) + 1;
      state.profile.lastFrameDay = day;

      const totalFrames = state.profile.totalFrames || 0;

      // 连续 24 天留帧：爱心土豆
      if (!state.profile.heartUnlocked && state.profile.streak >= 24) {
        state.profile.heartUnlocked = true;
        state.profile.variant = 'heart';
        toast('恭喜，解锁爱心土豆！', 'success');
      }
      // 累计 24 天留帧：成熟土豆（非连续也算）
      else if (state.profile.variant === 'sprout' && totalFrames >= 24) {
        state.profile.variant = 'normal';
      }

      await storage.saveProfile(state.userId, state.profile);

      // 简单眨眼+光效
      state.eyeMode = 'closed';
      setTimeout(() => { state.eyeMode = 'open'; updateVisual(); }, 220);
      // 拍照时身体回正，位置同步
      state.rot = 0;
      positionPet();
      updateVisual();
      showCameraFlash();
      pulseQuote();
      toast('今日一帧已保存', 'success');
      // ===== 相机闪烁动画 =====
      function showCameraFlash() {
        const petEl = $(petId);
        const flash = document.getElementById('potatoCameraFlash');
        if (!petEl || !flash) return;
        // 定位到土豆右下方
        const petRect = petEl.getBoundingClientRect();
        const layerRect = $(layerId).getBoundingClientRect();
        // 右下偏移（不遮住土豆）
        const offsetX = petRect.right - layerRect.left - 8;
        const offsetY = petRect.bottom - layerRect.top - 4;
        flash.style.left = offsetX + 'px';
        flash.style.top = offsetY + 'px';
        flash.classList.remove('flash');
        void flash.offsetWidth;
        flash.classList.add('flash');
        setTimeout(() => {
          flash.classList.remove('flash');
        }, 400);
      }
    } catch (e) {
      console.error('[potato] leave frame error', e);
      toast('保存失败，请稍后再试', 'error');
    } finally {
      state.frameWriting = false;
      updateVisual();
    }
  }

  function wireEvents() {
    const petEl = $(petId);
    if (!petEl) return;
    petEl.addEventListener('pointerdown', onDragStart);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    petEl.addEventListener('click', (e) => {
      e.stopPropagation();
      state.rot = 0;
      positionPet();
      if (state.profile && state.profile.variant === 'seed') {
        claimSeed();
      } else {
        pulseQuote();
      }
    });
  }

  function watchAuth() {
    let lastId = null;
    setInterval(async () => {
      const user = window.currentUser;
      const id = user && user.id;
      if (id !== lastId) {
        lastId = id;
        state.userId = id;
        state.profile = null;
        if (!id) {
          updateVisual();
          return;
        }
        await loadProfile(id);
      }
    }, 800);
  }

  function handleResize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxX = Math.max(0, vw - PET_SIZE);
    const maxY = Math.max(0, vh - PET_SIZE);
    state.pos.x = Math.min(state.pos.x, maxX);
    state.pos.y = Math.min(state.pos.y, maxY);
    positionPet();
    positionBubble();
  }

  window.initPotatoPet = function initPotatoPet() {
    const layer = $(layerId);
    const petEl = $(petId);
    if (!layer || !petEl) return;
    layer.style.display = 'block';

    wireEvents();
    watchAuth();
    scheduleBlink();
    scheduleRandomMove();
    positionPet();
    updateVisual();
    stopLoop();
    tick();

    window.addEventListener('resize', handleResize);
  };

  window.leavePotatoFrame = leaveFrame;
  window.potatoPetDebug = { state };
})();
