/* eslint-disable no-undef */
// PartySelection.js - Enhanced party selection system with character-specific companions

class PartySelection {
  constructor(gameInstance, storyConfig) {
    this.game = gameInstance;
    this.storyConfig = storyConfig;
    this.selectedProfession = null;
    this.availableCandidates = [];
    this.selectedCompanions = [];
    this.maxSelections = 5;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Warsaw family scene continue button
    const continueToPartyBtn = document.getElementById('continue-to-party-selection');
    if (continueToPartyBtn) {
      continueToPartyBtn.addEventListener('click', () => this.showEnhancedPartySelection());
    }

    // Party selection confirmation
    const confirmPartyBtn = document.getElementById('confirm-party-selection');
    if (confirmPartyBtn) {
      confirmPartyBtn.addEventListener('click', () => this.confirmPartySelection());
    }

    // CRITICAL FIX: Set up modal event listeners
    this.setupModalEventListeners();
  }

  setupModalEventListeners() {
    // Modal close button
    const modalCloseBtn = document.querySelector('#candidate-details-modal .modal-close-btn');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => this.closeCandidateModal());
    }

    // Modal select button - event listener will be managed dynamically
    const modalSelectBtn = document.getElementById('modal-select-btn');
    if (modalSelectBtn) {
      modalSelectBtn.addEventListener('click', () => this.selectCandidateFromModal());
    }

    // Close modal when clicking outside content
    const modal = document.getElementById('candidate-details-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeCandidateModal();
        }
      });
    }
  }

  closeCandidateModal() {
    const modal = document.getElementById('candidate-details-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  selectCandidateFromModal() {
    if (this.currentModalCandidate !== undefined) {
      // Toggle selection
      this.toggleCandidateSelection(this.currentModalCandidate);
      
      // Update modal button state
      this.updateModalSelectButton();
      
      // Update the visual state of the card in the background
      const candidateEl = document.querySelector(`.party-candidate[data-candidate-index="${this.currentModalCandidate}"]`);
      const candidate = this.availableCandidates[this.currentModalCandidate];
      const isSelected = this.selectedCompanions.includes(candidate);
      
      if (candidateEl) {
        if (isSelected) {
          candidateEl.classList.add('selected');
        } else {
          candidateEl.classList.remove('selected');
        }
      }

      // Close the modal
      this.closeCandidateModal();
    }
  }

  // Show party selection for all characters (no family scene here)
  showFamilyScene(profession) {
    this.selectedProfession = profession;
    
    // Always go directly to party selection for all characters
    this.showEnhancedPartySelection();
  }

  // Show the enhanced party selection interface
  showEnhancedPartySelection() {
    console.log('🎭 Showing enhanced party selection for:', this.selectedProfession);
    
    // Hide previous screens
    this.game.ui.hideOverlay('character-selection');
    this.game.ui.hideOverlay('warsaw-family-scene');
    
    // Load character-specific candidates
    this.loadCandidatesForCharacter(this.selectedProfession);
    
    // Update UI title
    this.updateSelectionTitle();
    
    // Render candidates
    this.renderCandidates();
    
    // Show the enhanced party selection screen
    this.game.ui.showOverlay('enhanced-party-selection');
  }

  loadCandidatesForCharacter(profession) {
    const characterPools = this.storyConfig.partyMembers.characterSpecificPools;
    
    if (characterPools && characterPools[profession]) {
      // Use character-specific pool
      this.availableCandidates = [...characterPools[profession]];
      console.log(`📋 Loaded ${this.availableCandidates.length} candidates for ${profession}`);
    } else {
      // Fallback to general templates with thematic selection
      this.availableCandidates = this.generateThematicCandidates(profession);
      console.log(`📋 Generated ${this.availableCandidates.length} thematic candidates for ${profession}`);
    }
    
    // Reset selection state
    this.selectedCompanions = [];
    this.updateSelectionStatus();
  }

  generateThematicCandidates(profession) {
    // For characters without specific pools, create thematic companions
    const templates = this.storyConfig.partyMembers.templates;
    const thematicCandidates = [];
    
    // This would be expanded with full thematic groups for each character
    // For now, using the existing templates as a base
    templates.forEach((template, index) => {
      if (index < 6) { // Limit to 6 candidates
        thematicCandidates.push({
          ...template,
          relation: this.getThematicRelation(profession, template.profession),
          specialAbility: this.generateSpecialAbility(template.profession),
          portrait: this.getPortraitForProfession(template.profession),
          familyMember: false
        });
      }
    });
    
    return thematicCandidates;
  }

  getThematicRelation(mainProfession, companionProfession) {
    const relations = {
      'INTELLECTUAL': { 'Teacher': 'Colleague', 'Carpenter': 'Friend', 'Farmer': 'Student' },
      'CRAFTSMAN': { 'Carpenter': 'Fellow Craftsman', 'Farmer': 'Client', 'Teacher': 'Friend' },
      'MERCHANT': { 'Merchant': 'Business Partner', 'Farmer': 'Supplier', 'Teacher': 'Customer' },
      'RELIGIOUS_SCHOLAR': { 'Teacher': 'Fellow Scholar', 'Farmer': 'Congregant', 'Carpenter': 'Community Member' },
      'FORMER_FARMER': { 'Farmer': 'Fellow Farmer', 'Carpenter': 'Neighbor', 'Teacher': 'Student' },
      'NURSE': { 'Nurse': 'Colleague', 'Teacher': 'Friend', 'Farmer': 'Patient' },
      'TEACHER': { 'Teacher': 'Fellow Educator', 'Farmer': 'Student', 'Carpenter': 'Friend' }
    };
    
    return relations[mainProfession]?.[companionProfession] || 'Companion';
  }

  generateSpecialAbility(profession) {
    const abilities = {
      'Carpenter': { name: 'Master Builder', description: 'Can repair tools and build shelters', power: 3, drawback: 'Stubborn temperament, lowers morale during disputes' },
      'Teacher': { name: 'Inspiring Leader', description: 'Boosts group morale and prevents departures', power: 4, drawback: 'Physically frail, tires easily on long marches' },
      'Farmer': { name: 'Expert Forager', description: 'Always finds food when foraging', power: 4, drawback: 'Homesick for the land, may become despondent' },
      'Nurse': { name: 'Miracle Healer', description: 'Can cure diseases that would be fatal', power: 5, drawback: 'Uses extra medicine and supplies when treating others' },
      'Merchant': { name: 'Master Trader', description: 'Gets better prices and finds rare items', power: 3, drawback: 'Sometimes takes risky deals that can backfire' },
      'Scholar': { name: 'Hebrew Revival', description: 'Teaches Hebrew and boosts education, improving morale', power: 4, drawback: 'Impractical in survival situations, needs others to protect her' }
    };
    
    return abilities[profession] || { name: 'Lucky Charm', description: 'Brings good fortune to the group', power: 2, drawback: 'Unpredictable, luck can turn at the worst moment' };
  }

  getPortraitForProfession(profession) {
    const portraits = {
      'Carpenter': 'images/charcter-portraits-yaakov-the-builder.png',
      'Teacher': 'images/character-portraits-miriam-goldstein.png',
      'Farmer': 'images/charcter-portraits-avraham-farmer.png',
      'Nurse': 'images/character-portraits-sofie-stern.png',
      'Merchant': 'images/character-portraits-morechai-goldberg-merchant.png',
      'Scholar': 'images/character-portraits-miriam-goldstein.png',
      'Family Elder': 'images/grandmother.png',
      'Retired Craftsman': 'images/grandfather.png',
      'Family Protector': 'images/father.png',
      'Family Caretaker': 'images/mother.png',
      'Community Helper': 'images/iris.png',
      'Resourceful Scrounger': 'images/chaim.png'
    };
    
    return portraits[profession] || 'images/charcter-portraits-rabbi-shmuel.png';
  }

  // Get family member portrait image
  getFamilyPortraitImage(memberName) {
    return ZionistH.getFamilyPortraitImage(memberName);
  }

  // Check if candidate is a family member
  isFamilyMember(candidate) {
    const familyNames = [
      'Hannah Rubinstein', 'Tzvika Rubinstein', 
      'Jeremy Hoover', 'Tali Hoover',
      'Iris Goldstein', 'Chaim Goldstein'
    ];
    
    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    return familyNames.includes(fullName);
  }

  // Get family relationship badge
  getFamilyBadge(candidate) {
    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    const familyBadges = {
      'Hannah Rubinstein': 'Family',
      'Tzvika Rubinstein': 'Family',
      'Jeremy Hoover': 'Family',
      'Tali Hoover': 'Family',
      'Iris Goldstein': 'Neighbor',
      'Chaim Goldstein': 'Neighbor'
    };
    
    return familyBadges[fullName] || '';
  }

  updateSelectionTitle() {
    const titleEl = document.getElementById('party-selection-title');
    if (titleEl) {
      if (this.selectedProfession === 'CHILD') {
        titleEl.textContent = 'Choose Mia\'s Travel Companions';
      } else {
        titleEl.textContent = 'Choose Your Traveling Companions';
      }
    }
  }

  renderCandidates() {
    const container = document.getElementById('party-candidates');
    if (!container) return;

    container.innerHTML = '';

    this.availableCandidates.forEach((candidate, index) => {
      const candidateEl = this.createCandidateElement(candidate, index);
      container.appendChild(candidateEl);
    });
  }

  createCandidateElement(candidate, index) {
    const div = document.createElement('div');
    div.className = 'party-candidate';
    div.dataset.candidateIndex = index;

    // Check if this is a family member
    const isFamily = this.isFamilyMember(candidate);
    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    const familyPortraitImage = this.getFamilyPortraitImage(fullName);
    const familyBadge = this.getFamilyBadge(candidate);

    // Family member styling for Mia's family
    if (isFamily) {
      div.classList.add('family-member-candidate');
    }

    // Create portrait content
    let portraitContent;
    if (familyPortraitImage) {
      portraitContent = `<img src="${familyPortraitImage}" alt="${fullName}" />`;
    } else {
      const portraitSrc = candidate.portrait || this.getPortraitForProfession(candidate.profession);
      portraitContent = `<img src="${portraitSrc}" alt="${fullName}" />`;
    }

    // Create family badge if applicable
    const badgeHtml = familyBadge ? `<div class="family-badge">${familyBadge}</div>` : '';

    div.innerHTML = `
      <div class="selection-counter">${this.selectedCompanions.length + 1}</div>
      ${badgeHtml}
      <div class="candidate-portrait has-image">${portraitContent}</div>
      <div class="candidate-name">${candidate.firstName} ${candidate.lastName}</div>
      <div class="candidate-relation">${candidate.relation || 'Companion'}</div>
      <div class="candidate-backstory">${candidate.backstory.endsWith('.') ? candidate.backstory : candidate.backstory + '.'}</div>
      <div class="special-ability">
        <div class="ability-title">${candidate.specialAbility.name}</div>
        <div class="ability-desc">${candidate.specialAbility.description}.</div>
        ${candidate.specialAbility.drawback ? `<div class="ability-drawback">${candidate.specialAbility.drawback}.</div>` : ''}
      </div>
      <div class="candidate-details-btn" data-candidate-index="${index}">
        Details
      </div>
    `;

    // Add click handler for selection (main card)
    div.addEventListener('click', (e) => this.handleCandidateClick(e, index));
    
    // Add separate click handler for details button
    const detailsBtn = div.querySelector('.candidate-details-btn');
    if (detailsBtn) {
      detailsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent main card click
        this.showCandidateModal(index);
      });
    }

    return div;
  }

  addSkillsTooltip(element, candidate) {
    const tooltip = document.createElement('div');
    tooltip.className = 'candidate-tooltip';
    
    const skillsHtml = Object.entries(candidate.skills)
      .map(([skill, level]) => `
        <div class="skill-item">
          <span>${skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
          <span class="skill-level">${'★'.repeat(level)}${'☆'.repeat(5 - level)}</span>
        </div>
      `).join('');

    tooltip.innerHTML = `
      <div class="tooltip-skills">
        <strong>Skills:</strong>
        ${skillsHtml}
      </div>
      <div style="margin-top: 1rem;">
        <strong>Goal:</strong> ${candidate.goal}
      </div>
    `;

    element.appendChild(tooltip);
  }

  toggleCandidateSelection(candidateIndex) {
    const candidate = this.availableCandidates[candidateIndex];
    const candidateEl = document.querySelector(`.party-candidate[data-candidate-index="${candidateIndex}"]`);
    
    if (!candidateEl) return;

    const isSelected = candidateEl.classList.contains('selected');
    
    if (isSelected) {
      // Deselect
      candidateEl.classList.remove('selected');
      this.selectedCompanions = this.selectedCompanions.filter(c => c !== candidate);
    } else {
      // Select (if not at max)
      if (this.selectedCompanions.length < this.maxSelections) {
        candidateEl.classList.add('selected');
        this.selectedCompanions.push(candidate);
      } else {
        // Show message about max selections
        this.game.ui.logMessage(`You can only select ${this.maxSelections} companions`, 'warning');
        return;
      }
    }

    this.updateSelectionStatus();
    this.updateConfirmButton();
  }

  updateSelectionStatus() {
    const statusEl = document.getElementById('selection-status');
    if (statusEl) {
      const remaining = this.maxSelections - this.selectedCompanions.length;
      if (remaining > 0) {
        statusEl.textContent = `Select ${remaining} more companions (${this.selectedCompanions.length}/${this.maxSelections} chosen)`;
        statusEl.style.color = 'var(--text-accent)';
      } else {
        statusEl.textContent = `All companions selected! (${this.maxSelections}/${this.maxSelections})`;
        statusEl.style.color = 'var(--health-good)';
      }
    }
  }

  updateConfirmButton() {
    const confirmBtn = document.getElementById('confirm-party-selection');
    if (confirmBtn) {
      const canConfirm = this.selectedCompanions.length === this.maxSelections;
      confirmBtn.disabled = !canConfirm;
      
      if (canConfirm) {
        confirmBtn.textContent = 'Continue with Selected Companions';
      } else {
        confirmBtn.textContent = `Select ${this.maxSelections - this.selectedCompanions.length} More Companions`;
      }
    }
  }

  confirmPartySelection() {
    if (this.selectedCompanions.length !== this.maxSelections) {
      this.game.ui.logMessage(`Please select exactly ${this.maxSelections} companions`, 'warning');
      return;
    }

    console.log('✅ Party selection confirmed:', this.selectedCompanions);

    // Apply selected companions to game state
    this.applyPartyToGameState();

    // Skip meet party screen — go directly to Warsaw farewell scene
    this.showWarsawFamilyScene();
  }

  applyPartyToGameState() {
    // Clear existing party members
    this.game.gameState.partyMembers = [];

    // Add selected companions to game state
    this.selectedCompanions.forEach((companion, index) => {
      const partyMember = {
        ...companion,
        id: index,
        fullName: `${companion.firstName} ${companion.lastName}`,
        health: 100,
        morale: 60,
        energy: 100,
        isAlive: true,
        isDiseased: false,
        diseaseType: null,
        status: 'healthy',
        isLeader: index === 0,
        specialAbilityUsed: false,
        statusEffects: [],
        lastIllnessDay: 0
      };
      
      this.game.gameState.partyMembers.push(partyMember);
    });

    console.log('🎉 Applied party members to game state:', this.game.gameState.partyMembers);
  }

  showMeetPartyScreen() {
    // Update the meet party display with selected companions
    this.updateMeetPartyDisplay();
    
    // Set up continue button event listener
    this.setupMeetPartyEventListeners();
    
    // Hide party selection and show meet party
    this.game.ui.hideOverlay('enhanced-party-selection');
    this.game.ui.showOverlay('meet-party');
  }

  setupMeetPartyEventListeners() {
    // Set up continue to supplies button
    const continueBtn = document.getElementById('continue-to-supplies');
    if (continueBtn) {
      // Remove any existing event listeners
      const newBtn = continueBtn.cloneNode(true);
      continueBtn.parentNode.replaceChild(newBtn, continueBtn);
      
      // Add the proper event listener - go to Warsaw family scene
      newBtn.addEventListener('click', () => {
        console.log('🏠 Continue to Warsaw family scene button clicked');
        this.showWarsawFamilyScene();
      });
      
      console.log('✅ Meet Party continue button event listener set up');
    } else {
      console.warn('⚠️ continue-to-supplies button not found');
    }
  }

  updateMeetPartyDisplay() {
    this.selectedCompanions.forEach((companion, index) => {
      const nameEl = document.getElementById(`member${index + 1}-name`);
      const professionEl = document.getElementById(`member${index + 1}-profession`);
      
      if (nameEl) nameEl.textContent = `${companion.firstName} ${companion.lastName}`;
      if (professionEl) {
        if (companion.relation && companion.familyMember) {
          professionEl.textContent = `${companion.relation} - ${companion.profession}`;
        } else {
          professionEl.textContent = companion.profession;
        }
      }

      // ENHANCED: Update party member portraits with actual selected companions
      const portraitEl = document.querySelector(`#meet-party .party-member:nth-child(${index + 1}) .member-portrait`);
      if (portraitEl) {
        const fullName = `${companion.firstName} ${companion.lastName}`;
        const familyPortraitImage = this.getFamilyPortraitImage(fullName);
        
        // Clear existing classes
        portraitEl.className = 'member-portrait';
        
        if (familyPortraitImage) {
          // Use actual family portrait image
          portraitEl.innerHTML = `<img src="${familyPortraitImage}" alt="${fullName}" class="member-portrait-img" />`;
          portraitEl.classList.add('has-portrait-image');
        } else {
          // Use profession-based portrait image
          const professionImg = this.getPortraitForProfession(companion.profession);
          portraitEl.innerHTML = `<img src="${professionImg}" alt="${fullName}" class="member-portrait-img" />`;
          portraitEl.classList.add('has-portrait-image');
        }
      }
    });

    // Update the main travel party image to reflect selection
    this.updateTravelPartyImage();
  }

  // Update travel party image based on selected companions
  updateTravelPartyImage() {
    const partyImageEl = document.getElementById('party-image');
    if (!partyImageEl) return;

    // Determine party composition for image selection
    const familyMembers = this.selectedCompanions.filter(c => this.isFamilyMember(c));
    const hasFamilyMembers = familyMembers.length > 0;
    
    // Choose appropriate travel party image based on composition
    let imagePath = 'images/travel-party-palestine.png'; // Default
    
    if (hasFamilyMembers && familyMembers.length >= 3) {
      // Large family group
      imagePath = 'images/travel-party-hills.png';
    } else if (hasFamilyMembers) {
      // Some family members
      imagePath = 'images/travel-party-sea.png';
    } else {
      // Non-family companions
      imagePath = 'images/travel-party-train.png';
    }

    // Update the image source
    partyImageEl.src = imagePath;
    
    // Add descriptive alt text based on selection
    const companionNames = this.selectedCompanions.map(c => `${c.firstName} ${c.lastName}`).join(', ');
    partyImageEl.alt = `Travel party: ${companionNames}`;
    
    console.log(`🖼️ Updated travel party image to: ${imagePath}`);
    console.log(`👥 Party composition: ${this.selectedCompanions.length} companions (${familyMembers.length} family members)`);
  }

  // Create expanded content for candidate cards
  createExpandedContent(candidate) {
    const skillsGrid = Object.entries(candidate.skills)
      .map(([skill, level]) => `
        <div class="expanded-skill-item">
          <div class="expanded-skill-name">${skill.charAt(0).toUpperCase() + skill.slice(1)}</div>
          <div class="expanded-skill-level">${'★'.repeat(level)}${'☆'.repeat(5 - level)}</div>
          <div class="expanded-skill-description">${this.getSkillDescription(skill, level)}</div>
        </div>
      `).join('');

    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    const isFamily = this.isFamilyMember(candidate);
    const relationships = this.getRelationshipInfo(candidate, isFamily);

    return `
      <div class="candidate-expanded-content">
        <div class="collapse-hint">×</div>
        
        <div class="expanded-skills-section">
          <h4>🛠️ Skills & Abilities</h4>
          <div class="expanded-skills-grid">
            ${skillsGrid}
          </div>
        </div>

        <div class="expanded-background-section">
          <h4>📖 Background Story</h4>
          <div class="expanded-background-text">
            ${this.getExpandedBackstory(candidate)}
          </div>
        </div>

        <div class="expanded-goal-section">
          <h4>🎯 Personal Goal</h4>
          <div class="expanded-goal-text">
            ${candidate.goal}
          </div>
        </div>

        ${relationships ? `
          <div class="expanded-relationships-section">
            <h4>👥 Relationships</h4>
            ${relationships}
          </div>
        ` : ''}
      </div>
    `;
  }

  getSkillDescription(skill, level) {
    const descriptions = {
      farming: {
        1: 'Basic knowledge of crops',
        2: 'Can identify good soil',
        3: 'Experienced farmer',
        4: 'Master agriculturalist',
        5: 'Legendary farming expertise'
      },
      trading: {
        1: 'Basic bartering skills',
        2: 'Can spot fair deals',
        3: 'Skilled negotiator',
        4: 'Master merchant',
        5: 'Legendary trader'
      },
      medicine: {
        1: 'Basic first aid',
        2: 'Can treat minor wounds',
        3: 'Skilled healer',
        4: 'Master physician',
        5: 'Miracle worker'
      },
      leadership: {
        1: 'Natural charisma',
        2: 'Can motivate others',
        3: 'Inspiring leader',
        4: 'Master commander',
        5: 'Legendary inspiration'
      },
      crafting: {
        1: 'Basic tool use',
        2: 'Can make simple repairs',
        3: 'Skilled craftsman',
        4: 'Master builder',
        5: 'Legendary artisan'
      }
    };

    return descriptions[skill]?.[level] || `Level ${level} ${skill} expertise`;
  }

  getExpandedBackstory(candidate) {
    // Enhanced backstories for better immersion
    const backstories = {
      'Hannah Rubinstein': 'Grandmother Hannah has lived through pogroms in Russia and seen her family scattered across Europe. Her wisdom comes from years of preserving Jewish traditions in the face of persecution. She carries the family\'s most precious heirlooms and knows ancient remedies passed down through generations.',
      'Tzvika Rubinstein': 'Grandfather Tzvika was once a prosperous grain merchant in Minsk before anti-Jewish laws destroyed his business. He has extensive knowledge of trade routes and speaks multiple languages, making him invaluable for negotiating passage and supplies during the journey.',
      'Jeremy Hoover': 'Papa Jeremy worked as a skilled carpenter in Warsaw but dreamed of building something permanent in Eretz Yisrael. He has been secretly learning Hebrew and studying agricultural techniques, preparing for the day when the family could have their own land.',
      'Tali Hoover': 'Mama Tali was a midwife in the Jewish quarter, helping bring new life into a world of uncertainty. Her medical knowledge and calm demeanor make her the family\'s anchor during crises. She carries a collection of medicinal herbs and birthing tools.',
      'Iris Goldstein': 'Iris has been the Hoover family\'s neighbor for years, helping during difficult times. As a teacher in the underground Hebrew schools, she risked arrest daily to preserve Jewish culture. Her connections in the Zionist movement helped arrange this journey.',
      'Chaim Goldstein': 'Chaim is known throughout the neighborhood for his ability to find anything - legal or otherwise. His network of contacts and knowledge of back-alley deals has kept many families fed during the worst times. He\'s promised to help secure passage and supplies.'
    };

    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    return backstories[fullName] || candidate.backstory || 'A brave pioneer seeking a new life in Eretz Yisrael.';
  }

  getRelationshipInfo(candidate, isFamily) {
    if (!isFamily) return null;

    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    const relationships = {
      'Hannah Rubinstein': [
        { icon: '👴', text: 'Married to Tzvika for 45 years' },
        { icon: '👨', text: 'Jeremy is her beloved son-in-law' },
        { icon: '👧', text: 'Adores little Mia, her only grandchild' }
      ],
      'Tzvika Rubinstein': [
        { icon: '👵', text: 'Hannah\'s devoted husband' },
        { icon: '👩', text: 'Protective of daughter Tali' },
        { icon: '👧', text: 'Teaching Mia Hebrew and family history' }
      ],
      'Jeremy Hoover': [
        { icon: '👩', text: 'Deeply in love with wife Tali' },
        { icon: '👧', text: 'Devoted father to Mia' },
        { icon: '👵👴', text: 'Respects and cares for Tali\'s parents' }
      ],
      'Tali Hoover': [
        { icon: '👨', text: 'Jeremy\'s loving wife and partner' },
        { icon: '👧', text: 'Mia\'s protective mother' },
        { icon: '👵👴', text: 'Eldest daughter of Hannah and Tzvika' }
      ],
      'Iris Goldstein': [
        { icon: '👨‍👩‍👧', text: 'Close family friend of the Hoovers' },
        { icon: '👥', text: 'Married to Chaim Goldstein' },
        { icon: '📚', text: 'Taught Hebrew to the children' }
      ],
      'Chaim Goldstein': [
        { icon: '👩‍🏫', text: 'Iris\'s husband and partner' },
        { icon: '🤝', text: 'Jeremy\'s business associate' },
        { icon: '👥', text: 'Neighborhood protector and provider' }
      ]
    };

    const relationshipList = relationships[fullName];
    if (!relationshipList) return null;

    return relationshipList.map(rel => `
      <div class="relationship-item">
        <div class="relationship-icon">${rel.icon}</div>
        <div class="relationship-text">${rel.text}</div>
      </div>
    `).join('');
  }

  handleCandidateClick(event, candidateIndex) {
    // Check if the click target is the details button
    if (event.target.classList.contains('candidate-details-btn')) {
      // Details button was clicked, but we handle this separately
      return;
    }
    
    // Main card click - select/deselect the candidate
    this.toggleCandidateSelection(candidateIndex);
    console.log(`🖱️ Toggled selection for candidate ${candidateIndex}`);
  }

  showCandidateModal(candidateIndex) {
    const candidate = this.availableCandidates[candidateIndex];
    if (!candidate) return;

    // Store current candidate for modal actions
    this.currentModalCandidate = candidateIndex;

    // Populate modal content
    this.populateModalContent(candidate);

    // Show the modal
    const modal = document.getElementById('candidate-details-modal');
    if (modal) {
      modal.classList.add('active');
    }
  }

  populateModalContent(candidate) {
    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    const isFamily = this.isFamilyMember(candidate);
    const familyPortraitImage = this.getFamilyPortraitImage(fullName);
    const familyBadge = this.getFamilyBadge(candidate);

    // Update modal header
    document.getElementById('modal-candidate-name').textContent = fullName;
    document.getElementById('modal-candidate-relation').textContent = candidate.relation || 'Companion';
    
    // Update special ability
    document.getElementById('modal-ability-name').textContent = candidate.specialAbility.name;
    document.getElementById('modal-ability-description').textContent = candidate.specialAbility.description;
    if (candidate.specialAbility.drawback) {
      document.getElementById('modal-ability-description').innerHTML += `<br><em>${candidate.specialAbility.drawback}</em>`;
    }

    // Update portrait
    const portraitEl = document.getElementById('modal-candidate-portrait');
    if (familyPortraitImage) {
      portraitEl.className = 'modal-portrait has-image';
      portraitEl.innerHTML = `<img src="${familyPortraitImage}" alt="${fullName}" />`;
    } else {
      const portraitSrc = candidate.portrait || this.getPortraitForProfession(candidate.profession);
      portraitEl.className = 'modal-portrait has-image';
      portraitEl.innerHTML = `<img src="${portraitSrc}" alt="${fullName}" />`;
    }

    // Update family badge
    const badgeEl = document.getElementById('modal-family-badge');
    if (familyBadge) {
      badgeEl.textContent = familyBadge;
      badgeEl.style.display = 'block';
    } else {
      badgeEl.style.display = 'none';
    }

    // Update backstory
    document.getElementById('modal-backstory').textContent = this.getExpandedBackstory(candidate);

    // Update skills
    this.populateModalSkills(candidate);

    // Update goal
    document.getElementById('modal-goal').textContent = candidate.goal;

    // Update relationships (for family members)
    this.populateModalRelationships(candidate, isFamily);

    // Update select button state
    this.updateModalSelectButton();
  }

  populateModalSkills(candidate) {
    const skillsContainer = document.getElementById('modal-skills-grid');
    if (!skillsContainer) return;

    const skillsHtml = Object.entries(candidate.skills)
      .map(([skill, level]) => `
        <div class="modal-skill-item">
          <div class="modal-skill-name">${skill.charAt(0).toUpperCase() + skill.slice(1)}</div>
          <div class="modal-skill-level">${'★'.repeat(level)}${'☆'.repeat(5 - level)}</div>
          <div class="modal-skill-description">${this.getSkillDescription(skill, level)}</div>
        </div>
      `).join('');

    skillsContainer.innerHTML = skillsHtml;
  }

  populateModalRelationships(candidate, isFamily) {
    const relationshipsSection = document.getElementById('modal-relationships-section');
    const relationshipsContainer = document.getElementById('modal-relationships');
    
    if (!isFamily) {
      relationshipsSection.style.display = 'none';
      return;
    }

    const fullName = `${candidate.firstName} ${candidate.lastName}`;
    const relationships = this.getRelationshipInfo(candidate, isFamily);
    
    if (relationships) {
      relationshipsSection.style.display = 'block';
      relationshipsContainer.innerHTML = relationships.replace(/relationship-item/g, 'modal-relationship-item')
                                                     .replace(/relationship-icon/g, 'modal-relationship-icon')
                                                     .replace(/relationship-text/g, 'modal-relationship-text');
    } else {
      relationshipsSection.style.display = 'none';
    }
  }

  updateModalSelectButton() {
    const selectBtn = document.getElementById('modal-select-btn');
    if (!selectBtn) return;

    const candidate = this.availableCandidates[this.currentModalCandidate];
    const isSelected = this.selectedCompanions.includes(candidate);
    const canSelect = this.selectedCompanions.length < this.maxSelections;

    if (isSelected) {
      selectBtn.textContent = 'Remove from Party';
      selectBtn.className = 'retro-btn secondary';
    } else if (canSelect) {
      selectBtn.textContent = 'Select This Companion';
      selectBtn.className = 'retro-btn primary';
    } else {
      selectBtn.textContent = 'Party Full';
      selectBtn.className = 'retro-btn';
      selectBtn.disabled = true;
      return;
    }
    
    selectBtn.disabled = false;
  }

  // Show personalized Warsaw scene after party selection
  showPersonalizedWarsawScene() {
    // Personalize the Warsaw scene content based on selected character and party
    this.personalizeWarsawContent();
    
    // Hide party selection and show Warsaw scene
    this.game.ui.hideOverlay('enhanced-party-selection');
    this.game.ui.showOverlay('warsaw-family-scene');
    
    // Update the continue button to go to supplies instead of party selection
    this.setupWarsawSceneContinue();
  }

  personalizeWarsawContent() {
    // Get profession display name
    const professionNames = {
      'INTELLECTUAL': 'an intellectual and writer',
      'CRAFTSMAN': 'a skilled craftsman', 
      'MERCHANT': 'a merchant',
      'RELIGIOUS_SCHOLAR': 'a religious scholar',
      'FORMER_FARMER': 'a former farmer',
      'NURSE': 'a nurse',
      'TEACHER': 'a teacher'
    };
    
    const professionName = professionNames[this.selectedProfession] || 'a pioneer';
    
    // Update the scene title
    const titleEl = document.querySelector('#warsaw-family-scene h2');
    if (titleEl) {
      titleEl.textContent = 'Farewell to Warsaw - 1909';
    }
    
    // Replace the family portraits section with selected companions
    const familyPortraitsSection = document.querySelector('#warsaw-family-scene .family-portraits-section');
    if (familyPortraitsSection) {
      // Create dynamic companions grid
      const companionsGrid = this.selectedCompanions.map(companion => {
        const fullName = `${companion.firstName} ${companion.lastName}`;
        const familyPortraitImage = this.getFamilyPortraitImage(fullName);
        
        const portraitHtml = familyPortraitImage 
          ? `<img src="${familyPortraitImage}" alt="${fullName}" />`
          : `<img src="${companion.portrait || this.getPortraitForProfession(companion.profession)}" alt="${fullName}" />`;
        
        return `
          <div class="family-member">
            <div class="family-portrait">
              ${portraitHtml}
            </div>
            <h4>${fullName}</h4>
            <p>${companion.relation || 'Companion'}</p>
          </div>
        `;
      }).join('');
      
      familyPortraitsSection.innerHTML = `
        <div class="family-portraits-grid">
          ${companionsGrid}
        </div>
      `;
    }
    
    // Update the main narrative text
    const narrativeEl = document.querySelector('#warsaw-family-scene .story-text');
    if (narrativeEl) {
      narrativeEl.innerHTML = `
        <p><strong>Warsaw, Poland - 1909</strong></p>
        <p>As ${professionName}, you have made the difficult decision to leave everything behind and journey to Eretz Yisrael (the Land of Israel). The pogroms and persecution have made life unbearable for Jews in the Russian Empire.</p>
        <p>You have carefully chosen five trusted companions who will join you on this perilous journey. Each brings unique skills and unwavering determination to reach the Promised Land:</p>
        <div class="companion-summary">
          ${this.selectedCompanions.map(companion => 
            `<div class="companion-item">
              <div class="companion-header">
                <strong>${companion.firstName} ${companion.lastName}</strong> <span style="color:var(--text-secondary);">${companion.profession}</span>
              </div>
              <div class="companion-ability">
                <em>${companion.specialAbility.name}:</em> ${companion.specialAbility.description}
              </div>
            </div>`
          ).join('')}
        </div>
        <p>Together, you will travel from Warsaw to the ports, then by ship across the Mediterranean Sea, and finally overland to establish a new settlement in the Promised Land. The journey will be long and dangerous, but your dream of a new life drives you forward.</p>
        <p>Your neighbors and remaining family gather to bid you farewell, some weeping, others blessing your courage. The train whistle sounds in the distance - it's time to begin your journey to Zion.</p>
      `;
    }
  }

  setupWarsawSceneContinue() {
    // Update the continue button to go to supply purchase
    const continueBtn = document.getElementById('continue-to-party-selection');
    if (continueBtn) {
      continueBtn.textContent = 'Purchase Supplies for the Journey';
      
      // Remove old event listeners and add new one
      const newBtn = continueBtn.cloneNode(true);
      continueBtn.parentNode.replaceChild(newBtn, continueBtn);
      
      newBtn.addEventListener('click', () => {
        console.log('🛒 Going to supply purchase');
        this.game.ui.hideOverlay('warsaw-family-scene');
        this.game.showInitialSupplies();
      });
      
      console.log('✅ Warsaw scene continue button set up');
    }
  }

  // Show Warsaw family scene directly after party selection
  showWarsawFamilyScene() {
    console.log('🏠 Showing Warsaw family scene');
    
    // Hide party selection and meet party screens
    this.game.ui.hideOverlay('meet-party');
    this.game.ui.hideOverlay('enhanced-party-selection');
    
    // Show Warsaw family scene
    this.game.ui.showOverlay('warsaw-family-scene');
    
    // Update the Warsaw scene content with selected companions
    this.personalizeWarsawContent();
    
    // Set up the continue button to go to supplies
    this.setupWarsawSceneContinue();
  }

  // Set up mini-game event listeners
  setupMiniGameListeners() {
    console.log('🎮 Setting up mini-game event listeners');
    
    // Find all mini-game trigger buttons
    const miniGameTriggers = document.querySelectorAll('.minigame-trigger');
    
    miniGameTriggers.forEach(trigger => {
      const gameType = trigger.dataset.minigame;
      if (gameType) {
        // Remove existing listeners and add new ones
        const newTrigger = trigger.cloneNode(true);
        trigger.parentNode.replaceChild(newTrigger, trigger);
        
        newTrigger.addEventListener('click', () => {
          console.log(`🎯 Mini-game trigger clicked: ${gameType}`);
          if (this.game.visualOverlayManager) {
            this.game.visualOverlayManager.showMiniGame(gameType);
          } else {
            console.error('❌ Visual Overlay Manager not available');
          }
        });
        
        console.log(`✅ Event listener set up for mini-game: ${gameType}`);
      }
    });
  }

  // Navigation helper
  goBackToPartySelection() {
    this.game.ui.hideOverlay('meet-party');
    this.game.ui.showOverlay('enhanced-party-selection');
  }
}

// Make available globally
window.ZionistH = window.ZionistH || {};
window.ZionistH.PartySelection = PartySelection;

// Navigation function for back button
function goBackToPartySelection() {
  if (window.ZionistH && window.ZionistH.gameInstance && window.ZionistH.gameInstance.partySelection) {
    window.ZionistH.gameInstance.partySelection.goBackToPartySelection();
  }
}

window.goBackToPartySelection = goBackToPartySelection;
