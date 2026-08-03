// Game constants and map layout configuration

export const TILE_SIZE = 20;

export const DIRECTIONS = {
  NONE: { x: 0, y: 0, angle: 0, name: 'NONE' },
  UP: { x: 0, y: -1, angle: 1.5 * Math.PI, name: 'UP' },
  DOWN: { x: 0, y: 1, angle: 0.5 * Math.PI, name: 'DOWN' },
  LEFT: { x: -1, y: 0, angle: Math.PI, name: 'LEFT' },
  RIGHT: { x: 1, y: 0, angle: 0, name: 'RIGHT' }
};

export const GAME_STATES = {
  START_MENU: 'START_MENU',
  READY_SPLASH: 'READY_SPLASH',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY'
};

export const GHOST_STATES = {
  HOUSE: 'HOUSE',
  SCATTER: 'SCATTER',
  CHASE: 'CHASE',
  FRIGHTENED: 'FRIGHTENED',
  EATEN: 'EATEN'
};

// Points system
export const POINTS = {
  DOT: 10,
  POWER_PELLET: 50,
  GHOST_BASE: 200 // Multiplied by 2 for each subsequent ghost eaten
};

// Speeds (percentage of tile size per frame at 60fps)
export const PACMAN_SPEEDS = {
  NORMAL: 0.12,          // 2.4 pixels per frame at TILE_SIZE=20
  GRAVITY_UP: 0.08,      // Harder to move up against gravity
  GRAVITY_DOWN: 0.18,    // Faster when falling down with gravity
  EATING: 0.10           // Slightly slower when eating dots
};

export const GHOST_SPEEDS = {
  NORMAL: 0.11,
  FRIGHTENED: 0.06,
  EATEN: 0.35,           // Very fast eyes returning to house
  HOUSE: 0.04
};

// Ghost properties and colors
export const GHOST_CONFIGS = [
  {
    name: 'Blinky',
    color: '#FF0000', // Red
    homeTile: { x: 25, y: -2 },
    spawnTile: { x: 13.5, y: 11 }, // Spawns directly outside house
    scatterTimer: 7000,
    chaseTimer: 20000
  },
  {
    name: 'Pinky',
    color: '#FFB8FF', // Pink
    homeTile: { x: 2, y: -2 },
    spawnTile: { x: 13.5, y: 14 }, // Spawns inside house
    scatterTimer: 7000,
    chaseTimer: 20000
  },
  {
    name: 'Inky',
    color: '#00FFFF', // Cyan
    homeTile: { x: 27, y: 32 },
    spawnTile: { x: 11.5, y: 14 }, // Spawns inside house left
    scatterTimer: 7000,
    chaseTimer: 20000
  },
  {
    name: 'Clyde',
    color: '#FFB852', // Orange
    homeTile: { x: 0, y: 32 },
    spawnTile: { x: 15.5, y: 14 }, // Spawns inside house right
    scatterTimer: 7000,
    chaseTimer: 20000
  }
];

// 28 Columns x 31 Rows
// Legend:
// 0 = Path, empty space
// 1 = Wall
// 2 = Dot (standard pellet)
// 3 = Power Pellet (energizer)
// 4 = Ghost Gate (only ghosts pass)
// 5 = Ghost House interior (no dots)
export const INITIAL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,0,2,0,0,0,1,5,5,5,5,5,5,1,0,0,0,2,0,0,0,0,0,0], // Side tunnels at row 14
  [1,1,1,1,1,1,2,1,1,0,1,5,5,5,5,5,5,1,0,1,1,2,1,1,1,1,1,1],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
  [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
  [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
  [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];
