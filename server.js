// server.js
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Global game state
const gameState = {
  wave: 1,
  enemies: [],
  nextEnemyId: 1,
  players: {},
  serverHealth: 500, // Server health instead of hero health
  gameActive: false,
  countdown: 0,
  resetTimeout: null,
  waveTimeout: null
};

// Connection handling
wss.on('connection', (ws) => {
  let playerId;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'register_player':
          playerId = data.username || 'player_' + Math.random().toString(36).substring(2, 9);
          
          // Add player to game
          gameState.players[playerId] = {
            ws,
            lastSeen: Date.now(),
            username: data.username
          };

          // Acknowledge registration
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
            state: {
              wave: gameState.wave,
              serverHealth: gameState.serverHealth,
              gameActive: gameState.gameActive,
              countdown: gameState.countdown
            }
          }));

          // Start game if not already running
          if (!gameState.gameActive && Object.keys(gameState.players).length === 1) {
            startGame();
          }
          break;

        case 'attack_enemy':
          if (data.enemyId) {
            const enemy = gameState.enemies.find(e => e.id === data.enemyId);
            if (enemy) {
              enemy.health -= data.damage || 10;
              if (enemy.health <= 0) {
                removeEnemy(enemy.id);
              } else {
                broadcastToAll({
                  type: 'enemy_damaged',
                  enemyId: enemy.id,
                  health: enemy.health
                }, []);
              }
            }
          }
          break;

        case 'chat':
          if (!playerId) return;

          // Broadcast chat message to all players
          broadcastToAll({
            type: 'chat',
            playerId: playerId,
            username: gameState.players[playerId].username,
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

      // Check if all players have left
      if (Object.keys(gameState.players).length === 0) {
        resetGame(true); // Reset but don't start until a player joins
      }
    }
  });
});

function startGame() {
  // Clear any existing reset timeout
  if (gameState.resetTimeout) {
    clearTimeout(gameState.resetTimeout);
    gameState.resetTimeout = null;
  }

  // Set countdown for 5 seconds
  gameState.countdown = 5;
  gameState.gameActive = false;

  // Broadcast countdown start
  broadcastToAll({
    type: 'countdown_started',
    countdown: gameState.countdown
  }, []);

  // Update countdown every second
  const countdownInterval = setInterval(() => {
    gameState.countdown--;
    
    broadcastToAll({
      type: 'countdown_update',
      countdown: gameState.countdown
    }, []);

    if (gameState.countdown <= 0) {
      clearInterval(countdownInterval);
      
      // Start the actual game
      gameState.gameActive = true;
      gameState.wave = 1;
      gameState.serverHealth = 500;
      gameState.enemies = [];
      
      broadcastToAll({
        type: 'game_started',
        wave: gameState.wave,
        serverHealth: gameState.serverHealth
      }, []);
      
      // Start first wave
      startWave(gameState.wave);
    }
  }, 1000);
}

function startWave(waveNumber) {
  // Simple wave configuration
  const enemyCount = 5 + (waveNumber * 2);
  const spawnInterval = Math.max(1000, 2000 - (waveNumber * 100));
  
  broadcastToAll({
    type: 'wave_started',
    wave: waveNumber
  }, []);
  
  // Spawn enemies at intervals
  let enemiesSpawned = 0;
  const spawnEnemy = () => {
    if (enemiesSpawned < enemyCount && gameState.gameActive) {
      const enemyType = getRandomEnemyType(waveNumber);
      spawnSingleEnemy(enemyType);
      enemiesSpawned++;
      
      // Schedule next spawn
      if (enemiesSpawned < enemyCount) {
        gameState.waveTimeout = setTimeout(spawnEnemy, spawnInterval);
      } else {
        // Check if wave is complete (all enemies defeated)
        checkWaveComplete();
      }
    }
  };
  
  // Start spawning
  spawnEnemy();
}

function getRandomEnemyType(wave) {
  const types = ['grunt', 'scout', 'brute', 'mage', 'assassin', 'commander'];
  const availableTypes = types.slice(0, Math.min(types.length, 1 + Math.floor(wave / 2)));
  return availableTypes[Math.floor(Math.random() * availableTypes.length)];
}

function spawnSingleEnemy(type) {
  const enemyId = `enemy_${gameState.nextEnemyId++}`;
  const health = getEnemyHealth(type);
  const position = {
    x: Math.random() * 3 - 1.5,
    y: 0.4,
    z: -12
  };

  gameState.enemies.push({
    id: enemyId,
    type: type,
    position: position,
    health: health,
    damage: getEnemyDamage(type),
    speed: getEnemySpeed(type),
    lastUpdated: Date.now()
  });

  // Broadcast enemy spawn to all players
  broadcastToAll({
    type: 'enemy_spawn',
    enemyId: enemyId,
    enemyType: type,
    position: position,
    health: health
  }, []);
}

function getEnemyHealth(type) {
  const healthMap = {
    grunt: 30,
    scout: 20,
    brute: 60,
    mage: 15,
    assassin: 25,
    commander: 100
  };
  return healthMap[type] || 30;
}

function getEnemyDamage(type) {
  const damageMap = {
    grunt: 10,
    scout: 5,
    brute: 20,
    mage: 15,
    assassin: 25,
    commander: 40
  };
  return damageMap[type] || 10;
}

function getEnemySpeed(type) {
  const speedMap = {
    grunt: 0.02,
    scout: 0.04,
    brute: 0.015,
    mage: 0.025,
    assassin: 0.05,
    commander: 0.01
  };
  return speedMap[type] || 0.02;
}

function removeEnemy(enemyId) {
  const index = gameState.enemies.findIndex(e => e.id === enemyId);
  if (index !== -1) {
    gameState.enemies.splice(index, 1);

    // Broadcast enemy removal to all players
    broadcastToAll({
      type: 'enemy_remove',
      enemyId: enemyId
    }, []);

    // Check if wave is complete
    checkWaveComplete();
  }
}

function checkWaveComplete() {
  // Wave is complete when all enemies are defeated
  if (gameState.enemies.length === 0 && gameState.gameActive) {
    // Small delay before starting next wave
    setTimeout(() => {
      if (gameState.gameActive) {
        gameState.wave++;
        broadcastToAll({
          type: 'wave_completed',
          nextWave: gameState.wave
        }, []);
        
        // Start next wave
        startWave(gameState.wave);
      }
    }, 3000);
  }
}

function resetGame(waitForPlayers = false) {
  // Clear any existing timeouts
  if (gameState.waveTimeout) {
    clearTimeout(gameState.waveTimeout);
    gameState.waveTimeout = null;
  }
  
  if (gameState.resetTimeout) {
    clearTimeout(gameState.resetTimeout);
    gameState.resetTimeout = null;
  }

  // Reset game state
  gameState.gameActive = false;
  gameState.wave = 1;
  gameState.serverHealth = 500;
  gameState.enemies = [];
  
  broadcastToAll({
    type: 'game_reset'
  }, []);
  
  // If there are players and we shouldn't wait, start a new game
  if (Object.keys(gameState.players).length > 0 && !waitForPlayers) {
    gameState.resetTimeout = setTimeout(() => {
      startGame();
    }, 5000);
  }
}

// Update enemy positions and check for end zone collisions
setInterval(() => {
  if (!gameState.gameActive) return;
  
  gameState.enemies.forEach(enemy => {
    // Move enemy forward
    enemy.position.z += enemy.speed * 60;
    
    // Check if enemy reached end zone
    if (enemy.position.z >= 12) {
      // Damage the server
      gameState.serverHealth -= enemy.damage;
      
      // Broadcast health update
      broadcastToAll({
        type: 'server_damaged',
        health: gameState.serverHealth,
        damage: enemy.damage
      }, []);
      
      // Remove enemy
      removeEnemy(enemy.id);
      
      // Check if game over
      if (gameState.serverHealth <= 0) {
        broadcastToAll({
          type: 'game_over',
          wave: gameState.wave
        }, []);
        
        resetGame();
      }
    } else {
      // Broadcast position update
      broadcastToAll({
        type: 'enemy_position',
        enemyId: enemy.id,
        position: enemy.position
      }, []);
    }
  });
}, 100);

// Clean up inactive players
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

      // Check if all players have left
      if (Object.keys(gameState.players).length === 0) {
        resetGame(true);
      }
    }
  });
}, 10000);

// Utility function to broadcast to all players
function broadcastToAll(message, excludePlayers = []) {
  const messageStr = JSON.stringify(message);

  Object.entries(gameState.players).forEach(([id, player]) => {
    if (!excludePlayers.includes(id) && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(messageStr);
    }
  });
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});