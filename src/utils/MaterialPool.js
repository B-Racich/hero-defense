import * as THREE from 'three';
import { Logger } from './Logger.js';

/**
 * Material pool for reusing materials across objects
 */
export class MaterialPool {
  constructor() {
    this.logger = new Logger('MaterialPool');
    this.materials = {
      basic: {},
      standard: {},
      phong: {}
    };
  }
  
  /**
   * Get or create a basic material
   * @param {number} color - Material color
   * @param {boolean} transparent - Whether material is transparent
   * @returns {THREE.MeshBasicMaterial} The material
   */
  getBasicMaterial(color, transparent = false) {
    const key = `${color}_${transparent ? 'transparent' : 'opaque'}`;
    
    if (!this.materials.basic[key]) {
      this.materials.basic[key] = new THREE.MeshBasicMaterial({
        color: color,
        transparent: transparent,
        opacity: transparent ? 0.8 : 1.0
      });
    }
    
    return this.materials.basic[key];
  }
  
  /**
   * Get or create a standard material
   * @param {number} color - Material color
   * @param {number} metalness - Material metalness
   * @param {number} roughness - Material roughness
   * @returns {THREE.MeshStandardMaterial} The material
   */
  getStandardMaterial(color, metalness = 0.5, roughness = 0.5) {
    const key = `${color}_${metalness.toFixed(1)}_${roughness.toFixed(1)}`;
    
    if (!this.materials.standard[key]) {
      this.materials.standard[key] = new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness
      });
    }
    
    return this.materials.standard[key];
  }
  
  /**
   * Get or create a phong material
   * @param {number} color - Material color
   * @returns {THREE.MeshPhongMaterial} The material
   */
  getPhongMaterial(color) {
    if (!this.materials.phong[color]) {
      this.materials.phong[color] = new THREE.MeshPhongMaterial({
        color: color
      });
    }
    
    return this.materials.phong[color];
  }
  
  /**
   * Dispose of all materials
   */
  dispose() {
    // Dispose basic materials
    Object.values(this.materials.basic).forEach(material => {
      material.dispose();
    });
    
    // Dispose standard materials
    Object.values(this.materials.standard).forEach(material => {
      material.dispose();
    });
    
    // Dispose phong materials
    Object.values(this.materials.phong).forEach(material => {
      material.dispose();
    });
    
    this.materials = {
      basic: {},
      standard: {},
      phong: {}
    };
  }
}