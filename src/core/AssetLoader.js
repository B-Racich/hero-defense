import * as THREE from 'three';
import { Logger } from '../utils/Logger.js';

/**
 * Handles loading and caching of game assets
 */
export class AssetLoader {
  constructor() {
    this.logger = new Logger('AssetLoader');
    this.textureLoader = new THREE.TextureLoader();
    this.loadQueue = [];
    this.assets = {
      textures: {},
      geometries: {},
      materials: {},
      sounds: {},
      fonts: {}
    };
    
    this.ready = false;
  }
  
  /**
   * Queue an asset for loading
   * @param {string} id - Unique identifier for the asset
   * @param {string} url - URL or path to the asset
   * @param {string} type - Asset type (texture, geometry, material, sound, font)
   * @param {Object} options - Additional loading options
   */
  queueAsset(id, url, type, options = {}) {
    this.loadQueue.push({ id, url, type, options });
  }
  
  /**
   * Load all queued assets
   * @param {Function} progressCallback - Callback for loading progress (0.0 to 1.0)
   * @returns {Promise} Promise that resolves when all assets are loaded
   */
  async loadAll(progressCallback = null) {
    this.logger.info(`Loading ${this.loadQueue.length} assets`);
  
    if (this.loadQueue.length === 0) {
      this.logger.info('No assets to load');
      this.ready = true;
      
      // Call the progress callback with 100% completion
      if (progressCallback) {
        progressCallback(1);
      }
      
      return Promise.resolve();
    }
    
    const total = this.loadQueue.length;
    let loaded = 0;
    
    const promises = this.loadQueue.map(async (asset) => {
      try {
        const result = await this.loadAsset(asset);
        
        // Store asset in appropriate category
        if (asset.type === 'texture') {
          this.assets.textures[asset.id] = result;
        } else if (asset.type === 'geometry') {
          this.assets.geometries[asset.id] = result;
        } else if (asset.type === 'material') {
          this.assets.materials[asset.id] = result;
        } else if (asset.type === 'sound') {
          this.assets.sounds[asset.id] = result;
        } else if (asset.type === 'font') {
          this.assets.fonts[asset.id] = result;
        }
        
        // Update progress
        loaded++;
        if (progressCallback) {
          progressCallback(loaded / total);
        }
        
        return result;
      } catch (error) {
        this.logger.error(`Failed to load asset ${asset.id}:`, error);
        throw error;
      }
    });
    
    await Promise.all(promises);
    
    this.ready = true;
    this.logger.info('All assets loaded successfully');
  }
  
  /**
   * Load a single asset
   * @param {Object} asset - Asset configuration object
   * @returns {Promise} Promise that resolves with the loaded asset
   */
  loadAsset(asset) {
    this.logger.debug(`Loading asset: ${asset.id} (${asset.type})`);
    
    // Handle different asset types
    switch (asset.type) {
      case 'texture':
        return this.loadTexture(asset.url, asset.options);
        
      case 'geometry':
        // For this demo, we're just using basic geometries
        return Promise.resolve(this.createGeometry(asset.options));
        
      case 'material':
        return Promise.resolve(this.createMaterial(asset.options));
        
      case 'sound':
        // Not implemented in this version
        return Promise.resolve(null);
        
      case 'font':
        // Not implemented in this version
        return Promise.resolve(null);
        
      default:
        this.logger.warn(`Unknown asset type: ${asset.type}`);
        return Promise.resolve(null);
    }
  }
  
  /**
   * Load a texture
   * @param {string} url - URL or path to the texture
   * @param {Object} options - Loading options
   * @returns {Promise<THREE.Texture>} Promise that resolves with the loaded texture
   */
  loadTexture(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        texture => {
          // Apply options
          if (options.repeat) {
            texture.repeat.set(options.repeat.x, options.repeat.y);
          }
          if (options.offset) {
            texture.offset.set(options.offset.x, options.offset.y);
          }
          if (options.wrapS) {
            texture.wrapS = options.wrapS;
          }
          if (options.wrapT) {
            texture.wrapT = options.wrapT;
          }
          
          resolve(texture);
        },
        undefined,
        error => reject(error)
      );
    });
  }
  
  /**
   * Create a geometry based on options
   * @param {Object} options - Geometry configuration
   * @returns {THREE.BufferGeometry} Created geometry
   */
  createGeometry(options = {}) {
    const type = options.type || 'box';
    
    switch (type) {
      case 'box':
        return new THREE.BoxGeometry(
          options.width || 1,
          options.height || 1,
          options.depth || 1
        );
        
      case 'sphere':
        return new THREE.SphereGeometry(
          options.radius || 1,
          options.widthSegments || 32,
          options.heightSegments || 16
        );
        
      case 'cylinder':
        return new THREE.CylinderGeometry(
          options.radiusTop || 1,
          options.radiusBottom || 1,
          options.height || 1,
          options.radialSegments || 32
        );
        
      case 'cone':
        return new THREE.ConeGeometry(
          options.radius || 1,
          options.height || 1,
          options.radialSegments || 32
        );
        
      case 'plane':
        return new THREE.PlaneGeometry(
          options.width || 1,
          options.height || 1
        );
        
      default:
        this.logger.warn(`Unknown geometry type: ${type}, defaulting to box`);
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }
  
  /**
   * Create a material based on options
   * @param {Object} options - Material configuration
   * @returns {THREE.Material} Created material
   */
  createMaterial(options = {}) {
    const type = options.type || 'standard';
    
    switch (type) {
      case 'basic':
        return new THREE.MeshBasicMaterial({
          color: options.color || 0xffffff,
          wireframe: options.wireframe || false,
          transparent: options.transparent || false,
          opacity: options.opacity || 1.0,
          map: options.map || null
        });
        
      case 'standard':
        return new THREE.MeshStandardMaterial({
          color: options.color || 0xffffff,
          roughness: options.roughness !== undefined ? options.roughness : 0.5,
          metalness: options.metalness !== undefined ? options.metalness : 0.5,
          transparent: options.transparent || false,
          opacity: options.opacity || 1.0,
          map: options.map || null
        });
        
      case 'phong':
        return new THREE.MeshPhongMaterial({
          color: options.color || 0xffffff,
          shininess: options.shininess || 30,
          transparent: options.transparent || false,
          opacity: options.opacity || 1.0,
          map: options.map || null
        });
        
      case 'lambert':
        return new THREE.MeshLambertMaterial({
          color: options.color || 0xffffff,
          transparent: options.transparent || false,
          opacity: options.opacity || 1.0,
          map: options.map || null
        });
        
      default:
        this.logger.warn(`Unknown material type: ${type}, defaulting to standard`);
        return new THREE.MeshStandardMaterial({ color: 0xffffff });
    }
  }
  
  /**
   * Get a loaded asset by ID and type
   * @param {string} id - Asset identifier
   * @param {string} type - Asset type (texture, geometry, material, sound, font)
   * @returns {*} The loaded asset or null if not found
   */
  getAsset(id, type) {
    const collection = this.assets[type + 's']; // Add plural 's'
    
    if (!collection) {
      this.logger.warn(`Unknown asset type: ${type}`);
      return null;
    }
    
    const asset = collection[id];
    
    if (!asset) {
      this.logger.warn(`Asset not found: ${id} (${type})`);
      return null;
    }
    
    return asset;
  }
  
  /**
   * Check if all assets are loaded
   * @returns {boolean} True if all assets are loaded
   */
  isReady() {
    return this.ready;
  }
  
  /**
   * Create a canvas texture with text
   * @param {string} text - Text to render
   * @param {Object} options - Text rendering options
   * @returns {THREE.CanvasTexture} Created canvas texture
   */
  createTextTexture(text, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 256;
    canvas.height = options.height || 64;
    
    const ctx = canvas.getContext('2d');
    
    // Background
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Text
    ctx.font = options.font || 'bold 32px Arial';
    ctx.fillStyle = options.color || '#ffffff';
    ctx.textAlign = options.align || 'center';
    ctx.textBaseline = options.baseline || 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    return new THREE.CanvasTexture(canvas);
  }
  
  /**
   * Dispose of all loaded assets
   */
  dispose() {
    this.logger.info('Disposing asset loader resources');
    
    // Dispose of textures
    Object.values(this.assets.textures).forEach(texture => {
      texture.dispose();
    });
    
    // Dispose of geometries
    Object.values(this.assets.geometries).forEach(geometry => {
      geometry.dispose();
    });
    
    // Dispose of materials
    Object.values(this.assets.materials).forEach(material => {
      material.dispose();
    });
    
    // Clear collections
    this.assets.textures = {};
    this.assets.geometries = {};
    this.assets.materials = {};
    this.assets.sounds = {};
    this.assets.fonts = {};
    
    this.ready = false;
    
    this.logger.info('Asset loader resources disposed');
  }
}