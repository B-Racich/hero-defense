import * as THREE from 'three';
import { Logger } from './Logger.js';

/**
 * Geometry pool for reusing geometries across objects
 */
export class GeometryPool {
  constructor() {
    this.logger = new Logger('GeometryPool');
    this.geometries = {
      box: {},
      sphere: {},
      cylinder: {},
      plane: {},
      cone: {},
      tetrahedron: {}
    };
  }
  
  /**
   * Get or create a box geometry
   * @param {number} width - Box width
   * @param {number} height - Box height
   * @param {number} depth - Box depth
   * @returns {THREE.BoxGeometry} The geometry
   */
  getBoxGeometry(width = 1, height = 1, depth = 1) {
    const key = `${width.toFixed(2)}_${height.toFixed(2)}_${depth.toFixed(2)}`;
    
    if (!this.geometries.box[key]) {
      this.geometries.box[key] = new THREE.BoxGeometry(width, height, depth);
    }
    
    return this.geometries.box[key];
  }
  
  /**
   * Get or create a sphere geometry
   * @param {number} radius - Sphere radius
   * @param {number} widthSegments - Width segments
   * @param {number} heightSegments - Height segments
   * @returns {THREE.SphereGeometry} The geometry
   */
  getSphereGeometry(radius = 1, widthSegments = 8, heightSegments = 8) {
    const key = `${radius.toFixed(2)}_${widthSegments}_${heightSegments}`;
    
    if (!this.geometries.sphere[key]) {
      this.geometries.sphere[key] = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    }
    
    return this.geometries.sphere[key];
  }
  
  /**
   * Get or create a cylinder geometry
   * @param {number} radiusTop - Top radius
   * @param {number} radiusBottom - Bottom radius
   * @param {number} height - Cylinder height
   * @param {number} radialSegments - Radial segments
   * @returns {THREE.CylinderGeometry} The geometry
   */
  getCylinderGeometry(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 8) {
    const key = `${radiusTop.toFixed(2)}_${radiusBottom.toFixed(2)}_${height.toFixed(2)}_${radialSegments}`;
    
    if (!this.geometries.cylinder[key]) {
      this.geometries.cylinder[key] = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    }
    
    return this.geometries.cylinder[key];
  }
  
  /**
   * Get or create a plane geometry
   * @param {number} width - Plane width
   * @param {number} height - Plane height
   * @returns {THREE.PlaneGeometry} The geometry
   */
  getPlaneGeometry(width = 1, height = 1) {
    const key = `${width.toFixed(2)}_${height.toFixed(2)}`;
    
    if (!this.geometries.plane[key]) {
      this.geometries.plane[key] = new THREE.PlaneGeometry(width, height);
    }
    
    return this.geometries.plane[key];
  }
  
  /**
   * Get or create a cone geometry
   * @param {number} radius - Cone radius
   * @param {number} height - Cone height
   * @param {number} radialSegments - Radial segments
   * @returns {THREE.ConeGeometry} The geometry
   */
  getConeGeometry(radius = 1, height = 1, radialSegments = 8) {
    const key = `${radius.toFixed(2)}_${height.toFixed(2)}_${radialSegments}`;
    
    if (!this.geometries.cone[key]) {
      this.geometries.cone[key] = new THREE.ConeGeometry(radius, height, radialSegments);
    }
    
    return this.geometries.cone[key];
  }
  
  /**
   * Get or create a tetrahedron geometry
   * @param {number} radius - Tetrahedron radius
   * @returns {THREE.TetrahedronGeometry} The geometry
   */
  getTetrahedronGeometry(radius = 1) {
    const key = radius.toFixed(2);
    
    if (!this.geometries.tetrahedron[key]) {
      this.geometries.tetrahedron[key] = new THREE.TetrahedronGeometry(radius);
    }
    
    return this.geometries.tetrahedron[key];
  }
  
  /**
   * Dispose of all geometries
   */
  dispose() {
    // Dispose all geometry types
    Object.keys(this.geometries).forEach(type => {
      Object.values(this.geometries[type]).forEach(geometry => {
        geometry.dispose();
      });
      this.geometries[type] = {};
    });
  }
}