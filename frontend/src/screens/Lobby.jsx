import React from 'react';
import { getAvatarColor } from '../socket.js';

const DOT_COLORS = ['#f5a623', '#ff5d8f', '#4cd9c0', '#7dc2ff', '#ffb15e', '#c792ea'];

export default function Lobby({ players, onStart, onLeave, error, myId }) {
  const minPlayers = 3;
  const canStart = players.length >= minPlayers;
  const missing = Math.max(0, minPlayers - players.length);

  return (
    <div className="screen">
      <p className="eyebrow">sala global</p>
      <h2 style={{ fontSize: 26, marginTop: 6 }}>Chama a turma</h2>
      <p className="subtitle">
        Todo mundo que abrir o app cai automaticamente aqui — não precisa de código. Espere a
        galera entrar pelo próprio celular.
      </p>

      <div className="stack" style={{ marginTop: 22 }}>
        <div className="row-between">
          <span className="field-label" style={{ margin: 0 }}>
            Jogadores ({players.length})
          </span>
          {!canStart && (
            <span className="pill-hint">
              faltam {missing} para começar
            </span>
          )}
        </div>
        {players.map((p, i) => (
          <div className="player-pill" key={p.id}>
            <div
              className="avatar-dot"
              style={{ background: p.id === myId ? getAvatarColor() : DOT_COLORS[i % DOT_COLORS.length] }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 700 }}>
              {p.name}
              {p.id === myId ? ' (você)' : ''}
            </span>
            <div className={`presence-dot ${p.connected ? '' : 'offline'}`} />
          </div>
        ))}
        {players.length === 0 && (
          <p className="subtitle">Ninguém entrou ainda. Compartilhe o link do jogo com a galera!</p>
        )}
      </div>

      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}

      <div className="stack btn-fixed-bottom">
        <button
          className="btn btn-primary btn-block"
          disabled={!canStart}
          onClick={onStart}
        >
          {canStart ? 'Começar partida' : 'Esperando mais jogadores...'}
        </button>
        <button className="link-btn" onClick={onLeave}>
          Voltar ao menu
        </button>
      </div>
    </div>
  );
}
