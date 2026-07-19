const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const {
  CATEGORIES,
  getOrCreateRoom,
  getRoom,
  generateRoomCode,
  questionById,
} = require('./gameLogic');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'dumb-questions-backend' });
});

app.get('/health', (req, res) => res.send('ok'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;

function scoreboard(room) {
  return [...room.players.values()]
    .map((p) => ({ id: p.id, name: p.name, score: p.score, connected: p.connected }))
    .sort((a, b) => b.score - a.score);
}

function roomSummary(room) {
  return {
    code: room.code,
    status: room.status,
    players: room.playerList(),
  };
}

function sendRoundToEveryone(room) {
  const round = room.currentRound;
  const guesser = room.players.get(round.guesserId);
  io.to(room.code).emit('round_started', {
    guesserId: round.guesserId,
    guesserName: guesser ? guesser.name : '???',
    roundNumber: room.roundIndex + 1,
    totalRounds: room.totalRounds(),
  });
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ name, playerId }, cb) => {
    try {
      const code = generateRoomCode();
      const room = getOrCreateRoom(code);
      room.addPlayer(playerId, (name || 'Jogador').slice(0, 20), socket.id);
      socket.join(code);
      socket.data.roomCode = code;
      socket.data.playerId = playerId;
      cb({ ok: true, code, playerId });
      io.to(code).emit('room_update', roomSummary(room));
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('join_room', ({ code, name, playerId }, cb) => {
    try {
      const roomCode = (code || '').toUpperCase().trim();
      const room = getRoom(roomCode);
      if (!room) return cb({ ok: false, error: 'Sala não encontrada. Confira o código.' });
      if (room.status !== 'lobby') {
        return cb({ ok: false, error: 'Essa partida já começou. Peça um novo código.' });
      }
      if (room.players.size >= MAX_PLAYERS) {
        return cb({ ok: false, error: 'Sala cheia.' });
      }
      room.addPlayer(playerId, (name || 'Jogador').slice(0, 20), socket.id);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerId = playerId;
      cb({ ok: true, code: roomCode, playerId });
      io.to(roomCode).emit('room_update', roomSummary(room));
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('rejoin_room', ({ code, playerId }, cb) => {
    const roomCode = (code || '').toUpperCase().trim();
    const room = getRoom(roomCode);
    if (!room || !room.players.has(playerId)) {
      return cb({ ok: false });
    }
    const player = room.players.get(playerId);
    player.connected = true;
    player.socketId = socket.id;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;

    const payload = { ok: true, room: roomSummary(room), status: room.status };
    if (room.status === 'playing' && room.currentRound) {
      payload.round = {
        guesserId: room.currentRound.guesserId,
        category: room.currentRound.category,
        roundNumber: room.roundIndex + 1,
        totalRounds: room.totalRounds(),
      };
      const isGuesser = playerId === room.currentRound.guesserId;
      if (isGuesser && room.currentRound.scaleQuestions) {
        payload.guesserQuestions = room.currentRound.scaleQuestions;
      } else if (!isGuesser && room.currentRound.category) {
        payload.playerQuestion = {
          category: room.currentRound.category,
          text: questionById(room.currentRound.officialQuestionId),
        };
      }
    } else if (room.status === 'round_result' && room.currentRound) {
      payload.roundResult = buildRoundResultPayload(room);
    } else if (room.status === 'finished') {
      payload.finalScoreboard = scoreboard(room);
    }
    cb(payload);
    io.to(roomCode).emit('room_update', roomSummary(room));
  });

  socket.on('start_game', ({ code }, cb) => {
    const room = getRoom(code);
    if (!room) return cb && cb({ ok: false, error: 'Sala não encontrada.' });
    if (room.players.size < MIN_PLAYERS) {
      return cb && cb({ ok: false, error: `Mínimo de ${MIN_PLAYERS} jogadores para começar.` });
    }
    room.startGame();
    io.to(code).emit('game_started', { totalRounds: room.totalRounds() });
    sendRoundToEveryone(room);
    cb && cb({ ok: true });
  });

  socket.on('choose_category', ({ code, category }, cb) => {
    const room = getRoom(code);
    if (!room || !room.currentRound) return cb && cb({ ok: false, error: 'Rodada inválida.' });
    if (socket.data.playerId !== room.currentRound.guesserId) {
      return cb && cb({ ok: false, error: 'Só o palpiteiro escolhe a categoria.' });
    }
    if (room.currentRound.category) {
      return cb && cb({ ok: false, error: 'Categoria já escolhida.' });
    }
    try {
      room.chooseCategory(category);
    } catch (err) {
      return cb && cb({ ok: false, error: err.message });
    }
    io.to(code).emit('category_chosen', { category });

    const guesser = room.players.get(room.currentRound.guesserId);
    if (guesser && guesser.socketId) {
      io.to(guesser.socketId).emit('guesser_questions', {
        category,
        questions: room.currentRound.scaleQuestions,
      });
    }
    const officialText = questionById(room.currentRound.officialQuestionId);
    for (const p of room.players.values()) {
      if (p.id !== room.currentRound.guesserId && p.socketId) {
        io.to(p.socketId).emit('player_question', { category, text: officialText });
      }
    }
    cb && cb({ ok: true });
  });

  socket.on('submit_arrangement', ({ code, arrangement }, cb) => {
    const room = getRoom(code);
    if (!room || !room.currentRound) return cb && cb({ ok: false, error: 'Rodada inválida.' });
    if (socket.data.playerId !== room.currentRound.guesserId) {
      return cb && cb({ ok: false, error: 'Só o palpiteiro pode enviar a resposta.' });
    }
    if (room.currentRound.revealed) {
      return cb && cb({ ok: false, error: 'Rodada já finalizada.' });
    }
    try {
      room.submitArrangement(arrangement);
    } catch (err) {
      return cb && cb({ ok: false, error: err.message });
    }
    io.to(code).emit('round_result', buildRoundResultPayload(room));
    cb && cb({ ok: true });
  });

  socket.on('next_round', ({ code }, cb) => {
    const room = getRoom(code);
    if (!room) return cb && cb({ ok: false });
    if (room.status !== 'round_result') return cb && cb({ ok: false });
    room.advanceRound();
    if (room.status === 'finished') {
      io.to(code).emit('game_over', { players: scoreboard(room) });
    } else {
      sendRoundToEveryone(room);
    }
    cb && cb({ ok: true });
  });

  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode) return;
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) {
      player.connected = false;
      io.to(roomCode).emit('room_update', roomSummary(room));
    }
  });
});

function buildRoundResultPayload(room) {
  const round = room.currentRound;
  const guesser = room.players.get(round.guesserId);
  const isLastRound = room.roundIndex + 1 >= room.totalRounds();
  let nextGuesserName = null;
  if (!isLastRound) {
    const nextGuesser = room.players.get(room.order[room.roundIndex + 1]);
    nextGuesserName = nextGuesser ? nextGuesser.name : null;
  }
  return {
    category: round.category,
    officialQuestionId: round.officialQuestionId,
    officialText: questionById(round.officialQuestionId),
    scaleQuestions: round.scaleQuestions,
    arrangement: round.arrangement,
    guesserId: round.guesserId,
    guesserName: guesser ? guesser.name : '???',
    pointsEarned: round.pointsEarned,
    players: scoreboard(room),
    roundNumber: room.roundIndex + 1,
    totalRounds: room.totalRounds(),
    isLastRound,
    nextGuesserName,
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Categorias carregadas: ${CATEGORIES.join(', ')}`);
});
