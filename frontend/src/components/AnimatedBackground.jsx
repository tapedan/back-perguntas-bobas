import React, { useMemo } from 'react';

const COLORS = ['var(--amber)', 'var(--coral)', 'var(--mint)', '#7dc2ff', '#c792ea'];

function randomBlob(i) {
  return {
    left: `${Math.random() * 90}%`,
    top: `${Math.random() * 85}%`,
    size: 150 + Math.random() * 190,
    color: COLORS[i % COLORS.length],
    duration: 16 + Math.random() * 18,
    delay: -(Math.random() * 20),
    driftX: Math.round(Math.random() * 180 - 90),
    driftY: Math.round(Math.random() * 180 - 90),
    scaleMax: 1.08 + Math.random() * 0.22,
  };
}

// Gera as bolhas uma única vez por carregamento — cada visita tem um
// movimento de fundo diferente, real e aleatório, não um loop fixo.
export default function AnimatedBackground({ count = 6 }) {
  const blobs = useMemo(() => Array.from({ length: count }, (_, i) => randomBlob(i)), [count]);

  return (
    <div className="animated-bg" aria-hidden="true">
      {blobs.map((b, i) => (
        <span
          key={i}
          className="bg-blob"
          style={{
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size,
            background: b.color,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            '--drift-x': `${b.driftX}px`,
            '--drift-y': `${b.driftY}px`,
            '--scale-max': b.scaleMax,
          }}
        />
      ))}
    </div>
  );
}
