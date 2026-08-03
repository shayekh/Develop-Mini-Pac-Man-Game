// Main Game Controller for Pac-Man

import { TILE_SIZE, DIRECTIONS, GAME_STATES, GHOST_STATES, POINTS } from './constants.js';
import { GameMap } from './map.js';
import { Pacman } from './pacman.js';
import { Ghost } from './ghost.js';
import { gameAudio } from './audio.js';

class GameController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.state = GAME_STATES.START_MENU;
    
    this.map = new GameMap();
    this.pacman = new Pacman();
    this.ghosts = [
      new Ghost(0), // Blinky
      new Ghost(1), // Pinky
      new Ghost(2), // Inky
      new Ghost(3)  // Clyde
    ];

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pacman_high_score')) || 0;
    this.level = 1;
    this.lives = 3;
    
    this.isGravityMode = false;
    this.difficulty = 'Medium'; // Slow, Medium, Hard
    this.ghostSpeedMultiplier = 1.0;

    // Timers
    this.stateTimer = 0; // Tracks frames in current sub-state
    this.globalGhostState = GHOST_STATES.SCATTER;
    this.ghostStateTimer = 0;
    this.frightenedTimer = 0;
    this.frightenedGhostMultiplier = 0; // Tracks points scale for consecutive ghost eating

    // Polish animations
    this.pulseCounter = 0;
    this.pulse = true; // Flashes power pellets

    // Freeze frames (for ghost eating impact)
    this.freezeFrames = 0;
    this.freezeText = '';
    this.freezeX = 0;
    this.freezeY = 0;

    // Controls mapping
    this.keys = {};
  }

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 28 * TILE_SIZE;
    this.canvas.height = 31 * TILE_SIZE;

    this.setupInputListeners();
    this.updateScoresUI();
  }

  setGravityMode(enabled) {
    this.isGravityMode = enabled;
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    if (diff === 'Slow') this.ghostSpeedMultiplier = 0.8;
    else if (diff === 'Medium') this.ghostSpeedMultiplier = 1.0;
    else if (diff === 'Hard') this.ghostSpeedMultiplier = 1.2;
  }

  setupInputListeners() {
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;

      // Prevent scrolling keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (this.state === GAME_STATES.PLAYING) {
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
          this.pacman.setNextDirection(DIRECTIONS.UP);
        } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
          this.pacman.setNextDirection(DIRECTIONS.DOWN);
        } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
          this.pacman.setNextDirection(DIRECTIONS.LEFT);
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
          this.pacman.setNextDirection(DIRECTIONS.RIGHT);
        } else if (e.key === ' ' || e.key === 'Escape') {
          this.togglePause();
        }
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.key] = false;
    });

    // Touch controls D-pad binding
    const bindTouchButton = (btnId, dir) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('touchstart', e => {
          e.preventDefault();
          gameAudio.resume();
          if (this.state === GAME_STATES.PLAYING) {
            this.pacman.setNextDirection(dir);
          }
        }, { passive: false });
        btn.addEventListener('mousedown', e => {
          e.preventDefault();
          gameAudio.resume();
          if (this.state === GAME_STATES.PLAYING) {
            this.pacman.setNextDirection(dir);
          }
        });
      }
    };

    bindTouchButton('btn-up', DIRECTIONS.UP);
    bindTouchButton('btn-down', DIRECTIONS.DOWN);
    bindTouchButton('btn-left', DIRECTIONS.LEFT);
    bindTouchButton('btn-right', DIRECTIONS.RIGHT);
  }

  startNewGame() {
    gameAudio.resume();
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.pacman.lives = 3;
    this.map.reset();
    this.resetCharacters();
    
    this.state = GAME_STATES.READY_SPLASH;
    this.stateTimer = 0;
    
    gameAudio.playStart();
    this.updateScoresUI();
    this.hideOverlayMenu();
  }

  // Resets character positions when starting level or losing life
  resetCharacters() {
    this.pacman.reset();
    this.ghosts.forEach(ghost => ghost.reset());
    this.globalGhostState = GHOST_STATES.SCATTER;
    this.ghostStateTimer = 0;
    this.frightenedTimer = 0;
    this.freezeFrames = 0;
  }

  nextLevel() {
    this.level++;
    this.map.reset();
    this.resetCharacters();
    this.state = GAME_STATES.READY_SPLASH;
    this.stateTimer = 0;
    gameAudio.playStart();
    this.updateScoresUI();
  }

  togglePause() {
    if (this.state === GAME_STATES.PLAYING) {
      this.state = GAME_STATES.PAUSED;
      gameAudio.stopSiren();
      this.showPauseOverlay();
    } else if (this.state === GAME_STATES.PAUSED) {
      this.state = GAME_STATES.PLAYING;
      this.hidePauseOverlay();
      if (this.frightenedTimer > 0) {
        gameAudio.startFrightenedSiren();
      } else {
        gameAudio.startSiren(this.ghostSpeedMultiplier);
      }
    }
  }

  handleDeath() {
    this.lives--;
    this.pacman.lives = this.lives;
    this.pacman.isDying = true;
    this.pacman.deathFrame = 0;
    this.stateTimer = 0;
    gameAudio.stopSiren();
    gameAudio.playDeath();
    this.updateScoresUI();
  }

  update() {
    // Pulse counter for flashing power pellets
    this.pulseCounter++;
    if (this.pulseCounter % 15 === 0) {
      this.pulse = !this.pulse;
    }

    if (this.state === GAME_STATES.READY_SPLASH) {
      this.stateTimer++;
      // Wait for sound introduction to complete (~4.2 seconds / 260 frames)
      if (this.stateTimer > 260) {
        this.state = GAME_STATES.PLAYING;
        gameAudio.startSiren(this.ghostSpeedMultiplier);
      }
      return;
    }

    if (this.state === GAME_STATES.LEVEL_COMPLETE) {
      this.stateTimer++;
      if (this.stateTimer > 120) {
        this.nextLevel();
      }
      return;
    }

    if (this.state === GAME_STATES.GAME_OVER) {
      this.stateTimer++;
      if (this.stateTimer > 180) {
        this.state = GAME_STATES.START_MENU;
        this.showOverlayMenu();
      }
      return;
    }

    if (this.state !== GAME_STATES.PLAYING) return;

    // Handle Freeze Frame effect (on eating ghosts)
    if (this.freezeFrames > 0) {
      this.freezeFrames--;
      
      // Still update eaten ghost eyes so they return home during freeze frame
      this.ghosts.forEach(ghost => {
        if (ghost.state === GHOST_STATES.EATEN) {
          ghost.update(this.pacman, this.ghosts[0], this.map, this.map.dotsEaten, this.globalGhostState, this.isGravityMode);
        }
      });
      return;
    }

    // --- GAME ENGINE LOGIC ---

    this.map.update();

    // Update Pac-man
    this.pacman.update(this.map, this.isGravityMode);

    // Update global scatter/chase timing patterns
    if (this.frightenedTimer > 0) {
      this.frightenedTimer -= 1000 / 60; // 60fps time decrease
      if (this.frightenedTimer <= 0) {
        // Return frightened ghosts back to normal chase/scatter
        this.frightenedTimer = 0;
        gameAudio.stopSiren();
        gameAudio.startSiren(this.ghostSpeedMultiplier);
        this.ghosts.forEach(ghost => {
          if (ghost.state === GHOST_STATES.FRIGHTENED) {
            ghost.state = this.globalGhostState;
          }
        });
      }
    } else {
      this.ghostStateTimer++;
      const scatterTime = 7 * 60; // 7 seconds at 60fps
      const chaseTime = 20 * 60;  // 20 seconds

      if (this.globalGhostState === GHOST_STATES.SCATTER && this.ghostStateTimer > scatterTime) {
        this.globalGhostState = GHOST_STATES.CHASE;
        this.ghostStateTimer = 0;
        this.ghosts.forEach(g => {
          if (g.state === GHOST_STATES.SCATTER) g.state = GHOST_STATES.CHASE;
        });
      } else if (this.globalGhostState === GHOST_STATES.CHASE && this.ghostStateTimer > chaseTime) {
        // Limit scatter cycles to keep game hard
        if (this.level < 5) {
          this.globalGhostState = GHOST_STATES.SCATTER;
          this.ghostStateTimer = 0;
          this.ghosts.forEach(g => {
            if (g.state === GHOST_STATES.CHASE) g.state = GHOST_STATES.SCATTER;
          });
        }
      }
    }

    // Update Ghosts
    this.ghosts.forEach(ghost => {
      // Adjust individual speed limits
      ghost.speed = ghost.speed * this.ghostSpeedMultiplier;
      ghost.update(this.pacman, this.ghosts[0], this.map, this.map.dotsEaten, this.globalGhostState, this.isGravityMode);
    });

    // Check Collisions
    this.handleCollisions();
  }

  handleCollisions() {
    // 1. Pacman eating dots
    const eat = this.map.eatDot(this.pacman.x, this.pacman.y);
    if (eat.points > 0) {
      this.score += eat.points;
      
      if (eat.type === 'dot') {
        gameAudio.playWaka();
      } else if (eat.type === 'power') {
        gameAudio.playPowerPellet();
        this.triggerFrightenedState();
      } else if (eat.type === 'fruit') {
        gameAudio.playPowerPellet(); // Reuse sound
      }

      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('pacman_high_score', this.highScore);
      }
      this.updateScoresUI();

      // Check level cleared
      if (this.map.isCleared()) {
        this.state = GAME_STATES.LEVEL_COMPLETE;
        this.stateTimer = 0;
        gameAudio.stopSiren();
      }
    }

    // 2. Pacman vs Ghosts collision
    this.ghosts.forEach(ghost => {
      if (ghost.state === GHOST_STATES.HOUSE) return;

      const dx = this.pacman.x - ghost.x;
      const dy = this.pacman.y - ghost.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Collision range threshold
      if (dist < 0.6) {
        if (ghost.state === GHOST_STATES.FRIGHTENED) {
          // Eat Ghost!
          ghost.state = GHOST_STATES.EATEN;
          
          this.frightenedGhostMultiplier++;
          const pts = POINTS.GHOST_BASE * Math.pow(2, this.frightenedGhostMultiplier - 1);
          this.score += pts;
          
          if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pacman_high_score', this.highScore);
          }
          this.updateScoresUI();

          // Freeze frame for impact
          this.freezeFrames = 30; // Freeze for 0.5s
          this.freezeText = pts.toString();
          this.freezeX = ghost.x;
          this.freezeY = ghost.y;

          gameAudio.playGhostEat();
        } else if (ghost.state !== GHOST_STATES.EATEN) {
          // Pacman dies!
          this.handleDeath();
        }
      }
    });

    // 3. Pacman death animation update
    if (this.pacman.isDying) {
      if (this.pacman.deathFrame > 75) {
        if (this.lives > 0) {
          this.resetCharacters();
          this.state = GAME_STATES.READY_SPLASH;
          this.stateTimer = 0;
          gameAudio.playStart();
        } else {
          this.state = GAME_STATES.GAME_OVER;
          this.stateTimer = 0;
        }
      }
    }
  }

  triggerFrightenedState() {
    this.frightenedTimer = 7000; // 7 seconds
    this.frightenedGhostMultiplier = 0;
    gameAudio.startFrightenedSiren();
    this.ghosts.forEach(ghost => {
      if (ghost.state !== GHOST_STATES.HOUSE && ghost.state !== GHOST_STATES.EATEN) {
        ghost.state = GHOST_STATES.FRIGHTENED;
      }
    });
  }

  updateScoresUI() {
    document.getElementById('score-val').textContent = this.score.toString().padStart(6, '0');
    document.getElementById('high-score-val').textContent = this.highScore.toString().padStart(6, '0');
    document.getElementById('level-val').textContent = this.level;
    
    // Update Lives icons
    const livesDiv = document.getElementById('lives-icons');
    if (livesDiv) {
      livesDiv.innerHTML = '';
      for (let i = 0; i < this.lives; i++) {
        const pacIcon = document.createElement('div');
        pacIcon.className = 'pacman-life-icon';
        livesDiv.appendChild(pacIcon);
      }
    }
  }

  hideOverlayMenu() {
    const overlay = document.getElementById('menu-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  showOverlayMenu() {
    const overlay = document.getElementById('menu-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  showPauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  hidePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  draw() {
    // Clear screen
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid map paths & walls
    this.map.draw(this.ctx, this.pulse, this.isGravityMode);

    // Draw Pac-man
    this.pacman.draw(this.ctx, this.stateTimer);

    // Draw Ghosts
    this.ghosts.forEach(ghost => {
      ghost.draw(this.ctx, this.pulse, this.frightenedTimer);
    });

    // Draw Freeze frame score text (e.g. "200")
    if (this.state === GAME_STATES.PLAYING && this.freezeFrames > 0) {
      this.ctx.save();
      this.ctx.fillStyle = '#00FFFF';
      this.ctx.font = 'bold 12px "Press Start 2P", Arial';
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowColor = '#00FFFF';
      this.ctx.fillText(
        this.freezeText, 
        this.freezeX * TILE_SIZE + TILE_SIZE / 2, 
        this.freezeY * TILE_SIZE + TILE_SIZE / 2 + 4
      );
      this.ctx.restore();
    }

    // Overlays text
    if (this.state === GAME_STATES.READY_SPLASH) {
      this.ctx.save();
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.font = '16px "Press Start 2P", Courier';
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#FFFF00';
      this.ctx.fillText('READY!', this.canvas.width / 2, 17.5 * TILE_SIZE);
      this.ctx.restore();
    }

    if (this.state === GAME_STATES.GAME_OVER) {
      this.ctx.save();
      this.ctx.fillStyle = '#FF0000';
      this.ctx.font = '16px "Press Start 2P", Courier';
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#FF0000';
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, 17.5 * TILE_SIZE);
      this.ctx.restore();
    }

    if (this.state === GAME_STATES.LEVEL_COMPLETE) {
      this.ctx.save();
      this.ctx.fillStyle = '#00FF00';
      this.ctx.font = '14px "Press Start 2P", Courier';
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = '#00FF00';
      this.ctx.fillText('STAGE CLEARED!', this.canvas.width / 2, 17.5 * TILE_SIZE);
      this.ctx.restore();
    }
  }

  // Main Loop
  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

export const gameController = new GameController();
export default gameController;
