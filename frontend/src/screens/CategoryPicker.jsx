import React, { useState } from 'react';
import { vibrate } from '../haptics.js';

const CATEGORY_META = {
  objetos: { label: 'Objetos', emoji: '🎒' },
  famosos: { label: 'Famosos', emoji: '🌟' },
  numeros: { label: 'Números', emoji: '🔢' },
  jogadores: { label: 'Jogadores', emoji: '🎭' },
  comidas: { label: 'Comidas', emoji: '🍕' },
};

export default function CategoryPicker({ round, onChoose }) {
  const [picked, setPicked] = useState(null);

  function handlePick(cat) {
    if (picked) return;
    vibrate(12);
    setPicked(cat);
    onChoose(cat);
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <span className="round-pill">
          Rodada {round.roundNumber} de {round.totalRounds}
        </span>
        <span className="role-badge guesser">Você é o palpiteiro</span>
      </div>

      <h2 style={{ fontSize: 24 }}>Escolha uma categoria</h2>
      <p className="subtitle">
        Os outros jogadores vão receber uma pergunta dessa categoria e responder em voz alta — só
        você não vai saber qual é.
      </p>

      <div className="category-grid" style={{ marginTop: 22 }}>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            className={`category-btn ${key} ${picked === key ? 'picked' : ''}`}
            disabled={!!picked}
            onClick={() => handlePick(key)}
          >
            <span className="emoji">{meta.emoji}</span>
            {meta.label}
          </button>
        ))}
      </div>

      {picked && (
        <div className="center-col" style={{ marginTop: 26 }}>
          <div className="waiting-pulse" />
          <p className="subtitle">Preparando as perguntas...</p>
        </div>
      )}
    </div>
  );
}
