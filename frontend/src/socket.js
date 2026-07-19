import { io } from 'socket.io-client';

// URL do backend, fixa direto no código.
const BACKEND_URL = 'https://back-perguntas-bobas-tfnc.onrender.com';

// Log de diagnóstico — se isso não aparecer no console, o navegador está
// rodando um bundle antigo (cache/deploy). Se aparecer, o problema está na
// conexão em si (veja os logs de connect/connect_error logo abaixo).
console.log('[socket.js] módulo carregado — BACKEND_URL =', BACKEND_URL);

export const socket = io(BACKEND_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('[socket] conectado ao backend:', BACKEND_URL, '— id:', socket.id);
});
socket.on('connect_error', (err) => {
  console.error('[socket] falha ao conectar em', BACKEND_URL, '—', err.message);
});
socket.on('disconnect', (reason) => {
  console.warn('[socket] desconectado:', reason);
});

export function getOrCreatePlayerId() {
  const key = 'dq_player_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

export function saveSession({ code, name }) {
  if (code) localStorage.setItem('dq_room_code', code);
  if (name) localStorage.setItem('dq_name', name);
}

export function getSavedSession() {
  return {
    code: localStorage.getItem('dq_room_code') || '',
    name: localStorage.getItem('dq_name') || '',
  };
}

export function clearSession() {
  localStorage.removeItem('dq_room_code');
}

// ---------- Perfil (nome + cor do avatar) ----------

export function getAvatarColor() {
  return localStorage.getItem('dq_avatar_color') || '#f5a623';
}

export function saveAvatarColor(color) {
  localStorage.setItem('dq_avatar_color', color);
}

// ---------- Predefinições (movimento, vibração, tema) ----------

const DEFAULT_PREFERENCES = {
  reduceMotion: false,
  haptics: true,
  accent: 'amber',
};

export function getPreferences() {
  try {
    const raw = localStorage.getItem('dq_preferences');
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs) {
  localStorage.setItem('dq_preferences', JSON.stringify(prefs));
}
