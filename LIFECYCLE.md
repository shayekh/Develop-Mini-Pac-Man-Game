# Pac-Man Arcade Game - Full Development Lifecycle Documentation

This document covers the complete engineering lifecycle of building the retro browser-based **Pac-Man Arcade Game** with an optional, physics-based **Gravity Mode**.

---

## 1. Planning and Analysis

### Reference: `freepacman.org`
To create a high-fidelity recreation, we modeled the mechanics based on the original 1980 arcade Pac-Man game hosted on `freepacman.org`. The main design patterns included:
- **Grid Layout**: 28 columns by 31 rows (containing walls, paths, dots, power pellets, side tunnels, and a central ghost house).
- **Ghost Personalities**:
  - **Blinky (Red)**: Direct chase of Pac-Man.
  - **Pinky (Pink)**: Intercepts Pac-Man by aiming 4 tiles ahead.
  - **Inky (Cyan)**: Vector targeting based on Pac-Man and Blinky.
  - **Clyde (Orange)**: Chases when far, flees to home corner when close.
- **System States**: Alternating Scatter (ghosts circle corners) and Chase modes, plus Frightened mode when Pac-Man consumes a power pellet.

### Project Twist: Gravity Mode
To match the repository name `pacman-gravity`, we designed a custom toggle:
- **Downward Physics Pull**: Pac-Man falls down vertical shafts unless moving UP.
- **Speed Variances**: Moving UP is slower (fighting gravity), while falling DOWN is faster.
- **Pathing Puzzle**: Changes the path layout dynamics as Pac-Man cannot easily pause in vertical corridors.

---

## 2. Directory Structure and Modularity

We structured the codebase into standard ES6 modules to enforce separation of concerns, ease debugging, and avoid variable leaking:

```
├── index.html          # Shell container, overlays, control inputs, and script runner
├── styles.css          # Visual layout, neon themes, retro typography, and CRT filters
├── LIFECYCLE.md        # This development document
├── GEMINI.md           # AI implementation and architectural notes
└── js/
    ├── constants.js    # Global settings, level map matrices, and speed variables
    ├── audio.js        # Sound chiptune synthesis via Web Audio API
    ├── map.js          # Grid maps, wall bounds, dots consumption, and fruit timers
    ├── pacman.js       # Player state, mouth animations, and gravity calculations
    ├── ghost.js        # Ghost state, target tile solvers, and sprite painters
    └── game.js         # Core GameLoop, state coordinator, and collision handlers
```

---

## 3. Core Component Design & Implementation

### A. Web Audio API Chiptune Synthesizer (`js/audio.js`)
To guarantee compatibility across browsers without relying on external `.wav` or `.mp3` assets, we synthesized sound waves using the native **Web Audio API**:
- **Waka-Waka**: Frequency modulation sweep between `220Hz` and `320Hz` on a triangle wave, with short envelopes triggered at a maximum frequency threshold.
- **Siren**: A background triangle oscillator pitch-modulating slowly up and down. Pitch shifts upwards as dots are consumed to increase tension.
- **Death**: An octave-sweeping sawtooth descent simulating the retro "deflating" sound effect.

### B. Bulletproof Tile-Target Interpolation (`js/pacman.js` & `js/ghost.js`)
Standard coordinate additions (`x += speed`) often cause float clipping, letting sprites slip through walls. To avoid this, we implemented a **Target-Tile Interpolation** algorithm:
1. Sprites occupy an exact coordinate `(x, y)` and move toward a `(targetX, targetY)`.
2. Sprites are only allowed to change direction when their float positions are fully aligned with the target tile (`distance < 0.01`).
3. On alignment, the code locks the coordinates to integer values (`x = targetX`), checks the keyboard queue (`nextDir`), validates wall collisions, and sets the next `(targetX, targetY)`.
4. This ensures Pac-Man and ghosts are **always** centered on paths and can never clip walls.

### C. Ghost AI Pathfinding Math (`js/ghost.js`)
At every intersection, ghosts choose the next tile to target:
- A ghost can **never reverse** its direction (e.g. if it enters a tile moving LEFT, it cannot exit moving RIGHT).
- For each valid adjacent tile (no walls, no gate unless Eaten), we calculate the straight-line distance to the target tile:
  $$Distance = \Delta x^2 + \Delta y^2$$
- The ghost selects the direction that minimizes this distance. Ties are broken in order: **UP, LEFT, DOWN, RIGHT**.

---

## 4. Visual Polish and Arcade Nostalgia

To create a premium user experience, we applied modern styling:
- **CRT Monitor Overlay**: Repetitive linear gradient lines and a micro-flicker animation mimic the glass of retro CRT arcade screens.
- **Neon Glows**: Box-shadow and stroke styling on elements render high-end neon-blue lanes and neon-purple gravity tracks.
- **Responsive Layout**: Adapts gracefully to desktop displays and includes a mobile virtual button D-pad for mobile touchscreens.

---

## 5. Verification and QA Testing

The game was verified across the following milestones:
1. **Startup Performance**: Zero initial asset dependencies ensure instantaneous loading.
2. **Audio Verification**: Sound synthesis operates cleanly upon the first click interaction.
3. **Gameplay Mechanics**:
   - Pac-Man mouth rotates towards the current direction.
   - Ghosts track Pac-Man with their original behaviors (e.g. Blinky chases directly; Clyde wanders off if close).
   - Speed changes and horizontal drift verified during **Gravity Mode**.
   - Score updates, lives decrement on death, and high scores persist in `localStorage`.
