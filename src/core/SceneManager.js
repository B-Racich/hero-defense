import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

/**
 * Manages the 3D scene, camera, and renderer
 */
export class SceneManager {
  constructor() {
    this.logger = new Logger('SceneManager');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Collections for tracking objects
    this.objects = {
      heroes: [],
      enemies: [],
      environment: [],
      effects: []
    };
    
    // Bind methods to maintain context
    this.handleResize = this.handleResize.bind(this);
  }
  
  /**
   * Initialize scene, camera, and renderer
   */
  initialize() {
    this.logger.info('Initializing scene manager');
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 40);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to DOM
    document.body.appendChild(this.renderer.domElement);
    
    // Set up lighting
    this.setupLighting();
    
    // Set up window resize event listener
    window.addEventListener('resize', this.handleResize);
    
    this.logger.info('Scene manager initialized');
  }
  
  /**
   * Set up scene lighting
   */
  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    
    this.scene.add(directionalLight);
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * Add object to scene and track it by category
   * @param {THREE.Object3D} object - The object to add
   * @param {string} category - Category to organize objects (heroes, enemies, environment, effects)
   * @returns {THREE.Object3D} The added object
   */
  addToScene(object, category = 'environment') {
    if (!object) {
      this.logger.warn('Attempted to add null object to scene');
      return null;
    }
    
    this.scene.add(object);
    
    // Track object in appropriate category
    if (this.objects[category]) {
      this.objects[category].push(object);
    } else {
      this.logger.warn(`Unknown category: ${category}, defaulting to 'environment'`);
      this.objects.environment.push(object);
    }
    
    return object;
  }
  
  /**
   * Remove object from scene and tracking
   * @param {THREE.Object3D} object - The object to remove
   * @returns {boolean} True if object was found and removed
   */
  removeFromScene(object) {
    if (!object) {
      this.logger.warn('Attempted to remove null object from scene');
      return false;
    }
    
    this.scene.remove(object);
    
    // Remove from tracking
    let found = false;
    Object.keys(this.objects).forEach(category => {
      const index = this.objects[category].indexOf(object);
      if (index !== -1) {
        this.objects[category].splice(index, 1);
        found = true;
      }
    });
    
    return found;
  }
  
  /**
   * Create a raycaster for mouse picking
   * @param {THREE.Vector2} mouseCoords - Normalized mouse coordinates (-1 to 1)
   * @returns {THREE.Raycaster} The configured raycaster
   */
  createRaycaster(mouseCoords) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseCoords, this.camera);
    return raycaster;
  }
  
  /**
   * Clear all objects in a specific category
   * @param {string} category - Category to clear (heroes, enemies, environment, effects)
   */
  clearCategory(category) {
    if (!this.objects[category]) {
      this.logger.warn(`Unknown category: ${category}`);
      return;
    }
    
    // Remove all objects in category from scene
    this.objects[category].forEach(object => {
      this.scene.remove(object);
    });
    
    // Clear array
    this.objects[category] = [];
  }
  
  /**
   * Clean up resources used by the scene manager
   */
  dispose() {
    this.logger.info('Disposing scene manager resources');
    
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize);
    
    // Remove renderer from DOM
    if (this.renderer && this.renderer.domElement) {
      document.body.removeChild(this.renderer.domElement);
    }
    
    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Clear all objects
    Object.keys(this.objects).forEach(category => {
      this.clearCategory(category);
    });
    
    this.logger.info('Scene manager resources disposed');
  }
}