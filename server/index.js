const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const bank = require('./questions.json');

const PORT = process.env.PORT || 3001;
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;

const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ---------- estado em memória ----------
/** token -> player */
const players = new Map();

function freshRoom() {
  return {
    phase: 'lobby', // lobby | category | listen | guess | reveal | gameover
    order: [], // tokens na ordem em que serão palpiteiros nesta partida
    roundNumber: 0, // índice do palpiteiro atual dentro de order
    currentGuesserToken: null,
    currentCategory: null, // { id, label, icon }
    currentQuestion: null, // { id, text }
    usedQuestionIds: new Set(),
    shuffledOptions: null, // [{id,text}]
    lastResult: null,
  };
}

let room = freshRoom();

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function activePlayers() {
  return [...players.values()].filter((p) => p.connected);
}

function pickQuestion(categoryId) {
  let candidates = bank.questions.filter(
    (q) => q.category === categoryId && !room.usedQuestionIds.has(q.id)
  );
  if (candidates.length === 0) {
    // esgotou perguntas inéditas nessa categoria: libera de novo
    for (const q of bank.questions) {
      if (q.category === categoryId) room.usedQuestionIds.delete(q.id);
    }
    candidates = bank.questions.filter((q) => q.category === categoryId);
  }
  const official = candidates[Math.floor(Math.random() * candidates.length)];
  room.usedQuestionIds.add(official.id);

  let pool = bank.questions.filter(
    (q) => q.category === categoryId && q.id !== official.id
  );
  if (pool.length < 4) {
    // fallback raríssimo: completa com outras categorias
    const extra = bank.questions.filter(
      (q) => q.category !== categoryId && q.id !== official.id
    );
    pool = pool.concat(extra);
  }
  const distractors = shuffle(pool).slice(0, 4);
  const options = shuffle([official, ...distractors]).map((q) => ({
    id: q.id,
    text: q.text,
  }));
  return { official, options };
}

function currentGuesser() {
  return room.currentGuesserToken
    ? players.get(room.currentGuesserToken)
    : null;
}

function buildView(forToken) {
  const me = players.get(forToken);
  const isGuesser = forToken === room.currentGuesserToken;
  const guesser = currentGuesser();

  const publicPlayers = [...players.values()]
    .filter((p) => room.phase === 'lobby' || !p.spectator)
    .map((p) => ({
      token: p.token,
      name: p.name,
      color: p.color,
      score: p.score,
      connected: p.connected,
      isGuesser: p.token === room.currentGuesserToken,
      hasBeenGuesser: room.order.indexOf(p.token) >= 0 && room.order.indexOf(p.token) < room.roundNumber,
    }));

  const view = {
    phase: room.phase,
    players: publicPlayers,
    you: {
      token: me.token,
      name: me.name,
      color: me.color,
      isGuesser,
      spectator: !!me.spectator,
    },
    guesserName: guesser ? guesser.name : null,
    guesserColor: guesser ? guesser.color : null,
    round: room.order.length ? room.roundNumber + 1 : 0,
    totalRounds: room.order.length,
    categories: bank.categories,
    category: room.currentCategory,
  };

  if (room.phase === 'listen' || room.phase === 'guess') {
    if (!isGuesser && room.currentQuestion) {
      view.officialQuestionText = room.currentQuestion.text;
    }
  }

  if (room.phase === 'guess' && isGuesser) {
    view.options = room.shuffledOptions;
  }

  if (room.phase === 'reveal' && room.lastResult) {
    view.lastResult = room.lastResult;
  }

  if (room.phase === 'gameover') {
    view.finalRanking = [...players.values()]
      .filter((p) => room.order.includes(p.token))
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ token: p.token, name: p.name, color: p.color, score: p.score }));
  }

  return view;
}

function broadcastState() {
  for (const p of players.values()) {
    if (p.connected && p.socketId) {
      io.to(p.socketId).emit('state', buildView(p.token));
    }
  }
}

function startGame() {
  const eligible = activePlayers();
  room = freshRoom();
  room.order = shuffle(eligible.map((p) => p.token));
  for (const p of players.values()) {
    p.score = 0;
    p.spectator = !room.order.includes(p.token);
  }
  room.phase = 'category';
  room.currentGuesserToken = room.order[0];
}

function goToNextRound() {
  room.roundNumber += 1;
  room.currentCategory = null;
  room.currentQuestion = null;
  room.shuffledOptions = null;
  room.lastResult = null;
  if (room.roundNumber >= room.order.length) {
    room.phase = 'gameover';
    room.currentGuesserToken = null;
  } else {
    room.currentGuesserToken = room.order[room.roundNumber];
    room.phase = 'category';
  }
}

io.on('connection', (socket) => {
  socket.on('join', (payload, cb) => {
    const incomingToken = payload && payload.token;
    const name = (payload && payload.name || '').trim().slice(0, 18) || 'Jogador';
    const color = (payload && payload.color) || '#ff3d7f';

    let token = incomingToken && players.has(incomingToken) ? incomingToken : null;
    if (!token) token = crypto.randomUUID();

    let player = players.get(token);
    if (player) {
      player.connected = true;
      player.socketId = socket.id;
      player.name = name || player.name;
      player.color = color || player.color;
    } else {
      player = {
        token,
        name,
        color,
        score: 0,
        connected: true,
        socketId: socket.id,
        spectator: room.phase !== 'lobby',
      };
      players.set(token, player);
    }

    socket.data.token = token;
    if (typeof cb === 'function') cb({ token });
    broadcastState();
  });

  socket.on('start_game', () => {
    const token = socket.data.token;
    if (!token || !players.get(token)) return;
    if (room.phase !== 'lobby') return;
    const count = activePlayers().length;
    if (count < MIN_PLAYERS || count > MAX_PLAYERS) return;
    startGame();
    broadcastState();
  });

  socket.on('choose_category', (categoryId) => {
    const token = socket.data.token;
    if (token !== room.currentGuesserToken) return;
    if (room.phase !== 'category') return;
    const cat = bank.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const { official, options } = pickQuestion(categoryId);
    room.currentCategory = cat;
    room.currentQuestion = { id: official.id, text: official.text };
    room.shuffledOptions = options;
    room.phase = 'listen';
    broadcastState();
  });

  socket.on('guesser_ready', () => {
    const token = socket.data.token;
    if (token !== room.currentGuesserToken) return;
    if (room.phase !== 'listen') return;
    room.phase = 'guess';
    broadcastState();
  });

  socket.on('submit_order', (orderedIds) => {
    const token = socket.data.token;
    if (token !== room.currentGuesserToken) return;
    if (room.phase !== 'guess') return;
    if (!Array.isArray(orderedIds) || orderedIds.length !== 5) return;
    const validIds = new Set(room.shuffledOptions.map((o) => o.id));
    if (!orderedIds.every((id) => validIds.has(id))) return;

    const points = orderedIds.indexOf(room.currentQuestion.id);
    const guesser = players.get(token);
    guesser.score += Math.max(points, 0);

    room.lastResult = {
      order: orderedIds,
      officialId: room.currentQuestion.id,
      points,
      guesserToken: token,
      options: room.shuffledOptions,
    };
    room.phase = 'reveal';
    broadcastState();
  });

  socket.on('next_round', () => {
    const token = socket.data.token;
    if (!token || !players.get(token)) return;
    if (room.phase !== 'reveal') return;
    goToNextRound();
    broadcastState();
  });

  socket.on('reset_room', () => {
    room = freshRoom();
    players.clear();
    io.emit('force_rejoin');
  });

  socket.on('disconnect', () => {
    const token = socket.data.token;
    if (token && players.has(token)) {
      const p = players.get(token);
      if (p.socketId === socket.id) p.connected = false;
    }
    broadcastState();
  });
});

server.listen(PORT, () => {
  console.log(`Pergunta Boba rodando em http://localhost:${PORT}`);
});
