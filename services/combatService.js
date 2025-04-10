// combatService.js - Enhanced combat mechanics

export const combatService = {
  processAttack(appContext) {
    // Calculate damage based on position
    const attackZoneCenter = appContext.attackZonePosition + (appContext.attackZoneWidth / 2);
    const centerDistance = Math.abs(appContext.attackLinePosition - attackZoneCenter);
    const hitZone = appContext.attackZoneWidth / 2;
    
    let damageMultiplier = 0;
    let hitQuality = '';
    
    // Determine hit quality
    if (centerDistance < hitZone * 0.2) {
      damageMultiplier = 2.5; // Perfect hit
      hitQuality = 'perfect';
    } else if (centerDistance < hitZone * 0.5) {
      damageMultiplier = 2; // Critical hit
      hitQuality = 'critical';
    } else if (centerDistance < hitZone * 0.8) {
      damageMultiplier = 1.5; // Good hit
      hitQuality = 'good';
    } else if (centerDistance < hitZone) {
      damageMultiplier = 1; // Normal hit
      hitQuality = 'normal';
    } else {
      damageMultiplier = 0.5; // Bad hit
      hitQuality = 'bad';
    }
    
    // Calculate base damage from weapon and player stats
    const weapon = appContext.player.equipment?.weapon;
    const weaponAtk = weapon?.atk || 0;
    const baseDamage = 4 + (appContext.player.lv * 2) + weaponAtk;
    
    // Consider monster defense
    const monsterDef = appContext.currentMonster.defense || 0;
    const defenseReduction = Math.min(monsterDef / 4, 0.5); // Cap defense reduction at 50%
    
    const damageBeforeDefense = Math.floor(baseDamage * damageMultiplier);
    const finalDamage = Math.max(1, Math.floor(damageBeforeDefense * (1 - defenseReduction)));
    
    // Apply damage to monster
    appContext.currentMonster.hp = Math.max(0, appContext.currentMonster.hp - finalDamage);
    
    // Show damage number and play hit sound
    this.showDamageNumber(appContext, finalDamage, hitQuality);
    this.playHitSound(hitQuality);
    
    // Show appropriate dialog based on hit quality
    appContext.showDialog = true;
    
    if (hitQuality === 'perfect') {
      appContext.dialogQueue = [`* PERFECT! You deal ${finalDamage} damage!`];
    } else if (hitQuality === 'critical') {
      appContext.dialogQueue = [`* Critical hit! You deal ${finalDamage} damage!`];
    } else if (hitQuality === 'good') {
      appContext.dialogQueue = [`* Good hit! You deal ${finalDamage} damage.`];
    } else if (hitQuality === 'normal') {
      appContext.dialogQueue = [`* You deal ${finalDamage} damage.`];
    } else {
      appContext.dialogQueue = [`* Weak hit. You only deal ${finalDamage} damage.`];
    }
    
    appContext.showNextDialog();
    
    // Check if monster is defeated
    if (appContext.currentMonster.hp <= 0) {
      appContext.currentMonster.hp = 0;
      setTimeout(() => {
        this.playDeathAnimation(appContext);
        appContext.battleService.showMonsterDialog(appContext, 'defeat');
        setTimeout(() => {
          appContext.battleService.endBattle(appContext, 'defeat');
        }, 2000);
      }, 1500);
    } else {
      // Continue battle if monster survives
      setTimeout(() => {
        appContext.battleService.showMonsterDialog(appContext, 'fight');
        setTimeout(() => {
          appContext.battleService.startEnemyTurn(appContext);
        }, 2000);
      }, 1500);
    }
  },
  
  showDamageNumber(appContext, damage, hitQuality) {
    // Add damage number to DOM
    const monsterEl = document.querySelector('.monster');
    if (!monsterEl) return;
    
    const damageEl = document.createElement('div');
    damageEl.className = `damage-number ${hitQuality}`;
    damageEl.textContent = damage;
    
    // Add to monster element
    monsterEl.appendChild(damageEl);
    
    // Remove after animation
    setTimeout(() => {
      if (damageEl.parentElement === monsterEl) {
        monsterEl.removeChild(damageEl);
      }
    }, 1000);
  },
  
  playDeathAnimation(appContext) {
    const monsterEl = document.querySelector('.monster-sprite');
    if (!monsterEl) return;
    
    // Add shake effect
    monsterEl.classList.add('death-shake');
    
    // Add fade out
    setTimeout(() => {
      monsterEl.classList.add('death-fade');
    }, 500);
  },
  
  generateItemDrop(appContext) {
    const playerLevel = appContext.player.lv;
    
    // Define possible drops based on player level
    const possibleItems = [
      { name: 'Monster Candy', type: 'heal', value: 10, description: 'Heals 10 HP. Has a distinct, non-licorice flavor.' },
      { name: 'Spider Donut', type: 'heal', value: 12, description: 'Heals 12 HP. A donut made with Spider Cider in the batter.' }
    ];
    
    if (playerLevel >= 2) {
      possibleItems.push({ 
        name: 'Tough Glove', 
        type: 'equipment', 
        equipType: 'weapon', 
        atk: 5, 
        zoneWidth: 15, // Slightly wider hit zone
        description: 'A worn pink leather glove. For five-fingered folk.' 
      });
    }
    
    if (playerLevel >= 3) {
      possibleItems.push({ 
        name: 'Ballet Shoes', 
        type: 'equipment', 
        equipType: 'weapon', 
        atk: 7,
        zoneWidth: 12, // Narrower but stronger
        description: 'Weapons of a dancer. Allows for more precise strikes.' 
      });
    }
    
    if (playerLevel >= 4) {
      possibleItems.push({ 
        name: 'Torn Notebook', 
        type: 'equipment', 
        equipType: 'weapon', 
        atk: 2,
        zoneWidth: 25, // Very wide hit zone but low damage
        description: 'Contains illegible scribbles. Very easy to hit with.' 
      });
    }
    
    // Select a random item, weighted toward consumables
    const item = possibleItems[Math.floor(Math.random() * possibleItems.length)];
    appContext.player.inventory.push(item);
    
    appContext.dialogQueue.push(`* The monster dropped ${item.name}!`);
  },
  
  // Sound effects (placeholders for now)
  playAttackStartSound() {
    // Placeholder for attack start sound
    console.log("Attack start sound");
  },
  
  playHitSound(hitQuality) {
    // Placeholder for different hit sounds
    console.log(`${hitQuality} hit sound`);
  }
};