const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Game state management
const games = new Map();
const players = new Map();

// Game phases
const GAME_PHASES = {
  LOBBY: 'lobby',
  ROLE_ASSIGNMENT: 'role_assignment',
  TRAITOR_MEETING: 'traitor_meeting',
  GROUP_DISCUSSION: 'group_discussion',
  VOTING: 'voting',
  RECRUITMENT: 'recruitment',
  GAME_OVER: 'game_over'
};

// Phase durations in seconds
const PHASE_DURATIONS = {
  [GAME_PHASES.ROLE_ASSIGNMENT]: 120,
  [GAME_PHASES.TRAITOR_MEETING]: 180,
  [GAME_PHASES.GROUP_DISCUSSION]: 300,
  [GAME_PHASES.VOTING]: 180,
  [GAME_PHASES.RECRUITMENT]: 60
};

class Game {
  constructor(gameId, hostId, playerCount) {
    this.gameId = gameId;
    this.hostId = hostId;
    this.playerCount = playerCount;
    this.players = new Map();
    this.phase = GAME_PHASES.LOBBY;
    this.phaseTimer = null;
    this.phaseEndTime = null;
    this.traitors = new Set();
    this.faithful = new Set();
    this.eliminated = new Set();
    this.votes = new Map();
    this.chatRooms = new Map();
    this.recruitmentOffer = null;
    this.privateChats = new Map();
    this.traitorConsensusVotes = {};
    this.traitorKillVotes = {};
    
    // Calculate number of traitors based on player count
    this.traitorCount = this.calculateTraitorCount();
  }

  calculateTraitorCount() {
    if (this.playerCount >= 6 && this.playerCount <= 8) return 2;
    if (this.playerCount >= 9 && this.playerCount <= 10) return 3;
    if (this.playerCount >= 11 && this.playerCount <= 12) return 4;
    return 2; // fallback for <6
  }

  addPlayer(playerId, playerName) {
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      role: null,
      isHost: playerId === this.hostId,
      isEliminated: false,
      hasVoted: false
    });
  }

  assignRoles() {
    const playerIds = Array.from(this.players.keys());
    const shuffled = playerIds.sort(() => Math.random() - 0.5);
    
    // Assign traitors
    for (let i = 0; i < this.traitorCount; i++) {
      const traitorId = shuffled[i];
      this.players.get(traitorId).role = 'traitor';
      this.traitors.add(traitorId);
    }
    
    // Assign faithful
    for (let i = this.traitorCount; i < shuffled.length; i++) {
      const faithfulId = shuffled[i];
      this.players.get(faithfulId).role = 'faithful';
      this.faithful.add(faithfulId);
    }
  }

  startPhase(phase) {
    this.phase = phase;
    this.phaseEndTime = Date.now() + (PHASE_DURATIONS[phase] * 1000);
    
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }
    
    this.phaseTimer = setTimeout(() => {
      this.endPhase();
    }, PHASE_DURATIONS[phase] * 1000);
    
    this.broadcastGameState();
  }

  endPhase() {
    switch (this.phase) {
      case GAME_PHASES.ROLE_ASSIGNMENT:
        this.startPhase(GAME_PHASES.TRAITOR_MEETING);
        break;
      case GAME_PHASES.TRAITOR_MEETING:
        this.startPhase(GAME_PHASES.GROUP_DISCUSSION);
        break;
      case GAME_PHASES.GROUP_DISCUSSION:
        this.startPhase(GAME_PHASES.VOTING);
        break;
      case GAME_PHASES.VOTING:
        this.processVotes();
        break;
      case GAME_PHASES.RECRUITMENT:
        this.startPhase(GAME_PHASES.TRAITOR_MEETING);
        break;
    }
  }

  processVotes() {
    const voteCounts = {};
    this.votes.forEach((votedFor) => {
      voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    });
    
    const eliminatedPlayer = Object.keys(voteCounts).reduce((a, b) => 
      voteCounts[a] > voteCounts[b] ? a : b
    );
    
    this.eliminatePlayer(eliminatedPlayer);
  }

  eliminatePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    
    player.isEliminated = true;
    this.eliminated.add(playerId);
    
    if (player.role === 'traitor') {
      this.traitors.delete(playerId);
      // Offer recruitment
      this.recruitmentOffer = {
        eliminatedTraitor: playerId,
        availableFaithful: Array.from(this.faithful).filter(id => !this.players.get(id).isEliminated)
      };
      this.startPhase(GAME_PHASES.RECRUITMENT);
    } else {
      this.faithful.delete(playerId);
      this.checkGameEnd();
    }
    
    this.broadcastGameState();
  }

  checkGameEnd() {
    const activeTraitors = Array.from(this.traitors).filter(id => !this.players.get(id).isEliminated);
    const activeFaithful = Array.from(this.faithful).filter(id => !this.players.get(id).isEliminated);
    
    if (activeTraitors.length === 0) {
      this.endGame('faithful');
    } else if (activeTraitors.length >= activeFaithful.length) {
      this.endGame('traitors');
    }
  }

  endGame(winner) {
    this.phase = GAME_PHASES.GAME_OVER;
    this.winner = winner;
    this.broadcastGameState();
    // Clean up after some time
    setTimeout(() => {
      games.delete(this.gameId);
    }, 30000);
  }

  broadcastGameState() {
    // Send personalized game state to each player
    this.players.forEach((playerData, playerId) => {
      io.to(playerId).emit('gameState', this.getGameState(playerId));
    });
  }

  getGameState(playerId = null) {
    const playersList = Array.from(this.players.values()).map(player => ({
      id: player.id,
      name: player.name,
      role: this.phase === GAME_PHASES.GAME_OVER ? player.role : null,
      isHost: player.isHost,
      isEliminated: player.isEliminated,
      hasVoted: player.hasVoted
    }));

    // If playerId is provided, include their chat rooms and visible messages
    let chatRooms = [];
    let chatRoomMessages = {};
    if (playerId) {
      chatRooms = this.getPlayerChatRooms(playerId);
      for (const { roomId } of chatRooms) {
        chatRoomMessages[roomId] = this.getVisibleRoomMessages(roomId, playerId);
      }
    }

    // Add all chat rooms with members for all alive players
    let allChatRooms = [];
    if (this.phase === GAME_PHASES.GROUP_DISCUSSION) {
      allChatRooms = Array.from(this.chatRooms.entries()).map(([roomId, room]) => ({
        roomId,
        name: room.name,
        members: Array.from(room.members).map(id => this.players.get(id)?.name || id)
      }));
    }

    // Calculate traitor count display
    let traitorCountDisplay = `<= ${this.traitorCount}`;

    // If player is a traitor, add traitorNames (excluding self)
    let traitorNames = [];
    if (playerId && this.players.get(playerId)?.role === 'traitor') {
      traitorNames = Array.from(this.traitors)
        .filter(id => id !== playerId)
        .map(id => this.players.get(id)?.name || id);
    }

    return {
      gameId: this.gameId,
      phase: this.phase,
      phaseEndTime: this.phaseEndTime,
      players: playersList,
      traitorCount: traitorCountDisplay,
      votes: this.votes,
      recruitmentOffer: this.recruitmentOffer,
      winner: this.phase === GAME_PHASES.GAME_OVER ? this.winner : null,
      chatRooms,
      allChatRooms,
      chatRoomMessages,
      traitorNames
    };
  }

  // Faithful can create a chat room
  createChatRoom(roomName, creatorId) {
    const roomId = uuidv4();
    this.chatRooms.set(roomId, {
      name: roomName,
      members: new Set([creatorId]),
      messages: [],
      joinTimestamps: new Map([[creatorId, Date.now()]])
    });
    return roomId;
  }

  // Join a chat room
  joinChatRoom(roomId, playerId) {
    const room = this.chatRooms.get(roomId);
    if (room) {
      room.members.add(playerId);
      room.joinTimestamps.set(playerId, Date.now());
    }
  }

  // Add message to chat room
  addChatMessage(roomId, messageObj) {
    const room = this.chatRooms.get(roomId);
    if (room) {
      room.messages.push(messageObj);
      // Limit messages to last 100
      if (room.messages.length > 100) room.messages.shift();
    }
  }

  // Private chat key
  getPrivateChatKey(id1, id2) {
    return [id1, id2].sort().join('-');
  }

  // Add message to private chat
  addPrivateMessage(id1, id2, messageObj) {
    const key = this.getPrivateChatKey(id1, id2);
    if (!this.privateChats.has(key)) this.privateChats.set(key, []);
    const arr = this.privateChats.get(key);
    arr.push(messageObj);
    if (arr.length > 100) arr.shift();
  }

  // Get chat room info for a player
  getPlayerChatRooms(playerId) {
    const rooms = [];
    for (const [roomId, room] of this.chatRooms.entries()) {
      if (room.members.has(playerId)) {
        rooms.push({ roomId, name: room.name });
      }
    }
    return rooms;
  }

  getVisibleRoomMessages(roomId, playerId) {
    const room = this.chatRooms.get(roomId);
    if (!room || !room.members.has(playerId)) return [];
    const joinTime = room.joinTimestamps.get(playerId) || 0;
    return room.messages.filter(msg => msg.timestamp >= joinTime);
  }
}

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  players.set(socket.id, { id: socket.id, gameId: null });

  socket.on('createGame', ({ playerName, playerCount }) => {
    const gameId = uuidv4();
    const game = new Game(gameId, socket.id, playerCount);
    game.addPlayer(socket.id, playerName);
    games.set(gameId, game);
    players.get(socket.id).gameId = gameId;
    
    socket.join(gameId);
    socket.emit('gameCreated', { gameId, gameState: game.getGameState() });
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.players.size >= game.playerCount) {
      socket.emit('error', { message: 'Game is full' });
      return;
    }
    
    game.addPlayer(socket.id, playerName);
    players.get(socket.id).gameId = gameId;
    socket.join(gameId);
    
    game.broadcastGameState();

    // Auto-start the game if lobby is full
    if (game.players.size === game.playerCount) {
      console.log(`[AUTO-START] Lobby full for game ${gameId}. Starting game...`);
      game.assignRoles();
      game.startPhase(GAME_PHASES.ROLE_ASSIGNMENT);
      // Send role to each player (personalized game state)
      game.players.forEach((playerData, playerId) => {
        let traitorNames = [];
        if (playerData.role === 'traitor') {
          traitorNames = Array.from(game.traitors)
            .filter(id => id !== playerId)
            .map(id => game.players.get(id).name);
        }
        io.to(playerId).emit('roleAssignment', {
          role: playerData.role,
          traitorNames,
          gameState: game.getGameState(playerId)
        });
      });
      // Force broadcast game state to all
      game.broadcastGameState();
    }
  });

  socket.on('vote', ({ targetPlayerId }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game || game.phase !== GAME_PHASES.VOTING) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated || playerData.hasVoted) return;

    // Traitor consensus voting
    if (playerData.role === 'traitor') {
      // Store traitor votes separately
      if (!game.traitorConsensusVotes) game.traitorConsensusVotes = {};
      game.traitorConsensusVotes[socket.id] = targetPlayerId;
      playerData.hasVoted = true;
      // Check if all traitors have voted
      const traitorIds = Array.from(game.traitors).filter(id => !game.players.get(id).isEliminated);
      const allVoted = traitorIds.every(id => game.players.get(id).hasVoted);
      if (allVoted) {
        // Check if all traitors voted for the same target
        const votes = traitorIds.map(id => game.traitorConsensusVotes[id]);
        const consensusTarget = votes[0];
        const unanimous = votes.every(v => v === consensusTarget);
        if (unanimous) {
          // Cast a single block vote for all traitors
          traitorIds.forEach(id => game.votes.set(id, consensusTarget));
          // Broadcast consensus reached to traitors
          traitorIds.forEach(id => io.to(id).emit('traitorConsensus', { consensus: true, target: consensusTarget }));
          game.broadcastGameState();
        } else {
          // Not unanimous, inform traitors
          traitorIds.forEach(id => io.to(id).emit('traitorConsensus', { consensus: false }));
          // Reset traitor votes for another round
          traitorIds.forEach(id => { game.players.get(id).hasVoted = false; });
          game.traitorConsensusVotes = {};
          game.broadcastGameState();
        }
      } else {
        // Wait for all traitors to vote
        io.to(socket.id).emit('traitorConsensus', { consensus: null });
        game.broadcastGameState();
      }
      return;
    }

    // Faithful and others vote as normal
    game.votes.set(socket.id, targetPlayerId);
    playerData.hasVoted = true;
    game.broadcastGameState();
  });

  socket.on('recruitmentResponse', ({ accept }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    
    if (!game || game.phase !== GAME_PHASES.RECRUITMENT) return;
    
    if (accept) {
      const playerData = game.players.get(socket.id);
      playerData.role = 'traitor';
      game.faithful.delete(socket.id);
      game.traitors.add(socket.id);
    }
    
    game.recruitmentOffer = null;
    game.startPhase(GAME_PHASES.TRAITOR_MEETING);
  });

  socket.on('sendMessage', ({ roomId, message }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    
    if (!game) return;
    
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated) return;
    
    // Check if player can send message in current phase
    if (roomId === 'traitor' && game.phase === GAME_PHASES.TRAITOR_MEETING && playerData.role === 'traitor') {
      io.to(game.gameId).emit('message', {
        roomId,
        playerId: socket.id,
        playerName: playerData.name,
        message,
        timestamp: Date.now()
      });
    } else if (roomId === 'faithful' && game.phase === GAME_PHASES.GROUP_DISCUSSION && playerData.role === 'faithful') {
      io.to(game.gameId).emit('message', {
        roomId,
        playerId: socket.id,
        playerName: playerData.name,
        message,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const player = players.get(socket.id);
    if (player && player.gameId) {
      const game = games.get(player.gameId);
      if (game) {
        game.players.delete(socket.id);
        game.broadcastGameState();
      }
    }
    players.delete(socket.id);
  });

  // Faithful create chat room
  socket.on('createChatRoom', ({ roomName }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game || game.phase !== GAME_PHASES.GROUP_DISCUSSION) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated) return;
    // Allow any alive player to create a chat room
    const roomId = game.createChatRoom(roomName, socket.id);
    socket.join(roomId);
    game.broadcastGameState();
    io.to(socket.id).emit('chatRoomCreated', { roomId, roomName });
  });

  // Faithful join chat room
  socket.on('joinChatRoom', ({ roomId }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game || game.phase !== GAME_PHASES.GROUP_DISCUSSION) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated) return;
    // Allow any alive player to join a chat room
    game.joinChatRoom(roomId, socket.id);
    socket.join(roomId);
    game.broadcastGameState();
  });

  // Send message to chat room
  socket.on('sendRoomMessage', ({ roomId, message }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated) return;
    const room = game.chatRooms.get(roomId);
    // Allow any alive player to send messages in Group Discussion phase
    if (
      game.phase === GAME_PHASES.GROUP_DISCUSSION &&
      room && room.members.has(socket.id)
    ) {
      const msgObj = {
        roomId,
        playerId: socket.id,
        playerName: playerData.name,
        message,
        timestamp: Date.now()
      };
      game.addChatMessage(roomId, msgObj);
      io.to(roomId).emit('roomMessage', msgObj);
      game.broadcastGameState();
    }
  });

  // Start private chat
  socket.on('startPrivateChat', ({ targetId }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated) return;
    const key = game.getPrivateChatKey(socket.id, targetId);
    // Notify both users
    io.to(socket.id).emit('privateChatStarted', { targetId });
    io.to(targetId).emit('privateChatStarted', { targetId: socket.id });
  });

  // Send private message
  socket.on('sendPrivateMessage', ({ targetId, message }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated) return;
    const msgObj = {
      from: socket.id,
      to: targetId,
      playerName: playerData.name,
      message,
      timestamp: Date.now()
    };
    game.addPrivateMessage(socket.id, targetId, msgObj);
    io.to(socket.id).emit('privateMessage', msgObj);
    io.to(targetId).emit('privateMessage', msgObj);
  });

  // Add inviteToChatRoom event
  socket.on('inviteToChatRoom', ({ roomId, targetId }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game || game.phase !== GAME_PHASES.GROUP_DISCUSSION) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated) return;
    const room = game.chatRooms.get(roomId);
    if (!room || !room.members.has(socket.id)) return;
    room.members.add(targetId);
    game.broadcastGameState();
    io.to(targetId).emit('chatRoomInvited', { roomId, roomName: room.name });
  });

  // Add socket event for traitor night kill voting
  socket.on('traitorNightKillVote', ({ targetPlayerId }) => {
    const player = players.get(socket.id);
    const game = games.get(player.gameId);
    if (!game || game.phase !== GAME_PHASES.TRAITOR_MEETING) return;
    const playerData = game.players.get(socket.id);
    if (playerData.isEliminated || playerData.role !== 'traitor') return;
    if (!game.traitorKillVotes) game.traitorKillVotes = {};
    game.traitorKillVotes[socket.id] = targetPlayerId;
    // Check if all traitors have voted
    const traitorIds = Array.from(game.traitors).filter(id => !game.players.get(id).isEliminated);
    const allVoted = traitorIds.every(id => game.traitorKillVotes[id]);
    if (allVoted) {
      // Check if all traitors voted for the same target
      const votes = traitorIds.map(id => game.traitorKillVotes[id]);
      const consensusTarget = votes[0];
      const unanimous = votes.every(v => v === consensusTarget);
      if (unanimous) {
        // Eliminate the target
        game.eliminatePlayer(consensusTarget);
        // Broadcast consensus reached to traitors
        traitorIds.forEach(id => io.to(id).emit('traitorNightKillConsensus', { consensus: true, target: consensusTarget }));
        // Proceed to group discussion
        game.traitorKillVotes = {};
        game.startPhase(GAME_PHASES.GROUP_DISCUSSION);
      } else {
        // Not unanimous, inform traitors
        traitorIds.forEach(id => io.to(id).emit('traitorNightKillConsensus', { consensus: false }));
        // Reset traitor votes for another round
        game.traitorKillVotes = {};
      }
    } else {
      // Wait for all traitors to vote
      io.to(socket.id).emit('traitorNightKillConsensus', { consensus: null });
    }
  });
});

// API routes
app.get('/api/games', (req, res) => {
  const gameList = Array.from(games.values()).map(game => ({
    gameId: game.gameId,
    playerCount: game.playerCount,
    currentPlayers: game.players.size,
    phase: game.phase
  }));
  res.json(gameList);
});

app.get('/api/games/:gameId', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game.getGameState());
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 