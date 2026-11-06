# UNDERREALM visual and game world report

6 November 2026, about 3:00 PM Africa/Cairo. Branch `cursor/underrealm-kaykit-world-f3d8`.

This pass is presentation work on the existing local raid. Gold, Cinder, pathing, the page, shops, and saves are the same rules as `docs/SPEC_V10_2_GAME_RULES_IMPLEMENTATION.md`. NEAR is not installed.

## 1. Existing project audit

See `docs/PROJECT_VISUAL_AUDIT.md`. The dungeon, six people, two skeletons, world clicks, and the gallery were already running.

## 2. Asset inspection

See `docs/EXISTING_ASSETS_AUDIT.md` and `docs/ASSET_MANIFEST.md`.

Runtime: 6 hero glb, 4 skeleton glb, dungeon gltf set, 67 weapon files, 102 item files, 14 animation glb. Packs on disk are Dungeon Remastered, Adventurers, Skeletons, RPG Tools, and Character Animations 1.1. All CC0.

Medieval Hexagon Pack is not in the repo. `assets/runtime/environment`, `traps`, and `vfx` are empty.

Lamplighter is not a package in this project. Lighting stays Three.js.

## 3. Asset integration

No new downloads. The raid now also loads `Rig_Medium_Tools.glb` and `Rig_Medium_Simulation.glb` so Hammering and Waving exist at runtime. Nails and green bottles from the existing item and dungeon folders sit on the stalls.

## 4. Characters

| Person | Model | Click |
|---|---|---|
| Kara | Rogue.glb, dagger | Inspect clip |
| Brann | Barbarian.glb, axe | Inspect clip |
| Ivo | Mage.glb, staff | Inspect clip |
| Mira | Knight.glb, hammer | Hammering |
| Orrin | Rogue_Hooded.glb, map | Waving |
| Tallow | Ranger.glb, lantern | PickUp |
| Guard | Skeleton_Minion.glb | Possess from raid 2 |
| Warrior | Skeleton_Warrior.glb | Stands the east post |

They are separate KayKit meshes. A recolor of one body was not used.

## 5. Environment

The connected Ashgate rooms stay: entrance, corridor, hall, west store, trap chamber, combat room, vault. South and east walls still fade, except the entrance doorway. A red banner marks the gate. Elevation is 35 degrees. Clicking a person eases the camera with GSAP.

The world map is still the existing site screen. It does not use hex tiles, because that pack is absent.

## 6. Traps

Spike, pit grate, rolling cask (`barrel_large.gltf`), and bait plate. There is no stone boulder file. Gold rings and larger hit boxes stay. The bottom chips arm the same placement ghost as clicking a ring. A placed trap pops when the raid steps on it. The cask still rolls on the boulder step.

Browser check: Spike chip, then a floor tile, Gold 140 to 110.

## 7. UI

Official colors are in `src/game/visual/palette.ts` and Tailwind. The raid view keeps the 3D room full-bleed, with party cards, vault/gold/cinder/day, a chronicle card, trap chips, and the hint line. Gate, workshop, market, registry, replay, settings, and gallery screens were already present and still navigate.

Gallery gained Front, Side, Back, and Three-quarter. Rogue.glb loaded: 7,562 triangles, Rig_Medium, pack characters-adventurers.

## 8. Animation

See `docs/ANIMATION_MATRIX.md`. Walk, attack, hit, and death were already tied to raid steps. This pass adds inspect, work, talk, and restock from real clip names.

## 9. Economy visuals

Mira’s nails and Tallow’s bottles show four props scaled by stock versus that merchant’s target. The count is read from the save inside the render loop. It does not write game state. A purchase that drops stock hides props on the next frame.

## 10. Burn the page

Death still calls the diary. The page mesh flies. Burn still spends 2 Cinder through `resolvePage`. The ash shrink now also raises a reused ember `Points` cloud. Letting the timer finish still lands the page with Orrin.

## 11. Performance

This machine’s HUD read about 20 fps and named ANGLE SwiftShader (Vulkan, Subzero). That is software WebGL. Draws and triangles were in the same band as the earlier baseline (about 26 draws and about 14,500 triangles before these props). This pass does not claim 60 fps. One render loop remains. Low quality still disables shadows.

## 12. Tests

- `npx tsc --noEmit` passed.
- `npx vitest run` — 28 passed.
- Browser: new game, party cards, chronicle, trap chips, spike placement 140 to 110 Gold, gallery three-quarter view of Rogue.glb.

## 13. Files

- `src/game/visual/palette.ts` added.
- `tailwind.config.js` colors updated.
- `src/game/content.ts` loads Tools and Simulation and maps the extra states.
- `src/three/dungeon.ts` camera, GSAP focus, embers, trap pop, stall props, merchant clips.
- `src/three/gallery.ts` named views.
- `src/ui/App.tsx` shelf counts, trap chips, chronicle card, gallery view buttons.
- Docs listed in the sections above.

## 14. Commands

```bash
npm run dev
```

Open http://127.0.0.1:5173/. The preview host `*.cursorvm.com` is allowed in `vite.config.ts`.

```bash
npx vitest run
npm run verify:economy
```

## 15. Completed, partial, and not done

Completed: palette, 35 degree camera, GSAP focus, extra clips, merchant click animations, ember burst, stall props tied to stock, trap chips, gallery views, trap pop.

Partial: burn camera emphasis is the existing page flight plus embers, not a separate cinematic camera move. Skeleton attack uses the medium melee clip. Ivo does not play a ranged cast. The rolling hazard is a cask, not a boulder. World map has no hex terrain.

Not done: Medieval Hexagon Pack, Lamplighter, KTX2, instanced floor tiles, postprocessing, Rig_Large on Brann. Gameplay rules were not rewritten.

## 16. Known issues

SwiftShader stays near 20 fps. The south wall fade can hide architecture at the bottom of the view; the red banner is the gate control for that reason. Gallery three-quarter framing depends on the glTF bounds and can crop a character. Shelf props are a count of four, not a unique mesh per stock line.
