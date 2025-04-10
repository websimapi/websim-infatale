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
      areaType: appContext.currentArea ? appContext.currentArea.type : "unknown",
      requestStructure: {
        name: "Monster name (thematic to the " + (appContext.currentArea ? appContext.currentArea.type : "unknown") + " area)",
        description: "Detailed visual description for image generation, themed to match the current area",
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
    // Get area-specific monster instead of generic fallback
    const currentArea = appContext.currentArea ? appContext.currentArea.type : "ruins";
    const level = appContext.player.lv;
    
    // Select appropriate monster based on area
    switch(currentArea) {
      case 'ruins':
        return this.getRandomRuinsMonster(level);
      case 'snowdin':
        return this.getRandomSnowdinMonster(level);
      case 'waterfall':
        return this.getRandomWaterfallMonster(level);
      default:
        return this.getRandomRuinsMonster(level); // Default to ruins
    }
  },
  
  getRandomRuinsMonster(level) {
    const ruinsMonsters = [
      {
        name: "Froggit",
        description: "A frog-like monster with a simple face and curious eyes. It's small but determined.",
        hp: 20 * Math.max(1, level * 0.8),
        attack: 2 * level,
        defense: Math.floor(level * 0.5),
        spareCondition: "Compliment it three times or threaten it once",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Compliment", description: "Say something nice", effect: "increase spare chance" },
          { name: "Threaten", description: "Scare the monster", effect: "increase spare chance" }
        ],
        bulletPatterns: [
          {
            name: "Fly Swarm",
            description: "Small white flies that hop across the bullet box",
            difficulty: 2,
            bulletTypes: ["normal"],
            movements: "Hopping arcs"
          }
        ],
        dialog: {
          intro: ["* Froggit hops into view!"],
          fight: ["* Froggit doesn't seem to understand what's happening."],
          act: {
            "Check": ["* FROGGIT - ATK " + (2 * level) + " DEF " + Math.floor(level * 0.5), "* Life is difficult for this enemy."],
            "Compliment": ["* You compliment the Froggit.", "* It didn't understand what you said, but it was flattered anyway."],
            "Threaten": ["* You threatened the Froggit.", "* It was scared and confused."]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(10 * level) + " gold."],
          defeat: ["* Ribbit..."]
        }
      },
      {
        name: "Whimsun",
        description: "A timid insect-like monster with butterfly wings. It's trembling and looks afraid.",
        hp: 10 * Math.max(1, level * 0.5),
        attack: 1 * level,
        defense: 0,
        spareCondition: "Console it once or simply show mercy",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Console", description: "Comfort the monster", effect: "increase spare chance" },
          { name: "Terrorize", description: "Scare the monster", effect: null }
        ],
        bulletPatterns: [
          {
            name: "Butterfly Flutter",
            description: "Small butterfly-shaped bullets that fly in gentle patterns",
            difficulty: 1,
            bulletTypes: ["normal"],
            movements: "Slow wavy paths"
          }
        ],
        dialog: {
          intro: ["* Whimsun appeared meekly!"],
          fight: ["* Whimsun is trembling."],
          act: {
            "Check": ["* WHIMSUN - ATK " + (1 * level) + " DEF 0", "* This monster is too sensitive to fight..."],
            "Console": ["* You tried to console Whimsun...", "* But it was scared of your words and ran away!"],
            "Terrorize": ["* You raised your arms and waved them wildly!", "* Whimsun is terrified!"]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(5 * level) + " gold."],
          defeat: ["* ...sorry..."]
        }
      },
      {
        name: "Loox",
        description: "A round monster with one large eye. It has horns and appears to be frustrated.",
        hp: 30 * Math.max(1, level * 0.9),
        attack: 3 * level,
        defense: level,
        spareCondition: "Don't pick on it three times",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Don't Pick On", description: "Be nice to Loox", effect: "increase spare chance" },
          { name: "Pick On", description: "Make fun of Loox", effect: null }
        ],
        bulletPatterns: [
          {
            name: "Eye Orbs",
            description: "Circular bullets that bounce around the edges",
            difficulty: 3,
            bulletTypes: ["normal"],
            movements: "Bouncing, ricocheting patterns"
          }
        ],
        dialog: {
          intro: ["* Loox draws near!"],
          fight: ["* Loox is staring right through you."],
          act: {
            "Check": ["* LOOX - ATK " + (3 * level) + " DEF " + level, "* Don't pick on him. Family name: Eyewalker."],
            "Don't Pick On": ["* You finally stopped picking on Loox.", "* It seems relieved."],
            "Pick On": ["* You pick on Loox.", "* Loox is offended you'd even consider it!"]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(15 * level) + " gold."],
          defeat: ["* Finally someone gets it..."]
        }
      }
    ];
    
    return ruinsMonsters[Math.floor(Math.random() * ruinsMonsters.length)];
  },
  
  getRandomSnowdinMonster(level) {
    const snowdinMonsters = [
      {
        name: "Snowdrake",
        description: "A bird-like monster with icy wings and a snowflake-shaped head. Loves to tell jokes.",
        hp: 25 * Math.max(1, level * 0.85),
        attack: 2 * level,
        defense: Math.floor(level * 0.7),
        spareCondition: "Laugh at its jokes three times",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Laugh", description: "Laugh at Snowdrake's joke", effect: "increase spare chance" },
          { name: "Heckle", description: "Make fun of Snowdrake", effect: null }
        ],
        bulletPatterns: [
          {
            name: "Snowflake Storm",
            description: "Snowflake-shaped bullets that rotate while moving",
            difficulty: 3,
            bulletTypes: ["normal"],
            movements: "Spinning, drifting patterns"
          }
        ],
        dialog: {
          intro: ["* Snowdrake flutters forth!"],
          fight: ["* Snowdrake is practicing its comedy."],
          act: {
            "Check": ["* SNOWDRAKE - ATK " + (2 * level) + " DEF " + Math.floor(level * 0.7), "* This teen comedian fights to keep a captive audience."],
            "Laugh": ["* You laugh at Snowdrake's pun.", "* Snowdrake is pleased with its 'cool' joke."],
            "Heckle": ["* You tell Snowdrake its jokes are bad.", "* Snowdrake is determined to prove you wrong!"]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(12 * level) + " gold."],
          defeat: ["* I guess that's... my cue... to leave..."]
        }
      },
      {
        name: "Ice Cap",
        description: "A small monster with an enormous ice hat. Very proud of its headgear.",
        hp: 22 * Math.max(1, level * 0.8),
        attack: 2 * level,
        defense: Math.floor(level * 0.8),
        spareCondition: "Ignore it three times then compliment it",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Compliment", description: "Praise Ice Cap's hat", effect: null },
          { name: "Ignore", description: "Don't look at its hat", effect: "increase spare chance" }
        ],
        bulletPatterns: [
          {
            name: "Ice Crystals",
            description: "Pointed ice shards that form and shoot outward",
            difficulty: 3,
            bulletTypes: ["normal"],
            movements: "Radial patterns from center"
          }
        ],
        dialog: {
          intro: ["* Ice Cap struts into view!"],
          fight: ["* Ice Cap makes sure its hat is still there."],
          act: {
            "Check": ["* ICE CAP - ATK " + (2 * level) + " DEF " + Math.floor(level * 0.8), "* This teen wonders why it isn't named 'Ice Hat.'"],
            "Compliment": ["* You compliment Ice Cap's hat.", "* Ice Cap's hat is improved somehow...?"],
            "Ignore": ["* You ignore Ice Cap.", "* It looks annoyed..."]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(13 * level) + " gold."],
          defeat: ["* My hat... is still... cool..."]
        }
      },
      {
        name: "Doggo",
        description: "A bipedal dog monster in a sentry outfit. Can only see moving things.",
        hp: 35 * Math.max(1, level * 0.9),
        attack: 3 * level,
        defense: Math.floor(level * 0.7),
        spareCondition: "Pet it once or twice",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Pet", description: "Pet the dog", effect: "increase spare chance" },
          { name: "Roll", description: "Roll around on the ground", effect: null }
        ],
        bulletPatterns: [
          {
            name: "Blue Dagger",
            description: "Long blue daggers that require staying still to avoid",
            difficulty: 4,
            bulletTypes: ["blue"],
            movements: "Side-to-side sweeps"
          }
        ],
        dialog: {
          intro: ["* Doggo appears!"],
          fight: ["* Doggo can't seem to find anything."],
          act: {
            "Check": ["* DOGGO - ATK " + (3 * level) + " DEF " + Math.floor(level * 0.7), "* Easily excited by movement. Hobbies include: squirrels."],
            "Pet": ["* You pet Doggo.", "* Doggo has been pet! POT? PAT? PET? PATS! PETTING INTENSIFIES!"],
            "Roll": ["* You roll around on the ground.", "* Doggo thinks you're a weird puppy."]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(18 * level) + " gold."],
          defeat: ["* S-something pet me... something that isn't m-moving..."]
        }
      }
    ];
    
    return snowdinMonsters[Math.floor(Math.random() * snowdinMonsters.length)];
  },
  
  getRandomWaterfallMonster(level) {
    const waterfallMonsters = [
      {
        name: "Aaron",
        description: "A muscular seahorse monster that loves to flex. Has a very confident personality.",
        hp: 40 * Math.max(1, level * 0.9),
        attack: 3 * level,
        defense: Math.floor(level * 0.6),
        spareCondition: "Flex with him three times or clean him once",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Flex", description: "Show off your muscles", effect: "increase spare chance" },
          { name: "Clean", description: "Wash away Aaron's sweat", effect: "increase spare chance" }
        ],
        bulletPatterns: [
          {
            name: "Flexing Arms",
            description: "Muscular arm-shaped bullets that flex and move in waves",
            difficulty: 4,
            bulletTypes: ["normal"],
            movements: "Wavy, undulating patterns"
          }
        ],
        dialog: {
          intro: ["* Aaron flexes in!"],
          fight: ["* Aaron is splashing you with water."],
          act: {
            "Check": ["* AARON - ATK " + (3 * level) + " DEF " + Math.floor(level * 0.6), "* This seahorse has a lot of HP (Horsepower)."],
            "Flex": ["* You flex your arms.", "* Aaron flexes twice as hard. ATTACK increases for both of you!"],
            "Clean": ["* You wash away Aaron's sweat.", "* Aaron seems refreshed."]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(20 * level) + " gold."],
          defeat: ["* Flexing... until the end..."]
        }
      },
      {
        name: "Woshua",
        description: "A small, turtle-like cleaning monster with a bird living in the water basin on its back.",
        hp: 28 * Math.max(1, level * 0.8),
        attack: 2 * level,
        defense: Math.floor(level * 0.9),
        spareCondition: "Let it clean you twice",
        actions: [
          { name: "Check", description: "See monster stats", effect: null },
          { name: "Clean", description: "Ask to be cleaned", effect: "increase spare chance" },
          { name: "Touch", description: "Touch Woshua's soapy body", effect: null }
        ],
        bulletPatterns: [
          {
            name: "Soap Bubbles",
            description: "Circular soap bubbles that float and pop",
            difficulty: 3,
            bulletTypes: ["normal"],
            movements: "Floating, drifting upward"
          }
        ],
        dialog: {
          intro: ["* Woshua shuffles up!"],
          fight: ["* Woshua is thinking about soap."],
          act: {
            "Check": ["* WOSHUA - ATK " + (2 * level) + " DEF " + Math.floor(level * 0.9), "* This germophobe is obsessed with cleanliness."],
            "Clean": ["* You ask Woshua to clean you.", "* Woshua gives you a shower of 'friendliness pellets.'"],
            "Touch": ["* You touch Woshua.", "* Woshua recoils from your touch! 'UNCLEAN!'"]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(15 * level) + " gold."],
          defeat: ["* Wosh... my... soul..."]
        }
      },
      {
        name: "Temmie",
        description: "A cat-like monster with a dog's face. Very excitable and speaks in broken English.",
        hp: 15 * Math.max(1, level * 0.6),
        attack: 1 * level,
        defense: Math.floor(level * 0.3),
        spareCondition: "Flex, check, or talk to it",
        actions: [
          { name: "Check", description: "See monster stats", effect: "increase spare chance" },
          { name: "Talk", description: "Chat with Temmie", effect: "increase spare chance" },
          { name: "Flex", description: "Show your muscles", effect: "increase spare chance" }
        ],
        bulletPatterns: [
          {
            name: "Temmie Flakes",
            description: "Small, colorful flake-shaped bullets that move erratically",
            difficulty: 2,
            bulletTypes: ["normal"],
            movements: "Random, jittery paths"
          }
        ],
        dialog: {
          intro: ["* Temmie appears! hOI!"],
          fight: ["* Temmie is doing her hairs."],
          act: {
            "Check": ["* TEMMIE - ATK " + (1 * level) + " DEF " + Math.floor(level * 0.3), "* Special enemy Temmie. Loves to pet cute humans."],
            "Talk": ["* You say hello to Temmie.", "* Temmie forgot her lines. 'hOI! i'm tEMMIE!'"],
            "Flex": ["* You flex at Temmie...", "* Temmie is impressed by your muscles! 'WOA!! u humans got... MUSCLES!!'"]
          },
          spare: ["* You won! Earned 0 EXP and " + Math.floor(10 * level) + " gold."],
          defeat: ["* tem... DIES!!"]
        }
      }
    ];
    
    return waterfallMonsters[Math.floor(Math.random() * waterfallMonsters.length)];
  },
  
  async generateMonsterSprite(description) {
    try {
      // Generate with solid magenta background for easier transparency removal
      const result = await websim.imageGen({
        prompt: `Undertale-style pixel art sprite of ${description}. Simple flat design with solid magenta (#FF00FF) background, front-facing, 8-bit style, no shading, clearly defined edges.`,
        aspect_ratio: "1:1",
      });
      
      // Process the image to make the magenta background transparent
      return await this.processImageForTransparency(result.url);
    } catch (error) {
      console.error("Error generating sprite:", error);
      // Return a default SVG sprite
      return this.getFallbackSprite();
    }
  },
  
  async processImageForTransparency(imageUrl) {
    try {
      // Create a new image object
      const img = new Image();
      
      // Create a promise to handle the async image loading
      const imageLoaded = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.crossOrigin = "Anonymous"; // Enable CORS for the image
      });
      
      // Set the source to start loading
      img.src = imageUrl;
      
      // Wait for the image to load
      await imageLoaded;
      
      // Create a canvas to process the image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Get the image data to process pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Sample colors from the four corners to determine background color
      const cornerPixels = [
        { x: 0, y: 0 },                              // top-left
        { x: canvas.width - 1, y: 0 },               // top-right
        { x: 0, y: canvas.height - 1 },              // bottom-left
        { x: canvas.width - 1, y: canvas.height - 1 } // bottom-right
      ];
      
      // Get RGB values for each corner
      const cornerColors = cornerPixels.map(pixel => {
        const index = (pixel.y * canvas.width + pixel.x) * 4;
        return {
          r: data[index],
          g: data[index + 1],
          b: data[index + 2]
        };
      });
      
      // Calculate average background color
      const avgBgColor = {
        r: cornerColors.reduce((sum, color) => sum + color.r, 0) / cornerColors.length,
        g: cornerColors.reduce((sum, color) => sum + color.g, 0) / cornerColors.length,
        b: cornerColors.reduce((sum, color) => sum + color.b, 0) / cornerColors.length
      };
      
      // Set threshold for color matching (allow for some variation in the background)
      const threshold = 30;
      
      // Make background transparent by checking each pixel against background color
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if this pixel is within threshold of the background color
        if (
          Math.abs(r - avgBgColor.r) < threshold &&
          Math.abs(g - avgBgColor.g) < threshold &&
          Math.abs(b - avgBgColor.b) < threshold
        ) {
          // Set alpha channel to 0 (transparent)
          data[i + 3] = 0;
        }
      }
      
      // Put the modified image data back on the canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Convert canvas to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("Error processing image:", error);
      return this.getFallbackSprite();
    }
  },
  
  getFallbackSprite() {
    // SVG monster sprite with transparent background
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