/* eslint-disable no-undef */
// VisualOverlayManager.js - Manages visual overlays in the top section of the game

class VisualOverlayManager {
  constructor(gameState, ui) {
    this.gameState = gameState;
    this.ui = ui;
    this.currentOverlay = 'travel-overlay';
    this.overlayContainer = null;
    this.isTransitioning = false;
    
    // Initialize activity completion tracking
    this.initializeActivityTracking();
    
    console.log('🎨 VisualOverlayManager initialized');
  }

  initialize() {
    // Get reference to overlay container once DOM is ready
    this.overlayContainer = document.getElementById('visual-overlay-container');
    if (!this.overlayContainer) {
      console.error('❌ visual-overlay-container not found in DOM');
      return false;
    }
    
    console.log('✅ VisualOverlayManager connected to DOM');
    return true;
  }

  initializeActivityTracking() {
    // Initialize activity completion tracking in game state if not exists
    if (!this.gameState.activities) {
      this.gameState.activities = {
        warsaw: {
          completed: false,
          miniGames: {
            packWagon: { completed: false, score: 0 },
            convinceFamily: { completed: false, score: 0 },
            escapePaperwork: { completed: false, score: 0 }
          }
        },
        vienna: {
          completed: false,
          miniGames: {
            navigateStation: { completed: false, score: 0 },
            helpTraveler: { completed: false, score: 0 },
            blackMarketTrade: { completed: false, score: 0 }
          }
        }
      };
      
      console.log('📋 Initialized activity tracking system');
    }
  }

  // Main method to show activity overlays
  showActivity(location, activityType = 'main') {
    if (this.isTransitioning) {
      console.warn('⚠️ Overlay transition in progress, ignoring request');
      return;
    }

    console.log(`🎭 Showing activity: ${location} - ${activityType}`);
    
    const overlayId = `${location}-activity-overlay`;
    this.showOverlay(overlayId);
    
    // Update current activity in game state
    this.gameState.currentActivity = {
      location: location,
      type: activityType,
      active: true
    };
    
    // Initialize location-specific activity if needed
    this.initializeLocationActivity(location);
  }

  // Show mini-game overlay
  showMiniGame(gameType, config = {}) {
    if (this.isTransitioning) {
      console.warn('⚠️ Overlay transition in progress, ignoring mini-game request');
      return;
    }

    console.log(`🎮 Launching mini-game: ${gameType}`);
    
    // Show mini-game overlay
    this.showOverlay('minigame-overlay');
    
    // Update game state
    this.gameState.currentMiniGame = {
      type: gameType,
      config: config,
      active: true,
      startTime: Date.now()
    };
    
    // Load mini-game content dynamically
    this.loadMiniGameContent(gameType, config);
  }

  // Show default traveling scene
  showTravelScene() {
    console.log('🚶 Showing travel scene');
    this.showOverlay('travel-overlay');
    
    // Clear current activity
    this.gameState.currentActivity = null;
    this.gameState.currentMiniGame = null;
  }

  // Core overlay switching method
  showOverlay(targetOverlayId) {
    if (!this.overlayContainer) {
      console.error('❌ Overlay container not initialized');
      return;
    }

    if (this.currentOverlay === targetOverlayId) {
      console.log(`ℹ️ Overlay ${targetOverlayId} already active`);
      return;
    }

    this.isTransitioning = true;

    // Fade out current overlay
    const currentEl = document.getElementById(this.currentOverlay);
    if (currentEl) {
      currentEl.classList.add('fading-out');
      
      setTimeout(() => {
        currentEl.classList.remove('active', 'fading-out');
      }, 300);
    }

    // Fade in new overlay
    setTimeout(() => {
      const targetEl = document.getElementById(targetOverlayId);
      if (targetEl) {
        targetEl.classList.add('active');
        this.currentOverlay = targetOverlayId;
        
        console.log(`✅ Switched to overlay: ${targetOverlayId}`);
      } else {
        console.error(`❌ Target overlay not found: ${targetOverlayId}`);
      }
      
      this.isTransitioning = false;
    }, 350);
  }

  // Initialize location-specific activity content
  initializeLocationActivity(location) {
    switch (location) {
      case 'warsaw':
        this.initializeWarsawActivity();
        break;
      case 'vienna':
        this.initializeViennaActivity();
        break;
      default:
        console.warn(`⚠️ No activity handler for location: ${location}`);
    }
  }

  initializeWarsawActivity() {
    const overlay = document.getElementById('warsaw-activity-overlay');
    if (!overlay) return;

    // Update activity content based on completion status
    const activity = this.gameState.activities.warsaw;
    const completedCount = Object.values(activity.miniGames).filter(mg => mg.completed).length;
    
    // Update progress display
    const progressEl = overlay.querySelector('.activity-progress');
    if (progressEl) {
      progressEl.textContent = `Preparation Progress: ${completedCount}/3 tasks completed`;
    }

    // Enable/disable mini-game buttons based on completion
    this.updateMiniGameButtons(overlay, activity.miniGames);
  }

  initializeViennaActivity() {
    const overlay = document.getElementById('vienna-activity-overlay');
    if (!overlay) return;
    const activity = this.gameState.activities.vienna;
    if (!activity) return;
    const completedCount = Object.values(activity.miniGames).filter(mg => mg.completed).length;
    overlay.innerHTML = `
      <div class="activity-scene vienna-transition" style="padding:1rem;">
        <h3>\ud83c\udfdb\ufe0f Vienna Train Station</h3>
        <div class="activity-progress">Preparation Progress: ${completedCount}/3 tasks completed</div>
        <div class="mini-game-triggers" style="margin-top:0.75rem;">
          <button class="minigame-trigger" data-minigame="navigateStation" data-game-title="Navigate the Station" onclick="window.ZionistH.visualOverlayManager.showMiniGame('navigateStation')" style="display:block;width:100%;margin:6px 0;padding:10px;cursor:pointer;border-radius:6px;border:1px solid #8b7355;background:#f5e6d3;">
            ${activity.miniGames.navigateStation.completed ? '\u2705' : '\ud83d\ude89'} Navigate the Busy Station
          </button>
          <button class="minigame-trigger" data-minigame="helpTraveler" data-game-title="Help a Traveler" onclick="window.ZionistH.visualOverlayManager.showMiniGame('helpTraveler')" style="display:block;width:100%;margin:6px 0;padding:10px;cursor:pointer;border-radius:6px;border:1px solid #8b7355;background:#f5e6d3;">
            ${activity.miniGames.helpTraveler.completed ? '\u2705' : '\ud83e\udd1d'} Help a Fellow Traveler
          </button>
          <button class="minigame-trigger" data-minigame="blackMarketTrade" data-game-title="Black Market Trade" onclick="window.ZionistH.visualOverlayManager.showMiniGame('blackMarketTrade')" style="display:block;width:100%;margin:6px 0;padding:10px;cursor:pointer;border-radius:6px;border:1px solid #8b7355;background:#f5e6d3;">
            ${activity.miniGames.blackMarketTrade.completed ? '\u2705' : '\ud83d\udcb0'} Black Market Trade
          </button>
        </div>
        <button class="retro-btn secondary" onclick="window.ZionistH.visualOverlayManager.showTravelScene()" style="margin-top:0.75rem;">Back to Journey</button>
      </div>`;
  }

  // Update mini-game button states
  updateMiniGameButtons(overlay, miniGames) {
    Object.keys(miniGames).forEach(gameKey => {
      const button = overlay.querySelector(`[data-minigame="${gameKey}"]`);
      if (button) {
        if (miniGames[gameKey].completed) {
          button.classList.add('completed');
          button.innerHTML = `✅ ${button.dataset.gameTitle} (Completed)`;
        } else {
          button.classList.remove('completed');
          button.innerHTML = `🎮 ${button.dataset.gameTitle}`;
        }
      }
    });
  }

  // Load mini-game content dynamically
  loadMiniGameContent(gameType, config) {
    const container = document.getElementById('minigame-overlay');
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    switch (gameType) {
      case 'packWagon':
        this.loadPackWagonGame(container, config);
        break;
      case 'convinceFamily':
        this.loadConvinceFamilyGame(container, config);
        break;
      case 'escapePaperwork':
        this.loadEscapePaperworkGame(container, config);
        break;
      case 'navigateStation':
        this.loadNavigateStationGame(container, config);
        break;
      case 'helpTraveler':
        this.loadHelpTravelerGame(container, config);
        break;
      case 'blackMarketTrade':
        this.loadBlackMarketTradeGame(container, config);
        break;
      default:
        console.error(`❌ Unknown mini-game type: ${gameType}`);
        this.showTravelScene(); // Fallback
    }
  }

  // Mini-game loaders — full implementations
  loadPackWagonGame(container, config) {
    // Drag-and-drop item packing game
    const items = [
      { name: 'Food Barrel', emoji: '🛢️', size: 3, points: 10 },
      { name: 'Medicine Chest', emoji: '💊', size: 2, points: 15 },
      { name: 'Tool Kit', emoji: '🔨', size: 2, points: 10 },
      { name: 'Clothing Bundle', emoji: '👕', size: 1, points: 5 },
      { name: 'Water Jugs', emoji: '💧', size: 2, points: 10 },
      { name: 'Books', emoji: '📚', size: 1, points: 8 },
      { name: 'Cooking Pot', emoji: '🍳', size: 1, points: 5 },
      { name: 'Bedding Roll', emoji: '🛏️', size: 2, points: 7 },
      { name: 'Candles & Lamp', emoji: '🕯️', size: 1, points: 3 },
      { name: 'Torah Scroll', emoji: '📜', size: 1, points: 12 }
    ];
    const wagonCapacity = 12;
    let packed = [];
    let usedSpace = 0;
    let timeLeft = 30;

    const render = () => {
      const avail = items.filter(i => !packed.includes(i));
      const itemsHtml = avail.map((it, idx) => 
        `<button class="pack-item" data-idx="${items.indexOf(it)}" style="margin:4px;padding:6px 10px;cursor:pointer;border-radius:4px;border:1px solid #8b7355;background:#f5e6d3;">${it.emoji} ${it.name} (${it.size})</button>`
      ).join('');
      const packedHtml = packed.map(it => 
        `<div style="display:inline-block;margin:3px;padding:4px 8px;background:#c8a96e;border-radius:4px;">${it.emoji} ${it.name}</div>`
      ).join('');
      
      container.innerHTML = `
        <div class="minigame-container pack-wagon-game" style="padding:1rem;">
          <div class="minigame-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3>📦 Pack Your Wagon</h3>
            <span style="font-weight:bold;">⏱️ ${timeLeft}s</span>
            <button class="minigame-close-btn" onclick="window.ZionistH.visualOverlayManager.closeMiniGame()">×</button>
          </div>
          <p style="margin:0.5rem 0;">Capacity: ${usedSpace}/${wagonCapacity} — Select items to pack them!</p>
          <div style="min-height:60px;padding:8px;background:#2a1f0e;border-radius:6px;margin:0.5rem 0;">
            ${packedHtml || '<em style="color:#8b7355;">Wagon is empty — start packing!</em>'}
          </div>
          <div style="margin-top:0.5rem;">${itemsHtml}</div>
          <div style="margin-top:0.75rem;">
            <button class="retro-btn secondary" onclick="window.ZionistH.visualOverlayManager.closeMiniGame()">Cancel</button>
            <button class="retro-btn primary" id="finish-packing">Finish Packing</button>
          </div>
        </div>`;
      
      container.querySelectorAll('.pack-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const item = items[idx];
          if (usedSpace + item.size <= wagonCapacity) {
            packed.push(item);
            usedSpace += item.size;
            render();
          }
        });
      });
      const finishBtn = container.querySelector('#finish-packing');
      if (finishBtn) finishBtn.addEventListener('click', () => finish());
    };

    const finish = () => {
      clearInterval(timer);
      const score = packed.reduce((s, it) => s + it.points, 0);
      const efficiencyBonus = Math.round((usedSpace / wagonCapacity) * 20);
      const finalScore = Math.min(100, score + efficiencyBonus);
      this.completeMiniGame('packWagon', finalScore);
    };

    const timer = setInterval(() => {
      timeLeft--;
      const el = container.querySelector('.minigame-header span');
      if (el) el.textContent = `⏱️ ${timeLeft}s`;
      if (timeLeft <= 0) finish();
    }, 1000);

    render();
  }

  loadConvinceFamilyGame(container, config) {
    // Dialogue choice persuasion game
    const familyMembers = [
      { name: 'Uncle Yosef', concern: 'Leave our home of 200 years? Where will we sleep?', emoji: '👴' },
      { name: 'Cousin Rivka', concern: 'The Ottomans won\'t let us in. We\'ll be turned away!', emoji: '👩' },
      { name: 'Aunt Miriam', concern: 'I\'m too old for such a journey. The sea will kill me.', emoji: '👵' }
    ];
    let memberIdx = 0;
    let totalScore = 0;

    const responses = [
      [
        { text: 'We\'ll build new homes with our own hands — our own land at last!', score: 30, reply: 'Perhaps you\'re right... our own land would be something.' },
        { text: 'The pogroms are getting worse. We may have no home left soon.', score: 25, reply: 'That is true... last week was terrifying.' },
        { text: 'Just trust me, it will work out.', score: 5, reply: 'That\'s not very convincing...' }
      ],
      [
        { text: 'Jewish settlers have been arriving since 1882 — they found a way, and so will we.', score: 30, reply: 'I didn\'t know pioneers had already established settlements there!' },
        { text: 'We have connections in Jaffa. Papers can be arranged.', score: 20, reply: 'Well, if you have contacts...' },
        { text: 'We\'ll sneak in if we have to.', score: 5, reply: 'That sounds very dangerous...' }
      ],
      [
        { text: 'The sea voyage is only 10 days. I\'ll be by your side the entire time.', score: 30, reply: '*tears up* You would do that for me? Then I\'ll come.' },
        { text: 'The climate in Palestine is warm and good for your health.', score: 20, reply: 'Warm weather does sound nice for these old bones.' },
        { text: 'You\'ll be fine. Stop worrying.', score: 5, reply: '*frowns* Easy for you to say.' }
      ]
    ];

    const renderMember = () => {
      if (memberIdx >= familyMembers.length) {
        const finalScore = Math.min(100, Math.round(totalScore / familyMembers.length));
        this.completeMiniGame('convinceFamily', finalScore);
        return;
      }
      const m = familyMembers[memberIdx];
      const opts = responses[memberIdx];
      const optionsHtml = opts.map((o, i) => 
        `<button class="dialogue-choice" data-idx="${i}" style="display:block;width:100%;text-align:left;margin:6px 0;padding:8px 12px;cursor:pointer;border-radius:4px;border:1px solid #8b7355;background:#f5e6d3;">${o.text}</button>`
      ).join('');
      
      container.innerHTML = `
        <div class="minigame-container convince-family-game" style="padding:1rem;">
          <div class="minigame-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3>💬 Convince Family to Join</h3>
            <span>Person ${memberIdx + 1}/${familyMembers.length}</span>
            <button class="minigame-close-btn" onclick="window.ZionistH.visualOverlayManager.closeMiniGame()">×</button>
          </div>
          <div style="margin:0.75rem 0;padding:12px;background:#2a1f0e;border-radius:6px;">
            <div style="font-size:1.5em;margin-bottom:4px;">${m.emoji} <strong>${m.name}</strong></div>
            <p style="color:#d4c5a9;font-style:italic;">"${m.concern}"</p>
          </div>
          <p style="margin:0.5rem 0;">Choose your response wisely:</p>
          <div>${optionsHtml}</div>
        </div>`;
      
      container.querySelectorAll('.dialogue-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const chosen = opts[idx];
          totalScore += chosen.score;
          container.querySelector('.minigame-container').innerHTML += `
            <div style="margin-top:8px;padding:10px;background:#3a2f1e;border-radius:6px;">
              <p style="color:#c8a96e;">${m.emoji} ${m.name}: "${chosen.reply}"</p>
              <p style="color:#8b7355;">+${chosen.score} persuasion</p>
            </div>`;
          setTimeout(() => { memberIdx++; renderMember(); }, 1500);
        });
      });
    };

    renderMember();
  }

  loadEscapePaperworkGame(container, config) {
    // Timed document-sorting puzzle
    const documents = [
      { name: 'Travel Permit', stamp: '🔵', category: 'travel' },
      { name: 'Health Certificate', stamp: '🟢', category: 'health' },
      { name: 'Identity Papers', stamp: '🔴', category: 'identity' },
      { name: 'Property Deed', stamp: '🟡', category: 'property' },
      { name: 'Letter of Passage', stamp: '🔵', category: 'travel' },
      { name: 'Vaccination Record', stamp: '🟢', category: 'health' },
      { name: 'Birth Certificate', stamp: '🔴', category: 'identity' },
      { name: 'Customs Form', stamp: '🟡', category: 'property' }
    ];
    const categories = { travel: '🔵 Travel', health: '🟢 Health', identity: '🔴 Identity', property: '🟡 Property' };
    let sorted = { travel: [], health: [], identity: [], property: [] };
    let remaining = [...documents].sort(() => Math.random() - 0.5);
    let timeLeft = 25;
    let score = 0;

    const render = () => {
      const docHtml = remaining.map((d, i) => 
        `<div class="doc-card" data-idx="${i}" style="display:inline-block;margin:4px;padding:8px;background:#f5e6d3;border:1px solid #8b7355;border-radius:4px;cursor:pointer;">${d.stamp} ${d.name}</div>`
      ).join('');
      
      const bins = Object.entries(categories).map(([key, label]) => {
        const items = sorted[key].map(d => `<small>${d.stamp} ${d.name}</small>`).join('<br>');
        return `<div class="sort-bin" data-cat="${key}" style="flex:1;min-height:60px;margin:3px;padding:6px;background:#2a1f0e;border:2px dashed #8b7355;border-radius:6px;text-align:center;">
          <div style="font-weight:bold;margin-bottom:4px;">${label}</div>
          ${items}
        </div>`;
      }).join('');
      
      container.innerHTML = `
        <div class="minigame-container" style="padding:1rem;">
          <div class="minigame-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3>📋 Sort the Paperwork</h3>
            <span style="font-weight:bold;">⏱️ ${timeLeft}s</span>
            <button class="minigame-close-btn" onclick="window.ZionistH.visualOverlayManager.closeMiniGame()">×</button>
          </div>
          <p style="margin:0.5rem 0;">Select a document, then select the correct category bin. ${remaining.length} left!</p>
          <div style="margin:0.5rem 0;">${docHtml}</div>
          <div style="display:flex;margin-top:0.5rem;">${bins}</div>
        </div>`;
      
      let selectedDoc = null;
      container.querySelectorAll('.doc-card').forEach(card => {
        card.addEventListener('click', () => {
          container.querySelectorAll('.doc-card').forEach(c => c.style.outline = 'none');
          card.style.outline = '2px solid gold';
          selectedDoc = parseInt(card.dataset.idx);
        });
      });
      container.querySelectorAll('.sort-bin').forEach(bin => {
        bin.addEventListener('click', () => {
          if (selectedDoc === null) return;
          const doc = remaining[selectedDoc];
          if (doc.category === bin.dataset.cat) {
            sorted[doc.category].push(doc);
            remaining.splice(selectedDoc, 1);
            score += 12;
            if (remaining.length === 0) finish();
            else render();
          } else {
            score = Math.max(0, score - 5);
            bin.style.borderColor = 'red';
            setTimeout(() => { bin.style.borderColor = '#8b7355'; }, 500);
          }
          selectedDoc = null;
        });
      });
    };

    const finish = () => {
      clearInterval(timer);
      const timeBonus = timeLeft * 2;
      const finalScore = Math.min(100, score + timeBonus);
      this.completeMiniGame('escapePaperwork', finalScore);
    };

    const timer = setInterval(() => {
      timeLeft--;
      const el = container.querySelector('.minigame-header span');
      if (el) el.textContent = `⏱️ ${timeLeft}s`;
      if (timeLeft <= 0) finish();
    }, 1000);

    render();
  }

  // === Vienna Mini-Games ===

  loadNavigateStationGame(container, config) {
    // Memory/matching game — find the correct platform
    const platforms = [
      { label: 'Platform 1 — Trieste Express', correct: true },
      { label: 'Platform 2 — Budapest Local', correct: false },
      { label: 'Platform 3 — Prague Overnight', correct: false },
      { label: 'Platform 4 — Salzburg Scenic', correct: false },
      { label: 'Platform 5 — Trieste Cargo (wrong class)', correct: false }
    ];
    let cluesFound = 0;
    const clues = [
      'A porter says: "Trieste? Platform 1, departing at noon."',
      'A sign reads: "Platform 1 — Adriatic Coast Express"',
      'An old traveler warns: "Avoid Platform 5 — that\'s freight only!"'
    ];
    let clueIdx = 0;
    let timeLeft = 20;

    const shuffled = [...platforms].sort(() => Math.random() - 0.5);

    const render = () => {
      const plats = shuffled.map((p, i) =>
        `<button class="platform-btn" data-idx="${i}" style="display:block;width:100%;margin:6px 0;padding:10px;cursor:pointer;border-radius:4px;border:1px solid #8b7355;background:#f5e6d3;">🚂 ${p.label}</button>`
      ).join('');
      container.innerHTML = `
        <div class="minigame-container" style="padding:1rem;">
          <div class="minigame-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3>🚉 Navigate Vienna Station</h3>
            <span style="font-weight:bold;">⏱️ ${timeLeft}s</span>
            <button class="minigame-close-btn" onclick="window.ZionistH.visualOverlayManager.closeMiniGame()">×</button>
          </div>
          <p>Find the correct platform to Trieste! Ask for clues or guess.</p>
          <div style="margin:0.5rem 0;padding:8px;background:#2a1f0e;border-radius:6px;min-height:30px;color:#d4c5a9;" id="clue-area">
            ${clueIdx > 0 ? clues.slice(0, clueIdx).map(c => `<p>💡 ${c}</p>`).join('') : '<em>No clues yet — ask around!</em>'}
          </div>
          <button id="ask-clue" style="margin:4px 0;padding:6px 12px;cursor:pointer;" class="retro-btn secondary">${clueIdx < clues.length ? 'Ask for a clue (-3s)' : 'No more clues'}</button>
          <div style="margin-top:0.5rem;">${plats}</div>
        </div>`;

      container.querySelector('#ask-clue').addEventListener('click', () => {
        if (clueIdx < clues.length) { clueIdx++; timeLeft = Math.max(1, timeLeft - 3); render(); }
      });
      container.querySelectorAll('.platform-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = shuffled[parseInt(btn.dataset.idx)];
          clearInterval(timer);
          if (p.correct) {
            const speedBonus = timeLeft * 3;
            this.completeMiniGame('navigateStation', Math.min(100, 50 + speedBonus));
          } else {
            btn.style.background = '#a03030'; btn.style.color = '#fff';
            timeLeft = Math.max(1, timeLeft - 5);
            timer2 = setInterval(tick, 1000);
          }
        });
      });
    };

    let timer2;
    const tick = () => { timeLeft--; const el = container.querySelector('.minigame-header span'); if (el) el.textContent = `⏱️ ${timeLeft}s`; if (timeLeft <= 0) { clearInterval(timer2); this.completeMiniGame('navigateStation', 20); } };
    const timer = setInterval(tick, 1000);
    render();
  }

  loadHelpTravelerGame(container, config) {
    // Quick-time event: help a fellow traveler carry luggage
    const tasks = [
      { text: 'Carry a heavy trunk up the stairs', key: 'C', time: 3 },
      { text: 'Catch a bag falling off the cart', key: 'G', time: 2 },
      { text: 'Help lift a child onto the train', key: 'H', time: 3 },
      { text: 'Push the stuck luggage cart forward', key: 'P', time: 2.5 }
    ];
    let taskIdx = 0;
    let score = 0;
    let waitingForKey = false;
    let taskTimer = null;

    const renderTask = () => {
      if (taskIdx >= tasks.length) {
        const finalScore = Math.min(100, Math.round((score / tasks.length) * 100 / 25));
        document.removeEventListener('keydown', keyHandler);
        this.completeMiniGame('helpTraveler', Math.max(10, finalScore));
        return;
      }
      const t = tasks[taskIdx];
      container.innerHTML = `
        <div class="minigame-container" style="padding:1rem;text-align:center;">
          <div class="minigame-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3>🤝 Help a Fellow Traveler</h3>
            <span>Task ${taskIdx + 1}/${tasks.length}</span>
            <button class="minigame-close-btn" onclick="window.ZionistH.visualOverlayManager.closeMiniGame()">×</button>
          </div>
          <div style="margin:1.5rem 0;padding:16px;background:#2a1f0e;border-radius:8px;">
            <p style="font-size:1.2em;color:#d4c5a9;">${t.text}</p>
            <p style="font-size:2em;margin-top:0.5rem;color:gold;">Press <strong>${t.key}</strong> now!</p>
          </div>
          <div style="color:#8b7355;">Score: ${score}</div>
        </div>`;
      waitingForKey = true;
      taskTimer = setTimeout(() => {
        if (waitingForKey) { waitingForKey = false; taskIdx++; renderTask(); }
      }, t.time * 1000);
    };

    const keyHandler = (e) => {
      if (!waitingForKey) return;
      if (e.key.toUpperCase() === tasks[taskIdx].key) {
        waitingForKey = false;
        clearTimeout(taskTimer);
        score += 25;
        taskIdx++;
        renderTask();
      }
    };
    document.addEventListener('keydown', keyHandler);
    renderTask();
  }

  loadBlackMarketTradeGame(container, config) {
    // Haggling mini-game — negotiate a price
    const targetPrice = 15 + Math.floor(Math.random() * 10); // 15-24
    const startPrice = targetPrice + 20;
    let sellerPrice = startPrice;
    let yourOffer = 0;
    let rounds = 0;
    const maxRounds = 5;

    const render = () => {
      container.innerHTML = `
        <div class="minigame-container" style="padding:1rem;">
          <div class="minigame-header" style="display:flex;justify-content:space-between;align-items:center;">
            <h3>💰 Black Market Trade</h3>
            <span>Round ${rounds + 1}/${maxRounds}</span>
            <button class="minigame-close-btn" onclick="window.ZionistH.visualOverlayManager.closeMiniGame()">×</button>
          </div>
          <div style="margin:0.75rem 0;padding:12px;background:#2a1f0e;border-radius:6px;">
            <p style="color:#d4c5a9;">A shady figure offers forged transit papers for the Ottoman border.</p>
            <p style="font-size:1.2em;margin-top:4px;">His price: <strong style="color:gold;">${sellerPrice} rubles</strong></p>
          </div>
          <p>Name your counter-offer:</p>
          <div style="display:flex;gap:6px;margin:0.5rem 0;">
            <button class="offer-btn retro-btn" data-amt="${Math.round(sellerPrice * 0.5)}">${Math.round(sellerPrice * 0.5)} rubles</button>
            <button class="offer-btn retro-btn" data-amt="${Math.round(sellerPrice * 0.65)}">${Math.round(sellerPrice * 0.65)} rubles</button>
            <button class="offer-btn retro-btn" data-amt="${Math.round(sellerPrice * 0.8)}">${Math.round(sellerPrice * 0.8)} rubles</button>
            <button class="offer-btn retro-btn primary" data-amt="${sellerPrice}">Accept ${sellerPrice}</button>
          </div>
          <p style="color:#8b7355;font-size:0.85em;">Fair value is roughly ${targetPrice}-${targetPrice + 5} rubles.</p>
        </div>`;

      container.querySelectorAll('.offer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          yourOffer = parseInt(btn.dataset.amt);
          rounds++;
          if (yourOffer >= sellerPrice || rounds >= maxRounds) {
            // Deal accepted
            const savings = startPrice - yourOffer;
            const score = Math.min(100, Math.round((savings / (startPrice - targetPrice)) * 80) + 20);
            this.completeMiniGame('blackMarketTrade', score);
          } else {
            // Seller counters
            sellerPrice = Math.max(targetPrice, Math.round(sellerPrice - (sellerPrice - yourOffer) * 0.4));
            render();
          }
        });
      });
    };

    render();
  }

  // Complete mini-game and update progress
  completeMiniGame(gameType, score) {
    console.log(`🎯 Mini-game completed: ${gameType} with score ${score}`);
    
    // Update game state
    const currentActivity = this.gameState.currentActivity;
    if (currentActivity && this.gameState.activities[currentActivity.location]) {
      const activity = this.gameState.activities[currentActivity.location];
      if (activity.miniGames[gameType]) {
        activity.miniGames[gameType].completed = true;
        activity.miniGames[gameType].score = score;
        
        // Check if all mini-games are completed
        const allCompleted = Object.values(activity.miniGames).every(mg => mg.completed);
        if (allCompleted) {
          activity.completed = true;
          console.log(`🎉 All activities completed for ${currentActivity.location}!`);
          
          // Show completion message
          this.ui.logMessage(`All ${currentActivity.location} preparations completed!`, 'positive');
        }
      }
    }
    
    // Return to activity view
    this.showActivity(currentActivity.location);
  }

  // Close mini-game and return to activity
  closeMiniGame() {
    console.log('❌ Mini-game closed');
    
    const currentActivity = this.gameState.currentActivity;
    if (currentActivity) {
      this.showActivity(currentActivity.location);
    } else {
      this.showTravelScene();
    }
  }

  // Check if location activities are available
  hasActivities(location) {
    return this.gameState.activities && this.gameState.activities[location];
  }

  // Get activity completion status
  getActivityStatus(location) {
    if (!this.hasActivities(location)) return null;
    
    const activity = this.gameState.activities[location];
    const completedGames = Object.values(activity.miniGames).filter(mg => mg.completed).length;
    const totalGames = Object.keys(activity.miniGames).length;
    
    return {
      completed: activity.completed,
      progress: `${completedGames}/${totalGames}`,
      percentage: Math.round((completedGames / totalGames) * 100)
    };
  }
}

// Make available globally
window.ZionistH = window.ZionistH || {};
window.ZionistH.VisualOverlayManager = VisualOverlayManager;
