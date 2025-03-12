// Create this as a new file: src/utils/FpsCounter.js

/**
 * Simple FPS counter that can be used anywhere
 */
export class FpsCounter {
    constructor() {
      this.fps = 0;
      this.frameCount = 0;
      this.lastTime = performance.now();
      
      // Create UI element
      this.createUi();
      
      // Start update loop
      this.update = this.update.bind(this);
      requestAnimationFrame(this.update);
    }
    
    createUi() {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '10px';
      container.style.right = '10px';
      container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      container.style.color = 'white';
      container.style.padding = '5px 10px';
      container.style.borderRadius = '5px';
      container.style.fontFamily = 'monospace';
      container.style.zIndex = '9999';
      
      this.fpsDisplay = document.createElement('div');
      this.fpsDisplay.textContent = 'FPS: 0';
      
      container.appendChild(this.fpsDisplay);
      document.body.appendChild(container);
    }
    
    update() {
      this.frameCount++;
      
      const now = performance.now();
      const elapsed = now - this.lastTime;
      
      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastTime = now;
        
        // Update display
        if (this.fpsDisplay) {
          this.fpsDisplay.textContent = `FPS: ${this.fps}`;
        }
      }
      
      requestAnimationFrame(this.update);
    }
  }