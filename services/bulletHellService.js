// bulletHellService.js - Handles bullet hell mechanics

export const bulletHellService = {
  startBulletHell(appContext) {
    // Reset soul position to center of bullet hell area
    const bulletHellEl = document.querySelector('.bullet-hell');
    if (bulletHellEl) {
      const rect = bulletHellEl.getBoundingClientRect();
      appContext.soul.x = rect.width / 2 - 8; // Center the 16px soul
      appContext.soul.y = rect.height / 2 - 8;
    }
    
    appContext.bullets = [];
    
    // Select a random bullet pattern
    const pattern = this.selectBulletPattern(appContext);
    
    // Generate the bullet pattern
    this.generateBulletPattern(appContext, pattern);
    
    // End enemy turn after a set duration that scales with difficulty
    const difficulty = pattern.difficulty || 3;
    const bulletHellDuration = 3000 + (difficulty * 500); // 3-8 seconds based on difficulty
    
    appContext.bulletHellTimer = setTimeout(() => {
      this.clearBulletHell(appContext);
      appContext.battleState = 'menu';
      appContext.selectedAction = null;
    }, bulletHellDuration);
  },
  
  selectBulletPattern(appContext) {
    if (appContext.currentMonster.bulletPatterns && appContext.currentMonster.bulletPatterns.length > 0) {
      return appContext.currentMonster.bulletPatterns[
        Math.floor(Math.random() * appContext.currentMonster.bulletPatterns.length)
      ];
    }
    
    // Default pattern if none defined
    return {
      name: "Default Pattern",
      description: "Simple bullets from top to bottom",
      difficulty: 2,
      bulletTypes: ["normal"],
      movements: "Straight down"
    };
  },
  
  async generateBulletPattern(appContext, pattern) {
    // Request bullet pattern generation from LLM
    try {
      const prompt = {
        task: "generate_bullet_pattern",
        pattern: pattern,
        bulletHellWidth: 320,
        bulletHellHeight: 150,
        playerLevel: appContext.player.lv,
        requestStructure: {
          bullets: [
            {
              x: "starting x position",
              y: "starting y position",
              width: "bullet width",
              height: "bullet height",
              type: "normal/blue/orange",
              velocityX: "x velocity (can be negative)",
              velocityY: "y velocity (can be negative)",
              accelerationX: "optional x acceleration",
              accelerationY: "optional y acceleration"
            }
          ]
        }
      };
      
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an Undertale-style bullet hell pattern generator. Create patterns that are challenging but fair."
          },
          {
            role: "user",
            content: JSON.stringify(prompt)
          }
        ],
        json: true
      });
      
      let bulletData;
      try {
        bulletData = JSON.parse(completion.content);
        
        // Make sure bullets is an array
        if (!Array.isArray(bulletData.bullets)) {
          throw new Error("Bullets is not an array");
        }
        
        // Set up the bullet pattern
        appContext.bullets = bulletData.bullets.map(bullet => ({
          ...bullet,
          velocityX: bullet.velocityX || 0,
          velocityY: bullet.velocityY || 0,
          accelerationX: bullet.accelerationX || 0,
          accelerationY: bullet.accelerationY || 0
        }));
      } catch (error) {
        console.error("Error parsing bullet data:", error);
        this.generateDefaultBulletPattern(appContext, pattern.difficulty || 2);
      }
    } catch (error) {
      console.error("Error generating bullet pattern:", error);
      this.generateDefaultBulletPattern(appContext, pattern.difficulty || 2);
    }
    
    // Start bullet animation loop
    appContext.bulletHellAnimationId = requestAnimationFrame(() => this.updateBulletHell(appContext));
  },
  
  generateDefaultBulletPattern(appContext, difficulty) {
    // Create a simple pattern with bullets coming from the top
    const bulletCount = 5 + Math.floor(appContext.player.lv / 2) + Math.floor(difficulty);
    
    for (let i = 0; i < bulletCount; i++) {
      appContext.bullets.push({
        x: Math.random() * 300,
        y: -20,
        width: 10,
        height: 10,
        type: 'normal',
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: 1 + Math.random() * difficulty,
        accelerationX: 0,
        accelerationY: 0
      });
    }
  },
  
  updateBulletHell(appContext) {
    // Update soul position based on keyboard input
    const speed = appContext.soul.speed;
    
    if (appContext.keys.up) appContext.soul.y = Math.max(0, appContext.soul.y - speed);
    if (appContext.keys.down) appContext.soul.y = Math.min(134, appContext.soul.y + speed);
    if (appContext.keys.left) appContext.soul.x = Math.max(0, appContext.soul.x - speed);
    if (appContext.keys.right) appContext.soul.x = Math.min(304, appContext.soul.x + speed);
    
    // Update bullet positions
    appContext.bullets.forEach(bullet => {
      // Apply acceleration
      bullet.velocityX += bullet.accelerationX || 0;
      bullet.velocityY += bullet.accelerationY || 0;
      
      // Update position
      bullet.x += bullet.velocityX;
      bullet.y += bullet.velocityY;
      
      // Check collision with soul
      if (this.checkCollision(appContext, bullet)) {
        this.handleBulletCollision(appContext, bullet);
      }
    });
    
    // Remove bullets that are out of bounds
    appContext.bullets = appContext.bullets.filter(bullet => 
      bullet.x > -50 && bullet.x < 370 && 
      bullet.y > -50 && bullet.y < 200
    );
    
    // Continue the animation loop if battle state is still bulletHell
    if (appContext.battleState === 'bulletHell') {
      appContext.bulletHellAnimationId = requestAnimationFrame(() => this.updateBulletHell(appContext));
    }
  },
  
  checkCollision(appContext, bullet) {
    // Simple AABB collision detection
    return (
      appContext.soul.x < bullet.x + bullet.width &&
      appContext.soul.x + 16 > bullet.x &&
      appContext.soul.y < bullet.y + bullet.height &&
      appContext.soul.y + 16 > bullet.y
    );
  },
  
  handleBulletCollision(appContext, bullet) {
    // Special bullet type handling
    const isMoving = appContext.keys.up || appContext.keys.down || 
                     appContext.keys.left || appContext.keys.right;
                     
    // Blue bullets only hurt you if you're moving
    if (bullet.type === 'blue' && !isMoving) {
      return;
    }
    
    // Orange bullets only hurt you if you're NOT moving
    if (bullet.type === 'orange' && isMoving) {
      return;
    }
    
    // Apply damage, mitigated by defense
    const defense = appContext.player.equipment?.armor?.def || 0;
    const damage = Math.max(1, Math.floor(
      (appContext.currentMonster?.attack || 1) - (defense * 0.2)
    ));
    
    appContext.player.hp -= damage;
    
    // Flash the soul
    const soulEl = appContext.$refs.soulElement;
    if (soulEl) {
      soulEl.style.opacity = 0.5;
      setTimeout(() => {
        if (soulEl) { 
          soulEl.style.opacity = 1;
        }
      }, 100);
    }
    
    // Check for game over
    if (appContext.player.hp <= 0) {
      appContext.player.hp = 0;
      this.clearBulletHell(appContext);
      appContext.currentScreen = 'gameOver';
    }
  },
  
  clearBulletHell(appContext) {
    if (appContext.bulletHellTimer) {
      clearTimeout(appContext.bulletHellTimer);
      appContext.bulletHellTimer = null;
    }
    
    if (appContext.bulletHellAnimationId) {
      cancelAnimationFrame(appContext.bulletHellAnimationId);
      appContext.bulletHellAnimationId = null;
    }
  }
};