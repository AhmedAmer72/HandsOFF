# Project visual audit

Inspected 6 November 2026, about 2:50 PM Africa/Cairo. The playable game was already on branch `cursor/underrealm-kaykit-world-f3d8`.

## What was already working

- Vite, React, TypeScript, Three.js 0.170, GSAP, and Tailwind. No Web3 packages.
- Orthographic dungeon, KayKit floors and walls, connected rooms, torches, vault chest, props.
- Kara (Rogue), Brann (Barbarian), Ivo (Mage) in the hall. Mira (Knight), Orrin (Rogue Hooded), Tallow (Ranger) in the west store.
- Skeleton minion and skeleton warrior on their posts.
- World clicks: gold-ring traps, red banner, page, merchants, anvil, vault, hall guard.
- Local rules for Gold, Cinder, vault bleed, memory, and shops. IndexedDB save.
- Asset gallery that loads real glTF files and plays clips.
- SwiftShader in this environment. Earlier HUD samples were about 20 fps, average about 41, minimum 20.

## Gaps found before this pass

- Colors were close to the art direction but not the official hex set.
- Camera elevation was about 45 degrees, steeper than the 30–40 degree target.
- Clicking a hero copied the focus and then ran an empty GSAP tween, so the camera did not ease.
- Merchant and hero clips for work, talk, inspect, and buy were not wired. Tools and Simulation packs were on disk and not loaded.
- The burn was a shrink plus ash sprite, without ember particles.
- Trap triggers did not move the placed mesh.
- Merchant stock did not change the props beside the stall.
- The gallery had drag and zoom, not named front, side, back, and three-quarter views.
- Medieval Hexagon Pack is not in `assets/vendor` or `assets/runtime`. The world map cannot use hex tiles until that pack is added.
- Lamplighter is not a dependency. Lights are Three.js hemisphere, directional, and torch point lights.
- `assets/runtime/environment`, `traps`, and `vfx` are empty. Traps and effects use dungeon and item meshes.
- No stone boulder mesh. The rolling hazard is `barrel_large.gltf`, shown as a rolling cask.
- Rig_Large clips exist and are not applied. Every live character uses the medium rig.

## Left untouched

Gameplay rules, prices, pathing, save format, and the decision to keep NEAR uncharged.
