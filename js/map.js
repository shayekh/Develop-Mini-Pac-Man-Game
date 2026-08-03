// Grid Map manager for Pac-Man board

import { INITIAL_MAP, TILE_SIZE } from './constants.js';

export class GameMap {
  constructor() {
    this.grid = [];
    this.totalDots = 0;
    this.dotsEaten = 0;
    this.fruitSpawned = false;
    this.fruitActive = false;
    this.fruitTimer = 0;
    this.fruitTile = { x: 13.5, y: 17 }; // Below the ghost house
    this.reset();
  }

  // Reset/Re-initialize map
  reset() {
    this.grid = INITIAL_MAP.map(row => [...row]);
    this.totalDots = 0;
    this.dotsEaten = 0;
    this.fruitSpawned = false;
    this.fruitActive = false;
    this.fruitTimer = 0;

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const tile = this.grid[r][c];
        if (tile === 2 || tile === 3) {
          this.totalDots++;
        }
      }
    }
  }

  // Check if a specific coordinate is inside a wall (takes tile coordinates)
  isWall(x, y) {
    // Treat coordinates outside the grid as pathways (tunnels connect)
    if (x < 0 || x >= this.grid[0].length) return false;
    if (y < 0 || y >= this.grid.length) return true; // Clamp top/bottom walls

    return this.grid[Math.floor(y)][Math.floor(x)] === 1;
  }

  // Check for ghost gate (only ghosts can cross this)
  isGhostGate(x, y) {
    if (x < 0 || x >= this.grid[0].length || y < 0 || y >= this.grid.length) return false;
    return this.grid[Math.floor(y)][Math.floor(x)] === 4;
  }

  // Check if a tile is part of the ghost house
  isGhostHouse(x, y) {
    if (x < 0 || x >= this.grid[0].length || y < 0 || y >= this.grid.length) return false;
    const tile = this.grid[Math.floor(y)][Math.floor(x)];
    return tile === 5 || tile === 4;
  }

  // Eat dot/pellet at Pacman's position. Returns points if eaten, 0 otherwise
  eatDot(x, y) {
    const col = Math.floor(x);
    const row = Math.floor(y);

    if (row < 0 || row >= this.grid.length || col < 0 || col >= this.grid[0].length) {
      return { points: 0, type: null };
    }

    const tile = this.grid[row][col];
    if (tile === 2) {
      // Standard dot
      this.grid[row][col] = 0;
      this.dotsEaten++;
      this.checkFruitSpawn();
      return { points: 10, type: 'dot' };
    } else if (tile === 3) {
      // Power Pellet
      this.grid[row][col] = 0;
      this.dotsEaten++;
      this.checkFruitSpawn();
      return { points: 50, type: 'power' };
    }

    // Check fruit collision if active
    if (this.fruitActive && Math.abs(x - this.fruitTile.x) < 0.5 && Math.abs(y - this.fruitTile.y) < 0.5) {
      this.fruitActive = false;
      this.fruitSpawned = true;
      return { points: 100 * Math.min(5, Math.ceil(this.dotsEaten / 50)), type: 'fruit' };
    }

    return { points: 0, type: null };
  }

  checkFruitSpawn() {
    // Spawn fruit at 70 and 170 dots eaten
    if (!this.fruitSpawned && (this.dotsEaten === 70 || this.dotsEaten === 170)) {
      this.fruitActive = true;
      this.fruitTimer = 600; // Flashes/stays active for 10 seconds (600 frames at 60fps)
    }
  }

  update() {
    if (this.fruitActive) {
      this.fruitTimer--;
      if (this.fruitTimer <= 0) {
        this.fruitActive = false;
      }
    }
  }

  // Drawing method
  draw(ctx, pulse, isGravityMode) {
    const wallColor = isGravityMode ? '#8a2be2' : '#1919A6'; // Purple for gravity mode, blue for classic
    const wallShadow = isGravityMode ? 'rgba(138, 43, 226, 0.6)' : 'rgba(25, 25, 166, 0.6)';

    ctx.save();
    
    // Iterate through map coordinates and render
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const tile = this.grid[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === 1) {
          // Glow effect for walls to look modern/premium
          ctx.shadowBlur = 4;
          ctx.shadowColor = wallShadow;
          ctx.strokeStyle = wallColor;
          ctx.lineWidth = 2.5;

          // Connect adjacent walls for smooth outline rendering
          const up = r > 0 && this.grid[r-1][c] === 1;
          const down = r < this.grid.length - 1 && this.grid[r+1][c] === 1;
          const left = c > 0 && this.grid[r][c-1] === 1;
          const right = c < this.grid[r].length - 1 && this.grid[r][c+1] === 1;

          // Simple wall box drawing with connecting lines
          ctx.beginPath();
          if (left && right && !up && !down) {
            // Horizontal line
            ctx.moveTo(x, y + TILE_SIZE / 2);
            ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
          } else if (up && down && !left && !right) {
            // Vertical line
            ctx.moveTo(x + TILE_SIZE / 2, y);
            ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE);
          } else {
            // Default: Draw bounding block
            ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          }
          ctx.stroke();
        } else if (tile === 2) {
          // Standard Dot
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#FFEBEB';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        } else if (tile === 3) {
          // Power Pellet (Blinking)
          ctx.shadowBlur = pulse ? 6 : 0;
          ctx.shadowColor = '#FFB8AE';
          ctx.fillStyle = pulse ? '#FFB8AE' : 'transparent';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 6, 0, 2 * Math.PI);
          ctx.fill();
        } else if (tile === 4) {
          // Ghost House Gate
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#FFB8FF'; // Pinkish white gate
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, y + TILE_SIZE / 2);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
          ctx.stroke();
        }
      }
    }

    // Draw Fruit if active
    if (this.fruitActive) {
      const fx = this.fruitTile.x * TILE_SIZE;
      const fy = this.fruitTile.y * TILE_SIZE;
      
      // Cherries!
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#FF0000';
      
      // Left cherry
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(fx + 6, fy + 12, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Right cherry
      ctx.beginPath();
      ctx.arc(fx + 14, fy + 10, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Stems
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fx + 6, fy + 8);
      ctx.quadraticCurveTo(fx + 10, fy + 2, fx + 12, fy + 2);
      ctx.moveTo(fx + 14, fy + 6);
      ctx.quadraticCurveTo(fx + 13, fy + 2, fx + 12, fy + 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  isCleared() {
    return this.dotsEaten >= this.totalDots;
  }
}
