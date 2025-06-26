# 🦹 The Traitors Game 🛡️

A web-based multiplayer social deduction game inspired by the hit TV series "The Traitors". Players are secretly assigned roles as either Traitors or Faithful, engaging in strategic gameplay involving deception, voting, and elimination.

## 🎮 Game Overview

The Traitors Game is a real-time multiplayer experience where players must use strategy, deception, and deduction to achieve their objectives:

- **Faithful**: Identify and eliminate all Traitors to win
- **Traitors**: Eliminate Faithful players and avoid detection to win

## ✨ Features

### 🎯 Core Gameplay
- **6-12 Players**: Configurable game size with balanced role distribution
- **Secret Role Assignment**: Computer randomly assigns roles (kept secret)
- **Timed Phases**: Structured gameplay with specific time limits
- **Real-time Chat**: Multiple chat systems for different phases
- **Voting System**: Circle of Doubt voting with real-time results
- **Recruitment Mechanics**: Eliminated Traitors can recruit Faithful players

### 🎨 Visual Design
- **Dark Castle Theme**: Atmospheric design inspired by the TV series
- **Player Avatars**: Unique avatars with role-based styling
- **Phase Transitions**: Dramatic animations between game phases
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Timers**: Prominent countdown timers for each phase

### 💬 Communication Systems
- **Role-based Chat**: Traitors and Faithful have separate chat phases
- **Multiple Chat Rooms**: All alive players can create and join discussion rooms during group discussion
- **Private Chats**: Individual 1-on-1 conversations between players
- **Message History**: Persistent chat history within each session
- **Chat Mode Switcher**: Seamlessly switch between main chat, group rooms, and private chats

### 🏆 Game Phases
1. **Role Assignment** (2 min): Players receive their secret roles
2. **Traitors' Meeting** (3 min): Traitors secretly discuss and plan
3. **Group Discussion** (5 min): All alive players strategize and form alliances
4. **Circle of Doubt** (3 min): All players vote to eliminate someone
5. **Recruitment** (1 min): Eliminated Traitors can recruit Faithful (if applicable)

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher recommended)
- npm (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Traitors
   ```

2. **Install dependencies**
   ```bash
   # In the root directory
   npm install

   # Install client dependencies
   cd client
   npm install
   ```

### Running the Game

You need to start both the server and the client:

#### Start the server
```bash
# From the root directory
npm start
```
This starts the backend server on port 3001 by default.

#### Start the client
```bash
cd client
npm start
```
This starts the React frontend on port 3000 by default.

### Open the game in your browser
Navigate to [http://localhost:3000](http://localhost:3000) to play.

## 🎯 How to Play

### Creating a Game
1. Enter your name and choose the number of players (6-12)
2. Click "Create Game" to generate a unique Game ID
3. Share the Game ID with other players
4. Wait for all players to join
5. The game will start automatically when the lobby is full

### Joining a Game
1. Enter the Game ID provided by the host
2. Enter your name
3. Click "Join Game"
4. Wait for the game to start

### Gameplay
1. **Role Assignment**: You'll receive a private message revealing your role
2. **Traitors' Meeting**: If you're a Traitor, use the secret chat to coordinate
3. **Group Discussion**: All alive players can create/join group chat rooms, send messages, and strategize
4. **Private Chat**: Start private chats with any alive player at any time
5. **Voting**: All alive players vote to eliminate someone. Traitors must reach consensus for night kills
6. **Recruitment**: If a Traitor is eliminated, they may offer to recruit you
7. **Repeat**: Continue until one team wins

## 💬 Chat System
- Switch between main chat, group rooms, and private chats using the chat mode switcher ("Switch Chat" button in the chat area)
- Traitor chat is only available to traitors during the traitor meeting
- Group chat rooms can be created, joined, and messages are only visible to members from the time they join
- Private chat is available with any alive player

## ♿ Accessibility & UI
- Fully keyboard navigable
- ARIA live regions and labels
- High-contrast and reduced-motion support
- Responsive and modern design

## 🏗️ Technical Architecture

### Backend (Node.js + Express + Socket.io)
- Real-time Communication: WebSocket connections for live updates
- Game State Management: Centralized game logic and state
- Role Assignment: Secure random role distribution
- Phase Management: Automated phase transitions and timers
- Chat System: Multiple chat rooms and private messaging

### Frontend (React + Socket.io Client)
- Component-based UI: Modular, reusable components
- Real-time Updates: Live game state synchronization
- Responsive Design: Mobile-first approach
- Accessibility: Keyboard navigation and screen reader support

## 🐛 Troubleshooting
- If you encounter issues, ensure both server and client are running and you have the correct Node.js version
- For development, you may need to allow CORS or adjust ports if running on a different environment

## 📱 Mobile Support

The game is fully responsive and optimized for:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablet devices (iPad, Android tablets)
- Mobile phones (iOS, Android)

## 🔒 Security Features

- Server-side role validation
- Anti-cheat measures
- Secure WebSocket connections
- Input validation and sanitization
- Role secrecy enforcement

## 🚀 Future Enhancements

- [ ] Custom game modes
- [ ] Statistics tracking
- [ ] Achievement system
- [ ] Tournament mode
- [ ] Mobile app version
- [ ] Voice chat integration
- [ ] Custom avatars and themes
- [ ] Spectator mode

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Enjoy playing The Traitors Game!** 🎮✨ 