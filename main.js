import { createApp } from 'vue';

const app = createApp({
  data() {
    return {
      currentScreen: 'title',
      battleState: 'menu',
      showDialog: false,
      currentDialog: '',
      dialogComplete: false,
      currentDialogIndex: 0,
      dialogSpeed: 30, // ms per character
      dialogQueue: [],
      
      selectedAction: null,
      
      player: {
        name: 'PLAYER',
        hp: 20,
        maxHp: 20,
        lv: 1,
        exp: 0,
        gold: 0,
        inventory: [
          { name: 'Monster Candy', type: 'heal', value: 10 },
          { name: 'Butterscotch Pie', type: 'heal', value: 20 }
        ]
      },
      
      currentMonster: null,
      monsterCount: 0,
      
      soul: {
        x: 0,
        y: 0,
        speed: 3,
        color: 'red'
      },
      
      bullets: [],
      bulletHellTimer: null,
      attackLinePosition: 0,
      attackDirection: 1,
      attackSpeed: 3,
      
      keys: {
        up: false,
        down: false,
        left: false,
        right: false,
        z: false,
        x: false
      }
    };
  },
  
  created() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  },
  
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.clearBulletHell();
  },
  
  methods: {
    startGame() {
      this.currentScreen = 'battle';
      this.generateNewMonster();
    },
    
    restartGame() {
      this.player.hp = this.player.maxHp;
      this.currentScreen = 'title';
    },
    
    async generateNewMonster() {
      this.monsterCount++;
      
      // Get monster data from LLM
      const monsterData = await this.requestMonsterFromLLM();
      
      // Generate monster sprite
      const spriteUrl = await this.generateMonsterSprite(monsterData.description);
      
      this.currentMonster = {
        name: monsterData.name,
        hp: monsterData.hp,
        maxHp: monsterData.hp,
        attack: monsterData.attack,
        defense: monsterData.defense,
        spriteUrl: spriteUrl,
        canSpare: false,
        spareCondition: monsterData.spareCondition,
        actions: monsterData.actions,
        bulletPatterns: monsterData.bulletPatterns,
        dialog: monsterData.dialog
      };
      
      // Show introduction dialog
      this.showMonsterDialog('intro');
    },
    
    async requestMonsterFromLLM() {
      // Structure for requesting a monster from the LLM
      const prompt = {
        task: "generate_monster",
        monsterCount: this.monsterCount,
        playerLevel: this.player.lv,
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
            intro: ["First meeting dialog line"],
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
              content: "You are an Undertale-style game content generator. Create unique, creative content in the style of Undertale."
            },
            {
              role: "user",
              content: JSON.stringify(prompt)
            }
          ],
          json: true
        });
        
        return JSON.parse(completion.content);
      } catch (error) {
        console.error("Error generating monster:", error);
        // Fallback monster in case the LLM request fails
        return {
          name: "Fallback Monster",
          description: "A simple white monster with a friendly smile",
          hp: 20 * this.player.lv,
          attack: 2 * this.player.lv,
          defense: this.player.lv,
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
              "Check": ["* FALLBACK MONSTER - ATK " + (2 * this.player.lv) + " DEF " + this.player.lv],
              "Compliment": ["* You said something nice.", "* Monster seems happier."]
            },
            spare: ["* Thank you for sparing me!"],
            defeat: ["* Why..."]
          }
        };
      }
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
        // Return a default sprite if generation fails
        return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0id2hpdGUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzMCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjM1IiBjeT0iNDAiIHI9IjUiIGZpbGw9ImJsYWNrIi8+PGNpcmNsZSBjeD0iNjUiIGN5PSI0MCIgcj0iNSIgZmlsbD0iYmxhY2siLz48cGF0aCBkPSJNMzAgNjUgUTUwIDgwIDcwIDY1IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48L3N2Zz4=";
      }
    },
    
    showMonsterDialog(type, actionName = null) {
      this.showDialog = true;
      this.dialogQueue = [];
      
      if (type === 'intro') {
        this.dialogQueue = [...this.currentMonster.dialog.intro];
      } else if (type === 'fight') {
        this.dialogQueue = [...this.currentMonster.dialog.fight];
      } else if (type === 'act' && actionName) {
        this.dialogQueue = [...(this.currentMonster.dialog.act[actionName] || ["* Nothing happened."])];
      } else if (type === 'spare') {
        this.dialogQueue = [...this.currentMonster.dialog.spare];
      } else if (type === 'defeat') {
        this.dialogQueue = [...this.currentMonster.dialog.defeat];
      }
      
      this.showNextDialog();
    },
    
    showNextDialog() {
      if (this.dialogQueue.length === 0) {
        this.dialogComplete = true;
        return;
      }
      
      const nextDialog = this.dialogQueue.shift();
      this.currentDialog = '';
      this.currentDialogIndex = 0;
      this.dialogComplete = false;
      
      this.typeDialog(nextDialog);
    },
    
    typeDialog(text) {
      if (this.currentDialogIndex < text.length) {
        this.currentDialog += text.charAt(this.currentDialogIndex);
        this.currentDialogIndex++;
        setTimeout(() => this.typeDialog(text), this.dialogSpeed);
      } else {
        this.dialogComplete = true;
      }
    },
    
    selectAction(action) {
      this.selectedAction = action;
    },
    
    performAct(action) {
      this.showMonsterDialog('act', action.name);
      
      if (action.effect === 'increase spare chance') {
        // For simplicity, we'll make the monster sparable after 3 compliments
        if (!this.currentMonster.complimentCount) {
          this.currentMonster.complimentCount = 1;
        } else {
          this.currentMonster.complimentCount++;
        }
        
        if (this.currentMonster.complimentCount >= 3) {
          this.currentMonster.canSpare = true;
        }
      }
    },
    
    useItem(item) {
      if (item.type === 'heal') {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.value);
        const itemIndex = this.player.inventory.findIndex(i => i.name === item.name);
        this.player.inventory.splice(itemIndex, 1);
        
        this.showDialog = true;
        this.dialogQueue = [`* You ate the ${item.name}.`, `* You recovered ${item.value} HP.`];
        this.showNextDialog();
      }
    },
    
    performMercy(type) {
      if (type === 'spare' && this.currentMonster.canSpare) {
        this.showMonsterDialog('spare');
        setTimeout(() => {
          this.endBattle('spare');
        }, 2000);
      } else if (type === 'spare') {
        this.showDialog = true;
        this.dialogQueue = ["* You tried to spare the monster...", "* But it doesn't seem ready to be spared yet."];
        this.showNextDialog();
      } else if (type === 'flee') {
        // 50% chance to flee successfully
        if (Math.random() > 0.5) {
          this.showDialog = true;
          this.dialogQueue = ["* You ran away successfully."];
          this.showNextDialog();
          
          setTimeout(() => {
            this.endBattle('flee');
          }, 2000);
        } else {
          this.showDialog = true;
          this.dialogQueue = ["* You couldn't run away!"];
          this.showNextDialog();
          
          setTimeout(() => {
            this.startEnemyTurn();
          }, 2000);
        }
      }
    },
    
    startFightAction() {
      this.battleState = 'fightAction';
      this.attackLinePosition = 0;
      this.attackDirection = 1;
      
      const attackInterval = setInterval(() => {
        this.attackLinePosition += this.attackSpeed * this.attackDirection;
        
        if (this.attackLinePosition >= 100) {
          this.attackDirection = -1;
        } else if (this.attackLinePosition <= 0) {
          this.attackDirection = 1;
        }
      }, 16);
      
      const handleAttack = (e) => {
        if (e.key === 'z') {
          clearInterval(attackInterval);
          window.removeEventListener('keydown', handleAttack);
          
          // Calculate damage based on how close to center the attack bar is
          const centerDistance = Math.abs(this.attackLinePosition - 50);
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
          
          const damage = Math.floor(this.player.lv * 5 * damageMultiplier);
          this.currentMonster.hp -= damage;
          
          this.showDialog = true;
          
          if (damageMultiplier >= 2) {
            this.dialogQueue = [`* Critical hit! You deal ${damage} damage!`];
          } else if (damageMultiplier >= 1.5) {
            this.dialogQueue = [`* Good hit! You deal ${damage} damage!`];
          } else if (damageMultiplier >= 1) {
            this.dialogQueue = [`* You deal ${damage} damage.`];
          } else {
            this.dialogQueue = [`* Weak hit. You deal only ${damage} damage.`];
          }
          
          this.showNextDialog();
          
          if (this.currentMonster.hp <= 0) {
            this.currentMonster.hp = 0;
            this.showMonsterDialog('defeat');
            setTimeout(() => {
              this.endBattle('defeat');
            }, 2000);
          } else {
            setTimeout(() => {
              this.startEnemyTurn();
            }, 2000);
          }
        }
      };
      
      window.addEventListener('keydown', handleAttack);
    },
    
    startEnemyTurn() {
      this.battleState = 'bulletHell';
      this.showDialog = false;
      
      // Reset soul position to center of bullet hell area
      const bulletHellEl = document.querySelector('.bullet-hell');
      if (bulletHellEl) {
        const rect = bulletHellEl.getBoundingClientRect();
        this.soul.x = rect.width / 2 - 8; // Center the 16px soul
        this.soul.y = rect.height / 2 - 8;
      }
      
      this.bullets = [];
      
      // Select a random bullet pattern
      const pattern = this.selectBulletPattern();
      
      // Generate the bullet pattern
      this.generateBulletPattern(pattern);
      
      // End enemy turn after a set duration
      setTimeout(() => {
        this.clearBulletHell();
        this.battleState = 'menu';
        this.selectedAction = null;
      }, 5000); // 5 seconds of bullet hell
    },
    
    selectBulletPattern() {
      if (this.currentMonster.bulletPatterns && this.currentMonster.bulletPatterns.length > 0) {
        return this.currentMonster.bulletPatterns[Math.floor(Math.random() * this.currentMonster.bulletPatterns.length)];
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
    
    async generateBulletPattern(pattern) {
      // Request bullet pattern generation from LLM
      try {
        const prompt = {
          task: "generate_bullet_pattern",
          pattern: pattern,
          bulletHellWidth: 320,
          bulletHellHeight: 150,
          playerLevel: this.player.lv,
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
        
        const bulletData = JSON.parse(completion.content);
        
        // Set up the bullet pattern
        this.bullets = bulletData.bullets.map(bullet => ({
          ...bullet,
          velocityX: bullet.velocityX || 0,
          velocityY: bullet.velocityY || 0,
          accelerationX: bullet.accelerationX || 0,
          accelerationY: bullet.accelerationY || 0
        }));
        
      } catch (error) {
        console.error("Error generating bullet pattern:", error);
        // Fallback simple bullet pattern
        this.generateDefaultBulletPattern();
      }
      
      // Start bullet animation
      this.bulletHellTimer = setInterval(() => {
        this.updateBulletHell();
      }, 16); // ~60fps
    },
    
    generateDefaultBulletPattern() {
      // Create a simple pattern with bullets coming from the top
      const bulletCount = 5 + Math.floor(this.player.lv / 2);
      
      for (let i = 0; i < bulletCount; i++) {
        this.bullets.push({
          x: Math.random() * 300,
          y: -20,
          width: 10,
          height: 10,
          type: 'normal',
          velocityX: 0,
          velocityY: 1 + Math.random() * 2,
          accelerationX: 0,
          accelerationY: 0
        });
      }
    },
    
    updateBulletHell() {
      // Update soul position based on keyboard input
      const speed = this.soul.speed;
      
      if (this.keys.up) this.soul.y = Math.max(0, this.soul.y - speed);
      if (this.keys.down) this.soul.y = Math.min(134, this.soul.y + speed);
      if (this.keys.left) this.soul.x = Math.max(0, this.soul.x - speed);
      if (this.keys.right) this.soul.x = Math.min(304, this.soul.x + speed);
      
      // Update bullet positions
      this.bullets.forEach(bullet => {
        // Apply acceleration
        bullet.velocityX += bullet.accelerationX;
        bullet.velocityY += bullet.accelerationY;
        
        // Update position
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        
        // Check collision with soul
        if (this.checkCollision(bullet)) {
          this.handleBulletCollision(bullet);
        }
      });
      
      // Remove bullets that are out of bounds
      this.bullets = this.bullets.filter(bullet => 
        bullet.x > -50 && bullet.x < 370 && 
        bullet.y > -50 && bullet.y < 200
      );
    },
    
    checkCollision(bullet) {
      // Simple AABB collision detection
      return (
        this.soul.x < bullet.x + bullet.width &&
        this.soul.x + 16 > bullet.x &&
        this.soul.y < bullet.y + bullet.height &&
        this.soul.y + 16 > bullet.y
      );
    },
    
    handleBulletCollision(bullet) {
      // Blue bullets only hurt you if you're moving
      if (bullet.type === 'blue' && 
          !this.keys.up && !this.keys.down && 
          !this.keys.left && !this.keys.right) {
        return;
      }
      
      // Orange bullets only hurt you if you're NOT moving
      if (bullet.type === 'orange' && 
          (this.keys.up || this.keys.down || 
           this.keys.left || this.keys.right)) {
        return;
      }
      
      // Apply damage
      this.player.hp -= 1;
      
      // Flash the soul
      const soulEl = this.$refs.soulElement;
      if (soulEl) {
        soulEl.style.opacity = 0.5;
        setTimeout(() => {
          if (soulEl) { 
            soulEl.style.opacity = 1;
          }
        }, 100);
      }
      
      // Check for game over
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.clearBulletHell();
        this.currentScreen = 'gameOver';
      }
    },
    
    clearBulletHell() {
      if (this.bulletHellTimer) {
        clearInterval(this.bulletHellTimer);
        this.bulletHellTimer = null;
      }
    },
    
    endBattle(outcome) {
      if (outcome === 'defeat') {
        // Gain EXP and gold
        const expGain = this.currentMonster.maxHp;
        const goldGain = Math.floor(this.currentMonster.maxHp / 2);
        
        this.player.exp += expGain;
        this.player.gold += goldGain;
        
        // Check for level up
        this.checkLevelUp();
        
        this.showDialog = true;
        this.dialogQueue = [
          `* You defeated ${this.currentMonster.name}!`,
          `* You gained ${expGain} EXP and ${goldGain} gold.`
        ];
        this.showNextDialog();
      }
      
      // Generate a new monster after a delay
      setTimeout(() => {
        this.generateNewMonster();
      }, 3000);
    },
    
    checkLevelUp() {
      const expNeeded = this.player.lv * 10;
      
      if (this.player.exp >= expNeeded) {
        this.player.lv++;
        this.player.exp -= expNeeded;
        this.player.maxHp += 4;
        this.player.hp = this.player.maxHp;
        
        this.showDialog = true;
        this.dialogQueue = [
          "* Level up!",
          `* Your LV increased to ${this.player.lv}!`,
          "* Your HP increased!"
        ];
        this.showNextDialog();
      }
    },
    
    handleKeyDown(e) {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          this.keys.up = true;
          break;
        case 'arrowdown':
        case 's':
          this.keys.down = true;
          break;
        case 'arrowleft':
        case 'a':
          this.keys.left = true;
          break;
        case 'arrowright':
        case 'd':
          this.keys.right = true;
          break;
        case 'z':
          this.keys.z = true;
          if (this.showDialog && this.dialogComplete) {
            this.showNextDialog();
            
            // If no more dialogs, close dialog box and continue game flow
            if (this.dialogQueue.length === 0) {
              setTimeout(() => {
                this.showDialog = false;
                
                if (this.battleState === 'menu' && this.selectedAction === 'fight') {
                  this.startFightAction();
                } else if (this.battleState === 'menu' && this.selectedAction) {
                  // Do nothing, wait for submenu selection
                } else if (this.battleState === 'menu') {
                  // Reset
                } else {
                  this.startEnemyTurn();
                }
              }, 500);
            }
          } else if (this.selectedAction === 'fight' && !this.showDialog) {
            this.startFightAction();
          }
          break;
        case 'x':
          this.keys.x = true;
          if (this.selectedAction) {
            this.selectedAction = null;
          }
          break;
      }
    },
    
    handleKeyUp(e) {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          this.keys.up = false;
          break;
        case 'arrowdown':
        case 's':
          this.keys.down = false;
          break;
        case 'arrowleft':
        case 'a':
          this.keys.left = false;
          break;
        case 'arrowright':
        case 'd':
          this.keys.right = false;
          break;
        case 'z':
          this.keys.z = false;
          break;
        case 'x':
          this.keys.x = false;
          break;
      }
    }
  }
});

app.mount('#app');