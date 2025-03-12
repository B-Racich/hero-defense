import * as THREE from 'three';

import { QualityController } from '../utils/QualityController.js';

import { Engine } from './Engine.js';
import { SceneManager } from './SceneManager.js';
import { AssetLoader } from './AssetLoader.js';
import { InputManager } from './InputManager.js';
import { NetworkManager } from '../network/NetworkManager.js';
import { UIManager } from '../ui/UIManager.js';
import { RenderSystem } from '../systems/render/RenderSystem.js';
import { PhysicsSystem } from '../systems/physics/PhysicsSystem.js';
import { WaveSystem } from '../systems/wave/WaveSystem.js';
import { UpgradeSystem } from '../systems/upgrade/UpgradeSystem.js';
import { CombatSystem } from '../systems/combat/CombatSystem.js';
import { HeroFactory } from '../components/hero/HeroFactory.js';
import { CONFIG } from '../config/GameConfig.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

import { GeometryPool } from '../utils/GeometryPool.js';
import { MaterialPool } from '../utils/MaterialPool.js';

/**
 * Main Game class that orchestrates all game systems and components
 */
export class Game {
  constructor() {
    // Core engine systems
    this.logger = new Logger('Game');
    this.events = new EventEmitter();
    this.engine = new Engine();
    this.sceneManager = new SceneManager();
    this.assetLoader = new AssetLoader();
    this.inputManager = new InputManager();

    // Game state
    this.state = {
      enemiesDefeated: 0,
      gold: 0,
      wave: 1,
      waveEnemiesLeft: 0,
      waveInProgress: false,
      enemies: [],
      hero: null,
      heroClass: null,
      gameActive: true,
      upgradeStats: {},
      timeScale: 1
    };

    // Game systems
    this.renderSystem = new RenderSystem(this.sceneManager);
    this.physicsSystem = new PhysicsSystem();
    this.waveSystem = new WaveSystem(this);
    this.upgradeSystem = new UpgradeSystem(this);
    this.combatSystem = new CombatSystem(this);
    this.sceneManager.game = this;
    this.geometryPool = new GeometryPool();
    this.materialPool = new MaterialPool();
    // Quality controller
    this.qualityController = new QualityController(this);
    // Factories
    this.heroFactory = new HeroFactory(this);

    // UI and network
    this.uiManager = new UIManager(this);
    this.networkManager = new NetworkManager(this);

    // Game clock
    this.clock = {
      delta: 0,
      elapsed: 0,
      lastTime: 0
    };

    // Bind update method to maintain context
    this.update = this.update.bind(this);

    this.logger.info('Game instance created');
  }

  // Add this new method to Game.js
  enablePerformanceMode() {
    // Set performance configuration
    this.state.performanceMode = true;

    // Reduce particle counts and effect quality
    this.state.particleMultiplier = 0.5; // 50% of normal particles

    // Set update frequencies
    this.state.physicsUpdateFrequency = 2; // Every 2 frames
    this.state.enemyUpdateFrequency = 3; // Every 3 frames

    // Initialize frame counter
    this.frameCount = 0;

    this.logger.info('Performance mode enabled');
  }

  /**
   * Initialize game systems and start the game loop
   */
  // src/core/Game.js - Around line 90
  async initialize() {
    this.logger.info('Initializing game');
  
    // Add immediately after initialize() starts in Game.js
    document.getElementById('loadingScreen').style.display = 'none';
  
    try {
      this.geometryPool = new GeometryPool();
      this.materialPool = new MaterialPool();
  
      // Load assets
      await this.assetLoader.loadAll(progress => {
        // Update loading screen
        this.uiManager.updateLoadingProgress(progress);
      });
  
      // Initialize scene manager first
      this.sceneManager.initialize();
  
      this.camera = this.sceneManager.camera;
  
      // Initialize render system
      this.renderSystem.initialize();
  
      // Now initialize quality controller after renderer exists
      this.qualityController.initialize('low');
  
      // Rest of initialization
      this.physicsSystem.initialize();
      this.inputManager.initialize();
  
      // Force UI display
      setTimeout(() => {
        if (this.uiManager) {
          this.uiManager.hideLoadingScreen();
          this.uiManager.showMultiplayerPanel();
          this.logger.info('Forcing UI display after initialization');
        }
      }, 1000);
    } catch (error) {
      this.logger.error('Failed to initialize game:', error);
    }
  }

  /**
   * Start a new game with the selected hero
   * @param {string} heroClass - The selected hero class
   */
  startGame(heroClass) {
    this.logger.info(`Starting game with hero class: ${heroClass}`);

    this.state.heroClass = heroClass;

    // Create hero
    this.state.hero = this.heroFactory.createHero(heroClass, true);

    // Initialize upgrade system
    this.upgradeSystem.initialize();

    // Start first wave
    this.waveSystem.startWave(1);

    // Hide hero selection and show game UI
    this.uiManager.showGameUI();
  }

  /**
   * Main game update loop
   * @param {number} timestamp - Current timestamp from requestAnimationFrame
   */
  // Around line 287 in Game.js
  update(timestamp) {
    // Calculate delta time
    if (this.clock.lastTime === 0) {
      this.clock.lastTime = timestamp;
    }

    this.clock.delta = (timestamp - this.clock.lastTime) / 1000;
    this.clock.elapsed += this.clock.delta;
    this.clock.lastTime = timestamp;

    // Skip update if game is not active
    if (!this.state.gameActive) return;

    // Throttle updates to prevent excessive calculations at high framerates
    const scaledDelta = this.clock.delta * this.state.timeScale;

    // Add update frequency control for systems
    // Get update frequencies from quality settings
    const PHYSICS_UPDATE_FREQUENCY = this.state.physicsUpdateFrequency || 2;
    const ENEMY_UPDATE_FREQUENCY = this.state.enemyUpdateFrequency || 3;

    // Always update core systems
    this.renderSystem.render();

    // Update the hero
    if (this.state.hero) {
      this.state.hero.update(scaledDelta);
    }

    // Update physics less frequently - use frame counting
    if (this.frameCount % PHYSICS_UPDATE_FREQUENCY === 0) {
      this.physicsSystem.update(scaledDelta * PHYSICS_UPDATE_FREQUENCY);
    }

    // Stagger enemy updates (not all enemies need to update every frame)
    if (this.state.enemies && this.state.enemies.length > 0) {
      // Split enemies into groups based on frame count
      const updateGroup = this.frameCount % ENEMY_UPDATE_FREQUENCY;

      for (let i = updateGroup; i < this.state.enemies.length; i += ENEMY_UPDATE_FREQUENCY) {
        const enemy = this.state.enemies[i];
        if (enemy && typeof enemy.update === 'function') {
          enemy.update(scaledDelta * ENEMY_UPDATE_FREQUENCY);
        }
      }
    }

    if (this.state.enemies && this.state.enemies.length > 0) {
      console.log(`Processing ${this.state.enemies.length} enemies`);
    }

    // Other systems update normally
    this.waveSystem.update(scaledDelta);
    this.combatSystem.update(scaledDelta);
    this.networkManager.update(scaledDelta);

    // Increment frame counter
    this.frameCount = (this.frameCount || 0) + 1;
  }

  /**
   * Reset game state
   */
  resetGame() {
    this.logger.info('Resetting game');

    // Reset state
    this.state.enemies.forEach(enemy => {
      this.sceneManager.removeFromScene(enemy.mesh);
    });

    this.state.enemies = [];
    this.state.enemiesDefeated = 0;
    this.state.gold = 0;
    this.state.wave = 1;
    this.state.waveEnemiesLeft = 0;
    this.state.waveInProgress = false;
    this.state.gameActive = true;

    // Reset hero
    if (this.state.hero) {
      this.sceneManager.removeFromScene(this.state.hero);
    }

    this.state.hero = this.heroFactory.createHero(this.state.heroClass, true);

    // Reset systems
    this.upgradeSystem.reset();
    this.waveSystem.reset();
    this.combatSystem.reset();

    // Update UI
    this.uiManager.updateGameUI();

    // Start first wave
    setTimeout(() => {
      this.waveSystem.startWave(1);
    }, 1000);
  }

  /**
   * Handle game over
   */
  gameOver() {
    this.logger.info('Game over');

    this.state.gameActive = false;
    this.uiManager.showGameOverPanel(this.state.enemiesDefeated, this.state.wave - 1);
    this.networkManager.sendGameOverMessage();
  }
}