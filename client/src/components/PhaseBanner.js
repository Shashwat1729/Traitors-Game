import React from 'react';

const PHASE_STYLES = {
  role_assignment: { background: '#222', color: '#ffd700' },
  traitor_meeting: { background: '#2d0606', color: '#ff6b6b' },
  group_discussion: { background: '#0a2d2d', color: '#4ecdc4' },
  voting: { background: '#2d2d0a', color: '#ffd700' },
  recruitment: { background: '#1a1a1a', color: '#ffb347' },
  game_over: { background: '#111', color: '#fff' },
};

const PHASE_LABELS = {
  role_assignment: 'Role Assignment',
  traitor_meeting: "Traitors' Secret Meeting",
  group_discussion: 'Group Discussion',
  voting: 'Circle of Doubt (Voting)',
  recruitment: 'Traitor Recruitment',
  game_over: 'Game Over',
};

export default function PhaseBanner({ phase }) {
  const style = PHASE_STYLES[phase] || PHASE_STYLES.role_assignment;
  return (
    <div
      className="phase-banner"
      style={{
        ...style,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 2000,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 700,
        padding: '18px 0',
        letterSpacing: 2,
        boxShadow: '0 2px 12px #0008',
        transition: 'background 0.5s, color 0.5s',
        animation: 'phase-banner-fade-in 0.7s',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {PHASE_LABELS[phase] || phase}
    </div>
  );
} 