# Existing prototype audit

Inspected 5 November 2026 (Africa/Cairo) before the gameplay pass.

The working prototype was the Vite app in `src/`: a Three.js dungeon (`src/three/dungeon.ts`), a model gallery (`src/three/gallery.ts`), and React screens in `src/ui/App.tsx`. KayKit glTF/GLB files under `assets/runtime` loaded with textures. Brann, Kara, and Ivo were separate Adventurer meshes. The skeleton was `Skeleton_Warrior.glb`. Idle clips came from the Rig_Medium animation pack.

What already worked and was kept:

- Orthographic camera, pan, zoom, and limited yaw.
- Floor, wall, torch, chest, barrel, and weapon placement in the prototype room.
- Asset gallery with orbit and clip playback.
- ACES lighting and the warm torch point lights.
- Local `localStorage` notes for gold and a cosmetic diary banner.

What was only visual, and is now driven by rules:

- Skeleton chasing and hero clicking were renderer-side. They did not decide raid outcomes.
- Merchant stock in the old UI was a static list. Balances were not finite agent wallets.
- Burn and escape changed a string and a gold penalty. They did not create or withhold facts.
- There was no pathfinding, no day loop, and no raid event log.

No separate economy or gameplay design document was in the repository. Numeric rules in `src/game/config/` are conservative defaults and are labeled as such.
