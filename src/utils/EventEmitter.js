import * as THREE from 'three';
/**
 * Simple event emitter implementation
 */
export class EventEmitter {
    constructor() {
      this.events = {};
    }
    
    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function
     */
    on(event, listener) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      
      this.events[event].push(listener);
    }
    
    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function
     */
    once(event, listener) {
      const onceWrapper = (...args) => {
        listener(...args);
        this.off(event, onceWrapper);
      };
      
      this.on(event, onceWrapper);
    }
    
    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} listener - Event listener function to remove
     */
    off(event, listener) {
      if (!this.events[event]) return;
      
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
      if (!this.events[event]) return;
      
      this.events[event].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} event - Event name (optional - if not provided, all events are cleared)
     */
    clear(event) {
      if (event) {
        delete this.events[event];
      } else {
        this.events = {};
      }
    }
    
    /**
     * Get the number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
      return this.events[event] ? this.events[event].length : 0;
    }
  }