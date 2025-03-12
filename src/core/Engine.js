import { Logger } from '../utils/Logger.js';

/**
 * Core game engine that handles the game loop
 */
export class Engine {
  constructor() {
    this.logger = new Logger('Engine');
    this.isRunning = false;
    this.rafId = null;
    this.updateFn = null;
    
    // Bind methods to maintain context
    this.loop = this.loop.bind(this);
  }
  
  /**
   * Start the game loop
   * @param {Function} updateFn - Function to call on each frame
   */
  start(updateFn) {
    if (this.isRunning) {
      this.logger.warn('Engine already running');
      return;
    }
    
    this.logger.info('Starting engine loop');
    this.updateFn = updateFn;
    this.isRunning = true;
    this.rafId = requestAnimationFrame(this.loop);
  }
  
  /**
   * Main game loop
   * @param {number} timestamp - Current timestamp from requestAnimationFrame
   */
  loop(timestamp) {
    // Call the update function
    if (this.updateFn) {
      this.updateFn(timestamp);
    }
    
    // Continue the loop if still running
    if (this.isRunning) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('Engine already stopped');
      return;
    }
    
    this.logger.info('Stopping engine loop');
    this.isRunning = false;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  /**
   * Pause the game loop
   */
  pause() {
    if (!this.isRunning) {
      this.logger.warn('Cannot pause: Engine not running');
      return;
    }
    
    this.logger.info('Pausing engine loop');
    this.stop();
  }
  
  /**
   * Resume the game loop
   */
  resume() {
    if (this.isRunning) {
      this.logger.warn('Cannot resume: Engine already running');
      return;
    }
    
    this.logger.info('Resuming engine loop');
    this.start(this.updateFn);
  }
}