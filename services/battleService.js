// battleService.js - Handles battle mechanics and monster generation

export const battleService = {
  async generateMonster(appContext, monsterType = null) {
    appContext.showDialog = true;
    appContext.dialogQueue = ["* Encountering monster..."];
    appContext.showNextDialog();
    
    try {
      // Get monster data based on type or generate randomly
      const monsterData = monsterType 
        ? await this.getSpecificMonster(monsterType, appContext)
        : await this.requestMonsterFromLLM(appContext);
      
      // Generate monster sprite
      let spriteUrl;
      try {
        spriteUrl = await this.generateMonsterSprite(monsterData.description);
      } catch (spriteError) {
        console.error("Error generating sprite:", spriteError);
        spriteUrl = null;
      }
      
      // Set up dialog with fallbacks
      const safeDialog = this.prepareSafeDialog(monsterData);
      
      // Create the monster with validated data
      appContext.currentMonster = {
        name: monsterData.name || "Mystery Monster",
        hp: monsterData.hp || 20,
        maxHp: monsterData.hp || 20,
        attack: monsterData.attack || 2,
        defense: monsterData.defense || 1,
        spriteUrl: spriteUrl,
        canSpare: false,
        spareCondition: monsterData.spareCondition || "Complete certain actions",
        actions: Array.isArray(monsterData.actions) ? monsterData.actions : [
          { name: "Check", description: "See monster stats", effect: null }
        ],
        bulletPatterns: Array.isArray(monsterData.bulletPatterns) ? monsterData.bulletPatterns : [
          {
            name: "Default Pattern",
            description: "Simple bullets from top to bottom",
            difficulty: 2,
            bulletTypes: ["normal"],
            movements: "Straight down"
          }
        ],
        dialog: safeDialog,
        actCounter: {}
      };
      
      // Show introduction dialog
      this.showMonsterDialog(appContext, 'intro');
      
    } catch (error) {
      console.error("Error in generateMonster:", error);
      appContext.currentMonster = this.getFallbackMonster(appContext);
      this.showMonsterDialog(appContext, 'intro');
    }
  },
  
  prepareSafeDialog(monsterData) {
    // Ensure dialog structure exists with fallbacks
    const dialogData = monsterData.dialog || {};
    return {
      intro: Array.isArray(dialogData.intro) ? dialogData.intro : ["* A monster appears!"],
      fight: Array.isArray(dialogData.fight) ? dialogData.fight : ["* The monster looks determined."],
      act: dialogData.act || {},
      spare: Array.isArray(dialogData.spare) ? dialogData.spare : ["* The monster was spared."],
      defeat: Array.isArray(dialogData.defeat) ? dialogData.defeat : ["* The monster was defeated."]
    };
  },
  
  showMonsterDialog(appContext, type, actionName = null) {
    if (!appContext.currentMonster || !appContext.currentMonster.dialog) {
      console.error("Cannot show dialog - monster or dialog not initialized");
      appContext.showDialog = true;
      appContext.dialogQueue = ["* [An error occurred...]"];
      appContext.showNextDialog();
      return;
    }
    
    appContext.showDialog = true;
    appContext.dialogQueue = [];
    
    const dialog = appContext.currentMonster.dialog;
    
    switch (type) {
      case 'intro':
        appContext.dialogQueue = Array.isArray(dialog.intro) ? [...dialog.intro] : ["* You encountered the monster!"];
        break;
      case 'fight':
        appContext.dialogQueue = Array.isArray(dialog.fight) ? [...dialog.fight] : ["* The monster prepares to attack."];
        break;
      case 'act':
        if (actionName && dialog.act && dialog.act[actionName]) {
          appContext.dialogQueue = Array.isArray(dialog.act[actionName]) ? [...dialog.act[actionName]] : ["* Nothing happened."];
        } else {
          appContext.dialogQueue = ["* Nothing happened."];
        }
        break;
      case 'spare':
        appContext.dialogQueue = Array.isArray(dialog.spare) ? [...dialog.spare] : ["* You spared the monster."];
        break;
      case 'defeat':
        appContext.dialogQueue = Array.isArray(dialog.defeat) ? [...dialog.defeat] : ["* The monster was defeated."];
        break;
      default:
        appContext.dialogQueue = ["* [Unknown dialog type]"];
    }
    
    appContext.showNextDialog();
  },
  
  async requestMonsterFromLLM(appContext) {
    // Structure for requesting a monster from the LLM
    const prompt = {
      task: "generate_monster",
      playerLevel: appContext.player.lv,
      currentArea: appContext.currentArea ? appContext.currentArea.name : "Unknown",
      requestStructure: {
        name: "Monster name",
        description: "Detailed visual description for image generation",
        hp: "Monster HP value (number)",
        attack: "Attack value (number)",
        defense: "Defense value (number)",
        spareCondition: "What the player needs to do to spare this monster",
        actions: [
          { 
            name: "Action name (e.g., Check, Compliment)", 
            description: "What happens when this action is used",
            effect: "optional effect, e.g., increases spare chance"
          }
        ],
        bulletPatterns: [
          {
            name: "Pattern name",
            description: "How the pattern works and looks",
            difficulty: "1-10 scale",
            bulletTypes: ["normal", "blue", "orange"],
            movements: "Description of bullet movement patterns"
          }
        ],
        dialog: {
          intro: ["First meeting dialog line", "Second intro line"],
          fight: ["During fight dialog lines"],
          act: {
            "action1Name": ["Response to specific action"],
            "action2Name": ["Response to specific action"]
          },
          spare: ["Dialog when spared"],
          defeat: ["Dialog when defeated"]
        }
      }
    };
    
    try {
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an Undertale-style game content generator. Create unique, creative content in the style of Undertale. Always return complete JSON with all the requested fields."
          },
          {
            role: "user",
            content: JSON.stringify(prompt)
          }
        ],
        json: true
      });
      
      let monsterData;
      try {
        monsterData = JSON.parse(completion.content);
      } catch (parseError) {
        console.error("Error parsing LLM response:", parseError);
        // Return fallback monster data if parsing fails
        return this.getFallbackMonster(appContext);
      }
      
      // Validate that critical fields exist, use fallback if not
      if (!monsterData || !monsterData.name || !monsterData.description) {
        console.error("Invalid monster data from LLM");
        return this.getFallbackMonster(appContext);
      }
      
      return monsterData;
    } catch (error) {
      console.error("Error generating monster:", error);
      return this.getFallbackMonster(appContext);
    }
  },
  
  getSpecificMonster(monsterType, appContext) {
    // This would be used for scripted encounters or boss fights
    // For now, return a basic version of the requested monster
    const level = appContext.player.lv;
    
    switch (monsterType.toLowerCase()) {
      case 'flowey':
        return {
          name: "Flowey",
          description: "A small golden flower with a face. Its expression seems almost sinister.",
          hp: 30,
          attack: 4,
          defense: 0,
          spareCondition: "You cannot spare Flowey",
          actions: [
            { name: "Check", description: "See monster stats", effect: null },
            { name: "Talk", description: "Try to reason with Flowey", effect: null }
          ],
          bulletPatterns: [
            {
              name: "Friendliness Pellets",
              description: "Small white bullets that move in formation",
              difficulty: 3,
              bulletTypes: ["normal"],
              movements: "Arc patterns"
            }
          ],
          dialog: {
            intro: ["* Howdy! I'm FLOWEY!", "* FLOWEY the FLOWER!"],
            fight: ["* Hee hee hee...", "* DIE."],
            act: {
              "Check": ["* FLOWEY - ATK 4 DEF 0", "* The friendliest flower you'll ever meet."],
              "Talk": ["* Huh? You want to talk?", "* In this world, it's KILL or BE killed!"]
            },
            spare: ["* You can't spare me, idiot."],
            defeat: ["* You think you're really smart, don't you?"]
          }
        };
        
      case 'toriel':
        return {
          name: "Toriel",
          description: "A tall, motherly goat-like monster wearing a purple robe with a delta rune symbol.",
          hp: 80,
          attack: 6,
          defense: 2,
          spareCondition: "Repeatedly spare Toriel, or get her HP very low",
          actions: [
            { name: "Check", description: "See monster stats", effect: null },
            { name: "Talk", description: "Talk to Toriel", effect: null },
            { name: "Plead", description: "Beg Toriel to stop fighting", effect: "increases spare chance" },
          ],
          bulletPatterns: [
            {
              name: "Fire Magic",
              description: "Fireballs that avoid the center of the bullet box",
              difficulty: 5,
              bulletTypes: ["normal"],
              movements: "Curved paths"
            }
          ],
          dialog: {
            intro: ["* Toriel blocks the way!"],
            fight: ["* ...", "* Toriel looks through you."],
            act: {
              "Check": ["* TORIEL - ATK 6 DEF 2", "* Knows best for you."],
              "Talk": ["* You tried to think of something to say...", "* But you can't think of any conversation topics."],
              "Plead": ["* You pleaded with Toriel to stop fighting.", "* Toriel looks at you with a pained expression."]
            },
            spare: ["* I know you want to go home, but...", "* Please go upstairs now."],
            defeat: ["* You are stronger than I thought...", "* Listen to me, small one..."]
          }
        };
        
      default:
        return this.getFallbackMonster(appContext);
    }
  },
  
  getFallbackMonster(appContext) {
    // Fallback monster in case the LLM request fails
    const level = appContext.player.lv;
    return {
      name: "Fallback Monster",
      description: "A simple white monster with a friendly smile",
      hp: 20 * level,
      attack: 2 * level,
      defense: level,
      spareCondition: "Compliment three times",
      actions: [
        { name: "Check", description: "See monster stats", effect: null },
        { name: "Compliment", description: "Say something nice", effect: "increase spare chance" }
      ],
      bulletPatterns: [
        {
          name: "Basic Pattern",
          description: "Simple white bullets that move downward",
          difficulty: 2,
          bulletTypes: ["normal"],
          movements: "Straight down"
        }
      ],
      dialog: {
        intro: ["* A wild monster appears!"],
        fight: ["* Monster looks worried."],
        act: {
          "Check": ["* FALLBACK MONSTER - ATK " + (2 * level) + " DEF " + level],
          "Compliment": ["* You said something nice.", "* Monster seems happier."]
        },
        spare: ["* Thank you for sparing me!"],
        defeat: ["* Why..."]
      }
    };
  },
  
  async generateMonsterSprite(description) {
    try {
      const result = await websim.imageGen({
        prompt: `Undertale-style pixel art of ${description}. White background, simple design, front facing.`,
        aspect_ratio: "1:1"
      });
      
      return result.url;
    } catch (error) {
      console.error("Error generating sprite:", error);
      // Return a default SVG sprite
      return this.getFallbackSprite();
    }
  },
  
  getFallbackSprite() {
    // Simple SVG monster sprite as fallback
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="transparent"/>
        <circle cx="75" cy="75" r="50" fill="white" stroke="black" stroke-width="2"/>
        <circle cx="55" cy="65" r="8" fill="black"/>
        <circle cx="95" cy="65" r="8" fill="black"/>
        <path d="M55 95 Q75 115 95 95" stroke="black" stroke-width="3" fill="none"/>
      </svg>
    `)}`;
  },
  
  startFightAction(appContext) {
    appContext.battleState = 'fightAction';
    appContext.attackLinePosition = 0;
    appContext.attackDirection = 1;
    
    const attackInterval = setInterval(() => {
      appContext.attackLinePosition += 3 * appContext.attackDirection;
      
      if (appContext.attackLinePosition >= 100) {
        appContext.attackDirection = -1;
      } else if (appContext.attackLinePosition <= 0) {
        appContext.attackDirection = 1;
      }
    }, 16);
    
    const handleAttack = (e) => {
      if (e.key === 'z') {
        clearInterval(attackInterval);
        window.removeEventListener('keydown', handleAttack);
        
        // Calculate damage based on position
        const centerDistance = Math.abs(appContext.attackLinePosition - 50);
        let damageMultiplier = 1;
        
        if (centerDistance < 5) {
          damageMultiplier = 2; // Critical hit
        } else if (centerDistance < 15) {
          damageMultiplier = 1.5; // Good hit
        } else if (centerDistance < 25) {
          damageMultiplier = 1; // Normal hit
        } else {
          damageMultiplier = 0.5; // Bad hit
        }
        
        const damage = Math.floor(
          (appContext.player.lv * 4 + (appContext.player.equipment?.weapon?.atk || 0)) * 
          damageMultiplier
        );
        
        appContext.currentMonster.hp = Math.max(0, appContext.currentMonster.hp - damage);
        
        appContext.showDialog = true;
        
        if (damageMultiplier >= 2) {
          appContext.dialogQueue = [`* Critical hit! You deal ${damage} damage!`];
        } else if (damageMultiplier >= 1.5) {
          appContext.dialogQueue = [`* Good hit! You deal ${damage} damage!`];
        } else if (damageMultiplier >= 1) {
          appContext.dialogQueue = [`* You deal ${damage} damage.`];
        } else {
          appContext.dialogQueue = [`* Weak hit. You deal only ${damage} damage.`];
        }
        
        appContext.showNextDialog();
        
        if (appContext.currentMonster.hp <= 0) {
          this.showMonsterDialog(appContext, 'defeat');
          setTimeout(() => {
            this.endBattle(appContext, 'defeat');
          }, 2000);
        } else {
          setTimeout(() => {
            this.showMonsterDialog(appContext, 'fight');
            setTimeout(() => {
              this.startEnemyTurn(appContext);
            }, 2000);
          }, 2000);
        }
      }
    };
    
    window.addEventListener('keydown', handleAttack);
  },
  
  performAct(appContext, action) {
    // Track action counter for this specific act
    if (!appContext.currentMonster.actCounter[action.name]) {
      appContext.currentMonster.actCounter[action.name] = 1;
    } else {
      appContext.currentMonster.actCounter[action.name]++;
    }
    
    this.showMonsterDialog(appContext, 'act', action.name);
    
    // Handle special effects of actions
    if (action.effect === 'increase spare chance') {
      const requiredActCount = 3; // Default required count
      
      if (appContext.currentMonster.actCounter[action.name] >= requiredActCount) {
        appContext.currentMonster.canSpare = true;
      }
    }
    
    // Start enemy turn after dialog
    setTimeout(() => {
      if (appContext.dialogQueue.length === 0) {
        this.startEnemyTurn(appContext);
      }
    }, 2000);
  },
  
  performMercy(appContext, type) {
    if (type === 'spare' && appContext.currentMonster.canSpare) {
      this.showMonsterDialog(appContext, 'spare');
      setTimeout(() => {
        this.endBattle(appContext, 'spare');
      }, 2000);
    } else if (type === 'spare') {
      appContext.showDialog = true;
      appContext.dialogQueue = ["* You tried to spare the monster...", "* But it doesn't seem ready to be spared yet."];
      appContext.showNextDialog();
      
      setTimeout(() => {
        this.startEnemyTurn(appContext);
      }, 2000);
    } else if (type === 'flee') {
      // Chance to flee based on player's LV
      const fleeChance = 0.4 + (appContext.player.lv * 0.03);
      
      if (Math.random() < fleeChance) {
        appContext.showDialog = true;
        appContext.dialogQueue = ["* You ran away successfully."];
        appContext.showNextDialog();
        
        setTimeout(() => {
          this.endBattle(appContext, 'flee');
        }, 2000);
      } else {
        appContext.showDialog = true;
        appContext.dialogQueue = ["* Couldn't escape!"];
        appContext.showNextDialog();
        
        setTimeout(() => {
          this.startEnemyTurn(appContext);
        }, 2000);
      }
    }
  },
  
  startEnemyTurn(appContext) {
    appContext.battleState = 'bulletHell';
    appContext.showDialog = false;
    
    // Reset soul position to center of bullet hell area
    const bulletHellEl = document.querySelector('.bullet-hell');
    if (bulletHellEl) {
      const rect = bulletHellEl.getBoundingClientRect();
      appContext.soul.x = rect.width / 2 - 8; // Center the 16px soul
      appContext.soul.y = rect.height / 2 - 8;
    }
    
    appContext.bullets = [];
    
    // Select a random bullet pattern
    const pattern = this.selectBulletPattern(appContext);
    
    // Generate the bullet pattern
    this.generateBulletPattern(appContext, pattern);
    
    // End enemy turn after a set duration that scales with difficulty
    const difficulty = pattern.difficulty || 3;
    const bulletHellDuration = 3000 + (difficulty * 500); // 3-8 seconds based on difficulty
    
    appContext.bulletHellTimer = setTimeout(() => {
      this.clearBulletHell(appContext);
      appContext.battleState = 'menu';
      appContext.selectedAction = null;
    }, bulletHellDuration);
  },
  
  selectBulletPattern(appContext) {
    if (appContext.currentMonster.bulletPatterns && appContext.currentMonster.bulletPatterns.length > 0) {
      return appContext.currentMonster.bulletPatterns[
        Math.floor(Math.random() * appContext.currentMonster.bulletPatterns.length)
      ];
    }
    
    // Default pattern if none defined
    return {
      name: "Default Pattern",
      description: "Simple bullets from top to bottom",
      difficulty: 2,
      bulletTypes: ["normal"],
      movements: "Straight down"
    };
  },
  
  async generateBulletPattern(appContext, pattern) {
    // Request bullet pattern generation from LLM
    try {
      const prompt = {
        task: "generate_bullet_pattern",
        pattern: pattern,
        bulletHellWidth: 320,
        bulletHellHeight: 150,
        playerLevel: appContext.player.lv,
        requestStructure: {
          bullets: [
            {
              x: "starting x position",
              y: "starting y position",
              width: "bullet width",
              height: "bullet height",
              type: "normal/blue/orange",
              velocityX: "x velocity (can be negative)",
              velocityY: "y velocity (can be negative)",
              accelerationX: "optional x acceleration",
              accelerationY: "optional y acceleration"
            }
          ]
        }
      };
      
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an Undertale-style bullet hell pattern generator. Create patterns that are challenging but fair."
          },
          {
            role: "user",
            content: JSON.stringify(prompt)
          }
        ],
        json: true
      });
      
      let bulletData;
      try {
        bulletData = JSON.parse(completion.content);
        
        // Make sure bullets is an array
        if (!Array.isArray(bulletData.bullets)) {
          throw new Error("Bullets is not an array");
        }
        
        // Set up the bullet pattern
        appContext.bullets = bulletData.bullets.map(bullet => ({
          ...bullet,
          velocityX: bullet.velocityX || 0,
          velocityY: bullet.velocityY || 0,
          accelerationX: bullet.accelerationX || 0,
          accelerationY: bullet.accelerationY || 0
        }));
      } catch (error) {
        console.error("Error parsing bullet data:", error);
        this.generateDefaultBulletPattern(appContext, pattern.difficulty || 2);
      }
    } catch (error) {
      console.error("Error generating bullet pattern:", error);
      this.generateDefaultBulletPattern(appContext, pattern.difficulty || 2);
    }
    
    // Start bullet animation loop
    appContext.bulletHellAnimationId = requestAnimationFrame(() => this.updateBulletHell(appContext));
  },
  
  generateDefaultBulletPattern(appContext, difficulty) {
    // Create a simple pattern with bullets coming from the top
    const bulletCount = 5 + Math.floor(appContext.player.lv / 2) + Math.floor(difficulty);
    
    for (let i = 0; i < bulletCount; i++) {
      appContext.bullets.push({
        x: Math.random() * 300,
        y: -20,
        width: 10,
        height: 10,
        type: 'normal',
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: 1 + Math.random() * difficulty,
        accelerationX: 0,
        accelerationY: 0
      });
    }
  },
  
  updateBulletHell(appContext) {
    // Update soul position based on keyboard input
    const speed = appContext.soul.speed;
    
    if (appContext.keys.up) appContext.soul.y = Math.max(0, appContext.soul.y - speed);
    if (appContext.keys.down) appContext.soul.y = Math.min(134, appContext.soul.y + speed);
    if (appContext.keys.left) appContext.soul.x = Math.max(0, appContext.soul.x - speed);
    if (appContext.keys.right) appContext.soul.x = Math.min(304, appContext.soul.x + speed);
    
    // Update bullet positions
    appContext.bullets.forEach(bullet => {
      // Apply acceleration
      bullet.velocityX += bullet.accelerationX || 0;
      bullet.velocityY += bullet.accelerationY || 0;
      
      // Update position
      bullet.x += bullet.velocityX;
      bullet.y += bullet.velocityY;
      
      // Check collision with soul
      if (this.checkCollision(appContext, bullet)) {
        this.handleBulletCollision(appContext, bullet);
      }
    });
    
    // Remove bullets that are out of bounds
    appContext.bullets = appContext.bullets.filter(bullet => 
      bullet.x > -50 && bullet.x < 370 && 
      bullet.y > -50 && bullet.y < 200
    );
    
    // Continue the animation loop if battle state is still bulletHell
    if (appContext.battleState === 'bulletHell') {
      appContext.bulletHellAnimationId = requestAnimationFrame(() => this.updateBulletHell(appContext));
    }
  },
  
  checkCollision(appContext, bullet) {
    // Simple AABB collision detection
    return (
      appContext.soul.x < bullet.x + bullet.width &&
      appContext.soul.x + 16 > bullet.x &&
      appContext.soul.y < bullet.y + bullet.height &&
      appContext.soul.y + 16 > bullet.y
    );
  },
  
  handleBulletCollision(appContext, bullet) {
    // Special bullet type handling
    const isMoving = appContext.keys.up || appContext.keys.down || 
                     appContext.keys.left || appContext.keys.right;
                     
    // Blue bullets only hurt you if you're moving
    if (bullet.type === 'blue' && !isMoving) {
      return;
    }
    
    // Orange bullets only hurt you if you're NOT moving
    if (bullet.type === 'orange' && isMoving) {
      return;
    }
    
    // Apply damage, mitigated by defense
    const defense = appContext.player.equipment?.armor?.def || 0;
    const damage = Math.max(1, Math.floor(
      (appContext.currentMonster?.attack || 1) - (defense * 0.2)
    ));
    
    appContext.player.hp -= damage;
    
    // Flash the soul
    const soulEl = appContext.$refs.soulElement;
    if (soulEl) {
      soulEl.style.opacity = 0.5;
      setTimeout(() => {
        if (soulEl) { 
          soulEl.style.opacity = 1;
        }
      }, 100);
    }
    
    // Check for game over
    if (appContext.player.hp <= 0) {
      appContext.player.hp = 0;
      this.clearBulletHell(appContext);
      appContext.currentScreen = 'gameOver';
    }
  },
  
  clearBulletHell(appContext) {
    if (appContext.bulletHellTimer) {
      clearTimeout(appContext.bulletHellTimer);
      appContext.bulletHellTimer = null;
    }
    
    if (appContext.bulletHellAnimationId) {
      cancelAnimationFrame(appContext.bulletHellAnimationId);
      appContext.bulletHellAnimationId = null;
    }
  },
  
  endBattle(appContext, outcome) {
    this.clearBulletHell(appContext);
    
    switch (outcome) {
      case 'defeat':
        // Gain EXP and gold
        const expGain = appContext.currentMonster.maxHp;
        const goldGain = Math.floor(appContext.currentMonster.maxHp / 2);
        
        appContext.player.exp += expGain;
        appContext.player.gold += goldGain;
        appContext.stats.monstersDefeated++;
        
        // Add chance for item drop
        if (Math.random() < 0.3) {  // 30% chance for item drop
          const possibleItems = [
            { name: 'Monster Candy', type: 'heal', value: 10, description: 'Heals 10 HP. Has a distinct, non-licorice flavor.' },
            { name: 'Spider Donut', type: 'heal', value: 12, description: 'Heals 12 HP. A donut made with Spider Cider in the batter.' },
            { name: 'Tough Glove', type: 'equipment', equipType: 'weapon', value: 5, description: 'A worn pink leather glove. For five-fingered folk.' }
          ];
          
          const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
          appContext.player.inventory.push(item);
          
          appContext.dialogQueue.push(`* The monster dropped ${item.name}!`);
        }
        
        // Check for level up
        setTimeout(() => {
          appContext.showDialog = true;
          appContext.dialogQueue = [
            `* You defeated ${appContext.currentMonster.name}!`,
            `* You gained ${expGain} EXP and ${goldGain} gold.`
          ];
          appContext.showNextDialog();
          
          setTimeout(() => {
            const leveledUp = appContext.checkLevelUp();
            
            // Return to overworld after dialog
            setTimeout(() => {
              appContext.currentScreen = 'overworld';
            }, leveledUp ? 2000 : 1000);
          }, 2000);
        }, 1000);
        break;
        
      case 'spare':
        // Get gold but no EXP
        const mercyGold = Math.floor(appContext.currentMonster.maxHp / 3);
        appContext.player.gold += mercyGold;
        appContext.stats.monstersSpared++;
        
        setTimeout(() => {
          appContext.showDialog = true;
          appContext.dialogQueue = [
            `* You spared ${appContext.currentMonster.name}.`,
            mercyGold > 0 ? `* You received ${mercyGold} gold.` : `* They had no gold to give.`
          ];
          appContext.showNextDialog();
          
          // Return to overworld after dialog
          setTimeout(() => {
            appContext.currentScreen = 'overworld';
          }, 2000);
        }, 1000);
        break;
        
      case 'flee':
        // Just return to overworld
        setTimeout(() => {
          appContext.currentScreen = 'overworld';
        }, 1000);
        break;
    }
  }
};