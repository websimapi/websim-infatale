// playerService.js - Manages player state and operations

export const playerService = {
  getInitialPlayerData() {
    return {
      name: 'PLAYER',
      hp: 20,
      maxHp: 20,
      lv: 1,
      exp: 0,
      gold: 0,
      inventory: [
        { 
          name: 'Monster Candy', 
          type: 'heal', 
          value: 10,
          description: 'Heals 10 HP. Has a distinct, non-licorice flavor.'
        },
        {
          name: 'Butterscotch Pie',
          type: 'heal',
          value: 20,
          description: 'Heals all HP. A butterscotch-cinnamon pie.'
        }
      ],
      equipment: {
        weapon: { name: 'Stick', atk: 0 },
        armor: { name: 'Bandage', def: 0 }
      },
      contacts: [
        { name: 'Toriel', greeting: 'Hello, my child! How are you doing?' },
        { name: 'Sans', greeting: 'heya. what\'s up, kid?' }
      ],
      overworld: {
        x: 0,
        y: 0,
        speed: 4,
        facing: 'down'
      }
    };
  },
  
  levelUp(appContext) {
    const player = appContext.player;
    player.lv++;
    player.maxHp += 4;
    player.hp = player.maxHp;
    
    appContext.showDialog = true;
    appContext.dialogQueue = [
      "* Level up!",
      `* Your LV increased to ${player.lv}!`,
      "* Your HP increased!"
    ];
    appContext.showNextDialog();
  },
  
  checkLevelUp(appContext) {
    const player = appContext.player;
    const expNeeded = player.lv * 10;
    
    if (player.exp >= expNeeded) {
      player.exp -= expNeeded;
      this.levelUp(appContext);
      return true;
    }
    return false;
  },
  
  useItem(appContext, item) {
    const player = appContext.player;
    
    switch (item.type) {
      case 'heal':
        let healAmount = item.value;
        // Handle full heal items
        if (healAmount === 0) healAmount = player.maxHp;
        
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        
        appContext.showDialog = true;
        appContext.dialogQueue = [
          `* You used the ${item.name}.`,
          healAmount === player.maxHp 
            ? `* You recovered all HP!` 
            : `* You recovered ${healAmount} HP!`
        ];
        appContext.showNextDialog();
        break;
        
      case 'equipment':
        if (item.equipType === 'weapon') {
          const oldWeapon = player.equipment.weapon;
          player.equipment.weapon = {
            name: item.name,
            atk: item.value
          };
          // Add the old equipment to inventory if it's not the default
          if (oldWeapon.name !== 'Stick') {
            player.inventory.push({
              name: oldWeapon.name,
              type: 'equipment',
              equipType: 'weapon',
              value: oldWeapon.atk,
              description: `A weapon with ${oldWeapon.atk} ATK.`
            });
          }
        } else if (item.equipType === 'armor') {
          const oldArmor = player.equipment.armor;
          player.equipment.armor = {
            name: item.name,
            def: item.value
          };
          // Add the old equipment to inventory if it's not the default
          if (oldArmor.name !== 'Bandage') {
            player.inventory.push({
              name: oldArmor.name,
              type: 'equipment',
              equipType: 'armor',
              value: oldArmor.def,
              description: `Armor with ${oldArmor.def} DEF.`
            });
          }
        }
        
        appContext.showDialog = true;
        appContext.dialogQueue = [
          `* You equipped ${item.name}.`
        ];
        appContext.showNextDialog();
        break;
        
      case 'key':
        // Key items typically just show a description and stay in inventory
        appContext.showDialog = true;
        appContext.dialogQueue = [
          `* You used the ${item.name}.`,
          `* ${item.useMessage || "Nothing happened."}`
        ];
        appContext.showNextDialog();
        return; // Don't remove key items
        
      default:
        appContext.showDialog = true;
        appContext.dialogQueue = [
          `* You used the ${item.name}.`,
          `* Nothing happened.`
        ];
        appContext.showNextDialog();
    }
    
    // Remove the used item (except key items)
    const itemIndex = player.inventory.findIndex(i => i.name === item.name);
    if (itemIndex !== -1) {
      player.inventory.splice(itemIndex, 1);
    }
  },
  
  addItem(appContext, item) {
    appContext.player.inventory.push(item);
    
    appContext.showDialog = true;
    appContext.dialogQueue = [
      `* You got the ${item.name}!`,
      `* ${item.description}`
    ];
    appContext.showNextDialog();
  }
};