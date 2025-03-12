import { Enemy } from './Enemy.js';
import { Logger } from '../../utils/Logger.js';
import { CONFIG } from '../../config/GameConfig.js';

/**
 * Factory class for creating enemy instances
 */
export class EnemyFactory {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.logger = new Logger('EnemyFactory');
  }
  
  /**
   * Create an enemy of the specified type
   * @param {string} enemyType - The enemy type to create
   * @param {Object} options - Additional options for enemy creation
   * @returns {Enemy} The created enemy instance
   */
  createEnemy(enemyType, options = {}) {
    this.logger.debug(`Creating enemy: ${enemyType}`);
    
    // Get enemy configuration
    const enemyConfig = CONFIG.enemyTypes.find(t => t.name === enemyType);
    if (!enemyConfig) {
      this.logger.error(`Invalid enemy type: ${enemyType}`);
      return null;
    }
    
    // Apply wave scaling to health
    const waveHealthMultiplier = Math.pow(
      CONFIG.difficultyScaling.healthMultiplier, 
      Math.max(0, this.game.state.wave - CONFIG.waveConfig.length)
    );
    
    // Apply multiplayer scaling if applicable
    const playerCount = Object.keys(this.game.otherPlayers || {}).length + 1; // +1 for local player
    const multiplayerScaling = 1 + (CONFIG.multiplayer.difficultyMultiplier * (playerCount - 1));
    
    // Calculate final health
    const scaledHealth = Math.round(enemyConfig.health * waveHealthMultiplier * multiplayerScaling);
    
    // Create enemy instance
    const enemy = new Enemy(this.game, {
      ...enemyConfig,
      health: scaledHealth,
      id: options.id || 'enemy_' + Math.random().toString(36).substring(2, 9),
      position: options.position || this.getSpawnPosition(enemyType)
    });
    
    // Create enemy mesh
    const mesh = enemy.createMesh();
    
    // Add to scene
    this.game.sceneManager.addToScene(mesh, 'enemies');
    
    // Set up event listeners
    this.setupEnemyEvents(enemy);
    
    return enemy;
  }
  
  /**
   * Get a spawn position for an enemy
   * @param {string} enemyType - Type of enemy to spawn
   * @returns {THREE.Vector3} Spawn position
   */
  getSpawnPosition(enemyType) {
    // Random x position across lane width
    const xPos = Math.random() * 3 - 1.5;
    
    // Spawn at top of lane
    return new THREE.Vector3(xPos, 0.4, -12);
  }
  
  /**
   * Set up event listeners for an enemy
   * @param {Enemy} enemy - The enemy instance
   */
  setupEnemyEvents(enemy) {
    // Listen for damage events
    enemy.events.on('damaged', (data) => {
      this.game.events.emit('enemyDamaged', {
        enemyId: enemy.id,
        damage: data.damage,
        source: data.source,
        isCrit: data.isCrit,
        remainingHealth: data.remainingHealth
      });
      
      // Create floating damage text
      this.game.combatSystem.createFloatingText(
        data.isCrit ? 'CRIT! ' + data.damage : data.damage.toString(),
        enemy.position.clone().add(new THREE.Vector3(0, 1 * enemy.scale, 0)),
        data.isCrit ? 0xff0000 : 0xff8800
      );
    });
    
    // Listen for death events
    enemy.events.on('died', (data) => {
      this.game.events.emit('enemyDied', {
        enemyId: enemy.id,
        enemyType: enemy.type,
        source: data.source,
        position: enemy.position.clone(),
        value: enemy.value
      });
      
      // Start death animation
      enemy.startDeathAnimation().then(() => {
        // Remove from scene after animation completes
        this.game.sceneManager.removeFromScene(enemy.mesh);
        
        // Remove from state
        const index = this.game.state.enemies.indexOf(enemy);
        if (index !== -1) {
          this.game.state.enemies.splice(index, 1);
        }
        
        // Award gold to player
        this.game.state.gold += enemy.value;
        this.game.uiManager.updateGoldUI(this.game.state.gold);
        
        // Create floating gold text
        this.game.combatSystem.createFloatingText(
          '+' + enemy.value + ' gold',
          enemy.position.clone().add(new THREE.Vector3(0, 1.5 * enemy.scale, 0)),
          0xffdf00 // Gold color
        );
        
        // Increment enemies defeated counter
        this.game.state.enemiesDefeated++;
        this.game.uiManager.updateEnemiesDefeatedUI(this.game.state.enemiesDefeated);
        
        // Update upgrade buttons (in case of new affordability)
        this.game.uiManager.updateUpgradeButtons();
        
        // Check for wave completion
        this.game.waveSystem.checkWaveCompletion();
      });
    });
    
    // Listen for effect applied events
    enemy.events.on('effectApplied', (data) => {
      this.game.events.emit('enemyEffectApplied', {
        enemyId: enemy.id,
        effect: data.effect
      });
    });
  }
}