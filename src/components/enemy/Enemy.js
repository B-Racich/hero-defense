import * as THREE from 'three';
import { Logger } from '../../utils/Logger.js';
import { EventEmitter } from '../../utils/EventEmitter.js';

/**
 * Base Enemy class that represents an enemy entity
 */
export class Enemy {
  constructor(game, enemyData) {
    this.logger = new Logger('Enemy');
    this.game = game;
    this.events = new EventEmitter();

    // Enemy properties
    this.id = enemyData.id || 'enemy_' + Math.random().toString(36).substring(2, 9);
    this.type = enemyData.type || 'grunt';
    this.name = enemyData.name || this.type.charAt(0).toUpperCase() + this.type.slice(1);
    this.baseHealth = enemyData.health || 30;
    this.health = this.baseHealth;
    this.maxHealth = this.baseHealth;
    this.baseSpeed = enemyData.speed || 0.02;
    this.speed = this.baseSpeed;
    this.damage = enemyData.damage || 5;
    this.value = enemyData.value || 10;
    this.color = enemyData.color || 0xff0000;
    this.scale = enemyData.scale || 1;
    this.shape = enemyData.shape || 'box';

    // Position and movement
    this.position = new THREE.Vector3();
    if (enemyData.position) {
      this.position.copy(enemyData.position);
    }

    // Visual properties
    this.mesh = null;
    this.healthBar = null;

    // Status effects
    this.effects = [];
    this.deathAnimationStarted = false;

    this.logger.debug(`Created enemy: ${this.name} (${this.type})`);
  }

  /**
   * Create the 3D mesh for the enemy
   * @returns {THREE.Group} The enemy mesh group
   */
  // Near line 80 in Enemy.js
  createMesh() {
    // Get geometry and material pools from the game
    const geometryPool = this.game.geometryPool;
    const materialPool = this.game.materialPool;

    // Create group to hold enemy components
    const enemyGroup = new THREE.Group();
    enemyGroup.position.copy(this.position);

    // Get the appropriate geometry from the pool
    let enemyGeometry;
    switch (this.shape) {
      case 'sphere':
        enemyGeometry = geometryPool.getSphereGeometry(0.4);
        break;
      case 'tetrahedron':
        enemyGeometry = geometryPool.getTetrahedronGeometry(0.5);
        break;
      case 'cone':
        enemyGeometry = geometryPool.getConeGeometry(0.4, 0.8, 8);
        break;
      case 'box':
      default:
        enemyGeometry = geometryPool.getBoxGeometry(0.8, 0.8, 0.8);
    }

    // Get material from pool instead of creating new ones
    const enemyMaterial = materialPool.getStandardMaterial(this.color, 0.2, 0.7);

    // Create main enemy mesh
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemyMesh.castShadow = true;
    enemyMesh.receiveShadow = true;
    enemyGroup.add(enemyMesh);

    // Scale enemy based on type
    enemyGroup.scale.set(this.scale, this.scale, this.scale);

    // Create health bar
    const healthBarGroup = this.createHealthBar();
    healthBarGroup.position.y = 1 * this.scale;
    enemyGroup.add(healthBarGroup);

    // Store reference to health bar
    this.healthBar = healthBarGroup.children[0]; // The foreground bar

    // Store reference to mesh
    this.mesh = enemyGroup;

    return enemyGroup;
  }

  /**
   * Create a health bar for the enemy
   * @returns {THREE.Group} Health bar group
   */
  createHealthBar() {
    const width = 1;
    const height = 0.1;

    // Health bar background
    const bgGeometry = new THREE.PlaneGeometry(width, height);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.DoubleSide
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);

    // Health bar foreground (actual health)
    const fgGeometry = new THREE.PlaneGeometry(width, height);
    const fgMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    });
    const foreground = new THREE.Mesh(fgGeometry, fgMaterial);
    foreground.position.z = 0.01; // Slightly in front of background

    // Group to hold both parts
    const healthBarGroup = new THREE.Group();
    healthBarGroup.add(background);
    healthBarGroup.add(foreground);

    return healthBarGroup;
  }

  /**
   * Update enemy logic
   * @param {number} delta - Time since last update in seconds
   */

  /**
 * Update enemy logic
 * @param {number} delta - Time since last update in seconds
 */
  update(delta) {
    if (!this.mesh) return;

    // Skip if in death animation
    if (this.deathAnimationStarted) return;

    // Update position based on speed
    let currentSpeed = this.speed;

    // Apply speed modifiers from effects
    this.effects.forEach(effect => {
      if (effect.type === 'slow' || effect.type === 'freeze') {
        currentSpeed *= (1 - effect.slowFactor);
      }
    });

    // Move enemy forward (in z direction)
    this.mesh.position.z += currentSpeed * delta * 60; // Normalize for 60fps
    this.position.copy(this.mesh.position);

    // Update health bar to face camera - Add safety checks
    if (this.healthBar && this.healthBar.parent && this.game && this.game.sceneManager && this.game.sceneManager.camera) {
      this.healthBar.parent.lookAt(this.game.sceneManager.camera.position);
    }

    // Check if enemy reached the end zone
    if (this.position.z >= 12) {
      // Deal damage to hero/base
      if (this.game && this.game.state && this.game.state.hero) {
        // Deal damage equal to enemy's damage stat
        const damageToHero = this.damage;

        this.logger.info(`Enemy ${this.id} reached end zone - dealing ${damageToHero} damage to hero`);

        // Apply damage directly to hero
        this.game.state.hero.takeDamage(damageToHero, this);

        // Create floating damage text
        if (this.game.combatSystem) {
          this.game.combatSystem.createFloatingText(
            `-${damageToHero}`,
            this.game.state.hero.position.clone().add(new THREE.Vector3(0, 1, 0)),
            0xff0000
          );
        }

        // Update wave system for wave completion
        if (this.game.waveSystem) {
          this.game.waveSystem.waveEnemiesLeft = Math.max(0, this.game.waveSystem.waveEnemiesLeft - 1);
          this.game.waveSystem.checkWaveCompletion();
        }

        // Remove from scene
        if (this.game.sceneManager) {
          this.game.sceneManager.removeFromScene(this.mesh);
        }

        // Remove from state
        const index = this.game.state.enemies.indexOf(this);
        if (index !== -1) {
          this.game.state.enemies.splice(index, 1);
        }
      }
    }

    // Update effects
    this.updateEffects(delta);
  }
  /**
   * Update active status effects
   * @param {number} delta - Time since last update in seconds
   */
  updateEffects(delta) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];

      // Update remaining duration
      effect.remainingDuration -= delta * 1000; // Convert to ms

      // Remove expired effects
      if (effect.remainingDuration <= 0) {
        // Remove visual effect if it exists
        if (effect.visualEffect && this.mesh) {
          this.mesh.remove(effect.visualEffect);
        }

        // Remove effect from array
        this.effects.splice(i, 1);

        // Reset effect-specific properties
        if (effect.type === 'slow' || effect.type === 'freeze') {
          // No need to reset speed as it's calculated dynamically
        }
      } else {
        // Update visual effect
        if (effect.visualEffect) {
          // Adjust opacity based on remaining time
          const remainingFraction = effect.remainingDuration / effect.duration;
          effect.visualEffect.material.opacity = 0.3 * remainingFraction;
        }
      }
    }
  }

  /**
   * Apply a status effect to the enemy
   * @param {Object} effectData - Effect data
   */
  applyEffect(effectData) {
    const effect = {
      id: effectData.id || 'effect_' + Math.random().toString(36).substring(2, 9),
      type: effectData.type || 'slow',
      duration: effectData.duration || 3000,
      remainingDuration: effectData.duration || 3000,
      source: effectData.source || null,
      visualEffect: null
    };

    // Add effect-specific properties
    switch (effect.type) {
      case 'slow':
      case 'freeze':
        effect.slowFactor = effectData.slowFactor || 0.5; // 50% slow by default
        break;

      case 'damage_over_time':
        effect.damagePerTick = effectData.damagePerTick || 5;
        effect.tickInterval = effectData.tickInterval || 1000; // ms
        effect.lastTickTime = Date.now();
        break;
    }

    // Create visual effect if mesh exists
    if (this.mesh) {
      let effectColor;

      // Choose color based on effect type
      switch (effect.type) {
        case 'slow':
          effectColor = 0x00aaff; // Light blue
          break;
        case 'freeze':
          effectColor = 0x00ffff; // Cyan
          break;
        case 'damage_over_time':
          effectColor = 0xff6600; // Orange
          break;
        default:
          effectColor = 0xffffff; // White
      }

      // Create visual effect based on type
      if (effect.type === 'slow' || effect.type === 'freeze') {
        // Create a glowing outline
        const effectGeometry = new THREE.BoxGeometry(
          0.9 * this.scale,
          0.9 * this.scale,
          0.9 * this.scale
        );
        const effectMaterial = new THREE.MeshBasicMaterial({
          color: effectColor,
          transparent: true,
          opacity: 0.3,
          wireframe: true
        });

        effect.visualEffect = new THREE.Mesh(effectGeometry, effectMaterial);
        this.mesh.add(effect.visualEffect);
      } else if (effect.type === 'damage_over_time') {
        // Create particle effects
        const particleCount = 5;

        for (let i = 0; i < particleCount; i++) {
          const particleGeometry = new THREE.SphereGeometry(0.1 * this.scale, 8, 8);
          const particleMaterial = new THREE.MeshBasicMaterial({
            color: effectColor,
            transparent: true,
            opacity: 0.7
          });

          const particle = new THREE.Mesh(particleGeometry, particleMaterial);

          // Random position around enemy
          const angle = Math.random() * Math.PI * 2;
          const radius = 0.5 * this.scale;
          const height = Math.random() * 0.8 * this.scale;

          particle.position.set(
            Math.sin(angle) * radius,
            height,
            Math.cos(angle) * radius
          );

          // Animation data
          particle.userData = {
            angle: angle,
            radius: radius,
            speed: 0.02 + Math.random() * 0.02,
            verticalSpeed: 0.01 + Math.random() * 0.01,
            verticalDirection: 1
          };

          this.mesh.add(particle);

          // Store all particles in an array on the effect
          if (!effect.particles) {
            effect.particles = [];
          }

          effect.particles.push(particle);
        }
      }
    }

    // Check for existing effect of same type
    const existingEffectIndex = this.effects.findIndex(e => e.type === effect.type);

    if (existingEffectIndex !== -1) {
      // Remove existing effect visual
      const existingEffect = this.effects[existingEffectIndex];
      if (existingEffect.visualEffect && this.mesh) {
        this.mesh.remove(existingEffect.visualEffect);
      }

      // Replace with new effect
      this.effects[existingEffectIndex] = effect;
    } else {
      // Add new effect
      this.effects.push(effect);
    }

    // Emit effect applied event
    this.events.emit('effectApplied', {
      enemyId: this.id,
      effect: effect
    });
  }

  /**
   * Take damage from an attack
   * @param {number} amount - Amount of damage to take
   * @param {Object} source - Source of the damage (hero or ability)
   * @param {boolean} isCrit - Whether the damage is a critical hit
   * @returns {number} Actual damage taken
   */
  takeDamage(amount, source, isCrit = false) {
    // Skip if already in death animation
    if (this.deathAnimationStarted) return 0;

    // Calculate final damage (apply effects, etc.)
    const finalDamage = Math.max(1, Math.round(amount));

    // Reduce health
    this.health -= finalDamage;

    // Update health bar
    this.updateHealthBar();

    // Emit damage event
    this.events.emit('damaged', {
      enemyId: this.id,
      damage: finalDamage,
      source: source,
      isCrit: isCrit,
      remainingHealth: this.health
    });

    /// Check if defeated
    if (this.health <= 0 && !this.deathAnimationStarted) {
      this.deathAnimationStarted = true;

      // Emit death event
      this.events.emit('died', {
        enemyId: this.id,
        source: source
      });

      // Check wave completion
      if (this.game && this.game.waveSystem) {
        this.game.waveSystem.checkWaveCompletion();
      }
    }

    return finalDamage;
  }

  /**
   * Update the health bar visual
   */
  updateHealthBar() {
    if (!this.healthBar) return;

    const healthPercent = Math.max(0, this.health / this.maxHealth);
    this.healthBar.scale.x = healthPercent;
    this.healthBar.position.x = (1 - healthPercent) * -0.5;
  }

  /**
   * Start the death animation
   * @returns {Promise} Promise that resolves when animation completes
   */
  startDeathAnimation() {
    return new Promise(resolve => {
      if (!this.mesh) {
        resolve();
        return;
      }

      // Create explosion particles
      const particleCount = 15;
      const particles = [];

      for (let i = 0; i < particleCount; i++) {
        const size = (0.05 + Math.random() * 0.1) * this.scale;
        const particleGeometry = new THREE.SphereGeometry(size, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: this.color,
          transparent: true,
          opacity: 0.8
        });

        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        // Position at enemy center
        particle.position.copy(this.position);

        // Add random velocity
        const speed = 0.05 + Math.random() * 0.1;
        particle.userData = {
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            (Math.random() - 0.5) * speed + 0.08, // Bias upward
            (Math.random() - 0.5) * speed
          ),
          lifetime: 20 + Math.random() * 20 // frames
        };

        // Add to scene
        this.game.sceneManager.addToScene(particle, 'effects');
        particles.push(particle);
      }

      // Animate particles
      let frame = 0;
      const maxFrames = 30;

      const animateParticles = () => {
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const particle = particles[i];

          // Update position
          if (particle.userData.velocity) {
            particle.position.add(particle.userData.velocity);
          }

          // Update opacity
          if (particle.material) {
            particle.material.opacity = Math.max(0, 1 - frame / maxFrames);
          }

          // Remove expired particles
          if (frame >= particle.userData.lifetime) {
            this.game.sceneManager.removeFromScene(particle);
            particles.splice(i, 1);
          }
        }

        // Continue animation if particles remain and frames left
        if (particles.length > 0 && frame < maxFrames) {
          frame++;
          requestAnimationFrame(animateParticles);
        } else {
          // Clean up any remaining particles
          particles.forEach(particle => {
            this.game.sceneManager.removeFromScene(particle);
          });

          resolve();
        }
      };

      // Hide the enemy mesh immediately
      this.mesh.visible = false;

      // Start particle animation
      animateParticles();
    });
  }

  /**
   * Clean up resources used by the enemy
   */
  dispose() {
    this.logger.debug(`Disposing enemy: ${this.name}`);

    // Clean up event listeners
    this.events.clear();

    // Clean up effects
    this.effects.forEach(effect => {
      if (effect.visualEffect && this.mesh) {
        this.mesh.remove(effect.visualEffect);
      }

      if (effect.particles) {
        effect.particles.forEach(particle => {
          this.mesh.remove(particle);
        });
      }
    });

    this.effects = [];
  }
}