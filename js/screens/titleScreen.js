import AudioSystem from '../systems/audioSystem.js';

export default {
  methods: {
    handleTitleKeyDown(e) {
      if (e.key === 'z' || e.key === 'Enter') {
        // Start a new game when Z or Enter is pressed on title screen
        this.startNewGame();
      }
    }
  },
  
  mounted() {
    if (this.currentScreen === 'title') {
      // Play title music
      AudioSystem.playMusic('title');
    }
  },
  
  watch: {
    currentScreen(newScreen, oldScreen) {
      if (newScreen === 'title' && oldScreen !== 'title') {
        // Play title music when returning to title screen
        AudioSystem.playMusic('title');
      }
    }
  }
};