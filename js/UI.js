/* eslint-disable no-undef */
// UI.js - Zionist Trail Oregon Trail Style

class UI {
  constructor() {
    this.currentOverlay = 'title-screen';
    this.selectedProfession = null;
    this.gameStarted = false;
    this.logOpen = false;
    this.game = null; // Reference to game instance
    this.gameState = null; // Reference to game state
    this.setupEventListeners();
  }

  setupEventListeners() {
    // CRITICAL FIX: Add null checks to prevent crashes
    console.log('🔧 Setting up UI event listeners with safety checks...');
    
    // Title screen
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.showOverlay('introduction-story');
      });
      console.log('✅ Start button listener added');
    } else {
      console.warn('⚠️ start-game-btn not found');
    }

    // Introduction story
    const continueBtn = document.getElementById('continue-to-profession');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.showOverlay('character-selection');
      });
      console.log('✅ Continue to profession listener added');
    } else {
      console.warn('⚠️ continue-to-profession not found');
    }

    // Character selection
    const professionCards = document.querySelectorAll('.profession-card');
    if (professionCards.length > 0) {
      professionCards.forEach(card => {
        card.addEventListener('click', () => {
          this.selectProfession(card);
        });
      });
      console.log(`✅ ${professionCards.length} profession card listeners added`);
    } else {
      console.warn('⚠️ No profession cards found');
    }

    const confirmProfessionBtn = document.getElementById('confirm-profession');
    if (confirmProfessionBtn) {
      confirmProfessionBtn.addEventListener('click', () => {
        if (this.selectedProfession && this.game) {
          this.game.selectProfession(this.selectedProfession);
        }
      });
      console.log('✅ Confirm profession listener added');
    } else {
      console.warn('⚠️ confirm-profession not found');
    }

    // Party screen
    const continueToSuppliesBtn = document.getElementById('continue-to-supplies');
    if (continueToSuppliesBtn) {
      continueToSuppliesBtn.addEventListener('click', () => {
        if (this.game) {
          this.game.showInitialSupplies();
        }
      });
      console.log('✅ Continue to supplies listener added');
    } else {
      console.warn('⚠️ continue-to-supplies not found');
    }

    // Supply purchasing
    const qtyButtons = document.querySelectorAll('.qty-btn');
    if (qtyButtons.length > 0) {
      qtyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const button = e.target.closest('.qty-btn');
          if (this.game && button) {
            const item = button.dataset.item;
            const action = button.dataset.action;
            if (item && action && this.game.currentPurchases) {
              const step = item === 'food' ? 20 : 1;
              const prev = this.game.currentPurchases[item] || 0;
              if (action === 'increase') {
                this.game.currentPurchases[item] = prev + step;
              } else if (action === 'decrease') {
                this.game.currentPurchases[item] = Math.max(0, prev - step);
              }
              // Roll back if over budget
              if (this.game.calculateSupplyCost() > this.game.gameState.money) {
                this.game.currentPurchases[item] = prev;
              }
              this.game.updateSupplyDisplay();
            }
          }
        });
      });
      console.log(`✅ ${qtyButtons.length} quantity button listeners added`);
    } else {
      console.warn('⚠️ No quantity buttons found');
    }

    const finalizeSuppliesBtn = document.getElementById('finalize-supplies');
    if (finalizeSuppliesBtn) {
      finalizeSuppliesBtn.addEventListener('click', () => {
        if (this.game) {
          this.game.finalizePurchases();
        }
      });
      console.log('✅ Finalize supplies listener added');
    } else {
      console.warn('⚠️ finalize-supplies not found');
    }

    // Main game actions - these might not exist yet, that's OK
    const continueTrailBtn = document.getElementById('continue-trail');
    if (continueTrailBtn) {
      continueTrailBtn.addEventListener('click', () => {
        this.continueTrail();
      });
      console.log('✅ Continue trail listener added');
    }

    const checkSuppliesBtn = document.getElementById('check-supplies');
    if (checkSuppliesBtn) {
      checkSuppliesBtn.addEventListener('click', () => {
        this.showSupplies();
      });
      console.log('✅ Check supplies listener added');
    }

    const changePaceBtn = document.getElementById('change-pace');
    if (changePaceBtn) {
      changePaceBtn.addEventListener('click', () => {
        this.showPaceOptions();
      });
      console.log('✅ Change pace listener added');
    }

    const restBtn = document.getElementById('rest-here');
    if (restBtn) {
      restBtn.addEventListener('click', () => {
        this.restForDay();
      });
      console.log('✅ Rest button listener added');
    }

    const tradeBtn = document.getElementById('trade-btn');
    if (tradeBtn) {
      tradeBtn.addEventListener('click', () => {
        this.showTrading();
      });
      console.log('✅ Trade button listener added');
    }

    // Pace selection
    const paceOptions = document.querySelectorAll('.pace-option');
    if (paceOptions.length > 0) {
      paceOptions.forEach(option => {
        option.addEventListener('click', () => {
          this.selectPace(option);
        });
      });
      console.log(`✅ ${paceOptions.length} pace option listeners added`);
    }

    // Message log toggle
    const toggleLogBtn = document.getElementById('toggle-log');
    if (toggleLogBtn) {
      toggleLogBtn.addEventListener('click', () => {
        this.toggleMessageLog();
      });
      console.log('✅ Toggle log listener added');
    }

    // Rations selection
    const rationOptions = document.querySelectorAll('.ration-option');
    if (rationOptions.length > 0) {
      rationOptions.forEach(option => {
        option.addEventListener('click', () => {
          this.selectRations(option);
        });
      });
      console.log(`\u2705 ${rationOptions.length} ration option listeners added`);
    }

    // Save/Load buttons on title screen
    const loadBtn = document.getElementById('load-game-btn');
    if (loadBtn && localStorage.getItem('zionistTrailSave')) {
      loadBtn.style.display = 'inline-block';
      loadBtn.addEventListener('click', () => {
        const game = window.ZionistH.gameInstance;
        if (game && game.loadGame()) {
          game.startMainGame();
        }
      });
    }

    // In-game Save/Load/New buttons
    const saveBtn = document.getElementById('save-game-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const game = window.ZionistH.gameInstance;
        if (game) {
          game.saveGame();
          saveBtn.textContent = 'Saved!';
          saveBtn.classList.add('saved-feedback');
          setTimeout(() => {
            saveBtn.innerHTML = '<span class="btn-text">Save</span>';
            saveBtn.classList.remove('saved-feedback');
          }, 1500);
        }
      });
    }

    const loadIngameBtn = document.getElementById('load-ingame-btn');
    if (loadIngameBtn) {
      loadIngameBtn.addEventListener('click', () => {
        if (!localStorage.getItem('zionistTrailSave')) {
          alert('No saved game found.');
          return;
        }
        if (confirm('Load saved game? Current progress will be lost.')) {
          const game = window.ZionistH.gameInstance;
          if (game && game.loadGame()) {
            if (game.dailyDecision) game.dailyDecision.showDailyChoices();
          }
        }
      });
    }

    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        if (confirm('Start a new game? Current progress will be lost.')) {
          const game = window.ZionistH.gameInstance;
          if (game) game.restartGame();
        }
      });
    }

    // Prevent button spam
    this.preventButtonSpam();
    
    console.log('✅ UI event listeners setup complete');
  }

  preventButtonSpam() {
    // Light debounce — only prevent actual double-clicks (200ms)
    let lastClickTime = 0;
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' && !e.target.disabled) {
        const now = Date.now();
        if (now - lastClickTime < 200) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        lastClickTime = now;
      }
    }, true); // capture phase so it fires before button handlers
  }

  showOverlay(overlayId) {
    // Hide all overlays
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.classList.remove('active');
    });
    
    // Show specified overlay
    const targetOverlay = document.getElementById(overlayId);
    if (targetOverlay) {
      targetOverlay.classList.add('active');
      this.currentOverlay = overlayId;
    }
  }

  // Show a panel as a modal over the main game (doesn't hide main-game)
  showGameModal(overlayId) {
    const targetOverlay = document.getElementById(overlayId);
    if (targetOverlay) {
      targetOverlay.classList.add('active');
      targetOverlay.style.position = 'fixed';
      targetOverlay.style.zIndex = '200';
    }
  }

  hideGameModal(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.position = '';
      overlay.style.zIndex = '';
    }
    // Return focus to daily decisions
    const game = window.ZionistH.gameInstance;
    if (game && game.dailyDecision) {
      game.dailyDecision.showDailyChoices();
    }
  }

  hideOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  selectProfession(card) {
    // Remove previous selection
    document.querySelectorAll('.profession-card').forEach(c => c.classList.remove('selected'));
    
    // Select current card
    card.classList.add('selected');
    this.selectedProfession = card.dataset.profession;
    
    // Enable confirm button
    document.getElementById('confirm-profession').disabled = false;
    
    // Add visual feedback
    this.playSound('select');
  }

  startGame() {
    if (!this.selectedProfession || this.gameStarted) return;
    
    this.gameStarted = true;
    this.showOverlay('main-game');
    
    // Initialize game with selected profession
    if (window.ZionistH && window.ZionistH.Game) {
      window.ZionistH.Game.initWithProfession(this.selectedProfession);
    }
    
    this.logMessage('🌟 Your journey begins!', 'positive');
    this.updateLocationScene('poland');
  }

  continueTrail() {
    if (!this.game || !this.game.gameActive) return;
    
    // Add visual feedback
    this.animateCaravan();
    this.logMessage('🚶 Continuing along the trail...', 'neutral');
    
    // Let the game loop handle progression
    // The UI will be updated through refreshStats()
  }

  showSupplies() {
    this.updateSuppliesDisplay();
    this.showGameModal('supplies-overlay');
  }

  updateSuppliesDisplay() {
    if (!this.gameState) return;
    
    // Enhanced display with resource icons
    this.updateResourceDisplay('supply-food', this.gameState.food, 'lbs', 'resource-icons-food.png');
    this.updateResourceDisplay('supply-water', this.gameState.water, 'gal', 'resource-icons-water.png');
    this.updateResourceDisplay('supply-tools', this.gameState.tools, '', null);
    this.updateResourceDisplay('supply-medicine', this.gameState.medicine, '', 'resource-icons-medicine.png');
    this.updateResourceDisplay('supply-money', this.gameState.money, 'rubles', null);
    this.updateResourceDisplay('supply-pioneers', this.gameState.pioneers, '', null);
  }

  // Helper method to create icon-enhanced resource displays
  updateResourceDisplay(elementId, amount, unit, iconPath) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const roundedAmount = Math.ceil(amount);
    const displayText = unit ? `${roundedAmount} ${unit}` : `${roundedAmount}`;
    
    if (iconPath) {
      // Create icon + text display
      element.innerHTML = `
        <div class="resource-display">
          <img src="images/${iconPath}" alt="" class="resource-icon" />
          <span class="resource-amount">${displayText}</span>
        </div>
      `;
    } else {
      // Text only for items without icons
      element.textContent = displayText;
    }
  }

  showPaceOptions() {
    this.showGameModal('pace-overlay');
  }

  selectPace(option) {
    // Remove previous selection
    document.querySelectorAll('.pace-option').forEach(opt => opt.classList.remove('active'));
    
    // Select current option
    option.classList.add('active');
    
    const pace = option.dataset.pace;
    let paceValue = ZionistH.PACE_NORMAL;
    if (pace === 'slow') paceValue = ZionistH.PACE_SLOW;
    if (pace === 'fast') paceValue = ZionistH.PACE_FAST;
    
    if (this.gameState) {
      this.gameState.setPace(paceValue);
      const currentPaceEl = document.getElementById('current-pace');
      if (currentPaceEl) currentPaceEl.textContent = pace.charAt(0).toUpperCase() + pace.slice(1);
      this.logMessage(`⚡ Travel pace set to ${pace}`, 'neutral');
    }
  }

  selectRations(option) {
    document.querySelectorAll('.ration-option').forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    
    const rations = option.dataset.rations;
    let rationsValue = ZionistH.RATIONS_FILLING;
    if (rations === 'bare') rationsValue = ZionistH.RATIONS_BARE;
    if (rations === 'meager') rationsValue = ZionistH.RATIONS_MEAGER;
    
    if (this.gameState) {
      this.gameState.rations = rationsValue;
      this.logMessage(`🍞 Rations set to ${rations}`, 'neutral');
    }
  }

  restForDay() {
    if (!this.game) return;
    
    this.game.rest();
    this.logMessage('😴 Your pioneers rest for a day', 'positive');
    this.animateRest();
  }

  showTrading() {
    // Populate trading overlay with current location's shop
    const game = window.ZionistH.gameInstance;
    if (!game || !game.storyConfig || !this.gameState) return;

    const location = this.gameState.getCurrentLocation(game.storyConfig);
    if (!location || !location.shops || location.shops.length === 0) {
      this.logMessage('🏪 No shops at this location', 'neutral');
      return;
    }

    const shopKey = location.shops[0];
    const shop = game.storyConfig.shops[shopKey];
    if (!shop) {
      this.logMessage('🏪 Shop not found', 'neutral');
      return;
    }

    const titleEl = document.getElementById('trading-title');
    const descEl = document.getElementById('trading-description');
    const goodsEl = document.getElementById('trading-goods');

    if (titleEl) titleEl.textContent = shop.name;
    if (descEl) descEl.textContent = `Welcome to ${shop.name} in ${shop.location}. Money: ${this.gameState.money} ${this.gameState.getCurrencyName()}`;

    if (goodsEl) {
      goodsEl.innerHTML = '';

      // === BUY SECTION ===
      const buyHeader = document.createElement('h3');
      buyHeader.textContent = 'Buy';
      buyHeader.style.cssText = 'color:var(--gold);margin:0.3rem 0;border-bottom:1px solid rgba(218,165,32,0.3);padding-bottom:0.3rem;';
      goodsEl.appendChild(buyHeader);

      shop.items.forEach(item => {
        const canBuy = this.gameState.money >= item.price;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'trading-item';
        itemDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.7rem;margin:0.4rem 0;border:1px solid #daa520;border-radius:6px;background:rgba(139,69,19,0.3);';
        itemDiv.innerHTML = `
          <div>
            <strong>${item.quantity} ${item.name}</strong>
            <div style="font-size:0.85rem;color:#a89880;">${item.price} ${this.gameState.getCurrencyName()}</div>
          </div>
          <button class="buy-btn" style="padding:0.4rem 1rem;border-radius:5px;border:2px solid #daa520;background:#8b4513;color:#f5f5dc;cursor:pointer;font-weight:bold;${canBuy ? '' : 'opacity:0.4;cursor:not-allowed;'}">${canBuy ? 'Buy' : 'Too expensive'}</button>
        `;
        const buyBtn = itemDiv.querySelector('.buy-btn');
        buyBtn.addEventListener('click', () => {
          if (this.gameState.money >= item.price) {
            this.gameState.money -= item.price;
            this.gameState.inventory[item.name] = (this.gameState.inventory[item.name] || 0) + item.quantity;
            this.logMessage(`✅ Bought ${item.quantity} ${item.name} for ${item.price} ${this.gameState.getCurrencyName()}`, 'positive');
            if (descEl) descEl.textContent = `Money: ${this.gameState.money} ${this.gameState.getCurrencyName()}`;
            this.refreshStats();
            this.showTrading();
          } else {
            this.logMessage('❌ Not enough money!', 'negative');
          }
        });
        goodsEl.appendChild(itemDiv);
      });

      // === SELL SECTION ===
      const sellPrices = {
        food: { unit: 10, price: 3, label: '10 lbs of food' },
        water: { unit: 5, price: 2, label: '5 gal of water' },
        tools: { unit: 1, price: 8, label: '1 set of tools' },
        medicine: { unit: 1, price: 12, label: '1 medicine' },
        clothing: { unit: 1, price: 5, label: '1 clothing' },
      };

      // Only show sell section if player has something to sell
      const sellableItems = Object.entries(sellPrices).filter(
        ([key, info]) => (this.gameState.inventory[key] || 0) >= info.unit
      );

      if (sellableItems.length > 0) {
        const sellHeader = document.createElement('h3');
        sellHeader.textContent = 'Sell';
        sellHeader.style.cssText = 'color:var(--gold);margin:0.8rem 0 0.3rem;border-bottom:1px solid rgba(218,165,32,0.3);padding-bottom:0.3rem;';
        goodsEl.appendChild(sellHeader);

        sellableItems.forEach(([key, info]) => {
          const owned = Math.floor(this.gameState.inventory[key] || 0);
          const itemDiv = document.createElement('div');
          itemDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.7rem;margin:0.4rem 0;border:1px solid #228b22;border-radius:6px;background:rgba(34,139,34,0.15);';
          itemDiv.innerHTML = `
            <div>
              <strong>Sell ${info.label}</strong>
              <div style="font-size:0.85rem;color:#a89880;">You have: ${owned} | Get ${info.price} ${this.gameState.getCurrencyName()}</div>
            </div>
            <button class="sell-btn" style="padding:0.4rem 1rem;border-radius:5px;border:2px solid #228b22;background:#2e5e1e;color:#f5f5dc;cursor:pointer;font-weight:bold;">Sell</button>
          `;
          const sellBtn = itemDiv.querySelector('.sell-btn');
          sellBtn.addEventListener('click', () => {
            if ((this.gameState.inventory[key] || 0) >= info.unit) {
              this.gameState.inventory[key] -= info.unit;
              this.gameState.money += info.price;
              this.logMessage(`💰 Sold ${info.label} for ${info.price} ${this.gameState.getCurrencyName()}`, 'positive');
              this.refreshStats();
              this.showTrading();
            }
          });
          goodsEl.appendChild(itemDiv);
        });
      }
    }

    this.showGameModal('trading-overlay');
  }

  // === FISHING MINI-GAME (VISUAL) ===
  startHunting() {
    this.showOverlay('fishing-game');
    this.fishCaught = 0;
    this.fishWeight = 0;
    this.fishingTimeLeft = 30;
    this.fishingLog = [];
    this.fishingHealthPenalty = 0;
    this._fishSpawnTimer = null;
    this._activeFishTimers = [];

    // Fish types with different weights and swim speeds
    this.fishTypes = [
      { name: 'Sardine', emoji: '🐟', minWeight: 3, maxWeight: 6, speed: 5, size: '1.8rem', chance: 0.30 },
      { name: 'Mackerel', emoji: '🐠', minWeight: 8, maxWeight: 14, speed: 4, size: '2.2rem', chance: 0.25 },
      { name: 'Sea Bass', emoji: '🐡', minWeight: 12, maxWeight: 20, speed: 3.5, size: '2.6rem', chance: 0.20 },
      { name: 'Tuna', emoji: '🦈', minWeight: 20, maxWeight: 30, speed: 2.5, size: '3rem', chance: 0.10 },
    ];
    this.fishHazards = [
      { name: 'Jellyfish!', emoji: '🪼', penalty: 8, speed: 6, size: '2.4rem', chance: 0.08 },
      { name: 'Tangled seaweed!', emoji: '🪸', timeLost: 5, speed: 7, size: '2rem', chance: 0.04 },
      { name: 'Sea urchin!', emoji: '🦔', penalty: 12, speed: 8, size: '1.6rem', chance: 0.03 },
    ];

    const timeDisplay = document.getElementById('fishing-time');
    const caughtDisplay = document.getElementById('fish-caught');
    const castBtn = document.getElementById('cast-line-btn');
    const catchBtn = document.getElementById('catch-fish-btn');
    const endBtn = document.getElementById('end-fishing-btn');
    const tipDisplay = document.getElementById('fishing-tip');
    const waterArea = document.getElementById('fishing-water-area');
    const feedback = document.getElementById('fishing-feedback');
    const summary = document.getElementById('fishing-summary');

    if (caughtDisplay) caughtDisplay.textContent = '0 fish (0 lbs)';
    if (timeDisplay) { timeDisplay.textContent = '60'; timeDisplay.style.color = ''; }
    if (tipDisplay) tipDisplay.textContent = 'Press Cast Line, then select fish as they swim past.';
    if (catchBtn) { catchBtn.classList.add('hidden'); catchBtn.disabled = true; }
    if (castBtn) { castBtn.classList.remove('hidden'); castBtn.style.display = ''; }
    if (endBtn) endBtn.style.display = '';
    if (waterArea) waterArea.innerHTML = '';
    if (feedback) { feedback.textContent = ''; feedback.className = 'fishing-feedback'; }
    if (summary) summary.style.display = 'none';

    // Clone buttons to clear old handlers
    const newCast = castBtn.cloneNode(true);
    castBtn.parentNode.replaceChild(newCast, castBtn);
    const newEnd = endBtn.cloneNode(true);
    endBtn.parentNode.replaceChild(newEnd, endBtn);

    newCast.addEventListener('click', () => {
      newCast.style.display = 'none';
      if (tipDisplay) tipDisplay.textContent = 'Fish are appearing. Select them to catch.';
      this.beginFishSpawning();
    });
    newEnd.addEventListener('click', () => this.endHunting());

    // Start timer
    this.fishingTimer = setInterval(() => {
      this.fishingTimeLeft--;
      if (timeDisplay) timeDisplay.textContent = this.fishingTimeLeft;
      if (timeDisplay && this.fishingTimeLeft <= 10) timeDisplay.style.color = '#dc143c';
      if (this.fishingTimeLeft <= 0) {
        this.endHunting();
      }
    }, 1000);
  }

  beginFishSpawning() {
    this.spawnFish();
    const elapsed = 30 - this.fishingTimeLeft;
    // Spawn rate increases over time — starts moderate, gets frantic
    const spawnInterval = Math.max(600, 1800 - elapsed * 30);
    this._fishSpawnTimer = setTimeout(() => {
      if (this.fishingTimeLeft > 0) this.beginFishSpawning();
    }, spawnInterval);
  }

  spawnFish() {
    const waterArea = document.getElementById('fishing-water-area');
    if (!waterArea || this.fishingTimeLeft <= 0) return;

    const elapsed = 30 - this.fishingTimeLeft;
    const hazardChance = Math.min(0.45, 0.20 + elapsed * 0.01);
    const isHazard = Math.random() < hazardChance;

    let item;
    if (isHazard) {
      const pool = this.fishHazards;
      item = { ...pool[Math.floor(Math.random() * pool.length)], isHazard: true };
    } else {
      // Weighted selection
      const roll = Math.random();
      let cumulative = 0;
      item = { ...this.fishTypes[0], isHazard: false };
      for (const f of this.fishTypes) {
        cumulative += f.chance;
        if (roll < cumulative) { item = { ...f, isHazard: false }; break; }
      }
    }

    const el = document.createElement('div');
    el.className = 'fish-swim' + (isHazard ? ' fish-hazard' : '');
    el.textContent = item.emoji;
    el.title = item.name;
    el.style.fontSize = item.size || '2.2rem';

    // Random vertical position within the water
    const top = 10 + Math.random() * 75; // 10-85% from top
    el.style.top = `${top}%`;

    // Swim direction — left-to-right or right-to-left
    const goRight = Math.random() > 0.5;
    const swimDuration = (item.speed || 4) + Math.random() * 2; // seconds to cross

    // Flip text direction for fish swimming left
    if (goRight) {
      el.style.animation = `fish-swim-right ${swimDuration}s linear forwards`;
    } else {
      el.style.animation = `fish-swim-left ${swimDuration}s linear forwards`;
      // Reverse the text characters for leftward fish
      if (!item.isHazard) {
        el.textContent = item.emoji.replace(/>/g, '<');
      }
    }

    // Click handler — catch the fish!
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.dataset.caught) return;
      el.dataset.caught = '1';
      this.handleFishClick(item, el);
    });

    waterArea.appendChild(el);

    // Remove after swim completes
    const removeTimer = setTimeout(() => {
      if (!el.dataset.caught && el.parentNode) {
        el.classList.add('fish-missed');
        setTimeout(() => el.remove(), 300);
      }
    }, swimDuration * 1000);
    this._activeFishTimers.push(removeTimer);
  }

  handleFishClick(item, el) {
    const caughtDisplay = document.getElementById('fish-caught');
    const feedback = document.getElementById('fishing-feedback');
    const tipDisplay = document.getElementById('fishing-tip');

    if (item.isHazard) {
      // Bad catch!
      el.classList.add('fish-caught-anim');
      setTimeout(() => el.remove(), 400);
      this.fishingLog.push({ type: 'hazard', name: item.name, emoji: item.emoji });

      if (item.penalty) {
        this.fishingHealthPenalty += item.penalty;
        if (feedback) { feedback.textContent = `${item.name} -${item.penalty} health`; feedback.className = 'fishing-feedback fb-bad'; }
        if (tipDisplay) tipDisplay.textContent = `${item.name} — watch out for hazards.`;
      } else if (item.timeLost) {
        this.fishingTimeLeft = Math.max(0, this.fishingTimeLeft - item.timeLost);
        const timeDisplay = document.getElementById('fishing-time');
        if (timeDisplay) timeDisplay.textContent = this.fishingTimeLeft;
        if (feedback) { feedback.textContent = `${item.name} — lost ${item.timeLost}s`; feedback.className = 'fishing-feedback fb-bad'; }
        if (tipDisplay) tipDisplay.textContent = `${item.name} cost you time.`;
      }
      // Clear feedback after 1.5s
      setTimeout(() => { if (feedback) { feedback.className = 'fishing-feedback'; } }, 1500);
    } else {
      // Good catch!
      const weight = item.minWeight + Math.floor(Math.random() * (item.maxWeight - item.minWeight + 1));
      this.fishCaught++;
      this.fishWeight += weight;
      if (this.fishWeight > 250) this.fishWeight = 250;

      this.fishingLog.push({ type: 'fish', name: item.name, emoji: item.emoji, weight });

      el.classList.add('fish-caught-anim');
      setTimeout(() => el.remove(), 400);

      if (caughtDisplay) caughtDisplay.textContent = `${this.fishCaught} fish (${this.fishWeight} lbs)`;
      if (feedback) { feedback.textContent = `${item.name} +${weight} lbs`; feedback.className = 'fishing-feedback fb-good'; }
      if (tipDisplay) tipDisplay.textContent = `${item.name} — ${weight} lbs caught.`;
      // Clear feedback
      setTimeout(() => { if (feedback) { feedback.className = 'fishing-feedback'; } }, 1500);
    }
  }

  endHunting() {
    clearInterval(this.fishingTimer);
    clearTimeout(this._fishSpawnTimer);
    this._activeFishTimers.forEach(t => clearTimeout(t));
    this._activeFishTimers = [];

    // Clear swimming fish
    const waterArea = document.getElementById('fishing-water-area');
    if (waterArea) waterArea.innerHTML = '';

    // Apply results to game state
    if (this.gameState) {
      if (this.fishWeight > 0) {
        this.gameState.inventory.food += this.fishWeight;
      }
      if (this.fishingHealthPenalty > 0) {
        this.gameState.groupHealth = Math.max(0, this.gameState.groupHealth - this.fishingHealthPenalty);
        this.gameState.partyMembers.forEach(m => {
          if (m.isAlive) m.health = Math.max(0, m.health - this.fishingHealthPenalty * 0.5);
        });
      }
    }

    // Build summary
    const summary = document.getElementById('fishing-summary');
    if (summary) {
      let html = '<h3 style="margin:0.5rem 0;color:var(--gold);">Fishing Summary</h3>';
      const fishCatches = this.fishingLog.filter(l => l.type === 'fish');
      const hazards = this.fishingLog.filter(l => l.type === 'hazard');

      if (fishCatches.length > 0) {
        const byType = {};
        fishCatches.forEach(f => {
          if (!byType[f.name]) byType[f.name] = { count: 0, weight: 0, emoji: f.emoji };
          byType[f.name].count++;
          byType[f.name].weight += f.weight;
        });
        for (const [name, data] of Object.entries(byType)) {
          html += `<div style="color:#228b22;">${name}: <strong>${data.count} caught (${data.weight} lbs)</strong></div>`;
        }
        html += `<div style="margin-top:0.3rem;color:var(--text-primary);">Total: <strong>+${this.fishWeight} lbs of food</strong></div>`;
      } else {
        html += '<div style="color:#a89880;">No fish were caught.</div>';
      }
      if (hazards.length > 0) {
        hazards.forEach(h => {
          html += `<div style="color:#dc143c;">${h.name}</div>`;
        });
        if (this.fishingHealthPenalty > 0) {
          html += `<div style="color:#dc143c;">Health penalty: <strong>-${this.fishingHealthPenalty}</strong></div>`;
        }
      }

      html += '<button class="retro-btn primary" id="fishing-done-btn" style="margin-top:0.8rem;width:100%;">Continue Journey</button>';
      summary.innerHTML = html;
      summary.style.display = 'block';

      // Hide game UI
      const castBtn = document.getElementById('cast-line-btn');
      const endBtn = document.getElementById('end-fishing-btn');
      const tipArea = document.querySelector('.fishing-tip-area');
      if (castBtn) castBtn.style.display = 'none';
      if (endBtn) endBtn.style.display = 'none';
      if (tipArea) tipArea.style.display = 'none';

      document.getElementById('fishing-done-btn').addEventListener('click', () => {
        this.refreshStats();
        const game = window.ZionistH.gameInstance;
        if (game && game.dailyDecision) {
          setTimeout(() => game.dailyDecision.showDailyChoices(), 300);
        }
      });
    } else {
      if (this.fishWeight > 0) {
        this.logMessage(`🎣 Fishing trip: caught ${this.fishCaught} fish (${this.fishWeight} lbs of food)`, 'positive');
      }
      this.refreshStats();
      const game = window.ZionistH.gameInstance;
      if (game && game.dailyDecision) {
        setTimeout(() => game.dailyDecision.showDailyChoices(), 500);
      }
    }
  }

  // === FORAGING MINI-GAME ===
  startForaging() {
    this.showOverlay('foraging-game');
    this.plantsFound = 0;
    this.herbsFound = 0;
    this.waterFound = 0;
    this.poisonFound = 0;
    this.foragingTimeLeft = 30;
    this.foragingActive = false;
    this.foragingLog = [];

    const timeDisplay = document.getElementById('foraging-time');
    const plantsDisplay = document.getElementById('plants-found');
    const herbsDisplay = document.getElementById('herbs-found');
    const waterDisplay = document.getElementById('water-found');
    const poisonDisplay = document.getElementById('poison-found');
    const feedback = document.getElementById('forage-feedback');
    const summary = document.getElementById('forage-summary');
    const spotsContainer = document.getElementById('foraging-spots');

    if (plantsDisplay) plantsDisplay.textContent = '0';
    if (herbsDisplay) herbsDisplay.textContent = '0';
    if (waterDisplay) waterDisplay.textContent = '0';
    if (poisonDisplay) poisonDisplay.textContent = '0';
    if (timeDisplay) timeDisplay.textContent = '30';
    if (feedback) { feedback.textContent = ''; feedback.className = 'forage-feedback'; }
    if (summary) summary.style.display = 'none';
    if (spotsContainer) spotsContainer.innerHTML = '';

    const startBtn = document.getElementById('start-foraging-btn');
    const endBtn = document.getElementById('end-foraging-btn');
    if (startBtn) startBtn.style.display = '';
    if (endBtn) endBtn.style.display = '';

    const newStart = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStart, startBtn);
    const newEnd = endBtn.cloneNode(true);
    endBtn.parentNode.replaceChild(newEnd, endBtn);

    newStart.addEventListener('click', () => {
      newStart.style.display = 'none';
      this.beginForaging(spotsContainer, plantsDisplay, herbsDisplay, waterDisplay, poisonDisplay, timeDisplay, feedback);
    });
    newEnd.addEventListener('click', () => this.endForaging());
  }

  beginForaging(spotsContainer, plantsDisplay, herbsDisplay, waterDisplay, poisonDisplay, timeDisplay, feedback) {
    this.foragingActive = true;
    this.foragingTimer = setInterval(() => {
      this.foragingTimeLeft--;
      if (timeDisplay) timeDisplay.textContent = this.foragingTimeLeft;
      // Flash timer red when low
      if (timeDisplay && this.foragingTimeLeft <= 5) timeDisplay.style.color = '#dc143c';
      if (this.foragingTimeLeft <= 0) this.endForaging();
    }, 1000);
    this.spawnForagingItems(spotsContainer, plantsDisplay, herbsDisplay, waterDisplay, poisonDisplay, feedback);
  }

  spawnForagingItems(container, plantsDisplay, herbsDisplay, waterDisplay, poisonDisplay, feedback) {
    if (!this.foragingActive || !container) return;

    // Fade out old items instead of instant clear
    container.querySelectorAll('.forage-item-spot').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.remove(), 400);
    });

    const goodTypes = [
      { emoji: '🌿', type: 'plant', label: 'Wild herb', points: 5 },
      { emoji: '🍇', type: 'plant', label: 'Wild grapes', points: 8 },
      { emoji: '🫒', type: 'plant', label: 'Olive branch', points: 6 },
      { emoji: '🍄', type: 'plant', label: 'Edible mushroom', points: 4 },
      { emoji: '🌸', type: 'herb', label: 'Medicinal flower', points: 0 },
      { emoji: '💧', type: 'water', label: 'Spring water', points: 0 },
    ];
    const badTypes = [
      { emoji: '☠️', type: 'poison', label: 'Poisonous berry!', penalty: 10 },
      { emoji: '🐛', type: 'poison', label: 'Venomous insect!', penalty: 8 },
      { emoji: '🪴', type: 'poison', label: 'Toxic weed!', penalty: 12 },
      { emoji: '🍄', type: 'poison', label: 'Poison mushroom!', penalty: 15 },
    ];

    // Difficulty increases as time goes on (more bad items)
    const elapsed = 30 - this.foragingTimeLeft;
    const badChance = Math.min(0.45, 0.2 + elapsed * 0.008);
    const count = 4 + Math.floor(Math.random() * 3);

    setTimeout(() => {
      for (let i = 0; i < count; i++) {
        const isBad = Math.random() < badChance;
        const pool = isBad ? badTypes : goodTypes;
        const item = pool[Math.floor(Math.random() * pool.length)];

        const spot = document.createElement('div');
        spot.className = 'forage-item-spot' + (isBad ? ' forage-danger' : '');
        spot.style.left = `${6 + Math.random() * 86}%`;
        spot.style.top = `${5 + Math.random() * 82}%`;
        spot.textContent = item.emoji;
        spot.title = item.label;

        spot.addEventListener('click', () => {
          if (spot.dataset.collected) return;
          spot.dataset.collected = '1';

          if (item.type === 'poison') {
            this.poisonFound++;
            if (poisonDisplay) poisonDisplay.textContent = this.poisonFound;
            this.foragingLog.push({ ...item, result: 'bad' });
            spot.style.transform = 'scale(1.8) rotate(20deg)';
            spot.style.opacity = '0';
            if (feedback) { feedback.textContent = `☠️ ${item.label} -${item.penalty} health!`; feedback.className = 'forage-feedback forage-fb-bad'; }
          } else {
            if (item.type === 'plant') { this.plantsFound++; if (plantsDisplay) plantsDisplay.textContent = this.plantsFound; }
            else if (item.type === 'herb') { this.herbsFound++; if (herbsDisplay) herbsDisplay.textContent = this.herbsFound; }
            else if (item.type === 'water') { this.waterFound++; if (waterDisplay) waterDisplay.textContent = this.waterFound; }
            this.foragingLog.push({ ...item, result: 'good' });
            spot.style.transform = 'scale(1.5)';
            spot.style.opacity = '0';
            if (feedback) { feedback.textContent = `✅ ${item.label}`; feedback.className = 'forage-feedback forage-fb-good'; }
          }
          setTimeout(() => spot.remove(), 400);
        });

        container.appendChild(spot);
      }
    }, 450);

    // Items disappear faster as game progresses (more challenge)
    const spawnInterval = Math.max(1800, 2500 - elapsed * 30);
    this.foragingSpawnTimer = setTimeout(() => {
      this.spawnForagingItems(container, plantsDisplay, herbsDisplay, waterDisplay, poisonDisplay, feedback);
    }, spawnInterval);
  }

  endForaging() {
    clearInterval(this.foragingTimer);
    clearTimeout(this.foragingSpawnTimer);
    this.foragingActive = false;

    const spotsContainer = document.getElementById('foraging-spots');
    if (spotsContainer) spotsContainer.innerHTML = '';

    // Calculate results
    const foodGained = this.plantsFound * 5;
    const medicineGained = this.herbsFound;
    const waterGained = this.waterFound * 8;
    const healthPenalty = this.foragingLog.filter(l => l.result === 'bad').reduce((s, l) => s + (l.penalty || 0), 0);

    // Apply to game state
    if (this.gameState) {
      this.gameState.inventory.food += foodGained;
      this.gameState.inventory.medicine += medicineGained;
      this.gameState.inventory.water += waterGained;
      if (healthPenalty > 0) {
        this.gameState.groupHealth = Math.max(0, this.gameState.groupHealth - healthPenalty);
        this.gameState.partyMembers.forEach(m => {
          if (m.isAlive) m.health = Math.max(0, m.health - healthPenalty * 0.5);
        });
      }
    }

    // Build summary panel
    const summary = document.getElementById('forage-summary');
    if (summary) {
      let html = '<h3>📊 Foraging Summary</h3><div class="forage-summary-grid">';
      if (foodGained > 0) html += `<div class="fs-row fs-good">🌿 Food gathered: <strong>+${foodGained} lbs</strong></div>`;
      if (medicineGained > 0) html += `<div class="fs-row fs-good">🌸 Medicine found: <strong>+${medicineGained}</strong></div>`;
      if (waterGained > 0) html += `<div class="fs-row fs-good">💧 Water collected: <strong>+${waterGained} gal</strong></div>`;
      if (this.poisonFound > 0) html += `<div class="fs-row fs-bad">☠️ Poisonous items: <strong>${this.poisonFound}</strong> — <span style="color:#dc143c">-${healthPenalty} party health!</span></div>`;
      if (foodGained === 0 && medicineGained === 0 && waterGained === 0 && this.poisonFound === 0) {
        html += '<div class="fs-row">Nothing was collected.</div>';
      }
      html += '</div>';
      html += '<button class="retro-btn primary" id="forage-done-btn" style="margin-top:0.8rem;width:100%;">Continue Journey</button>';
      summary.innerHTML = html;
      summary.style.display = 'block';

      const endBtn = document.getElementById('end-foraging-btn');
      if (endBtn) endBtn.style.display = 'none';

      document.getElementById('forage-done-btn').addEventListener('click', () => {
        this.refreshStats();
        const game = window.ZionistH.gameInstance;
        if (game && game.dailyDecision) {
          setTimeout(() => game.dailyDecision.showDailyChoices(), 300);
        }
      });
    } else {
      this.refreshStats();
      const game = window.ZionistH.gameInstance;
      if (game && game.dailyDecision) {
        setTimeout(() => game.dailyDecision.showDailyChoices(), 500);
      }
    }
  }

  // Core UI update methods
  refreshStats() {
    const gameState = this.gameState || this.game?.gameState;
    if (!gameState) return;
    this.gameState = gameState; // ensure reference is kept
    
    // Update status display elements that exist
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    };
    
    // Update main status elements
    updateElement('display-day', gameState.getFormattedDate ? gameState.getFormattedDate() : Math.ceil(gameState.day));
    updateElement('display-health', gameState.getHealthStatus());
    updateElement('display-food', Math.ceil(gameState.inventory.food));
    updateElement('display-water', Math.ceil(gameState.inventory.water));
    updateElement('display-money', gameState.money);

    // Health icon is now a static image — no dynamic emoji swap needed
    
    // Update progress bar
    const progress = gameState.getProgressPercentage();
    const progressFill = document.getElementById('mini-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
    
    // Update location info if elements exist
    const currentLocation = gameState.getCurrentLocation(this.game?.storyConfig);
    if (currentLocation) {
      updateElement('current-location-name', currentLocation.name);
      updateElement('location-description', currentLocation.description || 'Continuing the journey...');
    }
    
    // Update scene and weather based on location
    if (currentLocation) {
      this.updateLocationScene(currentLocation.name);
    }
    this.updateWeatherDisplay();
  }

  // Enhanced weather display with icons
  updateWeatherDisplay() {
    if (!this.gameState) return;
    
    // Determine current weather based on season and location
    const currentWeather = this.getCurrentWeather();
    const weatherElement = document.getElementById('weather-display');
    
    if (weatherElement) {
      const weatherIcon = this.getWeatherIcon(currentWeather);
      weatherElement.innerHTML = `
        <div class="status-group-enhanced">
          <img src="images/${weatherIcon}" alt="${currentWeather}" class="weather-icon" />
          <div class="status-content">
            <span class="status-label">Weather</span>
            <span class="status-value">${currentWeather}</span>
          </div>
        </div>
      `;
    }
    
    // Update weather overlay effects
    this.updateWeatherOverlay(currentWeather);
  }

  // Determine current weather conditions
  getCurrentWeather() {
    if (!this.gameState) return 'Fair';
    
    // Base weather on season, location, and some randomness
    const season = this.gameState.season || 'spring';
    const game = window.ZionistH.gameInstance;
    const location = this.gameState.getCurrentLocation(game ? game.storyConfig : null);
    const random = Math.random();
    
    // Sea locations have different weather patterns
    const isCoastal = location.name.toLowerCase().includes('haifa') ||
                     location.name.toLowerCase().includes('jaffa') ||
                     location.name.toLowerCase().includes('tel aviv') ||
                     location.name.toLowerCase().includes('mediterranean');
    
    if (season === 'winter' || random < 0.2) {
      return isCoastal ? 'Stormy' : 'Rainy';
    } else if (random < 0.3) {
      return 'Cloudy';
    } else if (random < 0.4 && !isCoastal) {
      return 'Hot';
    } else {
      return 'Fair';
    }
  }

  // Get appropriate weather icon filename
  getWeatherIcon(weather) {
    const iconMap = {
      'Fair': 'weather-icons-sun.png',
      'Sunny': 'weather-icons-sun.png',
      'Cloudy': 'weather-icons-cloudy.png',
      'Rainy': 'weather-icons-rain.png',
      'Stormy': 'weather-icons-lightning.png',
      'Hot': 'weather-icons-sun.png',
      'Cool': 'weather-icons-cloudy.png'
    };
    
    return iconMap[weather] || 'weather-icons-sun.png';
  }

  // Update weather overlay effects based on current weather
  updateWeatherOverlay(weather) {
    const weatherOverlay = document.getElementById('weather-overlay');
    if (!weatherOverlay) return;
    
    // Remove existing weather classes
    weatherOverlay.className = '';
    
    // Add weather-specific effects
    switch (weather) {
      case 'Stormy':
        weatherOverlay.className = 'weather-stormy-enhanced';
        break;
      case 'Rainy':
        weatherOverlay.className = 'weather-rain';
        break;
      case 'Cloudy':
        weatherOverlay.className = 'weather-night-enhanced';
        break;
      case 'Fair':
      case 'Sunny':
        weatherOverlay.className = 'weather-sunny-enhanced';
        break;
    }
  }

  updateLocationScene(locationName) {
    // During main gameplay, DailyDecision.js handles the visual section.
    // This method is a no-op to avoid re-adding location classes to game-container.
  }

  getLocationKey(locationName) {
    const locationMap = {
      'warsaw': 'warsaw',
      'krakow': 'krakow',
      'kraków': 'krakow',
      'vienna': 'vienna',
      'trieste': 'trieste',
      'mediterranean': 'mediterranean',
      'jaffa': 'jaffa',
      'tel aviv': 'tel_aviv',
      'tel-aviv': 'tel_aviv',
      'rishon': 'rishon_lezion',
      'rishon lezion': 'rishon_lezion',
      'rehovot': 'rehovot',
      'hebron': 'hebron',
      'bethlehem': 'bethlehem',
      'jerusalem': 'jerusalem',
      'herzliya': 'herzliya',
      'petah tikva': 'petah-tikva',
      'caesarea': 'caesarea'
    };
    
    const key = Object.keys(locationMap).find(key => 
      locationName.toLowerCase().includes(key)
    );
    
    return locationMap[key] || 'warsaw';
  }

  updateTradingButton(location) {
    const tradeButton = document.getElementById('trade-btn');
    if (location.shops && location.shops.length > 0) {
      tradeButton.disabled = false;
      tradeButton.textContent = 'Trade';
    } else {
      tradeButton.disabled = true;
      tradeButton.textContent = 'No trading';
    }
  }

  // Animation methods
  animateCaravan() {
    const caravan = document.querySelector('.caravan-sprite') || document.getElementById('travel-party-container');
    if (!caravan) return;
    caravan.style.animation = 'none';
    setTimeout(() => {
      caravan.style.animation = 'caravan-travel 2s ease-in-out';
    }, 10);
  }

  animateRest() {
    const scene = document.getElementById('scene-container') || document.getElementById('location-background');
    if (!scene) return;
    scene.style.filter = 'brightness(0.7)';
    setTimeout(() => {
      scene.style.filter = 'brightness(1)';
    }, 1000);
  }

  // Event handling
  showEvent(eventData) {
    document.getElementById('event-title').textContent = eventData.title || 'Event';
    document.getElementById('event-description').textContent = eventData.text;
    
    // Set event image based on type
    const eventImages = {
      'SHOP': '🏪',
      'ATTACK': '⚔️',
      'STAT-CHANGE': '📰',
      'DISCOVERY': '🔍'
    };
    document.getElementById('event-image').textContent = 
      eventImages[eventData.type] || '🎭';
    
    // Clear and populate options
    const optionsContainer = document.getElementById('event-options');
    optionsContainer.innerHTML = '';
    
    if (eventData.options) {
      eventData.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'event-option';
        button.textContent = option.text;
        button.addEventListener('click', () => {
          this.handleEventChoice(eventData, index);
        });
        optionsContainer.appendChild(button);
      });
    }
    
    this.showOverlay('event-overlay');
  }

  handleEventChoice(eventData, choiceIndex) {
    // Handle the event choice and close overlay
    if (eventData.onChoice) {
      eventData.onChoice(choiceIndex);
    }
    this.showOverlay('main-game');
  }

  showShop(products, eventData) {
    document.getElementById('trading-title').textContent = '🏪 ' + (eventData.title || 'Trading Post');
    document.getElementById('trading-description').textContent = eventData.text;
    
    const goodsContainer = document.getElementById('trading-goods');
    goodsContainer.innerHTML = '';
    
    products.forEach(product => {
      const item = document.createElement('div');
      item.className = 'trading-item';
      item.innerHTML = `
        <h4>${product.qty} ${product.item}</h4>
        <p>${product.price} rubles</p>
      `;
      item.addEventListener('click', () => {
        this.buyProduct(product);
      });
      goodsContainer.appendChild(item);
    });
    
    this.showOverlay('trading-overlay');
  }

  buyProduct(product) {
    if (!this.gameState) return;
    
    if (product.price > this.gameState.money) {
      this.logMessage('❌ Not enough rubles!', 'negative');
      return;
    }
    
    this.gameState.money -= parseInt(product.price);
    this.gameState[product.item] += parseInt(product.qty);
    
    this.logMessage(`✅ Bought ${product.qty} ${product.item} for ${product.price} rubles`, 'positive');
    this.refreshStats();
  }

  showAttack(medicine, rubles, eventData) {
    const event = {
      title: 'Challenge Ahead!',
      text: eventData.text,
      type: 'ATTACK',
      options: [
        { text: `Pay ${medicine} medicine` },
        { text: `Pay ${rubles} rubles` },
        { text: 'Take risky alternate route' }
      ],
      onChoice: (choice) => {
        this.handleAttackChoice(choice, medicine, rubles);
      }
    };
    
    this.showEvent(event);
  }

  handleAttackChoice(choice, medicine, rubles) {
    switch (choice) {
      case 0: // Pay medicine
        if (this.gameState.medicine >= medicine) {
          this.gameState.medicine -= medicine;
          this.logMessage(`💊 Paid ${medicine} medicine for safe passage`, 'neutral');
        } else {
          this.logMessage('❌ Not enough medicine! Taking risky route...', 'negative');
          this.handleRiskyRoute(medicine);
        }
        break;
      case 1: // Pay rubles
        if (this.gameState.money >= rubles) {
          this.gameState.money -= rubles;
          this.logMessage(`💰 Paid ${rubles} rubles for safe passage`, 'neutral');
        } else {
          this.logMessage('❌ Not enough rubles! Taking risky route...', 'negative');
          this.handleRiskyRoute(medicine);
        }
        break;
      case 2: // Risky route
        this.handleRiskyRoute(medicine);
        break;
    }
    
    this.refreshStats();
    if (this.game) this.game.resumeJourney();
  }

  handleRiskyRoute(difficulty) {
    const risk = Math.random();
    const damage = Math.ceil(difficulty * risk * 0.3);
    
    if (damage > 0 && damage < this.gameState.pioneers) {
      this.gameState.pioneers -= damage;
      this.gameState.health -= damage * 5;
      this.gameState.morale -= damage * 3;
      this.logMessage(`⚡ ${damage} pioneers lost on dangerous route`, 'negative');
    } else if (damage >= this.gameState.pioneers) {
      const survivors = Math.max(1, this.gameState.pioneers - damage);
      this.gameState.pioneers = survivors;
      this.gameState.health -= 20;
      this.gameState.morale -= 20;
      this.logMessage('💀 Heavy casualties on treacherous route', 'negative');
    } else {
      this.logMessage('✨ Successfully navigated alternate route!', 'positive');
      this.gameState.morale += 5;
    }
  }

  // Message logging
  logMessage(message, type) {
    const logContent = document.getElementById('log-content');
    const messageDiv = document.createElement('div');
    messageDiv.className = `log-message log-${type}`;
    messageDiv.textContent = message;
    
    logContent.insertBefore(messageDiv, logContent.firstChild);
    
    // Limit log to 50 messages
    while (logContent.children.length > 50) {
      logContent.removeChild(logContent.lastChild);
    }
  }

  toggleMessageLog() {
    const logContent = document.getElementById('log-content');
    this.logOpen = !this.logOpen;
    
    if (this.logOpen) {
      logContent.classList.add('open');
    } else {
      logContent.classList.remove('open');
    }
  }

  // Game state methods
  showGameOver(reason, stats) {
    const msgEl = document.getElementById('game-over-message');
    if (msgEl) msgEl.textContent = `Your journey ended due to ${reason}.`;

    const daysEl = document.getElementById('go-days');
    const distEl = document.getElementById('go-distance');
    const survEl = document.getElementById('go-survivors');
    const locEl = document.getElementById('go-location');
    const memEl = document.getElementById('go-memorial');

    if (daysEl) daysEl.textContent = Math.ceil(stats.day);
    if (distEl) distEl.textContent = `${Math.ceil(stats.progress)}%`;
    if (survEl) survEl.textContent = stats.pioneers;
    if (locEl) locEl.textContent = this.gameState ? this.gameState.currentLocation : 'Unknown';
    if (memEl) memEl.textContent = stats.pioneers === 0
      ? 'No one survived the journey. May their memory be a blessing.'
      : 'The remaining pioneers will carry on your memory.';
    
    this.showOverlay('game-over');
  }

  showVictory(stats) {
    const daysEl = document.getElementById('v-days');
    const distEl = document.getElementById('v-distance');
    const survEl = document.getElementById('v-survivors');
    const knowEl = document.getElementById('v-knowledge');
    const suppliesEl = document.getElementById('v-supplies');
    const scoreEl = document.getElementById('v-score');
    const rankEl = document.getElementById('v-rank');

    if (daysEl) daysEl.textContent = stats.arrivalDate ? `${stats.arrivalDate} (${Math.ceil(stats.day)} days)` : `${Math.ceil(stats.day)} days`;
    if (distEl) distEl.textContent = stats.distance || 0;
    if (survEl) survEl.textContent = `${stats.settlers} of ${stats.totalParty || '?'}`;
    if (knowEl) knowEl.textContent = stats.historicalKnowledge;
    if (suppliesEl) {
      const inv = stats.inventory || {};
      suppliesEl.textContent = `${Math.ceil(inv.food || 0)} food, ${Math.ceil(inv.water || 0)} water, ${stats.money || 0} ${stats.currency || 'lira'}`;
    }
    if (scoreEl) scoreEl.textContent = stats.score;

    // Rank calculation
    let rank = 'Pioneer';
    if (stats.score >= 5000) rank = 'Legend of Zion';
    else if (stats.score >= 3000) rank = 'Founding Leader';
    else if (stats.score >= 1500) rank = 'Brave Settler';
    if (rankEl) rankEl.textContent = rank;

    // Populate party members final status
    const partyEl = document.getElementById('v-party-members');
    if (partyEl && stats.partyMembers) {
      let html = '';
      stats.partyMembers.forEach(m => {
        const imgSrc = ZionistH.getPortraitImage(m);
        const alive = m.isAlive;
        const healthPct = Math.ceil(m.health || 0);
        const statusText = alive ? `HP: ${healthPct}%` : 'Did not survive';
        const statusColor = !alive ? '#dc143c' : healthPct >= 60 ? '#228b22' : healthPct >= 30 ? '#daa520' : '#dc143c';
        const sickText = alive && m.isDiseased ? ` — Sick: ${m.diseaseType}` : '';
        const opacity = alive ? '1' : '0.5';

        html += `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.4rem 0;border-bottom:1px solid rgba(218,165,32,0.15);opacity:${opacity};">
          <img src="${imgSrc}" alt="${m.firstName}" style="width:40px;height:40px;border-radius:50%;border:2px solid ${statusColor};object-fit:cover;" />
          <div style="flex:1;">
            <div style="color:var(--text-primary);font-weight:bold;font-size:0.95rem;">${m.fullName}</div>
            <div style="color:var(--text-secondary);font-size:0.8rem;">${m.profession || ''}</div>
          </div>
          <div style="text-align:right;">
            <div style="color:${statusColor};font-weight:bold;font-size:0.9rem;">${alive ? '✅' : '💀'} ${statusText}</div>
            <div style="color:#daa520;font-size:0.8rem;">${sickText}</div>
          </div>
        </div>`;
      });
      partyEl.innerHTML = html;
    }

    // Show achievements
    const achEl = document.getElementById('v-achievements');
    if (achEl && stats.achievements && stats.achievements.length > 0) {
      achEl.innerHTML = '<div style="background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:10px;padding:1rem;text-align:left;">' +
        '<h3 style="color:var(--gold);text-align:center;margin-bottom:0.5rem;">🏆 Achievements</h3>' +
        stats.achievements.map(a => `<div style="color:var(--text-primary);padding:0.2rem 0;">⭐ ${a}</div>`).join('') +
        '</div>';
    }
    
    this.showOverlay('victory-overlay');
  }

  // Sound effects (placeholder for future audio implementation)
  playSound(soundName) {
    // Future: Play actual sound files
    console.log(`Playing sound: ${soundName}`);
  }

  // Legacy support methods for existing game code
  notify(message, type) {
    this.logMessage(message, type);
  }

  // New screen management methods
  showPartyScreen() {
    this.showOverlay('meet-party');
  }

  generatePartyMembers() {
    const names = ZionistH.JEWISH_NAMES;
    const professions = ['Teacher', 'Carpenter', 'Farmer', 'Nurse', 'Merchant'];
    
    for (let i = 1; i <= 5; i++) {
      const isMale = Math.random() > 0.5;
      const firstName = isMale ? 
        names.male[Math.floor(Math.random() * names.male.length)] :
        names.female[Math.floor(Math.random() * names.female.length)];
      const lastName = names.surnames[Math.floor(Math.random() * names.surnames.length)];
      const profession = professions[i - 1];
      
      document.getElementById(`member${i}-name`).textContent = `${firstName} ${lastName}`;
      document.getElementById(`member${i}-profession`).textContent = profession;
    }
  }

  handleQuantityChange(button) {
    const item = button.dataset.item;
    const action = button.dataset.action;
    const qtyElement = document.getElementById(`${item}-qty`);
    
    if (!qtyElement) return;
    
    let currentQty = parseInt(qtyElement.textContent);
    const prices = { food: 10, tools: 50, medicine: 25, clothing: 15 };
    
    if (action === 'increase') {
      currentQty++;
    } else if (action === 'decrease' && currentQty > 0) {
      currentQty--;
    }
    
    qtyElement.textContent = currentQty;
    this.updatePurchaseSummary();
    this.updateShopItemIcons();
  }

  // Enhanced shop item display with icons
  updateShopItemIcons() {
    const shopItems = [
      { id: 'food', icon: 'resource-icons-food.png', name: 'Food Supplies' },
      { id: 'medicine', icon: 'resource-icons-medicine.png', name: 'Medicine' },
      { id: 'tools', icon: null, name: 'Tools' },
      { id: 'clothing', icon: null, name: 'Clothing' }
    ];

    shopItems.forEach(item => {
      const itemContainer = document.querySelector(`[data-item="${item.id}"]`);
      if (itemContainer && item.icon) {
        // Find or create icon element
        let iconElement = itemContainer.querySelector('.item-icon-enhanced');
        if (!iconElement && itemContainer.closest('.shop-item')) {
          iconElement = itemContainer.closest('.shop-item').querySelector('.item-icon');
          if (iconElement && !iconElement.querySelector('img')) {
            iconElement.innerHTML = `<img src="images/${item.icon}" alt="${item.name}" class="item-icon-enhanced" />`;
            iconElement.classList.add('enhanced');
          }
        }
      }
    });
  }

  updatePurchaseSummary() {
    const quantities = {
      food: parseInt(document.getElementById('food-qty').textContent),
      tools: parseInt(document.getElementById('tools-qty').textContent),
      medicine: parseInt(document.getElementById('medicine-qty').textContent),
      clothing: parseInt(document.getElementById('clothing-qty').textContent)
    };
    
    const prices = { food: 10, tools: 50, medicine: 25, clothing: 15 };
    
    let totalCost = 0;
    Object.keys(quantities).forEach(item => {
      totalCost += quantities[item] * prices[item];
    });
    
    const availableMoney = parseInt(document.getElementById('available-money').textContent);
    const remaining = availableMoney - totalCost;
    
    document.getElementById('total-cost').textContent = totalCost;
    document.getElementById('remaining-money').textContent = remaining;
    
    // Update button state
    const finalizeBtn = document.getElementById('finalize-supplies');
    finalizeBtn.disabled = remaining < 0;
    
    if (remaining < 0) {
      finalizeBtn.textContent = 'Cannot Afford';
    } else {
      finalizeBtn.textContent = 'Begin Journey to Kochav Yair';
    }
  }

  finalizeSupplies() {
    const quantities = {
      food: parseInt(document.getElementById('food-qty').textContent),
      tools: parseInt(document.getElementById('tools-qty').textContent),
      medicine: parseInt(document.getElementById('medicine-qty').textContent),
      clothing: parseInt(document.getElementById('clothing-qty').textContent)
    };
    
    const totalCost = parseInt(document.getElementById('total-cost').textContent);
    const availableMoney = parseInt(document.getElementById('available-money').textContent);
    
    if (totalCost > availableMoney) {
      this.logMessage('❌ Not enough money for these supplies!', 'negative');
      return;
    }
    
    // Store supplies for game initialization
    this.initialSupplies = {
      money: availableMoney - totalCost,
      food: quantities.food * 20, // Convert to pounds
      tools: quantities.tools,
      medicine: quantities.medicine,
      clothing: quantities.clothing,
      water: 200 // Base water supply
    };
    
    // Start the main game
    this.startGame();
  }

  startGame() {
    if (!this.selectedProfession || this.gameStarted) return;
    
    this.gameStarted = true;
    this.showOverlay('main-game');
    
    // Initialize game with selected profession and supplies
    if (window.ZionistH && window.ZionistH.Game) {
      window.ZionistH.Game.initWithProfession(this.selectedProfession, this.initialSupplies);
    }
    
    this.logMessage('🌟 Your journey from Warsaw to Kochav Yair begins!', 'positive');
    this.logMessage('📜 May you find success in establishing your settlement!', 'positive');
    this.updateLocationScene('warsaw');
    
    // Show opening day message and switch to daily decision system
    setTimeout(() => {
      this.showEvent({
        title: '🚂 Departure Day',
        text: 'You gather your belongings and say farewell to your family and friends in Warsaw. The train to the port will take you closer to your dream of settling in Eretz Yisrael. Your party of brave pioneers is ready for the journey ahead.',
        type: 'DISCOVERY',
        options: [
          { text: 'Begin your journey' }
        ],
        onChoice: () => {
          // Start with daily decision interface instead of automatic progression
          this.showDailyDecision();
        }
      });
    }, 1000);
  }

  // Legacy Mini-Game Management stubs removed — the working implementations  
  // are the methods startHunting()/startForaging() defined earlier in this file,
  // called by DailyDecision.js via this.ui.startHunting()/this.ui.startForaging().

  // Daily Decision Interface (legacy stub — actual system is in DailyDecision.js)
  showDailyDecision() {
    if (!this.gameState) return;
    const game = window.ZionistH.gameInstance;
    if (game && game.dailyDecision) {
      game.dailyDecision.showDailyChoices();
    }
  }

  // Global overlay close function
  closeOverlay(overlayId) {
    this.showOverlay('main-game');
  }
}

// Global function for onclick handlers
function closeOverlay(overlayId) {
  if (window.ZionistH && window.ZionistH.UI) {
    window.ZionistH.UI.closeOverlay(overlayId);
  }
}

// Make UI class available globally
window.ZionistH = window.ZionistH || {};
window.ZionistH.UI = UI;
