// 测验系统（精简占位，可按原逻辑补全）
(function(){
  function el(id){ return document.getElementById(id); }
  function setHidden(id, hidden){ const x = el(id); if (!x) return; x.classList[hidden?'add':'remove']('hidden'); }

  function updateProgress(idx,total){
    const fill = el('progressFill');
    if (!fill) return;
    const p = Math.max(0, Math.min(100, Math.round((idx/Math.max(1,total))*100)));
    fill.style.width = p + '%';
  }

  window.startQuiz = function(){
    const overlay = el('quizOverlay');
    if (overlay) overlay.classList.add('active');
    window.APP_STATE.currentQuestion = 0;
    window.APP_STATE.answers = new Array((window.questions||[]).length).fill('');
    window.APP_STATE.firstAttemptStatus = new Array((window.questions||[]).length).fill(null);
    
    // 加载用户已有的徽章（第二次测验时保留已获得的徽章）
    if (window.currentUser && window.currentUser.badges) {
      window.APP_STATE.badges = { ...window.currentUser.badges };
    } else {
      // 未登录或没有徽章记录，重置为初始状态
      window.APP_STATE.badges = { oscar: false, cannes: false, berlin: false, venice: false, potato: false };
    }
    
    setHidden('guestbookPage', true);
    setHidden('wallPage', true);
    setHidden('quizPage', false);
    showQuestion(0);
  }

  window.showQuestion = function(index){
    const qs = window.questions||[];
    const q = qs[index];
    if (!q) { // 没有题目，直接进入留言簿
      return showGuestbook();
    }
    el('questionNumber').textContent = `问题 ${index+1} / ${qs.length}`;
    // 适配题干与图片字段
    el('questionText').textContent = q.q || q.text || '';
    const imageSrc = q.image || q.img || '';
    const hasImg = !!imageSrc;
    setHidden('questionImage', !hasImg);
    el('questionImg').src = hasImg ? imageSrc : '';

    // 输入/选项二选一
    const optionsContainer = el('optionsContainer');
    const answerInput = el('answerInput');
    optionsContainer.innerHTML = '';
    // 兼容：构建单选项列表
    // 1) 若 q.options 是字符串数组，直接使用为 label+value
    // 2) 若没有 options，则从 q.hint 中解析所有 A/B/C/D 选项，q.a 用于判断正确答案
    let derivedOptions = [];
    if (Array.isArray(q.options) && q.options.length) {
      derivedOptions = q.options.map(opt => ({ value: String(opt), label: String(opt) }));
    } else {
      // 从 hint 中解析所有定义的选项（A. ... B. ... C. ...）
      const hintLines = String(q.hint || '').split(/\r?\n/);
      const hintLetters = new Set();
      const labelMap = {};
      for (const line of hintLines) {
        const m = line.match(/^\s*([A-D])\s*[\.、\)]\s*(.+)$/);
        if (m) {
          const letter = m[1].toUpperCase();
          hintLetters.add(letter);
          labelMap[letter] = `${letter}. ${m[2].trim()}`;
        }
      }
      // 如果从 hint 解析出了选项，则使用；否则尝试用 q.a
      if (hintLetters.size > 0) {
        const sortedLetters = Array.from(hintLetters).sort();
        derivedOptions = sortedLetters.map(L => ({ value: L, label: labelMap[L] || L }));
      } else if (Array.isArray(q.a) && q.a.length && q.a.every(v => /^[A-D]$/i.test(String(v).trim()))) {
        // 兜底：若 hint 无法解析，且 q.a 全是字母，用 q.a 作为选项
        const letters = Array.from(new Set(q.a.map(v => String(v).trim().toUpperCase())));
        derivedOptions = letters.map(L => ({ value: L, label: L }));
      }
    }

    if (derivedOptions.length) {
      optionsContainer.classList.remove('hidden');
      answerInput.classList.add('hidden');
      const prev = (window.APP_STATE.answers[index] || '').toString().toUpperCase();
      derivedOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-button';
        btn.textContent = opt.label;
        btn.dataset.value = opt.value;
        btn.addEventListener('click', ()=> selectOption(opt.value));
        if (prev && prev === String(opt.value).toUpperCase()) {
          btn.classList.add('selected');
        }
        optionsContainer.appendChild(btn);
      });
    } else {
      optionsContainer.classList.add('hidden');
      answerInput.classList.remove('hidden');
      answerInput.value = window.APP_STATE.answers[index] || '';
      answerInput.focus();
    }

    updateProgress(index, qs.length);
  }

  window.selectOption = function(option){
    const idx = window.APP_STATE.currentQuestion;
    window.APP_STATE.answers[idx] = option;
    const buttons = document.querySelectorAll('.option-button');
    buttons.forEach(b=> b.classList.toggle('selected', String(b.dataset.value).toUpperCase()===String(option).toUpperCase()));
  }

  window.checkAnswer = function(index, value){
    const qs = window.questions||[];
    const q = qs[index];
    // 适配 q.a 数组格式（多个可接受的答案）
    if (!q) return true;
    if (q.a && Array.isArray(q.a) && q.a.length) {
      const normalizedValue = String(value).trim().toLowerCase();
      return q.a.some(ans => String(ans).trim().toLowerCase() === normalizedValue);
    }
    if (q.answer) {
      return String(value).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    }
    return true;
  }

  window.handleNext = function(){
    const idx = window.APP_STATE.currentQuestion;
    const qs = window.questions||[];
    const optionsContainer = el('optionsContainer');
    const answerInput = el('answerInput');
    
    // 对于文本输入题，从输入框读值；对于选项题，答案已由 selectOption() 保存
    if (optionsContainer && optionsContainer.classList.contains('hidden')) {
      // 选项容器隐藏 = 文本输入题
      const val = answerInput ? answerInput.value : '';
      window.APP_STATE.answers[idx] = val;
    }
    // 对于选项题（optionsContainer 显示），答案已保存，无需额外操作

    const ok = checkAnswer(idx, window.APP_STATE.answers[idx]);
    if (!ok) {
      // 答案验证失败，显示错误提示
      if (answerInput && !answerInput.classList.contains('hidden')) {
        answerInput.classList.add('error');
        setTimeout(()=> answerInput.classList.remove('error'), 500);
      }
      if (Array.isArray(window.APP_STATE.firstAttemptStatus) && window.APP_STATE.firstAttemptStatus[idx] == null) {
        window.APP_STATE.firstAttemptStatus[idx] = 'wrong';
      }
      return;
    }

    // 答对后检查是否有徽章奖励
    const q = qs[idx];
    const userAnswer = window.APP_STATE.answers[idx];
    if (Array.isArray(window.APP_STATE.firstAttemptStatus) && window.APP_STATE.firstAttemptStatus[idx] == null) {
      window.APP_STATE.firstAttemptStatus[idx] = 'correct';
    }
    
    if (q) {
      // 检查土豆徽章（需要答对法语版本）
      if (q.specialBadge === 'potato' && window.APP_STATE.firstAttemptStatus && window.APP_STATE.firstAttemptStatus[idx] === 'correct') {
        const frenchAnswers = ['cinéma-écriture', 'cinema-ecriture', 'cinécriture', 'cinecriture'];
        const normalizedAnswer = String(userAnswer).trim().toLowerCase();
        if (frenchAnswers.some(ans => ans.toLowerCase() === normalizedAnswer)) {
          if (!window.APP_STATE.badges.potato) {
            window.APP_STATE.badges.potato = true;
            if (window.showBadgeToast) {
              // 文案不含前置表情，图标后置展示
              showBadgeToast('你获得了瓦尔达的土豆徽章!', '🥔');
            }
          }
        }
      }
      // 检查常规徽章
      else if (q.badge && window.APP_STATE.firstAttemptStatus && window.APP_STATE.firstAttemptStatus[idx] === 'correct') {
        // 去除名称里的前置表情，图标改为后置展示
        const badgeLabels = {
          oscar: '奥斯卡小金人',
          cannes: '戛纳金棕榈',
          berlin: '柏林金熊',
          venice: '威尼斯金狮'
        };
        const badgeIcons = {
          oscar: '🏅',
          cannes: '🌴',
          berlin: '🐻',
          venice: '🦁'
        };
        const label = badgeLabels[q.badge];
        const icon = badgeIcons[q.badge];
        if (label) {
          if (!window.APP_STATE.badges[q.badge]) {
            window.APP_STATE.badges[q.badge] = true;
            if (window.showBadgeToast) {
              // 传入图标参数，后置展示
              showBadgeToast(`你获得了 ${label}`, icon);
            }
          }
        }
      }
    }

    if (idx + 1 < qs.length) {
      window.APP_STATE.currentQuestion += 1;
      showQuestion(window.APP_STATE.currentQuestion);
    } else {
      classifyUserStyle();
      showGuestbook();
    }
  }

  window.classifyUserStyle = function(){
    const answers = window.APP_STATE.answers || [];
    // 获取最后4题的答案（题目8-11，索引7-10）
    const q1 = answers[7]; // 你偏爱的电影主题类型是？
    const q2 = answers[8]; // 你如何看待电影的叙事性？
    const q3 = answers[9]; // 镜头语言和场面调度偏好？
    const q4 = answers[10]; // 希望电影结束后给你留下什么感觉？
    
    // 如果没有全部回答，返回null
    if (!q1 || !q2 || !q3 || !q4) {
      return null;
    }
    
    const types = {
      "T1": { name: "诗性沉浸派", director: "Chloé Zhao", score: 0 },
      "T2": { name: "人物关系叙事派", director: "Greta Gerwig", score: 0 },
      "T3": { name: "黑色类型讽刺派", director: "Emerald Fennell", score: 0 },
      "T4": { name: "议题史诗动员派", director: "Ava DuVernay", score: 0 }
    };
    
    // Q1 主题
    if (q1 === 'A') {
      types.T1.score += 2;
      types.T2.score += 2;
    } else if (q1 === 'B') {
      types.T3.score += 3;
      types.T4.score += 1;
    } else if (q1 === 'C') {
      types.T4.score += 3;
      types.T2.score += 1;
    }
    
    // Q2 叙事观
    if (q2 === 'A') {
      types.T1.score += 2;
      types.T3.score += 1;
    } else if (q2 === 'B') {
      types.T2.score += 2;
      types.T4.score += 2;
    }
    
    // Q3 镜头
    if (q3 === 'A') {
      types.T1.score += 2;
      types.T4.score += 1;
    } else if (q3 === 'B') {
      types.T3.score += 2;
    } else if (q3 === 'C') {
      types.T2.score += 2;
      types.T4.score += 1;
    }
    
    // Q4 结尾
    if (q4 === 'A') {
      types.T1.score += 1;
      types.T2.score += 2;
    } else if (q4 === 'B') {
      types.T3.score += 2;
    } else if (q4 === 'C') {
      types.T4.score += 2;
    }
    
    // 找出最高分
    const maxScore = Math.max(types.T1.score, types.T2.score, types.T3.score, types.T4.score);
    const candidates = Object.keys(types).filter(k => types[k].score === maxScore);
    
    // 平局裁决
    function tieBreakRank(t) {
      let rank = 0;
      
      // 1) Q1 主题一致性
      if (q1 === 'B') {
        rank += (t === 'T3') ? 0 : 10;
      } else if (q1 === 'C') {
        rank += (t === 'T4') ? 0 : 10;
      } else if (q1 === 'A') {
        rank += (t === 'T1' || t === 'T2') ? 0 : 10;
      }
      
      // 2) Q2
      if (q2 === 'A') {
        rank += (t === 'T1') ? 0 : 1;
      } else if (q2 === 'B') {
        rank += (t === 'T2' || t === 'T4') ? 0 : 1;
      }
      
      // 3) Q3
      if (q3 === 'B') {
        rank += (t === 'T3') ? 0 : 1;
      } else if (q3 === 'C') {
        rank += (t === 'T2') ? 0 : 1;
      } else if (q3 === 'A') {
        rank += (t === 'T1') ? 0 : 1;
      }
      
      // 4) 固定顺序
      const fixed = { T4: 0, T3: 1, T2: 2, T1: 3 };
      rank += fixed[t] * 0.01;
      
      return rank;
    }
    
    const chosen = candidates.sort((a, b) => tieBreakRank(a) - tieBreakRank(b))[0];
    
    window.APP_STATE.userStyle = {
      type: chosen,
      name: types[chosen].name,
      director: types[chosen].director,
      scores: {
        T1: types.T1.score,
        T2: types.T2.score,
        T3: types.T3.score,
        T4: types.T4.score
      }
    };
    
    return window.APP_STATE.userStyle;
  }

  window.showGuestbook = async function(){
    // 测验完成后：更新当前用户的徽章和风格
    const userStyle = classifyUserStyle();
    
    if (!window.currentUser) {
      showInlineAlert('测验完成！你的电影风格：' + (userStyle ? userStyle.name : '未知') + '。请先登录以保存你的徽章和风格', 'info');
      closeQuiz();
      return;
    }

    // 更新用户的徽章和风格
    const updateData = {
      badges: window.APP_STATE.badges || {},
      userStyle: userStyle ? userStyle.name : ''
    };

    const success = await window.updateUser(window.currentUser.id, updateData);
    
    if (success) {
      // 从数据库重新获取最新用户数据，确保数据同步
      const updatedUser = await window.getUserById(window.currentUser.id);
      if (updatedUser) {
        window.currentUser = updatedUser;
      } else {
        // 如果获取失败，至少更新本地缓存
        window.currentUser.badges = updateData.badges;
        window.currentUser.userStyle = updateData.userStyle;
      }
      
      // 更新UI显示（下拉菜单和头像角标）
      if (window.updateUserCorner) {
        window.updateUserCorner();
      }
      
      // 显示徽章提示
      showBadgeToast();
      
      showInlineAlert(`恭喜完成测验！你的电影风格：${userStyle ? userStyle.name : '未知'}。徽章和风格已保存到你的个人页面`, 'success');
      closeQuiz();
      
      // 可选：自动打开用户页面
      setTimeout(() => {
        if (window.showUserPage) {
          showUserPage(window.currentUser.id);
        }
      }, 500);
    } else {
      showInlineAlert('保存失败，请稍后再试', 'error');
    }
  }

  // 显示徽章获得提示
  function showBadgeToast(){
    const badges = window.APP_STATE.badges || {};
    const badgeNames = {
      oscar: '🏅 奥斯卡小金人',
      cannes: '🌴 戛纳金棕榈',
      berlin: '🐻 柏林金熊',
      venice: '🦁 威尼斯金狮',
      potato: '🥔 瓦尔达土豆'
    };

    for (let key in badges) {
      if (badges[key]) {
        const toast = document.getElementById('badgeToast');
        const icon = document.getElementById('badgeToastIcon');
        const text = document.getElementById('badgeToastText');
        
        if (toast && icon && text) {
          icon.textContent = badgeNames[key].split(' ')[0];
          text.textContent = '获得徽章：' + badgeNames[key].split(' ')[1];
          toast.classList.remove('hidden');
          
          setTimeout(() => {
            toast.classList.add('hidden');
          }, 3000);
        }
        break; // 只显示第一个
      }
    }
  }

  window.closeQuiz = function(){
    const overlay = el('quizOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // 监听回车提交答案
  document.addEventListener('keypress', (e)=>{
    if (e.key === 'Enter' && el('quizOverlay')?.classList.contains('active')) {
      e.preventDefault();
      handleNext();
    }
  });
})();
