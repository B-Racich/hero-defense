import { Logger } from './Logger.js';

/**
 * Spatial grid for efficient spatial queries
 */
export class SpatialGrid {
  /**
   * @param {number} cellSize - Size of each grid cell
   */
  constructor(cellSize = 5) {
    this.logger = new Logger('SpatialGrid');
    this.cellSize = cellSize;
    this.grid = {};
    this.entities = new Map(); // Map entity to its current cell(s)
    
    this.logger.debug(`Created spatial grid with cellSize=${cellSize}`);
  }
  
  /**
   * Insert an entity into the grid
   * @param {Object} entity - Entity to insert
   * @param {Object} bounds - Entity bounds {minX, minY, minZ, maxX, maxY, maxZ}
   */
  insert(entity, bounds) {
    // Calculate grid cells covered by entity
    const cells = this.getCellsForBounds(bounds);
    
    // Store entity in each cell
    cells.forEach(cellKey => {
      if (!this.grid[cellKey]) {
        this.grid[cellKey] = new Set();
      }
      
      this.grid[cellKey].add(entity);
    });
    
    // Store cells this entity is in
    this.entities.set(entity, cells);
    
    this.logger.debug(`Inserted entity into ${cells.length} cells`);
  }
  
  /**
   * Update an entity's position in the grid
   * @param {Object} entity - Entity to update
   * @param {Object} bounds - New entity bounds
   */
  updateEntity(entity, bounds) {
    // Get old cells
    const oldCells = this.entities.get(entity) || [];
    
    // Calculate new cells
    const newCells = this.getCellsForBounds(bounds);
    
    // Determine which cells to remove from and which to add to
    const cellsToRemove = oldCells.filter(cell => !newCells.includes(cell));
    const cellsToAdd = newCells.filter(cell => !oldCells.includes(cell));
    
    // Remove from old cells
    cellsToRemove.forEach(cellKey => {
      if (this.grid[cellKey]) {
        this.grid[cellKey].delete(entity);
        
        // Clean up empty cells
        if (this.grid[cellKey].size === 0) {
          delete this.grid[cellKey];
        }
      }
    });
    
    // Add to new cells
    cellsToAdd.forEach(cellKey => {
      if (!this.grid[cellKey]) {
        this.grid[cellKey] = new Set();
      }
      
      this.grid[cellKey].add(entity);
    });
    
    // Update entity's cell list
    this.entities.set(entity, newCells);
  }
  
  /**
   * Remove an entity from the grid
   * @param {Object} entity - Entity to remove
   */
  remove(entity) {
    const cells = this.entities.get(entity) || [];
    
    // Remove from all cells
    cells.forEach(cellKey => {
      if (this.grid[cellKey]) {
        this.grid[cellKey].delete(entity);
        
        // Clean up empty cells
        if (this.grid[cellKey].size === 0) {
          delete this.grid[cellKey];
        }
      }
    });
    
    // Remove from entity tracking
    this.entities.delete(entity);
    
    this.logger.debug(`Removed entity from ${cells.length} cells`);
  }
  
  /**
   * Find all entities in a given region
   * @param {Object} bounds - Query bounds {minX, minY, minZ, maxX, maxY, maxZ}
   * @returns {Set} Set of entities in the region
   */
  query(bounds) {
    const cells = this.getCellsForBounds(bounds);
    const result = new Set();
    
    // Collect all entities from relevant cells
    cells.forEach(cellKey => {
      if (this.grid[cellKey]) {
        this.grid[cellKey].forEach(entity => {
          result.add(entity);
        });
      }
    });
    
    return result;
  }
  
  /**
   * Find all entities within a radius of a point
   * @param {Object} point - Center point {x, y, z}
   * @param {number} radius - Search radius
   * @returns {Set} Set of entities in the radius
   */
  queryRadius(point, radius) {
    // Create bounds for the radius
    const bounds = {
      minX: point.x - radius,
      minY: point.y - radius,
      minZ: point.z - radius,
      maxX: point.x + radius,
      maxY: point.y + radius,
      maxZ: point.z + radius
    };
    
    // First get all candidates from the grid cells
    const candidates = this.query(bounds);
    const result = new Set();
    
    // Then filter by actual distance
    const radiusSquared = radius * radius;
    candidates.forEach(entity => {
      // Assume entity has a .position property
      if (entity.position) {
        const dx = entity.position.x - point.x;
        const dy = entity.position.y - point.y;
        const dz = entity.position.z - point.z;
        const distSquared = dx * dx + dy * dy + dz * dz;
        
        if (distSquared <= radiusSquared) {
          result.add(entity);
        }
      }
    });
    
    return result;
  }
  
  /**
   * Get all grid cells that overlap with the given bounds
   * @param {Object} bounds - Bounds to check {minX, minY, minZ, maxX, maxY, maxZ}
   * @returns {Array<string>} Array of cell keys
   */
  getCellsForBounds(bounds) {
    const minCellX = Math.floor(bounds.minX / this.cellSize);
    const minCellY = Math.floor(bounds.minY / this.cellSize);
    const minCellZ = Math.floor(bounds.minZ / this.cellSize);
    
    const maxCellX = Math.floor(bounds.maxX / this.cellSize);
    const maxCellY = Math.floor(bounds.maxY / this.cellSize);
    const maxCellZ = Math.floor(bounds.maxZ / this.cellSize);
    
    const cells = [];
    
    // Collect all cell keys
    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        for (let z = minCellZ; z <= maxCellZ; z++) {
          cells.push(`${x},${y},${z}`);
        }
      }
    }
    
    return cells;
  }
  
  /**
   * Get all entities in the grid
   * @returns {Set} Set of all entities
   */
  getAllEntities() {
    return new Set(this.entities.keys());
  }
  
  /**
   * Clear the grid
   */
  clear() {
    this.grid = {};
    this.entities.clear();
    this.logger.debug('Cleared spatial grid');
  }
}