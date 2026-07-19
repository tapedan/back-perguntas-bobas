import React, { useLayoutEffect, useRef, useState } from 'react';
import { vibrate } from '../haptics.js';

const CATEGORY_LABEL = {
  objetos: 'Objetos',
  famosos: 'Famosos',
  numeros: 'Números',
  jogadores: 'Jogadores',
  comidas: 'Comidas',
};

export default function GuesserScale({ round, questions, onSubmit }) {
  const [order, setOrder] = useState(questions); // index = posição na régua (0..4)
  const [submitted, setSubmitted] = useState(false);
  const itemRefs = useRef(new Map());
  const firstRects = useRef(null);

  function captureFirstRects() {
    const rects = new Map();
    itemRefs.current.forEach((el, id) => {
      if (el) rects.set(id, el.getBoundingClientRect());
    });
    firstRects.current = rects;
  }

  useLayoutEffect(() => {
    if (!firstRects.current) return;
    itemRefs.current.forEach((el, id) => {
      if (!el) return;
      const first = firstRects.current.get(id);
      if (!first) return;
      const last = el.getBoundingClientRect();
      const deltaY = first.top - last.top;
      if (deltaY) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${deltaY}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)';
          el.style.transform = '';
        });
      }
    });
    firstRects.current = null;
  }, [order]);

  function move(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= order.length) return;
    vibrate(8);
    captureFirstRects();
    setOrder((prev) => {
      const copy = [...prev];
      [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
      return copy;
    });
  }

  function handleSubmit() {
    if (submitted) return;
    vibrate(20);
    setSubmitted(true);
    onSubmit(order.map((q) => q.id));
  }

  return (
    <div className="screen">
      <div className="top-bar">
        <span className="round-pill">
          Rodada {round.roundNumber} de {round.totalRounds}
        </span>
        <span className="role-badge guesser">{CATEGORY_LABEL[round.category]}</span>
      </div>

      <h2 style={{ fontSize: 22 }}>Monte a régua</h2>
      <p className="subtitle">
        Use as setas para ordenar: <strong style={{ color: 'var(--text)' }}>0</strong> é a pergunta
        menos provável de ser a oficial, <strong style={{ color: 'var(--text)' }}>4</strong> é a
        mais provável — baseado no que você acabou de ouvir.
      </p>

      <div className="ruler">
        {order.map((q, i) => (
          <div
            key={q.id}
            ref={(el) => itemRefs.current.set(q.id, el)}
            className="ruler-slot"
          >
            <div className="ruler-index">{i}</div>
            <div className="ruler-text">{q.text}</div>
            <div className="ruler-arrows">
              <button
                className="ruler-arrow-btn"
                disabled={submitted || i === 0}
                onClick={() => move(i, -1)}
                aria-label="Mover para cima"
              >
                ▲
              </button>
              <button
                className="ruler-arrow-btn"
                disabled={submitted || i === order.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Mover para baixo"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary btn-block btn-fixed-bottom"
        disabled={submitted}
        onClick={handleSubmit}
      >
        {submitted ? 'Calculando pontuação...' : 'Concluir'}
      </button>
    </div>
  );
}
