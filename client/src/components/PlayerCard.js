import React from 'react';

function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function PlayerCard({ player, playerRole, canStartPrivateChat, onStartPrivateChat, socket }) {
  const isCurrentPlayer = player.id === socket?.id;
  const isEliminated = player.isEliminated;
  const isTraitor = player.role === 'traitor';
  const isFaithful = player.role === 'faithful';
  
  // Determine avatar class based on role and status
  let avatarClass = '';
  if (isEliminated) {
    avatarClass = 'eliminated';
  } else if (isTraitor) {
    avatarClass = 'traitor';
  } else if (isFaithful) {
    avatarClass = 'faithful';
  }

  return (
    <div
      className={`player-card${isEliminated ? ' eliminated eliminated-animate' : ''}${isTraitor ? ' traitor' : ''}${isFaithful ? ' faithful' : ''}${isCurrentPlayer ? ' current-player-glow' : ''}`}
      aria-label={`Player: ${player.name}${isCurrentPlayer ? ' (You)' : ''}${player.isHost ? ' (Host)' : ''}${isEliminated ? ' (Eliminated)' : ''}`}
      style={{
        boxShadow: isEliminated
          ? '0 0 24px 4px #e74c3c55'
          : isTraitor
          ? '0 0 24px 4px #ff6b6b99'
          : isFaithful
          ? '0 0 24px 4px #4ecdc499'
          : '0 2px 8px #0003',
        transition: 'box-shadow 0.5s, transform 0.5s',
        transform: isEliminated ? 'scale(0.95) rotate(-2deg)' : 'scale(1)'
      }}
    >
      <div
        className={`player-avatar ${avatarClass}`}
        style={{
          filter: isEliminated
            ? 'grayscale(1) blur(1px)'
            : isTraitor
            ? 'drop-shadow(0 0 8px #ff6b6b)'
            : isFaithful
            ? 'drop-shadow(0 0 8px #4ecdc4)'
            : 'none',
          transition: 'filter 0.5s'
        }}
        aria-label={isTraitor ? 'Traitor' : isFaithful ? 'Faithful' : 'Player'}
      >
        {getInitials(player.name)}
        {isTraitor && !isEliminated && (
          <span style={{ fontSize: 18, marginLeft: 4 }} title="Traitor" aria-label="Traitor">🦹</span>
        )}
        {isFaithful && !isEliminated && (
          <span style={{ fontSize: 18, marginLeft: 4 }} title="Faithful" aria-label="Faithful">🛡️</span>
        )}
      </div>
      <div className="player-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {player.name}
        {isCurrentPlayer && <span style={{ color: '#ff6b6b', fontWeight: 700 }} title="You">(You)</span>}
        {player.isHost && (
          <span
            style={{ color: '#ffd700', fontWeight: 700, position: 'relative', display: 'inline-block', animation: 'crown-bounce 1.2s infinite', filter: 'drop-shadow(0 0 8px #ffd70088)' }}
            title="Host"
            aria-label="Host"
          >
            👑
            <span className="crown-glow" />
          </span>
        )}
      </div>
      <div className="player-status">
        {isEliminated && <span style={{ color: '#e74c3c' }}>💀 Eliminated</span>}
        {!isEliminated && player.hasVoted && <span style={{ color: '#27ae60' }}>✓ Voted</span>}
      </div>
      {canStartPrivateChat && !isEliminated && !isCurrentPlayer && (
        <button
          className="btn btn-secondary"
          style={{
            marginTop: '12px',
            fontSize: '12px',
            padding: '8px 16px',
            width: '100%',
            borderRadius: 8,
            boxShadow: '0 2px 8px #0002'
          }}
          onClick={() => onStartPrivateChat(player.id)}
          aria-label={`Start private chat with ${player.name}`}
        >
          💬 Private Chat
        </button>
      )}
    </div>
  );
}

export default PlayerCard; 