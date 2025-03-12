import * as THREE from 'three';
import { Logger } from '../../utils/Logger.js';
import { SpatialGrid } from '../../utils/SpatialGrid.js';

/**
 * Handles physics, collision detection, and spatial partitioning
 */
export class PhysicsSystem {
  constructor() {
    this.logger = new Logger('PhysicsSystem');

    // Spatial partitioning grid for efficient collision detection
    this.spatialGrid = new SpatialGrid(5); // 5 unit cell size

    // Physics settings
    this.gravity = 9.8; // m/s²
    this.airResistance = 0.01;
    this.groundFriction = 0.2;

    // Bounds of the playable area
    this.worldBounds = {
      minX: -20,
      maxX: 20,
      minY: 0,
      maxY: 20,
      minZ: -20,
      maxZ: 20
    };

    // Collection of physics objects
    this.physicsObjects = [];

    // Raycaster for ground collision
    this.raycaster = new THREE.Raycaster();
    this.downVector = new THREE.Vector3(0, -1, 0);

    // Temp variables for calculations
    this.tempVec3 = new THREE.Vector3();
    this.tempBounds = {
      minX: 0, maxX: 0,
      minY: 0, maxY: 0,
      minZ: 0, maxZ: 0
    };

    this.logger.debug('Physics system created');
  }

  /**
   * Initialize the physics system
   */
  initialize() {
    this.logger.info('Initializing physics system');

    // Any initialization logic

    this.logger.info('Physics system initialized');
  }

  /**
   * Register an object for physics processing
   * @param {Object} object - Object to register
   * @param {Object} physicsData - Physics properties for the object
   */
  registerObject(object, physicsData = {}) {
    // Create a physics body for the object
    const body = {
      object: object,
      position: object.position || new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      mass: physicsData.mass || 1,
      restitution: physicsData.restitution || 0.3, // Bounciness
      friction: physicsData.friction || this.groundFriction,
      isStatic: physicsData.isStatic || false,
      useGravity: physicsData.useGravity !== undefined ? physicsData.useGravity : true,
      collider: physicsData.collider || {
        type: 'sphere',
        radius: 0.5
      },
      onCollision: physicsData.onCollision || null,
      grounded: false,
      id: object.id || Math.random().toString(36).substring(2, 9)
    };

    // Add to physics objects
    this.physicsObjects.push(body);

    // Add to spatial grid
    const bounds = this.getObjectBounds(body);
    this.spatialGrid.insert(body, bounds);

    this.logger.debug(`Registered physics object: ${body.id}`);

    return body;
  }

  /**
   * Unregister an object from physics processing
   * @param {Object} object - Object to unregister
   */
  unregisterObject(object) {
    // Find the physics body
    const index = this.physicsObjects.findIndex(body =>
      body.object === object || body.id === object.id
    );

    if (index !== -1) {
      const body = this.physicsObjects[index];

      // Remove from spatial grid
      this.spatialGrid.remove(body);

      // Remove from physics objects
      this.physicsObjects.splice(index, 1);

      this.logger.debug(`Unregistered physics object: ${body.id}`);
      return true;
    }

    this.logger.warn(`Could not find physics object to unregister: ${object.id}`);
    return false;
  }

  /**
   * Update physics simulation
   * @param {number} delta - Time since last update in seconds
   */
  update(delta) {
    // Limit delta to prevent large jumps in physics simulation
    const clampedDelta = Math.min(delta, 0.1);

    // Update each physics object
    this.physicsObjects.forEach(body => {
      if (body.isStatic) return; // Skip static objects

      // Apply gravity
      if (body.useGravity) {
        body.acceleration.y -= this.gravity;
      }

      // Apply air resistance
      if (!body.grounded) {
        body.acceleration.x -= body.velocity.x * this.airResistance;
        body.acceleration.z -= body.velocity.z * this.airResistance;
      } else {
        // Apply ground friction
        body.acceleration.x -= body.velocity.x * body.friction;
        body.acceleration.z -= body.velocity.z * body.friction;
      }

      // Update velocity
      body.velocity.x += body.acceleration.x * clampedDelta;
      body.velocity.y += body.acceleration.y * clampedDelta;
      body.velocity.z += body.acceleration.z * clampedDelta;

      // Update position
      body.position.x += body.velocity.x * clampedDelta;
      body.position.y += body.velocity.y * clampedDelta;
      body.position.z += body.velocity.z * clampedDelta;

      // Reset acceleration
      body.acceleration.set(0, 0, 0);

      // Check ground collision
      this.checkGroundCollision(body);

      // Check world bounds
      this.constrainToWorldBounds(body);

      // Update object position
      if (body.object && body.object.position) {
        body.object.position.copy(body.position);
      }

      // Update spatial grid position
      const bounds = this.getObjectBounds(body);
      this.spatialGrid.updateEntity(body, bounds);
    });

    // Check for collisions between objects
    this.detectCollisions();
  }

  /**
   * Check if an object is colliding with the ground
   * @param {Object} body - Physics body to check
   */
  checkGroundCollision(body) {
    // Reset grounded state
    body.grounded = false;

    // Skip if too high to hit ground soon
    if (body.position.y > 10) return;

    // Cast ray downward from object position
    this.raycaster.set(body.position, this.downVector);

    // Get collider radius/height based on collider type
    let height = 0;
    if (body.collider.type === 'sphere') {
      height = body.collider.radius;
    } else if (body.collider.type === 'box') {
      height = body.collider.height / 2;
    }

    // Ground collision if ray hits within height
    if (body.position.y <= height) {
      // Object is below ground, push it up
      body.position.y = height;

      // Bounce if moving downward with energy
      if (body.velocity.y < 0) {
        body.velocity.y = -body.velocity.y * body.restitution;

        // If bounce is very small, just stop
        if (Math.abs(body.velocity.y) < 0.1) {
          body.velocity.y = 0;
        }
      }

      body.grounded = true;
    }
  }

  /**
   * Constrain an object to the world bounds
   * @param {Object} body - Physics body to constrain
   */
  constrainToWorldBounds(body) {
    // X bounds
    if (body.position.x < this.worldBounds.minX) {
      body.position.x = this.worldBounds.minX;
      body.velocity.x = -body.velocity.x * body.restitution;
    } else if (body.position.x > this.worldBounds.maxX) {
      body.position.x = this.worldBounds.maxX;
      body.velocity.x = -body.velocity.x * body.restitution;
    }

    // Y bounds (only max, ground is handled separately)
    if (body.position.y > this.worldBounds.maxY) {
      body.position.y = this.worldBounds.maxY;
      body.velocity.y = -body.velocity.y * body.restitution;
    }

    // Z bounds
    if (body.position.z < this.worldBounds.minZ) {
      body.position.z = this.worldBounds.minZ;
      body.velocity.z = -body.velocity.z * body.restitution;
    } else if (body.position.z > this.worldBounds.maxZ) {
      body.position.z = this.worldBounds.maxZ;
      body.velocity.z = -body.velocity.z * body.restitution;
    }
  }

  /**
   * Get the bounds of an object for spatial partitioning
   * @param {Object} body - Physics body
   * @returns {Object} Bounds object with min/max values for each axis
   */
  getObjectBounds(body) {
    // Get base position
    const pos = body.position;

    // Set bounds based on collider type
    if (body.collider.type === 'sphere') {
      const radius = body.collider.radius;

      this.tempBounds.minX = pos.x - radius;
      this.tempBounds.maxX = pos.x + radius;
      this.tempBounds.minY = pos.y - radius;
      this.tempBounds.maxY = pos.y + radius;
      this.tempBounds.minZ = pos.z - radius;
      this.tempBounds.maxZ = pos.z + radius;
    } else if (body.collider.type === 'box') {
      const halfWidth = body.collider.width / 2;
      const halfHeight = body.collider.height / 2;
      const halfDepth = body.collider.depth / 2;

      this.tempBounds.minX = pos.x - halfWidth;
      this.tempBounds.maxX = pos.x + halfWidth;
      this.tempBounds.minY = pos.y - halfHeight;
      this.tempBounds.maxY = pos.y + halfHeight;
      this.tempBounds.minZ = pos.z - halfDepth;
      this.tempBounds.maxZ = pos.z + halfDepth;
    } else {
      // Default to small sphere if no collider specified
      this.tempBounds.minX = pos.x - 0.5;
      this.tempBounds.maxX = pos.x + 0.5;
      this.tempBounds.minY = pos.y - 0.5;
      this.tempBounds.maxY = pos.y + 0.5;
      this.tempBounds.minZ = pos.z - 0.5;
      this.tempBounds.maxZ = pos.z + 0.5;
    }

    return this.tempBounds;
  }

  /**
   * Detect and resolve collisions between objects
   */
  // Around line 250 in PhysicsSystem.js
  detectCollisions() {
    // For each physics object
    for (let i = 0; i < this.physicsObjects.length; i++) {
      const bodyA = this.physicsObjects[i];

      // Skip static objects for the first position of the pair
      if (bodyA.isStatic) continue;

      // Get potential collision candidates from spatial grid
      const boundsA = this.getObjectBounds(bodyA);
      const candidates = this.spatialGrid.query(boundsA);

      // Only check a limited number of candidates per frame
      // This prevents checking too many collisions at once
      const MAX_COLLISION_CHECKS_PER_OBJECT = 10;
      const candidatesToCheck = candidates.size > MAX_COLLISION_CHECKS_PER_OBJECT ?
        Array.from(candidates).slice(0, MAX_COLLISION_CHECKS_PER_OBJECT) :
        Array.from(candidates);

      // Check collision with each candidate
      for (let j = 0; j < candidatesToCheck.length; j++) {
        const bodyB = candidatesToCheck[j];

        // Skip self comparisons
        if (bodyA === bodyB) continue;

        // Skip if too far apart (quick distance check)
        const distanceSquared = bodyA.position.distanceToSquared(bodyB.position);
        const maxRadiusSum = (bodyA.collider.radius || 1) + (bodyB.collider.radius || 1);
        if (distanceSquared > maxRadiusSum * maxRadiusSum * 1.5) {
          continue;
        }

        // Check collision between the pair
        const collision = this.checkCollision(bodyA, bodyB);

        if (collision.colliding) {
          // Resolve collision
          this.resolveCollision(bodyA, bodyB, collision);

          // Trigger collision callbacks if defined
          if (bodyA.onCollision) {
            bodyA.onCollision(bodyB, collision);
          }

          if (bodyB.onCollision) {
            bodyB.onCollision(bodyA, collision);
          }
        }
      }
    }
  }

  /**
   * Check if two objects are colliding
   * @param {Object} bodyA - First physics body
   * @param {Object} bodyB - Second physics body
   * @returns {Object} Collision information
   */
  checkCollision(bodyA, bodyB) {
    const result = {
      colliding: false,
      normal: new THREE.Vector3(),
      depth: 0
    };

    // Handle different collider combinations
    if (bodyA.collider.type === 'sphere' && bodyB.collider.type === 'sphere') {
      return this.checkSphereToSphereCollision(bodyA, bodyB);
    } else if (bodyA.collider.type === 'box' && bodyB.collider.type === 'box') {
      return this.checkBoxToBoxCollision(bodyA, bodyB);
    } else if (
      (bodyA.collider.type === 'sphere' && bodyB.collider.type === 'box') ||
      (bodyA.collider.type === 'box' && bodyB.collider.type === 'sphere')
    ) {
      return this.checkSphereToBoxCollision(
        bodyA.collider.type === 'sphere' ? bodyA : bodyB,
        bodyA.collider.type === 'box' ? bodyA : bodyB
      );
    }

    return result;
  }

  /**
   * Check collision between two sphere colliders
   * @param {Object} bodyA - First sphere physics body
   * @param {Object} bodyB - Second sphere physics body
   * @returns {Object} Collision information
   */
  checkSphereToSphereCollision(bodyA, bodyB) {
    const result = {
      colliding: false,
      normal: new THREE.Vector3(),
      depth: 0
    };

    // Calculate distance between centers
    this.tempVec3.subVectors(bodyB.position, bodyA.position);
    const distance = this.tempVec3.length();

    // Sum of radii
    const radiusA = bodyA.collider.radius;
    const radiusB = bodyB.collider.radius;
    const sumRadii = radiusA + radiusB;

    // Check if colliding
    if (distance < sumRadii) {
      result.colliding = true;

      // Calculate collision normal
      result.normal.copy(this.tempVec3).normalize();

      // Calculate penetration depth
      result.depth = sumRadii - distance;
    }

    return result;
  }

  /**
   * Check collision between two box colliders
   * @param {Object} bodyA - First box physics body
   * @param {Object} bodyB - Second box physics body
   * @returns {Object} Collision information
   */
  checkBoxToBoxCollision(bodyA, bodyB) {
    const result = {
      colliding: false,
      normal: new THREE.Vector3(),
      depth: 0
    };

    // Get the bounds of each box
    const boundsA = this.getObjectBounds(bodyA);
    const boundsB = this.getObjectBounds(bodyB);

    // AABB intersection test
    if (
      boundsA.minX <= boundsB.maxX && boundsA.maxX >= boundsB.minX &&
      boundsA.minY <= boundsB.maxY && boundsA.maxY >= boundsB.minY &&
      boundsA.minZ <= boundsB.maxZ && boundsA.maxZ >= boundsB.minZ
    ) {
      result.colliding = true;

      // Calculate distance between centers
      this.tempVec3.subVectors(bodyB.position, bodyA.position);

      // Calculate collision normal (from the smallest penetration axis)
      const halfWidthA = bodyA.collider.width / 2;
      const halfHeightA = bodyA.collider.height / 2;
      const halfDepthA = bodyA.collider.depth / 2;

      const halfWidthB = bodyB.collider.width / 2;
      const halfHeightB = bodyB.collider.height / 2;
      const halfDepthB = bodyB.collider.depth / 2;

      // Penetration in each axis
      const penetrationX = halfWidthA + halfWidthB - Math.abs(this.tempVec3.x);
      const penetrationY = halfHeightA + halfHeightB - Math.abs(this.tempVec3.y);
      const penetrationZ = halfDepthA + halfDepthB - Math.abs(this.tempVec3.z);

      // Find minimum penetration axis
      if (penetrationX < penetrationY && penetrationX < penetrationZ) {
        result.depth = penetrationX;
        result.normal.set(this.tempVec3.x > 0 ? 1 : -1, 0, 0);
      } else if (penetrationY < penetrationZ) {
        result.depth = penetrationY;
        result.normal.set(0, this.tempVec3.y > 0 ? 1 : -1, 0);
      } else {
        result.depth = penetrationZ;
        result.normal.set(0, 0, this.tempVec3.z > 0 ? 1 : -1);
      }
    }

    return result;
  }

  /**
   * Check collision between a sphere and a box
   * @param {Object} sphereBody - Sphere physics body
   * @param {Object} boxBody - Box physics body
   * @returns {Object} Collision information
   */
  checkSphereToBoxCollision(sphereBody, boxBody) {
    const result = {
      colliding: false,
      normal: new THREE.Vector3(),
      depth: 0
    };

    // Find the closest point on the box to the sphere
    const closestPoint = new THREE.Vector3();
    const sphereCenter = sphereBody.position;
    const boxCenter = boxBody.position;
    const boxHalfWidth = boxBody.collider.width / 2;
    const boxHalfHeight = boxBody.collider.height / 2;
    const boxHalfDepth = boxBody.collider.depth / 2;

    // Clamp each coordinate to the box
    closestPoint.x = Math.max(boxCenter.x - boxHalfWidth, Math.min(sphereCenter.x, boxCenter.x + boxHalfWidth));
    closestPoint.y = Math.max(boxCenter.y - boxHalfHeight, Math.min(sphereCenter.y, boxCenter.y + boxHalfHeight));
    closestPoint.z = Math.max(boxCenter.z - boxHalfDepth, Math.min(sphereCenter.z, boxCenter.z + boxHalfDepth));

    // Calculate distance between closest point and sphere center
    this.tempVec3.subVectors(sphereCenter, closestPoint);
    const distance = this.tempVec3.length();

    // Check if colliding
    if (distance < sphereBody.collider.radius) {
      result.colliding = true;

      // Calculate collision normal
      result.normal.copy(this.tempVec3).normalize();

      // Calculate penetration depth
      result.depth = sphereBody.collider.radius - distance;
    }

    return result;
  }

  /**
   * Resolve a collision between two objects
   * @param {Object} bodyA - First physics body
   * @param {Object} bodyB - Second physics body
   * @param {Object} collision - Collision information
   */
  resolveCollision(bodyA, bodyB, collision) {
    // Skip if either object is static
    if (bodyA.isStatic && bodyB.isStatic) return;

    // Calculate relative velocity
    const relativeVelocity = new THREE.Vector3();
    relativeVelocity.subVectors(bodyB.velocity, bodyA.velocity);

    // Calculate velocity along normal
    const normalVelocity = relativeVelocity.dot(collision.normal);

    // Do not resolve if objects are separating
    if (normalVelocity > 0) return;

    // Calculate restitution (bounciness)
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);

    // Calculate impulse scalar
    let j = -(1 + restitution) * normalVelocity;
    j /= 1 / bodyA.mass + 1 / bodyB.mass;

    // Apply impulse
    const impulse = new THREE.Vector3().copy(collision.normal).multiplyScalar(j);

    if (!bodyA.isStatic) {
      bodyA.velocity.sub(impulse.clone().divideScalar(bodyA.mass));
    }

    if (!bodyB.isStatic) {
      bodyB.velocity.add(impulse.clone().divideScalar(bodyB.mass));
    }

    // Positional correction to avoid sinking
    const percent = 0.2; // correction percentage
    const correction = collision.normal.clone().multiplyScalar(collision.depth * percent);

    if (!bodyA.isStatic) {
      bodyA.position.sub(correction.clone().multiplyScalar(1 / bodyA.mass));
    }

    if (!bodyB.isStatic) {
      bodyB.position.add(correction.clone().multiplyScalar(1 / bodyB.mass));
    }
  }

  /**
   * Apply a force to an object
   * @param {Object} object - Object to apply force to
   * @param {THREE.Vector3} force - Force vector
   * @param {boolean} isImpulse - If true, apply as an impulse (immediate velocity change)
   */
  applyForce(object, force, isImpulse = false) {
    // Find physics body for this object
    const body = this.getPhysicsBody(object);

    if (!body || body.isStatic) return;

    if (isImpulse) {
      // For impulses, directly modify velocity
      body.velocity.add(force.clone().divideScalar(body.mass));
    } else {
      // For forces, add to acceleration
      body.acceleration.add(force.clone().divideScalar(body.mass));
    }
  }

  /**
   * Get the physics body for an object
   * @param {Object} object - Object to get physics body for
   * @returns {Object|null} Physics body or null if not found
   */
  getPhysicsBody(object) {
    for (const body of this.physicsObjects) {
      if (body.object === object || body.id === object.id) {
        return body;
      }
    }

    return null;
  }

  /**
   * Cast a ray and get the first object hit
   * @param {THREE.Vector3} origin - Ray origin
   * @param {THREE.Vector3} direction - Ray direction
   * @param {number} maxDistance - Maximum ray distance
   * @returns {Object|null} Hit result or null if nothing hit
   */
  raycast(origin, direction, maxDistance = Infinity) {
    // Normalize direction
    const normalizedDirection = direction.clone().normalize();

    // Create ray
    this.raycaster.set(origin, normalizedDirection);

    // Create bounds for the ray
    const rayBounds = {
      minX: Math.min(origin.x, origin.x + normalizedDirection.x * maxDistance),
      maxX: Math.max(origin.x, origin.x + normalizedDirection.x * maxDistance),
      minY: Math.min(origin.y, origin.y + normalizedDirection.y * maxDistance),
      maxY: Math.max(origin.y, origin.y + normalizedDirection.y * maxDistance),
      minZ: Math.min(origin.z, origin.z + normalizedDirection.z * maxDistance),
      maxZ: Math.max(origin.z, origin.z + normalizedDirection.z * maxDistance)
    };

    // Find potential objects in ray's path
    const candidates = this.spatialGrid.query(rayBounds);

    // Find closest hit
    let closestHit = null;
    let closestDistance = maxDistance;

    candidates.forEach(body => {
      // Skip if this is not a collidable object
      if (!body.collider) return;

      // Check intersection with collider
      let hit = false;
      let hitPoint = new THREE.Vector3();
      let hitDistance = Infinity;

      if (body.collider.type === 'sphere') {
        // Ray-sphere intersection
        const sphere = new THREE.Sphere(body.position, body.collider.radius);
        hit = this.raycaster.ray.intersectSphere(sphere, hitPoint);

        if (hit) {
          hitDistance = origin.distanceTo(hitPoint);
        }
      } else if (body.collider.type === 'box') {
        // Ray-box intersection
        const halfWidth = body.collider.width / 2;
        const halfHeight = body.collider.height / 2;
        const halfDepth = body.collider.depth / 2;

        const box = new THREE.Box3(
          new THREE.Vector3(
            body.position.x - halfWidth,
            body.position.y - halfHeight,
            body.position.z - halfDepth
          ),
          new THREE.Vector3(
            body.position.x + halfWidth,
            body.position.y + halfHeight,
            body.position.z + halfDepth
          )
        );

        hit = this.raycaster.ray.intersectBox(box, hitPoint);

        if (hit) {
          hitDistance = origin.distanceTo(hitPoint);
        }
      }

      // If hit and closer than current closest
      if (hit && hitDistance < closestDistance) {
        closestDistance = hitDistance;
        closestHit = {
          object: body.object,
          point: hitPoint.clone(),
          distance: hitDistance,
          body: body
        };
      }
    });

    return closestHit;
  }

  /**
   * Query objects in a sphere
   * @param {THREE.Vector3} center - Sphere center
   * @param {number} radius - Sphere radius
   * @returns {Array} Array of objects in sphere
   */
  querySphere(center, radius) {
    // Get objects from spatial grid
    return Array.from(this.spatialGrid.queryRadius(center, radius));
  }

  /**
   * Set world bounds
   * @param {Object} bounds - New world bounds
   */
  setWorldBounds(bounds) {
    this.worldBounds = {
      ...this.worldBounds,
      ...bounds
    };
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.logger.info('Disposing physics system resources');

    // Clear spatial grid
    this.spatialGrid.clear();

    // Clear physics objects
    this.physicsObjects = [];
  }
}