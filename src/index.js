// In src/index.js, add:

import { Game } from './core/Game.js';
import { FpsCounter } from './utils/FpsCounter.js';
import './styles.css';  // Import CSS from src directory

// Entry point for the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize FPS counter
  const fpsCounter = new FpsCounter();
  
  // Initialize game when DOM is fully loaded
  const game = new Game();
  try {
    game.initialize();
    console.log('Game initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});