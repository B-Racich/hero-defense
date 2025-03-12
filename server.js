// server.js
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Single global game state
const gameState = {
  wave: 1,
  enemies: [],
  gameActive: true,
  players: {}
};

// Connection handling
wss.on('connection', (ws) => {
  let playerId;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'register_player':
          playerId = data.playerId || 'player_' + Math.random().toString(36).substring(2, 9);
          
          // Add player to game
          gameState.players[playerId] = { 
            ws, 
            lastSeen: Date.now(),
            heroClass: data.heroClass || null
          };
          
          ws.send(JSON.stringify({ 
            type: 'player_registered', 
            playerId: playerId,
            playerCount: Object.keys(gameState.players).length
          }));
          
          // Notify all players
          broadcastToAll({
            type: 'player_joined',
            playerId: playerId,
            playerCount: Object.keys(gameState.players).length
          }, []);
          
          // Send current game state to new player
          ws.send(JSON.stringify({
            type: 'game_state',
            state: gameState
          }));
          break;
          
        case 'game_state':
          // Update game state
          gameState.wave = data.state.wave || gameState.wave;
          gameState.enemies = data.state.enemies || gameState.enemies;
          gameState.gameActive = data.state.gameActive !== undefined ? data.state.gameActive : gameState.gameActive;
          
          // Broadcast to other players
          broadcastToAll({
            type: 'game_state',
            state: gameState
          }, [playerId]);
          break;
          
        case 'player_update':
          if (!playerId) return;
          
          // Update player's last seen timestamp
          if (gameState.players[playerId]) {
            gameState.players[playerId].lastSeen = Date.now();
            
            // Update hero class if provided
            if (data.data && data.data.heroClass) {
              gameState.players[playerId].heroClass = data.data.heroClass;
            }
          }
          
          // Broadcast player update to other players
          broadcastToAll({
            type: 'player_update',
            playerId: playerId,
            data: data.data
          }, [playerId]);
          break;
          
        case 'chat':
          if (!playerId) return;
          
          // Broadcast chat message to all players
          broadcastToAll({
            type: 'chat',
            playerId: playerId,
            message: data.message
          }, []);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    if (playerId && gameState.players[playerId]) {
      // Remove player from game
      delete gameState.players[playerId];
      
      // Notify remaining players
      broadcastToAll({
        type: 'player_left',
        playerId: playerId,
        playerCount: Object.keys(gameState.players).length
      }, []);
    }
  });
});

// Utility function to broadcast to all players
function broadcastToAll(message, excludePlayers = []) {
  const messageStr = JSON.stringify(message);
  
  Object.entries(gameState.players).forEach(([id, player]) => {
    if (!excludePlayers.includes(id) && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(messageStr);
    }
  });
}

// Clean up inactive players periodically
setInterval(() => {
  const now = Date.now();
  
  Object.keys(gameState.players).forEach(playerId => {
    const player = gameState.players[playerId];
    
    // Remove players inactive for more than 30 seconds
    if (now - player.lastSeen > 30000) {
      delete gameState.players[playerId];
      
      // Notify remaining players
      broadcastToAll({
        type: 'player_disconnected',
        playerId: playerId,
        playerCount: Object.keys(gameState.players).length
      }, []);
    }
  });
}, 10000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});