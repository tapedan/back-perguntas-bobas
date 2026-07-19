import React, { useState } from 'react';

export default function Join({ onCreate, onJoin, error }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [roomCode, setRoomCode] = useState('');

  const trimmedName = name.trim();
  const canProceed = trimmedName.length >= 2;

  return (
    <div className="screen">
      <div style={{ marginTop: 12, marginBottom: 28 }}>
        <p className="eyebrow">jogo de dedução em grupo</p>
        <h1 className="title-hero">
          Pergunta <span className="accent">Boba</span>
        </h1>
        <p className="subtitle">
          Alguém escolhe uma categoria, todo mundo responde em voz alta e o palpiteiro tenta
          adivinhar qual era a pergunta oficial. Cada celular, um jogador.
        </p>
      </div>

      <div className="card stack" style={{ marginTop: 'auto' }}>
        <label className="field-label" htmlFor="name-field">
          Seu nome
        </label>
        <input
          id="name-field"
          className="field"
          placeholder="Como te chamam no grupo?"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />

        {error && <div className="error-banner">{error}</div>}

        {mode !== 'join' && (
          <button
            className="btn btn-primary btn-block"
            disabled={!canProceed}
            onClick={() => onCreate(trimmedName)}
          >
            Criar uma sala
          </button>
        )}

        {mode === 'join' ? (
          <div className="stack">
            <label className="field-label" htmlFor="code-field">
              Código da sala
            </label>
            <input
              id="code-field"
              className="field code-field"
              placeholder="ABCD"
              maxLength={4}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button
              className="btn btn-secondary btn-block"
              disabled={!canProceed || roomCode.trim().length < 4}
              onClick={() => onJoin(trimmedName, roomCode.trim())}
            >
              Entrar na sala
            </button>
            <button className="link-btn" onClick={() => setMode(null)}>
              Voltar
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-block" disabled={!canProceed} onClick={() => setMode('join')}>
            Já tenho um código
          </button>
        )}
      </div>
    </div>
  );
}
