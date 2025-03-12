import { Logger } from '../utils/Logger.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import * as THREE from 'three';

/**
 * Manages network communications for multiplayer functionality
 * Simplified to use a single global game room
 */
export class NetworkManager {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.logger = new Logger('NetworkManager');
    this.events = new EventEmitter();

    // Connection state
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.otherPlayers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.lastSyncTime = 0;

    // Bind methods to maintain context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);

    this.processedMessageIds = new Set();

    this.logger.info('Network manager created');
  }

  // Add after the constructor in NetworkManager.js
  debugEntities() {
    console.log("--- DEBUG ENTITIES ---");
    console.log(`Hero exists: ${!!this.game.state.hero}`);
    if (this.game.state.hero && this.game.state.hero.mesh) {
      console.log(`Hero mesh exists: ${!!this.game.state.hero.mesh}`);
      console.log(`Hero position: ${JSON.stringify(this.game.state.hero.position)}`);
      console.log(`Hero in scene: ${this.game.sceneManager.scene.children.includes(this.game.state.hero.mesh)}`);
    }

    console.log(`Enemies count: ${this.game.state.enemies.length}`);
    this.game.state.enemies.forEach((enemy, i) => {
      console.log(`Enemy ${i} mesh exists: ${!!enemy.mesh}`);
      if (enemy.mesh) {
        console.log(`Enemy ${i} in scene: ${this.game.sceneManager.scene.children.includes(enemy.mesh)}`);
      }
    });

    console.log(`Scene total children: ${this.game.sceneManager.scene.children.length}`);
  }

  /**
   * Initialize the network manager
   */
  initialize() {
    this.logger.info('Initializing network manager');

    // Generate a unique player ID if not already set
    if (!this.playerId) {
      this.playerId = 'player_' + Math.random().toString(36).substring(2, 9);
      this.logger.debug(`Generated player ID: ${this.playerId}`);
    }

    // Make game instance aware of otherPlayers
    this.game.otherPlayers = this.otherPlayers;
  }

  /**
   * Connect to the game server
   * @param {string} serverUrl - Server URL to connect to
   * @returns {Promise} Promise that resolves when connected
   */
  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      this.logger.info(`Connecting to server: ${serverUrl}`);

      if (this.socket && this.connected) {
        this.logger.warn('Already connected, disconnecting first');
        this.disconnect();
      }

      try {
        this.socket = new WebSocket(serverUrl);

        // Set up event handlers
        this.socket.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.logger.info('Connected to server');

          // Register player immediately
          this.registerPlayer();

          resolve();
        };

        this.socket.onmessage = event => {
          this.handleMessage(event.data);
        };

        this.socket.onerror = error => {
          this.handleError(error);
          reject(error);
        };

        this.socket.onclose = event => {
          this.handleClose(event);
        };
      } catch (error) {
        this.logger.error('Failed to connect to server:', error);
        reject(error);
      }
    });
  }

  /**
   * Register player with the server
   */
  // Change to registerPlayer method around line 110
  registerPlayer(username) {
    if (!this.connected) {
      this.logger.error('Not connected, cannot register player');
      return;
    }

    this.logger.info('Registering player with server');
    this.username = username;

    this.send({
      type: 'register_player',
      username: username
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (!this.socket) {
      this.logger.warn('Not connected, cannot disconnect');
      return;
    }

    this.logger.info('Disconnecting from server');

    // Close the socket
    this.socket.close();
    this.socket = null;
    this.connected = false;
    this.otherPlayers = {};

    // Make game instance aware of otherPlayers
    this.game.otherPlayers = this.otherPlayers;

    // Emit disconnected event
    this.events.emit('disconnected');
  }

  /**
   * Handle incoming messages from the server
   * @param {string} data - JSON message data
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      this.logger.debug('Received message:', message.type);

      const messageId = message.id || message.enemyId || (message.type + Date.now());
      if (this.processedMessageIds.has(messageId)) return;
      this.processedMessageIds.add(messageId);

      if(this.processedMessageIds.size > 100) {
        const oldest = Array.from(this.processedMessageIds)[0];
        this.processedMessageIds.delete(oldest);
      }

      switch (message.type) {
        case 'player_registered':
          this.logger.info(`Player registered: ${message.playerId}`);
          this.events.emit('playerRegistered', {
            playerId: message.playerId,
            playerCount: message.playerCount
          });
          break;

        case 'player_joined':
          this.logger.info(`Player joined: ${message.playerId}`);
          this.events.emit('playerJoined', {
            playerId: message.playerId,
            playerCount: message.playerCount
          });
          break;

        case 'player_left':
          this.logger.info(`Player left: ${message.playerId}`);

          // Remove from other players
          if (this.otherPlayers[message.playerId]) {
            delete this.otherPlayers[message.playerId];

            // Make game instance aware of otherPlayers
            this.game.otherPlayers = this.otherPlayers;
          }

          this.events.emit('playerLeft', {
            playerId: message.playerId,
            playerCount: message.playerCount
          });
          break;

        case 'player_disconnected':
          this.logger.info(`Player disconnected: ${message.playerId}`);

          // Similar to player_left
          if (this.otherPlayers[message.playerId]) {
            delete this.otherPlayers[message.playerId];

            // Make game instance aware of otherPlayers
            this.game.otherPlayers = this.otherPlayers;
          }

          this.events.emit('playerDisconnected', {
            playerId: message.playerId,
            playerCount: message.playerCount
          });
          break;

        case 'game_state':
          this.processGameState(message.state);
          break;

        case 'player_update':
          this.processPlayerUpdate(message.playerId, message.data);
          break;

        case 'chat':
          this.events.emit('chatReceived', {
            playerId: message.playerId,
            message: message.message
          });
          break;

        case 'error':
          this.logger.error(`Server error: ${message.message}`);
          this.events.emit('error', { message: message.message });
          break;
        // Replace the enemy_spawn case in handleMessage method in NetworkManager.js
        case 'enemy_spawn':
          console.log(`Spawning enemy: ${message.enemyType} at position:`, message.position);

          // Create enemy locally based on server data
          if (this.game && this.game.state) {
            const position = new THREE.Vector3(
              message.position.x || 0,
              message.position.y || 0.4,
              message.position.z || -12
            );

            // Use the enemy factory from the game's waveSystem
            if (this.game.waveSystem && this.game.waveSystem.enemyFactory) {
              const enemy = this.game.waveSystem.enemyFactory.createEnemy(message.enemyType, {
                id: message.enemyId,
                position: position,
                health: message.health
              });

              if (enemy) {
                // Make sure mesh is created and added to scene
                if (!enemy.mesh) {
                  console.log(`Creating mesh for enemy ${message.enemyId}`);
                  enemy.mesh = enemy.createMesh();
                  this.game.sceneManager.addToScene(enemy.mesh, 'enemies');
                }

                // Ensure position is set correctly on both enemy and mesh
                enemy.position.copy(position);
                if (enemy.mesh) {
                  enemy.mesh.position.copy(position);
                  enemy.mesh.visible = true;
                }

                this.game.state.enemies.push(enemy);
                console.log(`Enemy spawned and added to game: ${message.enemyType} (${message.enemyId})`);
              } else {
                console.error("Failed to create enemy");
              }
            } else {
              console.error("Enemy factory not available");
            }
          }
          break;

        case 'enemy_position':
          // Update local enemy position
          const enemy = this.game.state.enemies.find(e => e.id === message.enemyId);
          if (enemy) {
            enemy.serverPosition = message.position;
          }
          break;

        case 'enemy_remove':
          // Remove local enemy
          const enemyIndex = this.game.state.enemies.findIndex(e => e.id === message.enemyId);
          if (enemyIndex !== -1) {
            const removedEnemy = this.game.state.enemies[enemyIndex];
            if (removedEnemy.mesh) {
              this.game.sceneManager.removeFromScene(removedEnemy.mesh);
            }
            this.game.state.enemies.splice(enemyIndex, 1);
          }
          break;
        case 'server_damaged':
          this.logger.info(`Server damaged: -${message.damage} (${message.health} remaining)`);

          // Update UI with server health
          if (this.game && this.game.uiManager) {
            this.game.uiManager.updateHealthUI(message.health);
          }

          this.events.emit('serverDamaged', {
            health: message.health,
            damage: message.damage
          });
          break;

        // Add handling for countdown messages
        case 'countdown_started':
        case 'countdown_update':
          if (this.game && this.game.uiManager) {
            this.game.uiManager.showCountdown(message.countdown);
          }
          break;

        case 'wave_started':
          if (this.game && this.game.uiManager) {
            this.game.uiManager.updateWaveUI(message.wave);
            this.game.uiManager.showWaveAnnouncement(message.wave);
          }
          break;

        case 'wave_completed':
          if (this.game && this.game.uiManager) {
            this.game.uiManager.showWaveCompleted(message.nextWave);
          }
          break;

        case 'game_over':
          if (this.game) {
            this.game.gameOver(message.wave);
          }
          break;

        case 'game_reset':
          if (this.game) {
            this.game.resetGame();
          }
          break;

        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Error processing message:', error);
    }
  }

  /**
   * Handle socket errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    this.logger.error('WebSocket error:', error);
    this.events.emit('error', { message: 'Connection error' });
  }

  /**
   * Handle socket close
   * @param {CloseEvent} event - Close event
   */
  handleClose(event) {
    this.connected = false;
    this.logger.info(`Connection closed, code: ${event.code}, reason: ${event.reason}`);

    // Try to reconnect if not a clean closure
    if (event.code !== 1000) {
      this.attemptReconnect();
    } else {
      this.events.emit('disconnected');
    }
  }

  /**
   * Attempt to reconnect to the server
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached, giving up');
      this.events.emit('disconnected');
      return;
    }

    this.reconnectAttempts++;

    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.logger.info(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
        return; // Already reconnecting
      }

      // Try to reconnect
      this.connect(this.socket.url).then(() => {
        // Re-register player upon reconnect
        this.registerPlayer();
      }).catch(error => {
        this.logger.error('Reconnect failed:', error);
        this.attemptReconnect();
      });
    }, delay);
  }

  /**
   * Process game state updates
   * @param {Object} state - Game state data
   */
  processGameState(state) {
    // Update game state with received data
    if (state.wave !== undefined && this.game.state.wave !== state.wave) {
      this.game.state.wave = state.wave;
      this.game.uiManager.updateWaveUI(state.wave);
    }

    // Handle enemy state updates (simplified - actual implementation would be more complex)
    if (state.enemies) {
      // Process enemy updates
    }

    // Emit game state updated event
    this.events.emit('gameStateUpdated', state);
  }

  // src/network/NetworkManager.js - Around line 330
  requestEnemySpawn(type, position) {
    if (!this.connected) return;

    this.send({
      type: 'spawn_enemy',
      enemyType: type,  // Changed from 'type' to 'enemyType'
      position: position
    });
  }

  /**
   * Update enemy position on server
   * @param {string} id - Enemy ID
   * @param {Object} position - New position
   */
  updateEnemyPosition(id, position) {
    if (!this.connected) return;

    this.send({
      type: 'enemy_update',
      id: id,
      position: position
    });
  }

  /**
   * Notify server of enemy removal
   * @param {string} id - Enemy ID
   */
  notifyEnemyRemoved(id) {
    if (!this.connected) return;

    this.send({
      type: 'remove_enemy',
      id: id
    });
  }

  /**
   * Process player update
   * @param {string} playerId - Player ID
   * @param {Object} data - Player update data
   */
  processPlayerUpdate(playerId, data) {
    if (playerId === this.playerId) return; // Ignore updates for local player

    // Create or update other player data
    if (!this.otherPlayers[playerId]) {
      this.otherPlayers[playerId] = {
        id: playerId,
        heroClass: data.heroClass,
        hero: null
      };

      // Create hero for other player if heroClass is provided
      if (data.heroClass && this.game.heroFactory) {
        this.otherPlayers[playerId].hero = this.game.heroFactory.createHero(
          data.heroClass,
          false // Not local player
        );
      }
    }

    // Update hero position and rotation if hero exists
    if (this.otherPlayers[playerId].hero && data.position) {
      this.otherPlayers[playerId].hero.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );

      if (data.rotation) {
        this.otherPlayers[playerId].hero.rotation.set(
          data.rotation.x,
          data.rotation.y,
          data.rotation.z
        );
      }

      // Update mesh position
      if (this.otherPlayers[playerId].hero.mesh) {
        this.otherPlayers[playerId].hero.mesh.position.copy(
          this.otherPlayers[playerId].hero.position
        );

        this.otherPlayers[playerId].hero.mesh.rotation.copy(
          this.otherPlayers[playerId].hero.rotation
        );
      }
    }

    // Make game instance aware of otherPlayers
    this.game.otherPlayers = this.otherPlayers;
  }

  /**
   * Send local player state to server
   */
  sendPlayerUpdate() {
    if (!this.connected || !this.game.state.hero) {
      return;
    }

    // Get hero stats
    const hero = this.game.state.hero;
    const heroStats = hero.getStats();

    this.send({
      type: 'player_update',
      data: {
        heroClass: hero.type,
        position: {
          x: heroStats.position.x,
          y: heroStats.position.y,
          z: heroStats.position.z
        },
        rotation: {
          x: heroStats.rotation.x,
          y: heroStats.rotation.y,
          z: heroStats.rotation.z
        },
        health: heroStats.health,
        level: heroStats.level
      }
    });
  }

  /**
   * Send game state update to other players
   */
  sendGameState() {
    if (!this.connected) {
      return;
    }

    // Get relevant game state
    const state = {
      wave: this.game.state.wave,
      waveInProgress: this.game.state.waveInProgress,
      enemiesDefeated: this.game.state.enemiesDefeated
    };

    this.send({
      type: 'game_state',
      state: state
    });
  }

  /**
   * Send chat message
   * @param {string} message - Chat message to send
   */
  sendChatMessage(message) {
    if (!this.connected) {
      this.logger.error('Not connected, cannot send chat');
      return;
    }

    this.send({
      type: 'chat',
      message: message
    });
  }

  /**
   * Send game over notification
   */
  sendGameOverMessage() {
    if (!this.connected) {
      return;
    }

    this.send({
      type: 'game_state',
      state: {
        gameActive: false,
        wave: this.game.state.wave,
        enemiesDefeated: this.game.state.enemiesDefeated
      }
    });
  }

  /**
   * Send data to the server
   * @param {Object} data - Data to send
   */
  send(data) {
    if (!this.connected || !this.socket) {
      this.logger.error('Not connected, cannot send data');
      return;
    }

    try {
      this.socket.send(JSON.stringify(data));
    } catch (error) {
      this.logger.error('Error sending data:', error);
    }
  }

  /**
   * Update network state
   * @param {number} delta - Time since last update in seconds
   */
  update(delta) {
    if (!this.connected) {
      return;
    }

    // Periodically sync player data
    const now = Date.now();
    const syncInterval = this.game.CONFIG?.multiplayer?.syncInterval || 100;

    if (now - this.lastSyncTime > syncInterval) {
      // Send player update
      this.sendPlayerUpdate();

      // Send game state too
      this.sendGameState();

      this.lastSyncTime = now;
    }
  }
}