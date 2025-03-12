/**
 * Main game configuration
 */
export const CONFIG = {
    // Hero class configurations
    heroClasses: {
      warrior: {
        name: "Warrior",
        baseStats: {
          damage: 10,
          attackRate: 1000, // ms
          range: 2.5,
          health: 100
        },
        color: 0x4169e1, // Royal blue
        abilities: [
          {
            name: "Whirlwind", 
            description: "Spin and damage all enemies in range",
            cooldown: 8000,
            type: "aoe",
            damageMultiplier: 0.8,
            rangeMultiplier: 1,
            effectColor: 0xff0000
          },
          {
            name: "Shield Block", 
            description: "Reduce incoming damage by 50% for 5 seconds",
            cooldown: 15000,
            type: "buff",
            duration: 5000,
            effectColor: 0xffff00
          },
          {
            name: "Heroic Strike", 
            description: "Deal 2x damage to a single target",
            cooldown: 6000,
            type: "single",
            damageMultiplier: 2,
            effectColor: 0xffa500
          },
          {
            name: "Battle Shout", 
            description: "Increase damage by 30% for 10 seconds",
            cooldown: 20000,
            type: "buff",
            duration: 10000,
            effectValue: 1.3,
            effectColor: 0x00ff00
          }
        ],
        specialUpgrades: [
          {
            name: "Defense Mastery",
            description: "Reduces incoming damage by 5% per level",
            cost: 50,
            costMultiplier: 1.5,
            effect: (level) => ({ damageReduction: 0.05 * level })
          },
          {
            name: "Weapon Mastery",
            description: "Critical hit chance increased by 5% per level",
            cost: 75,
            costMultiplier: 1.5,
            effect: (level) => ({ critChance: 0.05 * level })
          }
        ]
      },
      ranger: {
        name: "Ranger",
        baseStats: {
          damage: 8,
          attackRate: 800, // ms
          range: 4,
          health: 80
        },
        color: 0x32cd32, // Lime green
        abilities: [
          {
            name: "Multi-Shot", 
            description: "Fire arrows at up to 3 targets",
            cooldown: 8000,
            type: "multi",
            targetCount: 3,
            damageMultiplier: 0.7,
            effectColor: 0x32cd32
          },
          {
            name: "Sniper Shot", 
            description: "Deal 3x damage to a distant target",
            cooldown: 10000,
            type: "single",
            damageMultiplier: 3,
            rangeMultiplier: 1.5,
            effectColor: 0xff0000
          },
          {
            name: "Trap", 
            description: "Place a trap that slows enemies",
            cooldown: 12000,
            type: "zone",
            duration: 8000,
            slow: 0.5,
            effectColor: 0x8b4513
          },
          {
            name: "Evasion", 
            description: "50% chance to dodge attacks for 5 seconds",
            cooldown: 15000,
            type: "buff",
            duration: 5000,
            effectValue: 0.5,
            effectColor: 0x1e90ff
          }
        ],
        specialUpgrades: [
          {
            name: "Eagle Eye",
            description: "Increases critical damage by 10% per level",
            cost: 60,
            costMultiplier: 1.5,
            effect: (level) => ({ critDamage: 0.1 * level })
          },
          {
            name: "Quick Reflexes",
            description: "Increases movement speed by 5% per level",
            cost: 40,
            costMultiplier: 1.4,
            effect: (level) => ({ moveSpeed: 0.05 * level })
          }
        ]
      },
      mage: {
        name: "Mage",
        baseStats: {
          damage: 12,
          attackRate: 1200, // ms
          range: 3.5,
          health: 70
        },
        color: 0x9370db, // Medium purple
        abilities: [
          {
            name: "Fireball", 
            description: "Launch a fireball dealing AoE damage",
            cooldown: 8000,
            type: "projectile",
            aoeRadius: 2,
            damageMultiplier: 1.5,
            effectColor: 0xff4500
          },
          {
            name: "Frost Nova", 
            description: "Freeze all enemies in range for 3 seconds",
            cooldown: 12000,
            type: "aoe",
            duration: 3000,
            damageMultiplier: 0.5,
            effectColor: 0x00ffff
          },
          {
            name: "Arcane Missiles", 
            description: "Channel multiple missiles at a target",
            cooldown: 10000,
            type: "channel",
            duration: 3000,
            missileCount: 5,
            damageMultiplier: 0.6,
            effectColor: 0xff00ff
          },
          {
            name: "Mana Shield", 
            description: "Convert 30% of damage to mana cost",
            cooldown: 15000,
            type: "buff",
            duration: 8000,
            effectValue: 0.3,
            effectColor: 0x4169e1
          }
        ],
        specialUpgrades: [
          {
            name: "Spell Power",
            description: "Increases ability damage by 8% per level",
            cost: 65,
            costMultiplier: 1.6,
            effect: (level) => ({ spellPower: 0.08 * level })
          },
          {
            name: "Mana Flow",
            description: "Reduces ability cooldowns by 5% per level",
            cost: 70,
            costMultiplier: 1.6,
            effect: (level) => ({ cooldownReduction: 0.05 * level })
          }
        ]
      }
    },
    
    // Enemy type configurations
    enemyTypes: [
      { 
        name: 'grunt', 
        health: 30, 
        speed: 0.02, 
        damage: 5,
        value: 10, 
        color: 0xff0000,
        scale: 1,
        shape: 'box'
      },
      { 
        name: 'scout', 
        health: 20, 
        speed: 0.04, 
        damage: 3,
        value: 15, 
        color: 0x00ff00,
        scale: 0.8,
        shape: 'sphere'
      },
      { 
        name: 'brute', 
        health: 60, 
        speed: 0.015, 
        damage: 10,
        value: 20, 
        color: 0x8B4513,
        scale: 1.3,
        shape: 'box'
      },
      { 
        name: 'mage', 
        health: 15, 
        speed: 0.025, 
        damage: 8,
        value: 25, 
        color: 0x9370DB,
        scale: 0.9,
        shape: 'tetrahedron'
      },
      { 
        name: 'assassin', 
        health: 25, 
        speed: 0.05, 
        damage: 15,
        value: 30, 
        color: 0x800080,
        scale: 0.7,
        shape: 'cone'
      },
      { 
        name: 'commander', 
        health: 100, 
        speed: 0.01, 
        damage: 20,
        value: 50, 
        color: 0xFFD700,
        scale: 1.5,
        shape: 'box'
      }
    ],
    
    // Upgrade system configuration
    upgrades: {
      baseCosts: {
        damage: 20,
        attackSpeed: 25,
        range: 15,
        health: 10
      },
      costMultiplier: 1.4, // Cost increases by 40% per level
      valueMultipliers: {
        damage: 1.2,      // +20% per level
        attackSpeed: 0.9, // -10% cooldown per level
        range: 1.15,      // +15% per level
        health: 1.2       // +20% per level
      }
    },
    
    // Wave configuration
    waveConfig: [
      { types: ['grunt'], count: 5, interval: 2000 },
      { types: ['grunt', 'scout'], count: 8, interval: 1800 },
      { types: ['grunt', 'scout', 'brute'], count: 10, interval: 1600 },
      { types: ['grunt', 'scout', 'brute', 'mage'], count: 12, interval: 1400 },
      { types: ['scout', 'brute', 'mage'], count: 15, interval: 1200 },
      { types: ['scout', 'brute', 'mage', 'assassin'], count: 18, interval: 1100 },
      { types: ['brute', 'mage', 'assassin'], count: 20, interval: 1000 },
      { types: ['mage', 'assassin', 'commander'], count: 15, interval: 1200 },
      { types: ['brute', 'mage', 'assassin', 'commander'], count: 25, interval: 900 },
      { types: ['assassin', 'commander'], count: 30, interval: 800 }
    ],
    
    // Difficulty scaling configuration
    difficultyScaling: {
      healthMultiplier: 1.1,  // Enemy health +10% per wave beyond configured waves
      countMultiplier: 1.1,   // Enemy count +10% per wave
      intervalDivisor: 1.05,  // Spawn interval reduced by 5% per wave
      valueMultiplier: 1.05   // Gold value +5% per wave
    },
    
    // Multiplayer configuration
    multiplayer: {
      syncInterval: 100,      // ms between sync messages
      reconnectTimeout: 5000, // ms to wait for reconnect
      maxPlayers: 4,          // maximum players per game
      difficultyMultiplier: 0.5 // Extra scaling per additional player (50% more enemies per player)
    }
  };