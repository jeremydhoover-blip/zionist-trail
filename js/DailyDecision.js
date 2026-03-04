/* eslint-disable no-undef */
// DailyDecision.js - Oregon Trail style daily decision system

class DailyDecision {
  constructor(gameState, storyConfig, ui) {
    this.gameState = gameState;
    this.storyConfig = storyConfig;
    this.ui = ui;
    this.isWaitingForChoice = false;
    this.currentChoices = [];
    this.dailyActionCounts = {}; // tracks uses per action per day
    this.maxActionsPerDay = 3;
    
    // Keyboard navigation — number keys 1-9 select choices
    document.addEventListener('keydown', (e) => {
      if (!this.isWaitingForChoice) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= this.currentChoices.length) {
        const choice = this.currentChoices[num - 1];
        if (choice && choice.available) {
          this.handleDailyChoice(choice.id);
        }
      }
    });
  }

  // Main daily decision interface - like Oregon Trail's "What do you want to do?"
  showDailyChoices() {
    // Check if at destination — handles both fresh arrival and loaded saves
    if (this.gameState.gameWon || this.isAtDestination()) { this.handleVictory(); return; }
    if (!this.gameState.gameActive) return;
    
    // Restore portraits panel if it was hidden
    const portraitsPanel = document.getElementById('party-portraits-panel');
    if (portraitsPanel) portraitsPanel.style.display = '';

    this.isWaitingForChoice = true;
    this.updateDailyStatus();
    this.generateAvailableChoices();
    this.renderDailyInterface();
  }

  updateDailyStatus() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    const weather = this.getWeatherDescription();
    const healthStatus = this.gameState.getHealthStatus();
    const moraleStatus = this.gameState.getMoraleStatus();
    
    // Update the daily decision overlay with current status - with error checking
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      } else {
        console.warn(`⚠️ Missing element: ${id}`);
      }
    };
    
    updateElement('daily-day', this.gameState.getFormattedDate());
    updateElement('daily-location', location ? location.name : 'Unknown');
    updateElement('daily-weather', weather);
    updateElement('daily-health', healthStatus);
    updateElement('daily-morale', moraleStatus);
    updateElement('daily-food', Math.ceil(this.gameState.inventory.food));
    updateElement('daily-water', Math.ceil(this.gameState.inventory.water));
    updateElement('daily-money', this.gameState.money);
    
    // Show party status
    this.updatePartyStatus();
    
    // Update progress bar
    const progress = this.gameState.getProgressPercentage();
    const progressFill = document.getElementById('daily-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    } else {
      console.warn('⚠️ Missing element: daily-progress-fill');
    }
  }

  updatePartyStatus() {
    const partyContainer = document.getElementById('daily-party-status');
    partyContainer.innerHTML = '';
    
    this.gameState.partyMembers.forEach(member => {
      if (member.isAlive) {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'party-member-status';
        
        let statusIcon = '<img src="images/resource-icons-health.png" class="ri" alt="">';
        if (member.health < 30) statusIcon = '<img src="images/resource-icons-health.png" class="ri" alt="" style="filter:hue-rotate(0deg) saturate(2);">';
        else if (member.health < 60) statusIcon = '<img src="images/resource-icons-health.png" class="ri" alt="" style="filter:hue-rotate(40deg);">';
        else if (member.isDiseased) statusIcon = '<img src="images/resource-icons-medicine.png" class="ri" alt="">';
        else if (member.morale < 30) statusIcon = '<img src="images/resource-icons-health.png" class="ri" alt="" style="filter:hue-rotate(40deg);">';
        
        memberDiv.innerHTML = `
          <span class="member-name">${member.firstName}</span>
          <span class="member-status">${statusIcon}</span>
          <span class="member-health">HP: ${Math.ceil(member.health)}</span>
        `;
        
        if (member.isDiseased) {
          memberDiv.innerHTML += `<span class="disease-status"><img src="images/resource-icons-medicine.png" class="ri" alt=""> ${member.diseaseType}</span>`;
        }
        
        partyContainer.appendChild(memberDiv);
      }
    });
  }

  generateAvailableChoices() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    const choices = [];
    const locationKey = this.gameState.currentLocation || 'warsaw';
    
    // Determine travel mode
    const isSea = location && location.terrain === 'sea';
    const segDist = this.gameState.segmentDistance || 0;
    const distToNext = location ? (location.distanceToNext || 0) : 0;
    const isTraveling = segDist > 0 && distToNext > 0;
    console.log(`[CHOICES] loc=${locationKey} segDist=${segDist} distToNext=${distToNext} isTraveling=${isTraveling}`);
    const trainSegments = ['warsaw', 'krakow', 'vienna'];
    const isOnTrain = isTraveling && trainSegments.includes(locationKey);
    const seaSegmentsEarly = ['trieste', 'mediterranean'];
    const isOnSeaEarly = isTraveling && seaSegmentsEarly.includes(locationKey);
    const isSeaTravel = isSea || isOnSeaEarly;
    
    // Continue
    const continueText = isOnTrain ? 'Continue by train' : isSeaTravel ? 'Continue sailing' : 'Continue the journey';
    choices.push({
      id: 'continue',
      text: continueText,
      description: '',
      icon: '',
      available: this.canContinueJourney()
    });
    
    // Rest
    const restText = isOnTrain ? 'Rest in your compartment' : isSeaTravel ? 'Rest below deck' : 'Rest and recover';
    choices.push({
      id: 'rest',
      text: restText,
      description: '',
      icon: '',
      available: true
    });
    
    // Look for supplies — available at stops, not while traveling
    if (!isTraveling) {
      choices.push({
        id: 'supplies',
        text: 'Look for supplies',
        description: 'Search for food, water, or useful items',
        icon: '',
        available: this.canLookForSupplies()
      });
    }
    
    // Location-specific choices — trade only at cities/ports when stopped
    if (!isTraveling && location && location.shops && location.shops.length > 0) {
      choices.push({
        id: 'trade',
        text: 'Trade with locals',
        description: 'Buy, sell, or barter with merchants',
        icon: '',
        available: true
      });
    }
    
    // Talk to people — at cities, ports, settlements, on trains, OR on ships
    const seaSegments = ['trieste', 'mediterranean'];
    const isOnSea = isTraveling && seaSegments.includes(locationKey);
    if (location && ['city', 'port', 'settlement'].includes(location.terrain) || isOnTrain || isOnSea) {
      choices.push({
        id: 'talk',
        text: isOnTrain ? 'Talk to fellow passengers' : isOnSea ? 'Talk to fellow passengers' : 'Talk to people',
        description: '',
        icon: '',
        available: true
      });
    }

    // Train-specific options
    if (isOnTrain) {
      choices.push({
        id: 'train_vendor',
        text: 'Buy food from the train vendor',
        description: '',
        icon: '',
        available: this.gameState.money >= 5
      });
      choices.push({
        id: 'train_cards',
        text: 'Play cards with passengers',
        description: '',
        icon: '',
        available: true
      });
    }

    // Ship-specific options
    if (isOnSea) {
      choices.push({
        id: 'ship_galley',
        text: 'Visit the ship\'s galley',
        description: 'Buy food and water from the cook',
        icon: '',
        available: this.gameState.money >= 8
      });
      choices.push({
        id: 'ship_dice',
        text: 'Play dice with sailors',
        description: '',
        icon: '',
        available: true
      });
      choices.push({
        id: 'ship_explore',
        text: 'Explore the ship',
        description: 'Wander the decks and see what you find',
        icon: '',
        available: true
      });
    }

    // Palestine-specific options (while traveling)
    const palestineSegs = ['jaffa','tel_aviv','rishon_lezion','rehovot','hebron','bethlehem'];
    const isInPalestine = isTraveling && palestineSegs.includes(locationKey);
    if (isInPalestine) {
      choices.push({
        id: 'explore_ruins',
        text: 'Explore the landscape',
        description: 'Search ruins, wells, or interesting sites nearby',
        icon: '',
        available: true
      });
      choices.push({
        id: 'trade_bedouin',
        text: 'Trade with Bedouins',
        description: 'Barter with passing nomads',
        icon: '',
        available: this.gameState.inventory.tools > 0 || this.gameState.inventory.clothing > 0
      });
    }
    
    if (this.canHunt()) {
      choices.push({
        id: 'hunt',
        text: isSeaTravel ? 'Fish from the ship' : 'Fish for food',
        description: 'Try to catch fish to supplement food supplies',
        icon: '',
        available: true
      });
    } else if (this.canForage() && !isSeaTravel) {
      choices.push({
        id: 'forage',
        text: 'Forage for food',
        description: 'Search for edible plants and herbs',
        icon: '',
        available: true
      });
    }
    
    choices.push({
      id: 'party',
      text: 'Check on your party',
      description: 'Review health, supplies, and party morale',
      icon: '',
      available: true
    });

    choices.push({
      id: 'inventory',
      text: 'Inventory',
      description: 'View and use items',
      icon: '',
      available: true
    });
    
    choices.push({
      id: 'pace',
      text: 'Change pace',
      description: 'Adjust travel speed and resource consumption',
      icon: '',
      available: true
    });
    
    // Medical choices if someone is sick
    const sickMembers = this.gameState.partyMembers.filter(m => m.isAlive && m.isDiseased);
    if (sickMembers.length > 0 && this.gameState.inventory.medicine > 0) {
      choices.push({
        id: 'medicine',
        text: 'Treat the sick',
        description: `Use medicine to treat ${sickMembers.length} sick party member(s)`,
        icon: '',
        available: true
      });
    }
    
    // Apply daily action limits — show remaining uses, disable when depleted
    const limitedActions = ['talk','hunt','forage','train_cards','train_vendor','ship_dice','ship_galley','ship_explore','explore_ruins','trade_bedouin','rest','supplies'];
    choices.forEach(c => {
      if (limitedActions.includes(c.id)) {
        const used = this.dailyActionCounts[c.id] || 0;
        const remaining = this.maxActionsPerDay - used;
        c._remaining = remaining;
        if (remaining <= 0) {
          c.available = false;
          c._remaining = 0;
        }
      } else {
        c._remaining = -1; // unlimited
      }
    });
    
    this.currentChoices = choices;
  }

  renderDailyInterface() {
    console.log('🎯 Rendering daily interface in three-section layout...');
    
    // Update visual section background
    this.updateVisualSection();
    
    // Update event section content
    this.updateEventSection();
    
    // Update control section status
    this.updateControlSection();
    
    // Show the main game container if not already visible
    this.showMainGameInterface();
  }

  updateVisualSection() {
    this.setCorrectVisualBackground();

    // HUD badges only — route info moved to event section
    const hudDay = document.getElementById('hud-day');
    const hudWeather = document.getElementById('hud-weather');
    const hudHealth = document.getElementById('hud-health');
    if (hudDay) hudDay.textContent = this.gameState.getFormattedDate();
    if (hudWeather) {
      const weatherIconMap = { 'fair':'weather-icons-sun.png', 'hot':'weather-icons-sun.png', 'cold':'weather-icons-cloudy.png', 'stormy':'weather-icons-lightning.png' };
      const wIcon = weatherIconMap[this.gameState.weather] || 'weather-icons-sun.png';
      const wLabel = { 'fair':'Fair','hot':'Hot','cold':'Cold','stormy':'Stormy' }[this.gameState.weather] || 'Fair';
      hudWeather.innerHTML = `<img src="images/${wIcon}" class="ri" alt=""> ${wLabel}`;
    }
    if (hudHealth) {
      hudHealth.innerHTML = `<img src="images/resource-icons-health.png" class="ri" alt=""> ${this.gameState.getHealthStatus()}`;
    }

    // Hide the title card on the image
    const titleCard = document.getElementById('location-title-card');
    if (titleCard) titleCard.style.display = 'none';

    // Update route strip + weather
    this.updateTravelingPartySprite();
    this.updateWeatherEffects();
    this.updatePartyPortraits();
  }

  updatePartyPortraits() {
    let container = document.getElementById('party-portraits-panel');
    if (!container) {
      const eventSection = document.getElementById('game-event-area');
      if (!eventSection) return;
      container = document.createElement('div');
      container.id = 'party-portraits-panel';
      container.className = 'party-portraits-panel';
      const choicesEl = eventSection.querySelector('.choices-container');
      if (choicesEl) {
        choicesEl.after(container);
      } else {
        eventSection.appendChild(container);
      }
    }

    const members = this.gameState.partyMembers;
    if (!members || members.length === 0) return;

    const leaderPortraits = {
      'INTELLECTUAL': 'images/character-portraits-elizier-ben-yehuda.png',
      'CRAFTSMAN': 'images/charcter-portraits-yaakov-the-builder.png',
      'MERCHANT': 'images/character-portraits-morechai-goldberg-merchant.png',
      'RELIGIOUS_SCHOLAR': 'images/charcter-portraits-rabbi-shmuel.png',
      'FORMER_FARMER': 'images/charcter-portraits-avraham-farmer.png',
      'NURSE': 'images/character-portraits-sofie-stern.png',
      'TEACHER': 'images/character-portraits-miriam-goldstein.png',
      'CHILD': 'images/character-portraits-mia.png'
    };

    const leaderNames = {
      'INTELLECTUAL': 'Eliezer Ben-Yehuda',
      'CRAFTSMAN': 'Yaakov the Builder',
      'MERCHANT': 'Mordechai Goldberg',
      'RELIGIOUS_SCHOLAR': 'Rabbi Shmuel Mohilever',
      'FORMER_FARMER': 'Avraham the Farmer',
      'NURSE': 'Sofie Stern',
      'TEACHER': 'Miriam Goldstein',
      'CHILD': 'Mia Hoover'
    };

    // Leader section — from selected profession, NOT from partyMembers
    const prof = this.gameState.selectedProfession || 'CHILD';
    const leaderImg = leaderPortraits[prof] || 'images/resource-icons-party.png';
    const leaderName = leaderNames[prof] || 'Leader';

    let html = '<div class="pp-leader">';
    html += `<img src="${leaderImg}" alt="${leaderName}" class="pp-leader-img" />`;
    html += `<div class="pp-leader-info">`;
    html += `<div class="pp-leader-name">${leaderName}</div>`;
    html += `<div class="pp-leader-role">Party Leader</div>`;
    html += `<div class="pp-leader-hp-bar"><div class="pp-leader-hp-fill" style="width:100%"></div></div>`;
    html += `</div></div>`;

    // Party members (all companions)
    html += '<div class="pp-title">Traveling Party</div><div class="pp-grid">';
    members.forEach(m => {
      const imgSrc = ZionistH.getPortraitImage(m);
      const healthPct = Math.ceil(m.health);
      const alive = m.isAlive;
      const sick = m.isDiseased;
      const statusClass = !alive ? 'deceased' : sick ? 'sick' : healthPct < 40 ? 'low-health' : '';

      html += `<div class="pp-member ${statusClass}" title="${m.fullName} - ${alive ? 'HP: ' + healthPct + '%' : 'Deceased'}" onclick="window._showMemberDetail('${m.id}')" style="cursor:pointer;">
        <img src="${imgSrc}" alt="${m.firstName}" class="pp-img" />
        <div class="pp-name">${m.firstName}</div>
        <div class="pp-hp" style="width:${alive ? healthPct : 0}%"></div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    // Set up click handler
    const self = this;
    window._showMemberDetail = function(memberId) {
      const member = self.gameState.partyMembers.find(m => String(m.id) === String(memberId));
      if (member) self.showMemberDetailPanel(member);
    };
  }

  updateTravelingPartySprite() {
    // Update the route progress strip instead of the old party overlay
    this.updateRouteStrip();
  }

  updateRouteStrip() {
    const stopsContainer = document.getElementById('route-stops');
    const routeLine = document.getElementById('route-line');
    const partyIcon = document.getElementById('route-party-icon');
    if (!stopsContainer || !this.storyConfig) return;

    // Build ordered route chain
    const routeKeys = [];
    let key = 'warsaw';
    while (key && this.storyConfig.locations[key]) {
      routeKeys.push(key);
      const loc = this.storyConfig.locations[key];
      if (loc.isDestination || !loc.nextLocations || loc.nextLocations.length === 0) break;
      key = loc.nextLocations[0];
    }

    const currentKey = this.gameState.currentLocation || 'warsaw';
    const currentIdx = routeKeys.indexOf(currentKey);

    // Short labels for each stop
    const shortNames = {
      'warsaw': 'Warsaw', 'krakow': 'Kraków', 'vienna': 'Vienna',
      'trieste': 'Trieste', 'mediterranean': 'Sea', 'jaffa': 'Jaffa',
      'tel_aviv': 'Tel Aviv', 'rishon_lezion': 'Rishon', 'rehovot': 'Rehovot',
      'hebron': 'Hebron', 'bethlehem': 'Bethlehem', 'jerusalem': 'Jerusalem'
    };

    // Render stop dots
    stopsContainer.innerHTML = '';
    routeKeys.forEach((rk, idx) => {
      const stop = document.createElement('div');
      stop.className = 'route-stop';
      if (idx < currentIdx) stop.classList.add('visited');
      if (idx === currentIdx) stop.classList.add('current');

      const dot = document.createElement('div');
      // Jerusalem gets a special menorah-shaped dot
      if (rk === 'jerusalem') {
        dot.className = 'route-stop-dot route-menorah';
        dot.innerHTML = '<svg viewBox="0 0 24 20" width="18" height="15"><path d="M12 2 L12 14 M4 4 Q4 10 8 12 L8 14 M20 4 Q20 10 16 12 L16 14 M7 2 Q7 8 10 11 M17 2 Q17 8 14 11 M3 14 L21 14" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
      } else {
        dot.className = 'route-stop-dot';
      }
      stop.appendChild(dot);

      const label = document.createElement('div');
      label.className = 'route-stop-label';
      label.textContent = shortNames[rk] || rk;
      stop.appendChild(label);

      stopsContainer.appendChild(stop);
    });

    // Calculate progress for the filled line + party icon position
    const totalStops = routeKeys.length - 1;
    let progressPct = 0;
    if (totalStops > 0) {
      // Base: the fraction of completed segments
      const completedSegments = currentIdx;
      // Add intra-segment progress
      const loc = this.gameState.getCurrentLocation(this.storyConfig);
      let segFraction = 0;
      if (loc && loc.distanceToNext && this.gameState.segmentDistance) {
        segFraction = Math.min(1, this.gameState.segmentDistance / loc.distanceToNext);
      }
      progressPct = ((completedSegments + segFraction) / totalStops) * 100;
    }

    // Update filled line
    if (routeLine) {
      routeLine.style.setProperty('--route-progress', `${progressPct}%`);
    }

    // Position the party icon
    if (partyIcon) {
      const leftPct = 3 + (progressPct * 0.94);
      partyIcon.style.left = `${leftPct}%`;

      // Route-segment-aware sprite (train when on train, ship at sea, etc.)
      const trainSegments = ['warsaw', 'krakow', 'vienna'];
      const seaSegments = ['trieste', 'mediterranean'];
      const isTraveling = this.gameState.segmentDistance > 0;

      let sprite = 'images/party-walking.png';
      if (isTraveling && trainSegments.includes(currentKey)) {
        sprite = 'images/travel-party-train.png';
      } else if (isTraveling && seaSegments.includes(currentKey)) {
        sprite = 'images/travel-party-sea.png';
      } else if (['hebron', 'bethlehem'].includes(currentKey)) {
        sprite = 'images/travel-party-hills.png';
      } else if (['jaffa', 'tel_aviv', 'rishon_lezion', 'rehovot', 'jerusalem'].includes(currentKey)) {
        sprite = 'images/travel-party-palestine.png';
      }
      partyIcon.src = sprite;
    }
  }

  getPartyHealthIcon() {
    const health = this.gameState.groupHealth;
    if (health >= 80) return '<img src="images/resource-icons-health.png" class="ri" alt="">';
    if (health >= 60) return '<img src="images/resource-icons-health.png" class="ri" alt="" style="filter:hue-rotate(40deg);">';
    if (health >= 40) return '<img src="images/resource-icons-health.png" class="ri" alt="" style="filter:hue-rotate(20deg);">';
    if (health >= 20) return '<img src="images/resource-icons-health.png" class="ri" alt="" style="filter:hue-rotate(0deg) saturate(2);">';
    return '<img src="images/resource-icons-health.png" class="ri" alt="" style="filter:grayscale(1);">';
  }

  updateEventSection() {
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    const locName = location ? location.name : 'the trail';
    const segDist = this.gameState.segmentDistance || 0;
    const distToNext = location ? (location.distanceToNext || 0) : 0;
    const isTraveling = segDist > 0 && distToNext > 0;

    // Title shows day + where we are or where we're going
    if (eventTitle) {
      if (isTraveling && location.nextLocations && location.nextLocations.length > 0) {
        const nextLoc = this.storyConfig.locations[location.nextLocations[0]];
        const nextName = nextLoc ? nextLoc.name : 'next stop';
        const trainSegs = ['warsaw', 'krakow', 'vienna'];
        const seaSegs = ['trieste', 'mediterranean'];
        const locKey = this.gameState.currentLocation || 'warsaw';
        let prefix = 'En route to';
        if (trainSegs.includes(locKey)) prefix = 'By train to';
        else if (seaSegs.includes(locKey)) prefix = 'By ship to';
        eventTitle.textContent = `${this.gameState.getFormattedDate()} — ${prefix} ${nextName}`;
      } else {
        eventTitle.textContent = `${this.gameState.getFormattedDate()} — ${locName}`;
      }
    }
    
    if (eventDescription) {
      let html = '<div class="route-info-panel">';
      
      // Route progress
      if (isTraveling && location.nextLocations) {
        const nextLoc = this.storyConfig.locations[location.nextLocations[0]];
        const pct = Math.round((segDist / distToNext) * 100);
        const kmLeft = Math.ceil(distToNext - segDist);
        html += `<div class="ri-row"><span class="ri-label">Destination:</span> <strong>${nextLoc ? nextLoc.name : '?'}</strong> — ${pct}% complete, ${kmLeft} km left</div>`;
      } else if (location) {
        html += `<div class="ri-row"><span class="ri-label">Location:</span> <strong>${locName}</strong></div>`;
        if (location.description) html += `<div class="ri-row ri-desc">${location.description}</div>`;
      }
      
      // Resources summary line — transport-mode-aware
      const terrain = location ? location.terrain : 'road';
      const locationKey = this.gameState.currentLocation || 'warsaw';
      const trainSegments = ['warsaw', 'krakow', 'vienna'];
      const seaSegments = ['trieste', 'mediterranean'];
      let travelMode;
      if (isTraveling && trainSegments.includes(locationKey)) {
        travelMode = 'By Train';
      } else if (isTraveling && seaSegments.includes(locationKey)) {
        travelMode = 'By Ship';
      } else {
        const terrainNames = { city:'City', road:'Road', port:'Port', sea:'Open Sea', settlement:'Settlement', farmland:'Farmland', mountain:'Mountain' };
        travelMode = terrainNames[terrain] || terrain;
      }
      html += `<div class="ri-row ri-resources">`;
      html += `<span><span class="ri-label">Terrain:</span> ${travelMode}</span>`;
      html += `<span><span class="ri-label">Food:</span> ${Math.ceil(this.gameState.inventory.food)}</span>`;
      html += `<span><span class="ri-label">Water:</span> ${Math.ceil(this.gameState.inventory.water)}</span>`;
      html += `<span><span class="ri-label">Money:</span> ${this.gameState.money}</span>`;
      html += `</div>`;
      
      html += '</div>';
      
      // Segment-aware flavor text
      let flavor = '';
      if (isTraveling) {
        // Travel flavor based on which segment we're on
        const segmentFlavors = {
          'warsaw':        ['The train rattles through the Polish countryside. Snow-covered fields pass by the window.',
                           'Fellow passengers share bread and stories. The rhythmic clacking of the rails fills the carriage.',
                           'You watch small villages flash past through the frosted window.'],
          'krakow':        ['The express train to Vienna cuts through rolling hills and forests.',
                           'The conductor checks your tickets. Outside, the landscape grows more mountainous.',
                           'Austrian border guards board the train briefly, then wave you through.'],
          'vienna':        (() => {
            const loc = this.gameState.getCurrentLocation(this.storyConfig);
            const seg = this.gameState.segmentDistance || 0;
            const total = loc ? (loc.distanceToNext || 300) : 300;
            const pct = total > 0 ? seg / total : 0;
            if (pct < 0.3) return [
              'The train climbs into the Alps. Snow-dusted peaks tower above the tracks.',
              'The Südbahn railway carves through mountain passes. The air grows crisp and cold.',
              'Tunnels plunge the carriage into darkness, then burst open to reveal breathtaking Alpine vistas.'
            ];
            if (pct < 0.6) return [
              'Snow blankets the highest peaks as the train winds through the Semmering Pass.',
              'The railway crosses a massive stone viaduct. Below, a frozen valley stretches into the mist.',
              'Fellow passengers press their faces to the glass — the snow-covered Alps are magnificent.'
            ];
            if (pct < 0.85) return [
              'The train begins its long descent. The mountains give way to green hills and warmer air.',
              'You catch your first glimpse of the Adriatic Sea glittering in the distance below.',
              'The landscape softens — Mediterranean pines replace Alpine firs. Trieste draws near.'
            ];
            return [
              'The train rounds the final bend. Trieste spreads below — a busy port city on the sparkling Adriatic.',
              'Ships crowd the harbor as the train pulls into the coastal lowlands. The smell of salt air fills the carriage.',
              'You can see the steamships at anchor. Your sea journey is about to begin.'
            ];
          })(),
          'trieste':       ['The steamship creaks as it pulls away from the harbor. The open sea awaits.',
                           'Seagulls follow your ship as the Italian coast fades into the horizon.',
                           'The ship pitches gently on the Adriatic swells. Trieste shrinks behind you.'],
          'mediterranean': (() => {
            const loc = this.gameState.getCurrentLocation(this.storyConfig);
            const seg = this.gameState.segmentDistance || 0;
            const total = loc ? (loc.distanceToNext || 400) : 400;
            const pct = total > 0 ? seg / total : 0;
            if (pct < 0.3) return [
              'The Adriatic stretches ahead, blue and endless. Italy disappears behind you.',
              'Your fellow passengers settle into the rhythms of ship life. The voyage has only just begun.',
              'The crew sings as they work the rigging. The open Mediterranean beckons.'
            ];
            if (pct < 0.7) return [
              'Days blur together on the open sea. The routine of ship life settles in.',
              'Nothing but blue water in every direction. The ship presses steadily south.',
              'The Mediterranean sun beats down on the deck. Passengers doze in whatever shade they can find.'
            ];
            return [
              'The captain announces land should be visible soon. Excitement ripples through the passengers.',
              'Seabirds appear overhead — a sure sign that the coast is near!',
              'The water changes color as you approach the shallows. Palestine is close!'
            ];
          })(),
          'jaffa':         ['Dusty roads lead through groves of citrus and olive trees.',
                           'The warm air carries the scent of orange blossoms.',
                           'Arab farmers wave from their fields as your party passes.'],
          'tel_aviv':      ['Sand gives way to simple buildings and new construction.',
                           'The sound of hammers echoes — pioneers are building everywhere.',
                           'Hebrew signs mark the new streets being laid.'],
          'rishon_lezion': ['Vineyards line the road between the settlements.',
                           'The smell of fresh earth and growing things fills the air.',
                           'Fellow pioneers share water from a roadside well.'],
          'rehovot':       ['The road climbs into the Judean hills.',
                           'Ancient stone terraces line the hillsides.',
                           'The air grows cooler as you gain elevation.'],
          'hebron':        ['Olive groves give way to rocky paths downhill.',
                           'The road narrows between ancient stone walls.',
                           'A shepherd watches your party from a nearby hilltop.'],
          'bethlehem':     ['The final stretch to Jerusalem. Your heart pounds.',
                           'The road rises steadily toward the Holy City.',
                           'Other pilgrims join the road, all headed the same way.'],
        };
        const options = segmentFlavors[locationKey] || ['Your party presses onward.'];
        flavor = options[Math.floor(this.gameState.day % options.length)];
      } else {
        const cityFlavors = {
          'city': `You have arrived in ${locName}.`,
          'road': 'A crossroads. Routes lead in all directions.',
          'port': `The harbor at ${locName} bustles with activity.`,
          'sea': 'Your ship bobs at anchor.',
          'settlement': `The settlement of ${locName} stretches before you.`,
          'farmland': `Fields and orchards surround ${locName}.`,
          'mountain': `${locName} sits high among the hills.`
        };
        flavor = cityFlavors[terrain] || `You are at ${locName}.`;
      }
      html += `<p class="route-flavor">${flavor} What will you do?</p>`;
      
      eventDescription.innerHTML = html;
    }
    
    const warningsContainer = document.getElementById('event-warnings');
    if (warningsContainer) warningsContainer.innerHTML = '';
    
    this.updateEventChoices();
  }

  updateEventChoices() {
    const choicesContainer = document.querySelector('.choices-container');
    if (!choicesContainer) {
      console.error('❌ Choices container not found!');
      return;
    }
    
    // Clear existing content
    choicesContainer.innerHTML = '';

    // Separate choices into categories
    const infoActions = ['party', 'inventory'];
    const paceAction = 'pace';
    const primaryChoice = this.currentChoices.find(c => c.id === 'continue');
    const actionChoices = this.currentChoices.filter(c => c.id !== 'continue' && !infoActions.includes(c.id) && c.id !== paceAction);
    const infoChoices = this.currentChoices.filter(c => infoActions.includes(c.id));
    const paceChoice = this.currentChoices.find(c => c.id === paceAction);

    let choiceNumber = 1;
    
    // --- ACTIONS section ---
    const actionsLabel = document.createElement('div');
    actionsLabel.className = 'choices-section-label';
    actionsLabel.textContent = 'Actions';
    choicesContainer.appendChild(actionsLabel);

    const actionsGrid = document.createElement('div');
    actionsGrid.className = 'daily-choices-grid';
    
    if (primaryChoice && primaryChoice.available) {
      actionsGrid.appendChild(this.createChoiceButton(primaryChoice, true, choiceNumber++));
    }
    actionChoices.forEach(choice => {
      actionsGrid.appendChild(this.createChoiceButton(choice, false, choiceNumber++));
    });
    choicesContainer.appendChild(actionsGrid);

    // --- INFO section ---
    if (infoChoices.length > 0) {
      const infoLabel = document.createElement('div');
      infoLabel.className = 'choices-section-label';
      infoLabel.textContent = 'Information';
      choicesContainer.appendChild(infoLabel);

      const infoGrid = document.createElement('div');
      infoGrid.className = 'daily-choices-grid info-grid';
      infoChoices.forEach(choice => {
        infoGrid.appendChild(this.createChoiceButton(choice, false, choiceNumber++));
      });
      choicesContainer.appendChild(infoGrid);
    }

    // --- PACE row with travel party image ---
    if (paceChoice) {
      const paceRow = document.createElement('div');
      paceRow.className = 'pace-row';

      // Get the correct travel sprite
      const locationKey = this.gameState.currentLocation || 'warsaw';
      const trainSegs = ['warsaw', 'krakow', 'vienna'];
      const seaSegs = ['trieste', 'mediterranean'];
      const isTraveling = (this.gameState.segmentDistance || 0) > 0;
      let sprite = 'images/party-walking.png';
      if (isTraveling && trainSegs.includes(locationKey)) sprite = 'images/travel-party-train.png';
      else if (isTraveling && seaSegs.includes(locationKey)) sprite = 'images/travel-party-sea.png';
      else if (['hebron', 'bethlehem'].includes(locationKey)) sprite = 'images/travel-party-hills.png';
      else if (['jaffa', 'tel_aviv', 'rishon_lezion', 'rehovot', 'jerusalem'].includes(locationKey)) sprite = 'images/travel-party-palestine.png';

      const paceNames = { 1: 'Slow', 2: 'Normal', 3: 'Fast' };
      const currentPace = paceNames[this.gameState.pace] || 'Normal';
      const currentRations = this.gameState.rations === ZionistH.RATIONS_BARE ? 'Bare Bones' : this.gameState.rations === ZionistH.RATIONS_MEAGER ? 'Meager' : 'Filling';

      paceRow.innerHTML = `
        <img src="${sprite}" alt="Travel party" class="pace-row-img" />
        <span class="pace-row-text">Pace: <strong>${currentPace}</strong> | Rations: <strong>${currentRations}</strong></span>
      `;
      paceRow.style.cursor = 'pointer';
      paceRow.addEventListener('click', () => this.handleDailyChoice(paceChoice.id));
      choicesContainer.appendChild(paceRow);
    }
  }

  createChoiceButton(choice, isPrimary = false, number = 0) {
    const utilityActions = ['party', 'inventory', 'pace', 'medicine'];
    const isUtility = utilityActions.includes(choice.id);
    const choiceBtn = document.createElement('button');
    choiceBtn.className = `event-choice ${choice.available ? 'available' : 'unavailable'}${isPrimary ? ' primary-action' : ''}${isUtility ? ' utility-action' : ''}`;
    choiceBtn.dataset.choiceId = choice.id;
    choiceBtn.disabled = !choice.available;
    
    choiceBtn.innerHTML = `
      <div class="action-content">
        <div class="action-details">
          <div class="action-text">${choice._remaining === 0 ? choice.text + ' (max reached)' : choice.text}</div>
        </div>
        ${choice._remaining >= 0 ? `<div class="action-remaining">${choice._remaining > 0 ? choice._remaining : '–'}</div>` : ''}
      </div>
    `;
    
    if (choice.available) {
      choiceBtn.addEventListener('click', () => this.handleDailyChoice(choice.id));
    }
    
    return choiceBtn;
  }

  updateControlSection() {
    // Update status display
    this.updateStatusDisplay();
    
    // Update progress bar
    const progress = this.gameState.getProgressPercentage();
    const progressFill = document.getElementById('mini-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
  }

  updateStatusDisplay() {
    // Update individual status items
    const updateElement = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      } else {
        console.warn(`⚠️ Missing status element: ${id}`);
      }
    };
    
    updateElement('display-day', this.gameState.getFormattedDate());
    updateElement('display-health', this.gameState.getHealthStatus());
    updateElement('display-food', Math.ceil(this.gameState.inventory.food));
    updateElement('display-water', Math.ceil(this.gameState.inventory.water));
    updateElement('display-money', this.gameState.money);
  }

  updateWeatherEffects() {
    const weatherOverlay = document.getElementById('weather-effects');
    if (weatherOverlay) {
      // Clear previous weather classes
      weatherOverlay.className = weatherOverlay.className.replace(/weather-\w+/g, '');
      
      // Add current weather class
      const weatherClass = this.getWeatherCSSClass();
      if (weatherClass) {
        weatherOverlay.classList.add(weatherClass);
      }
    }
  }

  showMainGameInterface() {
    // Hide all screen overlays
    document.querySelectorAll('.overlay').forEach(overlay => {
      overlay.classList.remove('active');
    });

    // Clear game-container background classes
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.className = gameContainer.className.replace(/location-\w+|scene-\w+/g, '');
    }

    // Show main game container
    const mainGame = document.getElementById('main-game');
    if (mainGame) {
      mainGame.className = 'main-game-container active';
      mainGame.style.display = 'flex';
    }

    // Hide the visual-overlay-container and location-info-banner — 
    // the ornate viewport frame with its background IS the visual scene
    const overlayContainer = document.getElementById('visual-overlay-container');
    if (overlayContainer) overlayContainer.style.display = 'none';
    const infoBanner = document.getElementById('location-info-banner');
    if (infoBanner) infoBanner.style.display = 'none';

    // Set background and update content
    this.setCorrectVisualBackground();
    this.updateVisualSection();
    this.updateEventSection();
    this.updateControlSection();
  }

  setCorrectVisualBackground() {
    const locationBg = document.getElementById('location-background');
    if (!locationBg) return;
    
    locationBg.className = 'location-bg-fullscreen';
    
    const locationKey = this.gameState.currentLocation || 'warsaw';
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    const segDist = this.gameState.segmentDistance || 0;
    const distToNext = location ? (location.distanceToNext || 0) : 0;
    const isTraveling = segDist > 0 && distToNext > 0;
    
    if (isTraveling) {
      // Route-segment-specific travel backgrounds
      const trainSegments = ['warsaw', 'krakow', 'vienna'];
      const seaSegments = ['trieste', 'mediterranean'];
      const weather = this.gameState.weather;
      const segmentBgMap = {
        'warsaw':        'travel-train',
        'krakow':        'travel-train',
        'vienna':        'travel-train',
        'trieste':       'travel-sea-adriatic',
        'mediterranean': 'travel-sea-med',
        'jaffa':         'travel-palestine',
        'tel_aviv':      'travel-palestine',
        'rishon_lezion': 'travel-palestine',
        'rehovot':       'travel-palestine-road',
        'hebron':        'travel-palestine-mountain',
        'bethlehem':     'travel-palestine-hills',
      };
      let travelClass = segmentBgMap[locationKey] || 'travel-road';

      // Vienna→Trieste segment: progressive Alpine backgrounds based on journey progress
      if (locationKey === 'vienna' && weather !== 'stormy' && weather !== 'rainy') {
        const pct = distToNext > 0 ? segDist / distToNext : 0;
        if (pct < 0.3) {
          travelClass = 'travel-train-alps';        // Alpine mountains
        } else if (pct < 0.6) {
          travelClass = 'travel-train-alps-snow';    // Snow-covered peaks
        } else if (pct < 0.85) {
          travelClass = 'travel-train-trieste';      // Descending toward coast
        } else {
          travelClass = 'travel-train-trieste-port'; // Approaching Trieste port
        }
      }

      // Weather overrides for specific travel modes
      const palestineSegments = ['jaffa','tel_aviv','rishon_lezion','rehovot','hebron','bethlehem','jerusalem'];
      if (weather === 'stormy' || weather === 'rainy') {
        if (trainSegments.includes(locationKey)) {
          travelClass = 'event-train-rain';
        } else if (seaSegments.includes(locationKey)) {
          travelClass = locationKey === 'trieste' ? 'event-adriatic-stormy' : 'event-storm';
        } else if (palestineSegments.includes(locationKey)) {
          travelClass = 'event-palestine-rain';
        } else {
          travelClass = 'event-rain';
        }
      } else if (trainSegments.includes(locationKey) && locationKey !== 'vienna' && this.gameState.day % 2 === 0) {
        // Alternate train images by day (not Vienna — it has progressive Alps backgrounds)
        travelClass = 'travel-train-alt';
      }
      locationBg.classList.add(travelClass);
    } else {
      const cssMappings = {
        'warsaw': 'location-warsaw',
        'krakow': 'location-krakow',
        'vienna': 'location-vienna',
        'trieste': 'location-trieste',
        'mediterranean': 'location-mediterranean',
        'jaffa': 'location-jaffa',
        'tel_aviv': 'location-tel-aviv',
        'rishon_lezion': 'location-rishon-lezion',
        'rehovot': 'location-rehovot',
        'hebron': 'location-hebron',
        'bethlehem': 'location-bethlehem',
        'jerusalem': 'location-jerusalem'
      };
      const cssClass = cssMappings[locationKey] || 'location-warsaw';
      locationBg.classList.add(cssClass);
    }
  }

  showResourceWarnings() {
    const warningsContainer = document.getElementById('event-warnings');
    if (!warningsContainer) {
      console.warn('Event warnings container not found!');
      return;
    }
    
    warningsContainer.innerHTML = '';
    
    const warnings = [];
    
    // Food warnings
    const daysOfFood = this.calculateDaysOfFood();
    if (daysOfFood <= 0) {
      warnings.push('No food remaining! Your party is starving!');
    } else if (daysOfFood <= 3) {
      warnings.push(`Food critically low! Only ${daysOfFood} days remaining.`);
    } else if (daysOfFood <= 7) {
      warnings.push(`Food running low. ${daysOfFood} days of food left.`);
    }
    
    // Water warnings  
    const daysOfWater = this.calculateDaysOfWater();
    if (daysOfWater <= 0) {
      warnings.push('No water remaining! Severe dehydration!');
    } else if (daysOfWater <= 2) {
      warnings.push(`Water critically low! Only ${daysOfWater} days remaining.`);
    } else if (daysOfWater <= 5) {
      warnings.push(`Water running low. ${daysOfWater} days of water left.`);
    }
    
    // Health warnings
    if (this.gameState.groupHealth < 30) {
      warnings.push('Party health is very poor! Rest or medical attention needed.');
    } else if (this.gameState.groupHealth < 60) {
      warnings.push('Party health is declining. Consider resting.');
    }
    
    // Disease warnings
    const sickCount = this.gameState.partyMembers.filter(m => m.isAlive && m.isDiseased).length;
    if (sickCount > 0) {
      warnings.push(`${sickCount} party member(s) are sick and need medicine.`);
    }
    
    // Money warnings
    if (this.gameState.money < 50) {
      warnings.push('Money is running low. Trade carefully.');
    }
    
    // Only show warnings container if there are warnings
    if (warnings.length > 0) {
      warnings.forEach(warning => {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'event-warning';
        warningDiv.textContent = warning;
        warningsContainer.appendChild(warningDiv);
      });
      warningsContainer.style.display = 'block';
    } else {
      warningsContainer.style.display = 'none';
    }
  }

  handleDailyChoice(choiceId) {
    if (!this.isWaitingForChoice) return;
    
    this.isWaitingForChoice = false;

    // Track daily action usage for limited actions
    const limitedActions = ['talk','hunt','forage','train_cards','train_vendor','ship_dice','ship_galley','ship_explore','explore_ruins','trade_bedouin','rest','supplies'];
    if (limitedActions.includes(choiceId)) {
      this.dailyActionCounts[choiceId] = (this.dailyActionCounts[choiceId] || 0) + 1;
    }

    switch (choiceId) {
      case 'continue':
        this.handleContinueJourney();
        break;
      case 'rest':
        this.handleRest();
        break;
      case 'supplies':
        this.handleLookForSupplies();
        break;
      case 'trade':
        this.handleTrade();
        break;
      case 'talk':
        this.handleTalk();
        break;
      case 'hunt':
        this.handleHunt();
        break;
      case 'forage':
        this.handleForage();
        break;
      case 'party':
        this.handleCheckParty();
        break;
      case 'inventory':
        this.showInventoryPanel();
        break;
      case 'pace':
        this.handleChangePace();
        break;
      case 'medicine':
        this.handleTreatSick();
        break;
      case 'train_vendor':
        this.handleTrainVendor();
        break;
      case 'train_cards':
        this.handleTrainCards();
        break;
      case 'ship_galley':
        this.handleShipGalley();
        break;
      case 'ship_dice':
        this.handleShipDice();
        break;
      case 'ship_explore':
        this.handleExploreShip();
        break;
      case 'explore_ruins':
        this.handleExploreRuins();
        break;
      case 'trade_bedouin':
        this.handleTradeBedouin();
        break;
      default:
        console.warn('Unknown choice:', choiceId);
        this.isWaitingForChoice = true;
    }
  }

  handleContinueJourney() {
    // If game is already won or at destination, go straight to victory
    if (this.gameState.gameWon || this.isAtDestination()) { this.handleVictory(); return; }

    // First departure from Warsaw — special boarding day, no travel
    const departingWarsaw = this.gameState.currentLocation === 'warsaw' && this.gameState.segmentDistance === 0;

    if (departingWarsaw) {
      this.gameState.advanceDay();
      this.dailyActionCounts = {}; // reset for new day
      this._talkedToToday = []; // reset NPC dedup
      const narrative = [
        { text: 'With tears and embraces, your family says their final goodbyes at the Warsaw train station.', type: 'neutral' },
        { text: 'The platform is crowded with other Jewish families, all clutching their belongings and their hopes.', type: 'neutral' },
        { text: 'You board the train bound for Kraków. The engine hisses and the wheels begin to turn. There is no going back.', type: 'positive' },
      ];
      // Mark that we started (set tiny distance so next day actually travels)
      this.gameState.segmentDistance = 1;
      this.showDayNarrative(narrative, () => {
        this.ui.refreshStats();
        this.updateVisualSection();
        this.showDailyChoices();
      });
      const bg = document.getElementById('location-background');
      if (bg) bg.className = 'location-bg-fullscreen event-farewell';
      return;
    }

    // Store alive count before advancing day
    const aliveBefore = this.gameState.getAlivePartyMembers().map(m => m.id);
    
    // Core game tick
    this.gameState.advanceDay();
    this.dailyActionCounts = {}; // reset action limits for new day
    this._talkedToToday = []; // reset NPC dedup for new day
    
    // Build narrative log for this day
    const narrative = [];
    
    // Check for party member deaths since last turn
    const aliveAfter = this.gameState.getAlivePartyMembers().map(m => m.id);
    const died = aliveBefore.filter(id => !aliveAfter.includes(id));
    died.forEach(id => {
      const member = this.gameState.partyMembers.find(m => m.id === id);
      if (member) {
        narrative.push({ text: `${member.fullName} has died from ${member.diseaseType || 'exhaustion'}.`, type: 'negative' });
      }
    });

    // Resource consumption summary
    const food = Math.ceil(this.gameState.inventory.food);
    const water = Math.ceil(this.gameState.inventory.water);
    if (food <= 0) narrative.push({ text: 'No food! Your party is starving!', type: 'negative' });
    else if (food < 50) narrative.push({ text: `Food is low: ${food} lbs remaining.`, type: 'warning' });
    if (water <= 0) narrative.push({ text: 'No water! Dehydration is setting in!', type: 'negative' });
    else if (water < 30) narrative.push({ text: `Water is low: ${water} gallons remaining.`, type: 'warning' });

    // Sickness check
    const sick = this.gameState.partyMembers.filter(m => m.isAlive && m.isDiseased);
    if (sick.length > 0) {
      narrative.push({ text: `${sick.map(s => s.firstName).join(', ')} ${sick.length === 1 ? 'is' : 'are'} sick with ${sick[0].diseaseType}.`, type: 'warning' });
    }
    
    // Advance travel
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    let arrivedAtNew = false;
    if (location && location.nextLocations && location.nextLocations.length > 0) {
      const nextLocationKey = this.gameState.advanceTravel(this.storyConfig);
      if (nextLocationKey) {
        arrivedAtNew = true;
        const prevLocationKey = this.gameState.currentLocation;
        const newLoc = this.gameState.travelTo(nextLocationKey, this.storyConfig);
        console.log(`[ARRIVAL] prev=${prevLocationKey} next=${nextLocationKey} newLoc=${newLoc?.name} gameWon=${this.gameState.gameWon}`);
        if (newLoc) {
          // Convert currency when arriving at Jaffa
          if (nextLocationKey === 'jaffa' && this.gameState.currency !== 'lira') {
            const conversion = this.gameState.convertToLira();
            if (conversion) {
              narrative.push({ text: `💱 A money changer converts your ${conversion.oldAmount} rubles to ${conversion.newAmount} Ottoman lira (${conversion.rate} rubles per lira).`, type: 'neutral' });
            }
          }

          narrative.push({ text: `Arrived at ${newLoc.name}!`, type: 'positive' });
          if (newLoc.historicalFact) {
            narrative.push({ text: newLoc.historicalFact, type: 'neutral' });
          }
          // Trigger scripted location events
          if (newLoc.events && newLoc.events.length > 0) {
            const eventKey = newLoc.events[0];
            const game = window.ZionistH.gameInstance;
            if (game && game.event) {
              // Show the narrative first, then the event
              this.showDayNarrative(narrative, () => {
                game.event.triggerScriptedEvent(eventKey, () => {
                  this.ui.refreshStats();
                  // Chain second event if available (e.g. customs → jaffa_arrival, western_wall → settlement_founding)
                  const secondEvent = newLoc.events && newLoc.events.length > 1 ? newLoc.events[1] : null;
                  if (this.gameState.gameWon) {
                    if (secondEvent) {
                      game.event.triggerScriptedEvent(secondEvent, () => {
                        setTimeout(() => this.handleVictory(), 1000);
                      });
                    } else {
                      setTimeout(() => this.handleVictory(), 1000);
                    }
                  } else if (secondEvent) {
                    game.event.triggerScriptedEvent(secondEvent, () => {
                      this.ui.refreshStats();
                      setTimeout(() => this.showDailyChoices(), 800);
                    });
                  } else {
                    setTimeout(() => this.showDailyChoices(), 800);
                  }
                });
              });
              return;
            }
          }
        }
      } else {
        // Still traveling — transport-mode-aware message
        const loc = this.gameState.getCurrentLocation(this.storyConfig);
        const currKey = this.gameState.currentLocation || 'warsaw';
        const segment = loc && loc.distanceToNext ? loc.distanceToNext : 100;
        const pct = Math.min(100, Math.round((this.gameState.segmentDistance / segment) * 100));
        const km = this.gameState.calculateDailyTravel();
        const nextName = loc && loc.nextLocations ? this.storyConfig.locations[loc.nextLocations[0]]?.name : 'next stop';
        const trainSegs = ['warsaw', 'krakow', 'vienna'];
        const seaSegs = ['trieste', 'mediterranean'];
        let travelVerb = 'Traveled';
        if (trainSegs.includes(currKey)) travelVerb = 'The train covered';
        else if (seaSegs.includes(currKey)) travelVerb = 'The ship sailed';
        narrative.push({ text: `${travelVerb} ${km} km today. ${pct}% of the way to ${nextName}.`, type: 'neutral' });

        // Captain's updates at sea — milestone-based, location-aware
        if (seaSegs.includes(currKey)) {
          const captainMilestones = this.gameState.flags._captainMilestones || {};
          const captainUpdate = this.getCaptainUpdate(pct, captainMilestones, currKey);
          if (captainUpdate) {
            narrative.push({ text: captainUpdate.text, type: captainUpdate.type });
            if (captainUpdate.morale) this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + captainUpdate.morale);
            if (captainUpdate.knowledge) this.gameState.historicalKnowledge = (this.gameState.historicalKnowledge || 0) + captainUpdate.knowledge;
            // Captain update can override background (e.g. first glimpse of Holy Land)
            if (captainUpdate.bg) {
              this._pendingBgOverride = captainUpdate.bg;
            }
            this.gameState.flags._captainMilestones = captainMilestones;
          }
        }
      }
    }
    
    // Party member ability events — 15% chance per day
    if (!arrivedAtNew && Math.random() < 0.15) {
      const alive = this.gameState.getAlivePartyMembers();
      const abilityEvents = [];

      // Check each alive member for ability triggers
      alive.forEach(m => {
        const ability = m.specialAbility;
        if (!ability) return;
        switch (ability.name) {
          case 'Master Builder':
            abilityEvents.push({ member: m, text: `${m.firstName} notices a broken wheel on the wagon and repairs it quickly with spare parts. Tools saved!`, type: 'positive', tools: 1, morale: 5 });
            abilityEvents.push({ member: m, text: `${m.firstName} builds a clever rain shelter during the night, keeping everyone dry and warm.`, type: 'positive', health: 5, morale: 8 });
            break;
          case 'Inspiring Leader':
            abilityEvents.push({ member: m, text: `${m.firstName} gathers the group for a Hebrew lesson. Spirits are lifted as everyone practices together!`, type: 'positive', morale: 15, knowledge: 1 });
            abilityEvents.push({ member: m, text: `${m.firstName} tells stories of the pioneers who came before. "We are not alone on this path!" The party rallies.`, type: 'positive', morale: 12 });
            break;
          case 'Expert Forager':
            abilityEvents.push({ member: m, text: `${m.firstName} spots edible plants by the roadside that others missed. Extra food for the party!`, type: 'positive', food: 12 });
            abilityEvents.push({ member: m, text: `${m.firstName}'s farming knowledge helps identify a clean water source. The party refills their supply.`, type: 'positive', water: 10 });
            break;
          case 'Miracle Healer':
            const sick = alive.find(p => p.isDiseased && p.id !== m.id);
            if (sick) {
              abilityEvents.push({ member: m, text: `${m.firstName} uses traditional remedies to treat ${sick.firstName}'s illness. By morning, ${sick.firstName} feels much better!`, type: 'positive', healMember: sick, morale: 10 });
            }
            abilityEvents.push({ member: m, text: `${m.firstName} prepares a herbal tonic that strengthens the whole party. Everyone feels healthier!`, type: 'positive', health: 8 });
            break;
          case 'Master Trader':
            abilityEvents.push({ member: m, text: `${m.firstName} negotiates a deal with a passing merchant, trading old supplies for fresh ones at an excellent price.`, type: 'positive', food: 8, money: 5 });
            abilityEvents.push({ member: m, text: `${m.firstName}'s trade connections pay off — a contact provides supplies at cost!`, type: 'positive', food: 10, water: 5 });
            break;
          case 'Hebrew Revival':
            abilityEvents.push({ member: m, text: `${m.firstName} leads the group in singing Hebrew songs. The ancient words fill everyone with hope.`, type: 'positive', morale: 15, knowledge: 2 });
            break;
          case 'Family Caretaker':
            abilityEvents.push({ member: m, text: `${m.firstName} quietly mends torn clothing and patches blankets. The small comforts matter more than anyone admits.`, type: 'positive', clothing: 1, morale: 5 });
            break;
          case 'Family Unity':
            abilityEvents.push({ member: m, text: `${m.firstName} organizes a family meal, insisting everyone sits together. "We eat as one, we travel as one." Morale soars.`, type: 'positive', morale: 18 });
            break;
          case 'Resourceful Scrounger':
            abilityEvents.push({ member: m, text: `${m.firstName} disappears for an hour and returns with a grin and a bag of food. "Don't ask where I got it."`, type: 'positive', food: 15, money: 3 });
            break;
          case 'Community Helper':
            abilityEvents.push({ member: m, text: `${m.firstName} connects with local Jewish families who offer shelter and provisions for the night.`, type: 'positive', food: 10, water: 8, morale: 10 });
            break;
          case 'Protective Father':
            abilityEvents.push({ member: m, text: `Bandits approach the group, but ${m.firstName} stands firm with a stern look. They think better of it and move on.`, type: 'positive', morale: 15 });
            break;
          case 'Wise Grandfather':
            abilityEvents.push({ member: m, text: `${m.firstName} recalls a shortcut from an old trade route map. The party saves half a day of travel!`, type: 'positive', morale: 8, knowledge: 1 });
            break;
          case 'Lucky Charm':
            abilityEvents.push({ member: m, text: `${m.firstName}'s good luck rubs off on the group — you find coins in the road!`, type: 'positive', money: 8, morale: 5 });
            break;
        }
      });

      if (abilityEvents.length > 0) {
        const evt = abilityEvents[Math.floor(Math.random() * abilityEvents.length)];
        narrative.push({ text: evt.text, type: evt.type });
        if (evt.morale) this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + evt.morale);
        if (evt.health) alive.forEach(a => { a.health = Math.min(100, a.health + evt.health); });
        if (evt.food) this.gameState.inventory.food += evt.food;
        if (evt.water) this.gameState.inventory.water += evt.water;
        if (evt.money) this.gameState.money += evt.money;
        if (evt.tools) this.gameState.inventory.tools += evt.tools;
        if (evt.clothing) this.gameState.inventory.clothing += evt.clothing;
        if (evt.knowledge) this.gameState.historicalKnowledge = (this.gameState.historicalKnowledge || 0) + evt.knowledge;
        if (evt.healMember) {
          evt.healMember.isDiseased = false;
          evt.healMember.diseaseType = null;
          evt.healMember.health = Math.min(100, evt.healMember.health + 20);
        }
      }
    }

    // Weather narration
    if (this.gameState.weather === 'stormy') {
      narrative.push({ text: 'A storm slows your progress.', type: 'warning' });
    } else if (this.gameState.weather === 'hot') {
      narrative.push({ text: 'The heat is oppressive. Water goes faster.', type: 'warning' });
    }
    
    // Train derailment random event
    const currKey = this.gameState.currentLocation || 'warsaw';
    const onTrain = ['warsaw', 'krakow', 'vienna'].includes(currKey) && this.gameState.segmentDistance > 0;
    const onSea = ['trieste', 'mediterranean'].includes(currKey) && this.gameState.segmentDistance > 0;
    const inCity = !this.gameState.segmentDistance || this.gameState.segmentDistance === 0;
    const inPalestine = ['jaffa','tel_aviv','rishon_lezion','rehovot','hebron','bethlehem','jerusalem'].includes(currKey);

    // Random travel events — ~25% chance per day
    if (!arrivedAtNew && Math.random() < 0.25) {
      const randomMember = this.gameState.getAlivePartyMembers()[Math.floor(Math.random() * this.gameState.getAlivePartyMembers().length)];
      const memberName = randomMember ? randomMember.firstName : 'Someone';
      let evt = null;

      if (onTrain) {
        const trainEvents = [
          { text: `${memberName} strikes up a conversation with a fellow traveler who shares stories of the Holy Land.`, type: 'positive', morale: 5, knowledge: 1 },
          { text: `A pickpocket on the train steals some of your money!`, type: 'negative', money: -(3 + Math.floor(Math.random() * 8)) },
          { text: `${memberName} feels unwell after eating something from a station vendor.`, type: 'warning', sicken: true },
          { text: `You find a forgotten bundle under a seat — it contains useful supplies!`, type: 'positive', food: 8, tools: 1 },
          { text: `Border guards at a checkpoint delay the train for hours while checking papers.`, type: 'warning', morale: -5 },
          { text: `A doctor traveling on the train offers to examine your party for free. Everyone feels better!`, type: 'positive', health: 8, medicine: 1 },
          { text: `${memberName} wins a small bet with fellow passengers.`, type: 'positive', money: 5, morale: 3 },
          { text: `The train passes through a beautiful mountain valley. The view lifts everyone's spirits.`, type: 'positive', morale: 8 },
          { text: `A charitable organization hands out warm clothing at a station stop.`, type: 'positive', clothing: 2, morale: 3 },
          { text: `A pharmacist boards at the last stop and sells you medicine at a discount.`, type: 'positive', medicine: 2, money: -4 },
        ];
        evt = trainEvents[Math.floor(Math.random() * trainEvents.length)];
      } else if (onSea) {
        const seaEvents = [
          { text: `${memberName} gets terribly seasick. The rocking of the ship is relentless.`, type: 'negative', sicken: true, bg: 'event-ship-talk' },
          { text: `A sailor teaches your party how to tie knots and mend sails. Useful skills!`, type: 'positive', morale: 5, knowledge: 1, bg: 'event-shipdeck' },
          { text: `A wave crashes over the deck, soaking supplies! Some food is ruined.`, type: 'negative', food: -(5 + Math.floor(Math.random() * 10)), bg: 'event-med-stormy' },
          { text: `You spot dolphins swimming alongside the ship! Children rush to the railing, laughing and pointing. Even the sailors stop to watch.`, type: 'positive', morale: 15, bg: 'event-sea-dolphins' },
          { text: `A fellow passenger shares dried fish and water from their personal supply.`, type: 'positive', food: 6, water: 4, bg: 'event-ship-talk' },
          { text: `Rough seas force everyone below deck. The ship groans and pitches through the night.`, type: 'warning', morale: -8, health: -3, bg: 'event-med-stormy' },
          { text: `The captain invites your group to the bridge. He shows you the charts and explains the route to Jaffa.`, type: 'positive', morale: 8, knowledge: 2, bg: 'event-ship-explore' },
          { text: `${memberName} catches a fish off the side of the ship! The cook prepares it for your group.`, type: 'positive', food: 8, bg: 'event-shipdeck' },
          { text: `A whale breaches in the distance! The massive spray is visible for miles. The passengers gasp in wonder.`, type: 'positive', morale: 12, bg: 'event-sea-dolphins' },
          { text: `Another ship passes heading north. The crews exchange shouts. News from Palestine: new settlements are being founded!`, type: 'positive', morale: 10, knowledge: 1, bg: 'event-shipdeck' },
          { text: `Rumors of pirates spread among the passengers. The captain assures everyone the route is safe, but anxiety lingers.`, type: 'warning', morale: -6, bg: 'event-ship-talk' },
          { text: `A crew member teaches ${memberName} to navigate by the stars. "Polaris guides you north. The Southern Cross will guide you in Palestine."`, type: 'positive', morale: 5, knowledge: 2, bg: 'event-shipdeck' },
          { text: `Fresh water rations are cut today. The ship's supply is lower than expected. Everyone gets half portions.`, type: 'warning', water: -(4 + Math.floor(Math.random() * 6)), morale: -5, bg: 'event-ship-galley' },
          { text: `A spectacular sunset paints the Mediterranean sky in orange and purple. Passengers gather on deck in awed silence.`, type: 'positive', morale: 10, bg: 'event-shipdeck' },
          { text: `Someone organizes singing on the deck after dinner. Passengers share folk songs from Poland, Russia, and Yemen. The music carries across the water.`, type: 'positive', morale: 12, knowledge: 1, bg: 'event-shipdeck' },
          { text: `Flying fish land on the deck! ${memberName} and the other passengers scramble to collect them. Free food from the sea!`, type: 'positive', food: 10, morale: 5, bg: 'event-shipdeck' },
          { text: `A stowaway is discovered hiding in the cargo hold — a young boy fleeing persecution. The captain allows him to stay.`, type: 'neutral', morale: 5, knowledge: 1, bg: 'event-ship-explore' },
          { text: `The crew asks for volunteers to help scrub the deck. ${memberName} pitches in. The sailors are impressed and share extra rations.`, type: 'positive', food: 5, water: 3, morale: 5, bg: 'event-shipdeck' },
          { text: `A sudden calm leaves the ship barely moving. The sails hang limp. The engine struggles. Passengers grow restless.`, type: 'warning', morale: -5 },
          { text: `${memberName} finds a Hebrew prayer book left behind by a previous voyage's passenger. The inscription reads: "To whoever carries this next — be brave."`, type: 'positive', morale: 8, knowledge: 1 },
        ];
        evt = seaEvents[Math.floor(Math.random() * seaEvents.length)];
      } else if (inPalestine) {
        const palestineEvents = [
          { text: `${memberName} stumbles on a rocky path and sprains an ankle.`, type: 'negative', health: -10, bg: 'travel-palestine-hills' },
          { text: `A Bedouin trader offers to sell you water at a fair price.`, type: 'neutral', water: 8, money: -3, bg: 'event-caravan' },
          { text: `You meet a group of Bilu pioneers who share food and encourage your party.`, type: 'positive', food: 10, morale: 12, knowledge: 1, bg: 'travel-palestine' },
          { text: `The heat is unbearable. ${memberName} suffers from sunstroke.`, type: 'negative', sicken: true, bg: 'event-desert' },
          { text: `You discover an ancient well with fresh water!`, type: 'positive', water: 15, bg: 'travel-palestine-hills' },
          { text: `Ottoman tax collectors demand a toll for passing through the region.`, type: 'warning', money: -(1 + Math.floor(Math.random() * 3)), bg: 'event-customs' },
          { text: `A local Arab farmer shares oranges and bread with your group. Unexpected kindness!`, type: 'positive', food: 8, morale: 8, bg: 'travel-palestine' },
          { text: `${memberName} finds old tools left behind by earlier settlers.`, type: 'positive', tools: 2, bg: 'event-settlement' },
          { text: `Bandits threaten your group on the road, but flee when they see your numbers.`, type: 'warning', morale: -5, bg: 'event-robbers' },
          { text: `You meet Baron Rothschild's representative who gives your group a small stipend.`, type: 'positive', money: 3, morale: 10, bg: 'travel-palestine' },
          { text: `${memberName} spots a scorpion in the bedroll! A close call — but no one is stung.`, type: 'warning', morale: -5, bg: 'event-desert' },
          { text: `A group of Yemenite immigrants joins your path. They share tales of their two-year journey on foot from Sana'a.`, type: 'positive', morale: 10, knowledge: 2, bg: 'event-caravan' },
          { text: `The road passes through ancient olive groves. ${memberName} picks olives for the group — a small luxury on the trail.`, type: 'positive', food: 6, morale: 5, bg: 'travel-palestine-hills' },
          { text: `A sandstorm forces your party to shelter behind a stone wall. Hours are lost, but everyone is safe.`, type: 'warning', morale: -8, bg: 'event-sandstorm' },
          { text: `You stumble upon the ruins of an ancient Jewish settlement. Pottery shards and Hebrew inscriptions lie scattered in the dust.`, type: 'positive', morale: 12, knowledge: 3, bg: 'travel-palestine-hills' },
          { text: `A settler from Petah Tikva passes on horseback. "The malaria is fierce near the swamps. Boil your water and sleep under nets!"`, type: 'neutral', knowledge: 1, bg: 'travel-palestine' },
          { text: `${memberName} trades a spare tool with a Bedouin shepherd for a goatskin of fresh milk. A rare treat!`, type: 'positive', food: 5, morale: 8, tools: -1, bg: 'event-caravan' },
          { text: `Rain falls in the Judean hills! The parched landscape transforms. Your party collects rainwater in every container.`, type: 'positive', water: 12, morale: 10, bg: 'event-palestine-rain' },
          { text: `A jackal howls in the night, spooking the group. ${memberName} keeps watch until dawn.`, type: 'warning', morale: -3, bg: 'travel-palestine-hills' },
          { text: `You pass Rachel's Tomb on the road to Bethlehem. The ancient site fills your party with awe and determination.`, type: 'positive', morale: 15, knowledge: 2, bg: 'event-synagogue' },
          { text: `An Arab village elder invites your group to rest in his courtyard. He serves strong coffee and shares news of the road ahead.`, type: 'positive', morale: 8, knowledge: 1, bg: 'travel-palestine' },
          { text: `${memberName} finds a wild fig tree laden with fruit! The group eats well today.`, type: 'positive', food: 12, morale: 5, bg: 'travel-palestine-hills' },
        ];
        evt = palestineEvents[Math.floor(Math.random() * palestineEvents.length)];
      } else if (inCity) {
        const cityEvents = [
          { text: `${memberName} finds medicine at a local apothecary.`, type: 'positive', medicine: 2 },
          { text: `A generous synagogue community feeds your entire party!`, type: 'positive', food: 15, morale: 8 },
          { text: `${memberName} catches a cold from the damp city streets.`, type: 'warning', sicken: true },
          { text: `You trade old clothes for fresh supplies at a market.`, type: 'positive', clothing: 1, food: 5 },
          { text: `A thief snatches a bag while you navigate the crowded streets!`, type: 'negative', money: -(2 + Math.floor(Math.random() * 6)), food: -5 },
          { text: `A rabbi blesses your journey and gives your party warm clothing.`, type: 'positive', clothing: 2, morale: 5 },
          { text: `A local doctor offers leftover medicine from his clinic. "Take these, you'll need them on the road."`, type: 'positive', medicine: 2 },
          { text: `A Jewish aid society provides winter coats and blankets for your journey.`, type: 'positive', clothing: 3, morale: 8 },
        ];
        evt = cityEvents[Math.floor(Math.random() * cityEvents.length)];
      }

      if (evt) {
        narrative.push({ text: evt.text, type: evt.type });
        if (evt.morale) this.gameState.groupMorale = Math.max(0, Math.min(100, this.gameState.groupMorale + evt.morale));
        if (evt.health && randomMember) randomMember.health = Math.max(1, Math.min(100, randomMember.health + evt.health));
        if (evt.food) this.gameState.inventory.food = Math.max(0, this.gameState.inventory.food + evt.food);
        if (evt.water) this.gameState.inventory.water = Math.max(0, this.gameState.inventory.water + evt.water);
        if (evt.money) this.gameState.money = Math.max(0, this.gameState.money + evt.money);
        if (evt.tools) this.gameState.inventory.tools += evt.tools;
        if (evt.medicine) this.gameState.inventory.medicine += evt.medicine;
        if (evt.clothing) this.gameState.inventory.clothing += evt.clothing;
        if (evt.knowledge) this.gameState.historicalKnowledge = (this.gameState.historicalKnowledge || 0) + evt.knowledge;
        if (evt.sicken && randomMember && !randomMember.isDiseased) {
          const diseases = ['fever', 'dysentery', 'influenza', 'exhaustion', 'cholera'];
          randomMember.isDiseased = true;
          randomMember.diseaseType = diseases[Math.floor(Math.random() * diseases.length)];
          randomMember.health = Math.max(1, randomMember.health - 15);
          randomMember.morale = Math.max(0, randomMember.morale - 10);
        }
        // Override background for events that have a specific image
        if (evt.bg) {
          const bg = document.getElementById('location-background');
          if (bg) bg.className = 'location-bg-fullscreen ' + evt.bg;
        }
      }
    }

    // Daily food cart on train — 40% chance, free small ration
    if (onTrain && !arrivedAtNew && Math.random() < 0.4) {
      const cartFood = 3 + Math.floor(Math.random() * 5); // 3-7 lbs
      const cartWater = 2 + Math.floor(Math.random() * 3); // 2-4 gallons
      this.gameState.inventory.food += cartFood;
      this.gameState.inventory.water += cartWater;
      const cartLines = [
        `A food cart passes through the carriage. You receive ${cartFood} lbs of bread and ${cartWater} gallons of water.`,
        `The train stops briefly at a small station. Locals pass food through the windows — ${cartFood} lbs of food and ${cartWater} gallons of water.`,
        `A kind passenger shares provisions with your group — ${cartFood} lbs of food and ${cartWater} gallons of water.`
      ];
      narrative.push({ text: cartLines[Math.floor(Math.random() * cartLines.length)], type: 'positive' });
    }

    if (onTrain && Math.random() < 0.08) {
      narrative.push({ text: 'The train suddenly lurches to a halt! A section of track ahead has been damaged.', type: 'negative' });
      narrative.push({ text: 'Passengers scramble as the crew inspects the rails. You lose a full day while repairs are made.', type: 'warning' });
      this.gameState.segmentDistance = Math.max(0, this.gameState.segmentDistance - 30);
      this.gameState.groupMorale = Math.max(0, this.gameState.groupMorale - 8);
      this.showDayNarrative(narrative, () => {
        this.ui.refreshStats();
        this.updateVisualSection();
        this.showDailyChoices();
      });
      const stuckBg = document.getElementById('location-background');
      if (stuckBg) stuckBg.className = 'location-bg-fullscreen event-train-stuck';
      return;
    }

    // Random events
    if (this.gameState.checkForRandomEvents()) {
      this.showDayNarrative(narrative, () => {
        this.triggerRandomEvent();
      });
      return;
    }
    
    // Check for game over / victory
    if (this.gameState.gameWon || this.isAtDestination()) { this.showDayNarrative(narrative, () => this.handleVictory()); return; }
    if (!this.gameState.gameActive) { this.showDayNarrative(narrative, () => this.handleGameOver()); return; }
    
    // If nothing dramatic, add a calm line
    if (narrative.length === 0) {
      const calmLines = [
        'The road stretches ahead under a quiet sky.',
        'Another day passes uneventfully on the trail.',
        'Your party makes steady progress.',
        'The journey continues. Spirits are steady.'
      ];
      narrative.push({ text: calmLines[Math.floor(Math.random() * calmLines.length)], type: 'neutral' });
    }
    
    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.updateVisualSection(); // Update the scene image after travel
      this.showDailyChoices();
    });
  }

  // Show narrative events for the day as a dismissible panel
  showDayNarrative(narrative, onDismiss) {
    // Update the full visual section — background, title card text, HUD, party sprite
    this.updateVisualSection();

    // Apply any pending background override (e.g. captain's "Land ho!" first glimpse)
    if (this._pendingBgOverride) {
      const bgEl = document.getElementById('location-background');
      if (bgEl) bgEl.className = 'location-bg-fullscreen ' + this._pendingBgOverride;
      this._pendingBgOverride = null;
    }
    
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');
    const warningsContainer = document.getElementById('event-warnings');
    if (warningsContainer) warningsContainer.innerHTML = '';

    if (eventTitle) {
      eventTitle.textContent = this.gameState.getFormattedDate();
    }

    if (eventDescription) {
      let html = '';
      narrative.forEach(n => {
        const color = n.type === 'negative' ? '#dc143c' : n.type === 'positive' ? '#228b22' : n.type === 'warning' ? '#daa520' : '#ddd8c0';
        html += `<p style="color:${color}; margin:0.3rem 0;">${n.text}</p>`;
      });
      eventDescription.innerHTML = html;
    }

    // Log each line
    narrative.forEach(n => this.ui.logMessage(n.text, n.type === 'negative' ? 'negative' : n.type === 'positive' ? 'positive' : 'neutral'));

    if (choicesContainer) {
      choicesContainer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'event-choice available primary-action';
      btn.innerHTML = '<div class="action-content"><div class="action-details"><div class="action-text">Continue</div></div></div>';
      btn.addEventListener('click', () => { if (onDismiss) onDismiss(); });
      choicesContainer.appendChild(btn);
    }
  }

  handleRest() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    const locName = location ? location.name : 'camp';
    const isLandmark = location && (location.terrain === 'city' || location.terrain === 'port' || location.terrain === 'settlement');
    const healBonus = isLandmark ? 2 : 1;
    const narrative = [];

    // Transport-aware rest flavor
    const locationKey = this.gameState.currentLocation || 'warsaw';
    const trainSegs = ['warsaw', 'krakow', 'vienna'];
    const seaSegs = ['trieste', 'mediterranean'];
    const isTraveling = (this.gameState.segmentDistance || 0) > 0;
    const isOnTrain = isTraveling && trainSegs.includes(locationKey);
    const isAtSea = isTraveling && seaSegs.includes(locationKey);

    if (isOnTrain) {
      narrative.push({ text: 'Your party rests in the train compartment. The rhythmic rocking of the carriage is soothing.', type: 'neutral' });
    } else if (isAtSea) {
      narrative.push({ text: 'Your party rests below deck. The gentle swaying of the ship helps some sleep, but others feel queasy.', type: 'neutral' });
    } else if (isLandmark) {
      narrative.push({ text: `Your party rests comfortably in ${locName}. Resting at a settlement doubles recovery!`, type: 'positive' });
    } else {
      narrative.push({ text: 'Your party sets up camp and rests for the day.', type: 'neutral' });
    }

    // Track before values
    const healthBefore = Math.round(this.gameState.groupHealth);
    const moraleBefore = Math.round(this.gameState.groupMorale);

    // Apply resting benefits
    this.gameState.groupHealth = Math.min(100, this.gameState.groupHealth + 10 * healBonus);
    this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 8 * healBonus);

    const recoveredMembers = [];
    this.gameState.partyMembers.forEach(member => {
      if (member.isAlive) {
        member.health = Math.min(100, member.health + 12 * healBonus);
        member.morale = Math.min(100, member.morale + 10 * healBonus);
        member.energy = 100;

        const recoverChance = isLandmark ? 0.5 : 0.3;
        if (member.isDiseased && member.health > 40 && Math.random() < recoverChance) {
          member.isDiseased = false;
          member.diseaseType = null;
          recoveredMembers.push(member.firstName);
        }
      }
    });

    // Always show results
    const healthGain = Math.round(this.gameState.groupHealth) - healthBefore;
    const moraleGain = Math.round(this.gameState.groupMorale) - moraleBefore;
    if (healthGain > 0) {
      narrative.push({ text: `Health improved by +${healthGain} (now ${Math.round(this.gameState.groupHealth)}%)`, type: 'positive' });
    } else {
      narrative.push({ text: `Health is at ${Math.round(this.gameState.groupHealth)}% — already in good shape.`, type: 'neutral' });
    }
    if (moraleGain > 0) {
      narrative.push({ text: `Morale improved by +${moraleGain} (now ${Math.round(this.gameState.groupMorale)}%)`, type: 'positive' });
    } else {
      narrative.push({ text: `Morale is at ${Math.round(this.gameState.groupMorale)}% — spirits are steady.`, type: 'neutral' });
    }
    if (recoveredMembers.length > 0) {
      narrative.push({ text: `${recoveredMembers.join(', ')} recovered from illness!`, type: 'positive' });
    }

    // Consume resources
    const partySize = this.gameState.getAlivePartyMembers().length;
    const foodUsed = Math.ceil(partySize * 2);
    const waterUsed = Math.ceil(partySize * 2);
    this.gameState.inventory.food = Math.max(0, this.gameState.inventory.food - foodUsed);
    this.gameState.inventory.water = Math.max(0, this.gameState.inventory.water - waterUsed);
    if (!isLandmark) {
      this.gameState.money = Math.max(0, this.gameState.money - Math.ceil(partySize * 1));
    }
    narrative.push({ text: `Used ${foodUsed} food and ${waterUsed} water while resting.`, type: 'warning' });

    this.gameState.day++;

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.updateVisualSection();
      this.showDailyChoices();
    });
    // Override background AFTER showDayNarrative
    if (isOnTrain) {
      const restBg = document.getElementById('location-background');
      if (restBg) restBg.className = 'location-bg-fullscreen event-train-rest';
    }
  }

  handleLookForSupplies() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    const findChance = this.getSupplyFindChance(location);
    const narrative = [];

    const searchLines = [
      'You split up and search the area...',
      'Your party fans out looking for anything useful...',
      'You rummage through an abandoned camp...',
      'You search along the roadside and nearby ruins...'
    ];
    narrative.push({ text: searchLines[Math.floor(Math.random() * searchLines.length)], type: 'neutral' });

    if (Math.random() < findChance) {
      const supplies = this.generateFoundSupplies(location);
      narrative.push({ text: `Found: ${supplies.description}!`, type: 'positive' });
      Object.keys(supplies.items).forEach(item => {
        this.gameState.inventory[item] += supplies.items[item];
      });
      if (Math.random() < 0.3) {
        const bonuses = [
          { text: `Also found 5 ${this.gameState.getCurrencyName()} hidden in a box!`, money: 5 },
          { text: 'Found a traveler\'s bag with extra food!', food: 8 },
          { text: 'Discovered a sheltered spring!', water: 6 },
        ];
        const b = bonuses[Math.floor(Math.random() * bonuses.length)];
        narrative.push({ text: b.text, type: 'positive' });
        if (b.money) this.gameState.money += b.money;
        if (b.food) this.gameState.inventory.food += b.food;
        if (b.water) this.gameState.inventory.water += b.water;
      }
    } else {
      const failLines = [
        'The area has already been picked clean by others.',
        'Nothing useful found. The land here is barren.',
        'You search for hours but come back empty-handed.',
        'A promising trail leads to nothing.'
      ];
      narrative.push({ text: failLines[Math.floor(Math.random() * failLines.length)], type: 'negative' });
      this.gameState.groupMorale = Math.max(0, this.gameState.groupMorale - 3);
    }

    this.gameState.advanceDay();
    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.updateVisualSection();
      this.showDailyChoices();
    });
  }

  handleTreatSick() {
    const sickMembers = this.gameState.partyMembers.filter(m => m.isAlive && m.isDiseased);
    
    if (sickMembers.length === 0 || this.gameState.inventory.medicine <= 0) {
      this.ui.logMessage('No one to treat or no medicine available.', 'negative');
      this.isWaitingForChoice = true;
      return;
    }
    
    // Treat the sickest member first
    const sickest = sickMembers.reduce((prev, current) => 
      prev.health < current.health ? prev : current
    );
    
    if (this.gameState.treatIllness(sickest)) {
      this.ui.logMessage(`Treated ${sickest.firstName} with medicine.`, 'positive');
      this.ui.logMessage(`${sickest.firstName} is feeling much better!`, 'positive');
    }
    
    this.ui.refreshStats();
    
    setTimeout(() => {
      this.showDailyChoices();
    }, 1500);
  }

  // Utility methods
  canContinueJourney() {
    // Can't continue if game is already won (at destination)
    if (this.gameState.gameWon || this.isAtDestination()) return false;

    // Can't travel if everyone is dead or too sick
    const aliveMembers = this.gameState.getAlivePartyMembers();
    if (aliveMembers.length === 0) return false;
    
    const healthyMembers = aliveMembers.filter(m => m.health > 20);
    return healthyMembers.length > 0;
  }

  isAtDestination() {
    const loc = this.gameState.getCurrentLocation(this.storyConfig);
    return loc && loc.isDestination === true;
  }

  canLookForSupplies() {
    // Can look for supplies if healthy enough
    console.log(`[SUPPLIES] health=${this.gameState.groupHealth} canLook=${this.gameState.groupHealth > 30}`);
    return this.gameState.groupHealth > 30;
  }

  canHunt() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    return location && (
      location.name.toLowerCase().includes('port') ||
      location.name.toLowerCase().includes('sea') ||
      location.name.toLowerCase().includes('coast')
    );
  }

  canForage() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    if (!location) return false;
    // Cannot forage in cities or ports — only in the wild
    if (['city', 'port'].includes(location.terrain)) return false;
    return !this.canHunt();
  }

  getTravelProgressChance() {
    const paceMultiplier = this.gameState.getPaceMultiplier();
    const healthMultiplier = this.gameState.groupHealth / 100;
    const weatherMultiplier = this.getWeatherTravelMultiplier();
    
    return Math.min(0.8, 0.4 * paceMultiplier * healthMultiplier * weatherMultiplier);
  }

  getWeatherTravelMultiplier() {
    switch (this.gameState.weather) {
      case 'stormy': return 0.3;
      case 'hot': return 0.7;
      case 'cold': return 0.8;
      default: return 1.0;
    }
  }

  getSupplyFindChance(location) {
    let baseChance = 0.3;
    
    // Better chances in populated areas
    if (location && (location.shops?.length > 0)) {
      baseChance = 0.5;
    }
    
    // Skill bonuses
    const foragingSkill = this.gameState.getTotalPartySkill('farming');
    baseChance += foragingSkill * 0.05;
    
    return Math.min(0.8, baseChance);
  }

  generateFoundSupplies(location) {
    const possibleFinds = [
      { items: { food: 15 }, description: '15 lbs of dried fruit' },
      { items: { water: 10 }, description: '10 gallons of fresh water' },
      { items: { medicine: 1 }, description: 'medicinal herbs' },
      { items: { tools: 1 }, description: 'useful tools' },
      { items: { food: 8, water: 5 }, description: 'food and water' }
    ];
    
    return possibleFinds[Math.floor(Math.random() * possibleFinds.length)];
  }

  calculateDaysOfFood() {
    const partySize = this.gameState.getAlivePartyMembers().length;
    const dailyNeed = this.gameState.dailyConsumption.food * partySize;
    return Math.floor(this.gameState.inventory.food / dailyNeed);
  }

  calculateDaysOfWater() {
    const partySize = this.gameState.getAlivePartyMembers().length;
    const dailyNeed = this.gameState.dailyConsumption.water * partySize;
    return Math.floor(this.gameState.inventory.water / dailyNeed);
  }

  getWeatherDescription() {
    const descriptions = {
      'fair': 'Fair',
      'hot': 'Hot',
      'cold': 'Cold',
      'stormy': 'Stormy'
    };
    return descriptions[this.gameState.weather] || 'Fair';
  }

  // Handle other actions (delegate to existing systems)
  handleHunt() {
    this.ui.startHunting();
  }

  handleForage() {
    this.ui.startForaging();
  }

  handleTrainVendor() {
    // Show vendor scene
    const cost = 5 + Math.floor(Math.random() * 6); // 5-10 rubles
    const foodAmount = 10 + Math.floor(Math.random() * 11); // 10-20 food
    const waterAmount = 5 + Math.floor(Math.random() * 6); // 5-10 water
    const narrative = [];

    if (this.gameState.money >= cost) {
      this.gameState.money -= cost;
      this.gameState.inventory.food += foodAmount;
      this.gameState.inventory.water += waterAmount;
      const vendors = [
        `A woman walks through the carriage with a basket. "Fresh bread and sausage!" You buy ${foodAmount} lbs of food and ${waterAmount} gallons of water for ${cost} rubles.`,
        `At the station stop, a vendor sells hot soup, bread, and water through the window. ${foodAmount} lbs of food and ${waterAmount} gallons of water for ${cost} rubles.`,
        `A boy runs alongside the slowing train selling pirozhki and water bottles. ${foodAmount} lbs of food and ${waterAmount} gallons of water for ${cost} rubles.`
      ];
      narrative.push({ text: vendors[Math.floor(Math.random() * vendors.length)], type: 'positive' });
    } else {
      narrative.push({ text: 'A vendor passes by, but you can\'t afford the prices today.', type: 'negative' });
    }

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.showDailyChoices();
    });
    // Override background AFTER showDayNarrative (which resets it)
    const vendorBg = document.getElementById('location-background');
    if (vendorBg) { vendorBg.className = 'location-bg-fullscreen event-train-vendor'; }
  }

  handleTrainCards() {
    // Show cards scene

    const narrative = [];
    const roll = Math.random();

    if (roll < 0.4) {
      // Win
      const winnings = 3 + Math.floor(Math.random() * 8);
      this.gameState.money += winnings;
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 5);
      narrative.push({ text: `You join a card game with fellow passengers. Luck is on your side — you win ${winnings} rubles!`, type: 'positive' });
      narrative.push({ text: 'The other players laugh and congratulate you. The mood in the carriage lightens.', type: 'neutral' });
    } else if (roll < 0.7) {
      // Lose
      const loss = Math.min(this.gameState.money, 2 + Math.floor(Math.random() * 5));
      this.gameState.money -= loss;
      narrative.push({ text: `You play cards with some merchants. Not your best game — you lose ${loss} rubles.`, type: 'negative' });
      narrative.push({ text: 'Still, the company was good. The hours pass more quickly.', type: 'neutral' });
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 3);
    } else {
      // Story
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 8);
      this.gameState.historicalKnowledge += 1;
      narrative.push({ text: 'Instead of cards, your fellow passengers share stories from their homelands.', type: 'neutral' });
      narrative.push({ text: 'An old man tells tales of the first pioneers who sailed to Jaffa in 1882. Your party listens, captivated.', type: 'positive' });
    }

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.showDailyChoices();
    });
    // Override background AFTER showDayNarrative (which resets it)
    const cardsBg = document.getElementById('location-background');
    if (cardsBg) { cardsBg.className = 'location-bg-fullscreen event-train-cards'; }
  }

  handleTrade() {
    // Show city-specific market image on trading overlay
    const locKey = this.gameState.currentLocation || 'warsaw';
    const marketImages = { 'warsaw': 'images/warsaw-market.png', 'krakow': 'images/krakow-market.png', 'vienna': 'images/vienna-market.png' };
    const tradingOverlay = document.getElementById('trading-overlay');
    if (tradingOverlay && marketImages[locKey]) {
      tradingOverlay.style.backgroundImage = `url('${marketImages[locKey]}')`;
      tradingOverlay.style.backgroundSize = 'cover';
      tradingOverlay.style.backgroundPosition = 'center';
    }

    // Also set on main background for when overlay closes
    const bg = document.getElementById('location-background');
    const marketBgMap = { 'warsaw': 'event-market-warsaw', 'krakow': 'event-market-krakow', 'vienna': 'event-market-vienna' };
    if (bg) bg.className = 'location-bg-fullscreen ' + (marketBgMap[locKey] || 'event-market');

    this.ui.showTrading();
  }

  handleTalk() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    if (!location) { this.isWaitingForChoice = true; return; }

    // Check if on a train or ship for transport-specific dialogues
    const locationKey = this.gameState.currentLocation || 'warsaw';
    const segDist = this.gameState.segmentDistance || 0;
    const isTraveling = segDist > 0;
    const trainSegments = ['warsaw', 'krakow', 'vienna'];
    const seaSegments = ['trieste', 'mediterranean'];
    const isOnTrain = isTraveling && trainSegments.includes(locationKey);
    const isOnSea = isTraveling && seaSegments.includes(locationKey);

    // Show appropriate background when talking
    if (isOnTrain) {
      const bg = document.getElementById('location-background');
      if (bg) bg.className = 'location-bg-fullscreen event-train-talk';
    } else if (isOnSea) {
      const bg = document.getElementById('location-background');
      if (bg) bg.className = 'location-bg-fullscreen event-ship-talk';
    }

    const dialogues = isOnTrain ? this.getTrainDialogues(locationKey) : isOnSea ? this.getSeaDialogues() : this.getNPCDialogues(location);

    // Track talked-to NPCs today to avoid repeats
    if (!this._talkedToToday) this._talkedToToday = [];
    const available = dialogues.filter(d => !this._talkedToToday.includes(d.speaker));
    const pool = available.length > 0 ? available : dialogues; // fallback if all exhausted
    const dialog = pool[Math.floor(Math.random() * pool.length)];
    this._talkedToToday.push(dialog.speaker);

    // Show synagogue image for rabbi/synagogue conversations
    if (!isOnTrain && dialog.speaker && (dialog.speaker.toLowerCase().includes('rabbi') || dialog.speaker.toLowerCase().includes('synagogue') || dialog.speaker.toLowerCase().includes('rebbe'))) {
      const bg = document.getElementById('location-background');
      if (bg) bg.className = 'location-bg-fullscreen event-synagogue';
    }

    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');

    if (eventTitle) eventTitle.textContent = dialog.speaker;
    if (eventDescription) eventDescription.innerHTML = `<p style="font-style:italic;color:var(--text-primary);">"${dialog.text}"</p>`;

    if (choicesContainer) {
      choicesContainer.innerHTML = '';

      // Generate 3 response options — one great, one good, one neutral
      const moraleBonus = 5 + Math.floor(Math.random() * 16); // 5-20
      const adviceFood = 5 + Math.floor(Math.random() * 8); // 5-12
      const adviceWater = 3 + Math.floor(Math.random() * 5); // 3-7
      const adviceMorale = Math.floor(moraleBonus * 0.6);
      const getsSupplies = Math.random() < 0.5;
      const responses = [
        {
          text: 'Share your own story and connect deeply',
          reward: { morale: moraleBonus, knowledge: 1 },
          result: `You share stories for hours. Your party's spirits soar! (+${moraleBonus} morale, +1 knowledge)`
        },
        {
          text: 'Ask for practical advice about the journey',
          reward: getsSupplies 
            ? { morale: adviceMorale, food: adviceFood, water: adviceWater }
            : { morale: adviceMorale, money: 3 + Math.floor(Math.random() * 5) },
          result: getsSupplies
            ? `They share practical wisdom and insist you take some provisions. (+${adviceFood} food, +${adviceWater} water, +${adviceMorale} morale)`
            : `They give excellent advice and press a few coins into your hand. (+${3 + Math.floor(Math.random() * 5)} ${this.gameState.getCurrencyName()}, +${adviceMorale} morale)`
        },
        {
          text: 'Listen politely and thank them',
          reward: { morale: 5 },
          result: 'A brief but pleasant exchange. (+5 morale)'
        }
      ];

      // Shuffle order so the best answer isn't always first
      const shuffled = responses.sort(() => Math.random() - 0.5);

      shuffled.forEach((resp, idx) => {
        const btn = document.createElement('button');
        btn.className = 'event-choice available';
        btn.innerHTML = `<div class="action-content"><div class="action-number">${idx + 1}</div><div class="action-details"><div class="action-text">${resp.text}</div></div></div>`;
        btn.addEventListener('click', () => {
          // Apply dialog base effects
          if (dialog.effects) {
            if (dialog.effects.morale) this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + dialog.effects.morale);
            if (dialog.effects.historicalKnowledge) this.gameState.historicalKnowledge += dialog.effects.historicalKnowledge;
          }
          // Apply response reward
          if (resp.reward.morale) this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + resp.reward.morale);
          if (resp.reward.knowledge) this.gameState.historicalKnowledge = (this.gameState.historicalKnowledge || 0) + resp.reward.knowledge;
          if (resp.reward.food) this.gameState.inventory.food += resp.reward.food;
          if (resp.reward.water) this.gameState.inventory.water += resp.reward.water;
          if (resp.reward.money) this.gameState.money += resp.reward.money;

          // Show result
          const narrative = [{ text: resp.result, type: 'positive' }];
          this.showDayNarrative(narrative, () => {
            this.ui.refreshStats();
            this.showDailyChoices();
          });
        });
        choicesContainer.appendChild(btn);
      });
    }
  }

  getNPCDialogues(location) {
    const locationName = location.name.toLowerCase();
    const allDialogues = {
      'warsaw': [
        { speaker: "Old Mendel, the bookseller", text: "Take books with you, child. In the new land, knowledge will be your greatest tool.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "Rivka, a neighbor", text: "My cousin wrote from Jaffa — the heat is terrible but the oranges are sweet. Pack extra water!", effects: { morale: 5 } },
        { speaker: "A Zionist organizer", text: "The First Zionist Congress in Basel changed everything. Herzl said: 'Today I founded the Jewish State.' Believe it.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "Shmuel the tailor", text: "I sewed extra pockets into your travel coats. Hide your money in them. Thieves are everywhere on the road.", effects: { morale: 5 } },
        { speaker: "Widow Chaya", text: "Take this dried fish. It kept my husband alive on his journey to America. You'll need it more than I do.", effects: { morale: 8, historicalKnowledge: 1 } },
        { speaker: "A young BILU member", text: "We are the pioneers! 'House of Jacob, come, let us go!' We leave next week for Jaffa. See you in Eretz Yisrael!", effects: { morale: 12, historicalKnowledge: 2 } }
      ],
      'krak': [
        { speaker: "Rabbi Yosef of Kazimierz", text: "Pray at the Remuh Synagogue before you go. Many pilgrims have passed through these doors on their way to Zion.", effects: { morale: 10, historicalKnowledge: 1 } },
        { speaker: "A Polish merchant", text: "The trains to Vienna are reliable but expensive. Guard your money — you'll need it later.", effects: { morale: 5 } },
        { speaker: "Helena, a university student", text: "I study the ancient Hebrew texts. Your journey fulfills a prophecy older than this city. Go with courage.", effects: { morale: 8, historicalKnowledge: 2 } },
        { speaker: "Yankel the porter", text: "I carry bags at the train station. I see travelers like you every week. The ones who survive share their food.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "A Chassidic rebbe", text: "The Holy Land waits for you. But remember — the land must be worked with your hands, not just your prayers.", effects: { morale: 12, historicalKnowledge: 2 } }
      ],
      'vienna': [
        { speaker: "A Viennese journalist", text: "Herzl walks these very streets. His dream burns brighter each day. You carry that dream with you now.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A seasoned traveler", text: "From Trieste, take the steamship directly to Jaffa. Avoid the cheapest berths — cholera spreads quickly in steerage.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "Dr. Nordau at a café", text: "Herzl and I debated for hours last night. A Jewish state is not just a dream — it is a necessity. You are the proof.", effects: { morale: 15, historicalKnowledge: 3 } },
        { speaker: "A ticket agent", text: "Third class to Trieste leaves at dawn. I can get you a slight discount if you buy today.", effects: { morale: 5 } },
        { speaker: "A Galician immigrant", text: "I came from Lemberg. Vienna is beautiful, but it isn't ours. Keep moving — our home is south.", effects: { morale: 8, historicalKnowledge: 1 } }
      ],
      'trieste': [
        { speaker: "Captain Rossi", text: "The Mediterranean can be cruel in autumn. Seasickness is inevitable, but it passes. Keep your food stores dry.", effects: { morale: 5 } },
        { speaker: "A returning pilgrim", text: "I've seen the Holy Land. It's not what you imagine — rocks, sand, swamps — but it's ours. It's home.", effects: { morale: 15, historicalKnowledge: 1 } },
        { speaker: "Maria, a dockside vendor", text: "Buy oranges for the crossing! They prevent scurvy. Two lira for a bag. You won't regret it.", effects: { morale: 5 } },
        { speaker: "An Italian sailor", text: "I've sailed to Jaffa twelve times. The trick is to stay on deck when the waves start. Fresh air helps.", effects: { morale: 8, historicalKnowledge: 1 } }
      ],
      'jaffa': [
        { speaker: "Ahmed, a Jaffa dockworker", text: "Welcome to Jaffa! The Ottoman officials can be difficult. Keep your papers ready and your patience longer.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "An old Jewish settler", text: "We've been here since 1882. The land is hard but it gives back what you put in.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A customs official", text: "Papers, please. ... Everything seems in order. Welcome to Palestine. Watch for malaria near the swamps.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "Yosef, a citrus farmer", text: "The Jaffa orange is already famous in Europe! One day this port will export millions of them.", effects: { morale: 12, historicalKnowledge: 2 } }
      ],
      'tel aviv': [
        { speaker: "Meir Dizengoff", text: "We drew lots for the plots of sand. Sand! But look at us now — we're building a city.", effects: { morale: 15, historicalKnowledge: 2 } },
        { speaker: "A construction worker", text: "We're laying the first water pipes! A real city needs water. Come help us dig.", effects: { morale: 10, historicalKnowledge: 1 } },
        { speaker: "A Hebrew teacher", text: "In this city we speak only Hebrew. No Yiddish, no Russian. Hebrew is the language of our future.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A young architect", text: "We're designing buildings for the desert — flat roofs, thick walls, courtyards for shade. A new style for a new land.", effects: { morale: 8, historicalKnowledge: 2 } },
        { speaker: "A nurse from the clinic", text: "We treat malaria, sunstroke, and homesickness in equal measure. The body heals faster than the heart.", effects: { morale: 12, historicalKnowledge: 1 } },
        { speaker: "An old Jaffa fisherman", text: "You Jews are crazy — building on sand dunes! But I admire the stubbornness. Here, take some fish for your journey.", effects: { morale: 8, historicalKnowledge: 1 } }
      ],
      'rishon': [
        { speaker: "A winemaker", text: "Baron Rothschild saved us when the crops failed. These vineyards produce some of the finest wine in the region.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A schoolteacher", text: "We opened the first Hebrew kindergarten here in 1898. The children learn Hebrew as their mother tongue!", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "An elderly vine-grower", text: "The first harvest nearly killed us. Desert heat, locusts, debts. But now? Taste this wine.", effects: { morale: 12, historicalKnowledge: 1 } },
        { speaker: "A cellar master at the winery", text: "Rothschild sent French experts to teach us winemaking. Now our wines rival theirs. The land gives generously to those who work it.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A young mother hanging laundry", text: "My children were born here. They've never known the cold of a Russian winter. This is their home — and it will be yours too.", effects: { morale: 15, historicalKnowledge: 1 } },
        { speaker: "A blacksmith", text: "I shoe horses, mend plows, fix wagon wheels. Every settlement needs someone who works iron. If you can swing a hammer, you'll never go hungry here.", effects: { morale: 8, historicalKnowledge: 1 } }
      ],
      'rehovot': [
        { speaker: "A pioneer farmer", text: "We refused the Baron's money. Self-reliance is everything. The eucalyptus trees help drain the swamps.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "Dr. Hillel, a scientist", text: "I'm researching how to grow crops in this soil. Science will transform this desert.", effects: { morale: 8, historicalKnowledge: 2 } },
        { speaker: "A water engineer", text: "Water is life here. We've dug three wells this year. Every drop counts — never waste water.", effects: { morale: 10, historicalKnowledge: 1 } },
        { speaker: "A malaria survivor", text: "The fever took me three times. Quinine saved my life, but many weren't so lucky. Drain the swamps — that's the only real cure.", effects: { morale: 5, historicalKnowledge: 2 } },
        { speaker: "An orange grove keeper", text: "The citrus grows beautifully here. In ten years these groves will be worth a fortune. Plant trees — they're worth more than gold.", effects: { morale: 12, historicalKnowledge: 1 } },
        { speaker: "A night watchman", text: "I patrol every night. Jackals, thieves, sometimes worse. But we protect what we've built. That's what pioneers do.", effects: { morale: 8, historicalKnowledge: 1 } }
      ],
      'hebron': [
        { speaker: "An old Sephardic Jew", text: "Jews have lived in Hebron for centuries. Abraham bought this very land. You walk where the patriarchs walked.", effects: { morale: 15, historicalKnowledge: 3 } },
        { speaker: "A stone mason", text: "The Cave of Machpelah has been holy for three thousand years. Jews, Christians, and Muslims all pray here.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A Bedouin shepherd", text: "The hills are hard to cross in winter. Take the lower road past the olive groves — longer but safer.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "A yeshiva student", text: "I study Torah in the same city where Abraham made his covenant with God. Every stone here whispers history.", effects: { morale: 12, historicalKnowledge: 3 } },
        { speaker: "An Arab pottery seller", text: "My family has made clay pots here for twelve generations. Hebron clay is the finest. Take one for water — it keeps it cool.", effects: { morale: 8, historicalKnowledge: 1 } },
        { speaker: "A Hebron glassblower", text: "Hebron glass is famous across the Ottoman Empire. The blue and green colors come from minerals in our hills. Beautiful, no?", effects: { morale: 10, historicalKnowledge: 2 } }
      ],
      'bethlehem': [
        { speaker: "A Bedouin guide", text: "Jerusalem is just over that hill. Follow the road past Rachel's Tomb. You're almost there, my friend.", effects: { morale: 20, historicalKnowledge: 1 } },
        { speaker: "A local shopkeeper", text: "You look exhausted. Sit, drink some tea. The last stretch to Jerusalem is uphill but the view is worth it.", effects: { morale: 15, historicalKnowledge: 1 } },
        { speaker: "A Christian pilgrim", text: "We are all pilgrims on this road. I came from Greece for my faith; you came from Poland for yours.", effects: { morale: 12, historicalKnowledge: 2 } },
        { speaker: "An olive farmer", text: "These olive trees are older than any of us. My grandfather tended them, and his grandfather before him. The land endures.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A monk from the monastery", text: "All roads to Jerusalem pass through Bethlehem. Rest here, gather your strength. The Holy City demands it.", effects: { morale: 12, historicalKnowledge: 1 } },
        { speaker: "A stone carver selling souvenirs", text: "I carve olive wood into crosses and menorahs. Both sell well here. This land belongs to all who love it.", effects: { morale: 8, historicalKnowledge: 2 } }
      ],
      'jerusalem': [
        { speaker: "A Jerusalem elder", text: "Welcome to the eternal city. Jews have prayed here for three thousand years. Now it's your turn to build.", effects: { morale: 25, historicalKnowledge: 3 } },
        { speaker: "A Western Wall caretaker", text: "Touch the stones. Feel the prayers of a hundred generations beneath your fingers. You've made it. You're home.", effects: { morale: 30, historicalKnowledge: 3 } },
        { speaker: "A young Yemenite Jew", text: "I walked here from Yemen — two years on foot through the desert. Compared to that, your journey was luxury!", effects: { morale: 20, historicalKnowledge: 2 } },
        { speaker: "A scribe in the Jewish Quarter", text: "I write Torah scrolls by hand. Each letter takes a prayer. You've come from so far — your arrival is a letter in God's scroll.", effects: { morale: 20, historicalKnowledge: 3 } },
        { speaker: "Eliezer Ben-Yehuda", text: "You must speak Hebrew! Not Yiddish, not Russian — Hebrew. I am compiling the first modern Hebrew dictionary. Our language lives again!", effects: { morale: 15, historicalKnowledge: 3 } },
        { speaker: "A spice merchant in the Old City", text: "Saffron, za'atar, cumin — the smells of Jerusalem. Buy some spices. Every meal tastes better with them. Welcome, welcome!", effects: { morale: 10, historicalKnowledge: 1 } }
      ]
    };

    // Find matching dialogues
    for (const [key, dialogues] of Object.entries(allDialogues)) {
      if (locationName.includes(key)) return dialogues;
    }

    // Fallback
    return [
      { speaker: "A fellow traveler", text: "Keep your spirits up. The road is long but the destination is worth every step.", effects: { morale: 5 } }
    ];
  }

  getTrainDialogues(fromLocation) {
    const trainDialogues = {
      'warsaw': [
        { speaker: "An elderly rabbi on the train", text: "I have traveled this line many times. The conductor is kind to Jews — tip him a little and he'll find you a better seat.", effects: { morale: 8, historicalKnowledge: 1 } },
        { speaker: "A nervous young couple", text: "We sold everything. Our whole life in two suitcases. But my brother writes from a settlement near Jaffa — he says the land is good.", effects: { morale: 10, historicalKnowledge: 1 } },
        { speaker: "A Russian soldier on leave", text: "Going far? Don't look so worried. The border crossings are easier by train. Just keep your papers ready.", effects: { morale: 5 } },
        { speaker: "A Polish woman selling food", text: "Fresh bread, smoked fish! Buy now — the food gets worse after Kraków, and twice as expensive in Austria.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "A Bundist organizer", text: "You're running to Palestine? We stay and fight for our rights here. But I understand — may you find what you're looking for.", effects: { morale: 7, historicalKnowledge: 2 } },
      ],
      'krakow': [
        { speaker: "An Austrian customs officer", text: "Your papers are in order. The train to Vienna departs from platform three. Welcome to the Austro-Hungarian Empire.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "A university professor", text: "I teach in Vienna. The Zionist idea is discussed in every café there. Herzl has changed everything.", effects: { morale: 10, historicalKnowledge: 2 } },
        { speaker: "A traveling merchant", text: "The Südbahn railway to Trieste is a marvel of engineering — tunnels through the Alps! But guard your bags at the stations.", effects: { morale: 5, historicalKnowledge: 1 } },
        { speaker: "A Chassidic family", text: "We are going to visit the Rebbe in Vienna. He blesses all who travel to the Holy Land. We will pray for you.", effects: { morale: 12, historicalKnowledge: 1 } },
      ],
      'vienna': [
        { speaker: "A Viennese ticket clerk", text: "Trieste-bound? The afternoon express is faster but the morning local is cheaper. Your choice.", effects: { morale: 5 } },
        { speaker: "A journalist reading a newspaper", text: "Herzl spoke at the Zionist Congress again. He says within fifty years there will be a Jewish state. Can you imagine?", effects: { morale: 15, historicalKnowledge: 3 } },
        { speaker: "An Italian businessman", text: "I make this trip weekly. The views through the Semmering Pass are spectacular — best railway scenery in Europe.", effects: { morale: 8, historicalKnowledge: 1 } },
        { speaker: "A mother with children", text: "My children have never seen the sea. We'll board a ship in Trieste. They're so excited — and so terrified.", effects: { morale: 10, historicalKnowledge: 1 } },
      ]
    };
    return trainDialogues[fromLocation] || trainDialogues['warsaw'];
  }

  getSeaDialogues() {
    return [
      { speaker: "Shlomo, a Yemenite elder", text: "We walked from Sana'a to Aden — three months through the desert. Then a ship to Jaffa. This voyage is luxury compared to ours.", effects: { morale: 12, historicalKnowledge: 2 } },
      { speaker: "Rosa, a nervous young mother", text: "My children have never been on a ship. Little David won't stop crying. Is it always this rough? Please tell me it gets calmer.", effects: { morale: 5 } },
      { speaker: "Giuseppe, an Italian deckhand", text: "I've sailed this route forty times. The trick is to watch the horizon — it settles the stomach. And eat dry bread, nothing else.", effects: { morale: 8, historicalKnowledge: 1 } },
      { speaker: "Rabbi Nachman, leading a group of families", text: "Every wave that carries us south brings us closer to the land promised to Abraham. Be strong — the sea tests us, but God watches over travelers.", effects: { morale: 15, historicalKnowledge: 2 } },
      { speaker: "Dov, a secular Zionist from Odessa", text: "Herzl talks of diplomacy. But we need farmers, builders, people willing to drain swamps and break stones. That's why I'm going.", effects: { morale: 10, historicalKnowledge: 2 } },
      { speaker: "Miriam, a schoolteacher from Vilna", text: "I'm bringing Hebrew primers in my trunk. The children in Palestine will speak Hebrew — a living language, not a dead one. Ben-Yehuda has shown the way.", effects: { morale: 10, historicalKnowledge: 3 } },
      { speaker: "An old merchant who's made the trip before", text: "Buy everything you can in Jaffa the moment you arrive. Prices double once you leave the port. And trust no one who offers to 'carry your bags.'", effects: { morale: 5, historicalKnowledge: 1 } },
      { speaker: "Yakov, a blacksmith from Minsk", text: "They say the settlements need workers who can use their hands. I can shoe a horse, fix a plow, build a gate. In Minsk I was nothing. In Palestine, I'll be needed.", effects: { morale: 12, historicalKnowledge: 1 } },
      { speaker: "A Greek sailor on his break", text: "The Mediterranean is kind in summer and cruel in winter. You're lucky — autumn crossings are usually calm. But keep one eye on the sky.", effects: { morale: 8, historicalKnowledge: 1 } },
      { speaker: "Leah, a young woman traveling alone", text: "My fiancé left for Rishon LeZion two years ago. He writes that the settlement is growing. I haven't seen him since. I hope I recognize him.", effects: { morale: 10, historicalKnowledge: 1 } },
    ];
  }

  handleShipGalley() {
    const cost = 8 + Math.floor(Math.random() * 5); // 8-12 rubles
    const foodAmount = 8 + Math.floor(Math.random() * 8); // 8-15 food
    const waterAmount = 6 + Math.floor(Math.random() * 5); // 6-10 water
    const narrative = [];

    if (this.gameState.money >= cost) {
      this.gameState.money -= cost;
      this.gameState.inventory.food += foodAmount;
      this.gameState.inventory.water += waterAmount;
      const scenes = [
        `The ship's cook ladles out thick fish stew and fills your water bottles. "Eat up — we won't see port for days." ${foodAmount} lbs of food and ${waterAmount} gallons of water for ${cost} rubles.`,
        `In the cramped galley below deck, the cook sells you hardtack, salted fish, and fresh water from the barrels. ${foodAmount} lbs of food and ${waterAmount} gallons of water for ${cost} rubles.`,
        `You barter with the cook's assistant. He sneaks you extra rations — bread, dried fruit, and a jug of water. ${foodAmount} lbs of food and ${waterAmount} gallons of water for ${cost} rubles.`
      ];
      narrative.push({ text: scenes[Math.floor(Math.random() * scenes.length)], type: 'positive' });
    } else {
      narrative.push({ text: 'The cook shakes his head. "No money, no food. Ship\'s rations are all I can spare for free." You leave empty-handed.', type: 'negative' });
    }

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.showDailyChoices();
    });
    const bg = document.getElementById('location-background');
    if (bg) bg.className = 'location-bg-fullscreen event-ship-galley';
  }

  handleShipDice() {
    const narrative = [];
    const roll = Math.random();

    if (roll < 0.4) {
      // Win
      const winnings = 4 + Math.floor(Math.random() * 10);
      this.gameState.money += winnings;
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 5);
      narrative.push({ text: `You join a dice game with Italian sailors on the foredeck. Lucky rolls! You win ${winnings} rubles.`, type: 'positive' });
      narrative.push({ text: 'The sailors laugh and clap you on the back. "Fortuna smiles on you, friend!"', type: 'neutral' });
    } else if (roll < 0.7) {
      // Lose
      const loss = Math.min(this.gameState.money, 3 + Math.floor(Math.random() * 6));
      this.gameState.money -= loss;
      narrative.push({ text: `The sailors are better at dice than you expected. You lose ${loss} rubles before calling it quits.`, type: 'negative' });
      narrative.push({ text: 'Still, the game passed the time and the sailors share a flask of wine. Not a total loss.', type: 'neutral' });
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 3);
    } else {
      // Stories
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 10);
      this.gameState.historicalKnowledge = (this.gameState.historicalKnowledge || 0) + 1;
      const stories = [
        'Between throws, an old sailor tells tales of Jaffa — the ancient port where Jonah set sail and where your new life awaits.',
        'A deckhand describes the coast of Palestine: white cliffs, orange groves, and the golden dome of Jerusalem in the distance.',
        'The sailors share stories of other immigrant ships they\'ve carried. "You Jews are the bravest passengers we get. Others cry — you sing."'
      ];
      narrative.push({ text: stories[Math.floor(Math.random() * stories.length)], type: 'positive' });
      narrative.push({ text: 'The stories fill your party with hope and knowledge of what lies ahead.', type: 'positive' });
    }

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.showDailyChoices();
    });
    const bg = document.getElementById('location-background');
    if (bg) bg.className = 'location-bg-fullscreen event-ship-dice';
  }

  handleExploreShip() {
    const narrative = [];
    const roll = Math.random();

    if (roll < 0.2) {
      // Find hidden supplies
      const foodFound = 5 + Math.floor(Math.random() * 10);
      const waterFound = 3 + Math.floor(Math.random() * 5);
      this.gameState.inventory.food += foodFound;
      this.gameState.inventory.water += waterFound;
      narrative.push({ text: `Exploring the cargo hold, you discover a crate marked for a passenger who never boarded. Inside: dried provisions and water jugs!`, type: 'positive' });
      narrative.push({ text: `+${foodFound} food, +${waterFound} water`, type: 'positive' });
    } else if (roll < 0.4) {
      // Overhear conversation
      this.gameState.historicalKnowledge = (this.gameState.historicalKnowledge || 0) + 2;
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 8);
      const overheard = [
        'Near the captain\'s quarters, you overhear officers discussing the route. "The Ottoman port authorities in Jaffa have been turning away ships. We may need to anchor offshore and use rowboats."',
        'Two crew members talk about previous voyages. "Last month a family arrived in Jaffa with nothing but the clothes on their backs. Within a year they had a vineyard in Rishon."',
        'You overhear the navigator explaining the stars to his apprentice. The ancient Phoenicians used these same stars to cross this very sea thousands of years ago.'
      ];
      narrative.push({ text: overheard[Math.floor(Math.random() * overheard.length)], type: 'neutral' });
    } else if (roll < 0.6) {
      // Beautiful view from the bow
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 12);
      narrative.push({ text: 'You climb to the bow of the ship as the sun sets over the Mediterranean. The sky turns gold and crimson, reflected in the endless water. For a moment, all your worries disappear.', type: 'positive' });
    } else if (roll < 0.75) {
      // Meet a crew member who helps
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 5);
      this.gameState.inventory.medicine += 1;
      narrative.push({ text: 'In the ship\'s dispensary, you meet the ship\'s doctor — a kind Greek man. He gives you a small bottle of quinine. "You\'ll need this against the fevers in Palestine."', type: 'positive' });
    } else if (roll < 0.9) {
      // Find a quiet spot
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 6);
      narrative.push({ text: 'You find a quiet corner on the upper deck, sheltered from the wind. A perfect spot to rest and watch the waves. Your party takes turns napping here throughout the day.', type: 'neutral' });
    } else {
      // Minor mishap
      this.gameState.groupMorale = Math.max(0, this.gameState.groupMorale - 3);
      const mishaps = [
        'You slip on the wet deck and bruise your knee. A sailor helps you up with a grin. "Sea legs take time, friend."',
        'Exploring below deck, you stumble into the engine room. The chief engineer shouts at you in Italian and waves you away.',
        'A wave catches you off guard on the upper deck, soaking you to the bone. At least the other passengers find it amusing.'
      ];
      narrative.push({ text: mishaps[Math.floor(Math.random() * mishaps.length)], type: 'warning' });
    }

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.showDailyChoices();
    });
    const bg = document.getElementById('location-background');
    if (bg) bg.className = 'location-bg-fullscreen event-ship-explore';
  }

  getCaptainUpdate(pct, milestones, locationKey) {
    // Adriatic (Trieste segment — short crossing, 100km)
    if (locationKey === 'trieste') {
      if (pct >= 20 && pct < 60 && !milestones.adriatic_early) {
        milestones.adriatic_early = true;
        return { text: 'Captain Rossi addresses the passengers: "We are sailing south through the Adriatic. The Italian coast is still visible to the west. Settle in — the real crossing begins once we pass into open waters."', type: 'neutral', morale: 5 };
      }
      if (pct >= 60 && !milestones.adriatic_late) {
        milestones.adriatic_late = true;
        return { text: 'The captain steps onto the deck: "We are leaving the Adriatic behind. Ahead lies the open Mediterranean — the great crossing to the Holy Land. Stay strong, passengers."', type: 'positive', morale: 8, knowledge: 1 };
      }
      return null;
    }

    // Mediterranean (main crossing — 400km)
    if (pct >= 10 && pct < 25 && !milestones.med_10) {
      milestones.med_10 = true;
      return { text: 'Captain Rossi addresses the passengers: "We are in open Mediterranean waters now. The weather is holding. Keep to the deck if the sickness troubles you — fresh air helps."', type: 'neutral', morale: 5 };
    }
    if (pct >= 25 && pct < 50 && !milestones.med_25) {
      milestones.med_25 = true;
      return { text: 'Captain Rossi posts a notice: "One quarter of the crossing complete. We are south of Crete. The ship is making good time. Water rations remain steady."', type: 'positive', morale: 5, knowledge: 1 };
    }
    if (pct >= 50 && pct < 75 && !milestones.med_50) {
      milestones.med_50 = true;
      return { text: 'Captain Rossi announces from the bridge: "Halfway to Jaffa! We have crossed the deepest waters of the Mediterranean. From here, every mile brings us closer to Palestine."', type: 'positive', morale: 10, knowledge: 1 };
    }
    if (pct >= 75 && pct < 90 && !milestones.med_75) {
      milestones.med_75 = true;
      return { text: 'The captain\'s voice carries across the deck: "Three-quarters of the crossing behind us! The water is changing color — shallower seas ahead. We are approaching the coast of the Holy Land!"', type: 'positive', morale: 12, knowledge: 1 };
    }
    if (pct >= 90 && !milestones.med_90) {
      milestones.med_90 = true;
      return { text: 'Captain Rossi sounds the horn: "Land ho! The coast of Palestine is visible on the horizon! Passengers, prepare your belongings — Jaffa awaits!" Cheers erupt across the ship. Tears flow freely as the faint outline of the Holy Land emerges from the haze.', type: 'positive', morale: 20, knowledge: 2, bg: 'event-firstglimpse' };
    }
    return null;
  }

  handleExploreRuins() {
    const narrative = [];
    const roll = Math.random();

    if (roll < 0.2) {
      // Find water
      const waterFound = 8 + Math.floor(Math.random() * 10);
      this.gameState.inventory.water += waterFound;
      narrative.push({ text: `You discover an ancient cistern, still holding rainwater! Your party fills every container. +${waterFound} water`, type: 'positive' });
    } else if (roll < 0.4) {
      // Find ruins with historical value
      this.gameState.historicalKnowledge = (this.gameState.historicalKnowledge || 0) + 2;
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 10);
      const finds = [
        'You find the remains of an ancient synagogue — a mosaic floor with Hebrew letters still visible after centuries.',
        'Among the ruins, you discover pottery shards with ancient markings. This land has been Jewish for millennia.',
        'A carved stone lintel reads in ancient Hebrew: "Blessed is he who enters." The words strengthen your resolve.'
      ];
      narrative.push({ text: finds[Math.floor(Math.random() * finds.length)], type: 'positive' });
    } else if (roll < 0.55) {
      // Find food/supplies
      const foodFound = 5 + Math.floor(Math.random() * 8);
      this.gameState.inventory.food += foodFound;
      narrative.push({ text: `You find wild fig and pomegranate trees near the ruins. The fruit is ripe and plentiful! +${foodFound} food`, type: 'positive' });
    } else if (roll < 0.7) {
      // Find tools
      this.gameState.inventory.tools += 1;
      this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 5);
      narrative.push({ text: 'Beneath a collapsed wall, you find old but usable farming tools — left behind by earlier settlers. +1 tools', type: 'positive' });
    } else if (roll < 0.85) {
      // Minor hazard
      this.gameState.groupMorale = Math.max(0, this.gameState.groupMorale - 3);
      narrative.push({ text: 'You explore the area but find little of use. The heat takes its toll and you return tired and dusty.', type: 'warning' });
    } else {
      // Snake or scorpion
      const randomMember = this.gameState.getAlivePartyMembers()[Math.floor(Math.random() * this.gameState.getAlivePartyMembers().length)];
      if (randomMember) {
        randomMember.health = Math.max(1, randomMember.health - 10);
        narrative.push({ text: `${randomMember.firstName} disturbs a snake while climbing through ruins! A painful bite, but not venomous. -10 health`, type: 'negative' });
      }
    }

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.showDailyChoices();
    });
    const bg = document.getElementById('location-background');
    if (bg) bg.className = 'location-bg-fullscreen travel-palestine-hills';
  }

  handleTradeBedouin() {
    const narrative = [];
    const hasTools = this.gameState.inventory.tools > 0;
    const hasClothing = this.gameState.inventory.clothing > 0;

    if (!hasTools && !hasClothing) {
      narrative.push({ text: 'You call out to passing Bedouins, but have nothing to trade. They shrug and ride on.', type: 'warning' });
    } else {
      const roll = Math.random();
      if (roll < 0.5 && hasTools) {
        // Trade tools for food and water
        this.gameState.inventory.tools -= 1;
        const foodGained = 10 + Math.floor(Math.random() * 8);
        const waterGained = 8 + Math.floor(Math.random() * 5);
        this.gameState.inventory.food += foodGained;
        this.gameState.inventory.water += waterGained;
        this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 5);
        narrative.push({ text: `A Bedouin trader examines your tools with interest. He offers dried dates, flatbread, and a goatskin of water in exchange. A fair deal! +${foodGained} food, +${waterGained} water`, type: 'positive' });
      } else if (hasClothing) {
        // Trade clothing for water and money
        this.gameState.inventory.clothing -= 1;
        const waterGained = 10 + Math.floor(Math.random() * 8);
        const moneyGained = 1 + Math.floor(Math.random() * 2);
        this.gameState.inventory.water += waterGained;
        this.gameState.money += moneyGained;
        this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 5);
        narrative.push({ text: `The Bedouins admire your European clothing. They trade generously — fresh water and ${moneyGained} ${this.gameState.getCurrencyName()} for a coat. +${waterGained} water, +${moneyGained} ${this.gameState.getCurrencyName()}`, type: 'positive' });
      } else {
        this.gameState.inventory.tools -= 1;
        const foodGained = 8 + Math.floor(Math.random() * 6);
        this.gameState.inventory.food += foodGained;
        this.gameState.groupMorale = Math.min(100, this.gameState.groupMorale + 3);
        narrative.push({ text: `You barter a set of tools for provisions. The Bedouin nods approvingly — "Good iron. Fair trade." +${foodGained} food`, type: 'positive' });
      }
    }

    this.showDayNarrative(narrative, () => {
      this.ui.refreshStats();
      this.showDailyChoices();
    });
    const bg = document.getElementById('location-background');
    if (bg) bg.className = 'location-bg-fullscreen event-caravan';
  }

  handleCheckParty() {
    this.showPartyStatusPanel();
  }

  showPartyStatusPanel() {
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');

    // Hide the portraits panel since we're showing detailed party info
    const portraitsPanel = document.getElementById('party-portraits-panel');
    if (portraitsPanel) portraitsPanel.style.display = 'none';

    if (eventTitle) eventTitle.textContent = 'Your Traveling Party';
    if (eventDescription) {
      let html = '<div style="text-align:left;">';
      this.gameState.partyMembers.forEach(m => {
        const imgSrc = ZionistH.getPortraitImage(m);
        const healthBar = m.isAlive ? `<span style="color:${m.health > 60 ? '#228b22' : m.health > 30 ? '#daa520' : '#dc143c'};">${Math.ceil(m.health)}%</span>` : '<span style="color:#666;">Deceased</span>';
        const opacity = m.isAlive ? '1' : '0.4';
        html += `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.35rem 0;border-bottom:1px solid rgba(218,165,32,0.2);opacity:${opacity};">`;
        html += `<img src="${imgSrc}" alt="${m.firstName}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid ${m.isAlive ? (m.health > 60 ? '#228b22' : m.health > 30 ? '#daa520' : '#dc143c') : '#666'};" />`;
        html += `<div><strong>${m.fullName}</strong> <small style="color:#a89880;">(${m.profession || 'Pioneer'})</small><br>`;
        html += `Health: ${healthBar}`;
        if (m.isAlive) {
          html += ` &nbsp; Morale: ${Math.ceil(m.morale || 0)}%`;
          if (m.isDiseased) html += ` &nbsp; <span style="color:#dc143c;">${m.diseaseType}</span>`;
        }
        html += `</div></div>`;
      });
      html += '</div>';
      eventDescription.innerHTML = html;
    }

    if (choicesContainer) {
      choicesContainer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'event-choice available primary-action';
      btn.innerHTML = '<div class="action-content"><div class="action-details"><div class="action-text">Back</div></div></div>';
      btn.addEventListener('click', () => this.showDailyChoices());
      choicesContainer.appendChild(btn);
    }
  }

  handleChangePace() {
    this._renderPaceScreen();
  }

  _renderPaceScreen() {
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');

    if (eventTitle) eventTitle.textContent = 'Set Travel Pace & Rations';

    const currentPace = this.gameState.pace === ZionistH.PACE_SLOW ? 'Slow' : this.gameState.pace === ZionistH.PACE_FAST ? 'Fast' : 'Normal';
    const currentRations = this.gameState.rations === ZionistH.RATIONS_BARE ? 'Bare Bones' : this.gameState.rations === ZionistH.RATIONS_MEAGER ? 'Meager' : 'Filling';

    if (eventDescription) {
      eventDescription.innerHTML = `
        <div style="margin-bottom:0.6rem;">
          <div style="margin-bottom:0.5rem;"><strong>Travel Pace:</strong> <span style="color:var(--gold);">${currentPace}</span></div>
          <div><strong>Rations:</strong> <span style="color:var(--gold);">${currentRations}</span></div>
        </div>
        <p style="color:var(--text-secondary);font-size:0.85rem;">Select any option to change it. You can change both pace and rations before continuing your journey.</p>
      `;
    }

    if (choicesContainer) {
      choicesContainer.innerHTML = '';

      // Pace header
      const paceLabel = document.createElement('div');
      paceLabel.style.cssText = 'grid-column:1/-1;color:var(--gold);font-weight:bold;font-size:0.9rem;border-bottom:1px solid rgba(218,165,32,0.3);padding-bottom:0.2rem;margin-top:0.2rem;';
      paceLabel.textContent = 'PACE';
      choicesContainer.appendChild(paceLabel);

      const paceChoices = [
        { id: 'pace_slow', text: 'Slow', desc: 'Safe, less food, slower', active: this.gameState.pace === ZionistH.PACE_SLOW },
        { id: 'pace_normal', text: 'Normal', desc: 'Balanced speed & cost', active: this.gameState.pace === ZionistH.PACE_NORMAL },
        { id: 'pace_fast', text: 'Fast', desc: 'Quick but risky & costly', active: this.gameState.pace === ZionistH.PACE_FAST },
      ];

      paceChoices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `event-choice available${c.active ? ' pace-active' : ''}`;
        btn.innerHTML = `<div class="action-content"><div class="action-details"><div class="action-text">${c.text}</div><div style="font-size:0.75rem;color:var(--text-secondary);">${c.desc}</div></div></div>`;
        btn.addEventListener('click', () => {
          if (c.id === 'pace_slow') this.gameState.setPace(ZionistH.PACE_SLOW);
          else if (c.id === 'pace_normal') this.gameState.setPace(ZionistH.PACE_NORMAL);
          else if (c.id === 'pace_fast') this.gameState.setPace(ZionistH.PACE_FAST);
          this._renderPaceScreen(); // re-render to update active states
        });
        choicesContainer.appendChild(btn);
      });

      // Rations header
      const rationLabel = document.createElement('div');
      rationLabel.style.cssText = 'grid-column:1/-1;color:var(--gold);font-weight:bold;font-size:0.9rem;border-bottom:1px solid rgba(218,165,32,0.3);padding-bottom:0.2rem;margin-top:0.4rem;';
      rationLabel.textContent = 'RATIONS';
      choicesContainer.appendChild(rationLabel);

      const rationChoices = [
        { id: 'rations_bare', text: 'Bare Bones', desc: 'Half meals, saves food', active: this.gameState.rations === ZionistH.RATIONS_BARE },
        { id: 'rations_meager', text: 'Meager', desc: 'Reduced, minor risk', active: this.gameState.rations === ZionistH.RATIONS_MEAGER },
        { id: 'rations_filling', text: 'Filling', desc: 'Full meals, best health', active: this.gameState.rations === ZionistH.RATIONS_FILLING },
      ];

      rationChoices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = `event-choice available${c.active ? ' pace-active' : ''}`;
        btn.innerHTML = `<div class="action-content"><div class="action-details"><div class="action-text">${c.text}</div><div style="font-size:0.75rem;color:var(--text-secondary);">${c.desc}</div></div></div>`;
        btn.addEventListener('click', () => {
          if (c.id === 'rations_bare') this.gameState.rations = ZionistH.RATIONS_BARE;
          else if (c.id === 'rations_meager') this.gameState.rations = ZionistH.RATIONS_MEAGER;
          else if (c.id === 'rations_filling') this.gameState.rations = ZionistH.RATIONS_FILLING;
          this._renderPaceScreen(); // re-render to update active states
        });
        choicesContainer.appendChild(btn);
      });

      // Done button
      const backBtn = document.createElement('button');
      backBtn.style.cssText = 'grid-column:1/-1;margin-top:0.3rem;';
      backBtn.className = 'event-choice available primary-action';
      backBtn.innerHTML = '<div class="action-content"><div class="action-details"><div class="action-text">Done</div></div></div>';
      backBtn.addEventListener('click', () => {
        const newPace = this.gameState.pace === ZionistH.PACE_SLOW ? 'Slow' : this.gameState.pace === ZionistH.PACE_FAST ? 'Fast' : 'Normal';
        const newRations = this.gameState.rations === ZionistH.RATIONS_BARE ? 'Bare Bones' : this.gameState.rations === ZionistH.RATIONS_MEAGER ? 'Meager' : 'Filling';
        this.ui.logMessage(`Pace: ${newPace} | Rations: ${newRations}`, 'neutral');
        this.ui.refreshStats();
        this.showDailyChoices();
      });
      choicesContainer.appendChild(backBtn);
    }
  }

  showMemberDetailPanel(member) {
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');
    const portraitsPanel = document.getElementById('party-portraits-panel');
    if (portraitsPanel) portraitsPanel.style.display = 'none';

    const portrait = ZionistH.getPortraitImage(member);
    const inv = this.gameState.inventory;

    if (eventTitle) eventTitle.textContent = member.fullName;

    if (eventDescription) {
      let html = '<div style="text-align:left;">';

      // Portrait + basic info
      html += `<div style="display:flex;gap:1rem;align-items:center;margin-bottom:0.8rem;">`;
      html += `<img src="${portrait}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--frame-gold);" />`;
      html += `<div>`;
      html += `<div style="font-size:1.1rem;font-weight:bold;color:var(--text-accent);">${member.fullName}</div>`;
      html += `<div style="font-size:0.9rem;color:var(--text-secondary);">${member.profession || 'Pioneer'}</div>`;
      html += `<div style="font-size:0.9rem;color:${member.isAlive ? 'var(--health-good)' : '#dc143c'};">${member.isAlive ? 'Alive' : 'Deceased'}</div>`;
      html += `</div></div>`;

      // Stats
      html += `<div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">`;
      if (member.isAlive) {
        html += `<div><span class="ri-label">Health:</span> <span style="color:${member.health > 60 ? 'var(--health-good)' : member.health > 30 ? '#daa520' : '#dc143c'};">${Math.ceil(member.health)}%</span></div>`;
        html += `<div><span class="ri-label">Morale:</span> ${Math.ceil(member.morale || 0)}%</div>`;
      } else {
        html += `<div><span class="ri-label">Health:</span> <span style="color:#666;">--</span></div>`;
        html += `<div><span class="ri-label">Morale:</span> <span style="color:#666;">--</span></div>`;
      }
      html += `</div>`;

      // Status
      if (member.isAlive && member.isDiseased) {
        html += `<div style="background:rgba(220,53,69,0.15);border:1px solid #dc143c;border-radius:6px;padding:0.4rem 0.7rem;margin-bottom:0.5rem;color:#dc143c;font-weight:bold;">Sick: ${member.diseaseType}</div>`;
      }

      // Events log
      html += `<div style="border-top:1px solid rgba(218,165,32,0.2);padding-top:0.5rem;margin-top:0.3rem;">`;
      html += `<div style="color:var(--text-accent);font-weight:bold;margin-bottom:0.3rem;">Actions:</div>`;

      // Action buttons
      const actions = [];
      if (member.isAlive && member.isDiseased && inv.medicine > 0) {
        actions.push(`<button class="event-choice available" style="padding:0.3rem 0.8rem;min-width:auto;font-size:0.9rem;margin:0.2rem 0;" onclick="window._memberAction('medicine','${member.id}')">Use Medicine (${inv.medicine} left)</button>`);
      }
      if (member.isAlive && inv.clothing > 0) {
        actions.push(`<button class="event-choice available" style="padding:0.3rem 0.8rem;min-width:auto;font-size:0.9rem;margin:0.2rem 0;" onclick="window._memberAction('clothing','${member.id}')">Give Clothing +10 HP (${inv.clothing} left)</button>`);
      }
      if (member.isAlive && inv.food >= 10) {
        actions.push(`<button class="event-choice available" style="padding:0.3rem 0.8rem;min-width:auto;font-size:0.9rem;margin:0.2rem 0;" onclick="window._memberAction('food','${member.id}')">Give Extra Food +5 HP (costs 10 lbs)</button>`);
      }
      if (member.isAlive && inv.water >= 5) {
        actions.push(`<button class="event-choice available" style="padding:0.3rem 0.8rem;min-width:auto;font-size:0.9rem;margin:0.2rem 0;" onclick="window._memberAction('water','${member.id}')">Give Extra Water +3 HP (costs 5 gal)</button>`);
      }
      if (actions.length > 0) {
        html += actions.join('');
      } else if (member.isAlive) {
        html += `<div style="color:var(--text-secondary);font-style:italic;">No items available to use.</div>`;
      }

      html += `</div></div>`;
      eventDescription.innerHTML = html;
    }

    // Action handlers
    const self = this;
    window._memberAction = function(action, memberId) {
      const m = self.gameState.partyMembers.find(p => String(p.id) === String(memberId));
      if (!m || !m.isAlive) return;
      switch (action) {
        case 'medicine':
          if (self.gameState.treatIllness(m)) {
            self.ui.logMessage(`Treated ${m.firstName} with medicine.`, 'positive');
          }
          break;
        case 'clothing':
          if (inv.clothing > 0) {
            self.gameState.inventory.clothing--;
            m.health = Math.min(100, m.health + 10);
            m.morale = Math.min(100, m.morale + 5);
            self.ui.logMessage(`Gave clothing to ${m.firstName}. +10 HP`, 'positive');
          }
          break;
        case 'food':
          if (inv.food >= 10) {
            self.gameState.inventory.food -= 10;
            m.health = Math.min(100, m.health + 5);
            m.morale = Math.min(100, m.morale + 3);
            self.ui.logMessage(`Fed ${m.firstName} extra rations. +5 HP`, 'positive');
          }
          break;
        case 'water':
          if (inv.water >= 5) {
            self.gameState.inventory.water -= 5;
            m.health = Math.min(100, m.health + 3);
            m.morale = Math.min(100, m.morale + 2);
            self.ui.logMessage(`Gave ${m.firstName} extra water. +3 HP`, 'positive');
          }
          break;
      }
      self.showMemberDetailPanel(m); // refresh
    };

    if (choicesContainer) {
      choicesContainer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'event-choice available primary-action';
      btn.innerHTML = '<div class="action-content"><div class="action-details"><div class="action-text">Back</div></div></div>';
      btn.addEventListener('click', () => this.showDailyChoices());
      choicesContainer.appendChild(btn);
    }
  }

  showInventoryPanel() {
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');
    const portraitsPanel = document.getElementById('party-portraits-panel');
    if (portraitsPanel) portraitsPanel.style.display = 'none';

    if (eventTitle) eventTitle.textContent = 'Inventory';

    const inv = this.gameState.inventory;
    const sickMembers = this.gameState.partyMembers.filter(m => m.isAlive && m.isDiseased);
    const coldMembers = this.gameState.partyMembers.filter(m => m.isAlive && m.health < 60);

    if (eventDescription) {
      let html = '<div style="text-align:left;">';
      html += `<div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:0.8rem;">`;
      html += `<div><span class="ri-label">Food:</span> ${Math.ceil(inv.food)} lbs</div>`;
      html += `<div><span class="ri-label">Water:</span> ${Math.ceil(inv.water)} gal</div>`;
      html += `<div><span class="ri-label">Money:</span> ${this.gameState.money} ${this.gameState.getCurrencyName()}</div>`;
      html += `<div><span class="ri-label">Tools:</span> ${inv.tools}</div>`;
      html += `<div><span class="ri-label">Medicine:</span> ${inv.medicine}</div>`;
      html += `<div><span class="ri-label">Clothing:</span> ${inv.clothing}</div>`;
      html += `</div>`;

      if (sickMembers.length > 0) {
        html += `<div style="border-top:1px solid rgba(218,165,32,0.2);padding-top:0.5rem;margin-top:0.3rem;">`;
        html += `<div style="color:var(--text-accent);font-weight:bold;margin-bottom:0.3rem;">Sick Party Members:</div>`;
        sickMembers.forEach(m => {
          html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.2rem 0;">`;
          html += `<span>${m.fullName} — ${m.diseaseType} (HP: ${Math.ceil(m.health)}%)</span>`;
          if (inv.medicine > 0) {
            html += `<button class="event-choice available" style="padding:0.2rem 0.6rem;min-width:auto;font-size:0.85rem;" onclick="window._invUseMedicine('${m.id}')">Use Medicine</button>`;
          }
          html += `</div>`;
        });
        html += `</div>`;
      }

      if (coldMembers.length > 0 && inv.clothing > 0) {
        html += `<div style="border-top:1px solid rgba(218,165,32,0.2);padding-top:0.5rem;margin-top:0.3rem;">`;
        html += `<div style="color:var(--text-accent);font-weight:bold;margin-bottom:0.3rem;">Give Clothing (boosts health):</div>`;
        coldMembers.forEach(m => {
          html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.2rem 0;">`;
          html += `<span>${m.fullName} (HP: ${Math.ceil(m.health)}%)</span>`;
          html += `<button class="event-choice available" style="padding:0.2rem 0.6rem;min-width:auto;font-size:0.85rem;" onclick="window._invGiveClothing('${m.id}')">Give Clothing</button>`;
          html += `</div>`;
        });
        html += `</div>`;
      }

      html += '</div>';
      eventDescription.innerHTML = html;
    }

    // Set up action handlers
    const self = this;
    window._invUseMedicine = function(memberId) {
      const member = self.gameState.partyMembers.find(m => String(m.id) === String(memberId));
      if (member && self.gameState.treatIllness(member)) {
        self.ui.logMessage(`Treated ${member.firstName} with medicine.`, 'positive');
        self.showInventoryPanel(); // refresh
      }
    };
    window._invGiveClothing = function(memberId) {
      const member = self.gameState.partyMembers.find(m => String(m.id) === String(memberId));
      if (member && self.gameState.inventory.clothing > 0) {
        self.gameState.inventory.clothing--;
        member.health = Math.min(100, member.health + 10);
        member.morale = Math.min(100, member.morale + 5);
        self.ui.logMessage(`Gave clothing to ${member.firstName}. Health improved!`, 'positive');
        self.showInventoryPanel(); // refresh
      }
    };

    if (choicesContainer) {
      choicesContainer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'event-choice available primary-action';
      btn.innerHTML = '<div class="action-content"><div class="action-details"><div class="action-text">Back</div></div></div>';
      btn.addEventListener('click', () => this.showDailyChoices());
      choicesContainer.appendChild(btn);
    }
  }

  triggerRandomEvent() {
    // Use the EventManager to show a random event
    const game = window.ZionistH.gameInstance;
    if (game && game.event) {
      game.event.triggerRandomEvent(() => {
        // After event resolves, show next day's choices
        this.showDailyChoices();
      });
    } else {
      // Fallback if event system not ready
      setTimeout(() => this.showDailyChoices(), 500);
    }
  }

  handleGameOver() {
    const reason = this.getGameOverReason();
    this.ui.showGameOver(reason, {
      day: this.gameState.day,
      progress: this.gameState.getProgressPercentage(),
      pioneers: this.gameState.getAlivePartyMembers().length
    });
  }

  handleVictory() {
    console.log('🏆 handleVictory called — showing final victory screen');
    this.gameState.checkAchievements();
    const finalScore = this.gameState.calculateScore();

    // Hide the main game UI so the victory overlay is clearly on top
    const mainGame = document.getElementById('main-game');
    if (mainGame) mainGame.style.display = 'none';

    this.ui.showVictory({
      day: this.gameState.day,
      arrivalDate: this.gameState.getFormattedDate(),
      distance: Math.round(this.gameState.distanceTraveled),
      settlers: this.gameState.getAlivePartyMembers().length,
      totalParty: this.gameState.partyMembers.length,
      historicalKnowledge: this.gameState.historicalKnowledge,
      score: finalScore,
      partyMembers: this.gameState.partyMembers,
      inventory: { ...this.gameState.inventory },
      money: this.gameState.money,
      currency: this.gameState.getCurrencyName(),
      achievements: [...this.gameState.achievements],
      profession: this.gameState.selectedProfession
    });
  }

  getGameOverReason() {
    if (this.gameState.getAlivePartyMembers().length === 0) {
      return 'all party members perished';
    }
    if (this.gameState.groupHealth <= 0) {
      return 'poor health and exhaustion';
    }
    return 'the hardships of the journey';
  }

  // Dynamic Background System for Daily Decisions
  setDynamicBackground() {
    const dailyDecisionOverlay = document.getElementById('daily-decision');
    if (!dailyDecisionOverlay) return;

    // Clear previous location classes
    dailyDecisionOverlay.className = dailyDecisionOverlay.className
      .replace(/location-\w+/g, '')
      .replace(/scene-\w+/g, '')
      .replace(/weather-\w+/g, '');

    // Get current location
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    if (location) {
      // Convert location name to CSS class format
      const locationClass = this.getLocationCSSClass(location.name);
      dailyDecisionOverlay.classList.add(locationClass);
    }

    // Add weather class if applicable
    const weatherClass = this.getWeatherCSSClass();
    if (weatherClass) {
      dailyDecisionOverlay.classList.add(weatherClass);
    }

    // Add transition effect
    dailyDecisionOverlay.classList.add('background-transition');
    setTimeout(() => {
      dailyDecisionOverlay.classList.remove('background-transition');
    }, 1000);
  }

  getLocationCSSClass(locationName) {
    if (!locationName) return 'scene-desert';

    // Convert location name to lowercase and replace spaces/punctuation with hyphens
    const normalized = locationName.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Map specific locations to CSS classes
    const locationMap = {
      'warsaw': 'location-warsaw',
      'vienna': 'location-vienna',
      'trieste': 'location-trieste',
      'trieste-port': 'location-trieste-port',
      'mediterranean': 'location-mediterranean',
      'mediterranean-sea': 'location-mediterranean-sea',
      'haifa': 'location-haifa',
      'haifa-port': 'location-haifa-port',
      'jaffa': 'location-jaffa',
      'jerusalem': 'location-jerusalem',
      'tel-aviv': 'location-tel-aviv',
      'herzliya': 'location-herzliya',
      'petah-tikva': 'location-petah-tikva',
      'rishon-letzion': 'location-rishon-letzion',
      'rishon': 'location-rishon',
      'caesarea': 'location-caesarea',
      'zichron-yaakov': 'location-zichron-yaakov',
      'zichron': 'location-zichron',
      'kochav-yair': 'location-kochav-yair'
    };

    // Check for exact match first
    if (locationMap[normalized]) {
      return locationMap[normalized];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(locationMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    // Default fallback based on location type
    if (normalized.includes('port') || normalized.includes('sea') || normalized.includes('coast')) {
      return 'scene-sea';
    } else if (normalized.includes('desert') || normalized.includes('sand')) {
      return 'scene-desert';
    } else if (normalized.includes('mountain') || normalized.includes('hill')) {
      return 'scene-mountain';
    } else {
      return 'location-' + normalized;
    }
  }

  getWeatherCSSClass() {
    const weather = this.gameState.weather;
    if (!weather) return null;

    const weatherMap = {
      'stormy': 'weather-stormy',
      'rainy': 'weather-rainy',
      'sunny': 'weather-sunny',
      'fair': 'weather-sunny',
      'cloudy': 'weather-cloudy',
      'hot': 'weather-sunny',
      'cold': 'weather-cloudy'
    };

    return weatherMap[weather] || null;
  }
}

// Make it available globally
window.ZionistH = window.ZionistH || {};
window.ZionistH.DailyDecision = DailyDecision;
