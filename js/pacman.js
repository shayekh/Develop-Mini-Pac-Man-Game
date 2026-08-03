// Pacman Player Class

import { TILE_SIZE, DIRECTIONS, PACMAN_SPEEDS } from './constants.js';

export class Pacman {
  constructor() {
    this.spawnTile = { x: 13.5, y: 23 }; // Traditional start position (between the bottom two corridors)
    this.reset();
    this.lives = 3;
  }

  reset() {
    this.x = this.spawnTile.x;
    this.y = this.spawnTile.y;
    this.targetX = this.x;
    this.targetY = this.y;
    this.dir = DIRECTIONS.NONE;
    this.nextDir = DIRECTIONS.NONE;
    
    this.mouthAngle = 0.2;
    this.mouthDir = 1;
    this.isDying = false;
    this.deathFrame = 0;
  }

  // Handle keys/touch controls
  setNextDirection(direction) {
    this.nextDir = direction;
    
    // Allow instant reversal
    if (this.dir !== DIRECTIONS.NONE && direction.x === -this.dir.x && direction.y === -this.dir.y) {
      this.dir = direction;
      // Reverse target and source
      const currentTargetX = this.targetX;
      const currentTargetY = this.targetY;
      
      // If we are at x=13.4 moving left to targetX=13. The source was 14.
      // Reversing means targetX becomes 14 (which is targetX - dir.x * 1, since old dir.x was -1).
      // That means targetX = currentTargetX - old_dir.x = 13 - (-1) = 14.
      // Yes, this is correct!
      this.targetX = Math.round(this.x + direction.x);
      this.targetY = Math.round(this.y + direction.y);
    }
  }

  update(gameMap, isGravityMode) {
    if (this.isDying) {
      this.deathFrame++;
      return;
    }

    // Determine current speed based on mode
    let baseSpeed = PACMAN_SPEEDS.NORMAL;
    if (isGravityMode) {
      if (this.dir === DIRECTIONS.UP) {
        baseSpeed = PACMAN_SPEEDS.GRAVITY_UP;
      } else if (this.dir === DIRECTIONS.DOWN) {
        baseSpeed = PACMAN_SPEEDS.GRAVITY_DOWN;
      }
    }

    // Check if we are currently moving towards a target
    const distanceToTargetX = this.targetX - this.x;
    const distanceToTargetY = this.targetY - this.y;
    const distance = Math.sqrt(distanceToTargetX * distanceToTargetX + distanceToTargetY * distanceToTargetY);

    if (distance > 0.01) {
      // Move towards target
      const step = Math.min(baseSpeed, distance);
      this.x += Math.sign(distanceToTargetX) * step;
      this.y += Math.sign(distanceToTargetY) * step;

      // Animate mouth when moving
      this.mouthAngle += 0.08 * this.mouthDir;
      if (this.mouthAngle >= 0.5 || this.mouthAngle <= 0.05) {
        this.mouthDir *= -1;
      }
    } else {
      // Snapped to target tile!
      this.x = this.targetX;
      this.y = this.targetY;

      // Portal tunnel wrapping (row 14 tunnels)
      if (this.x < 0) {
        this.x = 27;
        this.targetX = 27;
      } else if (this.x >= 28) {
        this.x = 0;
        this.targetX = 0;
      }

      // Check if we can apply next direction
      let appliedDir = this.dir;
      if (this.nextDir !== DIRECTIONS.NONE) {
        const testX = this.x + this.nextDir.x;
        const testY = this.y + this.nextDir.y;
        if (!gameMap.isWall(testX, testY) && !gameMap.isGhostGate(testX, testY)) {
          this.dir = this.nextDir;
          appliedDir = this.nextDir;
          this.nextDir = DIRECTIONS.NONE;
        }
      }

      // Gravity Mode adjustments:
      // If gravity is ON, there's a down shaft, and we aren't holding/pressing anything else:
      if (isGravityMode && appliedDir !== DIRECTIONS.UP && appliedDir !== DIRECTIONS.DOWN) {
        // If we can fall down, force movement down
        const downX = this.x + DIRECTIONS.DOWN.x;
        const downY = this.y + DIRECTIONS.DOWN.y;
        if (!gameMap.isWall(downX, downY) && !gameMap.isGhostGate(downX, downY)) {
          this.dir = DIRECTIONS.DOWN;
          appliedDir = DIRECTIONS.DOWN;
        }
      }

      // Set next target tile
      if (appliedDir !== DIRECTIONS.NONE) {
        const nextTargetX = this.x + appliedDir.x;
        const nextTargetY = this.y + appliedDir.y;

        // If no wall, advance target
        if (!gameMap.isWall(nextTargetX, nextTargetY) && !gameMap.isGhostGate(nextTargetX, nextTargetY)) {
          this.targetX = nextTargetX;
          this.targetY = nextTargetY;
        } else {
          // Hit wall: stop
          this.dir = DIRECTIONS.NONE;
          this.targetX = this.x;
          this.targetY = this.y;
        }
      }
    }
  }

  draw(ctx, frameCount) {
    const px = this.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.y * TILE_SIZE + TILE_SIZE / 2;
    const radius = TILE_SIZE / 2 - 1;

    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#FFFF00';

    if (this.isDying) {
      // Death animation: mouth opening wider and wider until disappearing
      const deathPercent = Math.min(1, this.deathFrame / 60); // 60 frames = 1 second
      ctx.fillStyle = '#FFFF00';
      ctx.beginPath();
      
      const startAngle = deathPercent * Math.PI;
      const endAngle = 2 * Math.PI - (deathPercent * Math.PI);
      
      if (deathPercent < 0.9) {
        ctx.arc(px, py, radius, startAngle, endAngle);
        ctx.lineTo(px, py);
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw expanding bubble pop
        const popRadius = radius * (1 + (deathPercent - 0.9) * 4);
        ctx.strokeStyle = `rgba(255, 255, 0, ${1 - (deathPercent - 0.9) * 10})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, popRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Normal Pacman rendering
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();

    // Rotate according to current direction
    let angleOffset = 0;
    if (this.dir === DIRECTIONS.LEFT) angleOffset = Math.PI;
    else if (this.dir === DIRECTIONS.UP) angleOffset = 1.5 * Math.PI;
    else if (this.dir === DIRECTIONS.DOWN) angleOffset = 0.5 * Math.PI;
    else if (this.dir === DIRECTIONS.RIGHT) angleOffset = 0;
    else if (this.nextDir !== DIRECTIONS.NONE) {
      // Use nextDir for angle if stationary but queuing direction
      if (this.nextDir === DIRECTIONS.LEFT) angleOffset = Math.PI;
      else if (this.nextDir === DIRECTIONS.UP) angleOffset = 1.5 * Math.PI;
      else if (this.nextDir === DIRECTIONS.DOWN) angleOffset = 0.5 * Math.PI;
      else if (this.nextDir === DIRECTIONS.RIGHT) angleOffset = 0;
    }

    const startAngle = angleOffset + this.mouthAngle;
    const endAngle = angleOffset + 2 * Math.PI - this.mouthAngle;

    ctx.arc(px, py, radius, startAngle, endAngle);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();

    // Eye (only drawn when alive)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    
    // Position eye relative to orientation
    let eyeX = px;
    let eyeY = py;
    if (this.dir === DIRECTIONS.UP || this.nextDir === DIRECTIONS.UP) {
      eyeX += 4;
      eyeY -= 2;
    } else if (this.dir === DIRECTIONS.DOWN || this.nextDir === DIRECTIONS.DOWN) {
      eyeX += 4;
      eyeY += 2;
    } else if (this.dir === DIRECTIONS.LEFT || this.nextDir === DIRECTIONS.LEFT) {
      eyeX -= 2;
      eyeY -= 5;
    } else {
      // Facing RIGHT or stationary default
      eyeX += 2;
      eyeY -= 5;
    }
    
    ctx.arc(eyeX, eyeY, 1.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
  }
}
