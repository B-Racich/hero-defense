import { Warrior } from './Warrior.js';
import { Ranger } from './Ranger.js';
import { Mage } from './Mage.js';
import { Logger } from '../../utils/Logger.js';
import { CONFIG } from '../../config/GameConfig.js';

/**
 * Factory class for creating hero instances
 */
export class HeroFactory {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.logger = new Logger('HeroFactory');
  }
  
  /**
   * Create a hero of the specified class
   * @param {string} heroClass - The hero class to create (warrior, ranger, mage)
   * @param {boolean} isLocalPlayer - Whether this is the local player's hero
   * @returns {Hero} The created hero instance
   */
  createHero(heroClass, isLocalPlayer = true) {
    this.logger.info(`Creating hero: ${heroClass}, isLocalPlayer: ${isLocalPlayer}`);
    
    // Get hero configuration
    const heroConfig = CONFIG.heroClasses[heroClass];
    if (!heroConfig) {
      this.logger.error(`Invalid hero class: ${heroClass}`);
      return null;
    }
    
    // Create hero instance based on class
    let hero;
    
    switch (heroClass) {
      case 'warrior':
        hero = new Warrior(this.game, {
          ...heroConfig,
          id: isLocalPlayer ? 'local_hero' : 'remote_hero_' + Math.random().toString(36).substring(2, 9)
        });
        break;
        
      case 'ranger':
        hero = new Ranger(this.game, {
          ...heroConfig,
          id: isLocalPlayer ? 'local_hero' : 'remote_hero_' + Math.random().toString(36).substring(2, 9)
        });
        break;
        
      case 'mage':
        hero = new Mage(this.game, {
          ...heroConfig,
          id: isLocalPlayer ? 'local_hero' : 'remote_hero_' + Math.random().toString(36).substring(2, 9)
        });
        break;
        
      default:
        this.logger.error(`Unknown hero class: ${heroClass}`);
        return null;
    }
    
    // Create the hero mesh
    const mesh = hero.createMesh();
    
    // Add to scene
    this.game.sceneManager.addToScene(mesh, 'heroes');
    
    // Set up event listeners
    this.setupHeroEvents(hero);
    
    this.logger.debug(`Hero created: ${hero.id} (${heroClass})`);
    
    return hero;
  }
  
  /**
   * Set up event listeners for hero
   * @param {Hero} hero - The hero instance
   */
  setupHeroEvents(hero) {
    // Listen for attack events
    hero.events.on('attack', (data) => {
      this.game.events.emit('heroAttack', {
        heroId: hero.id,
        targetId: data.target.id,
        damage: data.damage,
        isCrit: data.isCrit
      });
      
      // Create attack visual effect
      this.game.combatSystem.createAttackEffect(
        hero.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
        data.target.position.clone()
      );
    });
    
    // Listen for ability use events
    hero.events.on('abilityUsed', (data) => {
      this.game.events.emit('heroAbilityUsed', {
        heroId: hero.id,
        abilityIndex: data.abilityIndex,
        ability: data.ability
      });
      
      // Update ability UI
      this.game.uiManager.updateAbilityUI(data.abilityIndex, hero.abilityCooldowns[data.abilityIndex]);
    });
    
    // Listen for buff events
    hero.events.on('buffApplied', (data) => {
      this.game.events.emit('heroBuffApplied', {
        heroId: hero.id,
        buff: data.buff
      });
    });
    
    // Listen for health change events
    hero.events.on('healthChanged', (data) => {
      this.game.events.emit('heroHealthChanged', {
        heroId: hero.id,
        amount: data.amount,
        source: data.source
      });
      
      // Update health UI
      if (hero.id === 'local_hero') {
        this.game.uiManager.updateHealthUI(hero.upgradeStats.health.value);
      }
      
      // Show floating damage or healing text
      if (data.amount < 0) {
        // Damage
        this.game.combatSystem.createFloatingText(
          Math.abs(data.amount).toString(),
          hero.position.clone().add(new THREE.Vector3(0, 1, 0)),
          0xff0000
        );
      } else if (data.amount > 0) {
        // Healing
        this.game.combatSystem.createFloatingText(
          '+' + data.amount.toString(),
          hero.position.clone().add(new THREE.Vector3(0, 1, 0)),
          0x00ff00
        );
      }
    });
  }
}