// gameData.js - Stores game constants and static content

export const gameData = {
  // Items
  items: {
    monsterCandy: {
      name: 'Monster Candy',
      type: 'heal',
      value: 10,
      description: 'Heals 10 HP. Has a distinct, non-licorice flavor.'
    },
    butterscotchPie: {
      name: 'Butterscotch Pie',
      type: 'heal',
      value: 0, // 0 means full heal
      description: 'Heals all HP. A butterscotch-cinnamon pie.'
    },
    toughGlove: {
      name: 'Tough Glove',
      type: 'equipment',
      equipType: 'weapon',
      value: 5,
      description: 'A worn pink leather glove. For five-fingered folk.'
    },
    oldTutu: {
      name: 'Old Tutu',
      type: 'equipment',
      equipType: 'armor',
      value: 7,
      description: 'A faded tutu with a silky bow.'
    }
  },
  
  // Script dialog for various areas
  scripts: {
    ruins: {
      entrance: [
        "* The shadow of the ruins looms above, filling you with determination.",
        "* HP fully restored."
      ],
      explore: [
        "* The ruins are quiet and mysterious.",
        "* Ancient puzzles await your solving.",
        "* You feel like you're being watched."
      ]
    },
    snowdin: {
      entrance: [
        "* The cold air of Snowdin fills your lungs.",
        "* You feel determined to continue your journey."
      ],
      explore: [
        "* The snow crunches beneath your feet.",
        "* A cool breeze blows through the trees.",
        "* You spot paw prints in the snow."
      ]
    },
    waterfall: {
      entrance: [
        "* The sound of rushing water fills you with determination.",
        "* The cavern glows with blue light."
      ],
      explore: [
        "* Glowing crystals dot the ceiling.",
        "* The water seems to glow with a soft blue light.",
        "* You can hear echoes of conversations in the distance."
      ]
    }
  },
  
  // Save point locations
  savePoints: [
    { area: "The Ruins", x: 320, y: 220, radius: 40 },
    { area: "Snowdin", x: 320, y: 220, radius: 40 },
    { area: "Waterfall", x: 320, y: 220, radius: 40 }
  ],
  
  // NPC definitions
  npcs: {
    flowey: {
      name: "Flowey",
      greeting: [
        "* Howdy! I'm FLOWEY. FLOWEY the FLOWER!",
        "* Hmm... You're new to the UNDERGROUND, aren'tcha?"
      ]
    },
    toriel: {
      name: "Toriel",
      greeting: [
        "* Ah, do not be afraid, my child.",
        "* I am TORIEL, caretaker of the RUINS."
      ]
    }
  }
};