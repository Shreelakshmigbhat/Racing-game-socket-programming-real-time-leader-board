
---

# Racing Game using Socket Programming with Real Time Leaderboard

## Overview

This project implements a real time multiplayer racing game using socket based communication. Multiple players can participate simultaneously, with their positions and progress synchronized across all connected clients. The system maintains a live leaderboard that updates instantly as the race progresses.

The project is designed to demonstrate core Computer Networks principles through a practical and interactive application.

---

## Objectives

The main objective of this project is to build a real time distributed system that ensures consistent game state across multiple clients. It also aims to illustrate how low latency communication can be achieved using event driven socket programming.

---

## Features

Real time multiplayer interaction
Live leaderboard with continuous updates
Client server architecture
Low latency communication using Socket.IO
Synchronized game state across all players

---

## Technology Stack

Frontend
HTML CSS JavaScript
Vite for development and bundling

Backend
Node.js
Express.js
Socket.IO

---

## System Architecture

The application follows a centralized client server model.

The server is responsible for maintaining the global game state and handling communication between clients. Each client sends updates such as player movement or game events to the server. The server processes these events and broadcasts the updated state to all connected clients.

This architecture ensures that all players see a consistent and synchronized view of the game in real time.

---

## Working Principle

1. A client connects to the server using Socket.IO
2. The server assigns a session and tracks the player
3. Player actions are emitted as events to the server
4. The server updates the game state
5. Updated data is broadcast to all clients
6. Leaderboard is recalculated dynamically and pushed to all users

---

## Installation and Setup

### Prerequisites

Node.js installed
NPM installed

### Steps

Clone the repository

```bash
git clone https://github.com/Shreelakshmigbhat/Racing-game-socket-programming-real-time-leader-board.git
```

Navigate to the project directory

```bash
cd Racing-game-socket-programming-real-time-leader-board
```

Install dependencies

```bash
npm install
```

Run the backend server

```bash
node server.js
```

Run the frontend

```bash
npm run dev
```

Open the application in your browser using the local host address provided in the terminal

---

## Project Structure

```
project-root

server.js                Backend logic and socket handling  
package.json             Dependencies and scripts  
src or public            Frontend files  
game logic               Player movement and race handling  
leaderboard module       Ranking and updates  
```

---

## Computer Networks Concepts Demonstrated

Client server architecture
Socket based communication
Event driven programming
Real time data synchronization
Latency handling in distributed systems

---

## Applications

This project is suitable for academic demonstrations, especially in Computer Networks and Distributed Systems courses. It can also serve as a foundation for building more advanced multiplayer games.

---

## Future Scope

Integration with database for persistent leaderboard
User authentication and profiles
Improved graphics and game physics
Deployment on cloud platforms
Support for larger number of concurrent users

---

## Contributors

Shreelakshmi G Bhat

---

## License

This project is developed for academic and educational purposes.

---

