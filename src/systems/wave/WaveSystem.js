import * as THREE from 'three';

import { Logger } from '../../utils/Logger.js';
import { CONFIG } from '../../config/GameConfig.js';
import { EnemyFactory } from '../../components/enemy/EnemyFactory.js';

/**
 * Manages enemy waves, spawning, and progression
 */
export class WaveSystem {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.logger = new Logger('WaveSystem');
    this.enemyFactory = null; // Set during initialization

    // Wave state
    this.currentWave = 0;
    this.waveInProgress = false;
    this.waveEnemiesLeft = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval = 2000;
    this.enemyTypes = [];

    // Initialize the enemyFactory immediately
    this.enemyFactory = new EnemyFactory(this.game);

    this.logger.debug('Wave system created');
  }

  /**
   * Initialize the wave system
   */
  initialize() {
    this.logger.info('Wave system initialized');
  }

  /**
   * Start a wave
   * @param {number} waveNumber - Wave number to start
   */
  startWave(waveNumber) {
    this.logger.info(`Starting wave ${waveNumber}`);

    // Get wave configuration from config
    let waveConfig;
    if (waveNumber <= CONFIG.waveConfig.length) {
      waveConfig = CONFIG.waveConfig[waveNumber - 1];
    } else {
      // Generate wave for levels beyond pre-configured ones
      const lastWave = CONFIG.waveConfig[CONFIG.waveConfig.length - 1];
      const multiplier = Math.pow(CONFIG.difficultyScaling.countMultiplier, waveNumber - CONFIG.waveConfig.length);

      // Calculate scaled values
      const scaledCount = Math.floor(lastWave.count * multiplier);
      const scaledInterval = Math.max(500, lastWave.interval / Math.pow(CONFIG.difficultyScaling.intervalDivisor, waveNumber - CONFIG.waveConfig.length));

      waveConfig = {
        types: CONFIG.enemyTypes.map(t => t.name), // Use all enemy types for advanced waves
        count: scaledCount,
        interval: scaledInterval
      };
    }

    // Apply multiplayer scaling
    const playerCount = Object.keys(this.game.otherPlayers || {}).length + 1; // +1 for local player
    if (playerCount > 1) {
      waveConfig.count = Math.floor(waveConfig.count * (1 + (CONFIG.multiplayer.difficultyMultiplier * (playerCount - 1))));
    }

    // Update game state
    this.currentWave = waveNumber;
    this.waveEnemiesLeft = waveConfig.count;
    this.spawnInterval = waveConfig.interval;
    this.waveInProgress = true;
    this.enemyTypes = waveConfig.types;
    this.lastSpawnTime = Date.now();

    // Update UI
    this.game.uiManager.updateWaveUI(waveNumber);
    this.game.uiManager.showWaveAnnouncement(waveNumber);

    // Log wave start
    this.logger.info(`Wave ${waveNumber} started with ${waveConfig.count} enemies, types: ${waveConfig.types.join(', ')}`);

    // Emit wave started event
    this.game.events.emit('waveStarted', {
      wave: waveNumber,
      enemyCount: waveConfig.count,
      enemyTypes: waveConfig.types
    });
  }

  /**
   * Update wave logic
   * @param {number} delta - Time since last update in seconds
   */
  update(delta) {
    // Skip if game is not active
    if (!this.game.state.gameActive) return;

    // Handle enemy spawning for current wave
    if (this.waveInProgress && this.waveEnemiesLeft > 0) {
      const currentTime = Date.now();

      if (currentTime - this.lastSpawnTime > this.spawnInterval) {
        this.spawnEnemy();
        this.lastSpawnTime = currentTime;
      }
    }
  }

  /**
   * Spawn an enemy for the current wave
   */
  spawnEnemy() {
    if (!this.waveInProgress || this.waveEnemiesLeft <= 0) return;

    // Check if enemyFactory is available
    if (!this.enemyFactory) {
      this.logger.error('Enemy factory not initialized');
      this.enemyFactory = new EnemyFactory(this.game);
    }

    // Randomly select an enemy type from available types for this wave
    const randomType = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];

    // Create enemy
    const enemy = this.enemyFactory.createEnemy(randomType);

    // Add to game state
    this.game.state.enemies.push(enemy);

    // Decrement enemies left counter
    this.waveEnemiesLeft--;

    this.logger.debug(`Spawned enemy: ${randomType}, remaining: ${this.waveEnemiesLeft}`);

    // Emit enemy spawned event
    this.game.events.emit('enemySpawned', {
      enemy: enemy,
      wave: this.currentWave,
      remaining: this.waveEnemiesLeft
    });
  }

  /**
   * Check if the current wave is complete
   */
  /**
   * Check if the current wave is complete
   */
  checkWaveCompletion() {
    this.logger.debug(`Checking wave completion: waveInProgress=${this.waveInProgress}, waveEnemiesLeft=${this.waveEnemiesLeft}, enemies=${this.game.state.enemies.length}`);
  
    // Fix: Check only if no more enemies to spawn and no enemies on screen
    if (this.waveInProgress && this.waveEnemiesLeft <= 0 && this.game.state.enemies.length === 0) {
      this.logger.info(`Wave ${this.currentWave} completed`);
      this.waveInProgress = false;
  
      // Award wave completion bonus
      const waveBonus = 10 * this.currentWave;
      this.game.state.gold += waveBonus;
      this.game.uiManager.updateGoldUI(this.game.state.gold);
  
      // Show bonus message
      this.game.combatSystem.createFloatingText(
        `Wave Completed! +${waveBonus} gold`,
        new THREE.Vector3(0, 2, 0),
        0xffd700
      );
  
      // Update UI
      this.game.uiManager.updateWaveCompletedUI(this.currentWave);
  
      // Emit wave completed event
      this.game.events.emit('waveCompleted', {
        wave: this.currentWave,
        bonus: waveBonus
      });
  
      // Start next wave after delay
      setTimeout(() => {
        if (this.game.state.gameActive) {
          this.startWave(this.currentWave + 1);
        }
      }, 5000);
    }
  }

  /**
   * Reset the wave system
   */
  reset() {
    this.logger.info('Resetting wave system');

    this.currentWave = 0;
    this.waveInProgress = false;
    this.waveEnemiesLeft = 0;
    this.lastSpawnTime = 0;
    this.spawnInterval = 2000;
    this.enemyTypes = [];
  }
}