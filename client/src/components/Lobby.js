import React, { useState } from 'react';

function Lobby({ gameState, onCreateGame, onJoinGame, onStartGame }) {
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState(6);
  const [joinGameId, setJoinGameId] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'

  return (
    <div className="container">
      {/* Game Title */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '48px', 
          marginBottom: '16px',
          background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🦹 The Traitors Game 🛡️
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px' }}>
          A game of deception, strategy, and betrayal
        </p>
        
        {/* Game Rules */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '20px', 
          borderRadius: '12px',
          marginTop: '20px',
          textAlign: 'left'
        }}>
          <h3 style={{ color: '#ff6b6b', marginBottom: '16px' }}>🎮 How to Play</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <h4 style={{ color: '#4ecdc4', marginBottom: '8px' }}>🛡️ Faithful</h4>
              <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <li>Identify and eliminate the Traitors</li>
                <li>Discuss with other Faithful players</li>
                <li>Vote to eliminate suspicious players</li>
                <li>Survive until all Traitors are eliminated</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#ff6b6b', marginBottom: '8px' }}>🦹 Traitors</h4>
              <ul style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <li>Eliminate Faithful players secretly</li>
                <li>Deceive and blend in with the Faithful</li>
                <li>Coordinate with other Traitors</li>
                <li>Outnumber the Faithful to win</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', marginBottom: '24px', gap: '8px' }}>
        <button 
          className={`btn ${activeTab === 'create' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('create')}
          style={{ flex: 1 }}
        >
          🎯 Create Game
        </button>
        <button 
          className={`btn ${activeTab === 'join' ? '' : 'btn-secondary'}`}
          onClick={() => setActiveTab('join')}
          style={{ flex: 1 }}
        >
          🔗 Join Game
        </button>
      </div>

      {/* Create Game Tab */}
      {activeTab === 'create' && (
        <div className="card">
          <h2 style={{ color: '#4ecdc4', marginBottom: '20px' }}>🎯 Create New Game</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
              Your Name
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
              Number of Players ({playerCount})
            </label>
            <input
              className="input"
              type="range"
              min="6"
              max="12"
              value={playerCount}
              onChange={e => setPlayerCount(Number(e.target.value))}
              style={{ width: '100%', marginTop: '8px' }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.6)',
              marginTop: '4px'
            }}>
              <span>6 players (2 Traitors)</span>
              <span>8 players (2 Traitors)</span>
              <span>10 players (3 Traitors)</span>
              <span>12 players (4 Traitors)</span>
            </div>
          </div>

          <button
            className="btn"
            onClick={() => onCreateGame(playerName, playerCount)}
            disabled={!playerName || playerCount < 6 || playerCount > 12}
            style={{ width: '100%', fontSize: '18px', padding: '16px' }}
          >
            🚀 Create Game
          </button>
        </div>
      )}

      {/* Join Game Tab */}
      {activeTab === 'join' && (
        <div className="card">
          <h2 style={{ color: '#ff6b6b', marginBottom: '20px' }}>🔗 Join Existing Game</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
              Game ID
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter the game ID"
              value={joinGameId}
              onChange={e => setJoinGameId(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
              Your Name
            </label>
            <input
              className="input"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => onJoinGame(joinGameId, playerName)}
            disabled={!joinGameId || !playerName}
            style={{ width: '100%', fontSize: '18px', padding: '16px' }}
          >
            🔗 Join Game
          </button>
        </div>
      )}

      {/* Game Lobby */}
      {gameState && gameState.phase === 'lobby' && (
        <div className="card">
          <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>🎮 Game Lobby</h2>
          
          <div style={{ 
            background: 'rgba(255,215,0,0.1)', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid rgba(255,215,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 'bold', color: '#ffd700' }}>Game ID:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '16px', color: '#fff' }}>
                {gameState.gameId}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Players:</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#4ecdc4' }}>
                {gameState.players ? gameState.players.length : 1} / {gameState.playerCount}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}>Players in Lobby:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {gameState.players && gameState.players.map(player => (
                <div key={player.id} style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '12px', 
                  borderRadius: '8px',
                  border: player.isHost ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>
                    {player.name}
                    {player.isHost && <span style={{ color: '#ffd700', marginLeft: '8px' }}>👑</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {gameState.players && gameState.players.length < gameState.playerCount && (
            <div style={{ 
              textAlign: 'center', 
              padding: '16px', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.7)'
            }}>
              Waiting for {gameState.playerCount - (gameState.players.length)} more player(s)...
            </div>
          )}

          {gameState.players && gameState.players.length === gameState.playerCount && (
            <div style={{
              textAlign: 'center',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              color: '#27ae60',
              fontWeight: 'bold',
              fontSize: '18px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div className="phase-transition" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                animation: 'phase-transition-fade 2s ease-in-out'
              }}>
                <div className="phase-transition-text" style={{ fontSize: '36px', color: '#27ae60', textShadow: '0 0 20px #fff' }}>
                  🚦 Game is starting!
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Lobby; 