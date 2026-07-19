import React from 'react';

export default function WaitingScreen({ title, subtitle, round }) {
  return (
    <div className="screen">
      <div className="top-bar">
        <span className="round-pill">
          Rodada {round.roundNumber} de {round.totalRounds}
        </span>
        <span className="role-badge answerer">Você responde</span>
      </div>

      <div className="center-col" style={{ marginTop: 60 }}>
        <div className="waiting-pulse" />
        <h2 style={{ fontSize: 22 }}>{title}</h2>
        <p className="subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
