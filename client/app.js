(() => {
  const SWATCHES = ['#ff3d7f', '#ff9d3d', '#ffd53d', '#35e0a1', '#3ddaff', '#5b8fff', '#a35bff', '#ff5c8a'];

  const $ = (sel) => document.querySelector(sel);
  const screens = {};
  document.querySelectorAll('[data-screen]').forEach((el) => (screens[el.id] = el));

  function showScreen(id) {
    Object.values(screens).forEach((el) => (el.hidden = el.id !== id));
  }

  function vib(ms = 15) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function initials(name) {
    return (name || '?').trim().slice(0, 2).toUpperCase();
  }

  // gradiente de intensidade da badge conforme a posição (0 = fraco, 4 = forte)
  function badgeColorForIndex(i, total) {
    const t = total > 1 ? i / (total - 1) : 0;
    // interpola de surface-2 (fraco) para accent (forte) via mistura simples em HSL não é trivial em JS puro,
    // então usamos opacidade crescente do accent sobre a superfície.
    const alpha = Math.round(20 + t * 70); // 20%..90%
    return `color-mix(in srgb, var(--accent) ${alpha}%, var(--surface-2))`;
  }

  // ---------------- estado local / preferências ----------------
  let token = localStorage.getItem('pb_token') || '';
  let myName = localStorage.getItem('pb_name') || '';
  let myColor = localStorage.getItem('pb_color') || SWATCHES[0];
  let reduceMotion = localStorage.getItem('pb_reduce_motion') === '1';

  document.documentElement.style.setProperty('--accent', myColor);
  document.documentElement.style.setProperty('--accent-dim', myColor + '33');
  if (reduceMotion) document.body.classList.add('reduce-motion');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduce-motion');
  }

  function renderAllSwatchRows() {
    [$('#swatch-row'), $('#settings-swatch-row')].forEach(buildSwatchRow);
  }
  function buildSwatchRow(container) {
    container.innerHTML = '';
    SWATCHES.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'swatch' + (c === myColor ? ' selected' : '');
      btn.style.background = c;
      btn.addEventListener('click', () => {
        myColor = c;
        localStorage.setItem('pb_color', c);
        document.documentElement.style.setProperty('--accent', c);
        document.documentElement.style.setProperty('--accent-dim', c + '33');
        renderAllSwatchRows();
        vib(10);
        if (joined) socket.emit('join', { token, name: myName, color: myColor });
      });
      container.appendChild(btn);
    });
  }
  renderAllSwatchRows();

  $('#input-name').value = myName;

  $('#toggle-reduce-motion').checked = reduceMotion;
  $('#toggle-reduce-motion').addEventListener('change', (e) => {
    reduceMotion = e.target.checked;
    localStorage.setItem('pb_reduce_motion', reduceMotion ? '1' : '0');
    document.body.classList.toggle('reduce-motion', reduceMotion);
  });

  // ---------------- socket ----------------
  const socket = io({ transports: ['websocket', 'polling'] });
  let joined = false;
  let myToken = null;

  socket.on('connect', () => {
    if (myName) doJoin();
  });

  function doJoin() {
    socket.emit('join', { token, name: myName, color: myColor }, (res) => {
      if (res && res.token) {
        token = res.token;
        localStorage.setItem('pb_token', token);
      }
      joined = true;
    });
  }

  $('#btn-join').addEventListener('click', () => {
    const val = $('#input-name').value.trim();
    if (!val) {
      $('#input-name').focus();
      vib(30);
      return;
    }
    myName = val;
    localStorage.setItem('pb_name', myName);
    vib(15);
    doJoin();
  });

  socket.on('state', (view) => {
    myToken = view.you.token;
    render(view);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && myName) {
      if (!socket.connected) socket.connect();
      else doJoin();
    }
  });

  let toastTimer = null;
  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2200);
  }
  socket.on('disconnect', () => { if (joined) showToast('Reconectando…'); });
  socket.io.on('reconnect', () => { if (myName) doJoin(); });

  socket.on('force_rejoin', () => {
    token = '';
    myName = '';
    localStorage.removeItem('pb_token');
    localStorage.removeItem('pb_name');
    joined = false;
    myToken = null;
    $('#input-name').value = '';
    $('#round-indicator').hidden = true;
    document.querySelectorAll('.modal-overlay').forEach((m) => (m.hidden = true));
    showScreen('screen-join');
  });

  // ---------------- render principal ----------------
  function render(view) {
    if (!joined && !myName) {
      showScreen('screen-join');
      return;
    }

    $('#round-indicator').hidden = !(view.totalRounds > 0 && view.phase !== 'lobby' && view.phase !== 'gameover');
    $('#round-current').textContent = view.round;
    $('#round-total').textContent = view.totalRounds;

    switch (view.phase) {
      case 'lobby':
        renderLobby(view);
        showScreen('screen-lobby');
        break;
      case 'category':
        if (view.you.isGuesser) {
          renderCategoryPicker(view);
          showScreen('screen-category');
        } else {
          renderWaitCategory(view);
          showScreen('screen-wait-category');
        }
        break;
      case 'listen':
        if (view.you.isGuesser) {
          renderGuesserListen(view);
          showScreen('screen-listen-guesser');
        } else {
          renderAnswerView(view);
          showScreen('screen-answer-view');
        }
        break;
      case 'guess':
        if (view.you.isGuesser) {
          renderGuessScreen(view);
          showScreen('screen-guess');
        } else {
          renderAnswerView(view);
          showScreen('screen-answer-view');
        }
        break;
      case 'reveal':
        renderReveal(view);
        showScreen('screen-reveal');
        break;
      case 'gameover':
        renderGameOver(view);
        showScreen('screen-gameover');
        break;
    }
  }

  // ---------------- lobby ----------------
  function renderLobby(view) {
    const grid = $('#lobby-players');
    grid.innerHTML = '';
    view.players.forEach((p, i) => {
      const isYou = p.token === myToken;
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.style.animationDelay = i * 0.05 + 's';
      chip.innerHTML = `
        <div class="player-avatar-wrap${isYou ? ' is-you' : ''}">
          <div class="player-avatar${p.connected ? '' : ' disconnected'}" style="background:${p.color}">${initials(p.name)}</div>
        </div>
        <div class="player-name">${escapeHtml(p.name)}</div>
        ${isYou ? '<span class="you-tag">você</span>' : ''}
      `;
      grid.appendChild(chip);
    });
    const count = view.players.filter((p) => p.connected).length;
    $('#lobby-count-label').textContent = `${count} de 12 · esperando`;
    const btn = $('#btn-start');
    btn.disabled = count < 3 || count > 12;
    btn.textContent = count < 3 ? `Faltam ${3 - count}` : 'Iniciar jogo';
  }
  $('#btn-start').addEventListener('click', () => {
    vib(20);
    socket.emit('start_game');
  });

  // ---------------- categoria ----------------
  function renderCategoryPicker(view) {
    const grid = $('#category-grid');
    grid.innerHTML = '';
    view.categories.forEach((c, i) => {
      const el = document.createElement('button');
      el.className = 'category-card';
      el.style.animationDelay = i * 0.05 + 's';
      el.innerHTML = `<span class="cat-icon-wrap">${c.icon}</span><span>${c.label}</span>`;
      el.addEventListener('click', () => {
        vib(20);
        socket.emit('choose_category', c.id);
      });
      grid.appendChild(el);
    });
  }

  function renderWaitCategory(view) {
    $('#wait-cat-avatar').style.background = view.guesserColor || '#ff3d7f';
    $('#wait-cat-avatar').textContent = initials(view.guesserName);
    $('#wait-cat-name').textContent = view.guesserName || '';
  }

  function catChipHtml(cat) {
    if (!cat) return '';
    return `<span class="cat-icon">${cat.icon}</span><span>${cat.label}</span>`;
  }

  // ---------------- tela de pergunta unificada (ouvir + aguardar ordenação) ----------------
  let hideQuestion = false;
  let answerRoundKey = null;
  let currentAnswerText = '';

  function renderAnswerView(view) {
    const roundKey = view.round + '-' + (view.category && view.category.id);
    if (roundKey !== answerRoundKey) {
      hideQuestion = false;
      answerRoundKey = roundKey;
    }
    $('#answer-cat-chip').innerHTML = catChipHtml(view.category);
    if (view.officialQuestionText) currentAnswerText = view.officialQuestionText;

    if (view.phase === 'listen') {
      $('#answer-caption-icon').textContent = '🗣️';
      $('#answer-caption-text').textContent = 'responda em voz alta';
    } else {
      $('#answer-caption-icon').textContent = '🤔';
      $('#answer-caption-text').textContent = `${view.guesserName || 'palpiteiro'} está ordenando`;
    }
    updateQuestionVisibility();
  }

  function updateQuestionVisibility() {
    const card = $('#answer-question-text');
    const cardWrap = $('#answer-question');
    const btn = $('#btn-toggle-hide');
    if (hideQuestion) {
      card.textContent = '🙈';
      cardWrap.classList.add('is-hidden');
      btn.textContent = '👁️';
      btn.setAttribute('aria-label', 'Revelar pergunta');
    } else {
      card.textContent = currentAnswerText;
      cardWrap.classList.remove('is-hidden');
      btn.textContent = '🙈';
      btn.setAttribute('aria-label', 'Ocultar pergunta');
    }
  }
  $('#btn-toggle-hide').addEventListener('click', () => {
    hideQuestion = !hideQuestion;
    vib(12);
    updateQuestionVisibility();
  });

  // ---------------- palpiteiro aguardando respostas ----------------
  function renderGuesserListen(view) {
    $('#guesser-cat-chip').innerHTML = catChipHtml(view.category);
  }
  $('#btn-ready').addEventListener('click', () => {
    vib(20);
    socket.emit('guesser_ready');
  });

  // ---------------- régua: reordenar apenas subindo/descendo ----------------
  let order = [];
  let currentOptions = [];
  let guessRoundKey = null;

  function renderGuessScreen(view) {
    const roundKey = view.round + '-' + (view.category && view.category.id);
    $('#guess-cat-chip').innerHTML = catChipHtml(view.category);
    if (roundKey !== guessRoundKey) {
      currentOptions = view.options || [];
      order = currentOptions.map((o) => o.id);
      guessRoundKey = roundKey;
    }
    drawReorderList();
  }

  function optionText(id) {
    const o = currentOptions.find((x) => x.id === id);
    return o ? o.text : '';
  }

  function captureRects() {
    const map = {};
    document.querySelectorAll('#reorder-list .reorder-row').forEach((el) => {
      map[el.dataset.id] = el.getBoundingClientRect().top;
    });
    return map;
  }

  function playFlip(before) {
    document.querySelectorAll('#reorder-list .reorder-row').forEach((el) => {
      const id = el.dataset.id;
      const oldTop = before[id];
      if (oldTop == null) return;
      const newTop = el.getBoundingClientRect().top;
      const delta = oldTop - newTop;
      if (Math.abs(delta) < 0.5) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${delta}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.32s cubic-bezier(.2,.8,.2,1)';
        el.style.transform = 'translateY(0)';
      });
    });
  }

  function drawReorderList() {
    const list = $('#reorder-list');
    list.innerHTML = '';
    order.forEach((id, idx) => {
      const row = document.createElement('div');
      row.className = 'reorder-row';
      row.dataset.id = id;
      const badgeColor = badgeColorForIndex(idx, order.length);
      row.innerHTML = `
        <span class="reorder-badge" style="background:${badgeColor}">${idx}</span>
        <span class="reorder-text">${escapeHtml(optionText(id))}</span>
        <span class="reorder-controls">
          <button class="reorder-btn up" aria-label="Mover para cima" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="reorder-btn down" aria-label="Mover para baixo" ${idx === order.length - 1 ? 'disabled' : ''}>▼</button>
        </span>
      `;
      row.querySelector('.up').addEventListener('click', () => moveItem(idx, -1));
      row.querySelector('.down').addEventListener('click', () => moveItem(idx, 1));
      list.appendChild(row);
    });
  }

  function moveItem(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= order.length) return;
    const before = captureRects();
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    drawReorderList();
    playFlip(before);
    vib(14);
  }

  $('#btn-confirm-order').addEventListener('click', () => {
    vib([15, 40, 15]);
    socket.emit('submit_order', order.slice());
  });

  // ---------------- revelação ----------------
  let lastRevealKey = null;
  function renderReveal(view) {
    const r = view.lastResult;
    if (!r) return;
    const guesserName = (view.players.find((p) => p.token === r.guesserToken) || {}).name || 'Palpiteiro';
    $('#reveal-points').innerHTML = `<span class="pts-num">+${r.points}</span><span class="pts-label">${escapeHtml(guesserName)} marcou ${r.points} ${r.points === 1 ? 'ponto' : 'pontos'}</span>`;

    const list = $('#reveal-list');
    list.innerHTML = '';
    r.order.forEach((qid, idx) => {
      const opt = r.options.find((o) => o.id === qid);
      const isOfficial = qid === r.officialId;
      const row = document.createElement('div');
      row.className = 'reorder-row' + (isOfficial ? ' official' : '');
      row.style.animationDelay = idx * 0.07 + 's';
      const badgeColor = badgeColorForIndex(idx, r.order.length);
      row.innerHTML = `
        <span class="reorder-badge" style="background:${isOfficial ? '' : badgeColor}">${idx}</span>
        <span class="reorder-text">${isOfficial ? '⭐ ' : ''}${escapeHtml(opt ? opt.text : '')}</span>
      `;
      list.appendChild(row);
    });

    const key = view.round + '-reveal';
    if (key !== lastRevealKey) {
      lastRevealKey = key;
      vib([10, 30, 10, 30, 20]);
    }
  }

  $('#btn-continue').addEventListener('click', () => {
    vib(15);
    socket.emit('next_round');
  });

  // ---------------- fim de jogo ----------------
  function renderGameOver(view) {
    const list = $('#ranking-list');
    list.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    (view.finalRanking || []).forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'ranking-row' + (i === 0 ? ' first' : '');
      row.style.animationDelay = i * 0.06 + 's';
      row.innerHTML = `
        <span class="rank-medal">${medals[i] || i + 1}</span>
        <span class="rank-avatar" style="background:${p.color}">${initials(p.name)}</span>
        <span class="rank-name">${escapeHtml(p.name)}</span>
        <span class="rank-score">${p.score}</span>
      `;
      list.appendChild(row);
    });
  }
  $('#btn-play-again').addEventListener('click', () => {
    vib(20);
    socket.emit('reset_room');
  });

  // ---------------- modais ----------------
  $('#btn-reset').addEventListener('click', () => {
    vib(10);
    $('#modal-reset').hidden = false;
  });
  $('#btn-reset-cancel').addEventListener('click', () => ($('#modal-reset').hidden = true));
  $('#btn-reset-confirm').addEventListener('click', () => {
    vib([10, 20, 10]);
    socket.emit('reset_room');
    $('#modal-reset').hidden = true;
  });

  $('#btn-settings').addEventListener('click', () => {
    vib(10);
    $('#modal-settings').hidden = false;
  });
  $('#btn-settings-close').addEventListener('click', () => ($('#modal-settings').hidden = true));

  if (myName) showScreen('screen-lobby');
})();
