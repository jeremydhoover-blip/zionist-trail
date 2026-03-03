/* eslint-disable no-undef */
// RetroUI.js - Oregon Trail Style UI Overlay Controller

class RetroUI {
  constructor() {
    this.isActive = false;
    this.currentTerrain = 'plains';
    this.currentWeather = 'fair';
    this.currentPace = 'normal';
    this.gameState = null;
    this.updateInterval = null;
    
    this.setupEventListeners();
    console.log('🕹️ RetroUI initialized');
  }

  setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isActive) {
        switch(e.key) {
          case 'Enter':
          case ' ':
            this.handleReturnKey();
            break;
          case 'r':
          case 'R':
            if (e.ctrlKey) {
              this.toggleRetroMode();
            }
            break;
          case 'c':
          case 'C':
            if (e.ctrlKey) {
              this.toggleCRTEffect();
            }
            break;
        }
      }
    });

    // Click handler for dialog boxes
    document.addEventListener('click', (e) => {
      if (e.target.closest('#retro-dialog') && this.isActive) {
        this.hideDialog();
      }
    });
  }

  // Main activation/deactivation methods
  activateRetroMode() {
    if (this.isActive) return;
    
    console.log('🎮 Activating Oregon Trail mode...');
    this.isActive = true;
    
    // Show retro UI elements
    document.getElementById('retro-landscape-strip').classList.remove('retro-ui-hidden');
    document.getElementById('retro-status-bar').classList.remove('retro-ui-hidden');
    
    // Add retro class to body for global adjustments
    document.body.classList.add('retro-ui-active');
    
    // Start update loop
    this.startUpdateLoop();
    
    // Show welcome dialog
    this.showDialog('Welcome to the Zionist Trail! Experience the authentic Oregon Trail interface.');
    
    console.log('✅ Oregon Trail mode activated');
  }

  deactivateRetroMode() {
    if (!this.isActive) return;
    
    console.log('🎮 Deactivating Oregon Trail mode...');
    this.isActive = false;
    
    // Hide retro UI elements
    document.getElementById('retro-landscape-strip').classList.add('retro-ui-hidden');
    document.getElementById('retro-status-bar').classList.add('retro-ui-hidden');
    document.getElementById('retro-dialog').classList.add('retro-ui-hidden');
    document.getElementById('retro-crt-overlay').classList.add('retro-ui-hidden');
    
    // Remove retro class from body
    document.body.classList.remove('retro-ui-active');
    
    // Stop update loop
    this.stopUpdateLoop();
    
    console.log('✅ Oregon Trail mode deactivated');
  }

  toggleRetroMode() {
    if (this.isActive) {
      this.deactivateRetroMode();
    } else {
      this.activateRetroMode();
    }
  }

  // Update loop for real-time data
  startUpdateLoop() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      this.updateStatusBar();
      this.updateLandscapeElements();
    }, 1000);
  }

  stopUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Status bar management
  updateStatusBar() {
    if (!this.isActive) return;

    // Get game state data
    const gameData = this.getGameStateData();
    
    // Update date
    document.getElementById('retro-date').textContent = gameData.date;
    
    // Update weather
    document.getElementById('retro-weather').textContent = gameData.weather;
    this.updateWeatherIcon(gameData.weather);
    
    // Update health with color coding
    const healthEl = document.getElementById('retro-health');
    healthEl.textContent = gameData.health;
    healthEl.className = 'status-value ' + gameData.healthClass;
    
    // Update food with color coding
    const foodEl = document.getElementById('retro-food');
    foodEl.textContent = gameData.food;
    foodEl.className = 'status-value ' + gameData.foodClass;
    
    // Update money
    document.getElementById('retro-money').textContent = gameData.money;
    
    // Update distance
    document.getElementById('retro-distance').textContent = gameData.distance;
    
    // Update next landmark
    document.getElementById('next-landmark').textContent = gameData.nextLandmark;
    document.getElementById('miles-to-landmark').textContent = gameData.milesToLandmark;
  }

  updateWeatherIcon(weather) {
    const iconEl = document.getElementById('retro-weather-icon');
    const weatherIcons = {
      'Fair': 'weather-icons-sun.png',
      'Sunny': 'weather-icons-sun.png',
      'Cloudy': 'weather-icons-cloudy.png',
      'Rainy': 'weather-icons-rain.png',
      'Stormy': 'weather-icons-lightning.png',
      'Hot': 'weather-icons-sun.png',
      'Cold': 'weather-icons-cloudy.png'
    };
    
    const iconFile = weatherIcons[weather] || 'weather-icons-sun.png';
    iconEl.src = `images/${iconFile}`;
  }

  getGameStateData() {
    // Try to get data from game instance
    if (window.ZionistH && window.ZionistH.gameInstance) {
      const game = window.ZionistH.gameInstance;
      const gameState = game.gameState;
      
      if (gameState) {
        const location = gameState.getCurrentLocation(game.storyConfig);
        
        return {
          date: gameState.getFormattedDate(),
          weather: gameState.weather || 'Fair',
          health: gameState.getHealthStatus() || 'Good',
          healthClass: this.getHealthClass(gameState.groupHealth || 100),
          food: Math.ceil(gameState.inventory?.food || 0) + ' lbs',
          foodClass: this.getFoodClass(gameState.inventory?.food || 0),
          money: '$' + (gameState.money || 0),
          distance: Math.ceil(gameState.distanceTraveled || 0),
          nextLandmark: location?.name || 'Unknown',
          milesToLandmark: this.calculateMilesToLandmark(gameState, location)
        };
      }
    }
    
    // Fallback default data
    return {
      date: 'March 15, 1909',
      weather: 'Fair',
      health: 'Good',
      healthClass: '',
      food: '500 lbs',
      foodClass: '',
      money: '$400',
      distance: '0',
      nextLandmark: 'Vienna',
      milesToLandmark: '245'
    };
  }

  calculateMilesToLandmark(gameState, location) {
    if (location && location.distanceToNext && gameState.segmentDistance !== undefined) {
      return Math.max(0, Math.ceil(location.distanceToNext - gameState.segmentDistance));
    }
    return '?';
  }

  formatGameDate(day) {
    // Legacy fallback — prefer GameState.getFormattedDate()
    const startDate = new Date(1909, 2, 15);
    const currentDate = new Date(startDate.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }

  getHealthClass(health) {
    if (health >= 80) return '';
    if (health >= 60) return 'fair';
    if (health >= 40) return 'poor';
    return 'critical';
  }

  getFoodClass(food) {
    if (food >= 200) return '';
    if (food >= 50) return 'low';
    return 'critical';
  }

  // Landscape management
  updateLandscapeElements() {
    if (!this.isActive) return;
    
    this.updateTerrainBasedOnLocation();
    this.updateWeatherEffects();
    this.updateWagonAnimation();
  }

  updateTerrainBasedOnLocation() {
    // Get current location from game state
    const gameData = this.getGameStateData();
    const location = gameData.nextLandmark.toLowerCase();
    
    let newTerrain = 'plains';
    
    if (location.includes('sea') || location.includes('mediterranean') || 
        location.includes('haifa') || location.includes('jaffa')) {
      newTerrain = 'sea';
    } else if (location.includes('mountain') || location.includes('galilee')) {
      newTerrain = 'mountains';
    } else if (location.includes('desert') || location.includes('negev')) {
      newTerrain = 'desert';
    }
    
    if (newTerrain !== this.currentTerrain) {
      this.setTerrain(newTerrain);
    }
  }

  setTerrain(terrain) {
    const landscapeStrip = document.getElementById('retro-landscape-strip');
    
    // Remove old terrain class
    landscapeStrip.classList.remove(`retro-terrain-${this.currentTerrain}`);
    
    // Add new terrain class
    landscapeStrip.classList.add(`retro-terrain-${terrain}`);
    
    this.currentTerrain = terrain;
    console.log(`🏞️ Terrain changed to: ${terrain}`);
  }

  updateWeatherEffects() {
    const gameData = this.getGameStateData();
    const weather = gameData.weather.toLowerCase();
    
    if (weather !== this.currentWeather) {
      this.setWeather(weather);
    }
  }

  setWeather(weather) {
    const weatherOverlay = document.querySelector('.landscape-weather');
    
    // Remove old weather classes
    weatherOverlay.classList.remove('rain', 'storm', 'snow');
    
    // Add new weather class
    if (weather.includes('rain') || weather.includes('stormy')) {
      weatherOverlay.classList.add('rain');
    } else if (weather.includes('storm')) {
      weatherOverlay.classList.add('storm');
    }
    
    this.currentWeather = weather;
  }

  updateWagonAnimation() {
    const wagonContainer = document.querySelector('.wagon-container');
    
    // Remove old pace classes
    wagonContainer.classList.remove('wagon-stopped', 'wagon-slow', 'wagon-fast');
    
    // Add current pace class
    wagonContainer.classList.add(`wagon-${this.currentPace}`);
  }

  setPace(pace) {
    this.currentPace = pace;
    this.updateWagonAnimation();
    console.log(`🚶 Pace changed to: ${pace}`);
  }

  // Dialog system
  showDialog(text, autoHide = false) {
    if (!this.isActive) return;
    
    const dialog = document.getElementById('retro-dialog');
    const textEl = document.getElementById('retro-dialog-text');
    
    textEl.textContent = text;
    dialog.classList.remove('retro-ui-hidden');
    dialog.classList.add('retro-fade-in');
    
    if (autoHide) {
      setTimeout(() => this.hideDialog(), 3000);
    }
  }

  hideDialog() {
    const dialog = document.getElementById('retro-dialog');
    dialog.classList.add('retro-ui-hidden');
    dialog.classList.remove('retro-fade-in');
  }

  handleReturnKey() {
    // Hide dialog if visible
    const dialog = document.getElementById('retro-dialog');
    if (!dialog.classList.contains('retro-ui-hidden')) {
      this.hideDialog();
      return;
    }
    
    // Otherwise, trigger continue action in game
    if (window.ZionistH && window.ZionistH.gameInstance) {
      // Try to continue the game or trigger daily choice
      if (window.ZionistH.gameInstance.dailyDecision) {
        window.ZionistH.gameInstance.dailyDecision.handleDailyChoice('continue');
      }
    }
  }

  // CRT effects
  toggleCRTEffect() {
    const crtOverlay = document.getElementById('retro-crt-overlay');
    
    if (crtOverlay.classList.contains('retro-ui-hidden')) {
      crtOverlay.classList.remove('retro-ui-hidden');
      console.log('📺 CRT effect enabled');
    } else {
      crtOverlay.classList.add('retro-ui-hidden');
      console.log('📺 CRT effect disabled');
    }
  }

  // Event notifications
  showEventNotification(title, message) {
    this.showDialog(`${title}: ${message}`, true);
  }

  showResourceWarning(resource, amount) {
    const warnings = {
      food: `⚠️ Food running low! Only ${amount} lbs remaining.`,
      water: `⚠️ Water critically low! Only ${amount} gallons left.`,
      health: `🚨 Party health is poor! Consider resting.`,
      money: `💰 Money running low! Only $${amount} remaining.`
    };
    
    if (warnings[resource]) {
      this.showDialog(warnings[resource], true);
    }
  }

  // Integration with existing game systems
  connectToGame(gameInstance) {
    this.gameState = gameInstance;
    console.log('🔗 RetroUI connected to game instance');
  }

  // Utility methods
  updateFromGameEvent(eventType, data) {
    switch(eventType) {
      case 'day_advance':
        this.updateStatusBar();
        break;
      case 'location_change':
        this.setTerrain(data.terrain);
        this.showDialog(`Arrived at ${data.location}`, true);
        break;
      case 'weather_change':
        this.setWeather(data.weather);
        break;
      case 'pace_change':
        this.setPace(data.pace);
        break;
      case 'resource_warning':
        this.showResourceWarning(data.resource, data.amount);
        break;
      case 'event_notification':
        this.showEventNotification(data.title, data.message);
        break;
    }
  }

  // Quick access methods for common actions
  quickStart() {
    this.activateRetroMode();
    this.showDialog('Your journey to Eretz Yisrael begins! Use ENTER to continue and Ctrl+R to toggle retro mode.');
  }

  quickDemo() {
    this.activateRetroMode();
    
    // Demo sequence
    setTimeout(() => {
      this.setTerrain('desert');
      this.showDialog('Traveling through the desert...', true);
    }, 2000);
    
    setTimeout(() => {
      this.setWeather('stormy');
      this.showDialog('A storm approaches!', true);
    }, 5000);
    
    setTimeout(() => {
      this.setPace('slow');
      this.showDialog('Slowing down due to weather...', true);
    }, 8000);
  }
}

// Global initialization and access
window.ZionistH = window.ZionistH || {};
window.ZionistH.RetroUI = RetroUI;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  if (!window.ZionistH.retroUI) {
    window.ZionistH.retroUI = new RetroUI();
    console.log('🎮 RetroUI auto-initialized');
  }
});

// Global keyboard shortcuts (when not in retro mode)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    // Ctrl+Shift+R to quick start retro mode
    if (window.ZionistH.retroUI) {
      window.ZionistH.retroUI.quickStart();
    }
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RetroUI;
}
