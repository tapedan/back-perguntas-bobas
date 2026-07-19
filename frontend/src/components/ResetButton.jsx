import React, { useState } from 'react';
import Popup from './Popup.jsx';
import { socket } from '../socket.js';
import { vibrate } from '../haptics.js';

// Botão global: qualquer jogador, em qualquer tela, pode resetar o servidor.
// Fica sempre visível, mas exige confirmação pra evitar toque acidental.
export default function ResetButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function confirmReset() {
    setBusy(true);
    vibrate(25);
    socket.emit('reset_server', {}, () => {
      setBusy(false);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        className="reset-fab"
        onClick={() => setOpen(true)}
        aria-label="Resetar servidor"
        title="Resetar servidor"
      >
        <span className="reset-fab-icon">⟳</span>
      </button>

      <Popup
        open={open}
        onClose={() => setOpen(false)}
        title="Resetar o servidor?"
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={confirmReset}>
              {busy ? 'Resetando...' : 'Sim, resetar tudo'}
            </button>
          </>
        }
      >
        <p className="subtitle" style={{ marginTop: 0 }}>
          Isso encerra a partida atual pra todo mundo, zera o placar e libera a sala pra uma nova
          partida começar do zero. Use se o jogo travou ou se a galera já terminou de jogar.
        </p>
      </Popup>
    </>
  );
}
