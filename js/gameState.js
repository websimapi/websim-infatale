export default {
  data() {
    return {
      currentScreen: 'title',
      showDialog: false,
      currentDialog: '',
      dialogComplete: false,
      dialogQueue: [],
      
      player: {
        name: 'PLAYER',
        lv: 1,
        hp: 20,
        maxHp: 20,
        exp: 0,
        gold: 0,
        x: 320, 
        y: 240,
        inventory: [
          { name: 'Monster Candy', type: 'heal', value: 10 },
          { name: 'Butterscotch Pie', type: 'heal', value: 20 }
        ],
        equipment: null,
        stats: {
          attack: 5,
          defense: 5
        },
        flags: {
          monstersSaved: 0,
          monstersDefeated: 0,
          progressFlags: {}
        }
      },
      
      currentArea: null,
      areas: [],
      nearSavePoint: false,
      interactingWithNPC: null,
      
      battleState: 'menu',
      currentMonster: null,
      selectedAction: null,
      
      keys: {
        up: false,
        down: false,
        left: false,
        right: false,
        z: false,
        x: false
      }
    };
  },
  
  methods: {
    resetGameState() {
      this.player = {
        name: 'PLAYER',
        lv: 1,
        hp: 20,
        maxHp: 20,
        exp: 0,
        gold: 0,
        x: 320,
        y: 240,
        inventory: [
          { name: 'Monster Candy', type: 'heal', value: 10 },
          { name: 'Butterscotch Pie', type: 'heal', value: 20 }
        ],
        equipment: null,
        stats: {
          attack: 5,
          defense: 5
        },
        flags: {
          monstersSaved: 0,
          monstersDefeated: 0,
          progressFlags: {}
        }
      };
      
      this.initializeAreas();
      this.currentArea = this.areas[0];
    },
    
    initializeAreas() {
      this.areas = [
        {
          id: 'ruins_entrance',
          name: 'Ruins - Entrance',
          type: 'ruins',
          music: 'ruins',
          objects: [
            { type: 'wall', x: 0, y: 0, width: 640, height: 20 },
            { type: 'wall', x: 0, y: 460, width: 640, height: 20 },
            { type: 'wall', x: 0, y: 0, width: 20, height: 480 },
            { type: 'wall', x: 620, y: 0, width: 20, height: 480 },
            { type: 'save', x: 320, y: 240, width: 16, height: 16 }
          ],
          npcs: [
            { 
              type: 'guide', 
              x: 400, 
              y: 200,
              dialog: [
                "* Welcome to the RUINS.",
                "* My name is GUIDE. I'll help you navigate this place.",
                "* Touch the glowing SAVE point to heal and record your progress."
              ]
            }
          ],
          transitions: [
            { 
              x: 320, 
              y: 460, 
              width: 100, 
              height: 20, 
              targetArea: 'ruins_puzzle1', 
              targetX: 320, 
              targetY: 40 
            }
          ]
        },
        {
          id: 'ruins_puzzle1',
          name: 'Ruins - Puzzle Room',
          type: 'ruins',
          music: 'ruins',
          objects: [
            { type: 'wall', x: 0, y: 0, width: 640, height: 20 },
            { type: 'wall', x: 0, y: 460, width: 640, height: 20 },
            { type: 'wall', x: 0, y: 0, width: 20, height: 480 },
            { type: 'wall', x: 620, y: 0, width: 20, height: 480 },
            { type: 'button', x: 200, y: 200, width: 30, height: 30 },
            { type: 'button', x: 400, y: 200, width: 30, height: 30 },
            { type: 'door', x: 320, y: 460, width: 60, height: 20, locked: true }
          ],
          npcs: [],
          transitions: [
            { 
              x: 320, 
              y: 0, 
              width: 100, 
              height: 20, 
              targetArea: 'ruins_entrance', 
              targetX: 320, 
              targetY: 440 
            }
          ]
        }
      ];
    },
    
    getGameState() {
      return {
        player: this.player,
        currentAreaId: this.currentArea.id,
        areas: this.areas,
        timestamp: Date.now()
      };
    },
    
    loadGameState(savedData) {
      this.player = savedData.player;
      this.areas = savedData.areas;
      this.currentArea = this.areas.find(area => area.id === savedData.currentAreaId);
    }
  }
};