// src/utils/ObjectPool.js

import { Logger } from './Logger.js';

/**
 * Robust object pool for efficient recycling of objects
 */
export class ObjectPool {
  /**
   * @param {Function} factory - Factory function to create new objects
   * @param {Function} reset - Function to reset objects when recycling
   * @param {number} initialSize - Initial pool size
   */
  constructor(factory, reset, initialSize = 0) {
    this.logger = new Logger('ObjectPool');
    
    // Validate input parameters
    if (typeof factory !== 'function') {
      this.logger.error('Invalid factory function provided to ObjectPool');
      factory = () => ({}); // Default factory as fallback
    }
    
    if (typeof reset !== 'function') {
      this.logger.warn('Invalid reset function provided to ObjectPool');
      reset = () => {}; // Default reset as fallback
    }
    
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.active = new Set();
    this.initialSize = initialSize;
    
    // Pre-create initial objects
    this.expand(initialSize);
    
    this.logger.debug(`Created object pool, initialSize=${initialSize}`);
  }
  
  /**
   * Expand the pool by creating new objects
   * @param {number} count - Number of objects to create
   */
  expand(count) {
    try {
      for (let i = 0; i < count; i++) {
        const obj = this.factory();
        if (obj) {
          this.pool.push(obj);
        } else {
          this.logger.warn('Factory function returned null/undefined object');
        }
      }
      
      this.logger.debug(`Expanded pool by ${count}, new size=${this.pool.length}`);
    } catch (error) {
      this.logger.error(`Error expanding object pool: ${error.message}`);
    }
  }
  
  /**
   * Get an object from the pool or create a new one if needed
   * @returns {*} An object from the pool
   */
  get() {
    let obj = null;
    
    try {
      if (this.pool.length > 0) {
        // Reuse an existing object
        obj = this.pool.pop();
      } else {
        // Create a new object
        obj = this.factory();
        this.logger.debug('Created new object because pool was empty');
      }
      
      // Only track valid objects
      if (obj) {
        // Track as active
        this.active.add(obj);
      } else {
        this.logger.warn('Factory returned null object, retrying...');
        // Try one more time
        obj = this.factory();
        if (obj) {
          this.active.add(obj);
        } else {
          this.logger.error('Factory consistently returns null objects');
        }
      }
    } catch (error) {
      this.logger.error(`Error getting object from pool: ${error.message}`);
      // Return a minimal valid object as fallback
      try {
        obj = this.factory();
        if (obj) {
          this.active.add(obj);
        }
      } catch (secondError) {
        this.logger.error('Factory failed during recovery attempt');
      }
    }
    
    return obj;
  }
  
  /**
   * Return an object to the pool
   * @param {*} obj - Object to return to the pool
   * @returns {boolean} Success status
   */
  release(obj) {
    if (!obj) {
      this.logger.warn('Attempted to release null/undefined object');
      return false;
    }
    
    if (!this.active.has(obj)) {
      this.logger.warn('Attempted to release an object not managed by this pool');
      return false;
    }
    
    try {
      // Reset object state
      this.reset(obj);
      
      // Remove from active set
      this.active.delete(obj);
      
      // Add back to pool
      this.pool.push(obj);
      
      return true;
    } catch (error) {
      this.logger.error(`Error releasing object to pool: ${error.message}`);
      
      // Still remove from active set even if reset fails
      this.active.delete(obj);
      
      return false;
    }
  }
  
  /**
   * Get the number of available objects in the pool
   * @returns {number} Pool size
   */
  size() {
    return this.pool.length;
  }
  
  /**
   * Get the number of active objects
   * @returns {number} Active object count
   */
  activeCount() {
    return this.active.size;
  }
  
  /**
   * Release all active objects back to the pool
   * @returns {number} Number of objects successfully released
   */
  releaseAll() {
    let releasedCount = 0;
    
    try {
      const activeObjects = Array.from(this.active);
      
      activeObjects.forEach(obj => {
        if (this.release(obj)) {
          releasedCount++;
        }
      });
      
      this.logger.debug(`Released ${releasedCount}/${activeObjects.length} active objects back to pool, size=${this.pool.length}`);
    } catch (error) {
      this.logger.error(`Error releasing all objects: ${error.message}`);
    }
    
    return releasedCount;
  }
  
  /**
   * Clear the pool and release all objects
   */
  clear() {
    // Release all active objects first to ensure proper cleanup
    this.releaseAll();
    
    // Clear the pool
    this.pool = [];
    this.active.clear();
    
    this.logger.debug('Cleared object pool');
  }
  
  /**
   * Re-initialize the pool with fresh objects
   */
  reinitialize() {
    this.clear();
    this.expand(this.initialSize);
    this.logger.info(`Object pool reinitialized with ${this.initialSize} objects`);
  }
}