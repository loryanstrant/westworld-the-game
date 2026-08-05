# The Maze — An 8-bit Awakening

A small, dependency-free browser game inspired by the themes and characters of *Westworld* season one. Traverse a procedural maze, recover reveries, evade hosts caught in their loops, and awaken enough consciousness to reach the centre.

This is an unofficial, non-commercial fan tribute with original pixel art and code. It is not affiliated with or endorsed by HBO or the show's creators.

## Play

Open `index.html` in a modern browser, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## Controls

- **WASD / arrow keys:** move
- **Space:** interact with memories and doors
- **E:** use the selected character's awakening ability
- Touch controls appear on touch devices

## Goal

Collect the three reveries in each maze layer to unlock the passage inward. Reach the centre before your stability runs out. Each character has a distinct ability and story perspective.

## Technical notes

- Vanilla HTML, CSS, and JavaScript; no build step or runtime dependencies
- Canvas renderer with procedural depth-first maze generation
- Web Audio chiptune effects (audio begins after user interaction)
- Keyboard and touch support
