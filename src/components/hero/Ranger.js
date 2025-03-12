import * as THREE from 'three';
import { Hero } from './Hero.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Ranger hero class - specializes in ranged attacks with high precision
 */
export class Ranger extends Hero {
  constructor(game, heroData) {
    super(game, {
      ...heroData,
      type: 'ranger',
      name: heroData.name || 'Ranger'
    });
    
    this.logger = new Logger('Ranger');
    
    // Ranger-specific properties
    this.bowMesh = null;
    this.quiverMesh = null;
    
    this.logger.debug(`Created ranger: ${this.name}`);
  }
  
  /**
   * Create the 3D mesh for the ranger
   * @returns {THREE.Group} The ranger mesh group
   */
  createMesh() {
    // Create base hero mesh
    const heroGroup = super.createMesh();
    
    // Create slimmer body for ranger
    const bodyIndex = 1; // Body is the second child
    if (heroGroup.children[bodyIndex]) {
      heroGroup.remove(heroGroup.children[bodyIndex]);
      
      const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.35, 0.7, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.2,
        roughness: 0.6
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.4;
      body.castShadow = true;
      
      // Insert at same index
      heroGroup.children.splice(bodyIndex, 0, body);
      heroGroup.add(body);
    }
    
    // Add bow
    const bowGroup = new THREE.Group();
    
    // Bow frame
    const bowGeometry = new THREE.TorusGeometry(0.4, 0.03, 8, 16, Math.PI * 1.5);
    const bowMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.1,
      roughness: 0.8
    });
    const bow = new THREE.Mesh(bowGeometry, bowMaterial);
    bowGroup.add(bow);
    
    // Bow string
    const stringGeometry = new THREE.BufferGeometry();
    const stringPoints = [
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(0, -0.4, 0)
    ];
    stringGeometry.setFromPoints(stringPoints);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
    const string = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(string);
    
    // Position the bow
    bowGroup.position.set(0.4, 0.5, 0);
    bowGroup.rotation.z = Math.PI / 2;
    heroGroup.add(bowGroup);
    
    // Store reference to bow
    this.bowMesh = bowGroup;
    
    // Add quiver
    const quiverGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const quiverMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.2,
      roughness: 0.8
    });
    const quiver = new THREE.Mesh(quiverGeometry, quiverMaterial);
    quiver.position.set(-0.2, 0.4, -0.2);
    quiver.rotation.x = Math.PI / 6;
    quiver.castShadow = true;
    heroGroup.add(quiver);
    
    // Store reference to quiver
    this.quiverMesh = quiver;
    
    // Add arrows in quiver
    for (let i = 0; i < 3; i++) {
      const arrowGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4);
      const arrowMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B0000,
        metalness: 0.3,
        roughness: 0.5
      });
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.position.set(
        (Math.random() - 0.5) * 0.1,
        0.1,
        (Math.random() - 0.5) * 0.1
      );
      quiver.add(arrow);
    }
    
    return heroGroup;
  }
  
  /**
   * Update ranger appearance based on upgrades
   */
  updateAppearance() {
    super.updateAppearance();
    
    if (!this.mesh) return;
    
    // Scale bow based on damage level
    const damageLevel = this.upgradeStats.damage.level;
    if (this.bowMesh) {
      this.bowMesh.scale.set(
        1 + (damageLevel - 1) * 0.1,
        1 + (damageLevel - 1) * 0.1,
        1 + (damageLevel - 1) * 0.1
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
    
    // Add more arrows to quiver based on attack speed and damage
    if (this.quiverMesh) {
      const totalLevel = damageLevel + attackSpeedLevel;
      const targetArrowCount = 3 + Math.floor((totalLevel - 2) / 2);
      const currentArrowCount = this.quiverMesh.children.length;
      
      // Add more arrows if needed
      for (let i = currentArrowCount; i < targetArrowCount; i++) {
        const arrowGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4);
        const arrowMaterial = new THREE.MeshStandardMaterial({
          color: 0x8B0000,
          metalness: 0.3,
          roughness: 0.5
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.set(
          (Math.random() - 0.5) * 0.1,
          0.1 + (i - 3) * 0.05, // Stack higher
          (Math.random() - 0.5) * 0.1
        );
        this.quiverMesh.add(arrow);
      }
    }
  }
  
  /**
   * Animate the ranger's attack
   * @returns {Promise} Promise that resolves when animation completes
   */
  animateAttack() {
    return new Promise(resolve => {
      if (!this.mesh || !this.bowMesh) {
        resolve();
        return;
      }
      
      // Pull bow string animation
      const string = this.bowMesh.children[1]; // string is second child of bow
      if (!string) {
        resolve();
        return;
      }
      
      const duration = 10; // frames
      let frameCount = 0;
      
      const animateFrame = () => {
        frameCount++;
        
        const stringGeometry = new THREE.BufferGeometry();
        let progress = frameCount / duration;
        
        if (progress <= 0.5) {
          // Pull string back
          progress = progress * 2; // 0 to 1
          const pullAmount = 0.1 * progress;
          
          const stringPoints = [
            new THREE.Vector3(pullAmount, 0.4, 0),
            new THREE.Vector3(pullAmount, -0.4, 0)
          ];
          stringGeometry.setFromPoints(stringPoints);
          string.geometry = stringGeometry;
        } else {
          // Release string
          progress = (progress - 0.5) * 2; // 0 to 1
          const pullAmount = 0.1 * (1 - progress);
          
          const stringPoints = [
            new THREE.Vector3(pullAmount, 0.4, 0),
            new THREE.Vector3(pullAmount, -0.4, 0)
          ];
          stringGeometry.setFromPoints(stringPoints);
          string.geometry = stringGeometry;
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
   * Ranger's multi-shot ability - fire arrows at up to 3 targets
   * @param {Array<Enemy>} enemies - All enemies in game
   * @param {number} targetCount - Number of targets to hit
   * @returns {Array<Enemy>} Enemies hit by the ability
   */
  multiShot(enemies, targetCount = 3) {
    if (!enemies || enemies.length === 0) return [];
    
    // Get enemies in range
    const range = this.upgradeStats.range.value;
    const enemiesInRange = enemies.filter(enemy => {
      const distance = this.position.distanceTo(enemy.position);
      return distance <= range;
    });
    
    if (enemiesInRange.length === 0) return [];
    
    // Sort by distance
    enemiesInRange.sort((a, b) => {
      const distA = this.position.distanceTo(a.position);
      const distB = this.position.distanceTo(b.position);
      return distA - distB;
    });
    
    // Limit to targetCount
    const targets = enemiesInRange.slice(0, targetCount);
    
    // Animate attack
    this.animateAttack();
    
    // Calculate damage (70% of normal damage)
    const damage = Math.round(this.upgradeStats.damage.value * 0.7);
    
    // Deal damage to targets
    targets.forEach(enemy => {
      enemy.takeDamage(damage, this, false);
    });
    
    return targets;
  }
  
  /**
   * Ranger's sniper shot ability - deal 3x damage to a distant target
   * @param {Array<Enemy>} enemies - All enemies in game
   * @returns {Enemy|null} Enemy hit by the ability
   */
  sniperShot(enemies) {
    if (!enemies || enemies.length === 0) return null;
    
    // Get enemies in extended range
    const extendedRange = this.upgradeStats.range.value * 1.5;
    const enemiesInRange = enemies.filter(enemy => {
      const distance = this.position.distanceTo(enemy.position);
      return distance <= extendedRange;
    });
    
    if (enemiesInRange.length === 0) return null;
    
    // Find most distant enemy
    let farthestEnemy = null;
    let maxDistance = 0;
    
    enemiesInRange.forEach(enemy => {
      const distance = this.position.distanceTo(enemy.position);
      if (distance > maxDistance) {
        maxDistance = distance;
        farthestEnemy = enemy;
      }
    });
    
    if (!farthestEnemy) return null;
    
    // Face the enemy
    const direction = new THREE.Vector3().subVectors(farthestEnemy.position, this.position);
    this.rotation.y = Math.atan2(direction.x, direction.z);
    if (this.mesh) this.mesh.rotation.y = this.rotation.y;
    
    // Animate attack
    this.animateAttack();
    
    // Calculate damage (3x normal damage)
    const damage = Math.round(this.upgradeStats.damage.value * 3);
    
    // Deal damage to enemy
    farthestEnemy.takeDamage(damage, this, true); // Force as critical hit
    
    return farthestEnemy;
  }
  
  /**
   * Ranger's trap ability - place a trap that slows enemies
   * @param {THREE.Vector3} position - Position to place the trap
   * @returns {Object} Trap data
   */
  placeTrap(position) {
    return {
      position: position.clone(),
      radius: 2,
      duration: 8000,
      slow: 0.5,
      effectColor: 0x8b4513
    };
  }
  
  /**
   * Ranger's evasion ability - 50% chance to dodge attacks
   * @returns {Object} Buff data
   */
  evasion() {
    return {
      name: 'Evasion',
      duration: 5000,
      dodgeChance: 0.5,
      effectColor: 0x1e90ff
    };
  }
}