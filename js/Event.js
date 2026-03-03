/* eslint-disable no-undef */
// Event.js - Random event system for Zionist Trail

class EventManager {
  constructor(gameState, storyConfig, ui) {
    this.gameState = gameState;
    this.storyConfig = storyConfig;
    this.ui = ui;
    this.onEventComplete = null; // callback when event resolves
  }

  // Generate and display a random event based on current location and conditions
  triggerRandomEvent(onComplete) {
    this.onEventComplete = onComplete;
    const event = this.selectRandomEvent();
    if (event) {
      this.showEvent(event);
    } else {
      // No applicable event — continue
      if (onComplete) onComplete();
    }
  }

  // Trigger a specific scripted event by key (for location arrivals)
  triggerScriptedEvent(eventKey, onComplete) {
    this.onEventComplete = onComplete;
    const event = this.storyConfig.events[eventKey];
    console.log(`[EVENT] triggerScriptedEvent('${eventKey}') found=${!!event}`);
    if (event) {
      this.showEvent(event);
    } else {
      console.warn(`[EVENT] Event '${eventKey}' not found in storyConfig.events!`);
      if (onComplete) onComplete();
    }
  }

  selectRandomEvent() {
    const location = this.gameState.getCurrentLocation(this.storyConfig);
    const locationName = location ? location.name.toLowerCase() : '';
    const applicable = [];

    // Add location-independent random events
    for (const evt of RANDOM_EVENTS) {
      // Filter by terrain
      if (evt.terrain && location) {
        if (!evt.terrain.includes(location.terrain)) continue;
      }
      applicable.push(evt);
    }

    if (applicable.length === 0) return null;

    // Weighted random selection
    const totalWeight = applicable.reduce((sum, e) => sum + (e.weight || 1), 0);
    let roll = Math.random() * totalWeight;
    for (const evt of applicable) {
      roll -= (evt.weight || 1);
      if (roll <= 0) return evt;
    }
    return applicable[applicable.length - 1];
  }

  showEvent(event) {
    // Build the event UI in the event section
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');

    // Set event-specific background image
    const eventBgMap = {
      'Exhaustion Takes Its Toll': 'event-exhaustion',
      'Sandstorm!': 'event-sandstorm',
      'Mediterranean Squall': 'event-storm',
      'Highway Robbers!': 'highway-robbers',
      'Cholera Outbreak': 'event-sick',
      'Typhus Spreads': 'event-sick',
      'Helpful Fellow Travelers': 'event-market',
      'Jewish Community Offers Aid': 'event-synagogue',
      'The Synagogues of Kazimierz': 'event-synagogue',
      'Beautiful Sunrise Over the Land': 'event-caravan',
      'Dolphins Alongside the Ship': 'event-sea-dolphins',
      'Suspicious Vessel on the Horizon': 'event-med-stormy',
      'Passenger Falls Overboard': 'event-shipdeck',
      'Night Under the Stars': 'event-ship-explore',
      'Ship Rations Running Low': 'event-ship-galley',
      'Ship Engine Trouble': 'event-shipdeck',
      'Ottoman Customs': 'event-customs',
      'First Glimpse of Eretz Yisrael': 'event-firstglimpse',
      'The Old Port of Jaffa': 'event-jaffa-interior',
      'Malaria Strikes': 'event-settlement',
      'Bedouin Caravan Encounter': 'event-caravan',
      'Ottoman Patrol': 'event-customs',
      'Ancient Ruins Discovered': 'travel-palestine-hills',
      'Water Well Dispute': 'travel-palestine',
      'Pilgrims on the Road': 'travel-palestine-hills',
      'Sudden Dust Storm': 'event-sandstorm',
      'The Western Wall': 'event-western-wall',
      'A New Beginning': 'event-kochav-yair',
    };
    const bgClass = eventBgMap[event.title];
    if (bgClass) {
      const bg = document.getElementById('location-background');
      if (bg) bg.className = 'location-bg-fullscreen ' + bgClass;
    }

    if (eventTitle) eventTitle.textContent = event.title;
    if (eventDescription) {
      let descHtml = `<p>${event.text}</p>`;
      // Show impact on party members
      if (event.effects) {
        const impacts = [];
        if (event.effects.health) impacts.push(`Health ${event.effects.health > 0 ? '+' : ''}${event.effects.health}%`);
        if (event.effects.morale) impacts.push(`Morale ${event.effects.morale > 0 ? '+' : ''}${event.effects.morale}`);
        if (event.effects.food) impacts.push(`Food ${event.effects.food > 0 ? '+' : ''}${event.effects.food} lbs`);
        if (event.effects.water) impacts.push(`Water ${event.effects.water > 0 ? '+' : ''}${event.effects.water} gal`);
        if (event.effects.money) impacts.push(`Money ${event.effects.money > 0 ? '+' : ''}${event.effects.money} ${this.gameState.getCurrencyName()}`);
        if (impacts.length > 0) {
          const hasNegative = (event.effects.health < 0 || event.effects.morale < 0 || event.effects.food < 0 || event.effects.water < 0 || event.effects.money < 0);
          descHtml += `<p style="margin-top:0.5rem;color:${hasNegative ? '#dc143c' : '#228b22'};font-weight:bold;">${impacts.join(' | ')}</p>`;
        }
      }
      eventDescription.innerHTML = descHtml;
    }

    if (choicesContainer) {
      choicesContainer.innerHTML = '';

      if (event.choices && event.choices.length > 0) {
        // Event with player choices
        const grid = document.createElement('div');
        grid.className = 'daily-choices-grid';

        event.choices.forEach((choice, index) => {
          const btn = document.createElement('button');
          btn.className = 'event-choice available';
          btn.innerHTML = `
            <div class="action-content">
              <div class="action-number">${index + 1}</div>
              <div class="action-details">
                <div class="action-text">${choice.text}</div>
              </div>
            </div>
          `;
          btn.addEventListener('click', () => this.resolveChoice(event, choice));
          grid.appendChild(btn);
        });

        choicesContainer.appendChild(grid);
      } else {
        // Simple narrative event — auto-apply effects, show OK button
        this.applyEffects(event.effects || {});

        const btn = document.createElement('button');
        btn.className = 'event-choice available primary-action';
        btn.innerHTML = `
          <div class="action-content">
            <div class="action-details">
              <div class="action-text">Continue</div>
            </div>
          </div>
        `;
        btn.addEventListener('click', () => this.finishEvent());
        choicesContainer.appendChild(btn);
      }
    }
  }

  resolveChoice(event, choice) {
    this.applyEffects(choice.effects || {});

    // Build outcome narrative to show the player
    const effects = choice.effects || {};
    const outcomeLines = [];

    // Describe what happened based on the choice
    outcomeLines.push(`You chose: "${choice.text}"`);

    // Build specific impact descriptions
    if (effects.health > 0) outcomeLines.push(`Your party feels better. (+${effects.health} health)`);
    if (effects.health < 0) outcomeLines.push(`The effort takes a toll on the group. (${effects.health} health)`);
    if (effects.morale > 0) outcomeLines.push(`Spirits are lifted! (+${effects.morale} morale)`);
    if (effects.morale < 0) outcomeLines.push(`The mood darkens. (${effects.morale} morale)`);
    if (effects.food > 0) outcomeLines.push(`You gain provisions. (+${effects.food} food)`);
    if (effects.food < 0) outcomeLines.push(`Supplies are lost. (${effects.food} food)`);
    if (effects.water > 0) outcomeLines.push(`Fresh water secured. (+${effects.water} water)`);
    if (effects.water < 0) outcomeLines.push(`Water supplies dwindle. (${effects.water} water)`);
    if (effects.money > 0) outcomeLines.push(`You gain ${effects.money} ${this.gameState.getCurrencyName()}.`);
    if (effects.money < 0) outcomeLines.push(`You spend ${Math.abs(effects.money)} ${this.gameState.getCurrencyName()}.`);
    if (effects.medicine > 0) outcomeLines.push(`Medicine acquired. (+${effects.medicine})`);
    if (effects.medicine < 0) outcomeLines.push(`Medicine used. (${effects.medicine})`);
    if (effects.tools > 0) outcomeLines.push(`Tools gained. (+${effects.tools})`);
    if (effects.tools < 0) outcomeLines.push(`Tools lost. (${effects.tools})`);
    if (effects.clothing > 0) outcomeLines.push(`Clothing gained. (+${effects.clothing})`);
    if (effects.clothing < 0) outcomeLines.push(`Clothing worn out. (${effects.clothing})`);
    if (effects.day) outcomeLines.push(`${effects.day} day${effects.day > 1 ? 's' : ''} lost to delays.`);
    if (effects.historicalKnowledge) outcomeLines.push(`You learned something valuable. (+${effects.historicalKnowledge} knowledge)`);

    // If no specific effects, generic line
    if (outcomeLines.length === 1) {
      outcomeLines.push('You carry on with the journey.');
    }

    // Show the outcome in the event area
    const eventTitle = document.getElementById('event-title');
    const eventDescription = document.getElementById('event-description');
    const choicesContainer = document.querySelector('.choices-container');

    if (eventTitle) eventTitle.textContent = event.title + ' — Outcome';

    if (eventDescription) {
      const hasNegative = effects.health < 0 || effects.morale < 0 || effects.food < 0 || effects.water < 0 || effects.money < 0;
      const hasPositive = effects.health > 0 || effects.morale > 0 || effects.food > 0 || effects.water > 0 || effects.money > 0;
      let color = 'var(--text-primary)';
      if (hasNegative && !hasPositive) color = '#dc143c';
      else if (hasPositive && !hasNegative) color = '#228b22';
      else if (hasNegative && hasPositive) color = '#daa520';

      let html = '';
      outcomeLines.forEach((line, i) => {
        if (i === 0) {
          html += `<p style="font-style:italic;color:var(--text-secondary);margin-bottom:0.4rem;">${line}</p>`;
        } else {
          html += `<p style="color:${color};margin:0.2rem 0;">${line}</p>`;
        }
      });
      eventDescription.innerHTML = html;
    }

    if (choicesContainer) {
      choicesContainer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'event-choice available primary-action';
      btn.innerHTML = '<div class="action-content"><div class="action-details"><div class="action-text">Continue</div></div></div>';
      btn.addEventListener('click', () => this.finishEvent());
      choicesContainer.appendChild(btn);
    }

    if (this.ui) this.ui.refreshStats();
  }

  applyEffects(effects) {
    if (!effects) return;

    if (effects.health) this.gameState.groupHealth = Math.max(0, Math.min(100, this.gameState.groupHealth + effects.health));
    if (effects.morale) this.gameState.groupMorale = Math.max(0, Math.min(100, this.gameState.groupMorale + effects.morale));
    if (effects.money) this.gameState.money = Math.max(0, this.gameState.money + effects.money);
    if (effects.food) this.gameState.inventory.food = Math.max(0, this.gameState.inventory.food + effects.food);
    if (effects.water) this.gameState.inventory.water = Math.max(0, this.gameState.inventory.water + effects.water);
    if (effects.medicine) this.gameState.inventory.medicine = Math.max(0, this.gameState.inventory.medicine + effects.medicine);
    if (effects.tools) this.gameState.inventory.tools = Math.max(0, this.gameState.inventory.tools + effects.tools);
    if (effects.clothing) this.gameState.inventory.clothing = Math.max(0, this.gameState.inventory.clothing + effects.clothing);
    if (effects.day) this.gameState.day += effects.day;
    if (effects.historicalKnowledge) this.gameState.historicalKnowledge += effects.historicalKnowledge;

    // Sync individual members to group health direction (without double-applying)
    if (effects.health) {
      this.gameState.partyMembers.forEach(m => {
        if (m.isAlive && m.health <= 0) {
          m.isAlive = false;
          this.gameState.logDeath(m);
        }
      });
    }
  }

  describeEffects(effects) {
    const parts = [];
    if (effects.health > 0) parts.push(`+${effects.health} health`);
    if (effects.health < 0) parts.push(`${effects.health} health`);
    if (effects.morale > 0) parts.push(`+${effects.morale} morale`);
    if (effects.morale < 0) parts.push(`${effects.morale} morale`);
    if (effects.money > 0) parts.push(`+${effects.money} ${this.gameState.getCurrencyName()}`);
    if (effects.money < 0) parts.push(`${effects.money} ${this.gameState.getCurrencyName()}`);
    if (effects.food > 0) parts.push(`+${effects.food} food`);
    if (effects.food < 0) parts.push(`${effects.food} food`);
    if (effects.medicine > 0) parts.push(`+${effects.medicine} medicine`);
    if (effects.medicine < 0) parts.push(`${effects.medicine} medicine`);
    return parts.length > 0 ? parts.join(', ') : '';
  }

  finishEvent() {
    if (this.ui) this.ui.refreshStats();
    if (this.onEventComplete) {
      const callback = this.onEventComplete;
      this.onEventComplete = null;
      callback();
    } else if (this.gameState.gameWon) {
      // Safety fallback: if callback was lost but game is won, show victory directly
      console.log('🏆 finishEvent fallback — gameWon is true, triggering victory');
      const game = window.ZionistH.gameInstance;
      if (game && game.dailyDecision) {
        game.dailyDecision.handleVictory();
      }
    }
  }
}

// Random event pool — terrain-filtered, weighted
const RANDOM_EVENTS = [
  // === ILLNESS EVENTS ===
  {
    title: "Cholera Outbreak",
    text: "Contaminated water has caused cholera in your party. Several members are violently ill.",
    weight: 2,
    terrain: ["road", "port", "city"],
    choices: [
      { text: "Use medicine to treat them", effects: { medicine: -1, health: 10, morale: 5 } },
      { text: "Quarantine the sick and press on", effects: { health: -15, morale: -10 } },
      { text: "Rest for two days", effects: { day: 2, health: 5, food: -20 } }
    ]
  },
  {
    title: "Typhus Spreads",
    text: "Lice in the cramped quarters have spread typhus. Fevers are rising.",
    weight: 2,
    terrain: ["road", "sea", "port"],
    choices: [
      { text: "Burn infected clothing and use medicine", effects: { medicine: -1, clothing: -1, health: 10 } },
      { text: "Try folk remedies from the locals", effects: { health: -5, morale: 5 } }
    ]
  },
  {
    title: "Exhaustion Takes Its Toll",
    text: "The long days of travel have left your party drained. Some can barely stand.",
    weight: 3,
    effects: { health: -8, morale: -5 }
  },

  // === WEATHER EVENTS ===
  {
    title: "Sandstorm!",
    text: "A violent sandstorm forces your party to take shelter. Visibility is zero and sand gets into everything.",
    weight: 2,
    terrain: ["farmland", "settlement", "mountain"],
    choices: [
      { text: "Take shelter and wait it out", effects: { day: 1, food: -10 } },
      { text: "Push through the storm", effects: { health: -15, morale: -10 } }
    ]
  },
  {
    title: "Mediterranean Squall",
    text: "A sudden squall rocks the ship. Cargo shifts dangerously and waves crash over the railings.",
    weight: 3,
    terrain: ["sea"],
    choices: [
      { text: "Help secure the cargo", effects: { health: -5, morale: 10 } },
      { text: "Stay below deck", effects: { morale: -5 } },
      { text: "Pray for calm seas", effects: { morale: 5, historicalKnowledge: 1 } }
    ]
  },
  {
    title: "Bitter European Winter",
    text: "An early frost has set in. The roads are icy and your party shivers through the night.",
    weight: 2,
    terrain: ["road"],
    choices: [
      { text: "Use extra clothing for warmth", effects: { clothing: -1, health: 5 } },
      { text: "Build a fire and rest", effects: { day: 1, health: 5, morale: 5 } },
      { text: "March on through the cold", effects: { health: -10, morale: -5 } }
    ]
  },

  // === BANDIT / THEFT EVENTS ===
  {
    title: "Highway Robbers!",
    text: "Armed bandits block the road and demand your valuables. Their numbers are too great to fight.",
    weight: 2,
    terrain: ["road", "mountain"],
    choices: [
      { text: "Pay them off (30 coins)", effects: { money: -30 } },
      { text: "Negotiate — offer food instead", effects: { food: -30, morale: -5 } },
      { text: "Try to flee (risky!)", effects: { health: -10, money: -15 } }
    ]
  },
  {
    title: "Ottoman Tax Collectors",
    text: "Ottoman officials stop your group and demand a tax for Jewish immigrants entering the region.",
    weight: 2,
    terrain: ["port", "settlement", "farmland", "mountain", "city"],
    choices: [
      { text: "Pay the tax (25 coins)", effects: { money: -25 } },
      { text: "Argue your case", effects: { day: 1, morale: -5 } },
      { text: "Try to find an alternate route", effects: { day: 2, health: -5 } }
    ]
  },
  {
    title: "Supplies Stolen in the Night",
    text: "You wake to find that someone has raided your supplies while the camp slept.",
    weight: 2,
    effects: { food: -20, money: -10, morale: -10 }
  },

  // === POSITIVE EVENTS ===
  {
    title: "Helpful Fellow Travelers",
    text: "A group of experienced travelers share food and advice. They've traveled this route before.",
    weight: 3,
    effects: { food: 15, morale: 10, historicalKnowledge: 1 }
  },
  {
    title: "Abandoned Supplies Found",
    text: "You discover a cache of supplies left behind by previous travelers. Fortune smiles on you!",
    weight: 2,
    effects: { food: 25, water: 15, morale: 5 }
  },
  {
    title: "Jewish Community Offers Aid",
    text: "A local Jewish community welcomes you with open arms, providing food, shelter, and medical care.",
    weight: 2,
    terrain: ["city", "port", "settlement"],
    effects: { food: 20, health: 10, morale: 15, historicalKnowledge: 1 }
  },
  {
    title: "Successful Trade",
    text: "A merchant offers you a favorable deal: premium tools at a fair price.",
    weight: 2,
    terrain: ["city", "port"],
    effects: { tools: 1, money: -15, morale: 5 }
  },
  {
    title: "Beautiful Sunrise Over the Land",
    text: "The morning sun paints the sky in gold and crimson. Your party stops to take in the breathtaking view. Spirits lift.",
    weight: 3,
    effects: { morale: 10 }
  },

  // === HISTORICAL / NARRATIVE EVENTS ===
  {
    title: "News from Europe",
    text: "A traveler brings a newspaper from Europe. The Dreyfus Affair is dominating headlines — antisemitism is growing across the continent.",
    weight: 2,
    terrain: ["road", "city", "port"],
    effects: { morale: -5, historicalKnowledge: 2 }
  },
  {
    title: "Letter from a Pioneer",
    text: "You find a letter left by a previous immigrant describing the challenges and beauty of settling in Palestine. It fills you with determination.",
    weight: 2,
    effects: { morale: 10, historicalKnowledge: 1 }
  },
  {
    title: "Encounter with Arab Farmers",
    text: "Local Arab farmers approach your group. They offer to teach you about the land's soil and seasons.",
    weight: 2,
    terrain: ["farmland", "settlement"],
    choices: [
      { text: "Accept and learn from them", effects: { morale: 10, historicalKnowledge: 2, food: 10 } },
      { text: "Politely decline and continue", effects: {} }
    ]
  },
  {
    title: "Malaria Warning",
    text: "Settlers warn you about the swamps ahead. 'Bring quinine or eucalyptus — the fever kills more than bandits.'",
    weight: 2,
    terrain: ["farmland", "settlement"],
    effects: { historicalKnowledge: 1 }
  },

  // === VEHICLE/TRANSPORT EVENTS ===  
  {
    title: "Wagon Wheel Breaks",
    text: "A wheel on your wagon shatters on the rough road. You'll need tools to repair it.",
    weight: 2,
    terrain: ["road", "mountain", "farmland"],
    choices: [
      { text: "Repair with tools", effects: { tools: -1 } },
      { text: "Improvise a repair (costs time)", effects: { day: 1, health: -5 } },
      { text: "Abandon some heavy supplies", effects: { food: -20, water: -10 } }
    ]
  },
  {
    title: "Train Delayed",
    text: "The train is delayed due to mechanical problems. You wait on the platform as hours slip away.",
    weight: 2,
    terrain: ["road"],
    effects: { day: 1, morale: -5 }
  },
  {
    title: "Ship Engine Trouble",
    text: "The steamship's engine sputters and dies. The crew works feverishly to repair it while you drift at sea.",
    weight: 2,
    terrain: ["sea"],
    choices: [
      { text: "Help the crew (risky)", effects: { health: -5, morale: 10 } },
      { text: "Conserve supplies while waiting", effects: { day: 2, food: -15, water: -10 } }
    ]
  },

  // === SEA-SPECIFIC EVENTS ===
  {
    title: "Dolphins Alongside the Ship",
    text: "A pod of dolphins appears, leaping and diving alongside the hull! Passengers crowd the railings. The children are beside themselves with joy.",
    weight: 5,
    terrain: ["sea"],
    choices: [
      { text: "Watch quietly and enjoy the moment", effects: { morale: 15, historicalKnowledge: 1 } },
      { text: "Tell the children stories about dolphins and the sea", effects: { morale: 12, historicalKnowledge: 2 } },
      { text: "Sketch the scene to remember this day", effects: { morale: 10, historicalKnowledge: 1 } }
    ]
  },
  {
    title: "Suspicious Vessel on the Horizon",
    text: "A dark ship appears on the horizon, matching your course. The crew exchanges nervous glances. 'Could be pirates,' mutters a sailor. 'Or just another merchant.'",
    weight: 2,
    terrain: ["sea"],
    choices: [
      { text: "Stay calm and trust the captain", effects: { morale: -3 } },
      { text: "Help the crew prepare defenses just in case", effects: { health: -3, morale: 8 } },
      { text: "Go below deck and secure your valuables", effects: { morale: -5 } }
    ]
  },
  {
    title: "Passenger Falls Overboard",
    text: "A scream pierces the air — someone has fallen overboard! The crew scrambles to throw ropes. Every second counts.",
    weight: 1,
    terrain: ["sea"],
    choices: [
      { text: "Rush to help the crew with the rescue", effects: { health: -5, morale: 15 } },
      { text: "Keep the other passengers calm", effects: { morale: 5 } },
      { text: "Pray for their safe rescue", effects: { morale: 3, historicalKnowledge: 1 } }
    ]
  },
  {
    title: "Night Under the Stars",
    text: "The sea is calm and the sky is impossibly clear. A crew member points out constellations: 'The Phoenicians used these same stars to navigate this sea three thousand years ago.'",
    weight: 3,
    terrain: ["sea"],
    choices: [
      { text: "Stay up and learn the constellations", effects: { morale: 10, historicalKnowledge: 2 } },
      { text: "Share the moment with your party", effects: { morale: 15 } },
      { text: "Reflect on how ancient peoples traveled this route", effects: { morale: 8, historicalKnowledge: 3 } }
    ]
  },
  {
    title: "Ship Rations Running Low",
    text: "The captain announces that rations must be reduced. The voyage is taking longer than expected and the galley's stores are dwindling.",
    weight: 2,
    terrain: ["sea"],
    choices: [
      { text: "Share your personal food stores with others", effects: { food: -15, morale: 10, historicalKnowledge: 1 } },
      { text: "Accept the reduced rations", effects: { food: -8, water: -5, morale: -5 } },
      { text: "Try to catch fish to supplement the kitchen", effects: { food: 5, morale: 5 } }
    ]
  },

  // === TRAIN-SPECIFIC EVENTS ===
  {
    title: "Rain Batters the Train",
    text: "Heavy rain pounds against the windows. The train slows to a crawl through flooded tracks. Water seeps under the carriage doors.",
    weight: 3,
    terrain: ["city"],
    choices: [
      { text: "Close the windows and wait it out", effects: { day: 1, morale: -5 } },
      { text: "Share stories to pass the time", effects: { morale: 5, historicalKnowledge: 1 } },
      { text: "Try to dry your supplies", effects: { food: -5, morale: -3 } }
    ]
  },
  {
    title: "Train Stuck on the Tracks",
    text: "The train grinds to a halt. A tree has fallen across the tracks ahead. The conductor says it could be hours before they clear it.",
    weight: 2,
    terrain: ["city"],
    choices: [
      { text: "Help the crew clear the tree", effects: { health: -5, morale: 10, day: 1 } },
      { text: "Wait patiently in your seat", effects: { day: 1, morale: -8 } },
      { text: "Walk ahead and scout the road", effects: { health: -3, historicalKnowledge: 1 } }
    ]
  },
  {
    title: "Pickpocket on the Train",
    text: "You catch someone rifling through your bags while the carriage sleeps. A quick hand reaches for your money pouch!",
    weight: 2,
    terrain: ["city"],
    choices: [
      { text: "Confront the thief", effects: { morale: 10, health: -5 } },
      { text: "Alert the conductor quietly", effects: { morale: 5, money: -5 } },
      { text: "Grab your bag and move seats", effects: { money: -10, morale: -5 } }
    ]
  },
  {
    title: "Kind Stranger Shares Food",
    text: "An elderly woman across the aisle notices your tired faces. She unwraps a cloth bundle of bread, cheese, and dried fruit. 'Eat, children. You have a long journey ahead.'",
    weight: 3,
    terrain: ["city"],
    effects: { food: 10, morale: 10 }
  },
  {
    title: "Border Inspection",
    text: "Guards board the train at the border crossing. They check papers and search bags. The tension in the carriage is thick.",
    weight: 2,
    terrain: ["city"],
    choices: [
      { text: "Present your papers calmly", effects: { morale: -3 } },
      { text: "Offer a small bribe to speed things up", effects: { money: -15, morale: 5 } },
      { text: "Hide in the luggage compartment", effects: { health: -5, morale: -10 } }
    ]
  },
  {
    title: "Scenic Mountain Pass",
    text: "The train winds through a breathtaking Alpine pass. Snow-capped peaks tower above and the valley drops away below. Even the most worried passengers pause to admire the view.",
    weight: 3,
    terrain: ["city"],
    effects: { morale: 15, historicalKnowledge: 1 }
  },

  // === PALESTINE-SPECIFIC EVENTS ===
  {
    title: "Malaria Strikes",
    text: "The swamps near the coastal plain breed mosquitoes, and malaria spreads through the group. Fevers rise and chills wrack the party.",
    weight: 2,
    terrain: ["farmland", "settlement"],
    choices: [
      { text: "Use medicine to treat the fever", effects: { medicine: -1, health: 10, morale: 5 } },
      { text: "Rest for two days and drink boiled water", effects: { day: 2, health: 5, water: -10 } },
      { text: "Push through — we can't afford to stop", effects: { health: -15, morale: -10 } }
    ]
  },
  {
    title: "Bedouin Caravan Encounter",
    text: "A Bedouin caravan crosses your path. Their camels are loaded with goods. The leader approaches and offers to trade.",
    weight: 3,
    terrain: ["farmland", "mountain", "settlement"],
    choices: [
      { text: "Trade supplies for fresh water and dates", effects: { food: 10, water: 10, tools: -1, morale: 5 } },
      { text: "Share a meal and hear their stories", effects: { food: -5, morale: 12, historicalKnowledge: 2 } },
      { text: "Politely decline and continue", effects: {} }
    ]
  },
  {
    title: "Ottoman Patrol",
    text: "An Ottoman patrol stops your group on the road. The soldiers demand to see your travel permits. Jewish immigrants are closely watched.",
    weight: 2,
    terrain: ["farmland", "mountain", "settlement"],
    choices: [
      { text: "Show your papers and cooperate", effects: { day: 1, morale: -5 } },
      { text: "Offer a small payment to speed things up", effects: { money: -2, morale: 3 } },
      { text: "Have your leader negotiate firmly", effects: { morale: 5, historicalKnowledge: 1 } }
    ]
  },
  {
    title: "Ancient Ruins Discovered",
    text: "Your path leads past the ruins of an ancient settlement — crumbling walls, a broken mosaic floor, and fragments of pottery. This land has been home to many peoples.",
    weight: 3,
    terrain: ["farmland", "mountain"],
    choices: [
      { text: "Explore carefully and learn from the ruins", effects: { morale: 10, historicalKnowledge: 3 } },
      { text: "Search for anything useful among the stones", effects: { tools: 1, food: 5, historicalKnowledge: 1 } },
      { text: "Rest in the shade of the old walls", effects: { health: 5, morale: 5 } }
    ]
  },
  {
    title: "Water Well Dispute",
    text: "You arrive at a well to find a group of local farmers arguing with settlers over water rights. Tensions are high in the midday heat.",
    weight: 2,
    terrain: ["farmland", "settlement"],
    choices: [
      { text: "Help mediate between the groups", effects: { morale: 10, historicalKnowledge: 2, water: 5 } },
      { text: "Wait until they finish, then draw water", effects: { day: 1, water: 10, morale: -3 } },
      { text: "Find another water source nearby", effects: { health: -5, water: 5 } }
    ]
  },
  {
    title: "Pilgrims on the Road",
    text: "A group of Christian pilgrims from Greece travels the same road. They carry crosses and sing hymns. Their leader notices your group and approaches.",
    weight: 3,
    terrain: ["mountain"],
    choices: [
      { text: "Walk together and share stories of faith", effects: { morale: 15, historicalKnowledge: 2, food: 5 } },
      { text: "Share your provisions with them", effects: { food: -10, morale: 10, historicalKnowledge: 1 } },
      { text: "Wish them well and continue on your way", effects: { morale: 5 } }
    ]
  },
  {
    title: "Sudden Dust Storm",
    text: "A wall of dust sweeps across the Judean hills. Visibility drops to nothing. Your party huddles together against the stinging sand.",
    weight: 2,
    terrain: ["farmland", "mountain"],
    choices: [
      { text: "Take shelter and wait it out", effects: { day: 1, food: -5 } },
      { text: "Cover supplies and push through slowly", effects: { health: -8, morale: -5 } },
      { text: "Use clothing to protect faces and keep moving", effects: { clothing: -1, health: -3 } }
    ]
  },

  // === RESOURCE-BASED HELP EVENTS ===
  // TOOLS
  {
    title: "Broken Cart on the Road",
    text: "A family's cart has lost a wheel. Their belongings are scattered across the road. The father looks desperate — his children are crying.",
    weight: 3,
    terrain: ["road", "farmland", "mountain", "settlement"],
    choices: [
      { text: "Use your tools to fix their cart", effects: { tools: -1, morale: 15, money: 10, historicalKnowledge: 1 } },
      { text: "Walk past — we need our tools", effects: { morale: -10 } }
    ]
  },
  {
    title: "Settler's Roof Collapsed",
    text: "A settler's home has a collapsed roof after a storm. He begs passing travelers for help. Without shelter, his family will freeze tonight.",
    weight: 2,
    terrain: ["settlement", "farmland"],
    choices: [
      { text: "Help rebuild using your tools", effects: { tools: -1, morale: 20, food: 15, historicalKnowledge: 1 } },
      { text: "Offer encouragement but keep moving", effects: { morale: -8 } }
    ]
  },

  // FOOD
  {
    title: "Starving Family by the Road",
    text: "A gaunt woman sits by the trail with two small children. Their eyes are hollow. She whispers, 'Please... my children haven't eaten in three days.'",
    weight: 3,
    terrain: ["road", "farmland", "mountain", "settlement"],
    choices: [
      { text: "Share food with them", effects: { food: -20, morale: 20, historicalKnowledge: 1 } },
      { text: "Give them a small portion", effects: { food: -8, morale: 8 } },
      { text: "We barely have enough for ourselves", effects: { morale: -12 } }
    ]
  },
  {
    title: "Fellow Immigrants Without Provisions",
    text: "A group of Jewish immigrants from Romania stumbles into your camp. They were robbed on the road and have nothing left to eat.",
    weight: 2,
    terrain: ["road", "port", "city"],
    choices: [
      { text: "Cook a meal for everyone to share", effects: { food: -25, morale: 18, historicalKnowledge: 2 } },
      { text: "Spare what little you can", effects: { food: -10, morale: 10 } },
      { text: "Direct them to the nearest town", effects: { morale: -8 } }
    ]
  },

  // MEDICINE
  {
    title: "Sick Child in a Village",
    text: "A desperate mother runs to your party. Her daughter is burning with fever. 'The doctor is two days away. Do you have any medicine? Please!'",
    weight: 3,
    terrain: ["road", "farmland", "settlement", "mountain"],
    choices: [
      { text: "Give her medicine and stay to help", effects: { medicine: -1, morale: 20, money: 8, historicalKnowledge: 1 } },
      { text: "Give medicine but keep moving", effects: { medicine: -1, morale: 12 } },
      { text: "We can't spare our medicine", effects: { morale: -12 } }
    ]
  },
  {
    title: "Cholera in a Nearby Settlement",
    text: "A settler rushes toward you on the road. 'Cholera has struck our village! Do you carry any medicine? People are dying!'",
    weight: 2,
    terrain: ["settlement", "farmland"],
    choices: [
      { text: "Give medicine and help treat the sick", effects: { medicine: -2, morale: 25, health: -5, historicalKnowledge: 2 } },
      { text: "Give what you can spare", effects: { medicine: -1, morale: 12 } },
      { text: "Stay away — we can't risk infection", effects: { morale: -10, health: 5 } }
    ]
  },

  // CLOTHING
  {
    title: "Freezing Travelers on the Mountain Pass",
    text: "On a freezing mountain trail, you find a couple huddled together, shivering violently. Their clothes are torn and soaked. They won't survive the night like this.",
    weight: 2,
    terrain: ["road", "mountain"],
    choices: [
      { text: "Give them warm clothing", effects: { clothing: -2, morale: 18, historicalKnowledge: 1 } },
      { text: "Share one set of spare clothing", effects: { clothing: -1, morale: 10 } },
      { text: "We can't afford to lose our clothing", effects: { morale: -10 } }
    ]
  },
  {
    title: "Orphans in Tattered Rags",
    text: "Three Jewish orphans approach your party. Their clothes are barely holding together. The eldest, no more than twelve, asks if you have anything to spare.",
    weight: 2,
    terrain: ["city", "port", "settlement", "road"],
    choices: [
      { text: "Give them clothing and food", effects: { clothing: -1, food: -10, morale: 20, historicalKnowledge: 1 } },
      { text: "Give them clothing only", effects: { clothing: -1, morale: 12 } },
      { text: "We have nothing to spare", effects: { morale: -10 } }
    ]
  },

  // WATER
  {
    title: "Dehydrated Traveler Collapsed on the Trail",
    text: "A man lies face-down on the trail, barely conscious. His lips are cracked and his waterskin is bone dry. He croaks, 'Water... please...'",
    weight: 3,
    terrain: ["road", "farmland", "mountain", "settlement"],
    choices: [
      { text: "Give him water and help him recover", effects: { water: -8, morale: 15, money: 5, historicalKnowledge: 1 } },
      { text: "Give him a sip and move on", effects: { water: -3, morale: 8 } },
      { text: "We need every drop we have", effects: { morale: -12 } }
    ]
  },
  {
    title: "Dry Well at a Settlement",
    text: "A small settlement's well has run dry. Families gather around the empty hole with despair in their eyes. They see your water containers and hope flickers on their faces.",
    weight: 2,
    terrain: ["settlement", "farmland"],
    choices: [
      { text: "Share your water supply generously", effects: { water: -15, morale: 22, food: 10, historicalKnowledge: 1 } },
      { text: "Share a small amount", effects: { water: -6, morale: 10 } },
      { text: "Apologize — we need this to survive", effects: { morale: -10 } }
    ]
  },

  // MULTI-RESOURCE
  {
    title: "Ambushed Caravan Needs Help",
    text: "You come across a merchant caravan that was attacked by bandits. The merchants are injured, their goods scattered. They beg for any help you can offer.",
    weight: 2,
    terrain: ["road", "mountain", "farmland"],
    choices: [
      { text: "Help fully — medicine, tools, food", effects: { medicine: -1, tools: -1, food: -10, morale: 25, money: 30, historicalKnowledge: 2 } },
      { text: "Offer food and basic first aid", effects: { food: -10, morale: 15, money: 10 } },
      { text: "It's too dangerous — move on quickly", effects: { morale: -8 } }
    ]
  },
  {
    title: "Pioneer Family Starting a New Settlement",
    text: "A young family is trying to build a homestead from nothing. They have land but no tools, barely any food, and not enough water. They ask if you can help them get started.",
    weight: 2,
    terrain: ["settlement", "farmland"],
    choices: [
      { text: "Give tools, food, and water to help them build", effects: { tools: -1, food: -15, water: -8, morale: 25, historicalKnowledge: 2 } },
      { text: "Share some food and advice", effects: { food: -8, morale: 12, historicalKnowledge: 1 } },
      { text: "Wish them well but keep your supplies", effects: { morale: -8 } }
    ]
  }
];

// Make available globally
window.ZionistH = window.ZionistH || {};
window.ZionistH.EventManager = EventManager;
