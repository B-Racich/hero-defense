import * as THREE from 'three';
import { Logger } from '../../utils/Logger.js';

/**
 * Handles scene rendering and visual effects
 */
export class RenderSystem {
  /**
   * @param {SceneManager} sceneManager - Reference to the scene manager
   */
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.logger = new Logger('RenderSystem');
    
    // Scene references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Post-processing effects
    this.composer = null;
    
    // Performance stats
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;
    
    this.logger.debug('Render system created');
  }
  
  /**
   * Initialize the rendering system
   */
  initialize() {
    this.logger.info('Initializing render system');
    
    // Get references from scene manager
    this.scene = this.sceneManager.scene;
    this.camera = this.sceneManager.camera;
    this.renderer = this.sceneManager.renderer;
    
    if (!this.scene || !this.camera || !this.renderer) {
      this.logger.error('Cannot initialize RenderSystem: Missing scene components');
      return;
    }
    
    // Configure renderer
    this.configureRenderer();
    
    // Add environmental elements
    this.createEnvironment();
    
    this.logger.info('Render system initialized');
  }
  
  /**
   * Configure the renderer with optimal settings
   */
  configureRenderer() {
    // Set renderer pixel ratio to device pixel ratio
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    // Enable shadow mapping
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Set tone mapping for better lighting
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Set output color space
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  
  /**
   * Create environment elements (ground, skybox, etc.)
   */
  createEnvironment() {
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    
    this.sceneManager.addToScene(ground, 'environment');
    
    // Create path
    this.createPath();
    
    // Create ambient lighting
    this.createLighting();
  }
  
  /**
   * Create the game path from start to end
   */
  createPath() {
    // Main path
    const pathGeometry = new THREE.PlaneGeometry(5, 30);
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const path = new THREE.Mesh(pathGeometry, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 0); // Slightly above ground to prevent z-fighting
    path.receiveShadow = true;
    
    this.sceneManager.addToScene(path, 'environment');
    
    // Path edges
    const edgeGeometry = new THREE.BoxGeometry(0.3, 0.1, 30);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.5
    });
    
    // Left edge
    const leftEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    leftEdge.position.set(-2.65, 0.05, 0);
    leftEdge.receiveShadow = true;
    leftEdge.castShadow = true;
    
    // Right edge
    const rightEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    rightEdge.position.set(2.65, 0.05, 0);
    rightEdge.receiveShadow = true;
    rightEdge.castShadow = true;
    
    this.sceneManager.addToScene(leftEdge, 'environment');
    this.sceneManager.addToScene(rightEdge, 'environment');
    
    // Path markings
    const markerGeometry = new THREE.PlaneGeometry(0.5, 1);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
      metalness: 0.0
    });
    
    // Create markers along path
    for (let z = -12; z <= 12; z += 4) {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(0, 0.02, z);
      marker.receiveShadow = true;
      
      this.sceneManager.addToScene(marker, 'environment');
    }
    
    // Start area
    const startGeometry = new THREE.CircleGeometry(2.5, 32);
    const startMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3
    });
    
    const startArea = new THREE.Mesh(startGeometry, startMaterial);
    startArea.rotation.x = -Math.PI / 2;
    startArea.position.set(0, 0.02, -12);
    startArea.receiveShadow = true;
    
    this.sceneManager.addToScene(startArea, 'environment');
    
    // End area
    const endGeometry = new THREE.CircleGeometry(2.5, 32);
    const endMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3
    });
    
    const endArea = new THREE.Mesh(endGeometry, endMaterial);
    endArea.rotation.x = -Math.PI / 2;
    endArea.position.set(0, 0.02, 12);
    endArea.receiveShadow = true;
    
    this.sceneManager.addToScene(endArea, 'environment');
  }
  
  /**
   * Create scene lighting
   */
  createLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.sceneManager.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 15, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.bias = -0.0005;
    
    this.sceneManager.scene.add(directionalLight);
    
    // Add a helper for the directional light (useful for debugging)
    // const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // this.sceneManager.scene.add(helper);
    
    // Add hemisphere light for better ambient lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x505050, 0.6);
    this.sceneManager.scene.add(hemisphereLight);
    
    // Add a point light at the hero position for better visibility
    const heroLight = new THREE.PointLight(0xffffff, 0.5, 10);
    heroLight.position.set(0, 5, 8);
    heroLight.castShadow = true;
    
    // Configure hero light shadow properties
    heroLight.shadow.mapSize.width = 512;
    heroLight.shadow.mapSize.height = 512;
    heroLight.shadow.camera.near = 0.5;
    heroLight.shadow.camera.far = 10;
    
    this.sceneManager.scene.add(heroLight);
  }
  
  /**
   * Create a floor grid
   * @param {number} size - Grid size
   * @param {number} divisions - Number of divisions
   */
  createGrid(size = 50, divisions = 50) {
    const grid = new THREE.GridHelper(size, divisions, 0x808080, 0x404040);
    grid.position.y = 0.01; // Slightly above ground to prevent z-fighting
    this.sceneManager.addToScene(grid, 'environment');
  }
  
  /**
   * Create particle system for various effects
   * @param {Object} options - Particle system options
   * @returns {THREE.Points} Particle system
   */
  createParticleSystem(options = {}) {
    const count = options.count || 100;
    const size = options.size || 0.1;
    const color = options.color || 0xffffff;
    const opacity = options.opacity || 1.0;
    
    // Create geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    
    // Random initial positions
    for (let i = 0; i < count * 3; i += 3) {
      const radius = options.radius || 1;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * (options.height || 2);
      
      positions[i] = Math.sin(angle) * radius;
      positions[i + 1] = height;
      positions[i + 2] = Math.cos(angle) * radius;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material
    const material = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: opacity,
      map: options.texture || null,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Create particle system
    const particles = new THREE.Points(geometry, material);
    
    // Add to scene if specified
    if (options.addToScene) {
      this.sceneManager.addToScene(particles, options.category || 'effects');
    }
    
    return particles;
  }
  
  /**
   * Create a spotlight effect
   * @param {THREE.Vector3} position - Light position
   * @param {THREE.Vector3} target - Light target position
   * @param {number} intensity - Light intensity
   * @param {number} color - Light color
   * @returns {THREE.SpotLight} Created spotlight
   */
  createSpotlight(position, target, intensity = 1, color = 0xffffff) {
    const spotlight = new THREE.SpotLight(color, intensity, 10, Math.PI / 4, 0.5, 1);
    spotlight.position.copy(position);
    spotlight.castShadow = true;
    
    // Create target
    const targetObj = new THREE.Object3D();
    targetObj.position.copy(target);
    spotlight.target = targetObj;
    
    this.sceneManager.scene.add(targetObj);
    this.sceneManager.addToScene(spotlight, 'effects');
    
    return spotlight;
  }
  
  /**
   * Create a lens flare effect
   * @param {THREE.Vector3} position - Lens flare position
   * @param {number} size - Lens flare size
   * @param {number} color - Lens flare color
   */
  createLensFlare(position, size = 1, color = 0xffffff) {
    // Create a sprite for the lens flare
    const textureLoader = new THREE.TextureLoader();
    const flareTexture = textureLoader.load('textures/lensflare.png');
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: flareTexture,
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(size, size, 1.0);
    
    this.sceneManager.addToScene(sprite, 'effects');
    
    return sprite;
  }
  
  /**
   * Render the scene
   */
  render() {
    if (!this.renderer || !this.scene || !this.camera) {
      this.logger.error('Cannot render: Missing required components');
      return;
    }
    
    // Diagnostic logging
    if (this.frameCount % 100 === 0) {
      this.logger.debug(`Scene contains ${this.scene.children.length} objects`);
      
      // Check if renderer canvas is in DOM
      if (!document.body.contains(this.renderer.domElement)) {
        this.logger.error('Renderer canvas not in DOM!');
        document.body.insertBefore(this.renderer.domElement, document.body.firstChild);
      }
    }
    
    // Ensure background color is set
    this.scene.background = new THREE.Color(0x87ceeb);
    
    // Render scene
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.logger.error('Error during rendering:', error);
    }
    
    // Update FPS counter
    this.updateFps();
  }
  
  /**
   * Update FPS counter
   */
  updateFps() {
    this.frameCount++;
    
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;
    
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      
      // Optionally display FPS
      // console.log(`FPS: ${this.fps}`);
    }
  }
  
  /**
   * Update camera position and target
   * @param {THREE.Vector3} position - Camera position
   * @param {THREE.Vector3} target - Camera target
   */
  updateCamera(position, target) {
    if (!this.camera) return;
    
    // Update position
    if (position) {
      this.camera.position.copy(position);
    }
    
    // Update target
    if (target) {
      this.camera.lookAt(target);
    }
  }
  
  /**
   * Resize renderer when window size changes
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    if (!this.renderer || !this.camera) return;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.logger.info('Disposing render system resources');
    
    // Disposal logic for any created resources
  }
}