import * as THREE from 'three';
import { Hero } from './Hero.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Mage hero class - specializes in area damage and magical abilities
 */
export class Mage extends Hero {
    constructor(game, heroData) {
        super(game, {
            ...heroData,
            type: 'mage',
            name: heroData.name || 'Mage'
        });

        this.logger = new Logger('Mage');

        // Mage-specific properties
        this.staffMesh = null;
        this.orbMesh = null;
        this.hatMesh = null;
        this.particles = [];

        this.logger.debug(`Created mage: ${this.name}`);
    }

    /**
     * Create the 3D mesh for the mage
     * @returns {THREE.Group} The mage mesh group
     */
    createMesh() {
        // Create base hero mesh
        const heroGroup = super.createMesh();

        // Replace body with robe
        const bodyIndex = 1; // Body is the second child
        if (heroGroup.children[bodyIndex]) {
            heroGroup.remove(heroGroup.children[bodyIndex]);

            const robeGeometry = new THREE.ConeGeometry(0.4, 0.9, 8);
            const robeMaterial = new THREE.MeshStandardMaterial({
                color: this.color,
                metalness: 0.1,
                roughness: 0.7
            });
            const robe = new THREE.Mesh(robeGeometry, robeMaterial);
            robe.position.y = 0.45;
            robe.castShadow = true;

            // Insert at same index
            heroGroup.children.splice(bodyIndex, 0, robe);
            heroGroup.add(robe);
        }

        // Make head slightly smaller
        const headIndex = 2; // Head is the third child
        if (heroGroup.children[headIndex]) {
            heroGroup.remove(heroGroup.children[headIndex]);

            const headGeometry = new THREE.SphereGeometry(0.22, 16, 16);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: 0xE0E0E0,
                metalness: 0.1,
                roughness: 0.5
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 0.95;
            head.castShadow = true;

            // Insert at same index
            heroGroup.children.splice(headIndex, 0, head);
            heroGroup.add(head);
        }

        // Add hat
        const hatGeometry = new THREE.ConeGeometry(0.25, 0.5, 8);
        const hatMaterial = new THREE.MeshStandardMaterial({
            color: this.color,
            metalness: 0.2,
            roughness: 0.7
        });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 1.2;
        hat.castShadow = true;
        heroGroup.add(hat);

        // Store reference to hat
        this.hatMesh = hat;

        // Add staff
        const staffGroup = new THREE.Group();

        // Staff rod
        const staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
        const staffMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            metalness: 0.1,
            roughness: 0.8
        });
        const staff = new THREE.Mesh(staffGeometry, staffMaterial);
        staffGroup.add(staff);

        // Staff orb
        const orbGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const orbMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.position.y = 0.65;
        staffGroup.add(orb);

        // Position the staff
        staffGroup.position.set(0.4, 0.3, 0);
        staffGroup.rotation.z = -Math.PI / 12;
        heroGroup.add(staffGroup);

        // Store references
        this.staffMesh = staffGroup;
        this.orbMesh = orb;

        // Add floating particles around the mage
        for (let i = 0; i < 5; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.04, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Random position around mage
            const angle = (i / 5) * Math.PI * 2;
            const radius = 0.5;
            particle.position.set(
                Math.sin(angle) * radius,
                0.5 + Math.random() * 0.5,
                Math.cos(angle) * radius
            );

            // Animation data
            particle.userData = {
                angle: angle,
                radius: radius,
                speed: 0.01 + Math.random() * 0.01,
                verticalSpeed: 0.005 + Math.random() * 0.005,
                verticalDirection: 1
            };

            heroGroup.add(particle);
            this.particles.push(particle);
        }

        return heroGroup;
    }

    /**
     * Update mage appearance based on upgrades
     */
    updateAppearance() {
        super.updateAppearance();

        if (!this.mesh) return;

        // Increase orb size based on damage level
        const damageLevel = this.upgradeStats.damage.level;
        if (this.orbMesh) {
            this.orbMesh.scale.set(
                1 + (damageLevel - 1) * 0.2,
                1 + (damageLevel - 1) * 0.2,
                1 + (damageLevel - 1) * 0.2
            );

            // Change orb color based on damage level
            if (damageLevel > 1) {
                // Shift color from cyan to magenta as damage increases
                const hue = 180 - (damageLevel - 1) * 15; // Shift from 180 (cyan) toward magenta
                this.orbMesh.material.color.setHSL(hue / 360, 1, 0.5);
            }
        }

        // Change body color based on attack speed
        const attackSpeedLevel = this.upgradeStats.attackSpeed.level;
        if (attackSpeedLevel > 1) {
            // Robe is the second child (index 1)
            const robe = this.mesh.children[1];
            if (robe && robe.material) {
                // Adjust color to indicate attack speed
                const intensity = 0.1 * (attackSpeedLevel - 1);

                // Get base color
                const baseColor = new THREE.Color(this.color);

                // Lighten the color
                robe.material.color.set(
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

        // Make hat taller based on range level
        const rangeLevel = this.upgradeStats.range.level;
        if (this.hatMesh && rangeLevel > 1) {
            // Remove and recreate hat with new proportions
            this.mesh.remove(this.hatMesh);

            const hatGeometry = new THREE.ConeGeometry(
                0.25, // radius
                0.5 + (rangeLevel - 1) * 0.1, // height increases with range
                8
            );
            const hatMaterial = new THREE.MeshStandardMaterial({
                color: this.color,
                metalness: 0.2,
                roughness: 0.7
            });
            this.hatMesh = new THREE.Mesh(hatGeometry, hatMaterial);
            this.hatMesh.position.y = 1.2 + (rangeLevel - 1) * 0.05; // Position higher
            this.hatMesh.castShadow = true;
            this.mesh.add(this.hatMesh);
        }

        // Add more particles based on range and attack speed
        const totalLevel = rangeLevel + attackSpeedLevel;
        const targetParticleCount = 5 + Math.floor((totalLevel - 2) / 2);

        // Add more particles if needed
        while (this.particles.length < targetParticleCount) {
            const particleGeometry = new THREE.SphereGeometry(0.04, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Random position around mage
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.random() * 0.2;
            particle.position.set(
                Math.sin(angle) * radius,
                0.5 + Math.random() * 0.5,
                Math.cos(angle) * radius
            );

            // Animation data
            particle.userData = {
                angle: angle,
                radius: radius,
                speed: 0.01 + Math.random() * 0.01,
                verticalSpeed: 0.005 + Math.random() * 0.005,
                verticalDirection: 1
            };

            this.mesh.add(particle);
            this.particles.push(particle);
        }
    }

    /**
     * Update particle animations
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        super.update(delta);

        // Update particle animations
        this.particles.forEach(particle => {
            if (!particle.userData) return;

            // Orbit around mage
            particle.userData.angle += particle.userData.speed;
            particle.position.x = Math.sin(particle.userData.angle) * particle.userData.radius;
            particle.position.z = Math.cos(particle.userData.angle) * particle.userData.radius;

            // Vertical oscillation
            particle.position.y += particle.userData.verticalSpeed * particle.userData.verticalDirection;

            // Reverse direction at limits
            if (particle.position.y > 1.2 || particle.position.y < 0.3) {
                particle.userData.verticalDirection *= -1;
            }
        });
    }

    /**
     * Animate the mage's attack
     * @returns {Promise} Promise that resolves when animation completes
     */
    animateAttack() {
        return new Promise(resolve => {
            if (!this.mesh || !this.staffMesh || !this.orbMesh) {
                resolve();
                return;
            }

            // Staff glow animation
            const originalColor = this.orbMesh.material.color.clone();
            const glowColor = new THREE.Color(0xffffff);
            const duration = 10; // frames
            let frameCount = 0;

            const animateFrame = () => {
                frameCount++;

                let progress = frameCount / duration;
                if (progress <= 0.5) {
                    // Increase glow
                    progress = progress * 2; // 0 to 1
                    this.orbMesh.material.color.lerpColors(originalColor, glowColor, progress);
                    this.orbMesh.material.opacity = 0.8 + progress * 0.2;
                    this.orbMesh.scale.set(1 + progress * 0.5, 1 + progress * 0.5, 1 + progress * 0.5);
                } else {
                    // Decrease glow
                    progress = (progress - 0.5) * 2; // 0 to 1
                    this.orbMesh.material.color.lerpColors(glowColor, originalColor, progress);
                    this.orbMesh.material.opacity = 1 - progress * 0.2;
                    this.orbMesh.scale.set(1.5 - progress * 0.5, 1.5 - progress * 0.5, 1.5 - progress * 0.5);
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
     * Mage's fireball ability - launch a fireball dealing AOE damage
     * @param {THREE.Vector3} targetPosition - Target position
     * @param {Array<Enemy>} enemies - All enemies in game
     * @returns {Object} Projectile data
     */
    fireball(targetPosition, enemies) {
        // Calculate direction and normalize
        const direction = new THREE.Vector3().subVectors(
            targetPosition,
            this.position
        ).normalize();

        // Face the target
        this.rotation.y = Math.atan2(direction.x, direction.z);
        if (this.mesh) this.mesh.rotation.y = this.rotation.y;

        // Animate attack
        this.animateAttack();

        // Calculate damage (1.5x normal damage)
        const damage = Math.round(this.upgradeStats.damage.value * 1.5);

        return {
            type: 'projectile',
            startPosition: this.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
            direction: direction,
            speed: 0.2,
            damage: damage,
            radius: 2, // AOE radius
            color: 0xff4500, // Orange-red
            owner: this
        };
    }

    /**
     * Mage's frost nova ability - freeze all enemies in range
     * @param {Array<Enemy>} enemies - All enemies in game
     * @returns {Array<Enemy>} Enemies hit by the ability
     */
    frostNova(enemies) {
        if (!enemies || enemies.length === 0) return [];

        // Get all enemies in range
        const range = this.upgradeStats.range.value;
        const enemiesInRange = enemies.filter(enemy => {
            const distance = this.position.distanceTo(enemy.position);
            return distance <= range;
        });

        if (enemiesInRange.length === 0) return [];

        // Animate attack
        this.animateAttack();

        // Calculate damage (0.5x normal damage)
        const damage = Math.round(this.upgradeStats.damage.value * 0.5);

        // Apply damage and freeze to all enemies in range
        enemiesInRange.forEach(enemy => {
            // Deal damage
            enemy.takeDamage(damage, this, false);

            // Apply freeze effect
            enemy.applyEffect({
                type: 'freeze',
                duration: 3000,
                slowFactor: 0.9, // 90% slow (almost frozen in place)
                source: this
            });
        });

        return enemiesInRange;
    }

    /**
     * Mage's arcane missiles ability - channel multiple missiles at a target
     * @param {Enemy} target - Target enemy
     * @param {number} missileCount - Number of missiles to fire
     * @returns {Object} Channeling data
     */
    arcaneMissiles(target, missileCount = 5) {
        if (!target) return null;

        // Face the target
        const direction = new THREE.Vector3().subVectors(
            target.position,
            this.position
        ).normalize();

        this.rotation.y = Math.atan2(direction.x, direction.z);
        if (this.mesh) this.mesh.rotation.y = this.rotation.y;

        // Animate attack
        this.animateAttack();

        // Calculate damage per missile (0.6x normal damage)
        const damagePerMissile = Math.round(this.upgradeStats.damage.value * 0.6);

        return {
            type: 'channel',
            target: target,
            duration: 3000,
            missileCount: missileCount,
            missileDelay: 3000 / missileCount,
            damagePerMissile: damagePerMissile,
            color: 0xff00ff, // Magenta
            owner: this
        };
    }

    /**
     * Mage's mana shield ability - convert damage to mana cost
     * @returns {Object} Buff data
     */
    manaShield() {
        return {
            name: 'Mana Shield',
            duration: 8000,
            damageConversion: 0.3, // 30% of damage converted
            effectColor: 0x4169e1 // Royal Blue
        };
    }
}
