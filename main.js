import { createApp } from 'vue';
import { FightSystem } from './fight.js';

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
      },
      
      fightSystem: null,
    };
  },
  
  created() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.fightSystem = new FightSystem(this);
  },
  
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.fightSystem) {
      this.fightSystem.cleanup();
    }
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
      this.showDialog = true;
      this.dialogQueue = ["* Encountering monster..."];
      this.showNextDialog();
      
      try {
        // Get monster data from LLM
        const monsterData = await this.requestMonsterFromLLM();
        
        if (!monsterData) {
          throw new Error("Failed to generate monster data");
        }
        
        // Generate monster sprite
        let spriteUrl;
        try {
          spriteUrl = await this.generateMonsterSprite(monsterData.description);
        } catch (spriteError) {
          console.error("Error generating sprite:", spriteError);
          spriteUrl = null;
        }
        
        // Ensure dialog structure exists with fallbacks
        const dialogData = monsterData.dialog || {};
        const safeDialog = {
          intro: Array.isArray(dialogData.intro) ? dialogData.intro : ["* A monster appears!"],
          fight: Array.isArray(dialogData.fight) ? dialogData.fight : ["* The monster looks determined."],
          act: dialogData.act || {},
          spare: Array.isArray(dialogData.spare) ? dialogData.spare : ["* The monster was spared."],
          defeat: Array.isArray(dialogData.defeat) ? dialogData.defeat : ["* The monster was defeated."]
        };
        
        // Set the current monster with validated data
        this.currentMonster = {
          name: monsterData.name || "Mystery Monster",
          hp: monsterData.hp || 20,
          maxHp: monsterData.hp || 20,
          attack: monsterData.attack || 2,
          defense: monsterData.defense || 1,
          spriteUrl: spriteUrl,
          canSpare: false,
          spareCondition: monsterData.spareCondition || "Complete certain actions",
          actions: Array.isArray(monsterData.actions) ? monsterData.actions : [
            { 
              name: "Check", 
              description: "See monster stats", 
              effect: null 
            }
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
          dialog: safeDialog
        };
        
        // Show introduction dialog only after monster is fully initialized
        this.showMonsterDialog('intro');
        
      } catch (error) {
        console.error("Error in generateNewMonster:", error);
        // Use fallback monster if generation fails
        this.currentMonster = this.getFallbackMonster();
        this.showMonsterDialog('intro');
      }
    },
    
    showMonsterDialog(type, actionName = null) {
      if (!this.currentMonster || !this.currentMonster.dialog) {
        console.error("Cannot show dialog - monster or dialog not initialized");
        this.showDialog = true;
        this.dialogQueue = ["* [An error occurred...]"];
        this.showNextDialog();
        return;
      }
      
      this.showDialog = true;
      this.dialogQueue = [];
      
      const dialog = this.currentMonster.dialog;
      
      switch (type) {
        case 'intro':
          this.dialogQueue = Array.isArray(dialog.intro) ? [...dialog.intro] : ["* You encountered the monster!"];
          break;
        case 'fight':
          this.dialogQueue = Array.isArray(dialog.fight) ? [...dialog.fight] : ["* The monster prepares to attack."];
          break;
        case 'act':
          if (actionName && dialog.act && dialog.act[actionName]) {
            this.dialogQueue = Array.isArray(dialog.act[actionName]) ? [...dialog.act[actionName]] : ["* Nothing happened."];
          } else {
            this.dialogQueue = ["* Nothing happened."];
          }
          break;
        case 'spare':
          this.dialogQueue = Array.isArray(dialog.spare) ? [...dialog.spare] : ["* You spared the monster."];
          break;
        case 'defeat':
          this.dialogQueue = Array.isArray(dialog.defeat) ? [...dialog.defeat] : ["* The monster was defeated."];
          break;
        default:
          this.dialogQueue = ["* [Unknown dialog type]"];
      }
      
      this.showNextDialog();
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
          return this.getFallbackMonster();
        }
        
        // Validate that critical fields exist, use fallback if not
        if (!monsterData || !monsterData.name || !monsterData.description) {
          console.error("Invalid monster data from LLM");
          return this.getFallbackMonster();
        }
        
        return monsterData;
      } catch (error) {
        console.error("Error generating monster:", error);
        return this.getFallbackMonster();
      }
    },
    
    getFallbackMonster() {
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
    
    startFightAction() {
      this.fightSystem.startFightAction();
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
          if (this.showDialog && this.dialogComplete) {
            this.showNextDialog();
            
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
    },
    
    attackLinePosition() {
      return this.fightSystem ? this.fightSystem.getAttackLinePosition() : 0;
    },
  }
});

app.mount('#app');