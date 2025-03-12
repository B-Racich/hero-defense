import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';
import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Handles user input and interaction
 */
export class InputManager {
  constructor() {
    this.logger = new Logger('InputManager');
    this.events = new EventEmitter();
    this.mouse = new THREE.Vector2();
    this.keys = {};
    this.pointerLocked = false;
    
    // Bind methods to maintain context
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onResize = this.onResize.bind(this);
  }
  
  /**
   * Initialize input handlers
   */
  initialize() {
    this.logger.info('Initializing input manager');
    
    // Add event listeners
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('wheel', this.onWheel);
    window.addEventListener('resize', this.onResize);
    
    this.logger.info('Input manager initialized');
  }
  
  /**
   * Handle mouse move events
   * @param {MouseEvent} event - Mouse move event
   */
  onMouseMove(event) {
    // Calculate normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Emit event with mouse data
    this.events.emit('mousemove', {
      clientX: event.clientX,
      clientY: event.clientY,
      normalized: this.mouse.clone()
    });
  }
  
  /**
   * Handle mouse down events
   * @param {MouseEvent} event - Mouse down event
   */
  onMouseDown(event) {
    // Emit event with mouse data
    this.events.emit('mousedown', {
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      normalized: this.mouse.clone()
    });
  }
  
  /**
   * Handle mouse up events
   * @param {MouseEvent} event - Mouse up event
   */
  onMouseUp(event) {
    // Emit event with mouse data
    this.events.emit('mouseup', {
      button: event.button,
      clientX: event.clientX,
      clientY: event.clientY,
      normalized: this.mouse.clone()
    });
  }
  
  /**
   * Handle key down events
   * @param {KeyboardEvent} event - Key down event
   */
  onKeyDown(event) {
    const key = event.key.toLowerCase();
    this.keys[key] = true;
    
    // Emit event with key data
    this.events.emit('keydown', {
      key: key,
      code: event.code,
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey
    });
  }
  
  /**
   * Handle key up events
   * @param {KeyboardEvent} event - Key up event
   */
  onKeyUp(event) {
    const key = event.key.toLowerCase();
    this.keys[key] = false;
    
    // Emit event with key data
    this.events.emit('keyup', {
      key: key,
      code: event.code,
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey
    });
  }
  
  /**
   * Handle mouse wheel events
   * @param {WheelEvent} event - Wheel event
   */
  onWheel(event) {
    // Emit event with wheel data
    this.events.emit('wheel', {
      deltaY: event.deltaY,
      deltaX: event.deltaX
    });
  }
  
  /**
   * Handle window resize events
   */
  onResize() {
    // Emit resize event with window dimensions
    this.events.emit('resize', {
      width: window.innerWidth,
      height: window.innerHeight,
      aspect: window.innerWidth / window.innerHeight
    });
  }
  
  /**
   * Check if a key is currently pressed
   * @param {string} key - Key to check
   * @returns {boolean} True if key is pressed
   */
  isKeyPressed(key) {
    return !!this.keys[key.toLowerCase()];
  }
  
  /**
   * Get the current mouse position (normalized device coordinates)
   * @returns {THREE.Vector2} Normalized mouse position
   */
  getMousePosition() {
    return this.mouse.clone();
  }
  
  /**
   * Enable pointer lock for mouse control
   * @param {HTMLElement} element - DOM element to request pointer lock for
   */
  enablePointerLock(element) {
    if (!element) {
      this.logger.warn('No element provided for pointer lock');
      return;
    }
    
    // Request pointer lock
    element.requestPointerLock = element.requestPointerLock || 
                                element.mozRequestPointerLock ||
                                element.webkitRequestPointerLock;
    
    if (element.requestPointerLock) {
      element.requestPointerLock();
    }
    
    // Set up pointer lock change event
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === element;
      this.events.emit('pointerlockchange', { locked: this.pointerLocked });
    });
  }
  
  /**
   * Disable pointer lock
   */
  disablePointerLock() {
    document.exitPointerLock = document.exitPointerLock ||
                              document.mozExitPointerLock ||
                              document.webkitExitPointerLock;
    
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }
  
  /**
   * Clean up resources used by the input manager
   */
  dispose() {
    this.logger.info('Disposing input manager resources');
    
    // Remove event listeners
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    
    // Clear state
    this.keys = {};
    
    this.logger.info('Input manager resources disposed');
  }
}