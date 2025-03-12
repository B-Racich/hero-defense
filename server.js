// server.js
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Room management
const rooms = {};

// Connection handling
wss.on('connection', (ws) => {
  let playerId;
  let roomId;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'create_room':
          roomId = generateRoomId();
          playerId = data.playerId;
          
          rooms[roomId] = { 
            host: playerId,
            players: { [playerId]: { ws, lastSeen: Date.now() } },
            state: {
              wave: 1,
              enemies: [],
              gameActive: false
            }
          };
          
          ws.send(JSON.stringify({ 
            type: 'room_created', 
            roomId: roomId 
          }));
          break;
          
        case 'join_room':
          roomId = data.roomId;
          playerId = data.playerId;
          
          if (!rooms[roomId]) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Room not found' 
            }));
            return;
          }
          
          // Add player to room
          rooms[roomId].players[playerId] = { ws, lastSeen: Date.now() };
          
          // Notify all players in room
          broadcastToRoom(roomId, {
            type: 'player_joined',
            playerId: playerId,
            playerCount: Object.keys(rooms[roomId].players).length
          }, []);
          
          // Send current game state to new player
          ws.send(JSON.stringify({
            type: 'game_state',
            state: rooms[roomId].state
          }));
          
          break;
          
        case 'game_state':
          // Only the host can update game state
          if (rooms[roomId] && rooms[roomId].host === playerId) {
            rooms[roomId].state = {
              ...rooms[roomId].state,
              ...data.state
            };
            
            // Broadcast to other players
            broadcastToRoom(roomId, {
              type: 'game_state',
              state: rooms[roomId].state
            }, [playerId]);
          }
          break;
          
        case 'player_update':
          if (!rooms[roomId]) return;
          
          // Update player's last seen timestamp
          rooms[roomId].players[playerId].lastSeen = Date.now();
          
          // Broadcast player update to other players
          broadcastToRoom(roomId, {
            type: 'player_update',
            playerId: playerId,
            data: data.data
          }, [playerId]);
          break;
          
        case 'chat':
          if (!rooms[roomId]) return;
          
          // Broadcast chat message to all players
          broadcastToRoom(roomId, {
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
    if (roomId && rooms[roomId]) {
      // Remove player from room
      delete rooms[roomId].players[playerId];
      
      // Notify remaining players
      broadcastToRoom(roomId, {
        type: 'player_left',
        playerId: playerId,
        playerCount: Object.keys(rooms[roomId].players).length
      }, []);
      
      // If host left, assign new host or clean up empty room
      if (playerId === rooms[roomId].host) {
        const remainingPlayers = Object.keys(rooms[roomId].players);
        
        if (remainingPlayers.length > 0) {
          const newHost = remainingPlayers[0];
          rooms[roomId].host = newHost;
          
          // Notify new host
          const newHostWs = rooms[roomId].players[newHost].ws;
          newHostWs.send(JSON.stringify({
            type: 'host_assigned'
          }));
        } else {
          // Clean up empty room
          delete rooms[roomId];
        }
      }
    }
  });
});

// Utility function to broadcast to all players in a room
function broadcastToRoom(roomId, message, excludePlayers = []) {
  if (!rooms[roomId]) return;
  
  const messageStr = JSON.stringify(message);
  
  Object.entries(rooms[roomId].players).forEach(([id, player]) => {
    if (!excludePlayers.includes(id) && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(messageStr);
    }
  });
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Clean up inactive players periodically
setInterval(() => {
  const now = Date.now();
  
  Object.keys(rooms).forEach(roomId => {
    Object.keys(rooms[roomId].players).forEach(playerId => {
      const player = rooms[roomId].players[playerId];
      
      // Remove players inactive for more than 30 seconds
      if (now - player.lastSeen > 30000) {
        delete rooms[roomId].players[playerId];
        
        // Notify remaining players
        broadcastToRoom(roomId, {
          type: 'player_disconnected',
          playerId: playerId,
          playerCount: Object.keys(rooms[roomId].players).length
        }, []);
        
        // Handle host disconnection
        if (playerId === rooms[roomId].host) {
          const remainingPlayers = Object.keys(rooms[roomId].players);
          
          if (remainingPlayers.length > 0) {
            const newHost = remainingPlayers[0];
            rooms[roomId].host = newHost;
            
            // Notify new host
            const newHostWs = rooms[roomId].players[newHost].ws;
            newHostWs.send(JSON.stringify({
              type: 'host_assigned'
            }));
          } else {
            // Clean up empty room
            delete rooms[roomId];
          }
        }
      }
    });
    
    // Clean up empty rooms
    if (Object.keys(rooms[roomId].players).length === 0) {
      delete rooms[roomId];
    }
  });
}, 10000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});