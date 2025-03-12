import * as THREE from 'three';
import { Logger } from '../../utils/Logger.js';
import { EventEmitter } from '../../utils/EventEmitter.js';

/**
 * Base Hero class that represents the player character
 */
export class Hero {
  constructor(game, heroData) {
    this.logger = new Logger('Hero');
    this.game = game;
    this.events = new EventEmitter();

    // Hero properties
    this.id = heroData.id || 'hero_' + Math.random().toString(36).substring(2, 9);
    this.name = heroData.name || 'Hero';
    this.type = heroData.type || 'warrior';
    this.baseStats = heroData.baseStats || {};
    this.color = heroData.color || 0x4169e1;

    // Dynamic properties
    this.level = 1;
    this.position = new THREE.Vector3(0, 0.5, 8);
    this.rotation = new THREE.Euler(0, 0, 0);
    this.targetPosition = null;
    this.attackCooldown = 0;
    this.abilities = heroData.abilities || [];
    this.abilityCooldowns = {};
    this.buffs = [];

    // Upgrade stats
    this.upgradeStats = {
      damage: { level: 1, value: this.baseStats.damage || 10 },
      attackSpeed: { level: 1, value: this.baseStats.attackRate || 1000 },
      range: { level: 1, value: this.baseStats.range || 2.5 },
      health: { level: 1, value: this.baseStats.health || 100 }
    };

    // 3D representation
    this.mesh = null;
    this.weaponMesh = null;
    this.rangeIndicator = null;

    // Initialize ability cooldowns
    this.abilities.forEach((ability, index) => {
      this.abilityCooldowns[index] = 0;
    });

    this.logger.debug(`Created hero: ${this.name} (${this.type})`);
  }

  /**
   * Create the 3D mesh for the hero
   * @returns {THREE.Group} The hero mesh group
   */
  createMesh() {
    this.logger.debug(`Creating mesh for hero: ${this.name}`);

    // Create group to hold all hero components
    const heroGroup = new THREE.Group();
    heroGroup.position.copy(this.position);
    heroGroup.rotation.copy(this.rotation);

    // Add base/platform
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.3,
      roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0;
    base.castShadow = true;
    heroGroup.add(base);

    // Add body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.3,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.35;
    body.castShadow = true;
    heroGroup.add(body);

    // Add head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xE0E0E0,
      metalness: 0.1,
      roughness: 0.5
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.8;
    head.castShadow = true;
    heroGroup.add(head);

    // Add range indicator (initially invisible)
    const rangeGeometry = new THREE.RingGeometry(0, this.upgradeStats.range.value, 32);
    const rangeMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    this.rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
    this.rangeIndicator.rotation.x = -Math.PI / 2;
    this.rangeIndicator.position.y = 0.1;
    this.rangeIndicator.visible = false;
    heroGroup.add(this.rangeIndicator);

    // Store reference to the mesh
    this.mesh = heroGroup;

    return heroGroup;
  }

  /**
   * Update hero logic
   * @param {number} delta - Time since last update in seconds
   */
  update(delta) {
    if (!this.mesh) return;

    // Move hero toward target position
    if (this.targetPosition) {
      const direction = new THREE.Vector3().subVectors(this.targetPosition, this.mesh.position);

      if (direction.length() > 0.1) {
        // Move toward target
        direction.normalize();

        // Apply movement speed modifications
        let moveSpeed = 5 * delta;

        // Apply buffs and modifiers
        this.buffs.forEach(buff => {
          if (buff.moveSpeedMultiplier) {
            moveSpeed *= buff.moveSpeedMultiplier;
          }
        });

        this.mesh.position.add(direction.multiplyScalar(moveSpeed));

        // Update internal position
        this.position.copy(this.mesh.position);

        // Rotate to face direction of movement
        const targetRotation = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.y = targetRotation;
        this.rotation.y = targetRotation;
      } else {
        // Reached target
        this.targetPosition = null;
      }
    }

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= 1000 * delta;
    }

    // Auto-attack nearest enemy in range
    this.findAndAttackNearestEnemy();

    // Update ability cooldowns
    Object.keys(this.abilityCooldowns).forEach(index => {
      if (this.abilityCooldowns[index] > 0) {
        this.abilityCooldowns[index] -= 1000 * delta;

        if (this.abilityCooldowns[index] <= 0) {
          this.abilityCooldowns[index] = 0;
          this.events.emit('abilityCooldownComplete', { index });
        }
      }
    });

    // Update buffs
    this.updateBuffs(delta);
  }

  /**
   * Find and attack the nearest enemy in range
   */
  findAndAttackNearestEnemy() {
    // Skip if on cooldown
    if (this.attackCooldown > 0) return;

    // Skip if no enemies available
    if (!this.game || !this.game.state || !this.game.state.enemies || this.game.state.enemies.length === 0) {
      return;
    }

    // Find closest enemy in range
    let closestEnemy = null;
    let closestDistance = this.upgradeStats.range.value;

    this.game.state.enemies.forEach(enemy => {
      if (!enemy || !enemy.position) return;

      const distance = this.position.distanceTo(enemy.position);
      if (distance <= closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    });

    // Attack if an enemy is in range
    if (closestEnemy) {
      this.logger.debug(`Auto-attacking enemy: ${closestEnemy.id} at distance ${closestDistance.toFixed(2)}`);
      this.attack(closestEnemy);
    }
  }

  /**
   * Update active buffs
   * @param {number} delta - Time since last update in seconds
   */
  updateBuffs(delta) {
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const buff = this.buffs[i];

      // Update remaining duration
      buff.remainingDuration -= 1000 * delta;

      // Remove expired buffs
      if (buff.remainingDuration <= 0) {
        // Remove buff visual effect if it exists
        if (buff.visualEffect && this.mesh) {
          this.mesh.remove(buff.visualEffect);
        }

        // Emit event
        this.events.emit('buffEnded', { buff });

        // Remove from array
        this.buffs.splice(i, 1);
      } else {
        // Update visual effect
        if (buff.visualEffect) {
          // Adjust opacity based on remaining time
          const remainingFraction = buff.remainingDuration / buff.duration;
          buff.visualEffect.material.opacity = 0.3 * remainingFraction;

          // Pulse effect
          const pulseScale = 1 + 0.1 * Math.sin(Date.now() / 200);
          buff.visualEffect.scale.set(pulseScale, pulseScale, pulseScale);
        }
      }
    }
  }

  /**
   * Move the hero to a target position
   * @param {THREE.Vector3} targetPosition - Target position to move to
   */
  moveTo(targetPosition) {
    this.targetPosition = targetPosition.clone();
  }

  /**
   * Attack a target enemy
   * @param {Enemy} enemy - Enemy to attack
   * @returns {boolean} True if attack was successful
   */
  attack(enemy) {
    if (this.attackCooldown > 0) return false;

    const distance = this.position.distanceTo(enemy.position);
    if (distance > this.upgradeStats.range.value) return false;

    // Face the enemy
    const direction = new THREE.Vector3().subVectors(enemy.position, this.position);
    this.rotation.y = Math.atan2(direction.x, direction.z);
    if (this.mesh) this.mesh.rotation.y = this.rotation.y;

    // Calculate damage
    let damage = this.upgradeStats.damage.value;

    // Apply buffs
    this.buffs.forEach(buff => {
      if (buff.damageMultiplier) {
        damage *= buff.damageMultiplier;
      }
    });

    // Check for critical hit
    let isCrit = false;
    let critChance = 0;
    let critDamage = 1.5; // Base crit damage is 50% extra

    // Apply crit buffs
    this.buffs.forEach(buff => {
      if (buff.critChance) {
        critChance += buff.critChance;
      }
      if (buff.critDamage) {
        critDamage += buff.critDamage;
      }
    });

    // Roll for crit
    if (critChance > 0 && Math.random() < critChance) {
      damage *= critDamage;
      isCrit = true;
    }

    // Round final damage
    damage = Math.round(damage);

    // Deal damage to enemy
    enemy.takeDamage(damage, this, isCrit);

    // Reset attack cooldown
    this.attackCooldown = this.upgradeStats.attackSpeed.value;

    // Emit attack event
    this.events.emit('attack', {
      target: enemy,
      damage: damage,
      isCrit: isCrit
    });

    return true;
  }

  /**
   * Use an ability
   * @param {number} abilityIndex - Index of the ability to use
   * @returns {boolean} True if ability was used successfully
   */
  useAbility(abilityIndex) {
    if (abilityIndex < 0 || abilityIndex >= this.abilities.length) {
      this.logger.warn(`Invalid ability index: ${abilityIndex}`);
      return false;
    }

    if (this.abilityCooldowns[abilityIndex] > 0) {
      this.logger.debug(`Ability ${abilityIndex} on cooldown: ${this.abilityCooldowns[abilityIndex]}ms remaining`);
      return false;
    }

    const ability = this.abilities[abilityIndex];

    // Emit ability used event
    this.events.emit('abilityUsed', {
      abilityIndex: abilityIndex,
      ability: ability
    });

    // Start cooldown
    this.abilityCooldowns[abilityIndex] = ability.cooldown;

    return true;
  }

  /**
   * Apply a buff to the hero
   * @param {Object} buffData - Buff data
   */
  applyBuff(buffData) {
    const buff = {
      id: buffData.id || 'buff_' + Math.random().toString(36).substring(2, 9),
      name: buffData.name || 'Buff',
      duration: buffData.duration || 5000,
      remainingDuration: buffData.duration || 5000,
      damageMultiplier: buffData.damageMultiplier || null,
      damageReduction: buffData.damageReduction || null,
      moveSpeedMultiplier: buffData.moveSpeedMultiplier || null,
      critChance: buffData.critChance || null,
      critDamage: buffData.critDamage || null,
      visualEffect: null
    };

    // Create visual effect if mesh exists
    if (this.mesh && buffData.effectColor) {
      const effectGeometry = new THREE.SphereGeometry(1, 16, 16);
      const effectMaterial = new THREE.MeshBasicMaterial({
        color: buffData.effectColor,
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });

      buff.visualEffect = new THREE.Mesh(effectGeometry, effectMaterial);
      this.mesh.add(buff.visualEffect);
    }

    // Add to active buffs
    this.buffs.push(buff);

    // Emit buff applied event
    this.events.emit('buffApplied', { buff });
  }

  /**
   * Upgrade a hero stat
   * @param {string} statType - Stat to upgrade (damage, attackSpeed, range, health)
   * @param {Object} upgradeConfig - Upgrade configuration
   * @returns {boolean} True if upgrade was successful
   */
  upgradeStat(statType, upgradeConfig) {
    if (!this.upgradeStats[statType]) {
      this.logger.warn(`Invalid stat type: ${statType}`);
      return false;
    }

    // Increase level
    this.upgradeStats[statType].level++;

    // Apply the upgrade effect
    switch (statType) {
      case 'damage':
        this.upgradeStats.damage.value = Math.round(
          this.baseStats.damage * Math.pow(upgradeConfig.valueMultipliers.damage, this.upgradeStats.damage.level - 1)
        );
        break;

      case 'attackSpeed':
        this.upgradeStats.attackSpeed.value = Math.round(
          this.baseStats.attackRate * Math.pow(upgradeConfig.valueMultipliers.attackSpeed, this.upgradeStats.attackSpeed.level - 1)
        );
        break;

      case 'range':
        this.upgradeStats.range.value =
          this.baseStats.range * Math.pow(upgradeConfig.valueMultipliers.range, this.upgradeStats.range.level - 1);

        // Update range indicator if it exists
        if (this.rangeIndicator) {
          this.rangeIndicator.geometry.dispose();
          this.rangeIndicator.geometry = new THREE.RingGeometry(0, this.upgradeStats.range.value, 32);
        }
        break;

      case 'health':
        const oldMaxHealth = this.upgradeStats.health.value;
        this.upgradeStats.health.value = Math.round(
          this.baseStats.health * Math.pow(upgradeConfig.valueMultipliers.health, this.upgradeStats.health.level - 1)
        );

        // Heal by the difference between old and new max health
        const healthDiff = this.upgradeStats.health.value - oldMaxHealth;
        this.events.emit('healthChanged', { amount: healthDiff, source: 'upgrade' });
        break;
    }

    // Update hero appearance
    this.updateAppearance();

    // Emit upgrade event
    this.events.emit('statUpgraded', {
      statType: statType,
      newLevel: this.upgradeStats[statType].level,
      newValue: this.upgradeStats[statType].value
    });

    return true;
  }

  /**
   * Update hero appearance based on upgrades
   */
  updateAppearance() {
    if (!this.mesh) return;

    // Base implementation - extended by subclasses
  }

  /**
   * Take damage from an attack
   * @param {number} amount - Amount of damage to take
   * @param {Object} source - Source of the damage
   * @returns {number} Actual damage taken
   */
  takeDamage(amount, source) {
    // Apply damage reduction from buffs
    let damageReduction = 0;
  
    this.buffs.forEach(buff => {
      if (buff.damageReduction) {
        damageReduction += buff.damageReduction;
      }
    });
  
    // Cap damage reduction at 90%
    damageReduction = Math.min(0.9, damageReduction);
  
    // Calculate final damage
    const actualDamage = Math.round(amount * (1 - damageReduction));
    
    // Update hero's health - ADD THIS LINE
    this.upgradeStats.health.value = Math.max(0, this.upgradeStats.health.value - actualDamage);
  
    // Emit health changed event
    this.events.emit('healthChanged', {
      amount: -actualDamage,
      source: source
    });
    
    // Check if hero is defeated - ADD THESE LINES
    if (this.upgradeStats.health.value <= 0 && this.game) {
      this.game.gameOver();
    }
  
    return actualDamage;
  }

  /**
   * Show the range indicator
   * @param {boolean} visible - Whether to show the range indicator
   */
  showRangeIndicator(visible) {
    if (this.rangeIndicator) {
      this.rangeIndicator.visible = visible;
    }
  }

  /**
   * Get the hero's current stats
   * @returns {Object} Hero stats
   */
  getStats() {
    return {
      name: this.name,
      type: this.type,
      level: this.level,
      damage: this.upgradeStats.damage.value,
      attackSpeed: this.upgradeStats.attackSpeed.value,
      range: this.upgradeStats.range.value,
      health: this.upgradeStats.health.value,
      position: this.position.clone(),
      rotation: this.rotation.clone()
    };
  }

  /**
   * Clean up resources used by the hero
   */
  dispose() {
    this.logger.debug(`Disposing hero: ${this.name}`);

    // Clean up event listeners
    this.events.clear();

    // Clean up buffs
    this.buffs.forEach(buff => {
      if (buff.visualEffect && this.mesh) {
        this.mesh.remove(buff.visualEffect);
      }
    });

    this.buffs = [];
  }
}