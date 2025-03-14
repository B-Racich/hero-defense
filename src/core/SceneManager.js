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
  // src/core/SceneManager.js - modify the initialize method around line 30
  // Update the initialize method in SceneManager.js
  initialize() {
    this.logger.info('Initializing scene manager');

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 40);

    // Create camera with better view of the game field
    this.camera = new THREE.PerspectiveCamera(
      60, // Wider field of view
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Position camera to see more of the play area
    this.camera.position.set(0, 12, 20);
    this.camera.lookAt(0, 0, 0);

    // Create renderer with performance optimizations
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });

    // Set renderer size to full window
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Set pixel ratio (cap at 1.5 to avoid performance issues on high-DPI displays)
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));

    // Configure shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;

    // Style renderer element
    this.renderer.domElement.style.position = 'fixed';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '0';

    // Store a reference to the game on the canvas for debugging
    this.renderer.domElement.__game__ = window.game;

    // Add renderer to DOM
    document.body.insertBefore(this.renderer.domElement, document.body.firstChild);

    // Set up lighting
    this.setupLighting();

    // Set up window resize event listener
    window.addEventListener('resize', this.handleResize);

    // Force immediate render
    this.renderer.render(this.scene, this.camera);
    this.logger.info('Initial render completed');

    this.logger.info('Scene manager initialized');

    // Make camera globally accessible for debugging
    window.gameCamera = this.camera;
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

  /**
 * Update frustum culling
 * Checks which objects are in camera view and toggles visibility
 */
  updateFrustumCulling() {
    if (!this.camera) return;
  
    // TEMPORARILY DISABLE FRUSTUM CULLING - FORCE ALL OBJECTS VISIBLE
    Object.keys(this.objects).forEach(category => {
      this.objects[category].forEach(object => {
        if (object) {
          object.visible = true;
        }
      });
    });
  
    // Original frustum culling code commented out for debugging
    /*
    // Create frustum from camera
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
  
    // Update projection matrix
    this.camera.updateMatrixWorld();
    projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
  
    frustum.setFromProjectionMatrix(projScreenMatrix);
  
    // Check objects against frustum
    Object.keys(this.objects).forEach(category => {
      this.objects[category].forEach(object => {
        // Skip objects without position
        if (!object.position) return;
  
        // Create bounding sphere for quick checking
        if (!object.boundingSphere) {
          // Estimate radius based on scale or size
          const radius = object.scale ?
            Math.max(object.scale.x, object.scale.y, object.scale.z) : 1;
          object.boundingSphere = new THREE.Sphere(
            object.position.clone(),
            radius
          );
        } else {
          // Update sphere position
          object.boundingSphere.center.copy(object.position);
        }
  
        // Update visibility based on frustum intersection
        const visible = frustum.intersectsSphere(object.boundingSphere);
  
        // Only update if visibility changed
        if (object.visible !== visible) {
          object.visible = visible;
        }
      });
    });
    */
  }
}