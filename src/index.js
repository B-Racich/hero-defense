import { Game } from './core/Game.js';
import './styles.css';  // Import CSS from src directory

// Entry point for the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize game when DOM is fully loaded
  const game = new Game();
  try {
    game.initialize();
    console.log('Game initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});