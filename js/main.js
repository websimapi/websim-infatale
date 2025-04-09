import { createApp } from 'vue';
import GameState from './gameState.js';
import TitleScreen from './screens/titleScreen.js';
import OverworldScreen from './screens/overworldScreen.js';
import BattleScreen from './screens/battleScreen.js';
import GameOverScreen from './screens/gameOverScreen.js';
import SaveScreen from './screens/saveScreen.js';
import AudioSystem from './systems/audioSystem.js';
import SaveSystem from './systems/saveSystem.js';

const app = createApp({
  mixins: [
    GameState,
    TitleScreen,
    OverworldScreen,
    BattleScreen,
    GameOverScreen,
    SaveScreen
  ],
  
  data() {
    return {
      // Global settings
      settings: {
        musicVolume: 70,
        soundVolume: 80,
        difficulty: 'normal'
      },
      showOptions: false,
      
      // Game timer
      startTime: null,
      currentTime: null,
      playTimeInterval: null
    };
  },
  
  computed: {
    playTime() {
      if (!this.startTime) return '00:00';
      const totalSeconds = Math.floor((this.currentTime - this.startTime) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },
    
    hasSavedGame() {
      return SaveSystem.hasSavedGame();
    }
  },
  
  created() {
    // Initialize audio system
    AudioSystem.init(this.settings.musicVolume, this.settings.soundVolume);
    
    // Load settings if available
    const savedSettings = localStorage.getItem('infatale_settings');
    if (savedSettings) {
      this.settings = JSON.parse(savedSettings);
    }
    
    // Set up global event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    // Start game timer
    this.startTime = Date.now();
    this.currentTime = this.startTime;
    this.playTimeInterval = setInterval(() => {
      this.currentTime = Date.now();
    }, 1000);
  },
  
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    clearInterval(this.playTimeInterval);
  },
  
  methods: {
    // Global game methods
    startNewGame() {
      this.resetGameState();
      this.startTime = Date.now();
      this.currentTime = this.startTime;
      AudioSystem.playMusic('game_start');
      this.currentScreen = 'overworld';
    },
    
    loadGame() {
      const savedData = SaveSystem.loadGame();
      if (savedData) {
        this.loadGameState(savedData);
        AudioSystem.playMusic(this.currentArea.music);
        this.currentScreen = 'overworld';
      }
    },
    
    saveSettings() {
      localStorage.setItem('infatale_settings', JSON.stringify(this.settings));
      AudioSystem.setVolume(this.settings.musicVolume, this.settings.soundVolume);
      this.showOptions = false;
    },
    
    saveGame() {
      const saveData = this.getGameState();
      SaveSystem.saveGame(saveData);
      this.showDialog = true;
      this.dialogQueue = ["* Game saved."];
      this.showNextDialog();
    },
    
    handleKeyDown(e) {
      // Handle screen-specific key inputs through mixin methods
      if (this.currentScreen === 'title') {
        this.handleTitleKeyDown(e);
      } else if (this.currentScreen === 'overworld') {
        this.handleOverworldKeyDown(e);
      } else if (this.currentScreen === 'battle') {
        this.handleBattleKeyDown(e);
      } else if (this.currentScreen === 'save') {
        this.handleSaveKeyDown(e);
      }
      
      // Global key handlers
      if (e.key === 'Escape') {
        if (this.currentScreen === 'overworld' || this.currentScreen === 'battle') {
          this.showOptions = true;
        }
      }
    },
    
    handleKeyUp(e) {
      if (this.currentScreen === 'overworld') {
        this.handleOverworldKeyUp(e);
      } else if (this.currentScreen === 'battle') {
        this.handleBattleKeyUp(e);
      }
    }
  }
});

app.mount('#app');