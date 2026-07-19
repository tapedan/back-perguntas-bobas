import React from 'react';

const DOT_COLORS = ['#f5a623', '#ff5d8f', '#4cd9c0', '#7dc2ff', '#ffb15e', '#c792ea'];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function GameOver({ players, myId, onPlayAgain }) {
  const winner = players[0];

  return (
    <div className="screen">
      <div className="center-col" style={{ marginTop: 12 }}>
        <p className="eyebrow">fim de jogo</p>
        <h1 className="title-hero" style={{ fontSize: 32 }}>
          {winner?.name} venceu! 🎉
        </h1>
      </div>

      <div className="stack" style={{ marginTop: 26 }}>
        {players.map((p, i) => (
          <div className={`score-row ${i === 0 ? 'rank-1' : ''}`} key={p.id}>
            <span className="score-rank">{MEDALS[i] || `${i + 1}º`}</span>
            <div className="avatar-dot" style={{ background: DOT_COLORS[i % DOT_COLORS.length] }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 700 }}>
              {p.name}
              {p.id === myId ? ' (você)' : ''}
            </span>
            <span className="score-points">{p.score}</span>
          </div>
        ))}
      </div>

      <button className="btn btn-primary btn-block btn-fixed-bottom" onClick={onPlayAgain}>
        Jogar de novo
      </button>
    </div>
  );
}
