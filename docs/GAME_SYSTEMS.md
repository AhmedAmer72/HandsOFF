# Game systems

The rules engine lives in `src/game/engine` and does not import Three.js.

- `raid.ts` produces the event list, damage, death, survival, and diary facts.
- `path.ts` is deterministic A* over the prototype hall and the south corridor.
- `decisions.ts` scores raid acceptance and one pre-raid purchase.
- `pricing.ts` is the only price formula.
- `newGame.ts` builds the day-1 save and the next-day restock.
- `persist.ts` writes IndexedDB database `underrealm`, store `saves`, and mirrors the same JSON to `localStorage` key `underrealm-save-v3`.

`src/three/dungeon.ts` still owns the scene, materials, camera, and AnimationMixer. `playRoute` moves the hero through the event list. Trap meshes are the same KayKit files as the prototype.

Screens in `src/ui/App.tsx`: menu, dungeon overview and builder, live raid, burn card, raid report, gate market, player market, workshop, world map, registry, replay, settings, gallery.
