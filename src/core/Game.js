import * as THREE from 'three';

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

  /**
   * Initialize game systems and start the game loop
   */
  async initialize() {
    this.logger.info('Initializing game');

    try {
      // Load assets
      await this.assetLoader.loadAll(progress => {
        // Update loading screen
        this.uiManager.updateLoadingProgress(progress);
      });

      // Initialize all systems
      this.sceneManager.initialize();

      this.camera = this.sceneManager.camera;

      this.renderSystem.initialize();
      this.physicsSystem.initialize();

      this.inputManager.initialize();

      // Set up mouse click handler for hero movement
      this.inputManager.events.on('mousedown', (data) => {
        if (data.button === 0 && this.state.hero) { // Left button
          // Create a raycaster
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(data.normalized, this.camera);

          // Create a ground plane for intersection
          const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          const targetPoint = new THREE.Vector3();

          if (raycaster.ray.intersectPlane(groundPlane, targetPoint)) {
            this.logger.info(`Moving hero to position: ${targetPoint.x.toFixed(2)}, ${targetPoint.y.toFixed(2)}, ${targetPoint.z.toFixed(2)}`);
            this.state.hero.moveTo(targetPoint);
          }
        }
      });

      this.uiManager.initialize();

      // Show multiplayer options first
      this.uiManager.showMultiplayerPanel();

      // Start game loop
      this.engine.start(this.update);

      this.logger.info('Game initialized successfully');
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

    // Update all systems
    this.physicsSystem.update(scaledDelta);

    // Add this code to update the hero
    if (this.state.hero) {
      this.state.hero.update(scaledDelta);
    }

    // Hero auto-attack system
    if (this.state.hero && this.state.enemies.length > 0) {
      // Find closest enemy in range
      let closestEnemy = null;
      let closestDistance = Infinity;

      this.state.enemies.forEach(enemy => {
        if (enemy) {
          const distance = this.state.hero.position.distanceTo(enemy.position);
          if (distance < this.state.hero.upgradeStats.range.value && distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
          }
        }
      });

      // Attack if enemy found and attack cooldown is over
      if (closestEnemy && this.state.hero.attackCooldown <= 0) {
        this.state.hero.attack(closestEnemy);
      }
    }

    // Update enemies
    if (this.state.enemies && this.state.enemies.length > 0) {
      this.state.enemies.forEach(enemy => {
        if (enemy && typeof enemy.update === 'function') {
          enemy.update(scaledDelta);
        }
      });
    }

    this.waveSystem.update(scaledDelta);
    this.combatSystem.update(scaledDelta);
    this.networkManager.update(scaledDelta);

    // Get FPS for UI
    if (this.renderSystem && this.renderSystem.fps) {
      this.fps = this.renderSystem.fps;

      // Update UI with current FPS every second
      if (Math.floor(this.clock.elapsed) !== Math.floor(this.clock.elapsed - scaledDelta)) {
        this.uiManager.updateFpsUI(this.fps);
      }
    }

    // Render scene
    this.renderSystem.render();
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