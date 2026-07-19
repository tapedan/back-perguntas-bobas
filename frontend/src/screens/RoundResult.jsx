import React from 'react';

const DOT_COLORS = ['#f5a623', '#ff5d8f', '#4cd9c0', '#7dc2ff', '#ffb15e', '#c792ea'];

export default function RoundResult({ data, myId, onNext }) {
  const {
    officialQuestionId,
    officialText,
    arrangement,
    guesserName,
    pointsEarned,
    players,
    roundNumber,
    totalRounds,
    isLastRound,
    nextGuesserName,
  } = data;

  const orderedIds = arrangement || [];

  return (
    <div className="screen">
      <div className="top-bar">
        <span className="round-pill">
          Rodada {roundNumber} de {totalRounds}
        </span>
      </div>

      <div className="center-col">
        <p className="subtitle" style={{ marginTop: 0 }}>
          {guesserName} colocou a pergunta oficial na posição...
        </p>
        <div className="points-earned-badge">{pointsEarned}</div>
        <p className="subtitle">
          +{pointsEarned} {pointsEarned === 1 ? 'ponto' : 'pontos'} para {guesserName}
        </p>
      </div>

      <div className="ruler" style={{ marginTop: 20 }}>
        {orderedIds.map((id, i) => {
          const q = data.scaleQuestions.find((sq) => sq.id === id);
          const isOfficial = id === officialQuestionId;
          return (
            <div key={id} className={`ruler-slot ${isOfficial ? 'revealed-official' : ''}`}>
              <div className="ruler-index">{i}</div>
              <div className="ruler-text">
                {q ? q.text : officialText}
                {isOfficial && (
                  <span style={{ display: 'block', marginTop: 4, fontSize: 11.5, fontWeight: 800, color: 'var(--amber)' }}>
                    ★ ESSA ERA A OFICIAL
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <hr className="divider" style={{ marginTop: 22 }} />

      <div className="stack" style={{ marginTop: 4 }}>
        <span className="field-label" style={{ margin: 0 }}>
          Placar
        </span>
        {players.map((p, i) => (
          <div className={`score-row ${i === 0 ? 'rank-1' : ''}`} key={p.id}>
            <span className="score-rank">{i + 1}º</span>
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

      {!isLastRound && nextGuesserName && (
        <p className="subtitle" style={{ textAlign: 'center', marginTop: 18 }}>
          Próximo palpiteiro: <strong style={{ color: 'var(--text)' }}>{nextGuesserName}</strong>
        </p>
      )}

      <button className="btn btn-primary btn-block btn-fixed-bottom" onClick={onNext}>
        {isLastRound ? 'Ver resultado final' : 'Próxima rodada'}
      </button>
    </div>
  );
}
