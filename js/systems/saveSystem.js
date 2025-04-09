export default {
  saveGame(gameState) {
    try {
      localStorage.setItem('infatale_savedata', JSON.stringify(gameState));
      return true;
    } catch (error) {
      console.error('Error saving game:', error);
      return false;
    }
  },
  
  loadGame() {
    try {
      const savedData = localStorage.getItem('infatale_savedata');
      if (savedData) {
        return JSON.parse(savedData);
      }
      return null;
    } catch (error) {
      console.error('Error loading saved game:', error);
      return null;
    }
  },
  
  hasSavedGame() {
    return localStorage.getItem('infatale_savedata') !== null;
  },
  
  deleteSavedGame() {
    localStorage.removeItem('infatale_savedata');
  }
};

