import React from 'react';

const CATEGORY_LABEL = {
  objetos: 'Objetos',
  famosos: 'Famosos',
  numeros: 'Números',
  jogadores: 'Jogadores',
  comidas: 'Comidas',
};

export default function PlayerQuestion({ round, data }) {
  return (
    <div className="screen">
      <div className="top-bar">
        <span className="round-pill">
          Rodada {round.roundNumber} de {round.totalRounds}
        </span>
        <span className="role-badge answerer">Você responde</span>
      </div>

      <p className="eyebrow" style={{ color: 'var(--coral)' }}>
        categoria: {CATEGORY_LABEL[data.category] || data.category}
      </p>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ fontSize: 24, lineHeight: 1.25 }}>{data.text}</h2>
      </div>

      <p className="subtitle" style={{ marginTop: 18 }}>
        Responda em voz alta, sem ler a pergunta —{' '}
        <strong style={{ color: 'var(--text)' }}>{round.guesserName}</strong> está só ouvindo as
        respostas, sem saber qual é a pergunta.
      </p>

      <div className="center-col" style={{ marginTop: 40 }}>
        <div className="waiting-pulse" />
        <p className="subtitle">
          Depois que todos responderem, {round.guesserName} vai tentar adivinhar essa pergunta.
        </p>
      </div>
    </div>
  );
}
