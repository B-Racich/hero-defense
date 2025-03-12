import { Logger } from '../../utils/Logger.js';
import { CONFIG } from '../../config/GameConfig.js';

/**
 * Manages hero upgrades, costs, and progression
 */
export class UpgradeSystem {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.logger = new Logger('UpgradeSystem');
    
    // Upgrade configurations
    this.upgradeCosts = {};
    this.upgradeValues = {};
    
    // Special upgrades (hero-specific)
    this.specialUpgrades = {};
    
    this.logger.debug('Upgrade system created');
  }
  
  /**
   * Initialize upgrade system
   */
  initialize() {
    this.logger.info('Initializing upgrade system');
    
    // Initialize upgrade costs based on game config
    this.initializeUpgradeCosts();
    
    // Initialize hero-specific special upgrades
    this.initializeSpecialUpgrades();
    
    this.logger.info('Upgrade system initialized');
  }
  
  /**
   * Initialize upgrade costs from config
   */
  initializeUpgradeCosts() {
    if (!CONFIG || !CONFIG.upgrades) {
      this.logger.error('Upgrade configuration not found');
      return;
    }
    
    // Get base costs from config
    const baseCosts = CONFIG.upgrades.baseCosts;
    
    // Initialize upgrade costs with base values
    this.upgradeCosts = {
      damage: baseCosts.damage || 20,
      attackSpeed: baseCosts.attackSpeed || 25,
      range: baseCosts.range || 15,
      health: baseCosts.health || 10
    };
    
    this.logger.debug('Initialized upgrade costs:', this.upgradeCosts);
  }
  
  /**
   * Initialize hero-specific special upgrades
   */
  initializeSpecialUpgrades() {
    if (!this.game.state.hero || !this.game.state.heroClass) {
      // No hero selected yet, will initialize later
      return;
    }
    
    const heroClass = this.game.state.heroClass;
    
    if (!CONFIG.heroClasses || !CONFIG.heroClasses[heroClass]) {
      this.logger.error(`Hero class config not found: ${heroClass}`);
      return;
    }
    
    // Get special upgrades for this hero class
    const specialUpgrades = CONFIG.heroClasses[heroClass].specialUpgrades || [];
    
    // Initialize special upgrades
    this.specialUpgrades = {};
    
    specialUpgrades.forEach(upgrade => {
      this.specialUpgrades[upgrade.name] = {
        description: upgrade.description,
        level: 0,
        maxLevel: upgrade.maxLevel || 5,
        cost: upgrade.cost || 50,
        costMultiplier: upgrade.costMultiplier || 1.5,
        effect: upgrade.effect
      };
    });
    
    this.logger.debug('Initialized special upgrades for hero class:', heroClass);
  }
  
  /**
   * Upgrade a hero stat
   * @param {string} statType - Stat to upgrade (damage, attackSpeed, range, health)
   * @returns {boolean} True if upgrade was successful
   */
  upgradeHeroStat(statType) {
    // Check if hero exists
    if (!this.game.state.hero) {
      this.logger.error('Cannot upgrade: No hero selected');
      return false;
    }
    
    // Check if stat type is valid
    if (!this.upgradeCosts[statType]) {
      this.logger.error(`Invalid stat type: ${statType}`);
      return false;
    }
    
    // Get current upgrade cost
    const cost = this.getUpgradeCost(statType);
    
    // Check if player has enough gold
    if (this.game.state.gold < cost) {
      this.logger.debug(`Not enough gold for ${statType} upgrade. Have: ${this.game.state.gold}, Need: ${cost}`);
      return false;
    }
    
    // Apply upgrade to hero
    const hero = this.game.state.hero;
    const success = hero.upgradeStat(statType, CONFIG.upgrades);
    
    if (success) {
      // Deduct gold
      this.game.state.gold -= cost;
      
      // Update UI
      this.game.uiManager.updateGoldUI(this.game.state.gold);
      this.game.uiManager.updateUpgradeButtons();
      
      // Increment cost for next upgrade
      this.increaseUpgradeCost(statType);
      
      this.logger.info(`Upgraded ${statType} to level ${hero.upgradeStats[statType].level}`);
      
      // Emit upgrade event
      this.game.events.emit('heroUpgraded', {
        statType: statType,
        level: hero.upgradeStats[statType].level,
        cost: cost
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Upgrade a special hero ability
   * @param {string} upgradeName - Name of the special upgrade
   * @returns {boolean} True if upgrade was successful
   */
  upgradeSpecialAbility(upgradeName) {
    // Check if hero exists
    if (!this.game.state.hero) {
      this.logger.error('Cannot upgrade: No hero selected');
      return false;
    }
    
    // Check if upgrade exists
    if (!this.specialUpgrades[upgradeName]) {
      this.logger.error(`Invalid special upgrade: ${upgradeName}`);
      return false;
    }
    
    const upgrade = this.specialUpgrades[upgradeName];
    
    // Check if already at max level
    if (upgrade.level >= upgrade.maxLevel) {
      this.logger.debug(`Special upgrade ${upgradeName} already at max level`);
      return false;
    }
    
    // Calculate current cost
    const cost = Math.round(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.level));
    
    // Check if player has enough gold
    if (this.game.state.gold < cost) {
      this.logger.debug(`Not enough gold for ${upgradeName} upgrade. Have: ${this.game.state.gold}, Need: ${cost}`);
      return false;
    }
    
    // Increment level
    upgrade.level++;
    
    // Apply effect to hero
    if (upgrade.effect) {
      const effectValue = upgrade.effect(upgrade.level);
      
      // Apply effect based on type
      // This will depend on the hero implementation and the effect type
      // Here's a simplified example:
      const hero = this.game.state.hero;
      
      if (effectValue.damageReduction) {
        hero.applyBuff({
          name: upgradeName,
          duration: Infinity, // Permanent buff
          damageReduction: effectValue.damageReduction
        });
      }
      
      if (effectValue.critChance) {
        hero.applyBuff({
          name: upgradeName,
          duration: Infinity, // Permanent buff
          critChance: effectValue.critChance
        });
      }
      
      if (effectValue.critDamage) {
        hero.applyBuff({
          name: upgradeName,
          duration: Infinity, // Permanent buff
          critDamage: effectValue.critDamage
        });
      }
      
      if (effectValue.moveSpeed) {
        hero.applyBuff({
          name: upgradeName,
          duration: Infinity, // Permanent buff
          moveSpeedMultiplier: 1 + effectValue.moveSpeed
        });
      }
      
      if (effectValue.spellPower) {
        // Apply to hero abilities
        hero.abilities.forEach(ability => {
          if (ability.damageMultiplier) {
            ability.damageMultiplier *= (1 + effectValue.spellPower);
          }
        });
      }
      
      if (effectValue.cooldownReduction) {
        // Apply to hero abilities
        hero.abilities.forEach(ability => {
          ability.cooldown *= (1 - effectValue.cooldownReduction);
        });
      }
    }
    
    // Deduct gold
    this.game.state.gold -= cost;
    
    // Update UI
    this.game.uiManager.updateGoldUI(this.game.state.gold);
    
    this.logger.info(`Upgraded special ability ${upgradeName} to level ${upgrade.level}`);
    
    // Emit upgrade event
    this.game.events.emit('specialUpgrade', {
      name: upgradeName,
      level: upgrade.level,
      cost: cost
    });
    
    return true;
  }
  
  /**
   * Get the current cost for a stat upgrade
   * @param {string} statType - Stat type
   * @returns {number} Upgrade cost
   */
  getUpgradeCost(statType) {
    if (!this.upgradeCosts[statType]) {
      return Infinity;
    }
    
    return this.upgradeCosts[statType];
  }
  
  /**
   * Increase the cost for a stat upgrade
   * @param {string} statType - Stat type
   */
  increaseUpgradeCost(statType) {
    if (!this.upgradeCosts[statType]) return;
    
    // Get cost multiplier from config
    const multiplier = CONFIG.upgrades?.costMultiplier || 1.4;
    
    // Increase cost based on multiplier
    this.upgradeCosts[statType] = Math.round(this.upgradeCosts[statType] * multiplier);
    
    this.logger.debug(`Increased ${statType} upgrade cost to ${this.upgradeCosts[statType]}`);
  }
  
  /**
   * Get all current upgrade costs
   * @returns {Object} Object with all upgrade costs
   */
  getUpgradeCosts() {
    return { ...this.upgradeCosts };
  }
  
  /**
   * Get all special upgrade costs
   * @returns {Object} Object with all special upgrade costs
   */
  getSpecialUpgradeCosts() {
    const costs = {};
    
    Object.keys(this.specialUpgrades).forEach(name => {
      const upgrade = this.specialUpgrades[name];
      costs[name] = Math.round(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.level));
    });
    
    return costs;
  }
  
  /**
   * Get special upgrade details
   * @returns {Object} Details of all special upgrades
   */
  getSpecialUpgrades() {
    return { ...this.specialUpgrades };
  }
  
  /**
   * Reset upgrade system
   */
  reset() {
    this.logger.info('Resetting upgrade system');
    
    // Re-initialize upgrade costs
    this.initializeUpgradeCosts();
    
    // Reset special upgrades
    Object.keys(this.specialUpgrades).forEach(name => {
      this.specialUpgrades[name].level = 0;
    });
  }
}