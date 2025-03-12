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
      this.renderSystem.initialize();
      this.physicsSystem.initialize();
      this.inputManager.initialize();
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
    this.waveSystem.update(scaledDelta);
    this.combatSystem.update(scaledDelta);
    this.networkManager.update(scaledDelta);
    
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