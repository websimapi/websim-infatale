import AudioSystem from '../systems/audioSystem.js';

export default {
  methods: {
    handleSaveKeyDown(e) {
      if (e.key === 'z' || e.key === 'Enter') {
        this.saveGame();
        setTimeout(() => {
          this.currentScreen = 'overworld';
        }, 1000);
      } else if (e.key === 'x' || e.key === 'Escape') {
        this.currentScreen = 'overworld';
      }
    }
  },
  
  mounted() {
    if (this.currentScreen === 'save') {
      AudioSystem.playSound('menu_select');
    }
  }
};

