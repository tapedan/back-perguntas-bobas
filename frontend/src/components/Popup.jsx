import React, { useEffect } from 'react';

export default function Popup({ open, onClose, title, children, actions }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="popup-header">
          <h3 className="popup-title">{title}</h3>
          <button className="popup-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="popup-body">{children}</div>
        {actions && <div className="popup-actions">{actions}</div>}
      </div>
    </div>
  );
}
