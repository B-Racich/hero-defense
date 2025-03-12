import { Game } from './core/Game.js';

// Entry point for the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize game when DOM is fully loaded
  const game = new Game();
  game.initialize();
});