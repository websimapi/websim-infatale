import AudioSystem from '../systems/audioSystem.js';

export default {
  data() {
    return {
      currentDialogIndex: 0,
      dialogSpeed: 30, 
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
      attackSpeed: 3
    };
  },
  
  methods: {
    handleBattleKeyDown(e) {
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
            
            if (this.dialogQueue.length === 0) {
              setTimeout(() => {
                this.showDialog = false;
                
                if (this.battleState === 'menu' && this.selectedAction === 'fight') {
                  this.startFightAction();
                } else if (this.battleState === 'menu' && this.selectedAction) {
                  
                } else if (this.battleState === 'menu') {
                  
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
    
    handleBattleKeyUp(e) {
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
    
    selectAction(action) {
      this.selectedAction = action;
      AudioSystem.playSound('menu_select');
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
    
    performAct(action) {
      this.showMonsterDialog('act', action.name);
      AudioSystem.playSound('menu_select');
      
      if (action.effect === 'increase spare chance') {
        
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
        
        AudioSystem.playSound('menu_select');
        this.showDialog = true;
        this.dialogQueue = [`* You ate the ${item.name}.`, `* You recovered ${item.value} HP.`];
        this.showNextDialog();
      }
    },
    
    performMercy(type) {
      AudioSystem.playSound('menu_select');
      
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
          AudioSystem.playSound('hit');
          
          const centerDistance = Math.abs(this.attackLinePosition - 50);
          let damageMultiplier = 1;
          
          if (centerDistance < 5) {
            damageMultiplier = 2; 
          } else if (centerDistance < 15) {
            damageMultiplier = 1.5; 
          } else if (centerDistance < 25) {
            damageMultiplier = 1; 
          } else {
            damageMultiplier = 0.5; 
          }
          
          const damage = Math.floor((this.player.lv * 5 + this.player.stats.attack) * damageMultiplier - this.currentMonster.defense / 2);
          this.currentMonster.hp -= Math.max(1, damage);
          
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
      
      const bulletHellEl = document.querySelector('.bullet-hell');
      if (bulletHellEl) {
        const rect = bulletHellEl.getBoundingClientRect();
        this.soul.x = rect.width / 2 - 8; 
        this.soul.y = rect.height / 2 - 8;
      }
      
      this.bullets = [];
      
      const pattern = this.selectBulletPattern();
      
      this.generateBulletPattern(pattern);
      
      setTimeout(() => {
        this.clearBulletHell();
        this.battleState = 'menu';
        this.selectedAction = null;
      }, 5000); 
    },
    
    selectBulletPattern() {
      if (this.currentMonster.bulletPatterns && this.currentMonster.bulletPatterns.length > 0) {
        return this.currentMonster.bulletPatterns[Math.floor(Math.random() * this.currentMonster.bulletPatterns.length)];
      }
      
      return {
        name: "Default Pattern",
        description: "Simple bullets from top to bottom",
        difficulty: 2,
        bulletTypes: ["normal"],
        movements: "Straight down"
      };
    },
    
    generateBulletPattern(pattern) {
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
        
        this.bullets = bulletData.bullets.map(bullet => ({
          ...bullet,
          velocityX: bullet.velocityX || 0,
          velocityY: bullet.velocityY || 0,
          accelerationX: bullet.accelerationX || 0,
          accelerationY: bullet.accelerationY || 0
        }));
        
      } catch (error) {
        console.error("Error generating bullet pattern:", error);
        this.generateDefaultBulletPattern();
      }
      
      this.bulletHellTimer = setInterval(() => {
        this.updateBulletHell();
      }, 16); 
    },
    
    generateDefaultBulletPattern() {
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
      if (this.keys.up) this.soul.y = Math.max(0, this.soul.y - this.soul.speed);
      if (this.keys.down) this.soul.y = Math.min(134, this.soul.y + this.soul.speed);
      if (this.keys.left) this.soul.x = Math.max(0, this.soul.x - this.soul.speed);
      if (this.keys.right) this.soul.x = Math.min(304, this.soul.x + this.soul.speed);
      
      this.bullets.forEach(bullet => {
        bullet.velocityX += bullet.accelerationX;
        bullet.velocityY += bullet.accelerationY;
        
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        
        if (this.checkCollision(bullet)) {
          this.handleBulletCollision(bullet);
        }
      });
      
      this.bullets = this.bullets.filter(bullet => 
        bullet.x > -50 && bullet.x < 370 && 
        bullet.y > -50 && bullet.y < 200
      );
    },
    
    checkCollision(bullet) {
      return (
        this.soul.x < bullet.x + bullet.width &&
        this.soul.x + 16 > bullet.x &&
        this.soul.y < bullet.y + bullet.height &&
        this.soul.y + 16 > bullet.y
      );
    },
    
    handleBulletCollision(bullet) {
      if (bullet.type === 'blue' && 
          !this.keys.up && !this.keys.down && 
          !this.keys.left && !this.keys.right) {
        return;
      }
      
      if (bullet.type === 'orange' && 
          (this.keys.up || this.keys.down || 
           this.keys.left || this.keys.right)) {
        return;
      }
      
      this.player.hp -= 1;
      
      const soulEl = this.$refs.soulElement;
      if (soulEl) {
        soulEl.style.opacity = 0.5;
        setTimeout(() => {
          soulEl.style.opacity = 1;
        }, 100);
      }
      
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
        this.player.flags.monstersDefeated++;
        
        const expGain = this.currentMonster.maxHp;
        const goldGain = Math.floor(this.currentMonster.maxHp / 2);
        
        this.player.exp += expGain;
        this.player.gold += goldGain;
        
        this.checkLevelUp();
        
        this.showDialog = true;
        this.dialogQueue = [
          `* You defeated ${this.currentMonster.name}!`,
          `* You gained ${expGain} EXP and ${goldGain} gold.`
        ];
        this.showNextDialog();
      } else if (outcome === 'spare') {
        this.player.flags.monstersSaved++;
        
        const goldGain = Math.floor(this.currentMonster.maxHp / 3);
        this.player.gold += goldGain;
        
        this.showDialog = true;
        this.dialogQueue = [
          `* You spared ${this.currentMonster.name}.`,
          `* You gained ${goldGain} gold.`
        ];
        this.showNextDialog();
      }
      
      setTimeout(() => {
        this.currentScreen = 'overworld';
        AudioSystem.playMusic(this.currentArea.music);
      }, 3000);
    },
    
    checkLevelUp() {
      const expNeeded = this.player.lv * 10;
      
      if (this.player.exp >= expNeeded) {
        this.player.lv++;
        this.player.exp -= expNeeded;
        this.player.maxHp += 4;
        this.player.hp = this.player.maxHp;
        this.player.stats.attack += 2;
        this.player.stats.defense += 1;
        
        this.showDialog = true;
        this.dialogQueue = [
          "* Level up!",
          `* Your LV increased to ${this.player.lv}!`,
          "* Your HP and stats increased!"
        ];
        this.showNextDialog();
      }
    }
  },
  
  watch: {
    currentScreen(newScreen, oldScreen) {
      if (newScreen === 'battle' && oldScreen !== 'battle') {
        this.battleState = 'menu';
        this.selectedAction = null;
        
        AudioSystem.playMusic('battle');
      }
    }
  },
  
  beforeUnmount() {
    this.clearBulletHell();
  }
};