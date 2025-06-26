import React, { useState, useEffect } from 'react';
import GameTimeline from './GameTimeline';
import PlayerCard from './PlayerCard';
import ChatSystem from './ChatSystem';
import PhaseBanner from './PhaseBanner';
import Toast from './Toast';

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor((ms - Date.now()) / 1000));
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

const PHASE_LABELS = {
  role_assignment: 'Role Assignment',
  traitor_meeting: "Traitors' Secret Meeting",
  group_discussion: 'Group Discussion',
  voting: 'Circle of Doubt (Voting)',
  recruitment: 'Traitor Recruitment',
  game_over: 'Game Over',
};

function GameRoom({ gameState, playerRole, playerName, onVote, onSendMessage, onRecruitmentResponse, socket }) {
  const [message, setMessage] = useState('');
  const [selectedVote, setSelectedVote] = useState(null);
  const [timer, setTimer] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [privateMessages, setPrivateMessages] = useState({});
  const [newRoomName, setNewRoomName] = useState('');
  const [activePrivateChat, setActivePrivateChat] = useState(null);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showCountdownWarning, setShowCountdownWarning] = useState(false);
  const [votingProgress, setVotingProgress] = useState(0);
  const [accessibilityAnnouncement, setAccessibilityAnnouncement] = useState('');
  const [traitorNames, setTraitorNames] = useState([]);
  const [showFutureFeatures, setShowFutureFeatures] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Announce accessibility events
  const announceToScreenReader = (message) => {
    setAccessibilityAnnouncement(message);
    setTimeout(() => setAccessibilityAnnouncement(''), 1000);
  };

  // Define variables that are used in useEffect hooks
  const alivePlayers = gameState.players.filter(p => !p.isEliminated);
  const canVote = gameState.phase === 'voting' && !gameState.players.find(p => p.id === socket.id)?.hasVoted;
  const canChat =
    (gameState.phase === 'traitor_meeting' && playerRole === 'traitor') ||
    (gameState.phase === 'group_discussion' && !gameState.players.find(p => p.id === socket.id)?.isEliminated);
  const chatRoom = playerRole === 'traitor' ? 'traitor' : 'faithful';
  const recruitmentOffer = gameState.recruitmentOffer && gameState.recruitmentOffer.availableFaithful.includes(socket.id);
  const availableRooms = gameState.chatRooms || [];
  const canStartPrivateChat = gameState.phase === 'group_discussion' || gameState.phase === 'traitor_meeting';

  useEffect(() => {
    if (gameState.phaseEndTime) {
      const interval = setInterval(() => {
        const timeLeft = Math.max(0, Math.floor((gameState.phaseEndTime - Date.now()) / 1000));
        setTimer(formatTime(gameState.phaseEndTime));
        
        // Show countdown warning for last 10 seconds
        if (timeLeft <= 10 && timeLeft > 0) {
          setShowCountdownWarning(true);
        } else {
          setShowCountdownWarning(false);
        }
      }, 1000);
      setTimer(formatTime(gameState.phaseEndTime));
      return () => clearInterval(interval);
    }
  }, [gameState.phaseEndTime]);

  // Calculate voting progress
  useEffect(() => {
    if (gameState.phase === 'voting' && alivePlayers.length > 0) {
      const votedCount = alivePlayers.filter(p => p.hasVoted).length;
      const progress = (votedCount / alivePlayers.length) * 100;
      setVotingProgress(progress);
    }
  }, [gameState.phase, alivePlayers]);

  // Phase transition effect
  useEffect(() => {
    setShowPhaseTransition(true);
    const timer = setTimeout(() => setShowPhaseTransition(false), 2000);
    return () => clearTimeout(timer);
  }, [gameState.phase]);

  // Role reveal effect
  useEffect(() => {
    if (gameState.phase === 'role_assignment' && playerRole) {
      setShowRoleReveal(true);
      const timer = setTimeout(() => setShowRoleReveal(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, playerRole]);

  useEffect(() => {
    const handleMessage = (msg) => {
      // Handle message if needed
    };
    socket.on('message', handleMessage);
    return () => socket.off('message', handleMessage);
  }, [socket]);

  // Private chat events
  useEffect(() => {
    const handlePrivateMessage = (msg) => {
      setPrivateMessages((prev) => {
        const key = msg.from === socket.id ? msg.to : msg.from;
        return {
          ...prev,
          [key]: [...(prev[key] || []), msg]
        };
      });
    };
    socket.on('privateMessage', handlePrivateMessage);
    return () => socket.off('privateMessage', handlePrivateMessage);
  }, [socket]);

  useEffect(() => {
    const handlePrivateChatStarted = ({ targetId }) => {
      setActivePrivateChat(targetId);
    };
    socket.on('privateChatStarted', handlePrivateChatStarted);
    return () => socket.off('privateChatStarted', handlePrivateChatStarted);
  }, [socket]);

  // Listen for elimination events
  useEffect(() => {
    const handlePlayerEliminated = ({ playerName, role }) => {
      announceToScreenReader(`${playerName} has been eliminated. They were a ${role}.`);
    };
    
    socket.on('playerEliminated', handlePlayerEliminated);
    return () => socket.off('playerEliminated', handlePlayerEliminated);
  }, [socket]);

  // Listen for voting events
  useEffect(() => {
    const handleVoteCast = ({ voterName, targetName }) => {
      announceToScreenReader(`${voterName} voted to eliminate ${targetName}`);
    };
    
    socket.on('voteCast', handleVoteCast);
    return () => socket.off('voteCast', handleVoteCast);
  }, [socket]);

  // Listen for recruitment events
  useEffect(() => {
    const handleRecruitmentOffer = ({ eliminatedPlayerName }) => {
      announceToScreenReader(`${eliminatedPlayerName} wants to recruit you to become a traitor`);
    };
    
    socket.on('recruitmentOffer', handleRecruitmentOffer);
    return () => socket.off('recruitmentOffer', handleRecruitmentOffer);
  }, [socket]);

  useEffect(() => {
    // Listen for roleAssignment event to get traitorNames
    const handleRoleAssignment = ({ role, traitorNames }) => {
      if (role === 'traitor' && traitorNames) setTraitorNames(traitorNames);
    };
    socket.on('roleAssignment', handleRoleAssignment);
    return () => socket.off('roleAssignment', handleRoleAssignment);
  }, [socket]);

  useEffect(() => {
    if (playerRole !== 'traitor') return;
    const handleConsensus = ({ consensus, target }) => {
      const statusDiv = document.getElementById('traitor-consensus-status');
      if (!statusDiv) return;
      if (consensus === true) {
        statusDiv.textContent = `Consensus reached! All traitors voted for ${alivePlayers.find(p => p.id === target)?.name || 'the same player'}.`;
        statusDiv.style.color = '#27ae60';
      } else if (consensus === false) {
        statusDiv.textContent = 'No consensus. All traitors must vote for the same player.';
        statusDiv.style.color = '#e74c3c';
      } else {
        statusDiv.textContent = 'Waiting for all traitors to vote...';
        statusDiv.style.color = '#ff6b6b';
      }
    };
    socket.on('traitorConsensus', handleConsensus);
    return () => socket.off('traitorConsensus', handleConsensus);
  }, [playerRole, socket, alivePlayers]);

  useEffect(() => {
    if (playerRole !== 'traitor') return;
    const handleNightKillConsensus = ({ consensus, target }) => {
      const statusDiv = document.getElementById('traitor-night-kill-status');
      if (!statusDiv) return;
      if (consensus === true) {
        statusDiv.textContent = `Consensus reached! All traitors voted to eliminate ${alivePlayers.find(p => p.id === target)?.name || 'the same player'}.`;
        statusDiv.style.color = '#27ae60';
      } else if (consensus === false) {
        statusDiv.textContent = 'No consensus. All traitors must vote for the same player.';
        statusDiv.style.color = '#e74c3c';
      } else {
        statusDiv.textContent = 'Waiting for all traitors to vote...';
        statusDiv.style.color = '#ff6b6b';
      }
    };
    socket.on('traitorNightKillConsensus', handleNightKillConsensus);
    return () => socket.off('traitorNightKillConsensus', handleNightKillConsensus);
  }, [playerRole, socket, alivePlayers]);

  const handleCreateRoom = () => {
    if (newRoomName) {
      socket.emit('createChatRoom', { roomName: newRoomName });
      setNewRoomName('');
    }
  };

  const handleJoinRoom = (roomId) => {
    socket.emit('joinChatRoom', { roomId });
    setActiveRoom(roomId);
  };

  const handleSendRoomMessage = () => {
    if (activeRoom && message) {
      socket.emit('sendRoomMessage', { roomId: activeRoom, message });
      setMessage('');
    }
  };

  const handleStartPrivateChat = (targetId) => {
    socket.emit('startPrivateChat', { targetId });
  };

  const handleSendPrivateMessage = () => {
    if (activePrivateChat && message) {
      socket.emit('sendPrivateMessage', { targetId: activePrivateChat, message });
      setMessage('');
    }
  };

  const handleVote = (targetPlayerId) => {
    const targetPlayer = alivePlayers.find(p => p.id === targetPlayerId);
    setSelectedVote(targetPlayerId);
    onVote(targetPlayerId);
    announceToScreenReader(`You voted to eliminate ${targetPlayer?.name}`);
  };

  const handleNightKillVote = (targetPlayerId) => {
    const targetPlayer = alivePlayers.find(p => p.id === targetPlayerId);
    setSelectedVote(targetPlayerId);
    socket.emit('traitorNightKillVote', { targetPlayerId });
    announceToScreenReader(`You voted to eliminate ${targetPlayer?.name}`);
  };

  return (
    <div className="container">
      {/* Accessibility Live Region */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        style={{ 
          position: 'absolute', 
          left: '-10000px', 
          width: '1px', 
          height: '1px', 
          overflow: 'hidden' 
        }}
      >
        {accessibilityAnnouncement}
      </div>

      {/* Phase Transition Overlay */}
      {showPhaseTransition && (
        <div className="phase-transition">
          {/* Animated SVG Overlay: Swirling Mist */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1920 1080"
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="mistGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0.04" />
              </linearGradient>
              <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="24" />
              </filter>
            </defs>
            <ellipse
              cx="960"
              cy="540"
              rx="900"
              ry="180"
              fill="url(#mistGradient)"
              filter="url(#blur)"
              style={{ animation: 'mist-move 6s linear infinite alternate' }}
            />
            <ellipse
              cx="960"
              cy="700"
              rx="700"
              ry="120"
              fill="url(#mistGradient)"
              filter="url(#blur)"
              style={{ animation: 'mist-move2 8s linear infinite alternate' }}
            />
          </svg>
          {/* Flickering Torch Effect (left/right) */}
          <div style={{ position: 'absolute', left: 60, top: '30%', zIndex: 2 }}>
            <span className="torch-flame" />
          </div>
          <div style={{ position: 'absolute', right: 60, top: '30%', zIndex: 2 }}>
            <span className="torch-flame" />
          </div>
          <div className="phase-transition-text" style={{ position: 'relative', zIndex: 3 }}>
            {PHASE_LABELS[gameState.phase]}
          </div>
        </div>
      )}

      {/* Add a background overlay for tense phases */}
      {['voting', 'recruitment', 'game_over'].includes(gameState.phase) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(10,10,20,0.55)',
          zIndex: 900,
          pointerEvents: 'none',
          transition: 'background 0.8s',
        }} aria-hidden="true" />
      )}

      {/* Role Reveal */}
      {showRoleReveal && (
        <div className="role-reveal" style={{ zIndex: 1200, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <h2>Your Role</h2>
          <div style={{ fontSize: '32px', margin: '16px 0' }}>
            {playerRole === 'traitor' ? '🦹 TRAITOR' : '🛡️ FAITHFUL'}
          </div>
          <p>
            {playerRole === 'traitor' 
              ? 'Your mission is to eliminate the Faithful without being discovered.'
              : 'Your mission is to identify and eliminate the Traitors.'
            }
          </p>
        </div>
      )}

      {/* Game Timeline */}
      <GameTimeline gameState={gameState} timer={timer} />

      {/* Player List */}
      <div className="player-list">
        {gameState.players.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            playerRole={playerRole}
            canStartPrivateChat={canStartPrivateChat}
            onStartPrivateChat={handleStartPrivateChat}
            socket={socket}
          />
        ))}
      </div>

      {/* Chat System - Always visible, high z-index, not covered by overlays */}
      {(gameState.phase !== 'group_discussion' || !gameState.players.find(p => p.id === socket.id)?.isEliminated) && (
        <div style={{ position: 'relative', zIndex: 1500 }}>
          <ChatSystem
            gameState={gameState}
            playerRole={playerRole}
            canChat={canChat}
            chatRoom={chatRoom}
            activeRoom={activeRoom}
            setActiveRoom={setActiveRoom}
            activePrivateChat={activePrivateChat}
            setActivePrivateChat={setActivePrivateChat}
            privateMessages={privateMessages}
            availableRooms={availableRooms}
            newRoomName={newRoomName}
            setNewRoomName={setNewRoomName}
            onSendMessage={onSendMessage}
            onSendRoomMessage={handleSendRoomMessage}
            onSendPrivateMessage={handleSendPrivateMessage}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartPrivateChat={handleStartPrivateChat}
            socket={socket}
          />
        </div>
      )}

      {/* Voting Interface */}
      {gameState.phase === 'voting' && (
        <div className="card" role="region" aria-label="Voting interface">
          <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#ff6b6b', letterSpacing: 1, fontWeight: 700, fontSize: 24 }}>
            🗳️ Circle of Doubt - Vote to Eliminate
          </h3>
          
          {/* Voting Progress Bar */}
          <div 
            role="progressbar"
            aria-valuenow={votingProgress}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Voting progress: ${Math.round(votingProgress)}% of players have voted`}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: 8, 
              height: 8, 
              marginBottom: 20,
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div style={{
              background: 'linear-gradient(90deg, #27ae60, #2ecc71)',
              height: '100%',
              width: `${votingProgress}%`,
              transition: 'width 0.5s ease',
              borderRadius: 8,
              boxShadow: '0 0 8px #27ae60'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12,
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 600
            }}>
              {Math.round(votingProgress)}% Voted
            </div>
          </div>

          {/* Countdown Warning */}
          {showCountdownWarning && (
            <div 
              role="alert"
              aria-live="assertive"
              style={{
                textAlign: 'center',
                padding: '12px',
                background: 'linear-gradient(45deg, #e74c3c, #c0392b)',
                borderRadius: 8,
                marginBottom: 16,
                animation: 'countdown-pulse 0.5s infinite alternate',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 18
              }}
            >
              ⏰ Voting ends soon!
            </div>
          )}

          <div className="voting-container" aria-label="Voting area">
            {alivePlayers.map(player => (
              <button
                key={player.id}
                className={`vote-button${selectedVote === player.id ? ' selected' : ''}${player.hasVoted ? ' voted' : ''}`}
                onClick={() => handleVote(player.id)}
                disabled={player.id === socket.id || gameState.players.find(p => p.id === socket.id)?.hasVoted}
                aria-label={`Vote to eliminate ${player.name}${player.hasVoted ? ' - Already voted' : ''}${player.id === socket.id ? ' - This is you' : ''}`}
                aria-pressed={selectedVote === player.id}
                style={{
                  transition: 'box-shadow 0.3s, transform 0.3s',
                  boxShadow: selectedVote === player.id ? '0 0 16px 4px #ff6b6b88' : '0 2px 8px #0002',
                  transform: selectedVote === player.id ? 'scale(1.05)' : 'scale(1)',
                  border: player.hasVoted ? '3px solid #27ae60' : undefined,
                  background: player.hasVoted ? 'linear-gradient(45deg, #27ae60, #2ecc71)' : undefined,
                  color: player.hasVoted ? '#fff' : undefined,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Ripple effect for selection */}
                {selectedVote === player.id && (
                  <div className="vote-ripple" />
                )}
                
                <div style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
                  {getInitials(player.name)}
                </div>
                <div style={{ fontSize: 18 }}>{player.name}</div>
                {player.hasVoted && (
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#fff', 
                    marginTop: 6,
                    animation: 'vote-check-bounce 0.6s ease-out'
                  }}>
                    ✓ Voted
                  </div>
                )}
                {player.id === socket.id && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#ffd700', 
                    marginTop: 6,
                    fontWeight: 'bold'
                  }}>
                    You
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Voting Instructions */}
          <div 
            role="status"
            aria-live="polite"
            style={{
              textAlign: 'center',
              marginTop: 20,
              padding: 12,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8,
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)'
            }}
          >
            {canVote ? (
              <span>Click on a player to cast your vote</span>
            ) : (
              <span>You have already voted</span>
            )}
          </div>

          {/* Traitor Night Kill */}
          {gameState.phase === 'traitor_meeting' && playerRole === 'traitor' && (
            <div className="traitor-night-kill" style={{ margin: '20px 0', padding: 16, background: '#222', borderRadius: 8, color: '#ff6b6b' }}>
              <h4>Traitor Night Kill</h4>
              <p>Select a player to eliminate tonight. All traitors must agree.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {alivePlayers.filter(p => p.role !== 'traitor').map(player => (
                  <button
                    key={player.id}
                    className={`btn${selectedVote === player.id ? ' btn-danger' : ' btn-secondary'}`}
                    onClick={() => handleNightKillVote(player.id)}
                    disabled={selectedVote === player.id}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
              <div id="traitor-night-kill-status" style={{ marginTop: 12, fontWeight: 700 }}></div>
            </div>
          )}
        </div>
      )}

      {/* Recruitment Offer */}
      {gameState.phase === 'recruitment' && recruitmentOffer && (
        <div 
          className="recruitment-offer"
          role="alert"
          aria-live="assertive"
        >
          <h2>🔄 Traitor Recruitment</h2>
          <p>A traitor has been eliminated! They want to recruit you to join their side.</p>
          <p style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
            If you accept, you will become a Traitor and help eliminate the remaining Faithful.
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-danger" onClick={() => onRecruitmentResponse(true)}>
              Accept Recruitment
            </button>
            <button className="btn btn-success" onClick={() => onRecruitmentResponse(false)}>
              Remain Faithful
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState.phase === 'game_over' && (
        <div 
          className="game-over"
          role="alert"
          aria-live="assertive"
        >
          <h2>🏆 Game Over</h2>
          <div style={{ fontSize: '32px', margin: '20px 0' }}>
            {gameState.winner === 'faithful' ? '🛡️ FAITHFUL WIN!' : '🦹 TRAITORS WIN!'}
          </div>
          <p>
            {gameState.winner === 'faithful' 
              ? 'The Faithful successfully identified and eliminated all Traitors!'
              : 'The Traitors successfully eliminated the Faithful and took control!'
            }
          </p>
          <button 
            className="btn" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px' }}
          >
            Play Again
          </button>
        </div>
      )}

      {/* Role Badge - Always visible, fixed top right */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2100 }}>
        {playerRole === 'traitor' && (
          <span style={{ background: '#ff6b6b', color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 18, boxShadow: '0 2px 8px #ff6b6b55' }}>
            🦹 TRAITOR
          </span>
        )}
        {playerRole === 'faithful' && (
          <span style={{ background: '#4ecdc4', color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 18, boxShadow: '0 2px 8px #4ecdc455' }}>
            🛡️ FAITHFUL
          </span>
        )}
      </div>

      {/* Show traitor names to traitors at all times */}
      {playerRole === 'traitor' && gameState.traitorNames && gameState.traitorNames.length > 0 && (
        <div style={{ background: '#222', color: '#ff6b6b', padding: 16, borderRadius: 12, margin: '24px 0', textAlign: 'center', fontWeight: 700 }}>
          Other Traitors: {gameState.traitorNames.join(', ')}
        </div>
      )}

      {/* Faithful Discussion: Show all chat rooms and members, allow inviting */}
      {gameState.phase === 'group_discussion' && gameState.allChatRooms && (
        <div style={{ margin: '16px 0' }}>
          <h4 style={{ color: '#4ecdc4', marginBottom: 8 }}>Active Chat Rooms</h4>
          {gameState.allChatRooms.map(room => (
            <div key={room.roomId} style={{ background: '#222', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{room.name}</div>
              <div style={{ fontSize: 13, color: '#4ecdc4', marginBottom: 4 }}>Members: {room.members.join(', ')}</div>
              {/* Invite others if you are a member */}
              {room.members.includes(playerName) && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#fff' }}>Invite: </span>
                  {gameState.players.filter(p => !room.members.includes(p.name) && !p.isEliminated).map(p => (
                    <button key={p.id} className="btn btn-secondary" style={{ fontSize: 10, marginLeft: 4 }} onClick={() => socket.emit('inviteToChatRoom', { roomId: room.roomId, targetId: p.id })}>
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Future Features Note */}
      <div style={{ marginTop: '20px', textAlign: 'center', color: '#fff', fontSize: 14 }}>
        <button
          className="btn btn-secondary"
          style={{ marginBottom: 8, fontSize: 13 }}
          onClick={() => setShowFutureFeatures(v => !v)}
          aria-expanded={showFutureFeatures}
          aria-controls="future-features-panel"
        >
          {showFutureFeatures ? 'Hide Future Features' : 'Show Future Features'}
        </button>
        {showFutureFeatures && (
          <div id="future-features-panel" style={{ marginTop: 8, background: '#181818', borderRadius: 8, padding: 16, boxShadow: '0 2px 8px #0006', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            <ul style={{ listStyle: 'disc', margin: 0, paddingLeft: 20, textAlign: 'left' }}>
              <li>Video call support for group meetings and discussions</li>
              <li>Audio chat for more immersive gameplay</li>
              <li>Advanced moderation tools (mute, kick, report)</li>
              <li>AI host to guide the game and enforce rules</li>
              <li>More social deduction tools (anonymous voting, secret clues, etc.)</li>
            </ul>
          </div>
        )}
      </div>

      {/* Show PhaseBanner at the top */}
      <PhaseBanner phase={gameState.phase} />

      {/* Show Toast notification */}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
}

// Helper function for player initials
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default GameRoom; 