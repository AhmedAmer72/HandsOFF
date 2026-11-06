# Performance and movement

## Why the walk looked slow

`playRoute` waited on a GSAP tween of 0.45 seconds per tile. At the start of each tween, `play("walk")` called `stopAllAction()` and reset the clip. The walk cycle restarted on every cell, and the character paused on the tween boundary. That was independent of how fast the machine could draw.

## What changed

- The raid move is now a queue inside the existing `requestAnimationFrame` loop in `src/three/dungeon.ts`.
- Position advances by `moveSpeed * dt`. Kara is 6.4 units per second, Brann 4.4, Ivo 5.2. A tile is 4 units.
- The walk action crossfades once and stays playing until the queue is empty.
- During a raid the camera eases toward the hero instead of snapping each tile.
- Stats (fps, running average, minimum, draw calls, triangles, renderer string) update twice a second, not every frame.

## Measurement

Renderer: SwiftShader via ANGLE, from the HUD in this Cloud Agent browser.

| | Earlier hall report | This Ashgate session |
| --- | --- | --- |
| Sample fps | about 20 | about 20 at one sample, average 41 across samples |
| Minimum | not recorded | 20 |
| Triangles | 33,970 | 14,478 |
| Draw calls | not recorded | 26 |
| Animated characters | 2 | 3 (hero plus two skeletons) |

These numbers are software WebGL. They are not a 60 fps desktop result. No hardware GPU was available in this environment.
