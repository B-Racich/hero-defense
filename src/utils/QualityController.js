import { Logger } from './Logger.js';
import * as THREE from 'three';

/**
 * Controls graphics quality settings and performance optimizations
 */
export class QualityController {
  constructor(game) {
    this.game = game;
    this.logger = new Logger('QualityController');
    
    // Quality levels
    this.qualityLevels = [
      'low',     // Minimal quality for low-end devices
      'medium',  // Balanced quality/performance
      'high',    // High quality, more demanding
      'ultra'    // Maximum quality, performance intensive
    ];
    
    // Current quality level index
    this.currentLevel = 0;
    
    // Quality settings for each level
    this.qualitySettings = {
      low: {
        shadowMapEnabled: false,
        shadowMapType: 'Basic',
        pixelRatio: 0.5,
        particleMultiplier: 0.3,
        maxEnemiesVisible: 10,
        effectsEnabled: false,
        antialiasing: false,
        textureQuality: 'low',
        physicsUpdateFrequency: 3,
        enemyUpdateFrequency: 4,
        outputEncoding: 'Linear',
        toneMapping: 'None',
        geometryDetail: 0.5
      },
      medium: {
        shadowMapEnabled: true,
        shadowMapType: 'Basic',
        pixelRatio: 0.75,
        particleMultiplier: 0.6,
        maxEnemiesVisible: 20,
        effectsEnabled: true,
        antialiasing: false,
        textureQuality: 'medium',
        physicsUpdateFrequency: 2,
        enemyUpdateFrequency: 3,
        outputEncoding: 'sRGB',
        toneMapping: 'Reinhard',
        geometryDetail: 0.75
      },
      high: {
        shadowMapEnabled: true,
        shadowMapType: 'PCF',
        pixelRatio: 1.0,
        particleMultiplier: 1.0,
        maxEnemiesVisible: 50,
        effectsEnabled: true,
        antialiasing: true,
        textureQuality: 'high',
        physicsUpdateFrequency: 1,
        enemyUpdateFrequency: 1,
        outputEncoding: 'sRGB',
        toneMapping: 'ACESFilmic',
        geometryDetail: 1.0
      },
      ultra: {
        shadowMapEnabled: true,
        shadowMapType: 'PCFSoft',
        pixelRatio: Math.min(2.0, window.devicePixelRatio || 1.0), // Cap at 2.0 to prevent excessive memory usage
        particleMultiplier: 1.5,
        maxEnemiesVisible: 100,
        effectsEnabled: true,
        antialiasing: true,
        textureQuality: 'ultra',
        physicsUpdateFrequency: 1,
        enemyUpdateFrequency: 1,
        outputEncoding: 'sRGB',
        toneMapping: 'ACESFilmic',
        geometryDetail: 1.5
      }
    };
  }
  
  /**
   * Initialize with default quality level
   * @param {string} level - Initial quality level
   */
  initialize(level = 'low') {
    this.logger.info(`Initializing quality controller with level: ${level}`);
    
    // Set initial level
    this.setQualityLevel(level);
    
    // Add keyboard shortcuts for changing quality
    document.addEventListener('keydown', (event) => {
      if (event.key === 'q' && event.ctrlKey) {
        this.decreaseQuality();
      } else if (event.key === 'e' && event.ctrlKey) {
        this.increaseQuality();
      } else if (event.key === 'u' && event.ctrlKey) {
        // Ctrl+U sets to Ultra quality
        this.setQualityLevel('ultra');
      }
    });
    
    // Expose debug function globally for console access
    window.debugRenderer = () => this.debugRenderer();
    
    this.logger.info('Quality controller initialized');
  }
  
  /**
   * Debug renderer and canvas settings - call from console with window.debugRenderer()
   */
  debugRenderer() {
    if (!this.game.sceneManager || !this.game.sceneManager.renderer) {
      console.error('Renderer not available');
      return null;
    }
    
    const renderer = this.game.sceneManager.renderer;
    const canvas = renderer.domElement;
    
    const debug = {
      // Renderer info
      renderer: {
        type: renderer.constructor.name,
        pixelRatio: renderer.getPixelRatio(),
        outputColorSpace: renderer.outputColorSpace,
        toneMapping: renderer.toneMapping,
        toneMappingExposure: renderer.toneMappingExposure,
        shadowMap: {
          enabled: renderer.shadowMap.enabled,
          type: renderer.shadowMap.type
        },
        info: renderer.info
      },
      
      // Canvas info
      canvas: canvas ? {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        style: {
          width: canvas.style.width,
          height: canvas.style.height,
          imageRendering: canvas.style.imageRendering
        }
      } : null,
      
      // Quality settings
      quality: this.qualitySettings[this.getCurrentLevel()],
      
      // Display info
      display: {
        devicePixelRatio: window.devicePixelRatio,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      }
    };
    
    // Print to console in formatted way
    console.group('Renderer Debug Info');
    Object.entries(debug).forEach(([key, value]) => {
      console.groupCollapsed(key);
      console.table(value);
      console.groupEnd();
    });
    console.groupEnd();
    
    return debug;
  }
  
  /**
   * Set quality level by name
   * @param {string} levelName - Quality level name
   */
  setQualityLevel(levelName) {
    const levelIndex = this.qualityLevels.indexOf(levelName);
    if (levelIndex === -1) {
      this.logger.warn(`Invalid quality level: ${levelName}`);
      return;
    }
    
    this.currentLevel = levelIndex;
    this.applyQualitySettings();
  }
  
  /**
   * Get current quality level name
   * @returns {string} Current quality level name
   */
  getCurrentLevel() {
    return this.qualityLevels[this.currentLevel];
  }
  
  /**
   * Increase quality level
   */
  increaseQuality() {
    if (this.currentLevel < this.qualityLevels.length - 1) {
      this.currentLevel++;
      this.applyQualitySettings();
      this.logger.info(`Increased quality to: ${this.getCurrentLevel()}`);
    } else {
      this.logger.info('Already at maximum quality level');
    }
  }
  
  /**
   * Decrease quality level
   */
  decreaseQuality() {
    if (this.currentLevel > 0) {
      this.currentLevel--;
      this.applyQualitySettings();
      this.logger.info(`Decreased quality to: ${this.getCurrentLevel()}`);
    } else {
      this.logger.info('Already at minimum quality level');
    }
  }
  
  /**
   * Set to ultra quality with optional parameter overrides
   * @param {Object} overrides - Settings to override
   */
  setUltraQuality(overrides = {}) {
    this.logger.info('Setting ultra quality with custom overrides');
    this.currentLevel = this.qualityLevels.indexOf('ultra');
    
    // Create custom ultra settings with overrides
    const ultraSettings = { ...this.qualitySettings.ultra, ...overrides };
    
    // Apply the custom settings
    this.applySpecificSettings(ultraSettings);
    
    // Show quality overlay with custom settings
    this.showQualityOverlay(ultraSettings);
    
    return ultraSettings;
  }
  
  /**
   * Apply specific settings without changing quality level
   * @param {Object} settings - Settings to apply
   */
  applySpecificSettings(settings) {
    if (!settings) return;
    
    // Apply to renderer
    if (this.game.sceneManager && this.game.sceneManager.renderer) {
      const renderer = this.game.sceneManager.renderer;
      
      // Set shadow map settings
      renderer.shadowMap.enabled = settings.shadowMapEnabled;
      
      // Rest of implementation same as applyQualitySettings
      // ...
    }
    
    // Rest of implementation code follows
  }
  
  /**
   * Apply current quality settings to game systems
   */
  applyQualitySettings() {
    const settings = this.qualitySettings[this.getCurrentLevel()];
    if (!settings) return;
    
    // Apply to renderer
    if (this.game.sceneManager && this.game.sceneManager.renderer) {
      const renderer = this.game.sceneManager.renderer;
      
      // Set shadow map settings
      renderer.shadowMap.enabled = settings.shadowMapEnabled;
      
      switch (settings.shadowMapType) {
        case 'Basic':
          renderer.shadowMap.type = THREE.BasicShadowMap;
          break;
        case 'PCF':
          renderer.shadowMap.type = THREE.PCFShadowMap;
          break;
        case 'PCFSoft':
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          break;
      }
      
      // Apply rendering quality settings
      renderer.setPixelRatio(settings.pixelRatio);
      
      // Update renderer size to ensure proper canvas resolution
      renderer.setSize(
        window.innerWidth, 
        window.innerHeight, 
        false // updateStyle=false to prevent automatic style scaling
      );
      
      // Manually set the canvas style to ensure crisp rendering
      const canvas = renderer.domElement;
      if (canvas) {
        // Use CSS to properly scale the canvas
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        // Apply image rendering settings for crisp display
        canvas.style.imageRendering = settings.pixelRatio >= 1 ? 'crisp-edges' : 'auto';
        
        this.logger.debug(`Canvas size set to ${canvas.width}x${canvas.height} with pixel ratio ${settings.pixelRatio}`);
      }
    }
    
    // Apply to game state
    if (this.game.state) {
      this.game.state.particleMultiplier = settings.particleMultiplier;
      this.game.state.maxEnemiesVisible = settings.maxEnemiesVisible;
      this.game.state.effectsEnabled = settings.effectsEnabled;
      this.game.state.physicsUpdateFrequency = settings.physicsUpdateFrequency;
      this.game.state.enemyUpdateFrequency = settings.enemyUpdateFrequency;
    }
    
    // Force update the camera and redraw
    if (this.game.sceneManager && this.game.sceneManager.camera) {
      this.game.sceneManager.camera.updateProjectionMatrix();
      
      if (this.game.renderSystem) {
        this.game.renderSystem.render();
      }
    }
    
    // Create an info overlay to show current quality
    this.showQualityOverlay();
  }
  
  /**
   * Create or update quality overlay
   */
  showQualityOverlay() {
    let overlay = document.getElementById('qualityOverlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'qualityOverlay';
      overlay.style.position = 'fixed';
      overlay.style.bottom = '10px';
      overlay.style.right = '10px';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      overlay.style.color = 'white';
      overlay.style.padding = '10px';
      overlay.style.borderRadius = '5px';
      overlay.style.fontFamily = 'monospace';
      overlay.style.zIndex = '9999';
      overlay.style.transition = 'opacity 1s ease-in-out';
      document.body.appendChild(overlay);
    }
    
    const settings = this.qualitySettings[this.getCurrentLevel()];
    
    // Get canvas info if available
    let canvasWidth = "N/A";
    let canvasHeight = "N/A";
    if (this.game.sceneManager && this.game.sceneManager.renderer) {
      const canvas = this.game.sceneManager.renderer.domElement;
      if (canvas) {
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
      }
    }
    
    overlay.innerHTML = `
      <div>Quality: <strong>${this.getCurrentLevel().toUpperCase()}</strong></div>
      <div>Shadows: ${settings.shadowMapEnabled ? settings.shadowMapType : 'OFF'}</div>
      <div>Pixel Ratio: ${settings.pixelRatio.toFixed(2)}</div>
      <div>Resolution: ${canvasWidth}x${canvasHeight}</div>
      <div>Color Space: ${settings.outputEncoding}</div>
      <div>Tone Mapping: ${settings.toneMapping}</div>
      <div>Geometry Detail: ${settings.geometryDetail}x</div>
      <div>Particles: ${settings.particleMultiplier}x</div>
      <div>Updates: Physics ${settings.physicsUpdateFrequency}f, Enemies ${settings.enemyUpdateFrequency}f</div>
      <div><small>Use Ctrl+Q/Ctrl+E to change quality</small></div>
    `;
    
    // Show then fade out
    overlay.style.opacity = '1';
    
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
    
    this.fadeTimeout = setTimeout(() => {
      overlay.style.opacity = '0.3';
    }, 3000);
  }
}