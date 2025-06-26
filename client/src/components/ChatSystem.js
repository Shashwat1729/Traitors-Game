import React, { useState, useEffect, useRef } from 'react';

function ChatSystem({ 
  gameState, 
  playerRole, 
  canChat, 
  chatRoom, 
  activeRoom, 
  activePrivateChat, 
  privateMessages, 
  availableRooms,
  newRoomName,
  setNewRoomName,
  onSendMessage,
  onSendRoomMessage,
  onSendPrivateMessage,
  onCreateRoom,
  onJoinRoom,
  onStartPrivateChat,
  socket,
  setActiveRoom,
  setActivePrivateChat
}) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [localChatRoomMessages, setLocalChatRoomMessages] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [showChatMenu, setShowChatMenu] = useState(false);

  // Merge gameState.chatRoomMessages into local state on update
  useEffect(() => {
    setLocalChatRoomMessages(gameState.chatRoomMessages || {});
  }, [gameState.chatRoomMessages]);

  // Listen for new room messages and update local state
  useEffect(() => {
    const handleRoomMessage = (msg) => {
      setLocalChatRoomMessages(prev => {
        const arr = prev[msg.roomId] ? [...prev[msg.roomId]] : [];
        arr.push(msg);
        return { ...prev, [msg.roomId]: arr };
      });
    };
    socket.on('roomMessage', handleRoomMessage);
    return () => socket.off('roomMessage', handleRoomMessage);
  }, [socket]);

  // Listen for main chat messages (traitor/faithful main chat)
  useEffect(() => {
    const handleMessage = (msg) => {
      setLocalChatRoomMessages(prev => {
        const arr = prev[msg.roomId] ? [...prev[msg.roomId]] : [];
        arr.push(msg);
        return { ...prev, [msg.roomId]: arr };
      });
    };
    socket.on('message', handleMessage);
    return () => socket.off('message', handleMessage);
  }, [socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameState.chatRoomMessages, privateMessages]);

  // Typing indicator logic
  useEffect(() => {
    if (message && !isTyping) {
      setIsTyping(true);
      socket.emit('typing', { isTyping: true, roomId: activeRoom || chatRoom });
    } else if (!message && isTyping) {
      setIsTyping(false);
      socket.emit('typing', { isTyping: false, roomId: activeRoom || chatRoom });
    }

    // Clear typing indicator after 3 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (message) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing', { isTyping: false, roomId: activeRoom || chatRoom });
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, socket, activeRoom, chatRoom]);

  // Listen for typing events
  useEffect(() => {
    const handleTyping = ({ playerId, playerName, isTyping: userTyping }) => {
      if (playerId === socket?.id) return;
      
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (userTyping) {
          newSet.add(playerName);
        } else {
          newSet.delete(playerName);
        }
        return newSet;
      });
    };

    socket.on('userTyping', handleTyping);
    return () => socket.off('userTyping', handleTyping);
  }, [socket]);

  useEffect(() => {
    // Listen for chatRoomInvited event
    const handleChatRoomInvited = ({ roomId, roomName }) => {
      alert(`You have been invited to join room: ${roomName}`);
      onJoinRoom(roomId);
    };
    socket.on('chatRoomInvited', handleChatRoomInvited);
    return () => socket.off('chatRoomInvited', handleChatRoomInvited);
  }, [socket, onJoinRoom]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (activeRoom) {
      onSendRoomMessage();
      setMessage('');
    } else if (activePrivateChat) {
      onSendPrivateMessage();
      setMessage('');
    } else if (canChat) {
      onSendMessage(chatRoom, message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getCurrentChatTitle = () => {
    if (activeRoom) {
      const room = availableRooms.find(r => r.roomId === activeRoom);
      return `Room: ${room?.name || 'Unknown'}`;
    }
    if (activePrivateChat) {
      const player = gameState.players.find(p => p.id === activePrivateChat);
      return `Private: ${player?.name || 'Unknown'}`;
    }
    if (canChat) {
      return 'Group Discussion';
    }
    return 'Chat';
  };

  const getCurrentMessages = () => {
    if (activeRoom) {
      if (localChatRoomMessages && localChatRoomMessages[activeRoom]) {
        return localChatRoomMessages[activeRoom];
      }
      if (gameState.chatRoomMessages && gameState.chatRoomMessages[activeRoom]) {
        return gameState.chatRoomMessages[activeRoom];
      }
      return [];
    }
    if (activePrivateChat) {
      return privateMessages[activePrivateChat] || [];
    }
    // Main chat (traitor/faithful)
    if (localChatRoomMessages && localChatRoomMessages[chatRoom]) {
      return localChatRoomMessages[chatRoom];
    }
    if (gameState.chatRoomMessages && gameState.chatRoomMessages[chatRoom]) {
      return gameState.chatRoomMessages[chatRoom];
    }
    return [];
  };

  const getCurrentRoomMembers = () => {
    if (activeRoom && gameState.allChatRooms) {
      const room = gameState.allChatRooms.find(r => r.roomId === activeRoom);
      return room ? room.members : [];
    }
    return [];
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessage = (msg, index) => {
    const isOwnMessage = msg.playerId === socket?.id || msg.from === socket?.id;
    const isSystem = !msg.playerId && !msg.from;
    return (
      <div
        key={index}
        className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'}${isSystem ? ' system-message' : ''}`}
        style={{
          display: 'flex',
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: 12,
          margin: '12px 0',
          padding: 0,
          background: 'none',
        }}
      >
        {/* Avatar/Initials */}
        {!isSystem && (
          <div
            className="message-avatar"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isOwnMessage
                ? 'linear-gradient(135deg, #ff6b6b 60%, #ee5a24 100%)'
                : 'linear-gradient(135deg, #4ecdc4 60%, #44a08d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              boxShadow: isOwnMessage
                ? '0 2px 12px #ff6b6b55'
                : '0 2px 12px #4ecdc455',
              border: isOwnMessage ? '2px solid #fff' : '2px solid #4ecdc4',
              marginLeft: isOwnMessage ? 0 : 4,
              marginRight: isOwnMessage ? 4 : 0,
            }}
            aria-label={`${msg.playerName}'s avatar`}
          >
            {getInitials(msg.playerName)}
          </div>
        )}
        {/* Message Bubble */}
        <div
          style={{
            background: isSystem
              ? 'linear-gradient(90deg, #333 60%, #444 100%)'
              : isOwnMessage
              ? 'linear-gradient(90deg, #ff6b6b 60%, #ee5a24 100%)'
              : 'linear-gradient(90deg, #222 60%, #4ecdc4 100%)',
            color: isSystem ? '#ffd700' : '#fff',
            borderLeft: isOwnMessage ? '4px solid #ff6b6b' : isSystem ? '4px solid #ffd700' : '4px solid #4ecdc4',
            boxShadow: isOwnMessage ? '0 2px 12px #ff6b6b55' : isSystem ? '0 2px 12px #ffd70055' : '0 2px 12px #4ecdc455',
            fontWeight: isSystem ? 700 : 400,
            fontStyle: isSystem ? 'italic' : 'normal',
            borderRadius: isOwnMessage ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
            padding: '16px 22px',
            fontSize: 17,
            letterSpacing: 0.1,
            minWidth: 80,
            maxWidth: 340,
            position: 'relative',
            overflow: 'hidden',
            marginLeft: isOwnMessage ? 0 : 8,
            marginRight: isOwnMessage ? 8 : 0,
            border: isOwnMessage ? '2px solid #ff6b6b' : '2px solid #4ecdc4',
            transition: 'background 0.3s, box-shadow 0.3s',
          }}
        >
          {!isSystem && (
            <div className="player-name" style={{ color: isOwnMessage ? '#fff' : '#4ecdc4', fontWeight: 700, marginBottom: 2, fontSize: 14 }}>
              {msg.playerName}
            </div>
          )}
          <div className="message-text" style={{ fontSize: 16, color: '#fff', marginBottom: 2 }}>
            {msg.message}
          </div>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
            marginTop: 6,
            textAlign: isOwnMessage ? 'right' : 'left',
            fontStyle: 'italic',
            letterSpacing: 0.1,
          }}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.size === 0) return null;
    
    const typingList = Array.from(typingUsers).join(', ');
    return (
      <div className="typing-indicator" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '14px',
        fontStyle: 'italic',
      }}>
        <div className="typing-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
        <span>{typingList} {typingUsers.size === 1 ? 'is' : 'are'} typing...</span>
      </div>
    );
  };

  // Helper: List of possible private chat targets (alive players except self)
  const privateChatTargets = gameState.players.filter(
    p => p.id !== socket.id && !p.isEliminated
  );

  // Helper: List of available group chat rooms
  const groupRooms = gameState.allChatRooms || [];

  // Helper: List of active private chats (by id)
  const activePrivateChats = Object.keys(privateMessages);

  // UI: Chat mode switcher
  const renderChatMenu = () => (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      background: 'rgba(20,30,40,0.98)',
      zIndex: 3000,
      padding: 24,
      borderRadius: 12,
      boxShadow: '0 2px 16px #0008',
      color: '#fff',
      textAlign: 'left',
      maxWidth: 420,
      margin: '0 auto',
      fontSize: 16
    }}>
      <h3 style={{ marginBottom: 12 }}>Switch Chat</h3>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ marginBottom: 8, width: '100%' }} onClick={() => { setShowChatMenu(false); setActiveRoom(null); setActivePrivateChat(null); }}>
          {playerRole === 'traitor' && gameState.phase === 'traitor_meeting' ? 'Traitor Chat' : playerRole === 'faithful' ? 'Faithful Chat' : 'Main Chat'}
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Group Chat Rooms</div>
        {groupRooms.length === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>No group rooms</div>}
        {groupRooms.map(room => (
          <button key={room.roomId} className="btn btn-secondary" style={{ marginBottom: 6, width: '100%' }} onClick={() => { setShowChatMenu(false); setActiveRoom(room.roomId); setActivePrivateChat(null); }}>
            {room.name} ({room.members.length} members)
          </button>
        ))}
      </div>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Private Chats</div>
        {privateChatTargets.length === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>No available players</div>}
        {privateChatTargets.map(p => (
          <button key={p.id} className="btn btn-secondary" style={{ marginBottom: 6, width: '100%' }} onClick={() => { setShowChatMenu(false); setActivePrivateChat(p.id); setActiveRoom(null); }}>
            {p.name}
          </button>
        ))}
      </div>
      <button className="btn btn-danger" style={{ marginTop: 18, width: '100%' }} onClick={() => setShowChatMenu(false)}>Close</button>
    </div>
  );

  return (
    <div className="chat-container" aria-label="Chat system" style={{ position: 'relative' }}>
      {/* Chat Mode Switcher Button */}
      <button
        className="btn btn-secondary"
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 3100, fontSize: 13 }}
        onClick={() => setShowChatMenu(v => !v)}
        aria-label="Switch chat mode"
      >
        Switch Chat
      </button>
      {showChatMenu && renderChatMenu()}
      <div className="chat-header">
        <div className="chat-title">{getCurrentChatTitle()}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
          {getCurrentMessages().length} messages
        </div>
      </div>

      {/* Show room members if in a group chat */}
      {activeRoom && (
        <div style={{ fontSize: 12, color: '#4ecdc4', marginBottom: 8 }}>
          Members: {getCurrentRoomMembers().join(', ')}
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages" aria-live="polite">
        {getCurrentMessages().map((msg, index) => renderMessage(msg, index))}
        {renderTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input">
        <input
          className="input"
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!canChat && !activeRoom && !activePrivateChat}
          aria-label="Type a message"
        />
        <button
          className="btn"
          onClick={handleSendMessage}
          disabled={!message.trim() || (!canChat && !activeRoom && !activePrivateChat)}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatSystem; 