// battleGenerationService.js - Handles monster generation and dialog

export const battleGenerationService = {
  async generateMonster(appContext, monsterType = null) {
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
      throw error;
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
  }
};