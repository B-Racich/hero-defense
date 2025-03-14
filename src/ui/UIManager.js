import { Logger } from '../utils/Logger.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import * as THREE from 'three';

/**
 * Manages game UI elements and interactions
 */
export class UIManager {
  /**
   * @param {Game} game - Reference to the main game instance
   */
  constructor(game) {
    this.game = game;
    this.logger = new Logger('UIManager');
    this.events = new EventEmitter();

    // UI elements cache
    this.elements = {};

    // UI state
    this.activePanel = null;
    this.floatingTexts = [];

    // Bind methods to maintain context
    this.showPanel = this.showPanel.bind(this);
    this.hidePanel = this.hidePanel.bind(this);

    this.logger.info('UI manager created');
  }

  // Add after the constructor in NetworkManager.js
  debugEntities() {
    console.log("--- DEBUG ENTITIES ---");
    console.log(`Hero exists: ${!!this.game.state.hero}`);
    if (this.game.state.hero && this.game.state.hero.mesh) {
      console.log(`Hero mesh exists: ${!!this.game.state.hero.mesh}`);
      console.log(`Hero position: ${JSON.stringify(this.game.state.hero.position)}`);
      console.log(`Hero in scene: ${this.game.sceneManager.scene.children.includes(this.game.state.hero.mesh)}`);
    }

    console.log(`Enemies count: ${this.game.state.enemies.length}`);
    this.game.state.enemies.forEach((enemy, i) => {
      console.log(`Enemy ${i} mesh exists: ${!!enemy.mesh}`);
      if (enemy.mesh) {
        console.log(`Enemy ${i} in scene: ${this.game.sceneManager.scene.children.includes(enemy.mesh)}`);
      }
    });

    console.log(`Scene total children: ${this.game.sceneManager.scene.children.length}`);
  }

  /**
   * Initialize UI manager
   */
  initialize() {
    this.logger.info('Initializing UI manager');

    // Cache frequently used UI elements
    this.cacheElements();

    // Set up event listeners
    this.setupEventListeners();

    // Hide game UI initially
    this.hideGameUI();

    this.logger.info('UI manager initialized');

    // Explicitly force the loading screen to be hidden
    this.hideLoadingScreen();

    // Show multiplayer panel with a small delay to ensure DOM is ready
    setTimeout(() => {
      this.showMultiplayerPanel();
      this.logger.info('Multiplayer panel should now be visible');
    }, 100);

    // Add debug button
    const debugButton = document.createElement('button');
    debugButton.textContent = "Debug Entities";
    debugButton.style.position = 'fixed';
    debugButton.style.bottom = '10px';
    debugButton.style.left = '50%';
    debugButton.style.transform = 'translateX(-50%)';
    debugButton.style.zIndex = '9999';
    debugButton.style.padding = '8px 16px';
    debugButton.style.backgroundColor = '#ff0000';
    debugButton.style.color = 'white';
    debugButton.style.border = 'none';
    debugButton.style.borderRadius = '4px';
    debugButton.style.cursor = 'pointer';

    debugButton.addEventListener('click', () => {
      if (this.game) {
        this.game.debugEntities();

        // Force visibility of all entities
        if (this.game.sceneManager) {
          Object.keys(this.game.sceneManager.objects).forEach(category => {
            this.game.sceneManager.objects[category].forEach(obj => {
              if (obj) obj.visible = true;
            });
          });
        }
      }
    });

    document.body.appendChild(debugButton);
  }

  /**
   * Cache DOM elements for faster access
   */
  cacheElements() {
    // Loading screen elements
    this.elements.loadingScreen = document.getElementById('loadingScreen');
    this.elements.loadingBar = document.getElementById('loadingBar');
    this.elements.loadingText = document.getElementById('loadingText');

    // Game container
    this.elements.gameContainer = document.getElementById('gameContainer');

    // Hero selection
    this.elements.heroSelection = document.getElementById('heroSelection');
    if (!this.elements.heroSelection) {
      this.elements.heroSelection = this.createHeroSelectionPanel();
    }

    // Game UI panels
    this.elements.gameInfo = document.getElementById('gameInfo');
    if (!this.elements.gameInfo) {
      this.elements.gameInfo = this.createGameInfoPanel();
    }

    this.elements.upgradePanel = document.getElementById('upgradePanel');
    if (!this.elements.upgradePanel) {
      this.elements.upgradePanel = this.createUpgradePanel();
    }

    this.elements.abilityBar = document.getElementById('abilityBar');
    if (!this.elements.abilityBar) {
      this.elements.abilityBar = this.createAbilityBar();
    }

    // Multiplayer UI
    this.elements.playerList = document.getElementById('playerList');
    if (!this.elements.playerList) {
      this.elements.playerList = this.createPlayerListPanel();
    }

    this.elements.chatContainer = document.getElementById('chatContainer');
    if (!this.elements.chatContainer) {
      this.elements.chatContainer = this.createChatPanel();
    }

    // Multiplayer join/create panel
    this.elements.multiplayerPanel = document.getElementById('multiplayerPanel');
    if (!this.elements.multiplayerPanel) {
      this.elements.multiplayerPanel = this.createSimplifiedMultiplayerPanel();
    }

    // Wave info
    this.elements.waveInfo = document.getElementById('waveInfo');
    if (!this.elements.waveInfo) {
      this.elements.waveInfo = this.createWaveInfoPanel();
    }

    // Game over panel
    this.elements.gameOverPanel = document.getElementById('gameOverPanel');
    if (!this.elements.gameOverPanel) {
      this.elements.gameOverPanel = this.createGameOverPanel();
    }

    // Log the status of important elements
    this.logger.debug(`Loading screen element exists: ${!!this.elements.loadingScreen}`);
    this.logger.debug(`Multiplayer panel element exists: ${!!this.elements.multiplayerPanel}`);
  }

  /**
   * Explicitly hide the loading screen
   * This is a new method
   */
  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.logger.info('Explicitly hiding loading screen');
      this.elements.loadingScreen.style.opacity = '0';
      this.elements.loadingScreen.style.display = 'none';
    } else {
      this.logger.warn('Loading screen element not found when trying to hide');
      // Try to find it directly in the document
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.display = 'none';
        this.elements.loadingScreen = loadingScreen;
        this.logger.info('Found and hid loading screen directly');
      }
    }
  }

  /**
   * Set up UI event listeners
   */
  setupEventListeners() {
    // Listen for chat messages from other players
    if (this.game.networkManager && this.game.networkManager.events) {
      this.game.networkManager.events.on('chatReceived', data => {
        this.addChatMessage(data.playerId, data.message);
      });
    }

    // Hero selection
    if (this.elements.heroSelection) {
      const heroOptions = this.elements.heroSelection.querySelectorAll('.heroOption');
      heroOptions.forEach(option => {
        option.addEventListener('click', () => {
          // Deselect all options
          heroOptions.forEach(opt => opt.classList.remove('selected'));

          // Select clicked option
          option.classList.add('selected');

          // Enable start button
          const startButton = this.elements.heroSelection.querySelector('.startButton');
          if (startButton) {
            startButton.disabled = false;
          }
        });
      });

      // Start button
      const startButton = this.elements.heroSelection.querySelector('.startButton');
      if (startButton) {
        startButton.addEventListener('click', () => {
          const selectedHero = this.elements.heroSelection.querySelector('.heroOption.selected');
          if (selectedHero) {
            const heroClass = selectedHero.getAttribute('data-class');
            this.game.startGame(heroClass);
          }
        });
      }
    }

    // Ability bar
    if (this.elements.abilityBar) {
      const abilitySlots = this.elements.abilityBar.querySelectorAll('.abilitySlot');
      abilitySlots.forEach((slot, index) => {
        slot.addEventListener('click', () => {
          if (this.game.state.hero) {
            this.game.state.hero.useAbility(index);
          }
        });
      });
    }

    // Upgrade buttons
    if (this.elements.upgradePanel) {
      // Upgrade buttons are dynamically created and updated, 
      // so we'll handle their events when they're created
    }

    // Chat input
    if (this.elements.chatContainer) {
      const chatInput = this.elements.chatContainer.querySelector('input');
      if (chatInput) {
        chatInput.addEventListener('keypress', event => {
          if (event.key === 'Enter') {
            const message = chatInput.value.trim();
            if (message) {
              this.game.networkManager.sendChatMessage(message);

              // Add message to chat (local display)
              this.addChatMessage('You', message);

              // Clear input
              chatInput.value = '';
            }
          }
        });
      }
    }

    // Multiplayer panel
    if (this.elements.multiplayerPanel) {
      // Create game button
      const createButton = this.elements.multiplayerPanel.querySelector('.createButton');
      if (createButton) {
        createButton.addEventListener('click', () => {
          // Connect to server
          const serverUrl = this.elements.multiplayerPanel.querySelector('.serverInput').value || 'ws://localhost:3001';

          this.game.networkManager.connect(serverUrl)
            .then(() => {
              this.game.networkManager.createRoom();

              // Listen for room created event
              this.game.networkManager.events.once('roomCreated', data => {
                this.showRoomInfo(data.roomId);

                // Show hero selection after room is created
                setTimeout(() => {
                  this.showHeroSelection();
                }, 1000);
              });
            })
            .catch(error => {
              this.showError(`Failed to connect: ${error.message}`);
            });
        });
      }

      // Join game button
      const joinButton = this.elements.multiplayerPanel.querySelector('.joinButton');
      if (joinButton) {
        joinButton.addEventListener('click', () => {
          const serverUrl = this.elements.multiplayerPanel.querySelector('.serverInput').value || 'ws://localhost:3001';
          const roomId = this.elements.multiplayerPanel.querySelector('.roomInput').value;

          if (!roomId) {
            this.showError('Please enter a room ID to join');
            return;
          }

          this.game.networkManager.connect(serverUrl)
            .then(() => {
              this.game.networkManager.joinRoom(roomId);

              // Show hero selection after joining room
              setTimeout(() => {
                this.showHeroSelection();
              }, 1000);
            })
            .catch(error => {
              this.showError(`Failed to connect: ${error.message}`);
            });
        });
      }

      // Play solo button
      const soloButton = this.elements.multiplayerPanel.querySelector('.soloButton');
      if (soloButton) {
        soloButton.addEventListener('click', () => {
          this.showHeroSelection();
        });
      }
    }

    // Game over panel
    if (this.elements.gameOverPanel) {
      const restartButton = this.elements.gameOverPanel.querySelector('.restartButton');
      if (restartButton) {
        restartButton.addEventListener('click', () => {
          this.game.resetGame();
        });
      }
    }
  }

  /**
   * Create hero selection panel
   * @returns {HTMLElement} Hero selection panel
   */
  createHeroSelectionPanel() {
    const panel = document.createElement('div');
    panel.id = 'heroSelection';
    panel.className = 'ui-panel';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Choose Your Hero';
    panel.appendChild(title);

    // Hero options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'heroOptionsContainer';

    // Warrior option
    const warrior = document.createElement('div');
    warrior.className = 'heroOption';
    warrior.setAttribute('data-class', 'warrior');

    const warriorName = document.createElement('h3');
    warriorName.textContent = 'Warrior';

    const warriorDesc = document.createElement('p');
    warriorDesc.textContent = 'High defense, melee attacks, and crowd control abilities.';

    warrior.appendChild(warriorName);
    warrior.appendChild(warriorDesc);
    optionsContainer.appendChild(warrior);

    // Ranger option
    const ranger = document.createElement('div');
    ranger.className = 'heroOption';
    ranger.setAttribute('data-class', 'ranger');

    const rangerName = document.createElement('h3');
    rangerName.textContent = 'Ranger';

    const rangerDesc = document.createElement('p');
    rangerDesc.textContent = 'Long range attacks, high precision, and trap abilities.';

    ranger.appendChild(rangerName);
    ranger.appendChild(rangerDesc);
    optionsContainer.appendChild(ranger);

    // Mage option
    const mage = document.createElement('div');
    mage.className = 'heroOption';
    mage.setAttribute('data-class', 'mage');

    const mageName = document.createElement('h3');
    mageName.textContent = 'Mage';

    const mageDesc = document.createElement('p');
    mageDesc.textContent = 'Powerful area damage, magical abilities, and control effects.';

    mage.appendChild(mageName);
    mage.appendChild(mageDesc);
    optionsContainer.appendChild(mage);

    panel.appendChild(optionsContainer);

    // Start button
    const startButton = document.createElement('button');
    startButton.className = 'startButton';
    startButton.textContent = 'Start Game';
    startButton.disabled = true;
    panel.appendChild(startButton);

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    return panel;
  }

  /**
   * Create game info panel
   * @returns {HTMLElement} Game info panel
   */
  createGameInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'gameInfo';
    panel.className = 'ui-panel';

    // Wave info
    const waveContainer = document.createElement('div');
    waveContainer.className = 'info-row';

    const waveLabel = document.createElement('span');
    waveLabel.textContent = 'Wave: ';

    const waveValue = document.createElement('span');
    waveValue.id = 'waveValue';
    waveValue.textContent = '1';

    waveContainer.appendChild(waveLabel);
    waveContainer.appendChild(waveValue);
    panel.appendChild(waveContainer);

    // Gold info
    const goldContainer = document.createElement('div');
    goldContainer.className = 'info-row';

    const goldLabel = document.createElement('span');
    goldLabel.textContent = 'Gold: ';

    const goldValue = document.createElement('span');
    goldValue.id = 'goldValue';
    goldValue.textContent = '0';

    goldContainer.appendChild(goldLabel);
    goldContainer.appendChild(goldValue);
    panel.appendChild(goldContainer);

    // Enemies defeated
    const enemiesContainer = document.createElement('div');
    enemiesContainer.className = 'info-row';

    const enemiesLabel = document.createElement('span');
    enemiesLabel.textContent = 'Enemies: ';

    const enemiesValue = document.createElement('span');
    enemiesValue.id = 'enemiesValue';
    enemiesValue.textContent = '0';

    enemiesContainer.appendChild(enemiesLabel);
    enemiesContainer.appendChild(enemiesValue);
    panel.appendChild(enemiesContainer);

    // Health
    const healthContainer = document.createElement('div');
    healthContainer.className = 'info-row';

    const healthLabel = document.createElement('span');
    healthLabel.textContent = 'Health: ';

    const healthValue = document.createElement('span');
    healthValue.id = 'healthValue';
    healthValue.textContent = '100';

    healthContainer.appendChild(healthLabel);
    healthContainer.appendChild(healthValue);
    panel.appendChild(healthContainer);

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    return panel;
  }

  /**
   * Create upgrade panel
   * @returns {HTMLElement} Upgrade panel
   */
  createUpgradePanel() {
    const panel = document.createElement('div');
    panel.id = 'upgradePanel';
    panel.className = 'ui-panel';

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Upgrades';
    panel.appendChild(title);

    // Upgrade sections container
    const upgradesContainer = document.createElement('div');
    upgradesContainer.id = 'upgradesContainer';

    // Sections will be populated based on available upgrades
    const sections = ['damage', 'attackSpeed', 'range', 'health'];

    sections.forEach(section => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'upgrade-section';
      sectionDiv.id = `upgrade-${section}`;

      const sectionTitle = document.createElement('h4');
      sectionTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);

      const levelInfo = document.createElement('div');
      levelInfo.className = 'level-info';

      const levelLabel = document.createElement('span');
      levelLabel.textContent = 'Level: ';

      const levelValue = document.createElement('span');
      levelValue.className = 'level-value';
      levelValue.id = `${section}-level`;
      levelValue.textContent = '1';

      levelInfo.appendChild(levelLabel);
      levelInfo.appendChild(levelValue);

      const upgradeButton = document.createElement('button');
      upgradeButton.className = 'upgradeButton';
      upgradeButton.id = `${section}-upgrade`;
      upgradeButton.textContent = 'Upgrade (20 gold)';
      upgradeButton.disabled = true;

      // Add event listener
      upgradeButton.addEventListener('click', () => {
        this.game.upgradeSystem.upgradeHeroStat(section);
      });

      sectionDiv.appendChild(sectionTitle);
      sectionDiv.appendChild(levelInfo);
      sectionDiv.appendChild(upgradeButton);

      upgradesContainer.appendChild(sectionDiv);
    });

    panel.appendChild(upgradesContainer);

    // Special abilities section
    const abilitiesSection = document.createElement('div');
    abilitiesSection.className = 'upgrade-section';

    const abilitiesTitle = document.createElement('h4');
    abilitiesTitle.textContent = 'Hero Abilities';
    abilitiesSection.appendChild(abilitiesTitle);

    // Ability upgrades will be populated when hero is selected
    const abilitiesContainer = document.createElement('div');
    abilitiesContainer.id = 'abilitiesContainer';
    abilitiesSection.appendChild(abilitiesContainer);

    panel.appendChild(abilitiesSection);

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    return panel;
  }

  /**
   * Create ability bar
   * @returns {HTMLElement} Ability bar
   */
  createAbilityBar() {
    const bar = document.createElement('div');
    bar.id = 'abilityBar';
    bar.className = 'ui-panel';

    // Create ability slots
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.className = 'abilitySlot';
      slot.id = `abilitySlot${i}`;

      // Key binding display
      const keyBind = document.createElement('div');
      keyBind.className = 'keyBind';
      keyBind.textContent = (i + 1).toString();

      // Cooldown overlay
      const cooldown = document.createElement('div');
      cooldown.className = 'cooldownOverlay';
      cooldown.style.display = 'none';

      slot.appendChild(keyBind);
      slot.appendChild(cooldown);
      bar.appendChild(slot);
    }

    // Add to game container
    this.elements.gameContainer.appendChild(bar);

    return bar;
  }

  /**
   * Create player list panel
   * @returns {HTMLElement} Player list panel
   */
  createPlayerListPanel() {
    const panel = document.createElement('div');
    panel.id = 'playerList';
    panel.className = 'ui-panel';

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Players';
    panel.appendChild(title);

    // Player list container
    const listContainer = document.createElement('div');
    listContainer.id = 'playersContainer';
    panel.appendChild(listContainer);

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    return panel;
  }

  /**
   * Create chat panel
   * @returns {HTMLElement} Chat panel
   */
  createChatPanel() {
    const panel = document.createElement('div');
    panel.id = 'chatContainer';
    panel.className = 'ui-panel';

    // Chat messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'chatMessages';
    panel.appendChild(messagesContainer);

    // Chat input container
    const inputContainer = document.createElement('div');
    inputContainer.id = 'chatInput';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type a message...';

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.addEventListener('click', () => {
      const message = input.value.trim();
      if (message) {
        this.game.networkManager.sendChatMessage(message);

        // Add message to chat (local display)
        this.addChatMessage('You', message);

        // Clear input
        input.value = '';
      }
    });

    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    panel.appendChild(inputContainer);

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    return panel;
  }

  /**
   * Create wave info panel
   * @returns {HTMLElement} Wave info panel
   */
  createWaveInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'waveInfo';

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    return panel;
  }

  /**
   * Create game over panel
   * @returns {HTMLElement} Game over panel
   */
  createGameOverPanel() {
    const panel = document.createElement('div');
    panel.id = 'gameOverPanel';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Game Over';
    panel.appendChild(title);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'game-stats';

    const wavesCleared = document.createElement('p');
    wavesCleared.innerHTML = 'Waves Cleared: <span id="wavesClearedValue">0</span>';

    const enemiesDefeated = document.createElement('p');
    enemiesDefeated.innerHTML = 'Enemies Defeated: <span id="enemiesDefeatedValue">0</span>';

    stats.appendChild(wavesCleared);
    stats.appendChild(enemiesDefeated);
    panel.appendChild(stats);

    // Restart button
    const restartButton = document.createElement('button');
    restartButton.className = 'restartButton';
    restartButton.textContent = 'Play Again';
    panel.appendChild(restartButton);

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    // Hide initially
    panel.style.display = 'none';

    return panel;
  }

  /**
   * Show a panel
   * @param {HTMLElement|string} panel - Panel element or panel ID
   * @param {boolean} hideOthers - Whether to hide other panels
   */
  showPanel(panel, hideOthers = true) {
    let panelElement;

    if (typeof panel === 'string') {
      panelElement = document.getElementById(panel);
    } else {
      panelElement = panel;
    }

    if (!panelElement) {
      this.logger.warn(`Panel not found: ${panel}`);
      return;
    }

    if (hideOthers) {
      // Hide all panels
      const panels = document.querySelectorAll('.ui-panel');
      panels.forEach(p => {
        p.style.display = 'none';
      });
    }

    // Show the requested panel
    panelElement.style.display = 'block';
    this.activePanel = panelElement;

    this.logger.debug(`Showing panel: ${panelElement.id}`);
  }

  /**
   * Hide a panel
   * @param {HTMLElement|string} panel - Panel element or panel ID
   */
  hidePanel(panel) {
    let panelElement;

    if (typeof panel === 'string') {
      panelElement = document.getElementById(panel);
    } else {
      panelElement = panel;
    }

    if (!panelElement) {
      this.logger.warn(`Panel not found: ${panel}`);
      return;
    }

    // Hide the panel
    panelElement.style.display = 'none';

    this.logger.debug(`Hiding panel: ${panelElement.id}`);
  }

  /**
   * Update loading progress
   * @param {number} progress - Progress value (0-1)
   */
  updateLoadingProgress(progress) {
    this.logger.debug(`Updating loading progress: ${progress}`);

    if (this.elements.loadingBar) {
      this.elements.loadingBar.style.width = `${progress * 100}%`;
    }

    if (this.elements.loadingText) {
      this.elements.loadingText.textContent = `Loading resources... ${Math.round(progress * 100)}%`;
    }

    if (progress >= 1 && this.elements.loadingScreen) {
      // Hide loading screen
      this.logger.info('Progress is 100%, hiding loading screen');
      this.elements.loadingScreen.style.opacity = '0';

      setTimeout(() => {
        this.elements.loadingScreen.style.display = 'none';
        this.logger.info('Loading screen should now be completely hidden');
      }, 500);
    }
  }

  /**
   * Show hero selection panel
   */
  showHeroSelection() {
    this.showPanel(this.elements.heroSelection);
  }

  /**
   * Show game UI (after hero selection)
   */
  showGameUI() {
    if (!this.elements.gameInfo) {
      this.elements.gameInfo = this.createGameInfoPanel();
    }

    if (!this.elements.upgradePanel) {
      this.elements.upgradePanel = this.createUpgradePanel();
    }

    if (!this.elements.abilityBar) {
      this.elements.abilityBar = this.createAbilityBar();
    }

    // Force hide loading screen
    this.hideLoadingScreen();

    // Hide hero selection
    this.hidePanel(this.elements.heroSelection);

    // Hide multiplayer panel
    this.hidePanel(this.elements.multiplayerPanel);

    // Force game container to be visible
    if (this.elements.gameContainer) {
      this.elements.gameContainer.style.display = 'block';
    }

    // Show game panels with explicit z-index
    this.showPanel(this.elements.gameInfo, false);
    if (this.elements.gameInfo) {
      this.elements.gameInfo.style.zIndex = '10';
    }

    this.showPanel(this.elements.upgradePanel, false);
    if (this.elements.upgradePanel) {
      this.elements.upgradePanel.style.zIndex = '10';
    }

    this.showPanel(this.elements.abilityBar, false);
    if (this.elements.abilityBar) {
      this.elements.abilityBar.style.zIndex = '10';
    }

    // Always show chat in both multiplayer and single player
    this.showPanel(this.elements.chatContainer, false);
    if (this.elements.chatContainer) {
      this.elements.chatContainer.style.zIndex = '10';
    }

    // Update UI with initial values
    this.updateGameUI();
  }

  /**
   * Hide game UI
   */
  hideGameUI() {
    // Hide game panels
    this.hidePanel(this.elements.gameInfo);
    this.hidePanel(this.elements.upgradePanel);
    this.hidePanel(this.elements.abilityBar);
    this.hidePanel(this.elements.playerList);
    this.hidePanel(this.elements.chatContainer);
  }

  /**
   * Show multiplayer panel
   */
  showMultiplayerPanel() {
    this.logger.info('Showing multiplayer panel');

    // Make sure gameContainer exists before creating panel
    if (!this.elements.gameContainer) {
      this.elements.gameContainer = document.getElementById('gameContainer');
      if (!this.elements.gameContainer) {
        this.elements.gameContainer = document.createElement('div');
        this.elements.gameContainer.id = 'gameContainer';
        document.body.appendChild(this.elements.gameContainer);
      }
    }

    if (!this.elements.multiplayerPanel) {
      this.logger.warn('Multiplayer panel not found, creating it');
      this.elements.multiplayerPanel = this.createSimplifiedMultiplayerPanel();
    }

    this.showPanel(this.elements.multiplayerPanel);

    if (this.elements.multiplayerPanel) {
      this.elements.multiplayerPanel.style.display = 'block';
    }
  }

  /**
   * Create simplified multiplayer panel
   * @returns {HTMLElement} Multiplayer panel
   */
  // In src/ui/UIManager.js, update the createSimplifiedMultiplayerPanel method
  createSimplifiedMultiplayerPanel() {
    const panel = document.createElement('div');
    panel.id = 'multiplayerPanel';
    panel.className = 'ui-panel';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Hero Defense';
    panel.appendChild(title);

    // Username input
    const usernameContainer = document.createElement('div');
    usernameContainer.className = 'input-container';

    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = 'Username:';

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.className = 'usernameInput';
    usernameInput.placeholder = 'Enter your username';

    usernameContainer.appendChild(usernameLabel);
    usernameContainer.appendChild(usernameInput);
    panel.appendChild(usernameContainer);

    // Server input
    const serverContainer = document.createElement('div');
    serverContainer.className = 'input-container';

    const serverLabel = document.createElement('label');
    serverLabel.textContent = 'Server:';

    const serverInput = document.createElement('input');
    serverInput.type = 'text';
    serverInput.className = 'serverInput';
    serverInput.value = 'ws://localhost:3001';

    serverContainer.appendChild(serverLabel);
    serverContainer.appendChild(serverInput);
    panel.appendChild(serverContainer);

    // Hero selection
    const heroSelectionContainer = document.createElement('div');
    heroSelectionContainer.className = 'hero-selection-container';

    const heroLabel = document.createElement('h3');
    heroLabel.textContent = 'Choose Your Hero:';
    heroSelectionContainer.appendChild(heroLabel);

    // Hero options container
    const heroOptionsContainer = document.createElement('div');
    heroOptionsContainer.className = 'hero-options';

    // Create hero options
    const heroes = [
      { id: 'warrior', name: 'Warrior', desc: 'High defense, melee attacks' },
      { id: 'ranger', name: 'Ranger', desc: 'Long range attacks, high precision' },
      { id: 'mage', name: 'Mage', desc: 'Powerful area damage, magical abilities' }
    ];

    heroes.forEach(hero => {
      const heroOption = document.createElement('div');
      heroOption.className = 'hero-option';
      heroOption.setAttribute('data-hero', hero.id);

      const radioInput = document.createElement('input');
      radioInput.type = 'radio';
      radioInput.name = 'heroClass';
      radioInput.value = hero.id;
      radioInput.id = `hero-${hero.id}`;
      if (hero.id === 'warrior') radioInput.checked = true;

      const label = document.createElement('label');
      label.setAttribute('for', `hero-${hero.id}`);
      label.textContent = hero.name;

      const description = document.createElement('p');
      description.textContent = hero.desc;

      heroOption.appendChild(radioInput);
      heroOption.appendChild(label);
      heroOption.appendChild(description);

      // Add click handler to select hero
      heroOption.addEventListener('click', () => {
        radioInput.checked = true;

        // Remove selected class from all options
        document.querySelectorAll('.hero-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        // Add selected class to this option
        heroOption.classList.add('selected');
      });

      heroOptionsContainer.appendChild(heroOption);
    });

    heroSelectionContainer.appendChild(heroOptionsContainer);
    panel.appendChild(heroSelectionContainer);

    // Join button
    const joinButton = document.createElement('button');
    joinButton.className = 'joinButton';
    joinButton.textContent = 'Join Game';

    joinButton.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      const serverUrl = serverInput.value.trim();
      const selectedHero = document.querySelector('input[name="heroClass"]:checked').value;

      if (!username) {
        this.showError('Please enter a username');
        return;
      }

      this.game.networkManager.connect(serverUrl)
        .then(() => {
          // Set the selected hero class
          this.game.state.heroClass = selectedHero;

          // Create the hero
          this.game.state.hero = this.game.heroFactory.createHero(selectedHero, true);

          // Initialize game systems
          if (this.game.upgradeSystem) {
            this.game.upgradeSystem.initialize();
          }

          // Register with the server
          this.game.networkManager.registerPlayer(username);

          // Show game UI
          this.showGameUI();
        })
        .catch(error => {
          this.showError(`Failed to connect: ${error.message}`);
        });
    });

    panel.appendChild(joinButton);

    // Error message display
    const errorDisplay = document.createElement('div');
    errorDisplay.id = 'errorDisplay';
    errorDisplay.className = 'error-message';
    errorDisplay.style.display = 'none';
    panel.appendChild(errorDisplay);

    // Add to game container
    if (this.elements.gameContainer) {
      this.elements.gameContainer.appendChild(panel);
    } else {
      this.elements.gameContainer = document.getElementById('gameContainer');
      if (!this.elements.gameContainer) {
        this.elements.gameContainer = document.createElement('div');
        this.elements.gameContainer.id = 'gameContainer';
        document.body.appendChild(this.elements.gameContainer);
      }
      this.elements.gameContainer.appendChild(panel);
    }

    return panel;
  }

  // Around line 420-430, update the Game info panel to show server health:
  createGameInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'gameInfo';
    panel.className = 'ui-panel';

    // Wave info
    const waveContainer = document.createElement('div');
    waveContainer.className = 'info-row';

    const waveLabel = document.createElement('span');
    waveLabel.textContent = 'Wave: ';

    const waveValue = document.createElement('span');
    waveValue.id = 'waveValue';
    waveValue.textContent = '1';

    waveContainer.appendChild(waveLabel);
    waveContainer.appendChild(waveValue);
    panel.appendChild(waveContainer);

    // Gold info
    const goldContainer = document.createElement('div');
    goldContainer.className = 'info-row';

    const goldLabel = document.createElement('span');
    goldLabel.textContent = 'Gold: ';

    const goldValue = document.createElement('span');
    goldValue.id = 'goldValue';
    goldValue.textContent = '0';

    goldContainer.appendChild(goldLabel);
    goldContainer.appendChild(goldValue);
    panel.appendChild(goldContainer);

    // Server Health instead of hero health
    const healthContainer = document.createElement('div');
    healthContainer.className = 'info-row';

    const healthLabel = document.createElement('span');
    healthLabel.textContent = 'Server Health: ';

    const healthValue = document.createElement('span');
    healthValue.id = 'healthValue';
    healthValue.textContent = '500';

    healthContainer.appendChild(healthLabel);
    healthContainer.appendChild(healthValue);
    panel.appendChild(healthContainer);

    // Add to game container
    this.elements.gameContainer.appendChild(panel);

    return panel;
  }

  // Add this method to the UIManager class in src/ui/UIManager.js
  showCountdown(seconds) {
    // Create or get countdown element
    let countdownElement = document.getElementById('countdownDisplay');

    if (!countdownElement) {
      countdownElement = document.createElement('div');
      countdownElement.id = 'countdownDisplay';
      countdownElement.style.position = 'fixed';
      countdownElement.style.top = '50%';
      countdownElement.style.left = '50%';
      countdownElement.style.transform = 'translate(-50%, -50%)';
      countdownElement.style.fontSize = '48px';
      countdownElement.style.fontWeight = 'bold';
      countdownElement.style.color = '#ffffff';
      countdownElement.style.textShadow = '0 0 10px #000000';
      countdownElement.style.zIndex = '1000';
      document.body.appendChild(countdownElement);
    }

    // Update countdown text
    countdownElement.textContent = seconds > 0 ? `Game starting in ${seconds}...` : 'Go!';
    countdownElement.style.display = 'block';

    // Hide the element when countdown reaches 0
    if (seconds <= 0) {
      setTimeout(() => {
        countdownElement.style.display = 'none';
      }, 1000);
    }
  }

  showWaveCompleted(nextWave) {
    // Create floating text to show wave completed
    if (this.game && this.game.combatSystem) {
      this.game.combatSystem.createFloatingText(
        `Wave Completed! Next Wave: ${nextWave}`,
        new THREE.Vector3(0, 2, 0),
        0xffd700
      );
    }

    // Update wave info UI
    this.updateWaveUI(nextWave);

    // Show wave announcement for next wave with a delay
    setTimeout(() => {
      this.showWaveAnnouncement(nextWave);
    }, 2000);
  }

  /**
   * Show room information
   * @param {string} roomId - Room ID
   */
  showRoomInfo(roomId) {
    const roomInfo = document.getElementById('roomInfo');
    if (roomInfo) {
      const roomIdValue = document.getElementById('roomIdValue');
      if (roomIdValue) {
        roomIdValue.textContent = roomId;
      }

      roomInfo.style.display = 'block';
    }
  }

  /**
   * Show an error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
      errorDisplay.textContent = message;
      errorDisplay.style.display = 'block';

      // Hide after a timeout
      setTimeout(() => {
        errorDisplay.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Show wave announcement
   * @param {number} waveNumber - Wave number
   */
  showWaveAnnouncement(waveNumber) {
    if (!this.elements.waveInfo) return;

    // Set wave text
    this.elements.waveInfo.textContent = `Wave ${waveNumber} Incoming!`;

    // Fade in
    this.elements.waveInfo.style.opacity = '1';

    // Fade out after delay
    setTimeout(() => {
      this.elements.waveInfo.style.opacity = '0';
    }, 3000);
  }

  /**
   * Show game over panel
   * @param {number} enemiesDefeated - Enemies defeated
   * @param {number} wavesCleared - Waves cleared
   */
  showGameOverPanel(enemiesDefeated, wavesCleared) {
    // Update stats
    const wavesClearedValue = document.getElementById('wavesClearedValue');
    if (wavesClearedValue) {
      wavesClearedValue.textContent = wavesCleared.toString();
    }

    const enemiesDefeatedValue = document.getElementById('enemiesDefeatedValue');
    if (enemiesDefeatedValue) {
      enemiesDefeatedValue.textContent = enemiesDefeated.toString();
    }

    // Show panel
    if (this.elements.gameOverPanel) {
      this.elements.gameOverPanel.style.display = 'block';
    }
  }

  /**
   * Update game UI
   */
  updateGameUI() {
    // Update wave info
    this.updateWaveUI(this.game.state.wave);

    // Update gold
    this.updateGoldUI(this.game.state.gold);

    // Update enemies defeated
    this.updateEnemiesDefeatedUI(this.game.state.enemiesDefeated);

    // Update health
    if (this.game.state.hero) {
      this.updateHealthUI(this.game.state.hero.upgradeStats.health.value);
    }

    // Update abilities
    this.updateAbilitiesUI();

    // Update upgrade buttons
    this.updateUpgradeButtons();

    // Update FPS display
    this.updateFpsUI(this.game.fps || 0);
  }

  /**
   * Update FPS UI
   * @param {number} fps - Current FPS
   */
  updateFpsUI(fps) {
    const fpsValue = document.getElementById('fpsValue');
    if (fpsValue) {
      fpsValue.textContent = Math.round(fps).toString();
    }
  }

  /**
   * Update wave UI
   * @param {number} wave - Current wave
   */
  updateWaveUI(wave) {
    const waveValue = document.getElementById('waveValue');
    if (waveValue) {
      waveValue.textContent = wave.toString();
    }
  }

  /**
   * Update gold UI
   * @param {number} gold - Current gold
   */
  updateGoldUI(gold) {
    const goldValue = document.getElementById('goldValue');
    if (goldValue) {
      goldValue.textContent = gold.toString();
    }

    // Update upgrade buttons (to enable/disable based on affordability)
    this.updateUpgradeButtons();
  }

  /**
   * Update enemies defeated UI
   * @param {number} enemiesDefeated - Total enemies defeated
   */
  updateEnemiesDefeatedUI(enemiesDefeated) {
    const enemiesValue = document.getElementById('enemiesValue');
    if (enemiesValue) {
      enemiesValue.textContent = enemiesDefeated.toString();
    }
  }

  /**
   * Update health UI
   * @param {number} health - Current health
   */
  updateHealthUI(health) {
    const healthValue = document.getElementById('healthValue');
    if (healthValue) {
      healthValue.textContent = health.toString();
    }
  }

  /**
   * Update wave completed UI
   * @param {number} wave - Completed wave
   */
  updateWaveCompletedUI(wave) {
    // Could display a "Wave Completed" message or update UI elements
  }

  /**
   * Update abilities UI
   */
  updateAbilitiesUI() {
    if (!this.game.state.hero || !this.game.state.hero.abilities) return;

    const abilities = this.game.state.hero.abilities;
    const abilitySlots = this.elements.abilityBar.querySelectorAll('.abilitySlot');

    abilities.forEach((ability, index) => {
      if (index < abilitySlots.length) {
        const slot = abilitySlots[index];

        // Update slot appearance based on ability
        // Here you could set icons, tooltips, etc.

        // For now just change the color to match ability effect color
        slot.style.backgroundColor = '#' + ability.effectColor.toString(16).padStart(6, '0');

        // Add title (tooltip)
        slot.title = `${ability.name}: ${ability.description}`;
      }
    });
  }

  /**
   * Update a specific ability UI
   * @param {number} index - Ability index
   * @param {number} cooldown - Current cooldown
   */
  updateAbilityUI(index, cooldown) {
    const abilitySlots = this.elements.abilityBar.querySelectorAll('.abilitySlot');

    if (index < abilitySlots.length) {
      const slot = abilitySlots[index];
      const cooldownOverlay = slot.querySelector('.cooldownOverlay');

      if (cooldown > 0) {
        // Show cooldown overlay
        if (cooldownOverlay) {
          cooldownOverlay.style.display = 'block';

          // Get ability total cooldown
          const ability = this.game.state.hero.abilities[index];
          const totalCooldown = ability.cooldown;

          // Update cooldown display
          const percent = (cooldown / totalCooldown) * 100;
          cooldownOverlay.style.height = `${percent}%`;

          // Add cooldown text
          const seconds = Math.ceil(cooldown / 1000);
          cooldownOverlay.textContent = seconds > 0 ? seconds.toString() : '';
        }
      } else {
        // Hide cooldown overlay
        if (cooldownOverlay) {
          cooldownOverlay.style.display = 'none';
        }
      }
    }
  }

  /**
   * Update upgrade buttons based on current state
   */
  updateUpgradeButtons() {
    if (!this.game.state.hero || !this.game.upgradeSystem) return;

    const upgradeCosts = this.game.upgradeSystem.getUpgradeCosts();

    // Update each upgrade button with cost and enabled state
    Object.keys(upgradeCosts).forEach(stat => {
      const button = document.getElementById(`${stat}-upgrade`);
      if (button) {
        const cost = upgradeCosts[stat];
        const level = this.game.state.hero.upgradeStats[stat].level;

        // Update button text
        button.textContent = `Upgrade (${cost} gold)`;

        // Update level display
        const levelDisplay = document.getElementById(`${stat}-level`);
        if (levelDisplay) {
          levelDisplay.textContent = level.toString();
        }

        // Enable/disable based on affordability
        button.disabled = this.game.state.gold < cost;
      }
    });
  }

  /**
   * Add a chat message to the chat panel
   * @param {string} sender - Message sender
   * @param {string} message - Message content
   */
  addChatMessage(sender, message) {
    if (!this.elements.chatContainer) return;

    const chatMessages = this.elements.chatContainer.querySelector('#chatMessages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';

    const senderSpan = document.createElement('span');
    senderSpan.className = 'chat-sender';
    senderSpan.textContent = sender + ': ';

    const contentSpan = document.createElement('span');
    contentSpan.className = 'chat-content';
    contentSpan.textContent = message;

    messageElement.appendChild(senderSpan);
    messageElement.appendChild(contentSpan);

    chatMessages.appendChild(messageElement);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Update player list
   * @param {Object} players - Player data
   */
  updatePlayerList(players) {
    if (!this.elements.playerList) return;

    const playersContainer = this.elements.playerList.querySelector('#playersContainer');
    if (!playersContainer) return;

    // Clear current player list
    playersContainer.innerHTML = '';

    // Add local player
    const localPlayer = document.createElement('div');
    localPlayer.className = 'player-item local-player';
    localPlayer.textContent = 'You (Host)';

    playersContainer.appendChild(localPlayer);

    // Add other players
    Object.entries(players).forEach(([id, player]) => {
      const playerElement = document.createElement('div');
      playerElement.className = 'player-item';
      playerElement.textContent = `Player ${id.substring(0, 5)}`;

      if (player.heroClass) {
        playerElement.textContent += ` (${player.heroClass})`;
      }

      playersContainer.appendChild(playerElement);
    });
  }

  /**
   * Clean up UI manager
   */
  dispose() {
    this.logger.info('Disposing UI manager');

    // Clear event listeners
    this.events.clear();

    // Other cleanup as needed
  }
}