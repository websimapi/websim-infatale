import { createApp } from 'vue';
import { playerService } from './services/playerService.js';
import { battleService } from './services/battleService.js';
import { dialogService } from './services/dialogService.js';
import { overworldService } from './services/overworldService.js';
import { combatService } from './services/combatService.js';
import { gameData } from './data/gameData.js';

const app = createApp({
  data() {
    return {
      currentScreen: 'title',
      previousScreen: null,
      
      // Player data
      player: playerService.getInitialPlayerData(),
      
      // Battle state
      currentMonster: null,
      battleState: 'menu',
      showDialog: false,
      selectedAction: null,
      bullets: [],
      soul: {
        x: 0,
        y: 0,
        speed: 3,
        color: 'red'
      },
      attackLinePosition: 0,
      attackDirection: 1,
      attackSpeed: 3,
      attackZoneWidth: 10,
      attackZonePosition: 45,
      
      // Dialog system
      currentDialog: '',
      dialogComplete: false,
      dialogQueue: [],
      
      // Overworld
      currentArea: null,
      showOverworldDialog: false,
      
      // Menu system
      menuTab: 'stats',
      
      // Game stats
      stats: {
        monstersDefeated: 0,
        monstersSpared: 0,
        steps: 0,
        puzzlesSolved: 0
      },
      
      // Input tracking
      keys: {
        up: false,
        down: false,
        left: false,
        right: false,
        z: false,
        x: false
      },
      
      // Asset loading status
      assetsLoaded: false,
      
      // Services for easy access
      battleService: battleService,
      combatService: combatService
    };
  },
  
  created() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.preloadAssets();
  },
  
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.clearAllGameLoops();
  },
  
  methods: {
    // Asset preloading
    preloadAssets() {
      // Mark assets as loaded for now - in a real game we'd load actual assets here
      this.assetsLoaded = true;
    },
    
    // Game flow methods
    startGame() {
      if (!this.assetsLoaded) {
        // In a real game, we'd show a loading indicator here
        setTimeout(this.startGame, 100);
        return;
      }
      
      this.currentScreen = 'overworld';
      this.currentArea = overworldService.getStartingArea();
      
      // Position player in the starting position
      this.player.overworld.x = this.currentArea.startPosition.x;
      this.player.overworld.y = this.currentArea.startPosition.y;
      
      // Start the overworld game loop
      overworldService.startOverworldLoop(this);
      
      // Show welcome message
      dialogService.showDialogInOverworld(this, [
        "* Welcome to the Underground.",
        "* Use arrow keys to move around.",
        "* Press Z to interact with objects and NPCs.",
        "* Press X to open the menu."
      ]);
    },
    
    restartGame() {
      this.player = playerService.getInitialPlayerData();
      this.stats = {
        monstersDefeated: 0,
        monstersSpared: 0,
        steps: 0,
        puzzlesSolved: 0
      };
      this.currentScreen = 'title';
    },
    
    // Menu methods
    openMenu() {
      this.previousScreen = this.currentScreen;
      this.currentScreen = 'menu';
    },
    
    closeMenu() {
      this.currentScreen = this.previousScreen;
    },
    
    setMenuTab(tab) {
      this.menuTab = tab;
    },
    
    callContact(contact) {
      // Show dialog for calling the contact
      dialogService.showDialog(this, [
        `* (Ring, ring...)`,
        `* ${contact.greeting || 'Hello?'}`
      ]);
    },
    
    // Battle methods
    startBattle(monsterType = null) {
      this.previousScreen = this.currentScreen;
      this.currentScreen = 'battle';
      this.battleState = 'menu';
      
      // Generate a monster based on area and progression
      battleService.generateMonster(this, monsterType);
    },
    
    selectAction(action) {
      this.selectedAction = action;
      
      if (action === 'fight') {
        battleService.startFightAction(this);
      }
    },
    
    performAct(action) {
      battleService.performAct(this, action);
    },
    
    useItem(item) {
      playerService.useItem(this, item);
    },
    
    performMercy(type) {
      battleService.performMercy(this, type);
    },
    
    checkLevelUp() {
      return playerService.checkLevelUp(this);
    },
    
    // Make sure the showNextDialog method exists for dialogService to use
    showNextDialog() {
      dialogService.showNextDialog(this);
    },
    
    // Generic methods
    clearAllGameLoops() {
      overworldService.clearOverworldLoop();
      battleService.clearBulletHell(this);
    },
    
    // Input Handling 
    handleKeyDown(e) {
      // Prevent default action for arrow keys to avoid page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Ignore repeated keydown events (when key is held down)
      if (e.repeat) return;
      
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          this.keys.up = true;
          break;
        case 'arrowdown':
        case 's':
          this.keys.down = true;
          break;
        case 'arrowleft':
        case 'a':
          this.keys.left = true;
          break;
        case 'arrowright':
        case 'd':
          this.keys.right = true;
          break;
        case 'z':
          this.keys.z = true;
          
          // Handle dialog progression
          if ((this.showDialog || this.showOverworldDialog) && this.dialogComplete) {
            dialogService.progressDialog(this);
          }
          
          // Handle interaction in overworld - but only if not in dialog mode
          else if (this.currentScreen === 'overworld' && !this.showOverworldDialog) {
            overworldService.interact(this);
          }
          break;
        case 'x':
          this.keys.x = true;
          
          // Back out of submenus in battle
          if (this.currentScreen === 'battle' && this.selectedAction) {
            this.selectedAction = null;
          }
          
          // Open menu in overworld
          if (this.currentScreen === 'overworld' && !this.showOverworldDialog) {
            this.openMenu();
          }
          break;
      }
    },
    
    handleKeyUp(e) {
      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          this.keys.up = false;
          break;
        case 'arrowdown':
        case 's':
          this.keys.down = false;
          break;
        case 'arrowleft':
        case 'a':
          this.keys.left = false;
          break;
        case 'arrowright':
        case 'd':
          this.keys.right = false;
          break;
        case 'z':
          this.keys.z = false;
          break;
        case 'x':
          this.keys.x = false;
          break;
      }
    }
  }
});

app.mount('#app');