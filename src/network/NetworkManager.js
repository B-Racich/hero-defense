import { Logger } from '../utils/Logger.js';
import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Manages network communications for multiplayer functionality
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
    this.roomId = null;
    this.playerId = null;
    this.isHost = false;
    this.lastSyncTime = 0;
    this.otherPlayers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    // Bind methods to maintain context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
    
    this.logger.info('Network manager created');
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
    this.roomId = null;
    this.isHost = false;
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
      
      switch (message.type) {
        case 'room_created':
          this.roomId = message.roomId;
          this.isHost = true;
          this.logger.info(`Room created: ${this.roomId}, you are the host`);
          this.events.emit('roomCreated', { roomId: this.roomId });
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
          
        case 'host_assigned':
          this.isHost = true;
          this.logger.info('You are now the host');
          this.events.emit('hostAssigned');
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
    if (event.code !== 1000 && this.roomId) {
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
        // Re-join the room
        if (this.roomId) {
          this.joinRoom(this.roomId);
        }
      }).catch(error => {
        this.logger.error('Reconnect failed:', error);
        this.attemptReconnect();
      });
    }, delay);
  }
  
  /**
   * Create a new game room
   */
  createRoom() {
    if (!this.connected) {
      this.logger.error('Not connected, cannot create room');
      return;
    }
    
    this.logger.info('Creating new game room');
    
    this.send({
      type: 'create_room',
      playerId: this.playerId
    });
  }
  
  /**
   * Join an existing game room
   * @param {string} roomId - Room ID to join
   */
  joinRoom(roomId) {
    if (!this.connected) {
      this.logger.error('Not connected, cannot join room');
      return;
    }
    
    this.logger.info(`Joining room: ${roomId}`);
    this.roomId = roomId;
    
    this.send({
      type: 'join_room',
      roomId: roomId,
      playerId: this.playerId
    });
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
    if (!this.connected || !this.roomId || !this.game.state.hero) {
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
   * Send game state update to other players (host only)
   */
  sendGameState() {
    if (!this.connected || !this.roomId || !this.isHost) {
      return;
    }
    
    // Get relevant game state
    const state = {
      wave: this.game.state.wave,
      waveInProgress: this.game.state.waveInProgress,
      enemiesDefeated: this.game.state.enemiesDefeated
      // Include other relevant state data
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
    if (!this.connected || !this.roomId) {
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
    if (!this.connected || !this.roomId || !this.isHost) {
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
    if (!this.connected || !this.roomId) {
      return;
    }
    
    // Periodically sync player data
    const now = Date.now();
    const syncInterval = this.game.CONFIG?.multiplayer?.syncInterval || 100;
    
    if (now - this.lastSyncTime > syncInterval) {
      // Send player update
      this.sendPlayerUpdate();
      
      // If host, send game state too
      if (this.isHost) {
        this.sendGameState();
      }
      
      this.lastSyncTime = now;
    }
  }
}