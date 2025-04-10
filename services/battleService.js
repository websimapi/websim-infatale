// battleService.js - Core battle flow and management
// Note: Monster generation methods have been moved to battleGenerationService.js
// Note: Bullet hell mechanics have been moved to bulletHellService.js

import { battleGenerationService } from './battleGenerationService.js';
import { bulletHellService } from './bulletHellService.js';
import { combatService } from './combatService.js';

export const battleService = {
  async generateMonster(appContext, monsterType = null) {
    appContext.showDialog = true;
    appContext.dialogQueue = ["* Encountering monster..."];
    appContext.showNextDialog();
    
    try {
      // Delegate to battleGenerationService
      await battleGenerationService.generateMonster(appContext, monsterType);
    } catch (error) {
      console.error("Error in generateMonster:", error);
      appContext.currentMonster = battleGenerationService.getFallbackMonster(appContext);
      this.showMonsterDialog(appContext, 'intro');
    }
  },
  
  showMonsterDialog(appContext, type, actionName = null) {
    battleGenerationService.showMonsterDialog(appContext, type, actionName);
  },
  
  startFightAction(appContext) {
    appContext.battleState = 'fightAction';
    appContext.attackLinePosition = 0;
    appContext.attackDirection = 1;
    appContext.attackSpeed = 3 + Math.min(appContext.player.lv, 7); // Speed scales with level
    
    // Create attack zone based on weapon
    const weapon = appContext.player.equipment?.weapon;
    appContext.attackZoneWidth = weapon?.zoneWidth || 10; // Default 10% width
    appContext.attackZonePosition = 50 - (appContext.attackZoneWidth / 2); // Center
    
    // Play attack start sound
    combatService.playAttackStartSound();
    
    const attackInterval = setInterval(() => {
      appContext.attackLinePosition += appContext.attackSpeed * appContext.attackDirection;
      
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
        
        // Delegate to combatService for more detailed combat handling
        combatService.processAttack(appContext);
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
    
    // Delegate to bulletHellService
    bulletHellService.startBulletHell(appContext);
  },
  
  clearBulletHell(appContext) {
    bulletHellService.clearBulletHell(appContext);
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
          combatService.generateItemDrop(appContext);
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