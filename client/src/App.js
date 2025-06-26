import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import './App.css';

const socket = io('http://localhost:3001', {
  reconnectionAttempts: 5,
  timeout: 10000
});

function App() {
  const [gameState, setGameState] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected', 'disconnected', 'reconnecting'
  const [accessibilityAnnouncement, setAccessibilityAnnouncement] = useState('');

  // Announce accessibility events
  const announceToScreenReader = (message) => {
    setAccessibilityAnnouncement(message);
    setTimeout(() => setAccessibilityAnnouncement(''), 1000);
  };

  useEffect(() => {
    // Socket event listeners
    socket.on('connect', () => {
      setConnectionStatus('connected');
      announceToScreenReader('Connected to game server');
    });
    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setError('Lost connection to the server. Trying to reconnect...');
      announceToScreenReader('Lost connection to server. Attempting to reconnect.');
    });
    socket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
      announceToScreenReader('Reconnecting to server');
    });
    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      setError(null);
      announceToScreenReader('Reconnected to server');
    });
    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
      setError('Unable to connect to the server. Please check your connection or try again later.');
      announceToScreenReader('Connection error. Please check your internet connection.');
    });

    socket.on('gameCreated', ({ gameId, gameState }) => {
      setGameState(gameState);
      announceToScreenReader(`Game created with ID ${gameId}`);
    });

    socket.on('gameState', (newGameState) => {
      setGameState(newGameState);
      if (newGameState.phase === 'lobby') setPlayerRole(null);
    });

    socket.on('roleAssignment', ({ role, gameState }) => {
      setPlayerRole(role);
      setGameState(gameState);
      announceToScreenReader(`You are assigned the role: ${role}`);
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 7000);
      announceToScreenReader(`Error: ${message}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_attempt');
      socket.off('reconnect');
      socket.off('connect_error');
      socket.off('gameCreated');
      socket.off('gameState');
      socket.off('roleAssignment');
      socket.off('error');
    };
  }, []);

  const createGame = (playerName, playerCount) => {
    socket.emit('createGame', { playerName, playerCount });
  };

  const joinGame = (gameId, playerName) => {
    socket.emit('joinGame', { gameId, playerName });
    setPlayerName(playerName);
  };

  const startGame = () => {
    socket.emit('startGame');
  };

  const vote = (targetPlayerId) => {
    socket.emit('vote', { targetPlayerId });
  };

  const sendMessage = (roomId, message) => {
    socket.emit('sendMessage', { roomId, message });
  };

  const respondToRecruitment = (accept) => {
    socket.emit('recruitmentResponse', { accept });
  };

  return (
    <div>
      {/* Accessibility Live Regions */}
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
      
      {/* Game Status Live Region */}
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
        {gameState && gameState.phase && (
          <span>
            Current game phase: {gameState.phase}
            {gameState.players && `, ${gameState.players.length} players`}
            {gameState.phase === 'voting' && gameState.players && (
              `, ${gameState.players.filter(p => p.hasVoted).length} have voted`
            )}
          </span>
        )}
      </div>

      {/* Global Connection/Error Banner */}
      {connectionStatus !== 'connected' && (
        <div style={{
          background: '#ff6b6b',
          color: 'white',
          padding: '12px',
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: '1px',
          zIndex: 1000,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {connectionStatus === 'disconnected' && 'Lost connection to the server. Trying to reconnect...'}
          {connectionStatus === 'reconnecting' && 'Reconnecting to the server...'}
        </div>
      )}
      {error && (
        <div style={{
          background: '#e74c3c',
          color: 'white',
          padding: '12px',
          textAlign: 'center',
          fontWeight: 'bold',
          letterSpacing: '1px',
          zIndex: 1000,
          position: 'fixed',
          top: connectionStatus !== 'connected' ? '48px' : '0',
          left: 0,
          width: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {error}
        </div>
      )}
      <div style={{ paddingTop: (connectionStatus !== 'connected' || error) ? '64px' : '0' }}>
        {gameState && gameState.phase !== 'lobby' ? (
          <GameRoom
            gameState={gameState}
            playerRole={playerRole}
            playerName={playerName}
            onVote={vote}
            onSendMessage={sendMessage}
            onRecruitmentResponse={respondToRecruitment}
            socket={socket}
          />
        ) : (
          <Lobby
            gameState={gameState}
            onCreateGame={createGame}
            onJoinGame={joinGame}
            onStartGame={startGame}
          />
        )}
      </div>
    </div>
  );
}

export default App; 