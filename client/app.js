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

  function buildSwatchRow(container, onPick) {
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
        container.querySelectorAll('.swatch').forEach((s) => s.classList.remove('selected'));
        btn.classList.add('selected');
        vib(10);
        if (joined) socket.emit('join', { token, name: myName, color: myColor });
      });
      container.appendChild(btn);
    });
  }
  buildSwatchRow($('#swatch-row'));
  buildSwatchRow($('#settings-swatch-row'));

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
  let latestView = null;

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
    latestView = view;
    render(view);
  });

  // reconexão ao voltar do segundo plano
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
  socket.on('disconnect', () => {
    if (joined) showToast('Reconectando…');
  });
  socket.io.on('reconnect', () => {
    if (myName) doJoin();
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
          renderListenAnswer(view);
          showScreen('screen-listen-answer');
        }
        break;
      case 'guess':
        if (view.you.isGuesser) {
          renderGuessScreen(view);
          showScreen('screen-guess');
        } else {
          renderWaitGuess(view);
          showScreen('screen-wait-guess');
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

  function initials(name) {
    return (name || '?').trim().slice(0, 2).toUpperCase();
  }

  // ---------------- lobby ----------------
  function renderLobby(view) {
    const grid = $('#lobby-players');
    grid.innerHTML = '';
    view.players.forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.style.animationDelay = i * 0.05 + 's';
      chip.innerHTML = `
        <div class="player-avatar${p.connected ? '' : ' disconnected'}" style="background:${p.color}">${initials(p.name)}</div>
        <div class="player-name">${escapeHtml(p.name)}</div>
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
      el.innerHTML = `<span class="cat-icon">${c.icon}</span><span>${c.label}</span>`;
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

  // ---------------- ouvir / responder ----------------
  function catChipHtml(cat) {
    if (!cat) return '';
    return `<span class="cat-icon">${cat.icon}</span><span>${cat.label}</span>`;
  }

  function renderListenAnswer(view) {
    $('#listen-cat-chip').innerHTML = catChipHtml(view.category);
    $('#listen-question').textContent = view.officialQuestionText || '';
  }

  function renderGuesserListen(view) {
    $('#guesser-cat-chip').innerHTML = catChipHtml(view.category);
  }
  $('#btn-ready').addEventListener('click', () => {
    vib(20);
    socket.emit('guesser_ready');
  });

  function renderWaitGuess(view) {
    $('#waitguess-cat-chip').innerHTML = catChipHtml(view.category);
    $('#waitguess-name').textContent = `${view.guesserName} está ordenando`;
  }

  // ---------------- régua de adivinhação ----------------
  let slots = [null, null, null, null, null];
  let selectedChipId = null;
  let currentOptions = [];
  let lastGuessRoundKey = null;

  function renderGuessScreen(view) {
    const roundKey = view.round + '-' + (view.category && view.category.id);
    if (roundKey !== lastGuessRoundKey) {
      slots = [null, null, null, null, null];
      selectedChipId = null;
      currentOptions = view.options || [];
      lastGuessRoundKey = roundKey;
    }
    drawChipsAndRuler();
  }

  function optionText(id) {
    const o = currentOptions.find((x) => x.id === id);
    return o ? o.text : '';
  }

  function drawChipsAndRuler() {
    const pool = $('#chips-pool');
    pool.innerHTML = '';
    currentOptions.forEach((o) => {
      const placed = slots.includes(o.id);
      const chip = document.createElement('button');
      chip.className = 'chip' + (placed ? ' placed' : '') + (selectedChipId === o.id ? ' selected' : '');
      chip.textContent = o.text;
      chip.addEventListener('click', () => onChipTap(o.id));
      pool.appendChild(chip);
    });

    const ruler = $('#ruler');
    ruler.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      const filled = !!slots[i];
      row.className = 'ruler-slot' + (filled ? ' filled' : '') + (selectedChipId && !filled ? ' active-target' : '');
      row.innerHTML = `<span class="ruler-slot-num">${i}</span><span class="ruler-slot-content">${filled ? optionText(slots[i]) : '&nbsp;'}</span>`;
      row.addEventListener('click', () => onSlotTap(i));
      ruler.appendChild(row);
    }

    $('#btn-confirm-order').disabled = slots.some((s) => !s);
  }

  function onChipTap(id) {
    const slotIdx = slots.indexOf(id);
    if (slotIdx !== -1) {
      slots[slotIdx] = null;
      selectedChipId = null;
      vib(10);
    } else {
      selectedChipId = selectedChipId === id ? null : id;
      vib(8);
    }
    drawChipsAndRuler();
  }

  function onSlotTap(i) {
    if (selectedChipId) {
      const prevIdx = slots.indexOf(selectedChipId);
      if (prevIdx !== -1) slots[prevIdx] = null;
      slots[i] = selectedChipId;
      selectedChipId = null;
      vib(15);
    } else if (slots[i]) {
      slots[i] = null;
      vib(10);
    }
    drawChipsAndRuler();
  }

  $('#btn-confirm-order').addEventListener('click', () => {
    if (slots.some((s) => !s)) return;
    vib([15, 40, 15]);
    socket.emit('submit_order', slots.slice());
  });

  // ---------------- revelação ----------------
  function renderReveal(view) {
    const r = view.lastResult;
    if (!r) return;
    const guesserName = (view.players.find((p) => p.token === r.guesserToken) || {}).name || 'Palpiteiro';
    $('#reveal-points').innerHTML = `<span class="pts-num">+${r.points}</span><span class="pts-label">${escapeHtml(guesserName)} marcou ${r.points} ${r.points === 1 ? 'ponto' : 'pontos'}</span>`;

    const ruler = $('#ruler-reveal');
    ruler.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const qid = r.order[i];
      const opt = r.options.find((o) => o.id === qid);
      const isOfficial = qid === r.officialId;
      const row = document.createElement('div');
      row.className = 'ruler-slot filled' + (isOfficial ? ' official' : '');
      row.innerHTML = `<span class="ruler-slot-num">${i}</span><span class="ruler-slot-content">${isOfficial ? '⭐ ' : ''}${opt ? escapeHtml(opt.text) : ''}</span>`;
      ruler.appendChild(row);
    }
    vib(isRevealFresh(view) ? [10, 30, 10, 30, 20] : 0);
  }
  let lastRevealKey = null;
  function isRevealFresh(view) {
    const key = view.round + '-reveal';
    const fresh = key !== lastRevealKey;
    lastRevealKey = key;
    return fresh;
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // se já tem nome salvo, tenta entrar direto
  if (myName) {
    showScreen('screen-lobby');
  }
})();
