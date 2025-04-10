// dialogService.js - Handles dialog display and progression

export const dialogService = {
  showDialog(appContext, texts) {
    appContext.showDialog = true;
    appContext.dialogQueue = Array.isArray(texts) ? [...texts] : [texts];
    this.showNextDialog(appContext);
  },
  
  showDialogInOverworld(appContext, texts) {
    appContext.showOverworldDialog = true;
    appContext.dialogQueue = Array.isArray(texts) ? [...texts] : [texts];
    this.showNextDialog(appContext);
  },
  
  showNextDialog(appContext) {
    if (appContext.dialogQueue.length === 0) {
      appContext.dialogComplete = true;
      return;
    }
    
    const nextDialog = appContext.dialogQueue.shift();
    appContext.currentDialog = '';
    appContext.currentDialogIndex = 0;
    appContext.dialogComplete = false;
    
    this.typeDialog(appContext, nextDialog);
  },
  
  typeDialog(appContext, text) {
    if (!appContext.currentDialogIndex) {
      appContext.currentDialogIndex = 0;
    }
    
    if (appContext.currentDialogIndex < text.length) {
      appContext.currentDialog += text.charAt(appContext.currentDialogIndex);
      appContext.currentDialogIndex++;
      
      // Allow for different typing speeds
      const typingSpeed = 30; // ms per character
      
      // Add a longer pause for punctuation
      const char = text.charAt(appContext.currentDialogIndex - 1);
      const pauseTime = (char === '.' || char === '?' || char === '!') ? 
                        typingSpeed * 3 : typingSpeed;
                        
      setTimeout(() => this.typeDialog(appContext, text), pauseTime);
    } else {
      appContext.dialogComplete = true;
    }
  },
  
  progressDialog(appContext) {
    if (appContext.dialogQueue.length > 0) {
      this.showNextDialog(appContext);
    } else {
      // If no more dialog, close the dialog box
      if (appContext.showOverworldDialog) {
        appContext.showOverworldDialog = false;
      } else {
        appContext.showDialog = false;
      }
      
      // Reset the dialog state
      appContext.currentDialog = '';
      appContext.dialogComplete = false;
    }
  }
};