import { getPreferences } from './socket.js';

// Vibração curta e discreta, só dispara se o jogador ligou a predefinição
// e o navegador suporta a API.
export function vibrate(pattern = 15) {
  try {
    const prefs = getPreferences();
    if (prefs.haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // silencioso — vibração é só um detalhe, nunca deve quebrar o jogo
  }
}
