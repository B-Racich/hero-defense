import * as THREE from 'three';
import { Hero } from './Hero.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Warrior hero class - specializes in melee combat with high defense
 */
export class Warrior extends Hero {
  constructor(game, heroData) {
    super(game, {
      ...heroData,
      type: 'warrior',
      name: heroData.name || 'Warrior'
    });
    
    this.logger = new Logger('Warrior');
    
    // Warrior-specific properties
    this.shieldMesh = null;
    this.swordMesh = null;
    
    this.logger.debug(`Created warrior: ${this.name}`);
  }
  
  /**
   * Create the 3D mesh for the warrior
   * @returns {THREE.Group} The warrior mesh group
   */
  createMesh() {
    // Create base hero mesh
    const heroGroup = super.createMesh();
    
    // Add sword
    const swordGroup = new THREE.Group();
    
    // Sword handle
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.1,
      roughness: 0.8
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    swordGroup.add(handle);
    
    // Sword blade
    const bladeGeometry = new THREE.BoxGeometry(0.08, 0.6, 0.02);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0,
      metalness: 0.8,
      roughness: 0.2
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.4;
    swordGroup.add(blade);
    
    // Sword guard
    const guardGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.05);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.8,
      roughness: 0.2
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.y = 0.1;
    swordGroup.add(guard);
    
    // Position the sword
    swordGroup.position.set(0.4, 0.5, 0);
    swordGroup.rotation.z = -Math.PI / 4;
    heroGroup.add(swordGroup);
    
    // Store reference to sword
    this.swordMesh = swordGroup;
    
    // Add shield
    const shieldGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.05);
    const shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B0000,
      metalness: 0.4,
      roughness: 0.6
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.set(-0.4, 0.5, 0);
    shield.castShadow = true;
    heroGroup.add(shield);
    
    // Store reference to shield
    this.shieldMesh = shield;
    
    // Add armor plate
    const plateGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.4);
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969,
      metalness: 0.6,
      roughness: 0.4
    });
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.y = 0.5;
    plate.castShadow = true;
    heroGroup.add(plate);
    
    return heroGroup;
  }
  
  /**
   * Update warrior appearance based on upgrades
   */
  updateAppearance() {
    super.updateAppearance();
    
    if (!this.mesh) return;
    
    // Scale sword based on damage level
    const damageLevel = this.upgradeStats.damage.level;
    if (this.swordMesh) {
      this.swordMesh.scale.set(
        1 + (damageLevel - 1) * 0.15,
        1 + (damageLevel - 1) * 0.15,
        1 + (damageLevel - 1) * 0.15
      );
    }
    
    // Change body color based on attack speed
    const attackSpeedLevel = this.upgradeStats.attackSpeed.level;
    if (attackSpeedLevel > 1) {
      // Body is the second child (index 1)
      const body = this.mesh.children[1];
      if (body && body.material) {
        // Adjust color to indicate attack speed
        const intensity = 0.1 * (attackSpeedLevel - 1);
        
        // Get base color
        const baseColor = new THREE.Color(this.color);
        
        // Lighten the color
        body.material.color.set(
          baseColor.r + intensity,
          baseColor.g + intensity,
          baseColor.b + intensity
        );
      }
    }
    
    // Scale hero based on health level
    const healthLevel = this.upgradeStats.health.level;
    if (healthLevel > 1) {
      this.mesh.scale.set(
        1 + (healthLevel - 1) * 0.1,
        1 + (healthLevel - 1) * 0.1,
        1 + (healthLevel - 1) * 0.1
      );
    }
    
    // Update shield based on defensive upgrades
    if (this.shieldMesh) {
      // Example: make shield larger and more metallic with upgrades
      const defenseLevel = Math.max(damageLevel, healthLevel);
      this.shieldMesh.scale.set(
        1 + (defenseLevel - 1) * 0.1,
        1 + (defenseLevel - 1) * 0.1,
        1 + (defenseLevel - 1) * 0.1
      );
      
      if (this.shieldMesh.material) {
        this.shieldMesh.material.metalness = Math.min(0.8, 0.4 + (defenseLevel - 1) * 0.1);
      }
    }
  }
  
  /**
   * Animate the warrior's attack
   * @returns {Promise} Promise that resolves when animation completes
   */
  animateAttack() {
    return new Promise(resolve => {
      if (!this.mesh || !this.swordMesh) {
        resolve();
        return;
      }
      
      const duration = 10; // frames
      const maxRotation = Math.PI / 3;
      let frameCount = 0;
      
      const animateFrame = () => {
        frameCount++;
        
        // Swing forward then back
        let progress = frameCount / duration;
        if (progress <= 0.5) {
          // Swing forward
          progress = progress * 2; // 0 to 1
          this.swordMesh.rotation.z = -Math.PI / 4 - progress * maxRotation;
        } else {
          // Swing back
          progress = (progress - 0.5) * 2; // 0 to 1
          this.swordMesh.rotation.z = -Math.PI / 4 - maxRotation + progress * maxRotation;
        }
        
        if (frameCount < duration) {
          requestAnimationFrame(animateFrame);
        } else {
          resolve();
        }
      };
      
      animateFrame();
    });
  }
  
  /**
   * Warrior's shield block ability
   * @returns {Object} Buff data
   */
  shieldBlock() {
    return {
      name: 'Shield Block',
      duration: 5000,
      damageReduction: 0.5,
      effectColor: 0xffff00
    };
  }
  
  /**
   * Warrior's heroic strike ability - deal 2x damage to a single target
   * @param {Enemy} enemy - Target enemy
   * @returns {boolean} True if ability was successful
   */
  heroicStrike(enemy) {
    if (!enemy) return false;
    
    const distance = this.position.distanceTo(enemy.position);
    if (distance > this.upgradeStats.range.value) return false;
    
    // Face the enemy
    const direction = new THREE.Vector3().subVectors(enemy.position, this.position);
    this.rotation.y = Math.atan2(direction.x, direction.z);
    if (this.mesh) this.mesh.rotation.y = this.rotation.y;
    
    // Calculate damage (2x normal damage)
    const damage = Math.round(this.upgradeStats.damage.value * 2);
    
    // Deal damage to enemy
    enemy.takeDamage(damage, this, true); // Force as critical hit
    
    // Animate attack
    this.animateAttack();
    
    return true;
  }
  
  /**
   * Warrior's whirlwind ability - damage all enemies in range
   * @param {Array<Enemy>} enemies - All enemies in game
   * @returns {Array<Enemy>} Enemies hit by the ability
   */
  whirlwind(enemies) {
    if (!enemies || enemies.length === 0) return [];
    
    // Get all enemies in range
    const range = this.upgradeStats.range.value;
    const enemiesInRange = enemies.filter(enemy => {
      const distance = this.position.distanceTo(enemy.position);
      return distance <= range;
    });
    
    if (enemiesInRange.length === 0) return [];
    
    // Animate spinning
    if (this.mesh) {
      const spinDuration = 1500; // ms
      const startTime = Date.now();
      const initialRotation = this.rotation.y;
      
      const spinInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < spinDuration) {
          // Spin hero
          this.rotation.y = initialRotation + (elapsed / spinDuration) * Math.PI * 4;
          if (this.mesh) this.mesh.rotation.y = this.rotation.y;
        } else {
          clearInterval(spinInterval);
        }
      }, 16);
    }
    
    // Calculate damage (80% of normal damage)
    const damage = Math.round(this.upgradeStats.damage.value * 0.8);
    
    // Deal damage to all enemies in range
    enemiesInRange.forEach(enemy => {
      enemy.takeDamage(damage, this, false);
    });
    
    return enemiesInRange;
  }
  
  /**
   * Warrior's battle shout ability - increase damage by 30% for 10 seconds
   * @returns {Object} Buff data
   */
  battleShout() {
    return {
      name: 'Battle Shout',
      duration: 10000,
      damageMultiplier: 1.3,
      effectColor: 0x00ff00
    };
  }
}