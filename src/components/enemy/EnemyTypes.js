/**
 * Definitions for different enemy types
 */
export const EnemyTypes = {
    // Basic melee enemy
    grunt: {
      name: 'grunt',
      health: 30,
      speed: 0.02,
      damage: 5,
      value: 10,
      color: 0xff0000,
      scale: 1,
      shape: 'box',
      
      // Custom properties
      attackRange: 1,
      attackSpeed: 1000
    },
    
    // Fast, low health enemy
    scout: {
      name: 'scout',
      health: 20,
      speed: 0.04,
      damage: 3,
      value: 15,
      color: 0x00ff00,
      scale: 0.8,
      shape: 'sphere',
      
      // Custom properties
      attackRange: 1.5,
      attackSpeed: 800
    },
    
    // High health, slow enemy
    brute: {
      name: 'brute',
      health: 60,
      speed: 0.015,
      damage: 10,
      value: 20,
      color: 0x8B4513,
      scale: 1.3,
      shape: 'box',
      
      // Custom properties
      attackRange: 1,
      attackSpeed: 1500
    },
    
    // Ranged caster enemy
    mage: {
      name: 'mage',
      health: 15,
      speed: 0.025,
      damage: 8,
      value: 25,
      color: 0x9370DB,
      scale: 0.9,
      shape: 'tetrahedron',
      
      // Custom properties
      attackRange: 4,
      attackSpeed: 2000,
      projectileSpeed: 0.1,
      projectileDamage: 8
    },
    
    // High speed, high damage
    assassin: {
      name: 'assassin',
      health: 25,
      speed: 0.05,
      damage: 15,
      value: 30,
      color: 0x800080,
      scale: 0.7,
      shape: 'cone',
      
      // Custom properties
      attackRange: 0.8,
      attackSpeed: 600,
      critChance: 0.3,
      critMultiplier: 2
    },
    
    // Elite enemy
    commander: {
      name: 'commander',
      health: 100,
      speed: 0.01,
      damage: 20,
      value: 50,
      color: 0xFFD700,
      scale: 1.5,
      shape: 'box',
      
      // Custom properties
      attackRange: 1.5,
      attackSpeed: 2000,
      auraRange: 3,
      auraEffect: {
        type: 'buff',
        speedBonus: 0.2,
        damageBonus: 0.3
      }
    }
  };
  
  /**
   * Get enemy data by type
   * @param {string} type - Enemy type name
   * @returns {Object} Enemy data or null if not found
   */
  export function getEnemyDataByType(type) {
    return EnemyTypes[type] || null;
  }
  
  /**
   * Get all enemy types
   * @returns {Array<string>} Array of enemy type names
   */
  export function getAllEnemyTypes() {
    return Object.keys(EnemyTypes);
  }
  
  /**
   * Get enemy types available for a specific wave
   * @param {number} wave - Wave number
   * @returns {Array<string>} Array of enemy type names
   */
  export function getEnemyTypesForWave(wave) {
    if (wave <= 1) {
      return ['grunt'];
    } else if (wave <= 2) {
      return ['grunt', 'scout'];
    } else if (wave <= 4) {
      return ['grunt', 'scout', 'brute'];
    } else if (wave <= 6) {
      return ['grunt', 'scout', 'brute', 'mage'];
    } else if (wave <= 8) {
      return ['scout', 'brute', 'mage', 'assassin'];
    } else {
      return ['brute', 'mage', 'assassin', 'commander'];
    }
  }