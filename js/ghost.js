// Ghost AI implementation

import { TILE_SIZE, DIRECTIONS, GHOST_STATES, GHOST_SPEEDS, GHOST_CONFIGS } from './constants.js';

export class Ghost {
  constructor(index) {
    const config = GHOST_CONFIGS[index];
    this.name = config.name;
    this.color = config.color;
    this.homeTile = config.homeTile;
    this.spawnTile = config.spawnTile;
    this.scatterTimerMax = config.scatterTimer;
    this.chaseTimerMax = config.chaseTimer;
    
    this.index = index;
    this.reset();
  }

  reset() {
    this.x = this.spawnTile.x;
    this.y = this.spawnTile.y;
    this.targetX = Math.floor(this.x);
    this.targetY = Math.floor(this.y);
    
    // Blinky starts active, others start inside the house
    if (this.name === 'Blinky') {
      this.state = GHOST_STATES.CHASE;
      this.dir = DIRECTIONS.LEFT;
    } else {
      this.state = GHOST_STATES.HOUSE;
      this.dir = DIRECTIONS.UP;
    }
    
    this.nextDir = DIRECTIONS.NONE;
    this.speed = GHOST_SPEEDS.NORMAL;
    
    // House bounce variables
    this.houseBounceDir = 1;
    this.dotLimit = this.index * 30; // Blinky=0, Pinky=30, Inky=60, Clyde=90
    
    this.frightenedTimer = 0;
    this.targetTile = { x: 0, y: 0 };
  }

  // Set target tile depending on current state and ghost type
  updateTarget(pacman, blinky, dotsEaten) {
    if (this.state === GHOST_STATES.EATEN) {
      // Return to ghost house spawn tile
      this.targetTile = { x: 13, y: 11 };
      return;
    }

    if (this.state === GHOST_STATES.HOUSE) {
      this.targetTile = { x: 13.5, y: 14 };
      return;
    }

    if (this.state === GHOST_STATES.SCATTER) {
      this.targetTile = this.homeTile;
      return;
    }

    // Chase Mode: Each ghost has its unique AI target formula
    if (this.state === GHOST_STATES.CHASE) {
      const px = Math.floor(pacman.x);
      const py = Math.floor(pacman.y);

      switch (this.name) {
        case 'Blinky':
          // Target is Pac-Man directly
          this.targetTile = { x: px, y: py };
          break;

        case 'Pinky':
          // Target is 4 tiles ahead of Pac-man
          this.targetTile = {
            x: px + (pacman.dir.x * 4),
            y: py + (pacman.dir.y * 4)
          };
          // Recreate original arcade overflow bug if Pacman is moving UP
          if (pacman.dir === DIRECTIONS.UP) {
            this.targetTile.x -= 4;
          }
          break;

        case 'Inky':
          // Complex targeting using vector from Blinky to 2 tiles in front of Pac-man
          if (blinky) {
            const bx = Math.floor(blinky.x);
            const by = Math.floor(blinky.y);
            const frontX = px + (pacman.dir.x * 2);
            const frontY = py + (pacman.dir.y * 2);
            
            // Recreate original arcade overflow bug if Pacman is moving UP
            if (pacman.dir === DIRECTIONS.UP) {
              this.targetTile.x -= 2;
            }

            this.targetTile = {
              x: bx + 2 * (frontX - bx),
              y: by + 2 * (frontY - by)
            };
          } else {
            this.targetTile = { x: px, y: py };
          }
          break;

        case 'Clyde':
          // Chases Pacman directly if further than 8 tiles away, otherwise retreats to corner
          const dx = this.x - pacman.x;
          const dy = this.y - pacman.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 8) {
            this.targetTile = { x: px, y: py };
          } else {
            this.targetTile = this.homeTile;
          }
          break;

        default:
          this.targetTile = { x: px, y: py };
      }
    }
  }

  // Get opposite direction to prevent backwards movement
  getOppositeDirection(dir) {
    if (dir === DIRECTIONS.UP) return DIRECTIONS.DOWN;
    if (dir === DIRECTIONS.DOWN) return DIRECTIONS.UP;
    if (dir === DIRECTIONS.LEFT) return DIRECTIONS.RIGHT;
    if (dir === DIRECTIONS.RIGHT) return DIRECTIONS.LEFT;
    return DIRECTIONS.NONE;
  }

  update(pacman, blinky, gameMap, dotsEaten, globalGhostState, isGravityMode) {
    // 1. Manage State speed
    if (this.state === GHOST_STATES.EATEN) {
      this.speed = GHOST_SPEEDS.EATEN;
    } else if (this.state === GHOST_STATES.FRIGHTENED) {
      this.speed = GHOST_SPEEDS.FRIGHTENED;
    } else if (this.state === GHOST_STATES.HOUSE) {
      this.speed = GHOST_SPEEDS.HOUSE;
    } else {
      this.speed = GHOST_SPEEDS.NORMAL;
    }

    // 2. Handle house bounce and release logic
    if (this.state === GHOST_STATES.HOUSE) {
      // Bounce up and down
      this.y += 0.05 * this.houseBounceDir;
      if (this.y > 14.5) {
        this.y = 14.5;
        this.houseBounceDir = -1;
      } else if (this.y < 13.5) {
        this.y = 13.5;
        this.houseBounceDir = 1;
      }

      // Check if we can release
      if (dotsEaten >= this.dotLimit) {
        // Exit house
        this.state = globalGhostState;
        this.x = 13.5;
        this.y = 11;
        this.targetX = 13;
        this.targetY = 11;
        this.dir = DIRECTIONS.LEFT;
      }
      return;
    }

    // 3. Normal pathfinding movement towards targetTile
    const distanceToTargetX = this.targetX - this.x;
    const distanceToTargetY = this.targetY - this.y;
    const distance = Math.sqrt(distanceToTargetX * distanceToTargetX + distanceToTargetY * distanceToTargetY);

    if (distance > 0.01) {
      // Move towards target tile
      const step = Math.min(this.speed, distance);
      this.x += Math.sign(distanceToTargetX) * step;
      this.y += Math.sign(distanceToTargetY) * step;
    } else {
      // Snapped to tile!
      this.x = this.targetX;
      this.y = this.targetY;

      // Portal tunnels wrap
      if (this.x < 0) {
        this.x = 27;
        this.targetX = 27;
      } else if (this.x >= 28) {
        this.x = 0;
        this.targetX = 0;
      }

      // Check if we reached house while eaten
      if (this.state === GHOST_STATES.EATEN && Math.round(this.x) === 13 && Math.round(this.y) === 11) {
        // Return inside house and revive
        this.state = GHOST_STATES.HOUSE;
        this.x = 13.5;
        this.y = 14;
        this.targetX = 13;
        this.targetY = 14;
        this.dir = DIRECTIONS.UP;
        return;
      }

      // Sync state target
      this.updateTarget(pacman, blinky, dotsEaten);

      // Determine next valid direction at this intersection
      const currentX = Math.round(this.x);
      const currentY = Math.round(this.y);
      const oppositeDir = this.getOppositeDirection(this.dir);
      
      const possibleDirs = [DIRECTIONS.UP, DIRECTIONS.LEFT, DIRECTIONS.DOWN, DIRECTIONS.RIGHT];
      let bestDir = DIRECTIONS.NONE;
      
      if (this.state === GHOST_STATES.FRIGHTENED) {
        // Choose random direction
        const validDirs = possibleDirs.filter(d => {
          if (d === oppositeDir) return false;
          const nextTileX = currentX + d.x;
          const nextTileY = currentY + d.y;
          // Ghosts can cross gate when returning eaten, or when entering house, but not normally
          const isGate = gameMap.isGhostGate(nextTileX, nextTileY);
          return !gameMap.isWall(nextTileX, nextTileY) && !isGate;
        });

        if (validDirs.length > 0) {
          bestDir = validDirs[Math.floor(Math.random() * validDirs.length)];
        } else {
          bestDir = oppositeDir; // Fallback
        }
      } else {
        // Pathfinding: Choose direction that minimizes straight-line distance to targetTile
        let minDistance = Infinity;
        
        possibleDirs.forEach(d => {
          // Cannot reverse direction
          if (d === oppositeDir) return;

          const nextTileX = currentX + d.x;
          const nextTileY = currentY + d.y;

          // Check wall / gate validity
          const isWall = gameMap.isWall(nextTileX, nextTileY);
          const isGate = gameMap.isGhostGate(nextTileX, nextTileY);

          // Eaten ghosts can pass the gate to go home
          const allowGate = this.state === GHOST_STATES.EATEN;

          if (!isWall && (!isGate || allowGate)) {
            const dx = nextTileX - this.targetTile.x;
            const dy = nextTileY - this.targetTile.y;
            const dist = dx * dx + dy * dy; // Distance squared is fine for comparison
            
            if (dist < minDistance) {
              minDistance = dist;
              bestDir = d;
            }
          }
        });

        if (bestDir === DIRECTIONS.NONE) {
          bestDir = oppositeDir; // Fallback
        }
      }

      this.dir = bestDir;
      this.targetX = currentX + this.dir.x;
      this.targetY = currentY + this.dir.y;
    }
  }

  // Draw Ghost
  draw(ctx, pulse, frightenedTimer) {
    if (this.state === GHOST_STATES.HOUSE && (this.y > 14.5 || this.y < 13.0)) {
      // Boundary safety clamp for render
      this.y = 14;
    }

    const px = this.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.y * TILE_SIZE + TILE_SIZE / 2;
    const r = TILE_SIZE / 2 - 1;

    ctx.save();

    // 1. Draw Frightened state (blue / white flash)
    if (this.state === GHOST_STATES.FRIGHTENED) {
      const flash = frightenedTimer < 2000 && Math.floor(frightenedTimer / 200) % 2 === 0;
      ctx.fillStyle = flash ? '#FFFFFF' : '#1919D2'; // Flashing blue/white
      ctx.shadowBlur = 6;
      ctx.shadowColor = ctx.fillStyle;

      // Draw Ghost body
      this.drawGhostBody(ctx, px, py, r);

      // Draw frightened face (sad eyes and squiggly mouth)
      ctx.fillStyle = flash ? '#FF0000' : '#FFB8AE'; // Red eyes/mouth or pinkish orange
      ctx.beginPath();
      // Left eye
      ctx.arc(px - 3.5, py - 2.5, 1.5, 0, 2 * Math.PI);
      // Right eye
      ctx.arc(px + 3.5, py - 2.5, 1.5, 0, 2 * Math.PI);
      ctx.fill();

      // Mouth
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 5, py + 4);
      ctx.lineTo(px - 3, py + 2);
      ctx.lineTo(px - 1, py + 4);
      ctx.lineTo(px + 1, py + 2);
      ctx.lineTo(px + 3, py + 4);
      ctx.lineTo(px + 5, py + 2);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // 2. Draw Eaten state (Only eyes returning home)
    if (this.state === GHOST_STATES.EATEN) {
      this.drawGhostEyes(ctx, px, py);
      ctx.restore();
      return;
    }

    // 3. Normal State (Chase / Scatter)
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;

    // Body
    this.drawGhostBody(ctx, px, py, r);
    
    // Eyes
    this.drawGhostEyes(ctx, px, py);

    ctx.restore();
  }

  // Draw classic ghost shape
  drawGhostBody(ctx, x, y, r) {
    ctx.beginPath();
    // Rounded head
    ctx.arc(x, y - 1, r, Math.PI, 0, false);
    // Left/Right sides
    ctx.lineTo(x + r, y + r);
    
    // Wavy bottom skirt (arcade style)
    const waveCount = 3;
    const waveWidth = (r * 2) / waveCount;
    const bottomY = y + r;
    
    // Wobble animation based on position
    const wobble = Math.sin(this.x * 2 + this.y * 2) * 1.5;

    for (let i = 0; i < waveCount; i++) {
      const waveX = x + r - (i * waveWidth);
      ctx.quadraticCurveTo(
        waveX - waveWidth / 2, 
        bottomY + 3 + wobble, 
        waveX - waveWidth, 
        bottomY
      );
    }
    
    ctx.lineTo(x - r, y - 1);
    ctx.closePath();
    ctx.fill();
  }

  // Draw moving pupils looking in direction
  drawGhostEyes(ctx, x, y) {
    ctx.fillStyle = '#FFFFFF';
    
    // Sclera (White base)
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 2, 3, 0, 2 * Math.PI);
    ctx.arc(x + 3.5, y - 2, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Pupils (Blue dots looking in direction)
    ctx.fillStyle = '#0000FF';
    let px = 0;
    let py = 0;

    if (this.dir === DIRECTIONS.UP) py = -1.5;
    else if (this.dir === DIRECTIONS.DOWN) py = 1.5;
    else if (this.dir === DIRECTIONS.LEFT) px = -1.5;
    else if (this.dir === DIRECTIONS.RIGHT) px = 1.5;

    ctx.beginPath();
    ctx.arc(x - 3.5 + px, y - 2 + py, 1.5, 0, 2 * Math.PI);
    ctx.arc(x + 3.5 + px, y - 2 + py, 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }
}
