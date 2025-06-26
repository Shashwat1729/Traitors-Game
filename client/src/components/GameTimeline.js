import React from 'react';

const PHASE_LABELS = {
  role_assignment: 'Role Assignment',
  traitor_meeting: "Traitors' Secret Meeting",
  group_discussion: 'Group Discussion',
  voting: 'Circle of Doubt (Voting)',
  recruitment: 'Traitor Recruitment',
  game_over: 'Game Over',
};

const PHASE_DESCRIPTIONS = {
  role_assignment: 'Players receive their secret roles',
  traitor_meeting: 'Traitors secretly discuss and plan',
  group_discussion: 'All players discuss and strategize',
  voting: 'All players vote to eliminate someone',
  recruitment: 'Eliminated traitor can recruit a player',
  game_over: 'The game has ended',
};

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor((ms - Date.now()) / 1000));
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function GameTimeline({ gameState, timer }) {
  if (!gameState) return null;

  const currentPhase = gameState.phase;
  const phaseLabel = PHASE_LABELS[currentPhase] || currentPhase;
  const phaseDescription = PHASE_DESCRIPTIONS[currentPhase] || '';

  return (
    <div className="game-timeline">
      <div className="phase-display">
        <div>
          <div className="current-phase">{phaseLabel}</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
            {phaseDescription}
          </div>
        </div>
        <div className="timer">{timer}</div>
      </div>
      
      {/* Game Progress Indicator */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: '16px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.6)'
      }}>
        <div>Players: {gameState.players?.length || 0}/{gameState.playerCount || 0}</div>
        <div>Traitors: {gameState.traitorCount || 0}</div>
        <div>Eliminated: {gameState.players?.filter(p => p.isEliminated).length || 0}</div>
      </div>
    </div>
  );
}

export default GameTimeline; 