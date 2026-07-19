const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const {
  CATEGORIES,
  getOrCreateRoom,
  getRoom,
  questionById,
  GLOBAL_ROOM_CODE,
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

// Sala única e global: não existe mais código de sala pra criar/entrar.
// Todo mundo que abre o app cai automaticamente nesta mesma sala.
const room = getOrCreateRoom(GLOBAL_ROOM_CODE);

function scoreboard(r) {
  return [...r.players.values()]
    .map((p) => ({ id: p.id, name: p.name, score: p.score, connected: p.connected }))
    .sort((a, b) => b.score - a.score);
}

function roomSummary(r) {
  return {
    status: r.status,
    players: r.playerList(),
  };
}

function sendRoundToEveryone(r) {
  const round = r.currentRound;
  const guesser = r.players.get(round.guesserId);
  io.to(GLOBAL_ROOM_CODE).emit('round_started', {
    guesserId: round.guesserId,
    guesserName: guesser ? guesser.name : '???',
    roundNumber: r.roundIndex + 1,
    totalRounds: r.totalRounds(),
  });
}

io.on('connection', (socket) => {
  // Entra na sala global. Se o jogador já existia (ex: reload de página), só
  // reconecta o socket dele em vez de duplicar.
  socket.on('enter_lobby', ({ name, playerId }, cb) => {
    try {
      if (room.players.has(playerId)) {
        const player = room.players.get(playerId);
        player.connected = true;
        player.socketId = socket.id;
        player.name = (name || player.name).slice(0, 20);
      } else {
        if (room.status !== 'lobby') {
          return cb({
            ok: false,
            error: 'Uma partida já está em andamento. Espere terminar ou peça pra alguém resetar o servidor.',
          });
        }
        if (room.players.size >= MAX_PLAYERS) {
          return cb({ ok: false, error: `Sala cheia (máximo de ${MAX_PLAYERS} jogadores).` });
        }
        room.addPlayer(playerId, (name || 'Jogador').slice(0, 20), socket.id);
      }
      socket.join(GLOBAL_ROOM_CODE);
      socket.data.playerId = playerId;
      cb({ ok: true, status: room.status });
      io.to(GLOBAL_ROOM_CODE).emit('room_update', roomSummary(room));
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on('rejoin_room', ({ playerId }, cb) => {
    if (!room.players.has(playerId)) {
      return cb({ ok: false });
    }
    const player = room.players.get(playerId);
    player.connected = true;
    player.socketId = socket.id;
    socket.join(GLOBAL_ROOM_CODE);
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
    io.to(GLOBAL_ROOM_CODE).emit('room_update', roomSummary(room));
  });

  // Botão global de reset: qualquer jogador pode zerar a sala (remove todo
  // mundo, apaga a partida atual e libera espaço pra uma nova).
  socket.on('reset_server', (_payload, cb) => {
    room.reset();
    io.to(GLOBAL_ROOM_CODE).emit('server_reset');
    io.to(GLOBAL_ROOM_CODE).emit('room_update', roomSummary(room));
    cb && cb({ ok: true });
  });

  socket.on('start_game', (_payload, cb) => {
    if (room.players.size < MIN_PLAYERS) {
      return cb && cb({ ok: false, error: `Mínimo de ${MIN_PLAYERS} jogadores para começar.` });
    }
    room.startGame();
    io.to(GLOBAL_ROOM_CODE).emit('game_started', { totalRounds: room.totalRounds() });
    sendRoundToEveryone(room);
    cb && cb({ ok: true });
  });

  socket.on('choose_category', ({ category }, cb) => {
    if (!room.currentRound) return cb && cb({ ok: false, error: 'Rodada inválida.' });
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
    io.to(GLOBAL_ROOM_CODE).emit('category_chosen', { category });

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

  socket.on('submit_arrangement', ({ arrangement }, cb) => {
    if (!room.currentRound) return cb && cb({ ok: false, error: 'Rodada inválida.' });
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
    io.to(GLOBAL_ROOM_CODE).emit('round_result', buildRoundResultPayload(room));
    cb && cb({ ok: true });
  });

  socket.on('next_round', (_payload, cb) => {
    if (room.status !== 'round_result') return cb && cb({ ok: false });
    room.advanceRound();
    if (room.status === 'finished') {
      io.to(GLOBAL_ROOM_CODE).emit('game_over', { players: scoreboard(room) });
    } else {
      sendRoundToEveryone(room);
    }
    cb && cb({ ok: true });
  });

  socket.on('disconnect', () => {
    const { playerId } = socket.data;
    if (!playerId) return;
    const player = room.players.get(playerId);
    if (player) {
      player.connected = false;
      io.to(GLOBAL_ROOM_CODE).emit('room_update', roomSummary(room));
    }
  });
});

function buildRoundResultPayload(r) {
  const round = r.currentRound;
  const guesser = r.players.get(round.guesserId);
  const isLastRound = r.roundIndex + 1 >= r.totalRounds();
  let nextGuesserName = null;
  if (!isLastRound) {
    const nextGuesser = r.players.get(r.order[r.roundIndex + 1]);
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
    players: scoreboard(r),
    roundNumber: r.roundIndex + 1,
    totalRounds: r.totalRounds(),
    isLastRound,
    nextGuesserName,
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Sala global: ${GLOBAL_ROOM_CODE}`);
  console.log(`Categorias carregadas: ${CATEGORIES.join(', ')}`);
});
