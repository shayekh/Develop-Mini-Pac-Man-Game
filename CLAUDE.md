# CLAUDE.md

Guidance for Claude Code (or any AI assistant) working in this repository.

## Project

A dependency-free Pac-Man clone: `index.html` + `style.css` + `game.js`.
Pure HTML5 Canvas and vanilla JavaScript — no build step, no package manager,
no framework. Full build history and mechanics are in `DOCUMENTATION.md`;
read that first for context before making changes.

## Running / testing

There is no test suite or build pipeline. Verification is:

```bash
node --check game.js        # syntax check — run after every edit
python -m http.server 8765  # then open http://localhost:8765/index.html
```

There is no automated gameplay test. After any change to `game.js`, a human
(or browser automation, if available in-session) needs to actually play a
round to confirm movement, collisions, and AI still feel right — static
checks alone don't catch gameplay regressions.

## Architecture notes

- Entities (`pacman`, `ghosts[]`) are plain objects, not classes. Keep it
  that way — the cast is fixed (1 player + 4 ghosts), a class hierarchy
  would be pure indirection.
- Movement is a hybrid model: continuous pixel position, but direction
  changes and AI re-targeting only happen when an entity is tile-aligned
  (`isAligned()`). Don't switch to per-frame direction changes — it breaks
  the corridor-snapping feel the arcade original has.
- The maze is procedurally generated in `buildMaze()` (a pillar grid, not
  hand-traced ASCII art) specifically so connectivity is guaranteed by
  construction. If you edit the maze, preserve that property — don't
  reintroduce hand-authored layouts without re-verifying every corridor is
  reachable.
- Tile-type constants (`WALL`, `PELLET`, `POWER`, `EMPTY`, `DOOR`) and the
  `DIRS` vector map are the vocabulary the rest of the file is built on;
  keep new logic consistent with them rather than introducing parallel
  representations.

## Conventions

- No dependencies. Don't add a bundler, npm packages, or external font/CDN
  links — the game must keep working by opening `index.html` directly (or
  via a plain static server).
- No comments explaining *what* code does; only *why*, and only when
  non-obvious (e.g. a workaround or an invariant the maze/AI logic depends
  on).
- Match existing style: plain functions, `const`/`let`, no semicolon
  omission, 2-space indentation.
- Keep changes scoped — this is a small, complete game. Don't add
  speculative abstractions (e.g. a generic entity-component system) for
  hypothetical future levels; extend concretely when a feature is actually
  requested.

## Known open items

See `DOCUMENTATION.md` → **Known limitations** / **Roadmap** for the current
list (ghost-house re-entry gate, sound, difficulty ramp, multi-level, pause
key, small-screen layout). Check that list before starting new work so
effort isn't duplicated, and update it when an item is resolved or a new one
is found.
