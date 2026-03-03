/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// Init.js - Zionist Trail Oregon Trail Style

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Show a random historical fact while loading
    if (ZionistH && ZionistH.LOADING_FACTS) {
      const randomFact = ZionistH.LOADING_FACTS[Math.floor(Math.random() * ZionistH.LOADING_FACTS.length)];
      console.log(`Loading Zionist Trail... Did you know: ${randomFact}`);
    }
    
    // Initialize the global namespace
    window.ZionistH = window.ZionistH || {};
    
    // Initialize UI first (independent of Game class)
    if (window.ZionistH.UI) {
      window.ZionistH.uiInstance = new window.ZionistH.UI();
      console.log('✅ UI initialized successfully');
    } else {
      console.error('❌ UI class not available');
    }
    
    // Initialize the game after UI is ready
    if (window.ZionistH.Game) {
      window.ZionistH.gameInstance = new window.ZionistH.Game();
      console.log('✅ Game initialized successfully');
    } else {
      console.error('❌ Game class not available');
    }
    
    // Show initial UI state
    console.log('🌟 Zionist Trail loaded successfully!');
    console.log('🎮 Oregon Trail-style interface ready');
    
  } catch (error) {
    console.error('❌ Failed to initialize game:', error);
    alert('Failed to load game. Please refresh the page.');
  }
});
