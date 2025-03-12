import { Logger } from './Logger.js';

/**
 * Object pool for efficient recycling of objects
 */
export class ObjectPool {
  /**
   * @param {Function} factory - Factory function to create new objects
   * @param {Function} reset - Function to reset objects when recycling
   * @param {number} initialSize - Initial pool size
   */
  constructor(factory, reset, initialSize = 0) {
    this.logger = new Logger('ObjectPool');
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.active = new Set();
    
    // Pre-create initial objects
    this.expand(initialSize);
    
    this.logger.debug(`Created object pool, initialSize=${initialSize}`);
  }
  
  /**
   * Expand the pool by creating new objects
   * @param {number} count - Number of objects to create
   */
  expand(count) {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
    
    this.logger.debug(`Expanded pool by ${count}, new size=${this.pool.length}`);
  }
  
  /**
   * Get an object from the pool or create a new one if needed
   * @returns {*} An object from the pool
   */
  get() {
    let obj;
    
    if (this.pool.length > 0) {
      // Reuse an existing object
      obj = this.pool.pop();
    } else {
      // Create a new object
      obj = this.factory();
      this.logger.debug('Created new object because pool was empty');
    }
    
    // Track as active
    this.active.add(obj);
    
    return obj;
  }
  
  /**
   * Return an object to the pool
   * @param {*} obj - Object to return to the pool
   */
  release(obj) {
    if (!this.active.has(obj)) {
      this.logger.warn('Attempted to release an object not managed by this pool');
      return;
    }
    
    // Reset object state
    this.reset(obj);
    
    // Remove from active set
    this.active.delete(obj);
    
    // Add back to pool
    this.pool.push(obj);
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
   */
  releaseAll() {
    this.active.forEach(obj => {
      this.reset(obj);
      this.pool.push(obj);
    });
    
    this.active.clear();
    this.logger.debug(`Released all active objects back to pool, size=${this.pool.length}`);
  }
  
  /**
   * Clear the pool and release all objects
   */
  clear() {
    this.pool = [];
    this.active.clear();
    this.logger.debug('Cleared object pool');
  }
}