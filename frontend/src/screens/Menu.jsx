import React, { useState } from 'react';
import Popup from '../components/Popup.jsx';
import { getPreferences, savePreferences, getAvatarColor, saveAvatarColor } from '../socket.js';

const ACCENTS = [
  { key: 'amber', color: '#f5a623', label: 'Âmbar' },
  { key: 'coral', color: '#ff5d8f', label: 'Coral' },
  { key: 'mint', color: '#4cd9c0', label: 'Menta' },
  { key: 'blue', color: '#7dc2ff', label: 'Azul' },
  { key: 'violet', color: '#c792ea', label: 'Violeta' },
];

export default function Menu({ name, setName, onPlay, error, busy, onPreferencesChange }) {
  const [showProfile, setShowProfile] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [prefs, setPrefs] = useState(getPreferences);
  const [avatarColor, setAvatarColor] = useState(getAvatarColor);

  const trimmedName = name.trim();
  const canPlay = trimmedName.length >= 2;

  function updatePref(key, value) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePreferences(next);
    onPreferencesChange?.(next);
  }

  function pickAvatar(color) {
    setAvatarColor(color);
    saveAvatarColor(color);
  }

  return (
    <div className="screen">
      <div style={{ marginTop: 4, marginBottom: 22 }}>
        <p className="eyebrow">jogo de dedução em grupo</p>
        <h1 className="title-hero">
          Pergunta <span className="accent">Boba</span>
        </h1>
        <p className="subtitle">
          Uma categoria é escolhida, todo mundo responde em voz alta e o palpiteiro tenta
          adivinhar qual era a pergunta oficial. É só digitar seu nome e apertar em Jogar — todo
          mundo cai na mesma sala automaticamente.
        </p>
      </div>

      <div className="card stack">
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
        {!canPlay && <p className="field-hint">Digite pelo menos 2 letras para continuar.</p>}
      </div>

      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}

      <div className="menu-grid">
        <button
          className="menu-tile menu-tile-primary"
          disabled={!canPlay || busy}
          onClick={() => onPlay(trimmedName)}
        >
          <span className="menu-tile-icon">🎮</span>
          <span className="menu-tile-label">{busy ? 'Entrando...' : 'Jogar'}</span>
          <span className="menu-tile-desc">Entrar na sala e esperar a galera</span>
        </button>

        <button className="menu-tile" onClick={() => setShowProfile(true)}>
          <span className="menu-tile-icon">🧑‍🎤</span>
          <span className="menu-tile-label">Perfil</span>
          <span className="menu-tile-desc">Nome e cor do avatar</span>
        </button>

        <button className="menu-tile" onClick={() => setShowPresets(true)}>
          <span className="menu-tile-icon">⚙️</span>
          <span className="menu-tile-label">Predefinições</span>
          <span className="menu-tile-desc">Movimento, vibração e tema</span>
        </button>
      </div>

      <Popup open={showProfile} onClose={() => setShowProfile(false)} title="Seu perfil">
        <label className="field-label" htmlFor="profile-name">
          Nome
        </label>
        <input
          id="profile-name"
          className="field"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="field-label" style={{ marginTop: 16 }}>
          Cor do avatar
        </label>
        <div className="avatar-swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              className={`avatar-swatch ${avatarColor === a.color ? 'picked' : ''}`}
              style={{ background: a.color }}
              onClick={() => pickAvatar(a.color)}
              aria-label={a.label}
              title={a.label}
            />
          ))}
        </div>
      </Popup>

      <Popup open={showPresets} onClose={() => setShowPresets(false)} title="Predefinições">
        <label className="preset-row">
          <span>
            Reduzir animações
            <small>Desliga a maior parte dos movimentos da interface</small>
          </span>
          <input
            type="checkbox"
            checked={!!prefs.reduceMotion}
            onChange={(e) => updatePref('reduceMotion', e.target.checked)}
          />
        </label>
        <label className="preset-row">
          <span>
            Vibrar ao jogar
            <small>Um toque leve em ações importantes</small>
          </span>
          <input
            type="checkbox"
            checked={!!prefs.haptics}
            onChange={(e) => updatePref('haptics', e.target.checked)}
          />
        </label>
        <span className="field-label" style={{ marginTop: 16 }}>
          Cor de destaque
        </span>
        <div className="avatar-swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              className={`avatar-swatch ${prefs.accent === a.key ? 'picked' : ''}`}
              style={{ background: a.color }}
              onClick={() => updatePref('accent', a.key)}
              aria-label={a.label}
              title={a.label}
            />
          ))}
        </div>
      </Popup>
    </div>
  );
}
