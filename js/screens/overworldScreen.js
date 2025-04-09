import AudioSystem from '../systems/audioSystem.js';
import EncounterSystem from '../systems/encounterSystem.js';

export default {
  data() {
    return {
      // Overworld-specific state
      movementSpeed: 3,
      interactionRadius: 40,
      encounterSteps: 0,
      stepsSinceLastEncounter: 0,
      isMoving: false,
      facingDirection: 'down', // down, up, left, right
      
      // Collision detection
      collisionRects: []
    };
  },
  
  methods: {
    handleOverworldKeyDown(e) {
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.keys.up = true;
          this.facingDirection = 'up';
          this.isMoving = true;
          break;
        case 's':
        case 'arrowdown':
          this.keys.down = true;
          this.facingDirection = 'down';
          this.isMoving = true;
          break;
        case 'a':
        case 'arrowleft':
          this.keys.left = true;
          this.facingDirection = 'left';
          this.isMoving = true;
          break;
        case 'd':
        case 'arrowright':
          this.keys.right = true;
          this.facingDirection = 'right';
          this.isMoving = true;
          break;
        case 'z':
          // Interaction with objects or NPCs
          if (this.nearSavePoint) {
            this.currentScreen = 'save';
            AudioSystem.playSound('menu_select');
          } else if (this.showDialog && this.dialogComplete) {
            this.showNextDialog();
            
            if (this.dialogQueue.length === 0) {
              this.showDialog = false;
              this.interactingWithNPC = null;
            }
          } else {
            this.tryInteract();
          }
          break;
        case 'x':
          // Cancel/Menu
          if (this.showDialog) {
            this.dialogQueue = [];
            this.showDialog = false;
            this.interactingWithNPC = null;
          }
          break;
      }
    },
    
    handleOverworldKeyUp(e) {
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.keys.up = false;
          break;
        case 's':
        case 'arrowdown':
          this.keys.down = false;
          break;
        case 'a':
        case 'arrowleft':
          this.keys.left = false;
          break;
        case 'd':
        case 'arrowright':
          this.keys.right = false;
          break;
      }
      
      // Check if all movement keys are released
      if (!this.keys.up && !this.keys.down && !this.keys.left && !this.keys.right) {
        this.isMoving = false;
      }
    },
    
    updateOverworld() {
      if (this.currentScreen !== 'overworld' || this.showDialog) return;
      
      let newX = this.player.x;
      let newY = this.player.y;
      
      if (this.keys.up) newY -= this.movementSpeed;
      if (this.keys.down) newY += this.movementSpeed;
      if (this.keys.left) newX -= this.movementSpeed;
      if (this.keys.right) newX += this.movementSpeed;
      
      // Check for collisions
      if (!this.checkCollision(newX, newY)) {
        // Check if position changed
        if (newX !== this.player.x || newY !== this.player.y) {
          this.player.x = newX;
          this.player.y = newY;
          
          // Increment steps and check for random encounters
          this.stepsSinceLastEncounter++;
          
          // Check for random battle encounters
          this.checkForRandomEncounter();
        }
      }
      
      // Check for area transitions
      this.checkAreaTransitions();
      
      // Check for save points
      this.checkNearSavePoint();
    },
    
    checkCollision(newX, newY) {
      // Player hitbox dimensions
      const playerWidth = 20;
      const playerHeight = 30;
      
      // Create player rectangle for collision testing
      const playerRect = {
        x: newX,
        y: newY,
        width: playerWidth,
        height: playerHeight
      };
      
      // Get all collidable objects in the current area
      const collidables = this.currentArea.objects.filter(obj => 
        obj.type === 'wall' || (obj.type === 'door' && obj.locked));
      
      // Check collision with each object
      for (const obj of collidables) {
        if (this.rectIntersect(playerRect, obj)) {
          return true; // Collision detected
        }
      }
      
      return false; // No collision
    },
    
    rectIntersect(rect1, rect2) {
      return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
      );
    },
    
    checkAreaTransitions() {
      if (!this.currentArea.transitions) return;
      
      const playerRect = {
        x: this.player.x,
        y: this.player.y,
        width: 20,
        height: 30
      };
      
      for (const transition of this.currentArea.transitions) {
        if (this.rectIntersect(playerRect, transition)) {
          // Trigger area transition
          this.transitionToArea(transition.targetArea, transition.targetX, transition.targetY);
          break;
        }
      }
    },
    
    transitionToArea(targetAreaId, targetX, targetY) {
      AudioSystem.playSound('area_transition');
      
      // Find the target area
      const targetArea = this.areas.find(area => area.id === targetAreaId);
      
      if (targetArea) {
        this.currentArea = targetArea;
        this.player.x = targetX;
        this.player.y = targetY;
        
        // Change music if needed
        AudioSystem.playMusic(targetArea.music);
      }
    },
    
    checkNearSavePoint() {
      if (!this.currentArea.objects) return;
      
      const savePoints = this.currentArea.objects.filter(obj => obj.type === 'save');
      
      this.nearSavePoint = false;
      
      for (const savePoint of savePoints) {
        const distance = Math.sqrt(
          Math.pow(this.player.x - savePoint.x, 2) + 
          Math.pow(this.player.y - savePoint.y, 2)
        );
        
        if (distance < 30) {
          this.nearSavePoint = true;
          break;
        }
      }
    },
    
    tryInteract() {
      if (this.showDialog) return;
      
      // Check for interaction with NPCs
      if (this.currentArea.npcs) {
        for (const npc of this.currentArea.npcs) {
          const distance = Math.sqrt(
            Math.pow(this.player.x - npc.x, 2) + 
            Math.pow(this.player.y - npc.y, 2)
          );
          
          if (distance < this.interactionRadius) {
            // Start dialog with NPC
            this.interactingWithNPC = npc;
            this.showDialog = true;
            this.dialogQueue = [...npc.dialog];
            this.showNextDialog();
            AudioSystem.playSound('dialog');
            return;
          }
        }
      }
      
      // Check for interaction with objects
      if (this.currentArea.objects) {
        for (const obj of this.currentArea.objects) {
          if (obj.type === 'button') {
            const distance = Math.sqrt(
              Math.pow(this.player.x - obj.x, 2) + 
              Math.pow(this.player.y - obj.y, 2)
            );
            
            if (distance < this.interactionRadius) {
              this.activateButton(obj);
              return;
            }
          }
        }
      }
    },
    
    activateButton(button) {
      AudioSystem.playSound('button_press');
      
      // Find any doors that should be unlocked by this button
      if (this.currentArea.objects) {
        const doors = this.currentArea.objects.filter(obj => obj.type === 'door' && obj.locked);
        
        for (const door of doors) {
          door.locked = false;
          
          this.showDialog = true;
          this.dialogQueue = ["* You hear a clicking sound.", "* Something has been unlocked."];
          this.showNextDialog();
        }
      }
    },
    
    checkForRandomEncounter() {
      // Only allow encounters after a certain number of steps
      if (this.stepsSinceLastEncounter < 10) return;
      
      // Calculate encounter probability based on area
      const encounterRate = this.currentArea.encounterRate || 0.05; // 5% chance by default
      
      if (Math.random() < encounterRate) {
        // Reset step counter
        this.stepsSinceLastEncounter = 0;
        
        // Start battle
        this.startRandomBattle();
      }
    },
    
    startRandomBattle() {
      // Generate an appropriate monster for this area
      EncounterSystem.generateEncounter(this.currentArea.id, this.player.lv)
        .then(monster => {
          this.currentMonster = monster;
          this.currentScreen = 'battle';
          this.battleState = 'menu';
          this.showDialog = true;
          
          // Show introduction dialog
          this.showMonsterDialog('intro');
          
          // Play battle music
          AudioSystem.playMusic('battle');
        });
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
        setTimeout(() => this.typeDialog(text), 30); // Dialog typing speed
      } else {
        this.dialogComplete = true;
      }
    }
  },
  
  mounted() {
    if (this.currentScreen === 'overworld') {
      // Start the overworld update loop
      this.overworldInterval = setInterval(() => {
        this.updateOverworld();
      }, 16); // 60fps
    }
  },
  
  watch: {
    currentScreen(newScreen, oldScreen) {
      if (newScreen === 'overworld' && !this.overworldInterval) {
        // Start the overworld update loop when entering overworld
        this.overworldInterval = setInterval(() => {
          this.updateOverworld();
        }, 16);
      } else if (newScreen !== 'overworld' && this.overworldInterval) {
        // Clear the interval when leaving overworld
        clearInterval(this.overworldInterval);
        this.overworldInterval = null;
      }
    }
  }
};