const fs = require('fs');
const path = require('path');

const questionBank = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'questions.json'), 'utf-8')
);

const CATEGORIES = Object.keys(questionBank); // objetos, numeros, famosos, jogadores, comidas

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function questionById(id) {
  const [cat, idx] = id.split('#');
  return questionBank[cat][Number(idx)];
}

/** @type {Map<string, Room>} */
const rooms = new Map();

class Room {
  constructor(code) {
    this.code = code;
    this.players = new Map(); // id -> {id, name, score, connected, socketId}
    this.order = [];
    this.roundIndex = -1;
    this.status = 'lobby'; // lobby | playing | round_result | finished
    this.usedQuestionIds = new Set();
    this.currentRound = null;
    this.createdAt = Date.now();
  }

  playerList() {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
    }));
  }

  addPlayer(id, name, socketId) {
    this.players.set(id, { id, name, score: 0, connected: true, socketId });
  }

  currentGuesserId() {
    return this.order[this.roundIndex];
  }

  totalRounds() {
    return this.order.length;
  }

  // Pick `count` unused random questions from a category, marking them used.
  drawQuestions(category, count) {
    const pool = questionBank[category]
      .map((text, idx) => `${category}#${idx}`)
      .filter((id) => !this.usedQuestionIds.has(id));
    if (pool.length < count) {
      throw new Error('Perguntas insuficientes nessa categoria para esta partida.');
    }
    const picked = shuffle(pool).slice(0, count);
    picked.forEach((id) => this.usedQuestionIds.add(id));
    return picked.map((id) => ({ id, text: questionById(id) }));
  }

  startGame() {
    this.order = shuffle([...this.players.keys()]);
    this.roundIndex = 0;
    this.status = 'playing';
    this.currentRound = {
      guesserId: this.currentGuesserId(),
      category: null,
      officialQuestionId: null,
      scaleQuestions: null,
      revealed: false,
    };
  }

  chooseCategory(category) {
    if (!CATEGORIES.includes(category)) throw new Error('Categoria inválida.');
    const drawn = this.drawQuestions(category, 5);
    const officialQuestion = drawn[0];
    const scaleQuestions = shuffle(drawn);
    this.currentRound.category = category;
    this.currentRound.officialQuestionId = officialQuestion.id;
    this.currentRound.scaleQuestions = scaleQuestions;
  }

  submitArrangement(arrangementIds) {
    const official = this.currentRound.officialQuestionId;
    const points = arrangementIds.indexOf(official);
    if (points < 0) throw new Error('Arranjo inválido.');
    const guesser = this.players.get(this.currentRound.guesserId);
    guesser.score += points;
    this.currentRound.arrangement = arrangementIds;
    this.currentRound.pointsEarned = points;
    this.currentRound.revealed = true;
    this.status = 'round_result';
    return points;
  }

  advanceRound() {
    this.roundIndex += 1;
    if (this.roundIndex >= this.totalRounds()) {
      this.status = 'finished';
      this.currentRound = null;
      return;
    }
    this.status = 'playing';
    this.currentRound = {
      guesserId: this.currentGuesserId(),
      category: null,
      officialQuestionId: null,
      scaleQuestions: null,
      revealed: false,
    };
  }

  toPublicRoundState() {
    if (!this.currentRound) return null;
    return {
      guesserId: this.currentRound.guesserId,
      category: this.currentRound.category,
      revealed: this.currentRound.revealed,
    };
  }

  // Zera a sala por completo: remove jogadores, placar e a partida em andamento.
  // Usado pelo botão global de reset do servidor.
  reset() {
    this.players = new Map();
    this.order = [];
    this.roundIndex = -1;
    this.status = 'lobby';
    this.usedQuestionIds = new Set();
    this.currentRound = null;
  }
}

// Sala global única do servidor — todo mundo que entra no app cai nela.
const GLOBAL_ROOM_CODE = 'GLOBAL';

function getOrCreateRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Room(code));
  return rooms.get(code);
}

function getRoom(code) {
  return rooms.get(code);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

module.exports = {
  CATEGORIES,
  rooms,
  Room,
  getOrCreateRoom,
  getRoom,
  generateRoomCode,
  questionById,
  GLOBAL_ROOM_CODE,
};
