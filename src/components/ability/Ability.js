import { Logger } from '../../utils/Logger.js';

/**
 * Base class for abilities
 */
export class Ability {
  constructor(config) {
    this.logger = new Logger('Ability');
    
    // Basic properties
    this.id = config.id || 'ability_' + Math.random().toString(36).substring(2, 9);
    this.name = config.name || 'Unknown Ability';
    this.description = config.description || '';
    this.type = config.type || 'active'; // active, passive, toggle
    this.cooldown = config.cooldown || 5000; // ms
    this.level = config.level || 1;
    this.maxLevel = config.maxLevel || 5;
    this.icon = config.icon || null;
    this.effectColor = config.effectColor || 0xffffff;
    
    // Ability-specific properties
    this.damageMultiplier = config.damageMultiplier || 1;
    this.rangeMultiplier = config.rangeMultiplier || 1;
    this.duration = config.duration || 0;
    this.aoeRadius = config.aoeRadius || 0;
    this.targetCount = config.targetCount || 1;
    
    // Base values for scaling with levels
    this.baseDamageMultiplier = this.damageMultiplier;
    this.baseRangeMultiplier = this.rangeMultiplier;
    this.baseDuration = this.duration;
    this.baseAoeRadius = this.aoeRadius;
    this.baseTargetCount = this.targetCount;
    
    this.logger.debug(`Created ability: ${this.name} (${this.type})`);
  }
  
  /**
   * Use the ability
   * @param {Hero} caster - The hero using the ability
   * @param {Object} target - Target of the ability (enemy, position, etc.)
   * @returns {Object} Result of the ability use
   */
  use(caster, target) {
    this.logger.debug(`Using ability: ${this.name}`);
    
    // Base implementation - override in subclasses
    return {
      success: false,
      message: 'Ability not implemented'
    };
  }
  
  /**
   * Check if the ability can be used
   * @param {Hero} caster - The hero trying to use the ability
   * @param {Object} target - Target of the ability
   * @returns {boolean} True if the ability can be used
   */
  canUse(caster, target) {
    // Default implementation - always usable
    return true;
  }
  
  /**
   * Level up the ability
   * @returns {boolean} True if the ability was successfully leveled up
   */
  levelUp() {
    if (this.level >= this.maxLevel) {
      this.logger.debug(`Ability ${this.name} already at max level ${this.maxLevel}`);
      return false;
    }
    
    this.level++;
    
    // Apply level-up effects
    this.applyLevelUpEffects();
    
    this.logger.debug(`Ability ${this.name} leveled up to ${this.level}`);
    return true;
  }
  
  /**
   * Apply effects when ability levels up
   */
  applyLevelUpEffects() {
    // Apply level-based improvements based on ability type
    switch (this.type) {
      case 'active':
        // Scale damage and cooldown
        this.damageMultiplier = this.baseDamageMultiplier * (1 + 0.2 * (this.level - 1));
        this.cooldown = Math.round(this.cooldown * Math.pow(0.9, this.level - 1));
        break;
      
      case 'aoe':
        // Scale damage, area, and cooldown
        this.damageMultiplier = this.baseDamageMultiplier * (1 + 0.15 * (this.level - 1));
        this.aoeRadius = this.baseAoeRadius * (1 + 0.1 * (this.level - 1));
        this.cooldown = Math.round(this.cooldown * Math.pow(0.92, this.level - 1));
        break;
      
      case 'buff':
        // Scale duration and effect strength
        this.duration = this.baseDuration * (1 + 0.2 * (this.level - 1));
        // Effect strength varies by specific ability, handle in subclasses
        break;
      
      case 'passive':
        // Effect strength varies by specific ability, handle in subclasses
        break;
    }
  }
  
  /**
   * Get ability description with current stats
   * @returns {string} Formatted ability description
   */
  getDescription() {
    // Base implementation - override in subclasses for more detailed descriptions
    return this.description;
  }
  
  /**
   * Get current stats as a formatted string
   * @returns {string} Formatted stats string
   */
  getStatsString() {
    let stats = [];
    
    if (this.damageMultiplier !== 1) {
      stats.push(`Damage: ${Math.round(this.damageMultiplier * 100)}%`);
    }
    
    if (this.rangeMultiplier !== 1) {
      stats.push(`Range: ${Math.round(this.rangeMultiplier * 100)}%`);
    }
    
    if (this.duration > 0) {
      stats.push(`Duration: ${(this.duration / 1000).toFixed(1)}s`);
    }
    
    if (this.aoeRadius > 0) {
      stats.push(`Radius: ${this.aoeRadius.toFixed(1)}`);
    }
    
    if (this.targetCount > 1) {
      stats.push(`Targets: ${this.targetCount}`);
    }
    
    if (this.cooldown > 0) {
      stats.push(`Cooldown: ${(this.cooldown / 1000).toFixed(1)}s`);
    }
    
    return stats.join(' | ');
  }
}