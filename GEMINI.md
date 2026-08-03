# GEMINI Developer Guide - Pac-Man Arcade Game

This guide describes the AI-driven design decisions, prompt engineering structures, and architectural standards utilized by **Gemini Antigravity** to construct this browser-based Pac-Man application.

---

## 1. AI-Driven Design Decisions

### Standard ES Modules over Build Frameworks
* **Rationale**: The project was designed without Webpack/Vite build stages. This removes build times, ensures the application runs instantly on any server, and allows direct code edits to compile on browser refresh.
* **Architecture**: Script imports are declared with `type="module"`. Dependencies flow cleanly from configuration to engine:
  `constants.js` → `audio.js` → `map.js` → `pacman.js` / `ghost.js` → `game.js`.

### Web Audio API Synthesizer
* **Rationale**: Sourcing external sound clips often leads to cross-origin blocking (CORS), broken links, or load lag.
* **Architecture**: Sounds are programmatically generated using custom oscillators. By utilizing Web Audio API nodes (`OscillatorNode` and `GainNode`), the game remains zero-dependency and plays sounds instantly.

### Target-Tile Alignment Movement
* **Rationale**: Standard pixel-step movement causes collision clipping.
* **Architecture**: Both Pac-Man and ghosts use grid coordinate tracking. Movement operates as a vector-based travel between discrete grid locations, locking positions when destination tiles are reached.

---

## 2. Code Extension Guidelines

### Modifying the Grid Maze (`js/constants.js`)
The board layout is controlled by the `INITIAL_MAP` array. You can edit this grid directly.
* **Values**:
  * `0`: Open path
  * `1`: Wall border
  * `2`: Pellet dot
  * `3`: Power pellet (energizer)
  * `4`: Ghost Gate (ghosts pass, Pacman blocked)
  * `5`: Ghost House spawn interior

### Customizing Speeds (`js/constants.js`)
Speeds are scaled as a fraction of a tile traveled per frame. Modify the objects below to adjust speeds:
* `PACMAN_SPEEDS`: Controls speeds in normal eating, climbing against gravity, and falling.
* `GHOST_SPEEDS`: Controls normal, frightened, eaten (eyes returning home), and house bounce speeds.

### Creating a New Ghost
To add a 5th ghost:
1. Add an entry to `GHOST_CONFIGS` in `js/constants.js` specifying name, home tile, and color.
2. Initialize the ghost instance in `js/game.js` within the `ghosts` array:
   ```javascript
   this.ghosts.push(new Ghost(4));
   ```
3. Implement a custom targeting behavior inside `Ghost.updateTarget()` in `js/ghost.js`.

---

## 3. Maintenance and Troubleshooting

### Sound Context Blocked
* **Issue**: Browsers block audio contexts from playing until a user gesture is captured.
* **Resolution**: The `AudioEngine` in `js/audio.js` initializes in a suspended state and automatically invokes `resume()` upon mouse clicks or keyboard movement.

### Wall Clipping
* **Issue**: Modifying speeds can sometimes cause clipping if not properly aligned.
* **Resolution**: Ensure speeds do not exceed `1.0` (one tile per frame). The interpolation math takes the minimum of speed and distance to target, preventing overshoot.

---

## 4. Run Locally
To run the game:
1. Execute a static file server in the project directory:
   * **Node**: `npx serve .`
   * **Python**: `python -m http.server 8000`
2. Open `http://localhost:8000` (or the respective port) in any modern web browser.
