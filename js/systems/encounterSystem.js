export default {
  async generateEncounter(areaId, playerLevel) {
    // Determine the monster types for this area
    const areaMonsters = this.getAreaMonsters(areaId);
    
    // Select a random monster type for this encounter
    const monsterType = areaMonsters[Math.floor(Math.random() * areaMonsters.length)];
    
    // Generate monster from LLM
    return this.requestMonsterFromLLM(monsterType, playerLevel);
  },
  
  getAreaMonsters(areaId) {
    // Return appropriate monster types for each area
    if (areaId.includes('ruins')) {
      return ['Froggit', 'Whimsun', 'Loox', 'Vegetoid', 'Migosp'];
    } else if (areaId.includes('snowdin')) {
      return ['Snowdrake', 'Icecap', 'Gyftrot', 'Lesser Dog', 'Greater Dog'];
    } else if (areaId.includes('waterfall')) {
      return ['Aaron', 'Woshua', 'Moldbygg', 'Temmie', 'Shyren'];
    }
    
    // Default monsters if area is unknown
    return ['Mystery Monster', 'Shadow Being', 'Lost Soul'];
  },
  
  async requestMonsterFromLLM(monsterType, playerLevel) {
    // Structure for requesting a monster from the LLM
    const prompt = {
      task: "generate_monster",
      monsterType: monsterType,
      playerLevel: playerLevel,
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
      
      const monsterData = JSON.parse(completion.content);
      
      // Generate monster sprite
      const spriteUrl = await this.generateMonsterSprite(monsterData.description);
      
      return {
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
    } catch (error) {
      console.error("Error generating monster:", error);
      // Fallback monster in case of errors
      return this.getFallbackMonster(monsterType, playerLevel);
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
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='white'/%3E%3Ccircle cx='75' cy='75' r='50' stroke='black' fill='white' stroke-width='2'/%3E%3Ccircle cx='55' cy='65' r='8' fill='black'/%3E%3Ccircle cx='95' cy='65' r='8' fill='black'/%3E%3Cpath d='M55 105 Q75 125 95 105' stroke='black' fill='none' stroke-width='2'/%3E%3C/svg%3E";
    }
  },
  
  getFallbackMonster(monsterType, playerLevel) {
    return {
      name: monsterType || "Unknown Monster",
      hp: 20 * playerLevel,
      maxHp: 20 * playerLevel,
      attack: 2 * playerLevel,
      defense: playerLevel,
      spriteUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='white'/%3E%3Ccircle cx='75' cy='75' r='50' stroke='black' fill='white' stroke-width='2'/%3E%3Ccircle cx='55' cy='65' r='8' fill='black'/%3E%3Ccircle cx='95' cy='65' r='8' fill='black'/%3E%3Cpath d='M55 105 Q75 125 95 105' stroke='black' fill='none' stroke-width='2'/%3E%3C/svg%3E",
      canSpare: false,
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
        intro: ["* A " + monsterType + " appears!"],
        fight: ["* The monster looks worried."],
        act: {
          "Check": [`* ${monsterType.toUpperCase()} - ATK ${2 * playerLevel} DEF ${playerLevel}`],
          "Compliment": ["* You said something nice.", "* The monster seems happier."]
        },
        spare: ["* Thank you for sparing me!"],
        defeat: ["* Why..."]
      }
    };
  }
};