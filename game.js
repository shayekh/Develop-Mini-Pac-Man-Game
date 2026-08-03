// ---------- Constants ----------
const TILE = 24;
const COLS = 19;
const ROWS = 21;

const WALL = 1, PELLET = 0, POWER = 2, EMPTY = 3, DOOR = 4;

const DIRS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none:  { x: 0, y: 0 },
};

// ---------- Maze construction ----------
function buildMaze() {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push(new Array(COLS).fill(PELLET));
  }
  // Border walls
  for (let c = 0; c < COLS; c++) {
    grid[0][c] = WALL;
    grid[ROWS - 1][c] = WALL;
  }
  for (let r = 0; r < ROWS; r++) {
    grid[r][0] = WALL;
    grid[r][COLS - 1] = WALL;
  }
  // Tunnel row (row 10) open at edges
  grid[10][0] = EMPTY;
  grid[10][COLS - 1] = EMPTY;

  // Pillars in a grid pattern, skipping the tunnel row and ghost-house zone
  for (let r = 2; r <= 18; r += 2) {
    if (r === 10) continue;
    for (let c = 2; c <= 16; c += 2) {
      if (r >= 8 && r <= 12 && c >= 7 && c <= 11) continue;
      grid[r][c] = WALL;
    }
  }

  // Ghost house
  for (let r = 9; r <= 11; r++) {
    for (let c = 8; c <= 10; c++) grid[r][c] = EMPTY;
  }
  grid[8][8] = WALL; grid[8][9] = DOOR; grid[8][10] = WALL;
  grid[12][8] = WALL; grid[12][9] = WALL; grid[12][10] = WALL;
  grid[9][7] = WALL; grid[10][7] = WALL; grid[11][7] = WALL;
  grid[9][11] = WALL; grid[10][11] = WALL; grid[11][11] = WALL;

  // Clear a landing spot for Pac-Man start (no pellet there)
  grid[15][9] = EMPTY;

  // Power pellets in the four corners
  grid[1][1] = POWER;
  grid[1][COLS - 2] = POWER;
  grid[ROWS - 2][1] = POWER;
  grid[ROWS - 2][COLS - 2] = POWER;

  return grid;
}

let maze = buildMaze();
const initialMaze = maze.map(row => row.slice());

function isWalkable(r, c, forGhostThroughDoor) {
  if (r < 0 || r >= ROWS) return true; // tunnel handled separately
  if (c < 0 || c >= COLS) return true;
  const t = maze[r][c];
  if (t === WALL) return false;
  if (t === DOOR) return !!forGhostThroughDoor;
  return true;
}

function tileCenter(r, c) {
  return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
}

function pxToTile(x, y) {
  return { r: Math.floor(y / TILE), c: Math.floor(x / TILE) };
}

// ---------- Game state ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const highscoreEl = document.getElementById('highscore');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const overlaySub = document.getElementById('overlay-sub');

let score = 0;
let lives = 3;
let highscore = Number(localStorage.getItem('pacman-highscore') || 0);
highscoreEl.textContent = highscore;

let pelletsRemaining = 0;
let gameState = 'ready'; // ready, playing, paused, win, gameover
let frightenedTimer = 0;
let ghostEatCombo = 0;
let modeTimer = 0;
let modeIndex = 0;
const modeSchedule = [
  { mode: 'scatter', duration: 7 },
  { mode: 'chase', duration: 20 },
  { mode: 'scatter', duration: 7 },
  { mode: 'chase', duration: 20 },
  { mode: 'scatter', duration: 5 },
  { mode: 'chase', duration: 999999 },
];
let globalMode = 'scatter';

function countPellets() {
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (maze[r][c] === PELLET || maze[r][c] === POWER) n++;
  return n;
}

// ---------- Pac-Man ----------
const pacStart = tileCenter(15, 9);
const pacman = {
  x: pacStart.x, y: pacStart.y,
  dir: 'left', nextDir: 'left',
  speed: 100, // px/sec
  mouth: 0, mouthDir: 1,
};

function resetPacman() {
  pacman.x = pacStart.x;
  pacman.y = pacStart.y;
  pacman.dir = 'left';
  pacman.nextDir = 'left';
}

// ---------- Ghosts ----------
const ghostHomes = {
  red:    { r: 9,  c: 9 },
  pink:   { r: 10, c: 9 },
  cyan:   { r: 10, c: 8 },
  orange: { r: 10, c: 10 },
};
const scatterTargets = {
  red:    { r: 0, c: COLS - 1 },
  pink:   { r: 0, c: 0 },
  cyan:   { r: ROWS - 1, c: COLS - 1 },
  orange: { r: ROWS - 1, c: 0 },
};
const ghostColors = { red: '#ff0000', pink: '#ffb8ff', cyan: '#00ffff', orange: '#ffb851' };

function makeGhost(name, releaseDelay) {
  const home = tileCenter(ghostHomes[name].r, ghostHomes[name].c);
  return {
    name,
    x: home.x, y: home.y,
    homeR: ghostHomes[name].r, homeC: ghostHomes[name].c,
    dir: 'up',
    speed: 85,
    state: 'house', // house, exiting, alive, frightened, eaten
    releaseTimer: releaseDelay,
    color: ghostColors[name],
  };
}

let ghosts = [];
function resetGhosts() {
  ghosts = [
    makeGhost('red', 0),
    makeGhost('pink', 2),
    makeGhost('cyan', 5),
    makeGhost('orange', 8),
  ];
}
resetGhosts();

// ---------- Input ----------
const keyMap = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

window.addEventListener('keydown', (e) => {
  if (keyMap[e.key]) {
    pacman.nextDir = keyMap[e.key];
    e.preventDefault();
  }
  if (e.key === 'Enter') startOrRestart();
});

function bindPad(id, dir) {
  const el = document.getElementById(id);
  const set = (ev) => { ev.preventDefault(); pacman.nextDir = dir; };
  el.addEventListener('touchstart', set, { passive: false });
  el.addEventListener('mousedown', set);
}
bindPad('btn-up', 'up');
bindPad('btn-down', 'down');
bindPad('btn-left', 'left');
bindPad('btn-right', 'right');

overlay.addEventListener('click', startOrRestart);

function startOrRestart() {
  if (gameState === 'ready' || gameState === 'win' || gameState === 'gameover') {
    fullReset();
    gameState = 'playing';
    overlay.classList.add('hidden');
  } else if (gameState === 'paused') {
    gameState = 'playing';
    overlay.classList.add('hidden');
  }
}

function fullReset() {
  maze = initialMaze.map(row => row.slice());
  pelletsRemaining = countPellets();
  score = 0;
  lives = 3;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  resetPacman();
  resetGhosts();
  frightenedTimer = 0;
  ghostEatCombo = 0;
  modeTimer = 0;
  modeIndex = 0;
  globalMode = 'scatter';
}

function loseLife() {
  lives--;
  livesEl.textContent = lives;
  if (lives <= 0) {
    gameOver(false);
  } else {
    resetPacman();
    resetGhosts();
    frightenedTimer = 0;
  }
}

function gameOver(won) {
  gameState = won ? 'win' : 'gameover';
  if (score > highscore) {
    highscore = score;
    localStorage.setItem('pacman-highscore', String(highscore));
    highscoreEl.textContent = highscore;
  }
  overlayText.textContent = won ? 'YOU WIN!' : 'GAME OVER';
  overlaySub.textContent = 'Press ENTER or tap to play again';
  overlay.classList.remove('hidden');
}

// ---------- Movement helpers ----------
function isAligned(entity) {
  return Math.abs(entity.x % TILE - TILE / 2) < 0.6 && Math.abs(entity.y % TILE - TILE / 2) < 0.6;
}

function canMove(entity, dir, forGhost) {
  const { r, c } = pxToTile(entity.x, entity.y);
  const d = DIRS[dir];
  const nr = r + d.y, nc = c + d.x;
  return isWalkable(nr, nc, forGhost);
}

function moveEntity(entity, dt, forGhost) {
  const d = DIRS[entity.dir];
  let nx = entity.x + d.x * entity.speed * dt;
  let ny = entity.y + d.y * entity.speed * dt;

  // Tunnel wrap
  if (nx < -TILE / 2) nx = COLS * TILE + TILE / 2;
  if (nx > COLS * TILE + TILE / 2) nx = -TILE / 2;

  entity.x = nx;
  entity.y = ny;
}

function snapToGrid(entity) {
  const { r, c } = pxToTile(entity.x, entity.y);
  const center = tileCenter(r, c);
  entity.x = center.x;
  entity.y = center.y;
}

// ---------- Pac-Man update ----------
function updatePacman(dt) {
  if (isAligned(pacman)) {
    snapToGrid(pacman);
    if (pacman.nextDir !== pacman.dir && canMove(pacman, pacman.nextDir, false)) {
      pacman.dir = pacman.nextDir;
    }
    if (!canMove(pacman, pacman.dir, false)) {
      pacman.dir = 'none';
    }
  }
  moveEntity(pacman, dt, false);

  // wrap x for rendering bounds
  if (pacman.x < 0) pacman.x = COLS * TILE;
  if (pacman.x > COLS * TILE) pacman.x = 0;

  // Eat pellets
  const { r, c } = pxToTile(pacman.x, pacman.y);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
    const t = maze[r][c];
    if (t === PELLET) {
      maze[r][c] = EMPTY;
      score += 10;
      pelletsRemaining--;
      scoreEl.textContent = score;
    } else if (t === POWER) {
      maze[r][c] = EMPTY;
      score += 50;
      pelletsRemaining--;
      scoreEl.textContent = score;
      frightenedTimer = 6;
      ghostEatCombo = 0;
      ghosts.forEach(g => {
        if (g.state === 'alive') {
          g.state = 'frightened';
          g.dir = oppositeDir(g.dir);
        }
      });
    }
  }
  if (pelletsRemaining <= 0) {
    gameOver(true);
  }

  // mouth animation
  pacman.mouth += pacman.mouthDir * dt * 8;
  if (pacman.mouth > 1) { pacman.mouth = 1; pacman.mouthDir = -1; }
  if (pacman.mouth < 0) { pacman.mouth = 0; pacman.mouthDir = 1; }
}

function oppositeDir(dir) {
  return { up: 'down', down: 'up', left: 'right', right: 'left', none: 'none' }[dir];
}

// ---------- Ghost AI ----------
function ghostTarget(g) {
  if (g.state === 'frightened') return null; // random
  if (g.state === 'eaten') return { r: ghostHomes[g.name].r, c: ghostHomes[g.name].c };
  if (globalMode === 'scatter') return scatterTargets[g.name];

  // chase targets
  const pTile = pxToTile(pacman.x, pacman.y);
  const pDir = DIRS[pacman.dir] || DIRS.none;
  switch (g.name) {
    case 'red':
      return pTile;
    case 'pink':
      return { r: pTile.r + pDir.y * 4, c: pTile.c + pDir.x * 4 };
    case 'cyan': {
      const redG = ghosts.find(gg => gg.name === 'red');
      const ahead = { r: pTile.r + pDir.y * 2, c: pTile.c + pDir.x * 2 };
      const redTile = pxToTile(redG.x, redG.y);
      return { r: ahead.r + (ahead.r - redTile.r), c: ahead.c + (ahead.c - redTile.c) };
    }
    case 'orange': {
      const gTile = pxToTile(g.x, g.y);
      const dist = Math.hypot(gTile.r - pTile.r, gTile.c - pTile.c);
      return dist > 8 ? pTile : scatterTargets.orange;
    }
  }
  return pTile;
}

function chooseGhostDirection(g) {
  const { r, c } = pxToTile(g.x, g.y);
  const forGhost = g.state === 'eaten' || g.state === 'house' || g.state === 'exiting';
  const opts = ['up', 'down', 'left', 'right'].filter(dir => {
    if (dir === oppositeDir(g.dir)) return false;
    const d = DIRS[dir];
    return isWalkable(r + d.y, c + d.x, forGhost);
  });
  if (opts.length === 0) {
    return oppositeDir(g.dir);
  }
  if (g.state === 'frightened') {
    return opts[Math.floor(Math.random() * opts.length)];
  }
  const target = ghostTarget(g);
  let best = opts[0], bestDist = Infinity;
  for (const dir of opts) {
    const d = DIRS[dir];
    const nr = r + d.y, nc = c + d.x;
    const dist = Math.hypot(nr - target.r, nc - target.c);
    if (dist < bestDist) { bestDist = dist; best = dir; }
  }
  return best;
}

function updateGhostMode(dt) {
  if (frightenedTimer > 0) {
    frightenedTimer -= dt;
    if (frightenedTimer <= 0) {
      ghosts.forEach(g => { if (g.state === 'frightened') g.state = 'alive'; });
      ghostEatCombo = 0;
    }
    return; // pause scatter/chase schedule while frightened
  }
  modeTimer += dt;
  const cur = modeSchedule[modeIndex];
  if (modeTimer >= cur.duration) {
    modeTimer = 0;
    modeIndex = Math.min(modeIndex + 1, modeSchedule.length - 1);
    globalMode = modeSchedule[modeIndex].mode;
    ghosts.forEach(g => {
      if (g.state === 'alive') g.dir = oppositeDir(g.dir);
    });
  } else {
    globalMode = cur.mode;
  }
}

function updateGhost(g, dt) {
  if (g.state === 'house') {
    g.releaseTimer -= dt;
    // bob in place
    g.y += Math.sin(performance.now() / 200) * 4 * dt;
    if (g.releaseTimer <= 0) {
      g.state = 'exiting';
      g.x = tileCenter(9, 9).x;
    }
    return;
  }
  if (g.state === 'exiting') {
    const doorCenter = tileCenter(8, 9);
    const dx = doorCenter.x - g.x, dy = doorCenter.y - g.y;
    if (Math.abs(dx) > 1) {
      g.x += Math.sign(dx) * g.speed * dt;
    } else if (Math.abs(dy) > 1) {
      g.y += Math.sign(dy) * g.speed * dt;
    } else {
      g.x = doorCenter.x; g.y = doorCenter.y;
      g.state = 'alive';
      g.dir = 'left';
    }
    return;
  }

  if (g.state === 'eaten') {
    const homeCenter = tileCenter(ghostHomes[g.name].r, ghostHomes[g.name].c);
    const dx = homeCenter.x - g.x, dy = homeCenter.y - g.y;
    if (Math.hypot(dx, dy) < 2) {
      g.state = 'house';
      g.releaseTimer = 1;
      return;
    }
  }

  if (isAligned(g)) {
    snapToGrid(g);
    g.dir = chooseGhostDirection(g);
  }
  const speedMult = g.state === 'frightened' ? 0.6 : g.state === 'eaten' ? 2 : 1;
  const d = DIRS[g.dir];
  let nx = g.x + d.x * g.speed * speedMult * dt;
  let ny = g.y + d.y * g.speed * speedMult * dt;
  if (nx < -TILE / 2) nx = COLS * TILE + TILE / 2;
  if (nx > COLS * TILE + TILE / 2) nx = -TILE / 2;
  g.x = nx; g.y = ny;
}

function checkGhostCollisions() {
  for (const g of ghosts) {
    if (g.state !== 'alive' && g.state !== 'frightened') continue;
    const dist = Math.hypot(g.x - pacman.x, g.y - pacman.y);
    if (dist < TILE * 0.6) {
      if (g.state === 'frightened') {
        g.state = 'eaten';
        ghostEatCombo++;
        score += 200 * ghostEatCombo;
        scoreEl.textContent = score;
      } else {
        loseLife();
        return;
      }
    }
  }
}

// ---------- Rendering ----------
function drawMaze() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = maze[r][c];
      const x = c * TILE, y = r * TILE;
      if (t === WALL) {
        ctx.fillStyle = '#2121ff';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      } else if (t === DOOR) {
        ctx.fillStyle = '#ffb8ff';
        ctx.fillRect(x + 2, y + TILE / 2 - 2, TILE - 4, 4);
      } else if (t === PELLET) {
        ctx.fillStyle = '#ffe6b8';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === POWER) {
        ctx.fillStyle = '#ffe6b8';
        const pulse = 3.5 + Math.sin(performance.now() / 150) * 1.5;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPacman() {
  const angle = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0, none: 0 }[pacman.dir] || 0;
  const openness = 0.05 + pacman.mouth * 0.25;
  ctx.save();
  ctx.translate(pacman.x, pacman.y);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffe600';
  ctx.beginPath();
  ctx.arc(0, 0, TILE / 2 - 1, openness * Math.PI, (2 - openness) * Math.PI);
  ctx.lineTo(0, 0);
  ctx.fill();
  ctx.restore();
}

function drawGhost(g) {
  const r = TILE / 2 - 2;
  let color = g.color;
  if (g.state === 'frightened') {
    color = frightenedTimer < 2 && Math.floor(performance.now() / 200) % 2 === 0 ? '#fff' : '#2121ff';
  } else if (g.state === 'eaten') {
    // draw only eyes
    drawEyes(g);
    return;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(g.x, g.y - 2, r, Math.PI, 0);
  ctx.lineTo(g.x + r, g.y + r);
  for (let i = 0; i < 4; i++) {
    const step = (2 * r) / 4;
    const bx = g.x + r - step * i;
    ctx.lineTo(bx - step / 2, g.y + r - 4);
    ctx.lineTo(bx - step, g.y + r);
  }
  ctx.closePath();
  ctx.fill();
  drawEyes(g);
}

function drawEyes(g) {
  const d = DIRS[g.dir] || DIRS.none;
  const ex = g.x, ey = g.y - 3;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ex - 4, ey, 3.2, 0, Math.PI * 2);
  ctx.arc(ex + 4, ey, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a4a';
  ctx.beginPath();
  ctx.arc(ex - 4 + d.x * 1.6, ey + d.y * 1.6, 1.6, 0, Math.PI * 2);
  ctx.arc(ex + 4 + d.x * 1.6, ey + d.y * 1.6, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  drawMaze();
  drawPacman();
  ghosts.forEach(drawGhost);
}

// ---------- Main loop ----------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (gameState === 'playing') {
    updatePacman(dt);
    updateGhostMode(dt);
    ghosts.forEach(g => updateGhost(g, dt));
    checkGhostCollisions();
  }
  render();
  requestAnimationFrame(loop);
}

pelletsRemaining = countPellets();
requestAnimationFrame(loop);
