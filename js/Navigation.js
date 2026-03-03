/* eslint-disable no-undef */
// Navigation.js - Global navigation functions for Zionist Trail

// Global navigation functions
function goBackToIntroduction() {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    window.ZionistH.uiInstance.showOverlay('introduction-story');
  }
}

function goBackToCharacterSelection() {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    window.ZionistH.uiInstance.showOverlay('character-selection');
  }
}

function goBackToPartyMeeting() {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    window.ZionistH.uiInstance.showOverlay('meet-party');
  }
}

function goBackToPartySelection() {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    window.ZionistH.uiInstance.showOverlay('enhanced-party-selection');
  }
}

function returnToMainGame() {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    if (window.ZionistH.gameInstance && window.ZionistH.gameInstance.dailyDecision) {
      // Return to daily decision screen if in main game
      window.ZionistH.gameInstance.dailyDecision.showDailyChoices();
    } else {
      // Fallback to main game screen
      window.ZionistH.uiInstance.showOverlay('main-game');
    }
  }
}

// Global overlay close function
function closeOverlay(overlayId) {
  // For game-time modals (shown over main game), use hideGameModal
  const gameTimeModals = ['supplies-overlay', 'pace-overlay', 'trading-overlay'];
  if (gameTimeModals.includes(overlayId) && window.ZionistH && window.ZionistH.uiInstance) {
    window.ZionistH.uiInstance.hideGameModal(overlayId);
    return;
  }
  
  // Otherwise, hide the specific overlay
  if (overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) overlay.classList.remove('active');
  }
  
  // Return to appropriate game screen
  if (window.ZionistH && window.ZionistH.gameInstance && window.ZionistH.gameInstance.gameLoopActive) {
    returnToMainGame();
  }
}

// Enhanced closeOverlay with specific context
function closeOverlayToContext(overlayId, targetContext = 'auto') {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    switch (targetContext) {
      case 'daily-decision':
        returnToMainGame();
        break;
      case 'main-game':
        window.ZionistH.uiInstance.showOverlay('main-game');
        break;
      case 'auto':
      default:
        closeOverlay(overlayId);
        break;
    }
  }
}

// Make functions available globally
window.goBackToIntroduction = goBackToIntroduction;
window.goBackToCharacterSelection = goBackToCharacterSelection;
window.goBackToPartyMeeting = goBackToPartyMeeting;
window.goBackToPartySelection = goBackToPartySelection;
window.returnToMainGame = returnToMainGame;
window.closeOverlay = closeOverlay;
window.closeOverlayToContext = closeOverlayToContext;

// Modal functions
function closeCandidateModal() {
  const modal = document.getElementById('candidate-details-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function selectCandidateFromModal() {
  if (window.ZionistH && window.ZionistH.gameInstance && window.ZionistH.gameInstance.partySelection) {
    const partySelection = window.ZionistH.gameInstance.partySelection;
    const candidateIndex = partySelection.currentModalCandidate;
    if (candidateIndex !== undefined) {
      partySelection.toggleCandidateSelection(candidateIndex);
      partySelection.updateModalSelectButton();
      // Close the modal after selecting
      closeCandidateModal();
    }
  }
}

// Control panel action helpers
function triggerDailyChoice(choiceId) {
  if (window.ZionistH && window.ZionistH.gameInstance && window.ZionistH.gameInstance.dailyDecision) {
    window.ZionistH.gameInstance.dailyDecision.handleDailyChoice(choiceId);
  }
}

function showSuppliesOverlay() {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    window.ZionistH.uiInstance.showOverlay('supplies-overlay');
  }
}

function showPaceOverlay() {
  if (window.ZionistH && window.ZionistH.uiInstance) {
    window.ZionistH.uiInstance.showOverlay('pace-overlay');
  }
}

function showLocationActions() {
  if (window.ZionistH && window.ZionistH.gameInstance && window.ZionistH.gameInstance.dailyDecision) {
    window.ZionistH.gameInstance.dailyDecision.showDailyChoices();
  }
}

function closeDynamicInfo() {
  const dynamicArea = document.getElementById('dynamic-info-area');
  if (dynamicArea) {
    const panels = dynamicArea.querySelectorAll('.info-panel');
    panels.forEach(panel => panel.classList.add('hidden'));
    dynamicArea.classList.add('hidden');
  }
}

window.closeCandidateModal = closeCandidateModal;
window.selectCandidateFromModal = selectCandidateFromModal;
window.triggerDailyChoice = triggerDailyChoice;
window.showSuppliesOverlay = showSuppliesOverlay;
window.showPaceOverlay = showPaceOverlay;
window.showLocationActions = showLocationActions;
window.closeDynamicInfo = closeDynamicInfo;
