import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  const colors = {
    info: '#4ecdc4',
    success: '#27ae60',
    error: '#e74c3c',
    warning: '#ffd700',
  };

  return (
    <div
      className="toast-notification"
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        minWidth: 220,
        background: colors[type] || '#222',
        color: '#fff',
        padding: '16px 24px',
        borderRadius: 8,
        boxShadow: '0 2px 12px #0008',
        zIndex: 3000,
        fontWeight: 600,
        fontSize: 16,
        animation: 'toast-fade-in 0.5s',
        cursor: 'pointer',
      }}
      tabIndex={0}
      role="alert"
      aria-live="assertive"
      onClick={onClose}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClose && onClose()}
    >
      {message}
      <span style={{ float: 'right', marginLeft: 16, fontWeight: 900, cursor: 'pointer' }} aria-label="Dismiss">×</span>
    </div>
  );
} 