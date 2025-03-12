// src/systems/combat/CombatSystem.js

import * as THREE from 'three';
import { Logger } from '../../utils/Logger.js';
import { ObjectPool } from '../../utils/ObjectPool.js';

/**
 * Handles combat mechanics, damage, and combat effects
 */
export class CombatSystem {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.logger = new Logger('CombatSystem');
    
    // Set initial values to prevent null references
    this.attackEffectsPool = null;
    this.floatingTextPool = null;
    this.projectiles = [];
    this.areaEffects = [];
    this.activeTargets = new Map();
    this.initialized = false;
    
    this.logger.debug('Combat system created');
  }
  
  /**
   * Initialize combat system
   * @returns {boolean} Success indicator
   */
  initialize() {
    try {
      this.logger.info('Initializing combat system');
      
      // Lazy-create attack effects object pool if it doesn't exist
      if (!this.attackEffectsPool) {
        this.logger.debug('Creating attack effects pool');
        this.attackEffectsPool = new ObjectPool(
          // Factory function
          () => this.createAttackEffectObject(),
          // Reset function
          (effect) => this.resetAttackEffect(effect),
          // Initial pool size
          20
        );
      }
      
      // Lazy-create floating text pool if it doesn't exist
      if (!this.floatingTextPool) {
        this.logger.debug('Creating floating text pool');
        this.floatingTextPool = new ObjectPool(
          // Factory function
          () => this.createFloatingTextObject(),
          // Reset function
          (text) => this.resetFloatingText(text),
          // Initial pool size
          30
        );
      }
      
      // Register event listeners
      this.registerEventListeners();
      
      this.initialized = true;
      this.logger.info('Combat system initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize combat system:', error);
      this.initialized = false;
      return false;
    }
  }
  
  /**
   * Register event listeners for combat events
   */
  registerEventListeners() {
    try {
      // Listen for hero attacks
      if (this.game && this.game.events) {
        this.game.events.on('heroAttack', data => {
          // Attack visuals are handled by the createAttackEffect method,
          // called from Hero class
        });
        
        // Listen for enemy damage
        this.game.events.on('enemyDamaged', data => {
          // Handle enemy damage effects
        });
        
        // Listen for hero ability use
        this.game.events.on('heroAbilityUsed', data => {
          this.handleAbilityUsed(data);
        });
        
        this.logger.debug('Combat event listeners registered');
      } else {
        this.logger.warn('Game events system not available, skipping event registration');
      }
    } catch (error) {
      this.logger.error('Error registering event listeners:', error);
    }
  }
  
  /**
   * Reset an attack effect when returning to pool
   * @param {Object} effect - The effect to reset
   */
  resetAttackEffect(effect) {
    if (!effect) return;
    
    if (effect.position) {
      effect.position.set(0, 0, 0);
    }
    
    if (effect.userData) {
      effect.userData.target = new THREE.Vector3(0, 0, 0);
      effect.userData.progress = 0;
      effect.userData.duration = 0;
      effect.userData.active = false;
    }
    
    // Remove from scene if added
    if (effect.parent && this.game && this.game.sceneManager) {
      this.game.sceneManager.removeFromScene(effect);
    }
  }
  
  /**
   * Reset a floating text when returning to pool
   * @param {Object} text - The text to reset
   */
  resetFloatingText(text) {
    if (!text) return;
    
    if (text.position) {
      text.position.set(0, 0, 0);
    }
    
    if (text.userData) {
      text.userData.velocity = new THREE.Vector3(0, 0, 0);
      text.userData.lifetime = 0;
      text.userData.age = 0;
      text.userData.active = false;
    }
    
    if (text.material) {
      text.material.opacity = 1;
    }
    
    // Remove from scene if added
    if (text.parent && this.game && this.game.sceneManager) {
      this.game.sceneManager.removeFromScene(text);
    }
  }
  
  /**
   * Update combat system with defensive null checks
   * @param {number} delta - Time since last update in seconds
   */
  update(delta) {
    // Skip update if not initialized
    if (!this.initialized) {
      // Try to initialize if not done yet - enables lazy initialization
      if (!this.initialize()) {
        this.logger.warn('Skipping update - combat system not initialized');
        return; // Skip update if initialization failed
      }
    }
    
    // Update attack effects (with defensive null checks)
    this.updateAttackEffects(delta);
    
    // Update projectiles
    this.updateProjectiles(delta);
    
    // Update area effects
    this.updateAreaEffects(delta);
    
    // Update floating texts
    this.updateFloatingTexts(delta);
  }
  
  /**
   * Update attack visual effects with robust null checking
   * @param {number} delta - Time since last update in seconds
   */
  updateAttackEffects(delta) {
    // Guard clause to prevent null reference errors
    if (!this.attackEffectsPool || !this.attackEffectsPool.active) {
      this.logger.warn('Attack effects pool not properly initialized');
      return;
    }
    
    try {
      // Get all attack effects from the pool
      const activeEffects = Array.from(this.attackEffectsPool.active);
      
      activeEffects.forEach(effect => {
        // Skip if effect is null or userData is not defined
        if (!effect || !effect.userData) return;
        
        // Skip if effect is not active
        if (!effect.userData.active) return;
        
        // Update progress
        effect.userData.progress += delta / (effect.userData.duration || 0.1);
        
        if (effect.userData.progress >= 1) {
          // Effect is complete, return to pool
          this.attackEffectsPool.release(effect);
        } else {
          // Interpolate position if vectors are valid
          if (effect.position && effect.userData.start && effect.userData.target) {
            effect.position.lerpVectors(
              effect.userData.start,
              effect.userData.target,
              effect.userData.progress
            );
          }
          
          // Update visual properties based on effect type
          if (effect.userData.type === 'slash') {
            if (effect.rotation) {
              effect.rotation.z = Math.PI * 2 * effect.userData.progress;
            }
            
            // Fade out at the end
            if (effect.userData.progress > 0.7 && effect.material) {
              effect.material.opacity = 1 - ((effect.userData.progress - 0.7) / 0.3);
            }
          } else if (effect.userData.type === 'beam') {
            // Beam effect scaling (with null check)
            if (effect.scale) {
              const width = THREE.MathUtils.lerp(0.1, 0.5, effect.userData.progress);
              effect.scale.set(width, 1, 1);
            }
            
            // Fade in/out (with null check)
            if (effect.material) {
              effect.material.opacity = effect.userData.progress < 0.2 
                ? effect.userData.progress / 0.2 
                : 1 - ((effect.userData.progress - 0.2) / 0.8);
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('Error in updateAttackEffects:', error);
    }
  }
  
  /**
   * Update projectiles
   * @param {number} delta - Time since last update in seconds
   */
  updateProjectiles(delta) {
    try {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const projectile = this.projectiles[i];
        
        // Skip if projectile is invalid
        if (!projectile || !projectile.mesh) continue;
        
        // Update position
        if (projectile.mesh.position && projectile.direction) {
          projectile.mesh.position.add(
            projectile.direction.clone().multiplyScalar(projectile.speed * delta * 60)
          );
        }
        
        // Update lifetime
        projectile.lifetime -= delta;
        
        if (projectile.lifetime <= 0) {
          // Projectile expired
          this.removeProjectile(i);
          continue;
        }
        
        // Check for collisions with enemies
        const projectilePos = projectile.mesh.position;
        let hitEnemy = null;
        
        // Check collision with all enemies
        if (this.game && this.game.state && this.game.state.enemies) {
          for (const enemy of this.game.state.enemies) {
            // Skip if enemy is invalid
            if (!enemy || !enemy.position) continue;
            
            const distance = projectilePos.distanceTo(enemy.position);
            
            if (distance < (enemy.scale || 1) + (projectile.radius || 0.1)) {
              hitEnemy = enemy;
              break;
            }
          }
        }
        
        if (hitEnemy) {
          // Handle hit
          if (projectile.aoeRadius > 0) {
            // AOE damage
            this.applyAreaDamage(
              projectilePos,
              projectile.aoeRadius,
              projectile.damage,
              projectile.owner
            );
            
            // Create explosion effect
            this.createExplosionEffect(
              projectilePos.clone(),
              projectile.aoeRadius,
              projectile.color
            );
          } else {
            // Direct damage
            hitEnemy.takeDamage(projectile.damage, projectile.owner);
          }
          
          // Remove projectile
          this.removeProjectile(i);
        }
      }
    } catch (error) {
      this.logger.error('Error in updateProjectiles:', error);
    }
  }
  
  /**
   * Update area effects
   * @param {number} delta - Time since last update in seconds
   */
  updateAreaEffects(delta) {
    try {
      for (let i = this.areaEffects.length - 1; i >= 0; i--) {
        const effect = this.areaEffects[i];
        
        // Skip if effect is invalid
        if (!effect) continue;
        
        // Update lifetime
        effect.lifetime -= delta;
        
        if (effect.lifetime <= 0) {
          // Effect expired
          this.removeAreaEffect(i);
          continue;
        }
        
        // Apply effect
        if (typeof effect.tickTime === 'number') {
          effect.tickTime -= delta;
          
          if (effect.tickTime <= 0) {
            // Reset tick timer
            effect.tickTime = effect.tickInterval || 1;
            
            // Apply effect to enemies in range
            this.applyEffectToArea(effect);
          }
        }
        
        // Update visual appearance
        if (effect.mesh) {
          // Pulse or fade effect based on remaining lifetime
          const remaining = effect.lifetime / effect.duration;
          
          // Pulse size
          const pulseScale = 1 + 0.1 * Math.sin(Date.now() / 200);
          if (effect.mesh.scale) {
            effect.mesh.scale.set(
              effect.radius * pulseScale,
              1,
              effect.radius * pulseScale
            );
          }
          
          // Fade opacity
          if (effect.mesh.material) {
            effect.mesh.material.opacity = Math.min(0.5, remaining * 0.7);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in updateAreaEffects:', error);
    }
  }
  
  /**
   * Update floating texts
   * @param {number} delta - Time since last update in seconds
   */
  updateFloatingTexts(delta) {
    // Guard clause to prevent null reference errors
    if (!this.floatingTextPool || !this.floatingTextPool.active) {
      return;
    }
    
    try {
      // Get all floating texts from the pool
      const activeTexts = Array.from(this.floatingTextPool.active);
      
      activeTexts.forEach(text => {
        // Skip if text is null or invalid
        if (!text || !text.userData || !text.userData.active) return;
        
        // Update position
        if (text.position && text.userData.velocity) {
          text.position.add(text.userData.velocity.clone().multiplyScalar(delta));
        }
        
        // Update age
        text.userData.age += delta;
        
        // Update opacity based on remaining lifetime
        if (text.material && typeof text.userData.lifetime === 'number') {
          const remainingLife = 1 - (text.userData.age / text.userData.lifetime);
          text.material.opacity = Math.max(0, remainingLife);
        }
        
        // Face camera
        if (this.game && this.game.camera && text.quaternion) {
          text.quaternion.copy(this.game.camera.quaternion);
        }
        
        // Check if expired
        if (text.userData.age >= text.userData.lifetime) {
          this.floatingTextPool.release(text);
        }
      });
    } catch (error) {
      this.logger.error('Error in updateFloatingTexts:', error);
    }
  }
  
  /**
   * Create a projectile
   * @param {Object} data - Projectile data
   * @returns {Object} Created projectile
   */
  createProjectile(data) {
    try {
      // Create mesh
      const geometry = new THREE.SphereGeometry(data.radius || 0.15, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: data.color || 0xffff00,
        transparent: true,
        opacity: 0.8
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      if (mesh && data.position) {
        mesh.position.copy(data.position);
      }
      
      // Add to scene
      if (this.game && this.game.sceneManager) {
        this.game.sceneManager.addToScene(mesh, 'effects');
      }
      
      // Create projectile object
      const projectile = {
        mesh: mesh,
        direction: data.direction || new THREE.Vector3(0, 0, 1),
        speed: data.speed || 0.1,
        damage: data.damage || 10,
        radius: data.radius || 0.15,
        lifetime: data.lifetime || 5, // seconds
        owner: data.owner || null,
        aoeRadius: data.aoeRadius || 0,
        color: data.color || 0xffff00
      };
      
      // Add to projectiles array
      this.projectiles.push(projectile);
      
      return projectile;
    } catch (error) {
      this.logger.error('Error creating projectile:', error);
      return null;
    }
  }
  
  /**
   * Remove a projectile
   * @param {number} index - Index of projectile to remove
   */
  removeProjectile(index) {
    try {
      if (index < 0 || index >= this.projectiles.length) {
        this.logger.warn(`Invalid projectile index: ${index}`);
        return;
      }
      
      const projectile = this.projectiles[index];
      if (!projectile) return;
      
      // Remove mesh from scene
      if (projectile.mesh && this.game && this.game.sceneManager) {
        this.game.sceneManager.removeFromScene(projectile.mesh);
      }
      
      // Remove from array
      this.projectiles.splice(index, 1);
    } catch (error) {
      this.logger.error('Error removing projectile:', error);
    }
  }
  
  /**
   * Create an area effect
   * @param {Object} data - Area effect data
   * @returns {Object} Created area effect
   */
  createAreaEffect(data) {
    try {
      // Validate input data
      if (!data || !data.position) {
        this.logger.warn('Invalid area effect data');
        return null;
      }
      
      // Create visual representation
      const geometry = new THREE.CircleGeometry(data.radius || 1, 32);
      const material = new THREE.MeshBasicMaterial({
        color: data.color || 0x00ff00,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(data.position);
      mesh.rotation.x = -Math.PI / 2; // Flat on ground
      
      // Add to scene
      if (this.game && this.game.sceneManager) {
        this.game.sceneManager.addToScene(mesh, 'effects');
      }
      
      // Create area effect object
      const effect = {
        mesh: mesh,
        position: data.position.clone(),
        radius: data.radius || 1,
        duration: data.duration || 5, // seconds
        lifetime: data.duration || 5, // seconds
        damage: data.damage || 0,
        damageType: data.damageType || 'normal',
        tickInterval: data.tickInterval || 1, // seconds
        tickTime: 0,
        effectType: data.effectType || 'damage',
        effectValue: data.effectValue || 0,
        owner: data.owner || null,
        color: data.color || 0x00ff00
      };
      
      // Add to area effects array
      this.areaEffects.push(effect);
      
      return effect;
    } catch (error) {
      this.logger.error('Error creating area effect:', error);
      return null;
    }
  }
  
  /**
   * Remove an area effect
   * @param {number} index - Index of area effect to remove
   */
  removeAreaEffect(index) {
    try {
      if (index < 0 || index >= this.areaEffects.length) {
        this.logger.warn(`Invalid area effect index: ${index}`);
        return;
      }
      
      const effect = this.areaEffects[index];
      if (!effect) return;
      
      // Remove mesh from scene
      if (effect.mesh && this.game && this.game.sceneManager) {
        this.game.sceneManager.removeFromScene(effect.mesh);
      }
      
      // Remove from array
      this.areaEffects.splice(index, 1);
    } catch (error) {
      this.logger.error('Error removing area effect:', error);
    }
  }
  
  /**
   * Apply area damage to enemies
   * @param {THREE.Vector3} position - Center position
   * @param {number} radius - Damage radius
   * @param {number} damage - Damage amount
   * @param {Object} source - Damage source
   */
  applyAreaDamage(position, radius, damage, source) {
    try {
      // Validate inputs
      if (!position || typeof radius !== 'number' || typeof damage !== 'number') {
        this.logger.warn('Invalid parameters for area damage');
        return;
      }
      
      // Ensure we have enemies to damage
      if (!this.game || !this.game.state || !this.game.state.enemies) {
        this.logger.warn('No enemies available for area damage');
        return;
      }
      
      // Loop through all enemies
      this.game.state.enemies.forEach(enemy => {
        // Skip invalid enemies
        if (!enemy || !enemy.position) return;
        
        const distance = position.distanceTo(enemy.position);
        
        if (distance <= radius) {
          // Calculate falloff based on distance (more damage in center)
          const falloff = 1 - (distance / radius);
          const finalDamage = Math.round(damage * falloff);
          
          // Apply damage
          if (finalDamage > 0 && typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(finalDamage, source);
          }
        }
      });
    } catch (error) {
      this.logger.error('Error applying area damage:', error);
    }
  }
  
  /**
   * Apply effect to enemies in an area
   * @param {Object} effect - Area effect data
   */
  applyEffectToArea(effect) {
    try {
      // Validate effect data
      if (!effect || !effect.position || typeof effect.radius !== 'number') {
        this.logger.warn('Invalid area effect data');
        return;
      }
      
      // Ensure we have enemies to apply effects to
      if (!this.game || !this.game.state || !this.game.state.enemies) {
        this.logger.warn('No enemies available for area effect');
        return;
      }
      
      // Loop through all enemies
      this.game.state.enemies.forEach(enemy => {
        // Skip invalid enemies
        if (!enemy || !enemy.position || typeof enemy.applyEffect !== 'function') return;
        
        const distance = effect.position.distanceTo(enemy.position);
        
        if (distance <= effect.radius) {
          // Apply damage if defined
          if (effect.damage > 0 && typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(effect.damage, effect.owner);
          }
          
          // Apply effect based on type
          if (effect.effectType === 'slow') {
            enemy.applyEffect({
              type: 'slow',
              duration: (effect.tickInterval || 1) * 2000, // Convert to ms
              slowFactor: effect.effectValue || 0.5,
              source: effect.owner
            });
          } else if (effect.effectType === 'freeze') {
            enemy.applyEffect({
              type: 'freeze',
              duration: (effect.tickInterval || 1) * 2000, // Convert to ms
              slowFactor: effect.effectValue || 0.9,
              source: effect.owner
            });
          } else if (effect.effectType === 'damage_over_time') {
            enemy.applyEffect({
              type: 'damage_over_time',
              duration: (effect.tickInterval || 1) * 2000, // Convert to ms
              damagePerTick: effect.damage || 5,
              tickInterval: (effect.tickInterval || 1) * 1000, // Convert to ms
              source: effect.owner
            });
          }
        }
      });
    } catch (error) {
      this.logger.error('Error applying area effect:', error);
    }
  }
  
  /**
   * Create attack effect between source and target
   * @param {THREE.Vector3} source - Source position
   * @param {THREE.Vector3} target - Target position
   * @param {string} type - Effect type ('slash', 'beam')
   * @param {number} color - Effect color
   * @returns {THREE.Object3D} Created effect
   */
  createAttackEffect(source, target, type = 'slash', color = 0xffffff) {
    try {
      // Validate inputs
      if (!source || !target) {
        this.logger.warn('Invalid source or target for attack effect');
        return null;
      }
      
      // Ensure we have a pool initialized
      if (!this.attackEffectsPool) {
        this.initialize();
      }
      
      // Get an effect object from the pool
      const effect = this.attackEffectsPool.get();
      if (!effect) {
        this.logger.warn('Failed to get attack effect from pool');
        return null;
      }
      
      // Set effect properties
      if (effect.userData) {
        effect.userData.start = source.clone();
        effect.userData.target = target.clone();
        effect.userData.progress = 0;
        effect.userData.duration = 0.2; // 200ms
        effect.userData.type = type;
        effect.userData.active = true;
      }
      
      // Set initial position
      if (effect.position) {
        effect.position.copy(source);
      }
      
      // Update material color
      if (effect.material) {
        effect.material.color.setHex(color);
      }
      
      // Add to scene
      if (this.game && this.game.sceneManager) {
        this.game.sceneManager.addToScene(effect, 'effects');
      }
      
      return effect;
    } catch (error) {
      this.logger.error('Error creating attack effect:', error);
      return null;
    }
  }
  
  /**
   * Create explosion effect
   * @param {THREE.Vector3} position - Explosion position
   * @param {number} radius - Explosion radius
   * @param {number} color - Explosion color
   */
  createExplosionEffect(position, radius, color = 0xff0000) {
    try {
      // Validate inputs
      if (!position || typeof radius !== 'number') {
        this.logger.warn('Invalid parameters for explosion effect');
        return;
      }
      
      // Create particle count based on radius
      const particleCount = Math.max(10, Math.floor(radius * 20));
      
      // Create particle system
      const particles = [];
      
      for (let i = 0; i < particleCount; i++) {
        const particleSize = 0.1 + Math.random() * 0.2;
        const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        if (particle.position) {
          particle.position.copy(position);
        }
        
        // Random velocity
        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1 + 0.05, // Bias upward
          (Math.random() - 0.5) * 0.1
        );
        
        // Set user data
        particle.userData = {
          velocity: velocity,
          lifetime: 0.5 + Math.random() * 0.5, // 0.5-1s
          age: 0
        };
        
        // Add to scene
        if (this.game && this.game.sceneManager) {
          this.game.sceneManager.addToScene(particle, 'effects');
          particles.push(particle);
        }
      }
      
      // Animate particles
      let elapsed = 0;
      
      const updateExplosion = (delta) => {
        elapsed += delta;
        
        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const particle = particles[i];
          if (!particle || !particle.userData) continue;
          
          // Update position
          if (particle.position && particle.userData.velocity) {
            particle.position.add(particle.userData.velocity);
          }
          
          // Apply gravity
          if (particle.userData.velocity) {
            particle.userData.velocity.y -= 0.001;
          }
          
          // Update age
          particle.userData.age += delta;
          
          // Update scale and opacity
          const lifeRatio = particle.userData.age / particle.userData.lifetime;
          if (particle.scale) {
            particle.scale.multiplyScalar(0.99);
          }
          if (particle.material) {
            particle.material.opacity = 1 - lifeRatio;
          }
          
          // Remove expired particles
          if (particle.userData.age >= particle.userData.lifetime) {
            if (this.game && this.game.sceneManager) {
              this.game.sceneManager.removeFromScene(particle);
            }
            particles.splice(i, 1);
          }
        }
        
        // Continue animation if particles remain
        if (particles.length > 0 && elapsed < 2) {
          requestAnimationFrame(() => updateExplosion(delta));
        }
      };
      
      // Start animation
      updateExplosion(0.016); // initial delta
    } catch (error) {
      this.logger.error('Error creating explosion effect:', error);
    }
  }
  
  /**
   * Create attack effect object with defensive programming
   * @returns {THREE.Mesh} Attack effect object
   */
  createAttackEffectObject() {
    try {
      // Create a slash effect mesh
      const geometry = new THREE.PlaneGeometry(1, 0.2);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add user data with default values
      mesh.userData = {
        start: new THREE.Vector3(),
        target: new THREE.Vector3(),
        progress: 0,
        duration: 0.2,
        type: 'slash',
        active: false
      };
      
      return mesh;
    } catch (error) {
      this.logger.error('Failed to create attack effect object:', error);
      
      // Return a minimal valid object to prevent null reference errors
      const fallbackMesh = new THREE.Object3D();
      fallbackMesh.userData = {
        start: new THREE.Vector3(),
        target: new THREE.Vector3(),
        progress: 0,
        duration: 0.2,
        active: false
      };
      return fallbackMesh;
    }
  }
  
  /**
   * Create floating text object
   * @returns {THREE.Sprite} Floating text object
   */
  createFloatingTextObject() {
    try {
      // Create canvas for text rendering
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get 2D context for canvas');
      }
      
      // Create canvas texture
      const texture = new THREE.CanvasTexture(canvas);
      
      // Create sprite material
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
      });
      
      // Create sprite
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(1, 0.5, 1);
      
      // Add user data
      sprite.userData = {
        canvas: canvas,
        context: context,
        velocity: new THREE.Vector3(0, 1, 0),
        lifetime: 1,
        age: 0,
        active: false,
        text: '',
        color: '#ffffff'
      };
      
      return sprite;
    } catch (error) {
      this.logger.error('Failed to create floating text object:', error);
      
      // Return a minimal valid object
      const fallbackSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ color: 0xffffff, transparent: true })
      );
      fallbackSprite.userData = {
        velocity: new THREE.Vector3(0, 1, 0),
        lifetime: 1,
        age: 0,
        active: false
      };
      return fallbackSprite;
    }
  }
  
  /**
   * Create floating text
   * @param {string} text - Text to display
   * @param {THREE.Vector3} position - Text position
   * @param {number} color - Text color
   * @param {Object} options - Additional options
   * @returns {THREE.Sprite} Floating text sprite
   */
  createFloatingText(text, position, color = 0xffffff, options = {}) {
    try {
      // Validate inputs
      if (!text || !position) {
        this.logger.warn('Invalid parameters for floating text');
        return null;
      }
      
      // Ensure we have a pool initialized
      if (!this.floatingTextPool) {
        this.initialize();
      }
      
      // Get a text object from the pool
      const textSprite = this.floatingTextPool.get();
      if (!textSprite) {
        this.logger.warn('Failed to get floating text from pool');
        return null;
      }
      
      // Convert color to CSS format
      const colorCSS = '#' + color.toString(16).padStart(6, '0');
      
      // Update text properties
      if (textSprite.userData) {
        textSprite.userData.text = text;
        textSprite.userData.color = colorCSS;
        textSprite.userData.active = true;
        textSprite.userData.lifetime = options.lifetime || 1.5; // seconds
        textSprite.userData.age = 0;
      }
      
      // Set position
      if (textSprite.position) {
        textSprite.position.copy(position);
      }
      
      // Set velocity
      if (textSprite.userData && textSprite.userData.velocity) {
        textSprite.userData.velocity.set(
          (Math.random() - 0.5) * 0.5,
          1 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        );
      }
      
      // Set scale
      const scale = options.scale || 1;
      if (textSprite.scale) {
        textSprite.scale.set(1 * scale, 0.5 * scale, 1);
      }
      
      // Render text on canvas
      if (textSprite.userData && textSprite.userData.context && textSprite.userData.canvas) {
        const context = textSprite.userData.context;
        const canvas = textSprite.userData.canvas;
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set text style
        context.font = options.font || 'bold 32px Arial';
        context.fillStyle = colorCSS;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Add stroke for better visibility
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);
        
        // Draw text
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Update texture
        if (textSprite.material && textSprite.material.map) {
          textSprite.material.map.needsUpdate = true;
        }
      }
      
      // Add to scene
      if (this.game && this.game.sceneManager) {
        this.game.sceneManager.addToScene(textSprite, 'effects');
      }
      
      return textSprite;
    } catch (error) {
      this.logger.error('Error creating floating text:', error);
      return null;
    }
  }
  
  /**
   * Handle ability used event
   * @param {Object} data - Ability data
   */
  handleAbilityUsed(data) {
    try {
      // Validate input data
      if (!data || !this.game || !this.game.state || !this.game.state.hero) {
        this.logger.warn('Invalid data or game state for ability handling');
        return;
      }
      
      const hero = this.game.state.hero;
      const abilityIndex = data.abilityIndex;
      
      // Check ability index validity
      if (typeof abilityIndex !== 'number' || !hero.abilities || abilityIndex < 0 || abilityIndex >= hero.abilities.length) {
        this.logger.warn(`Invalid ability index: ${abilityIndex}`);
        return;
      }
      
      // Handle different ability types based on hero class
      switch (hero.type) {
        case 'warrior':
          this.handleWarriorAbility(hero, abilityIndex);
          break;
        
        case 'ranger':
          this.handleRangerAbility(hero, abilityIndex);
          break;
        
        case 'mage':
          this.handleMageAbility(hero, abilityIndex);
          break;
        
        default:
          this.logger.warn(`Unknown hero type: ${hero.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling ability used:', error);
    }
  }
  
  /**
   * Handle warrior ability
   * @param {Hero} hero - Warrior hero
   * @param {number} abilityIndex - Ability index
   */
  handleWarriorAbility(hero, abilityIndex) {
    try {
      // Ensure hero has necessary methods
      if (!hero || !hero.abilities || !this.game || !this.game.state) return;
      
      const ability = hero.abilities[abilityIndex];
      if (!ability) return;
      
      switch (abilityIndex) {
        case 0: // Whirlwind
          // Find enemies in range
          if (typeof hero.whirlwind === 'function' && this.game.state.enemies) {
            const enemies = hero.whirlwind(this.game.state.enemies);
            
            // Create area effect
            this.createAreaEffect({
              position: hero.position.clone(),
              radius: hero.upgradeStats.range.value,
              duration: 1,
              color: ability.effectColor,
              owner: hero
            });
          }
          break;
        
        case 1: // Shield Block
          // Apply buff to hero
          if (typeof hero.shieldBlock === 'function' && typeof hero.applyBuff === 'function') {
            const shieldData = hero.shieldBlock();
            hero.applyBuff({
              name: shieldData.name,
              duration: shieldData.duration,
              damageReduction: shieldData.damageReduction,
              effectColor: ability.effectColor
            });
          }
          break;
        
        case 2: // Heroic Strike
          // Find closest enemy
          let closestEnemy = this.getClosestEnemy(hero.position, hero.upgradeStats.range.value);
          
          if (closestEnemy && typeof hero.heroicStrike === 'function') {
            hero.heroicStrike(closestEnemy);
            
            // Create attack effect
            this.createAttackEffect(
              hero.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
              closestEnemy.position.clone(),
              'slash',
              ability.effectColor
            );
          }
          break;
        
        case 3: // Battle Shout
          // Apply buff to hero
          if (typeof hero.battleShout === 'function' && typeof hero.applyBuff === 'function') {
            const shoutData = hero.battleShout();
            hero.applyBuff({
              name: shoutData.name,
              duration: shoutData.duration,
              damageMultiplier: shoutData.damageMultiplier,
              effectColor: ability.effectColor
            });
            
            // Create area effect
            this.createAreaEffect({
              position: hero.position.clone(),
              radius: 2,
              duration: 1,
              color: ability.effectColor,
              owner: hero
            });
          }
          break;
      }
    } catch (error) {
      this.logger.error('Error handling warrior ability:', error);
    }
  }
  
  /**
   * Handle ranger ability
   * @param {Hero} hero - Ranger hero
   * @param {number} abilityIndex - Ability index
   */
  handleRangerAbility(hero, abilityIndex) {
    try {
      // Ensure hero has necessary methods
      if (!hero || !hero.abilities || !this.game || !this.game.state) return;
      
      const ability = hero.abilities[abilityIndex];
      if (!ability) return;
      
      switch (abilityIndex) {
        case 0: // Multi-Shot
          // Find enemies in range
          if (typeof hero.multiShot === 'function' && this.game.state.enemies) {
            const targets = hero.multiShot(this.game.state.enemies);
            
            // Create attack effects for each target
            targets.forEach(target => {
              this.createAttackEffect(
                hero.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
                target.position.clone(),
                'beam',
                ability.effectColor
              );
            });
          }
          break;
        
        case 1: // Sniper Shot
          // Find distant enemy
          if (typeof hero.sniperShot === 'function' && this.game.state.enemies) {
            const target = hero.sniperShot(this.game.state.enemies);
            
            if (target) {
              // Create attack effect
              this.createAttackEffect(
                hero.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
                target.position.clone(),
                'beam',
                ability.effectColor
              );
            }
          }
          break;
        
        case 2: // Trap
          // Get position in front of ranger
          if (hero.position && hero.rotation) {
            const trapPosition = hero.position.clone().add(
              new THREE.Vector3(0, 0, -3).applyEuler(new THREE.Euler(0, hero.rotation.y, 0))
            );
            
            // Place trap
            if (typeof hero.placeTrap === 'function') {
              const trapData = hero.placeTrap(trapPosition);
              
              // Create area effect
              this.createAreaEffect({
                position: trapPosition,
                radius: trapData.radius,
                duration: trapData.duration / 1000, // Convert ms to seconds
                effectType: 'slow',
                effectValue: trapData.slow,
                color: ability.effectColor,
                owner: hero
              });
            }
          }
          break;
        
        case 3: // Evasion
          // Apply buff to hero
          if (typeof hero.evasion === 'function' && typeof hero.applyBuff === 'function') {
            const evasionData = hero.evasion();
            hero.applyBuff({
              name: evasionData.name,
              duration: evasionData.duration,
              dodgeChance: evasionData.dodgeChance,
              effectColor: ability.effectColor
            });
          }
          break;
      }
    } catch (error) {
      this.logger.error('Error handling ranger ability:', error);
    }
  }
  
  /**
   * Handle mage ability
   * @param {Hero} hero - Mage hero
   * @param {number} abilityIndex - Ability index
   */
  handleMageAbility(hero, abilityIndex) {
    try {
      // Ensure hero has necessary methods
      if (!hero || !hero.abilities || !this.game || !this.game.state) return;
      
      const ability = hero.abilities[abilityIndex];
      if (!ability) return;
      
      switch (abilityIndex) {
        case 0: // Fireball
          // Get position in front of mage
          if (hero.position && hero.rotation) {
            const targetPosition = hero.position.clone().add(
              new THREE.Vector3(0, 0, -5).applyEuler(new THREE.Euler(0, hero.rotation.y, 0))
            );
            
            // Create fireball
            if (typeof hero.fireball === 'function' && this.game.state.enemies) {
              const fireballData = hero.fireball(targetPosition, this.game.state.enemies);
              
              // Create projectile
              this.createProjectile({
                position: fireballData.startPosition,
                direction: fireballData.direction,
                speed: fireballData.speed,
                damage: fireballData.damage,
                aoeRadius: fireballData.radius,
                color: ability.effectColor,
                owner: hero,
                lifetime: 5
              });
            }
          }
          break;
        
        case 1: // Frost Nova
          // Apply frost nova
          if (typeof hero.frostNova === 'function' && this.game.state.enemies) {
            const hitEnemies = hero.frostNova(this.game.state.enemies);
            
            // Create area effect
            this.createAreaEffect({
              position: hero.position.clone(),
              radius: hero.upgradeStats.range.value,
              duration: 1,
              color: ability.effectColor,
              owner: hero
            });
          }
          break;
        
        case 2: // Arcane Missiles
          // Find closest enemy
          let closestEnemy = this.getClosestEnemy(hero.position, hero.upgradeStats.range.value);
          
          if (closestEnemy && typeof hero.arcaneMissiles === 'function') {
            // Get missiles data
            const missilesData = hero.arcaneMissiles(closestEnemy);
            
            // Create missiles
            if (missilesData) {
              // Function to create a single missile with delay
              const createMissile = (index) => {
                // Create projectile
                this.createProjectile({
                  position: hero.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
                  direction: new THREE.Vector3().subVectors(closestEnemy.position, hero.position).normalize(),
                  speed: 0.15,
                  damage: missilesData.damagePerMissile,
                  color: ability.effectColor,
                  owner: hero,
                  lifetime: 3
                });
                
                // Create next missile with delay
                if (index < missilesData.missileCount - 1) {
                  setTimeout(() => {
                    createMissile(index + 1);
                  }, missilesData.missileDelay);
                }
              };
              
              // Start creating missiles
              createMissile(0);
            }
          }
          break;
        
        case 3: // Mana Shield
          // Apply buff to hero
          if (typeof hero.manaShield === 'function' && typeof hero.applyBuff === 'function') {
            const shieldData = hero.manaShield();
            hero.applyBuff({
              name: shieldData.name,
              duration: shieldData.duration,
              damageConversion: shieldData.damageConversion,
              effectColor: ability.effectColor
            });
          }
          break;
      }
    } catch (error) {
      this.logger.error('Error handling mage ability:', error);
    }
  }
  
  /**
   * Get closest enemy to a position
   * @param {THREE.Vector3} position - Position to check from
   * @param {number} maxDistance - Maximum distance to check
   * @returns {Object|null} Closest enemy or null if none found
   */
  getClosestEnemy(position, maxDistance = Infinity) {
    try {
      // Validate input
      if (!position || !this.game || !this.game.state || !this.game.state.enemies) {
        return null;
      }
      
      let closestEnemy = null;
      let closestDistance = maxDistance;
      
      this.game.state.enemies.forEach(enemy => {
        // Skip invalid enemies
        if (!enemy || !enemy.position) return;
        
        const distance = position.distanceTo(enemy.position);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      });
      
      return closestEnemy;
    } catch (error) {
      this.logger.error('Error finding closest enemy:', error);
      return null;
    }
  }
  
  /**
   * Get enemies in range of a position
   * @param {THREE.Vector3} position - Center position
   * @param {number} range - Range to check
   * @returns {Array} Array of enemies in range
   */
  getEnemiesInRange(position, range) {
    try {
      // Validate input
      if (!position || typeof range !== 'number' || !this.game || !this.game.state || !this.game.state.enemies) {
        return [];
      }
      
      return this.game.state.enemies.filter(enemy => {
        // Skip invalid enemies
        if (!enemy || !enemy.position) return false;
        
        return position.distanceTo(enemy.position) <= range;
      });
    } catch (error) {
      this.logger.error('Error getting enemies in range:', error);
      return [];
    }
  }
  
  /**
   * Reset the combat system
   */
  reset() {
    try {
      this.logger.info('Resetting combat system');
      
      // Clear projectiles
      this.projectiles.forEach(projectile => {
        if (projectile && projectile.mesh && this.game && this.game.sceneManager) {
          this.game.sceneManager.removeFromScene(projectile.mesh);
        }
      });
      this.projectiles = [];
      
      // Clear area effects
      this.areaEffects.forEach(effect => {
        if (effect && effect.mesh && this.game && this.game.sceneManager) {
          this.game.sceneManager.removeFromScene(effect.mesh);
        }
      });
      this.areaEffects = [];
      
      // Clear object pools
      if (this.attackEffectsPool) {
        const activeEffects = Array.from(this.attackEffectsPool.active);
        activeEffects.forEach(effect => {
          this.attackEffectsPool.release(effect);
        });
      }
      
      if (this.floatingTextPool) {
        const activeTexts = Array.from(this.floatingTextPool.active);
        activeTexts.forEach(text => {
          this.floatingTextPool.release(text);
        });
      }
      
      // Reset combat state
      this.activeTargets.clear();
    } catch (error) {
      this.logger.error('Error resetting combat system:', error);
    }
  }
  
  /**
   * Recover from error state
   */
  recover() {
    try {
      this.logger.warn('Attempting to recover combat system');
      
      // Clear all state
      this.reset();
      
      // Reinitialize
      this.initialized = false;
      this.initialize();
      
      this.logger.info('Combat system recovery attempt completed');
    } catch (error) {
      this.logger.error('Failed to recover combat system:', error);
    }
  }
  
  /**
   * Dispose of combat system resources
   */
  dispose() {
    try {
      this.logger.info('Disposing combat system resources');
      
      // Reset first to clean up active resources
      this.reset();
      
      // Clear pools
      if (this.attackEffectsPool) {
        this.attackEffectsPool.clear();
        this.attackEffectsPool = null;
      }
      
      if (this.floatingTextPool) {
        this.floatingTextPool.clear();
        this.floatingTextPool = null;
      }
      
      // Clear state
      this.projectiles = [];
      this.areaEffects = [];
      this.activeTargets.clear();
      
      this.initialized = false;
    } catch (error) {
      this.logger.error('Error disposing combat system:', error);
    }
  }
}