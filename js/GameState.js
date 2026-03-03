/* eslint-disable no-undef */
// GameState.js - Manages all game state data

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // Basic game progress
    this.day = 1;
    this.currentDate = new Date(1909, 2, 15); // March 15, 1909
    this.currentLocation = 'warsaw';
    this.destinationLocation = 'jerusalem';
    this.gameActive = true;
    this.gameWon = false;
    this.selectedProfession = null;
    
    // Player resources
    this.money = 0;
    this.inventory = {
      food: 0,
      water: 0,
      tools: 0,
      medicine: 0,
      clothing: 0
    };
    
    // Party management
    this.partyMembers = [];
    this.partyLeader = null;
    
    // Health and morale
    this.groupHealth = 100;
    this.groupMorale = 50;
    this.pace = ZionistH.PACE_NORMAL;
    this.rations = ZionistH.RATIONS_FILLING;
    
    // Environmental conditions
    this.weather = 'fair';
    this.season = this.calculateSeason();
    this.temperature = 'moderate';
    
    // Progress tracking
    this.distanceTraveled = 0;
    this.totalDistance = 3270; // km from Warsaw to Jerusalem via route
    this.travelSpeed = 0; // km per day
    this.segmentDistance = 0; // distance traveled within current segment
    this._storyConfig = null; // cached reference for distance lookups
    
    // Currency system
    this.currency = 'rubles'; // 'rubles' in Europe, 'lira' in Palestine

    // Game flags and achievements
    this.flags = {};
    this.achievements = [];
    this.reputation = 0;
    this.historicalKnowledge = 0;
    this.score = 0;
    
    // Event system
    this.lastEventDay = 0;
    this.eventCooldown = 0;
    
    // Daily consumption rates (per person per day)
    this.dailyConsumption = {
      food: 1.5, // lbs per person per day
      water: 1,  // gallons per person per day
      baseCost: 0.5 // money cost per day
    };
  }

  // Profession and party setup
  setProfession(professionKey, storyConfig) {
    this.selectedProfession = professionKey;
    this._storyConfig = storyConfig; // cache for distance lookups
    const profession = storyConfig.professions[professionKey];
    
    if (profession) {
      this.money = profession.startingMoney;
      this.inventory = { ...this.inventory, ...profession.startingSupplies };
      this.skills = { ...profession.skills };
      this.scoreMultiplier = profession.scoreMultiplier;
    }
  }

  // Calculate daily travel distance based on pace, health, weather, terrain
  calculateDailyTravel() {
    const baseMilesPerDay = 50; // Base travel speed in km/day
    const paceMultiplier = this.getPaceMultiplier();
    const healthMultiplier = Math.max(0.3, this.groupHealth / 100);
    let weatherMultiplier = 1.0;
    if (this.weather === 'stormy') weatherMultiplier = 0.4;
    else if (this.weather === 'hot') weatherMultiplier = 0.75;
    else if (this.weather === 'cold') weatherMultiplier = 0.85;

    // Terrain difficulty from current location
    let terrainMultiplier = 1.0;
    const loc = this.getCurrentLocation(this._storyConfig);
    if (loc && loc.difficulty) {
      terrainMultiplier = Math.max(0.5, 1.0 - (loc.difficulty - 1) * 0.1);
    }

    // Train speed boost for European rail segments
    const trainSegments = ['warsaw', 'krakow', 'vienna'];
    const trainBoost = trainSegments.includes(this.currentLocation) ? 1.5 : 1.0;

    // Ship speed boost for sea segments (steamship is faster than walking, but weather-dependent)
    const seaSegments = ['trieste', 'mediterranean'];
    const shipBoost = seaSegments.includes(this.currentLocation) ? 1.6 : 1.0;

    return Math.max(10, Math.round(baseMilesPerDay * paceMultiplier * healthMultiplier * weatherMultiplier * terrainMultiplier * trainBoost * shipBoost));
  }

  // Advance travel within the current segment. Returns next location key if arrived, null otherwise.
  advanceTravel(storyConfig) {
    const dailyKm = this.calculateDailyTravel();
    this.segmentDistance += dailyKm;
    this.distanceTraveled += dailyKm;

    const config = storyConfig || this._storyConfig;
    const loc = this.getCurrentLocation(config);
    console.log(`[TRAVEL] loc=${this.currentLocation} segDist=${Math.round(this.segmentDistance)} dist2next=${loc?.distanceToNext} dailyKm=${dailyKm} hasConfig=${!!config}`);
    if (loc && loc.distanceToNext && this.segmentDistance >= loc.distanceToNext) {
      // Arrived at next location
      this.segmentDistance = 0;
      if (loc.nextLocations && loc.nextLocations.length > 0) {
        console.log(`[TRAVEL] ARRIVED! Next: ${loc.nextLocations[0]}`);
        return loc.nextLocations[0];
      }
    }
    return null;
  }

  createPartyMember(template, isLeader = false) {
    const member = {
      id: this.partyMembers.length,
      firstName: template.firstName,
      lastName: template.lastName,
      fullName: `${template.firstName} ${template.lastName}`,
      profession: template.profession,
      personality: template.personality,
      backstory: template.backstory,
      goal: template.goal,
      skills: { ...template.skills },
      
      // Individual stats
      health: 100,
      morale: 60,
      energy: 100,
      isAlive: true,
      isDiseased: false,
      diseaseType: null,
      
      // Status effects
      statusEffects: [],
      lastIllnessDay: 0,
      
      // Experience and growth
      experience: 0,
      skillGrowth: {}
    };
    
    if (isLeader) {
      this.partyLeader = member;
    }
    
    this.partyMembers.push(member);
    return member;
  }

  // Location and travel management
  getCurrentLocation(storyConfig) {
    if (storyConfig) {
      return storyConfig.locations[this.currentLocation];
    }
    // Fallback for calls without storyConfig
    return {
      name: this.currentLocation || 'Warsaw, Poland',
      description: 'Your current location',
      shops: []
    };
  }

  getCurrencyName() {
    return this.currency === 'lira' ? 'lira' : 'rubles';
  }

  convertToLira() {
    if (this.currency === 'lira') return; // already converted
    const rate = 10; // 10 rubles = 1 Ottoman lira
    const oldAmount = this.money;
    this.money = Math.max(1, Math.round(this.money / rate));
    this.currency = 'lira';
    return { oldAmount, newAmount: this.money, rate };
  }

  canTravelTo(locationKey, storyConfig) {
    const currentLoc = this.getCurrentLocation(storyConfig);
    return currentLoc && currentLoc.nextLocations.includes(locationKey);
  }

  travelTo(locationKey, storyConfig) {
    if (this.canTravelTo(locationKey, storyConfig)) {
      this.currentLocation = locationKey;
      const newLocation = this.getCurrentLocation(storyConfig);
      
      // Update progress
      this.distanceTraveled += this.calculateTravelDistance(locationKey);
      
      // Check if reached destination
      if (newLocation && newLocation.isDestination) {
        this.gameWon = true;
        this.gameActive = false;
      }
      
      return newLocation;
    }
    return null;
  }

  calculateTravelDistance(toLocationKey) {
    // Read actual distance from the current location's distanceToNext
    const currentLoc = this.getCurrentLocation(this._storyConfig);
    if (currentLoc && currentLoc.distanceToNext) {
      return currentLoc.distanceToNext;
    }
    return 100; // fallback
  }

  // Daily progression and resource management
  advanceDay() {
    this.day++;
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.season = this.calculateSeason();
    this.consumeResources();
    this.updateHealthAndMorale();
    this.updateWeather();
    this.checkForRandomEvents();
  }

  consumeResources() {
    const partySize = this.getAlivePartyMembers().length;
    const paceMultiplier = this.getPaceMultiplier();
    const seasonMultiplier = this.getSeasonMultiplier();
    
    // Food consumption
    const trainSegments = ['warsaw', 'krakow', 'vienna'];
    const trainReduction = trainSegments.includes(this.currentLocation) ? 0.7 : 1.0;
    const foodNeeded = Math.ceil(
      this.dailyConsumption.food * partySize * paceMultiplier * seasonMultiplier * trainReduction
    );
    this.inventory.food = Math.max(0, this.inventory.food - foodNeeded);
    
    // Water consumption
    const waterNeeded = Math.ceil(
      this.dailyConsumption.water * partySize * paceMultiplier * seasonMultiplier
    );
    this.inventory.water = Math.max(0, this.inventory.water - waterNeeded);
    
    // Money costs (lodging, tolls, etc.)
    const moneyCost = Math.ceil(
      this.dailyConsumption.baseCost * partySize * paceMultiplier
    );
    this.money = Math.max(0, this.money - moneyCost);
    
    // Tool wear
    if (Math.random() < 0.05 * paceMultiplier) {
      this.inventory.tools = Math.max(0, this.inventory.tools - 1);
    }
  }

  updateHealthAndMorale() {
    // Calculate health effects
    let healthChange = 0;
    let moraleChange = 0;
    
    // Food effects
    if (this.inventory.food <= 0) {
      healthChange -= 15;
      moraleChange -= 10;
    } else if (this.rations === ZionistH.RATIONS_BARE) {
      healthChange -= 5;
      moraleChange -= 3;
    } else if (this.rations === ZionistH.RATIONS_FILLING) {
      healthChange += 2;
      moraleChange += 1;
    }
    
    // Water effects
    if (this.inventory.water <= 0) {
      healthChange -= 20;
      moraleChange -= 15;
    }
    
    // Pace effects
    if (this.pace === ZionistH.PACE_FAST) {
      healthChange -= 3;
      moraleChange -= 2;
    } else if (this.pace === ZionistH.PACE_SLOW) {
      healthChange += 1;
      moraleChange += 1;
    }
    
    // Weather effects
    if (this.weather === 'stormy' || this.weather === 'hot') {
      healthChange -= 5;
      moraleChange -= 3;
    }

    // Cold weather penalty without clothing
    if ((this.weather === 'cold' || this.weather === 'stormy') && this.inventory.clothing <= 0) {
      healthChange -= 5;
      moraleChange -= 4;
    }
    // Clothing wears out in bad weather (10% chance per day)
    if ((this.weather === 'cold' || this.weather === 'stormy') && this.inventory.clothing > 0 && Math.random() < 0.1) {
      this.inventory.clothing--;
    }
    
    // Apply changes
    this.groupHealth = Math.max(0, Math.min(100, this.groupHealth + healthChange));
    this.groupMorale = Math.max(0, Math.min(100, this.groupMorale + moraleChange));
    
    // Update individual party members
    this.partyMembers.forEach(member => {
      if (member.isAlive) {
        member.health = Math.max(0, Math.min(100, member.health + healthChange));
        member.morale = Math.max(0, Math.min(100, member.morale + moraleChange));

        // Sick members get worse each day without medicine (-3 HP)
        if (member.isDiseased) {
          member.health = Math.max(0, member.health - 3);
          // Small natural recovery chance (5% per day if health > 50)
          if (member.health > 50 && Math.random() < 0.05) {
            member.isDiseased = false;
            member.diseaseType = null;
          }
        }
        
        // Check for death
        if (member.health <= 0) {
          member.isAlive = false;
          this.logDeath(member);
        }
        
        // Check for illness
        if (member.health < 30 && Math.random() < 0.1) {
          this.applyIllness(member);
        }
      }
    });
  }

  // Utility methods
  setPace(newPace) {
    this.pace = newPace;
  }

  getPaceMultiplier() {
    switch (this.pace) {
      case ZionistH.PACE_SLOW: return 0.7;
      case ZionistH.PACE_FAST: return 1.4;
      default: return 1.0;
    }
  }

  // UI compatibility methods
  getHealthStatus() {
    if (this.groupHealth >= 80) return 'Excellent';
    if (this.groupHealth >= 60) return 'Good';
    if (this.groupHealth >= 40) return 'Fair';
    if (this.groupHealth >= 20) return 'Poor';
    return 'Very Poor';
  }

  getMoraleStatus() {
    if (this.groupMorale >= 80) return 'High';
    if (this.groupMorale >= 60) return 'Good';
    if (this.groupMorale >= 40) return 'Fair';
    if (this.groupMorale >= 20) return 'Low';
    return 'Very Low';
  }

  // Alias properties for UI compatibility
  get food() { return this.inventory.food; }
  set food(value) { this.inventory.food = value; }
  
  get water() { return this.inventory.water; }
  set water(value) { this.inventory.water = value; }
  
  get tools() { return this.inventory.tools; }
  set tools(value) { this.inventory.tools = value; }
  
  get medicine() { return this.inventory.medicine; }
  set medicine(value) { this.inventory.medicine = value; }
  
  get pioneers() { return this.getAlivePartyMembers().length; }
  set pioneers(value) {
    // Apply damage by killing weakest members until alive count <= value
    const alive = this.getAlivePartyMembers();
    let toKill = alive.length - Math.max(0, value);
    if (toKill > 0) {
      const sorted = [...alive].sort((a, b) => a.health - b.health);
      for (let i = 0; i < toKill && i < sorted.length; i++) {
        sorted[i].isAlive = false;
        sorted[i].health = 0;
        this.logDeath(sorted[i]);
      }
    }
  }
  
  get health() { return this.groupHealth; }
  set health(value) { this.groupHealth = value; }
  
  get morale() { return this.groupMorale; }
  set morale(value) { this.groupMorale = value; }

  getSeasonMultiplier() {
    switch (this.season) {
      case ZionistH.SEASON_WINTER: return 1.3;
      case ZionistH.SEASON_SUMMER: return 1.2;
      default: return 1.0;
    }
  }

  getAlivePartyMembers() {
    return this.partyMembers.filter(member => member.isAlive);
  }

  getTotalPartySkill(skillName) {
    return this.getAlivePartyMembers().reduce((total, member) => {
      return total + ((member.skills && member.skills[skillName]) || 0);
    }, 0);
  }

  calculateSeason() {
    const month = this.currentDate.getMonth(); // 0=Jan, 11=Dec
    if (month >= 2 && month <= 4) return ZionistH.SEASON_SPRING;  // Mar-May
    if (month >= 5 && month <= 7) return ZionistH.SEASON_SUMMER;  // Jun-Aug
    if (month >= 8 && month <= 10) return ZionistH.SEASON_FALL;   // Sep-Nov
    return ZionistH.SEASON_WINTER;                                 // Dec-Feb
  }

  getFormattedDate() {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[this.currentDate.getMonth()]} ${this.currentDate.getDate()}, ${this.currentDate.getFullYear()}`;
  }

  getClimateZone() {
    const europeSegs = ['warsaw', 'krakow', 'vienna'];
    const seaSegs = ['trieste', 'mediterranean'];
    if (europeSegs.includes(this.currentLocation)) return 'continental';
    if (seaSegs.includes(this.currentLocation)) return 'maritime';
    return 'semiarid'; // Palestine
  }

  updateWeather() {
    const location = this.currentLocation;
    const weatherChances = this.getWeatherChances(location);
    const rand = Math.random();
    
    if (rand < weatherChances.stormy) {
      this.weather = 'stormy';
    } else if (rand < weatherChances.hot) {
      this.weather = 'hot';
    } else if (rand < weatherChances.cold) {
      this.weather = 'cold';
    } else {
      this.weather = 'fair';
    }
  }

  getWeatherChances(location) {
    const zone = this.getClimateZone();
    const month = this.currentDate.getMonth();

    // Continental (Europe: Warsaw→Vienna)
    if (zone === 'continental') {
      if (month >= 11 || month <= 1) return { stormy: 0.20, hot: 0.02, cold: 0.45 }; // Dec-Feb: harsh winter
      if (month >= 2 && month <= 4)  return { stormy: 0.15, hot: 0.05, cold: 0.20 }; // Mar-May: cool spring, rain
      if (month >= 5 && month <= 7)  return { stormy: 0.10, hot: 0.30, cold: 0.03 }; // Jun-Aug: warm summer
      return { stormy: 0.15, hot: 0.08, cold: 0.25 };                                 // Sep-Nov: cool autumn
    }

    // Maritime (Mediterranean Sea crossing)
    if (zone === 'maritime') {
      if (month >= 11 || month <= 2) return { stormy: 0.35, hot: 0.02, cold: 0.15 }; // Winter: rough seas
      if (month >= 3 && month <= 5)  return { stormy: 0.15, hot: 0.10, cold: 0.05 }; // Spring: calmer
      if (month >= 6 && month <= 8)  return { stormy: 0.05, hot: 0.35, cold: 0.02 }; // Summer: calm & hot
      return { stormy: 0.20, hot: 0.10, cold: 0.10 };                                 // Autumn: storms return
    }

    // Semi-arid (Palestine: Jaffa→Jerusalem)
    if (month >= 11 || month <= 2) return { stormy: 0.20, hot: 0.05, cold: 0.15 }; // Rainy season, mild
    if (month >= 3 && month <= 4)  return { stormy: 0.10, hot: 0.20, cold: 0.05 }; // Spring: khamsin winds
    if (month >= 5 && month <= 9)  return { stormy: 0.03, hot: 0.50, cold: 0.01 }; // Summer: extreme heat
    return { stormy: 0.15, hot: 0.15, cold: 0.08 };                                 // Oct-Nov: transition
  }

  checkForRandomEvents() {
    if (this.eventCooldown > 0) {
      this.eventCooldown--;
      return false;
    }
    
    // Higher chance at sea (25%) vs land (15%)
    const seaSegments = ['trieste', 'mediterranean'];
    const chance = seaSegments.includes(this.currentLocation) ? 0.25 : 0.15;
    if (Math.random() < chance) {
      this.eventCooldown = 1; // 1-day cooldown (was 2)
      return true;
    }
    
    return false;
  }

  applyIllness(member) {
    if (member.isDiseased) return;
    
    const illnesses = ['fever', 'dysentery', 'exhaustion', 'injury'];
    const illness = illnesses[Math.floor(Math.random() * illnesses.length)];
    
    member.isDiseased = true;
    member.diseaseType = illness;
    member.health -= 20;
    member.morale -= 15;
    member.lastIllnessDay = this.day;
  }

  treatIllness(member, medicineUsed = 1) {
    if (!member.isDiseased || this.inventory.medicine < medicineUsed) {
      return false;
    }
    
    this.inventory.medicine -= medicineUsed;
    member.isDiseased = false;
    member.diseaseType = null;
    member.health += 15;
    member.morale += 10;
    
    return true;
  }

  logDeath(member) {
    member.deathDay = this.day;
    member.deathLocation = this.currentLocation;
    this.groupMorale = Math.max(0, this.groupMorale - 20);
    
    // Check for game over
    if (this.getAlivePartyMembers().length === 0) {
      this.gameActive = false;
    }
  }

  // Achievement tracking
  addAchievement(name) {
    if (!this.achievements.includes(name)) {
      this.achievements.push(name);
    }
  }

  checkAchievements() {
    if (this.gameWon) {
      this.addAchievement('Reached Jerusalem');
      if (this.getAlivePartyMembers().length === this.partyMembers.length) {
        this.addAchievement('Full Party Arrival');
      }
      if (this.day < 60) {
        this.addAchievement('Swift Journey');
      }
      if (this.groupHealth >= 80) {
        this.addAchievement('Healthy Arrival');
      }
      if (this.historicalKnowledge >= 15) {
        this.addAchievement('Scholar of Zion');
      }
      if (this.money >= 200) {
        this.addAchievement('Wise Trader');
      }
    }
  }

  // Progress and scoring
  getProgressPercentage() {
    return Math.min(100, (this.distanceTraveled / this.totalDistance) * 100);
  }

  calculateScore() {
    let score = 0;
    
    // Base points for distance traveled
    score += this.distanceTraveled * 2;
    
    // Bonus for party members surviving
    score += this.getAlivePartyMembers().length * 100;
    
    // Health and morale bonuses
    score += this.groupHealth;
    score += this.groupMorale;
    
    // Resource management
    score += this.money * 0.5;
    score += Object.values(this.inventory).reduce((sum, val) => sum + val, 0);
    
    // Achievements and knowledge
    score += this.achievements.length * 50;
    score += this.historicalKnowledge * 10;
    
    // Profession multiplier
    score *= this.scoreMultiplier || 1.0;
    
    // Time efficiency bonus
    if (this.day < 100) {
      score *= 1.2;
    }
    
    this.score = Math.round(score);
    return this.score;
  }

  // Save/load functionality
  saveToLocalStorage() {
    const saveData = {
      day: this.day,
      currentDate: this.currentDate.toISOString(),
      currentLocation: this.currentLocation,
      selectedProfession: this.selectedProfession,
      money: this.money,
      inventory: this.inventory,
      partyMembers: this.partyMembers,
      groupHealth: this.groupHealth,
      groupMorale: this.groupMorale,
      pace: this.pace,
      rations: this.rations,
      distanceTraveled: this.distanceTraveled,
      segmentDistance: this.segmentDistance,
      flags: this.flags,
      achievements: this.achievements,
      reputation: this.reputation,
      historicalKnowledge: this.historicalKnowledge,
      score: this.score,
      currency: this.currency,
      gameWon: this.gameWon,
      gameActive: this.gameActive
    };
    
    localStorage.setItem('zionistTrailSave', JSON.stringify(saveData));
  }

  loadFromLocalStorage() {
    const saveData = localStorage.getItem('zionistTrailSave');
    if (saveData) {
      try {
        const data = JSON.parse(saveData);
        // Restore Date object from ISO string
        if (data.currentDate) {
          data.currentDate = new Date(data.currentDate);
        } else {
          // Legacy save without date — reconstruct from day count
          const d = new Date(1909, 2, 15);
          d.setDate(d.getDate() + (data.day || 1) - 1);
          data.currentDate = d;
        }
        Object.assign(this, data);
        this.season = this.calculateSeason();
        return true;
      } catch (e) {
        console.error('Failed to load save data:', e);
      }
    }
    return false;
  }

  clearSave() {
    localStorage.removeItem('zionistTrailSave');
  }
}

// Make it available globally
window.ZionistH = window.ZionistH || {};
window.ZionistH.GameState = GameState;
