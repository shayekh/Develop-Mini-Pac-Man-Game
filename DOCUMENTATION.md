# Mini Pac-Man — Project Documentation

A dependency-free, browser-playable Pac-Man clone built with HTML5 Canvas and
vanilla JavaScript. This document walks through the full build lifecycle —
plan, develop, test, refine — plus the architecture and mechanics of the
finished game.

## Contents

- [1. Overview](#1-overview)
- [2. Lifecycle](#2-lifecycle)
  - [2.1 Plan](#21-plan)
  - [2.2 Develop](#22-develop)
  - [2.3 Test](#23-test)
  - [2.4 Refine](#24-refine)
- [3. Architecture](#3-architecture)
- [4. Game mechanics](#4-game-mechanics)
- [5. File structure](#5-file-structure)
- [6. Running it](#6-running-it)
- [7. Known limitations](#7-known-limitations)
- [8. Roadmap](#8-roadmap)

---

## 1. Overview

| | |
|---|---|
| **Stack** | HTML, CSS, vanilla JavaScript (no build step, no dependencies) |
| **Rendering** | HTML5 Canvas, 2D context |
| **Entry point** | `index.html` |
| **Persistence** | `localStorage` (high score only) |
| **Input** | Keyboard (arrows / WASD) + on-screen touch pad on coarse-pointer devices |

The goal was a single game that runs by opening `index.html` in a browser —
no bundler, no package manager, no server required (a local server is only
needed to satisfy browsers that restrict `file://` canvas/script access in
some configurations).

---

## 2. Lifecycle

### 2.1 Plan

Before writing code, the following decisions were made explicit:

- **Maze generation strategy.** Hand-tracing classic Pac-Man's 28×31 maze as
  ASCII art is error-prone to verify by eye (easy to accidentally wall off a
  region). Instead the maze is **procedurally generated**: a grid of isolated
  single-tile pillars placed on even row/column intersections. Because each
  pillar is surrounded by open tiles on all four sides, the corridor network
  is guaranteed connected by construction — no reachability bugs to debug.
- **Ghost house.** A 3×3 cut-out in the center of the grid, walled on all
  sides except a single `DOOR` tile that is walkable for ghosts only, not
  Pac-Man.
- **Movement model.** Grid-aligned movement with pixel-level interpolation:
  entities only evaluate a direction change when centered on a tile. This
  reproduces the arcade's precise, snap-to-corridor cornering feel instead of
  free-form 2D movement.
- **Ghost personalities.** Four distinct targeting strategies rather than one
  generic "chase the player" behavior, matching the source material's
  red/pink/cyan/orange archetypes (see [4. Game mechanics](#4-game-mechanics)).
- **Core loop.** Scatter/chase mode scheduling, power-pellet "frightened"
  mode with an escalating eat-combo score, lives, win/lose states, and a
  persisted high score.

### 2.2 Develop

Three files were written, in this order:

1. **`index.html`** — canvas element, HUD (score / lives / high score), the
   start/game-over overlay, and the touch control pad markup.
2. **`style.css`** — arcade-inspired palette, responsive touch controls
   (`@media (pointer: coarse)`), overlay states.
3. **`game.js`** — the entire simulation: maze generation, entity state,
   input handling, ghost AI, collision detection, rendering, and the main
   loop. Structured as plain functions and module-level state rather than
   classes, since the entity count is small and fixed (1 Pac-Man + 4 ghosts).

Key implementation points:

- `buildMaze()` generates the pillar grid programmatically, then explicitly
  carves out the ghost house, door, and four corner power pellets.
- `updateGhost()` drives each ghost through a small state machine:
  `house` → `exiting` → `alive` / `frightened` → `eaten` → back to `house`,
  with **staggered release timers** so ghosts leave the house one at a time
  rather than all at once.
- Input is handled uniformly: keyboard listeners and touch-pad buttons both
  just set `pacman.nextDir`, consumed on the next tile-aligned frame.

### 2.3 Test

No browser automation tooling was available during development, so
verification relied on static analysis and manual tracing rather than a live
playtest pass:

| Check | Method | Result |
|---|---|---|
| Syntax / parse errors | `node --check game.js` | Pass |
| Maze connectivity | Manual trace of the pillar-placement rule | No isolated pockets — guaranteed by construction |
| Tunnel wrap (row 10) | Manual trace of the x-axis wrap bounds | Works; interrupted mid-row by the ghost-house side walls (expected) |
| Ghost house re-entry | Manual trace of `DOOR` vs. `EMPTY` tile rules | Minor issue found — see below |
| Live gameplay feel | Local HTTP server + browser | **Pending** — needs a human playtest pass |

**Issue found during review:** the ghost house's interior tiles are marked
`EMPTY` (walkable), not walled, so a ghost that has already exited can
occasionally drift back inside through the open interior instead of being
blocked by a proper one-way gate. This is cosmetic (ghosts still function
correctly) but is queued for the refine pass.

### 2.4 Refine

Refinement is an ongoing, playtest-driven phase. Items are pulled from the
[roadmap](#8-roadmap) below as issues are found or requested. Each refinement
should:

1. Reproduce or confirm the issue against the current build.
2. Make the smallest change that fixes it without adding unrequested scope.
3. Re-verify with `node --check game.js` and a manual playtest before
   considering it done.

---

## 3. Architecture

`game.js` is organized top-to-bottom as:

```
Constants (TILE, COLS, ROWS, tile-type enums, DIRS)
Maze construction         buildMaze(), isWalkable(), tileCenter(), pxToTile()
Game state                score, lives, gameState, mode schedule
Pac-Man entity             pacman object + updatePacman()
Ghost entities             makeGhost(), ghostTarget(), chooseGhostDirection(),
                            updateGhostMode(), updateGhost()
Collision                 checkGhostCollisions()
Input                      keydown listener, touch pad bindings
Rendering                  drawMaze(), drawPacman(), drawGhost(), render()
Main loop                  requestAnimationFrame loop, dt-based updates
```

Entities are plain objects, not classes — with a fixed cast of one player and
four ghosts, a class hierarchy would add indirection without benefit.

Movement uses a hybrid model: **position is continuous** (floating-point
pixels, moved by `speed * dt`), but **decisions are discrete** (direction
changes and AI target re-evaluation only happen when
`isAligned()` reports the entity is centered on a tile). This gives smooth
animation without the pathfinding complexity of true free-form movement.

---

## 4. Game mechanics

**Pac-Man**
- Moves continuously in its current direction; a queued `nextDir` is applied
  the moment the entity re-centers on a tile and that direction is walkable.
- Eats `PELLET` (+10) and `POWER` (+50) tiles on contact.
- Eating a power pellet starts a 6-second frightened window and reverses
  every non-eaten ghost's direction.

**Ghosts** — four distinct AI targets, evaluated only at tile centers:

| Ghost | Chase behavior | Scatter corner |
|---|---|---|
| Red | Targets Pac-Man's tile directly | Top-right |
| Pink | Targets 4 tiles ahead of Pac-Man's facing direction | Top-left |
| Cyan | Reflects a point 2 tiles ahead of Pac-Man through Red's position (pincer) | Bottom-right |
| Orange | Chases directly until within 8 tiles, then retreats to its scatter corner | Bottom-left |

At each tile-aligned decision point, a ghost picks the non-reversing
direction that minimizes Euclidean distance to its current target (or a
random legal direction while frightened).

**Mode schedule.** Global `scatter` / `chase` phases alternate on a timer
(7s / 20s / 7s / 20s / 5s / chase-indefinitely), pausing while any ghost is
frightened. A **frightened** ghost turns blue, flees, and can be eaten for an
escalating combo (200 → 400 → 800 → 1600 points), after which it returns to
the house as a pair of eyes and re-spawns.

**Win/lose.** The level is cleared when every pellet and power pellet is
eaten. Losing all 3 lives ends the game. Both end states persist a new high
score to `localStorage` if beaten.

---

## 5. File structure

```
pacman-claude/
├─ index.html         Canvas, HUD, overlay, touch controls
├─ style.css           Palette, layout, responsive touch pad
├─ game.js             Maze, entities, AI, rendering, main loop
├─ DOCUMENTATION.md    This file
└─ CLAUDE.md           Guidance for AI-assisted work in this repo
```

---

## 6. Running it

Open `index.html` directly in a browser, or serve the directory locally if
your browser restricts `file://` canvas access:

```bash
python -m http.server 8765
# then visit http://localhost:8765/index.html
```

Controls: Arrow keys or WASD (desktop); on-screen d-pad (touch devices).
Enter or tap the overlay to start or restart.

---

## 7. Known limitations

- Ghosts can occasionally drift back into the house after exiting, since the
  house interior is walkable rather than gated by a strict one-way door.
- No sound.
- Single maze layout / single difficulty level — no progression across
  levels.
- Not yet verified in a live browser session by an automated tool; relies on
  human playtesting to confirm feel (speed balance, hitbox size, etc.).

---

## 8. Roadmap

- [ ] One-way ghost-house gate so ghosts can't drift back in after exiting
- [ ] Difficulty ramp — ghost speed and frightened duration tighten per level
- [ ] Sound effects (chomp, power-pellet siren, ghost-eaten sting)
- [ ] A second maze layout for level 2+
- [ ] Pause key and a mobile layout pass below ~380px width
