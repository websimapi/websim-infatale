// overworldService.js - Manages the overworld exploration and interactions

import { dialogService } from './dialogService.js';
import { gameData } from '../data/gameData.js';

let overworldLoopId = null;

export const overworldService = {
  getStartingArea() {
    return {
      name: "The Ruins",
      type: "ruins",
      description: "Ancient ruins filled with puzzles and dormant traps.",
      startPosition: { x: 320, y: 200 },
      obstacles: [
        { x: 100, y: 100, width: 50, height: 50 },
        { x: 200, y: 150, width: 80, height: 30 },
        { x: 450, y: 120, width: 40, height: 80 }
      ],
      exits: [
        { x: 600, y: 180, width: 40, height: 80, targetArea: "Snowdin", targetPosition: { x: 40, y: 200 } }
      ],
      npcs: [
        {
          id: "flower1",
          name: "Mysterious Flower",
          x: 320, 
          y: 150,
          width: 30,
          height: 30,
          dialog: ["* Howdy! I'm FLOWEY.", "* FLOWEY the FLOWER!", "* Hmm... You're new to the UNDERGROUND, aren'tcha?"],
          interactionCount: 0
        }
      ],
      encounters: {
        chance: 0.02, // 2% chance per step for random encounter
        monsters: ["Froggit", "Whimsun"]
      }
    };
  },
  
  getArea(areaName) {
    switch (areaName) {
      case "Snowdin":
        return {
          name: "Snowdin",
          type: "snowdin",
          description: "A snowy forest area with puzzles and dog patrols.",
          startPosition: { x: 40, y: 200 },
          obstacles: [
            { x: 150, y: 100, width: 60, height: 40 },
            { x: 300, y: 220, width: 50, height: 50 },
            { x: 450, y: 150, width: 60, height: 60 }
          ],
          exits: [
            { x: 0, y: 180, width: 20, height: 80, targetArea: "The Ruins", targetPosition: { x: 580, y: 200 } },
            { x: 600, y: 180, width: 40, height: 80, targetArea: "Waterfall", targetPosition: { x: 40, y: 200 } }
          ],
          npcs: [],
          encounters: {
            chance: 0.03,
            monsters: ["Snowdrake", "Ice Cap", "Doggo"]
          }
        };
        
      case "Waterfall":
        return {
          name: "Waterfall",
          type: "waterfall",
          description: "Dark caverns filled with glowing crystals and flowing water.",
          startPosition: { x: 40, y: 200 },
          obstacles: [
            { x: 120, y: 80, width: 80, height: 40 },
            { x: 280, y: 180, width: 70, height: 70 },
            { x: 400, y: 120, width: 60, height: 60 }
          ],
          exits: [
            { x: 0, y: 180, width: 20, height: 80, targetArea: "Snowdin", targetPosition: { x: 580, y: 200 } }
          ],
          npcs: [],
          encounters: {
            chance: 0.03,
            monsters: ["Aaron", "Woshua", "Temmie"]
          }
        };
        
      default:
        return this.getStartingArea();
    }
  },
  
  startOverworldLoop(appContext) {
    // Clear any existing loop
    this.clearOverworldLoop();
    
    const updateOverworld = () => {
      if (appContext.currentScreen !== 'overworld' || appContext.showOverworldDialog) {
        overworldLoopId = requestAnimationFrame(updateOverworld);
        return;
      }
      
      // Movement
      this.handlePlayerMovement(appContext);
      
      // Random encounters
      this.checkForRandomEncounter(appContext);
      
      overworldLoopId = requestAnimationFrame(updateOverworld);
    };
    
    overworldLoopId = requestAnimationFrame(updateOverworld);
  },
  
  clearOverworldLoop() {
    if (overworldLoopId) {
      cancelAnimationFrame(overworldLoopId);
      overworldLoopId = null;
    }
  },
  
  handlePlayerMovement(appContext) {
    const player = appContext.player.overworld;
    const speed = player.speed;
    let newX = player.x;
    let newY = player.y;
    
    // Calculate new position
    if (appContext.keys.up) {
      newY -= speed;
      player.facing = 'up';
    } else if (appContext.keys.down) {
      newY += speed;
      player.facing = 'down';
    }
    
    if (appContext.keys.left) {
      newX -= speed;
      player.facing = 'left';
    } else if (appContext.keys.right) {
      newX += speed;
      player.facing = 'right';
    }
    
    // Check if moved
    const hasMoved = newX !== player.x || newY !== player.y;
    
    // Check for collisions with obstacles
    const willCollideX = this.checkObstacleCollision(appContext, newX, player.y);
    const willCollideY = this.checkObstacleCollision(appContext, player.x, newY);
    
    // Check for area exit
    const exit = this.checkAreaExit(appContext, newX, newY);
    if (exit) {
      this.changeArea(appContext, exit.targetArea, exit.targetPosition);
      return;
    }
    
    // Apply movement if no collision
    if (!willCollideX) player.x = newX;
    if (!willCollideY) player.y = newY;
    
    // Increment steps if moved
    if (hasMoved && !willCollideX && !willCollideY) {
      appContext.stats.steps++;
    }
  },
  
  checkObstacleCollision(appContext, x, y) {
    // Player character dimensions
    const playerWidth = 32;
    const playerHeight = 48;
    
    for (const obstacle of appContext.currentArea.obstacles) {
      if (
        x < obstacle.x + obstacle.width &&
        x + playerWidth > obstacle.x &&
        y < obstacle.y + obstacle.height &&
        y + playerHeight > obstacle.y
      ) {
        return true;
      }
    }
    
    // Also prevent going outside the game area
    if (
      x < 0 ||
      x + playerWidth > 640 ||
      y < 0 ||
      y + playerHeight > 408 // 85% of 480px height
    ) {
      return true;
    }
    
    return false;
  },
  
  checkAreaExit(appContext, x, y) {
    const playerWidth = 32;
    const playerHeight = 48;
    
    for (const exit of appContext.currentArea.exits) {
      if (
        x < exit.x + exit.width &&
        x + playerWidth > exit.x &&
        y < exit.y + exit.height &&
        y + playerHeight > exit.y
      ) {
        return exit;
      }
    }
    
    return null;
  },
  
  changeArea(appContext, areaName, targetPosition) {
    appContext.currentArea = this.getArea(areaName);
    
    // Position player at the target position
    appContext.player.overworld.x = targetPosition.x;
    appContext.player.overworld.y = targetPosition.y;
    
    // Show area transition message
    appContext.showOverworldDialog = true;
    appContext.dialogQueue = [`* You have entered ${areaName}.`];
    appContext.showNextDialog();
  },
  
  checkForRandomEncounter(appContext) {
    // Only check when player is moving
    const isMoving = appContext.keys.up || appContext.keys.down || 
                     appContext.keys.left || appContext.keys.right;
    
    if (!isMoving) return;
    
    const area = appContext.currentArea;
    if (!area.encounters) return;
    
    // Check for encounter
    if (Math.random() < area.encounters.chance) {
      // Start battle with a random monster from the area
      const monsters = area.encounters.monsters;
      if (monsters && monsters.length > 0) {
        const randomMonster = monsters[Math.floor(Math.random() * monsters.length)];
        appContext.startBattle(randomMonster);
      } else {
        appContext.startBattle(); // Fallback to random monster
      }
    }
  },
  
  interact(appContext) {
    // Check if there's something to interact with in front of the player
    const player = appContext.player.overworld;
    let interactX = player.x;
    let interactY = player.y;
    const interactDistance = 40; // Detection distance
    
    // Calculate position to check based on facing direction
    switch (player.facing) {
      case 'up':
        interactY -= interactDistance;
        break;
      case 'down':
        interactY += interactDistance;
        break;
      case 'left':
        interactX -= interactDistance;
        break;
      case 'right':
        interactX += interactDistance;
        break;
    }
    
    // Check for NPCs
    const npc = this.findInteractableNPC(appContext, interactX, interactY);
    if (npc) {
      // Show NPC dialog
      npc.interactionCount = (npc.interactionCount || 0) + 1;
      dialogService.showDialogInOverworld(appContext, npc.dialog);
      return;
    }
    
    // Check if we're on a save point
    if (this.isOnSavePoint(appContext, player.x, player.y)) {
      // Heal player and show save message
      appContext.player.hp = appContext.player.maxHp;
      dialogService.showDialogInOverworld(appContext, [
        "* The shadow of the ruins looms above, filling you with determination.",
        "* HP fully restored.",
        "* Game saved."
      ]);
      return;
    }
    
    // If nothing to interact with, show an appropriate message based on the area
    let areaMessage;
    switch(appContext.currentArea.type) {
      case 'ruins':
        areaMessage = ["* The ruins stretch ahead of you.", "* Ancient puzzles await your solving."];
        break;
      case 'snowdin':
        areaMessage = ["* The snow crunches beneath your feet.", "* A cool breeze blows through the trees."];
        break;
      case 'waterfall':
        areaMessage = ["* The sound of flowing water fills the cavern.", "* Glowing crystals dot the ceiling."];
        break;
      default:
        areaMessage = ["* You look around but see nothing of interest."];
    }
    
    dialogService.showDialogInOverworld(appContext, areaMessage);
  },
  
  findInteractableNPC(appContext, x, y) {
    if (!appContext.currentArea.npcs) return null;
    
    // Player character dimensions for interaction checking
    const interactionRadius = 40;
    
    for (const npc of appContext.currentArea.npcs) {
      // Simple distance-based detection
      const dx = (npc.x + (npc.width/2)) - (x + 16); // 16 is half of player width
      const dy = (npc.y + (npc.height/2)) - (y + 24); // 24 is half of player height
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      if (distance < interactionRadius) {
        return npc;
      }
    }
    
    return null;
  },
  
  isOnSavePoint(appContext, x, y) {
    // Simple check for save points (could be expanded to use actual coordinates)
    const savePoints = [
      { x: 320, y: 200, radius: 40 }  // Example save point location
    ];
    
    for (const point of savePoints) {
      const dx = point.x - (x + 16); // 16 is half of player width
      const dy = point.y - (y + 24); // 24 is half of player height
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      if (distance < point.radius) {
        return true;
      }
    }
    
    return false;
  }
};