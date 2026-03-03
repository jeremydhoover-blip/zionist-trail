/* eslint-disable no-undef */
// Game.js - Main game logic and state management

class Game {
  constructor() {
    this.storyConfig = null;
    this.gameState = null;
    this.dailyDecision = null;
    this.ui = null;
    this.event = null;
    
    // Game flow control
    this.gameLoopActive = false;
    this.currentScreen = 'title';
    
    this.initializeGame();
  }

  async initializeGame() {
    try {
      // Verify constants are loaded first
      if (!window.ZionistH.SEASON_FALL) {
        console.error('❌ Constants not properly loaded - missing SEASON_FALL');
        throw new Error('Game constants not loaded properly. Please refresh the page.');
      }
      
      // Load story configuration with detailed error handling
      console.log('🔧 Loading story configuration...');
      const response = await fetch('data/story-config.json');
      
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to load story config: HTTP ${response.status} - ${response.statusText}`);
      }
      
      const configText = await response.text();
      console.log('📄 Story config loaded, parsing JSON...');
      
      try {
        this.storyConfig = JSON.parse(configText);
        console.log('✅ Story config parsed successfully');
        console.log('📋 Loaded professions:', Object.keys(this.storyConfig.professions));
        console.log('📋 Loaded locations:', Object.keys(this.storyConfig.locations));
      } catch (jsonError) {
        console.error('❌ JSON Parse Error:', jsonError);
        console.error('Raw config text:', configText.substring(0, 200) + '...');
        throw new Error(`Invalid JSON in story config: ${jsonError.message}`);
      }
      
      // Initialize game systems - with error checking
      console.log('🔧 Initializing GameState...');
      this.gameState = new ZionistH.GameState();
      console.log('✅ GameState initialized');
      
      // UI is initialized separately, just get reference
      this.ui = window.ZionistH.uiInstance;
      
      // CRITICAL FIX: Connect this game instance to UI
      if (this.ui) {
        this.ui.game = this;
        this.ui.gameState = this.gameState;
        console.log('✅ UI connected to Game instance');
      }
      
      // Initialize enhanced party selection system
      if (ZionistH.PartySelection) {
        this.partySelection = new ZionistH.PartySelection(this, this.storyConfig);
        // Make available globally for navigation functions
        window.ZionistH.gameInstance = this;
      }
      
      // Initialize Visual Overlay Manager
      if (ZionistH.VisualOverlayManager) {
        this.visualOverlayManager = new ZionistH.VisualOverlayManager(this.gameState, this.ui);
        // Make available globally for overlay functions
        window.ZionistH.visualOverlayManager = this.visualOverlayManager;
        console.log('✅ VisualOverlayManager initialized');
      }
      
      if (ZionistH.EventManager) {
        this.event = new ZionistH.EventManager(this.gameState, this.storyConfig, this.ui);
        console.log('✅ EventManager initialized');
      }
      
      if (ZionistH.DailyDecision) {
        this.dailyDecision = new ZionistH.DailyDecision(this.gameState, this.storyConfig, this.ui);
      }
      
      console.log('Game initialized successfully');
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.showError('Failed to load game data. Please refresh the page.');
    }
  }

  setupEventListeners() {
    // Game.js does NOT add DOM listeners — UI.js owns all DOM bindings.
    // Game.js methods are called by UI.js through the game reference.
    // Only set up purely game-internal callbacks here.
  }

  showError(message) {
    console.error(message);
    alert(message); // Simple fallback
  }

  showIntroduction() {
    this.ui.hideOverlay('title-screen');
    this.ui.showOverlay('introduction-story');
  }

  showCharacterSelection() {
    this.ui.hideOverlay('introduction-story');
    this.ui.showOverlay('character-selection');
  }

  selectProfession(professionKey) {
    // Set up game state with profession
    this.gameState.setProfession(professionKey, this.storyConfig);
    
    console.log('🎭 Character selected:', professionKey);
    
    // Use enhanced party selection system
    if (this.partySelection) {
      this.partySelection.showFamilyScene(professionKey);
    } else {
      // Fallback to old system if party selection not available
      this.showOldPartyMeeting(professionKey);
    }
  }

  // Fallback method for old party system
  showOldPartyMeeting(professionKey) {
    // Create party members from templates
    const templates = this.storyConfig.partyMembers.templates;
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    
    // Take first 4 random party members
    for (let i = 0; i < Math.min(4, shuffled.length); i++) {
      this.gameState.createPartyMember(shuffled[i], i === 0);
    }

    this.showPartyMeeting();
  }

  showPartyMeeting() {
    // Update party member display
    this.updatePartyDisplay();
    
    this.ui.hideOverlay('character-selection');
    this.ui.showOverlay('meet-party');

    // Set up continue button
    const continueBtn = document.getElementById('continue-to-supplies');
    if (continueBtn) {
      continueBtn.onclick = () => this.showInitialSupplies();
    }
  }

  updatePartyDisplay() {
    this.gameState.partyMembers.forEach((member, index) => {
      const nameEl = document.getElementById(`member${index + 1}-name`);
      const professionEl = document.getElementById(`member${index + 1}-profession`);
      
      if (nameEl) nameEl.textContent = member.fullName;
      if (professionEl) professionEl.textContent = member.profession;
    });
  }

  showInitialSupplies() {
    // Update money display
    const moneyEl = document.getElementById('available-money');
    if (moneyEl) {
      moneyEl.textContent = this.gameState.money;
    }

    // Show current starting supplies
    const inv = this.gameState.inventory;
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = Math.ceil(val || 0); };
    setEl('current-food', inv.food);
    setEl('current-water', inv.water);
    setEl('current-tools', inv.tools);
    setEl('current-medicine', inv.medicine);
    setEl('current-clothing', inv.clothing);

    // Hide any previous overlays and show supplies
    this.ui.hideOverlay('meet-party');
    this.ui.hideOverlay('warsaw-family-scene');
    this.ui.showOverlay('initial-supplies');

    this.setupSupplyPurchase();
  }

  setupSupplyPurchase() {
    // Start with minimal quantities that fit within budget
    this.currentPurchases = {
      food: 0,
      tools: 0,
      medicine: 0,
      clothing: 0
    };

    // Also ensure water is set from profession defaults
    if (!this.gameState.inventory.water) {
      this.gameState.inventory.water = 200;
    }

    this.updateSupplyDisplay();
  }

  updateSupplyDisplay() {
    // Update quantity displays
    Object.keys(this.currentPurchases).forEach(item => {
      const qtyEl = document.getElementById(`${item}-qty`);
      if (qtyEl) {
        qtyEl.textContent = this.currentPurchases[item];
      }
    });

    // Calculate total cost
    const prices = { food: 10, tools: 50, medicine: 25, clothing: 15 };
    let totalCost = 0;
    
    Object.keys(this.currentPurchases).forEach(item => {
      const baseAmount = item === 'food' ? 20 : 1;
      const quantity = Math.floor(this.currentPurchases[item] / baseAmount);
      totalCost += quantity * prices[item];
    });

    // Update cost display
    const costEl = document.getElementById('total-cost');
    const remainingEl = document.getElementById('remaining-money');
    const remaining = this.gameState.money - totalCost;
    
    if (costEl) costEl.textContent = totalCost;
    if (remainingEl) {
      remainingEl.textContent = Math.max(0, remaining);
      remainingEl.style.color = remaining < 0 ? '#dc143c' : '';
    }

    // Update available funds display at top
    const availEl = document.getElementById('available-money');
    if (availEl) availEl.textContent = Math.max(0, remaining);

    // Disable/enable finalize button
    const finalizeBtn = document.getElementById('finalize-supplies');
    if (finalizeBtn) {
      finalizeBtn.disabled = remaining < 0;
      finalizeBtn.textContent = remaining < 0 ? 'Over Budget!' : 'Begin Journey';
    }
  }

  finalizePurchases() {
    const totalCost = this.calculateSupplyCost();
    if (totalCost > this.gameState.money) {
      this.ui.logMessage('\u274c Not enough rubles! Reduce your purchases.', 'negative');
      return;
    }

    // Add purchases to existing starting supplies (don't replace them)
    Object.keys(this.currentPurchases).forEach(item => {
      this.gameState.inventory[item] = (this.gameState.inventory[item] || 0) + this.currentPurchases[item];
    });
    this.gameState.money -= totalCost;

    // Start the main game loop
    this.startMainGame();
  }

  calculateSupplyCost() {
    const prices = { food: 10, tools: 50, medicine: 25, clothing: 15 };
    let totalCost = 0;
    Object.keys(this.currentPurchases).forEach(item => {
      const baseAmount = item === 'food' ? 20 : 1;
      const quantity = Math.floor(this.currentPurchases[item] / baseAmount);
      totalCost += quantity * prices[item];
    });
    return totalCost;
  }

  startMainGame() {
    console.log('🎮 Starting main game...');
    
    // Hide the supplies overlay
    this.ui.hideOverlay('initial-supplies');
    
    // Ensure game state is properly set
    this.gameState.gameActive = true;
    this.gameLoopActive = true;
    
    // CRITICAL FIX: Initialize DailyDecision if not already done
    if (!this.dailyDecision && ZionistH.DailyDecision) {
      console.log('🔧 Initializing DailyDecision system...');
      this.dailyDecision = new ZionistH.DailyDecision(this.gameState, this.storyConfig, this.ui);
    }
    
    if (this.ui) {
      this.ui.gameState = this.gameState;
      this.ui.game = this;
    }
    
    // Update displays
    this.ui.refreshStats();
    this.updateLocationDisplay();
    
    console.log('Game state active:', this.gameState.gameActive);
    console.log('Daily decision system:', this.dailyDecision ? 'Ready' : 'Not ready');
    console.log('Current location:', this.gameState.currentLocation);
    
    // FIXED: Directly show Oregon Trail main game interface
    console.log('🎯 Showing Oregon Trail interface...');
    if (this.dailyDecision) {
      this.dailyDecision.showDailyChoices();
    } else {
      console.error('❌ DailyDecision system not initialized!');
      // Fallback - show basic interface
      this.ui.showOverlay('main-game');
    }
  }

  // NEW METHOD: Start journey directly from Warsaw (bypassing supplies)
  startJourney() {
    console.log('🚂 Starting journey from Warsaw - Day 1');
    
    // Set up initial game state with default supplies if not set
    if (!this.gameState.inventory.food) {
      this.gameState.inventory = {
        food: 400, // Default reasonable supplies
        water: 200,
        tools: 2,
        medicine: 3,
        clothing: 5
      };
      console.log('📦 Set default starting supplies');
    }
    
    // Initialize main game UI and ensure all systems are ready
    this.ui.refreshStats();
    this.updateLocationDisplay();
    
    // Ensure game state is properly set for journey start
    this.gameState.gameActive = true;
    this.gameLoopActive = true;
    this.gameState.currentDay = 1;
    this.gameState.distanceTraveled = 0;
    
    // Initialize DailyDecision if not already done
    if (!this.dailyDecision && ZionistH.DailyDecision) {
      console.log('🔧 Initializing DailyDecision system...');
      this.dailyDecision = new ZionistH.DailyDecision(this.gameState, this.storyConfig, this.ui);
    }
    
    // Start Day 1 with Oregon Trail style daily decisions
    console.log('🌅 Starting Day 1 decisions...');
    setTimeout(() => {
      if (this.dailyDecision) {
        this.dailyDecision.showDailyChoices();
      } else {
        console.error('❌ DailyDecision system not initialized!');
        // Fallback - show basic interface
        this.ui.showOverlay('main-game');
      }
    }, 500);
  }

  updateLocationDisplay() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    
    // Update location info banner
    const locationNameEl = document.getElementById('current-location-name');
    const descriptionEl = document.getElementById('location-description');
    
    if (locationNameEl && location) {
      locationNameEl.textContent = location.name;
    }
    
    if (descriptionEl && location) {
      descriptionEl.textContent = location.description;
    }

    // NEW: Update location scene overlay
    this.updateLocationSceneOverlay(location);
    
    // Update weather effects
    this.updateWeatherOverlay(location);
  }

  updateLocationSceneOverlay(location) {
    const sceneImageEl = document.getElementById('location-scene-image');
    if (!sceneImageEl) return;

    // Remove existing scene classes
    sceneImageEl.className = sceneImageEl.className.replace(/location-scene\.\w+/g, '');
    sceneImageEl.classList.add('location-scene');

    if (!location) {
      // Default to Warsaw for Day 1
      sceneImageEl.classList.add('warsaw');
      console.log('🏠 Set default Warsaw scene');
      return;
    }

    // Smart location scene mapping
    const locationName = location.name.toLowerCase();
    let sceneClass = 'warsaw'; // Default

    if (locationName.includes('warsaw')) {
      sceneClass = 'warsaw';
    } else if (locationName.includes('vienna')) {
      sceneClass = 'vienna';
    } else if (locationName.includes('train')) {
      sceneClass = 'train-station';
    } else if (locationName.includes('trieste') || locationName.includes('port')) {
      sceneClass = 'trieste';
    } else if (locationName.includes('mediterranean') || locationName.includes('sea')) {
      sceneClass = 'mediterranean';
    } else if (locationName.includes('ship')) {
      sceneClass = 'ship-deck';
    } else if (locationName.includes('haifa')) {
      sceneClass = 'haifa';
    } else if (locationName.includes('jerusalem')) {
      sceneClass = 'jerusalem';
    } else if (locationName.includes('tel aviv')) {
      sceneClass = 'tel-aviv';
    } else if (locationName.includes('desert')) {
      sceneClass = 'desert';
    } else if (locationName.includes('mountain')) {
      sceneClass = 'mountain';
    } else {
      // Use generic travel scenes based on terrain
      if (this.gameState.currentDay <= 5) {
        sceneClass = 'warsaw'; // Early days in Warsaw area
      } else if (this.gameState.currentDay <= 10) {
        sceneClass = 'train-station'; // Train journey phase
      } else if (this.gameState.currentDay <= 20) {
        sceneClass = 'mediterranean'; // Sea voyage
      } else {
        sceneClass = 'desert'; // Overland in Palestine
      }
    }

    sceneImageEl.classList.add(sceneClass);
    console.log(`🖼️ Updated location scene to: ${sceneClass} for ${location.name}`);

    // Add fade-in animation
    sceneImageEl.classList.add('fade-in');
    setTimeout(() => {
      sceneImageEl.classList.remove('fade-in');
    }, 1000);
  }

  updateSceneBackground(location) {
    // Keep this method for compatibility but it now does less
    // The main visual work is done by updateLocationSceneOverlay
    
    // Apply weather effects based on current weather and location
    this.updateWeatherOverlay(location);
  }

  updateWeatherOverlay(location) {
    const weatherOverlay = document.getElementById('weather-overlay');
    if (!weatherOverlay || !this.gameState) return;

    // Remove existing weather classes
    weatherOverlay.className = weatherOverlay.className.replace(/weather-\w+/g, '');

    const weather = this.gameState.weather;
    const locationName = location.name.toLowerCase();

    // Apply dramatic weather overlays based on location and weather
    if (weather === 'stormy') {
      if (locationName.includes('mediterranean') || locationName.includes('sea')) {
        weatherOverlay.classList.add('weather-stormy-sea', 'weather-storm-effect', 'weather-overlay-fade-in');
      } else {
        weatherOverlay.classList.add('weather-rain-trail', 'weather-overlay-fade-in');
      }
    } else if (weather === 'hot' && !locationName.includes('sea')) {
      weatherOverlay.classList.add('weather-desert-sandstorm', 'weather-sandstorm-effect', 'weather-overlay-fade-in');
    } else if (weather === 'cold') {
      weatherOverlay.classList.add('weather-rain-trail', 'weather-overlay-fade-in');
    } else if (locationName.includes('cliff') || (locationName.includes('sea') && weather === 'fair')) {
      // Show dramatic sea cliffs during calm weather at sea
      weatherOverlay.classList.add('weather-sea-cliffs', 'weather-overlay-fade-in');
    }

    // Log weather effect for debugging
    if (weather !== 'fair') {
      console.log(`🌤️ Weather effect applied: ${weather} at ${location.name}`);
    }
  }

  // Oregon Trail style continue trail function
  continueTrail() {
    if (!this.gameLoopActive) return;
    
    // This is now handled by DailyDecision.handleContinueJourney()
    // The daily decision system takes over the core game loop
  }

  // Legacy support for existing UI
  rest() {
    if (this.dailyDecision) {
      this.dailyDecision.handleRest();
    }
  }

  // Game state management
  saveGame() {
    this.gameState.saveToLocalStorage();
    this.ui.logMessage('Game saved', 'positive');
  }

  loadGame() {
    if (this.gameState.loadFromLocalStorage()) {
      this.ui.logMessage('Game loaded', 'positive');
      this.ui.refreshStats();
      this.updateLocationDisplay();
      return true;
    }
    return false;
  }

  restartGame() {
    // Clear any saved data
    this.gameState.clearSave();
    
    // Reset to title screen
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.classList.remove('active');
    });
    
    document.getElementById('title-screen').classList.add('active');
    
    // Reset game state
    this.gameState.reset();
    this.gameLoopActive = false;
    this.currentScreen = 'title';
  }

  // Victory and game over handling
  victory() {
    this.gameLoopActive = false;
    const finalScore = this.gameState.calculateScore();
    
    this.ui.showVictory({
      day: this.gameState.day,
      settlers: this.gameState.getAlivePartyMembers().length,
      historicalKnowledge: this.gameState.historicalKnowledge,
      score: finalScore
    });
  }

  gameOver(reason) {
    this.gameLoopActive = false;
    
    this.ui.showGameOver(reason, {
      day: this.gameState.day,
      progress: this.gameState.getProgressPercentage(),
      pioneers: this.gameState.getAlivePartyMembers().length
    });
  }

  // Event system integration
  triggerEvent(eventKey) {
    if (this.storyConfig.events[eventKey]) {
      this.event.showEvent(this.storyConfig.events[eventKey]);
    }
  }

  // Trading system
  showTrading() {
    // Delegate to UI system
    this.ui.showTrading();
  }

  // Mini-game integration
  startHunting() {
    this.ui.startHunting();
  }

  startForaging() {
    this.ui.startForaging();
  }

  // Pace and rations management
  changePace(newPace) {
    this.gameState.pace = newPace;
    this.ui.logMessage(`Travel pace changed to ${newPace}`, 'neutral');
    this.ui.refreshStats();
  }

  changeRations(newRations) {
    this.gameState.rations = newRations;
    this.ui.logMessage(`Food rations changed to ${newRations}`, 'neutral');
    this.ui.refreshStats();
  }

  // NEW METHOD: Populate ornate party display system
  populateOrnatePartyDisplay() {
    const partyPortraitsRow = document.getElementById('party-status-portraits');
    if (!partyPortraitsRow || !this.gameState.partyMembers) return;

    // Clear existing portraits
    partyPortraitsRow.innerHTML = '';

    // Add each party member as a portrait
    this.gameState.partyMembers.forEach((member, index) => {
      const portraitDiv = document.createElement('div');
      portraitDiv.className = 'party-portrait';
      
      // Set health status class
      const healthStatus = this.getHealthStatus(member.health);
      portraitDiv.classList.add(`health-${healthStatus}`);

      // Get portrait image or emoji
      const fullName = `${member.firstName} ${member.lastName}`;
      const familyPortraitImage = this.getFamilyPortraitImage(fullName);
      
      if (familyPortraitImage) {
        portraitDiv.innerHTML = `<img src="${familyPortraitImage}" alt="${fullName}" />`;
      } else {
        const profImg = this.getPortraitEmoji(member.profession);
        portraitDiv.innerHTML = `<img src="${profImg}" alt="${fullName}" />`;
      }

      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'party-portrait-tooltip';
      tooltip.innerHTML = `
        <div class="tooltip-name">${fullName}</div>
        <div class="tooltip-health">Health: ${healthStatus}</div>
      `;
      portraitDiv.appendChild(tooltip);

      partyPortraitsRow.appendChild(portraitDiv);
    });

    console.log(`👥 Updated ornate party display with ${this.gameState.partyMembers.length} members`);
  }

  getFamilyPortraitImage(memberName) {
    return ZionistH.getFamilyPortraitImage(memberName);
  }

  getPortraitEmoji(profession) {
    const portraits = {
      'Carpenter': 'images/charcter-portraits-yaakov-the-builder.png',
      'Teacher': 'images/character-portraits-miriam-goldstein.png',
      'Farmer': 'images/charcter-portraits-avraham-farmer.png',
      'Nurse': 'images/character-portraits-sofie-stern.png',
      'Merchant': 'images/character-portraits-morechai-goldberg-merchant.png'
    };
    
    return portraits[profession] || 'images/charcter-portraits-rabbi-shmuel.png';
  }

  getHealthStatus(health) {
    if (health >= 90) return 'excellent';
    if (health >= 70) return 'good';
    if (health >= 50) return 'fair';
    if (health >= 25) return 'poor';
    return 'critical';
  }

  // Removed duplicate updateLocationDisplay — the primary version above handles everything

  getLocationDisplayName(locationName) {
    const displayNames = {
      'warsaw': 'Warsaw, Poland',
      'krakow': 'Kraków, Poland',
      'vienna': 'Vienna, Austria',
      'trieste': 'Trieste, Italy',
      'mediterranean': 'Mediterranean Sea',
      'jaffa': 'Jaffa, Palestine',
      'tel_aviv': 'Tel Aviv Settlement',
      'rishon_lezion': 'Rishon LeZion',
      'rehovot': 'Rehovot',
      'hebron': 'Hebron',
      'bethlehem': 'Bethlehem',
      'jerusalem': 'Jerusalem'
    };
    
    return displayNames[locationName.toLowerCase()] || locationName;
  }

  getLocationDescription(locationName) {
    const descriptions = {
      'warsaw': 'Preparing to depart for Eretz Yisrael',
      'krakow': 'The ancient Jewish quarter of Kazimierz',
      'vienna': 'Capital of the Austro-Hungarian Empire',
      'trieste': 'Gateway to the Mediterranean',
      'mediterranean': 'Crossing the ancient sea',
      'jaffa': 'Ancient port city of Palestine',
      'tel_aviv': 'A city rising from the sand dunes',
      'rishon_lezion': 'First to Zion — pioneer vineyards',
      'rehovot': 'Self-reliant agricultural settlement',
      'hebron': 'City of the Patriarchs',
      'bethlehem': 'Ancient hillside town',
      'jerusalem': 'The Holy City — your destination'
    };
    
    return descriptions[locationName.toLowerCase()] || 'On the journey to Zion';
  }
}

// Make available globally
window.ZionistH = window.ZionistH || {};
window.ZionistH.Game = Game;
