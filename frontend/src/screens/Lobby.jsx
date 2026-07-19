import React, { useState } from 'react';

const DOT_COLORS = ['#f5a623', '#ff5d8f', '#4cd9c0', '#7dc2ff', '#ffb15e', '#c792ea'];

export default function Lobby({ code, players, onStart, error, myId }) {
  const [copied, setCopied] = useState(false);
  const minPlayers = 3;
  const canStart = players.length >= minPlayers;

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="screen">
      <p className="eyebrow">sala de espera</p>
      <h2 style={{ fontSize: 26, marginTop: 6 }}>Chama a turma</h2>
      <p className="subtitle">Compartilhe o código para os amigos entrarem pelo próprio celular.</p>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="room-code-badge">{code}</div>
        <button className="btn btn-ghost btn-block" onClick={copyCode}>
          {copied ? 'Copiado!' : 'Copiar código'}
        </button>
      </div>

      <div className="stack" style={{ marginTop: 22 }}>
        <div className="row-between">
          <span className="field-label" style={{ margin: 0 }}>
            Jogadores ({players.length})
          </span>
          {!canStart && (
            <span style={{ fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 700 }}>
              mínimo {minPlayers}
            </span>
          )}
        </div>
        {players.map((p, i) => (
          <div className="player-pill" key={p.id}>
            <div className="avatar-dot" style={{ background: DOT_COLORS[i % DOT_COLORS.length] }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 700 }}>
              {p.name}
              {p.id === myId ? ' (você)' : ''}
            </span>
            <div className={`presence-dot ${p.connected ? '' : 'offline'}`} />
          </div>
        ))}
      </div>

      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}

      <button
        className="btn btn-primary btn-block btn-fixed-bottom"
        disabled={!canStart}
        onClick={onStart}
      >
        {canStart ? 'Começar partida' : `Esperando mais jogadores...`}
      </button>
    </div>
  );
}
