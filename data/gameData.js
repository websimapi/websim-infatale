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
      ]
    },
    snowdin: {
      entrance: [
        "* The cold air of Snowdin fills your lungs.",
        "* You feel determined to continue your journey."
      ]
    }
  },
  
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