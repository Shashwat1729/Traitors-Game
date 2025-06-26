#!/usr/bin/env node

const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

const GAME_PHASES = {
  LOBBY: 'lobby',
  ROLE_ASSIGNMENT: 'role_assignment',
  TRAITOR_MEETING: 'traitor_meeting',
  GROUP_DISCUSSION: 'group_discussion',
  VOTING: 'voting',
  RECRUITMENT: 'recruitment',
  GAME_OVER: 'game_over'
};

const PHASE_DURATIONS = {
  [GAME_PHASES.ROLE_ASSIGNMENT]: 10, // seconds for demo
  [GAME_PHASES.TRAITOR_MEETING]: 10,
  [GAME_PHASES.GROUP_DISCUSSION]: 10,
  [GAME_PHASES.VOTING]: 10,
  [GAME_PHASES.RECRUITMENT]: 10
};

function calculateTraitorCount(playerCount) {
  if (playerCount >= 6 && playerCount <= 8) return 2;
  if (playerCount >= 9 && playerCount <= 10) return 3;
  if (playerCount >= 11 && playerCount <= 12) return 4;
  return 2;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

class TerminalGame {
  constructor() {
    this.players = [];
    this.phase = GAME_PHASES.LOBBY;
    this.traitors = [];
    this.faithful = [];
    this.eliminated = [];
    this.votes = new Map();
    this.traitorCount = 0;
    this.winner = null;
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    this.currentPlayerIndex = 0;
    this.recruitmentOffer = null;
  }

  async start() {
    await this.setupPlayers();
    this.assignRoles();
    await this.phaseLoop();
    this.rl.close();
  }

  async setupPlayers() {
    console.log('Welcome to The Traitors (Terminal Edition)!');
    let playerCount = 0;
    while (playerCount < 6 || playerCount > 12) {
      playerCount = parseInt(await this.ask('Enter number of players (6-12): '), 10);
    }
    this.traitorCount = calculateTraitorCount(playerCount);
    for (let i = 0; i < playerCount; i++) {
      let name = '';
      while (!name) {
        name = await this.ask(`Enter name for player ${i + 1}: `);
      }
      this.players.push({
        id: uuidv4(),
        name,
        role: null,
        isEliminated: false,
        hasVoted: false
      });
    }
    console.log(`Traitors: <= ${this.traitorCount}`);
  }

  assignRoles() {
    const shuffled = shuffle([...this.players]);
    for (let i = 0; i < this.traitorCount; i++) {
      shuffled[i].role = 'traitor';
      this.traitors.push(shuffled[i]);
    }
    for (let i = this.traitorCount; i < shuffled.length; i++) {
      shuffled[i].role = 'faithful';
      this.faithful.push(shuffled[i]);
    }
    // Secretly inform each player
    for (const p of this.players) {
      console.log(`(Secret) ${p.name}, your role is: ${p.role.toUpperCase()}`);
    }
  }

  async phaseLoop() {
    while (!this.winner) {
      switch (this.phase) {
        case GAME_PHASES.ROLE_ASSIGNMENT:
          await this.roleAssignmentPhase();
          break;
        case GAME_PHASES.TRAITOR_MEETING:
          await this.traitorMeetingPhase();
          break;
        case GAME_PHASES.GROUP_DISCUSSION:
          await this.groupDiscussionPhase();
          break;
        case GAME_PHASES.VOTING:
          await this.votingPhase();
          break;
        case GAME_PHASES.RECRUITMENT:
          await this.recruitmentPhase();
          break;
        case GAME_PHASES.GAME_OVER:
          this.gameOverPhase();
          return;
        default:
          this.phase = GAME_PHASES.ROLE_ASSIGNMENT;
      }
    }
  }

  async roleAssignmentPhase() {
    this.phase = GAME_PHASES.TRAITOR_MEETING;
    console.log('\n--- Role Assignment Complete ---\n');
  }

  async traitorMeetingPhase() {
    this.phase = GAME_PHASES.GROUP_DISCUSSION;
    const traitorNames = this.traitors.filter(t => !t.isEliminated).map(t => t.name);
    console.log(`\n[Traitors' Secret Meeting] Traitors: ${traitorNames.join(', ')}`);
    await this.wait(PHASE_DURATIONS[GAME_PHASES.TRAITOR_MEETING]);
  }

  async groupDiscussionPhase() {
    this.phase = GAME_PHASES.VOTING;
    const faithfulNames = this.faithful.filter(f => !f.isEliminated).map(f => f.name);
    console.log(`\n[Group Discussion] Faithful: ${faithfulNames.join(', ')}`);
    await this.wait(PHASE_DURATIONS[GAME_PHASES.GROUP_DISCUSSION]);
  }

  async votingPhase() {
    this.votes.clear();
    for (const p of this.players.filter(p => !p.isEliminated)) {
      let vote = '';
      while (!vote) {
        vote = await this.ask(`[Voting] ${p.name}, who do you vote to eliminate? (type name): `);
        const target = this.players.find(pl => pl.name.toLowerCase() === vote.toLowerCase() && !pl.isEliminated && pl.id !== p.id);
        if (!target) {
          console.log('Invalid choice.');
          vote = '';
        } else {
          this.votes.set(p.id, target.id);
        }
      }
    }
    this.processVotes();
  }

  processVotes() {
    const voteCounts = {};
    for (const votedFor of this.votes.values()) {
      voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    }
    const eliminatedId = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
    this.eliminatePlayer(eliminatedId);
  }

  eliminatePlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    player.isEliminated = true;
    console.log(`\n${player.name} has been eliminated! They were a ${player.role.toUpperCase()}.`);
    if (player.role === 'traitor') {
      this.traitors = this.traitors.filter(t => t.id !== playerId);
      // Offer recruitment
      this.recruitmentOffer = {
        eliminatedTraitor: player,
        availableFaithful: this.faithful.filter(f => !f.isEliminated)
      };
      this.phase = GAME_PHASES.RECRUITMENT;
    } else {
      this.faithful = this.faithful.filter(f => f.id !== playerId);
      this.checkGameEnd();
      if (!this.winner) this.phase = GAME_PHASES.TRAITOR_MEETING;
    }
  }

  async recruitmentPhase() {
    const offer = this.recruitmentOffer;
    if (!offer || offer.availableFaithful.length === 0) {
      this.phase = GAME_PHASES.TRAITOR_MEETING;
      return;
    }
    const faithful = offer.availableFaithful[0]; // For demo, just offer to first available
    let response = '';
    while (!['y', 'n'].includes(response)) {
      response = (await this.ask(`\n${faithful.name}, do you accept recruitment to become a Traitor? (y/n): `)).toLowerCase();
    }
    if (response === 'y') {
      faithful.role = 'traitor';
      this.traitors.push(faithful);
      this.faithful = this.faithful.filter(f => f.id !== faithful.id);
      console.log(`${faithful.name} has joined the Traitors!`);
    } else {
      console.log(`${faithful.name} remains Faithful.`);
    }
    this.recruitmentOffer = null;
    this.checkGameEnd();
    if (!this.winner) this.phase = GAME_PHASES.TRAITOR_MEETING;
  }

  checkGameEnd() {
    const activeTraitors = this.traitors.filter(t => !t.isEliminated);
    const activeFaithful = this.faithful.filter(f => !f.isEliminated);
    if (activeTraitors.length === 0) {
      this.winner = 'faithful';
      this.phase = GAME_PHASES.GAME_OVER;
    } else if (activeTraitors.length >= activeFaithful.length) {
      this.winner = 'traitors';
      this.phase = GAME_PHASES.GAME_OVER;
    }
  }

  gameOverPhase() {
    console.log('\n=== GAME OVER ===');
    if (this.winner === 'faithful') {
      console.log('The Faithful win! All Traitors have been eliminated.');
    } else {
      console.log('The Traitors win! They have taken control.');
    }
    console.log('Final roles:');
    for (const p of this.players) {
      console.log(`${p.name}: ${p.role.toUpperCase()}${p.isEliminated ? ' (Eliminated)' : ''}`);
    }
  }

  wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  ask(question) {
    return new Promise(resolve => this.rl.question(question, answer => resolve(answer)));
  }
}

if (require.main === module) {
  (async () => {
    const game = new TerminalGame();
    await game.start();
  })();
} 