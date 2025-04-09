export default {
  soundEffects: {},
  music: {},
  currentMusic: null,
  musicVolume: 0.7,
  soundVolume: 0.8,
  
  init(musicVolume, soundVolume) {
    this.musicVolume = musicVolume / 100;
    this.soundVolume = soundVolume / 100;
    
    // Initialize sound effects
    this.loadSoundEffects();
    
    // Initialize music tracks
    this.loadMusic();
  },
  
  loadSoundEffects() {
    // Define sound effect URLs
    const soundEffectUrls = {
      'menu_select': 'https://freesound.org/data/previews/320/320905_5260872-lq.mp3',
      'dialog': 'https://freesound.org/data/previews/323/323502_5712944-lq.mp3',
      'hit': 'https://freesound.org/data/previews/416/416827_5121236-lq.mp3',
      'button_press': 'https://freesound.org/data/previews/553/553785_12523518-lq.mp3',
      'area_transition': 'https://freesound.org/data/previews/580/580502_11861866-lq.mp3'
    };
    
    // Create Audio objects for each sound effect
    for (const [name, url] of Object.entries(soundEffectUrls)) {
      this.soundEffects[name] = new Audio(url);
      this.soundEffects[name].volume = this.soundVolume;
    }
  },
  
  loadMusic() {
    // Define music track URLs
    const musicUrls = {
      'title': 'https://freesound.org/data/previews/382/382235_7044934-lq.mp3',
      'ruins': 'https://freesound.org/data/previews/622/622722_13377319-lq.mp3',
      'battle': 'https://freesound.org/data/previews/627/627932_12820202-lq.mp3',
      'game_start': 'https://freesound.org/data/previews/132/132015_2398403-lq.mp3'
    };
    
    // Create Audio objects for each music track
    for (const [name, url] of Object.entries(musicUrls)) {
      this.music[name] = new Audio(url);
      this.music[name].loop = true;
      this.music[name].volume = this.musicVolume;
    }
  },
  
  playSound(name) {
    if (this.soundEffects[name]) {
      // Clone the audio to allow overlapping sounds
      const sound = this.soundEffects[name].cloneNode();
      sound.volume = this.soundVolume;
      sound.play();
    }
  },
  
  playMusic(name) {
    // Stop current music if playing
    if (this.currentMusic && this.music[this.currentMusic]) {
      this.music[this.currentMusic].pause();
      this.music[this.currentMusic].currentTime = 0;
    }
    
    // Play new music if it exists
    if (this.music[name]) {
      this.music[name].play();
      this.currentMusic = name;
    }
  },
  
  stopMusic() {
    if (this.currentMusic && this.music[this.currentMusic]) {
      this.music[this.currentMusic].pause();
      this.music[this.currentMusic].currentTime = 0;
      this.currentMusic = null;
    }
  },
  
  setVolume(musicVolume, soundVolume) {
    this.musicVolume = musicVolume / 100;
    this.soundVolume = soundVolume / 100;
    
    // Update music volume
    if (this.currentMusic && this.music[this.currentMusic]) {
      this.music[this.currentMusic].volume = this.musicVolume;
    }
    
    // Update all sound effect volumes
    for (const sound of Object.values(this.soundEffects)) {
      sound.volume = this.soundVolume;
    }
  }
};