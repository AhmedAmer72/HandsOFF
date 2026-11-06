# UNDERREALM main menu

6 November 2026, about 4:30 PM Africa/Cairo.

The landing screen is the game’s Home screen. The raid, market, workshop, and save rules are unchanged. There is no wallet control.

## What you see

A live Three.js fortress: dungeon floor tiles, wide stairs, a doorway, walls, pillars, two red banners, torches, a gold chest, Brann, Kara, Ivo, and two skeletons. Embers drift. The camera eases around the gate. The UI sits on top: gold title, Enter dungeon, Watch trailer, the Ashgate stat card, four feature cards, and the parchment line “Strategy is power.”

## Files

Created:

- `src/assets/manifest/mainMenuAssets.ts`
- `src/three/scenes/MainMenuScene.ts`
- `src/animations/mainMenuTimeline.ts`
- `src/ui/screens/MainMenu.tsx`
- `src/ui/main-menu/Logo.tsx`
- `src/ui/main-menu/MainMenuNavigation.tsx`
- `src/ui/main-menu/MainMenuHero.tsx`
- `src/ui/main-menu/MainMenuStats.tsx`
- `src/ui/main-menu/MainMenuFeatures.tsx`
- `src/ui/main-menu/MainMenuBanner.tsx`

Modified:

- `src/ui/App.tsx` — Home uses this menu and hides the old bar while it is open.
- `src/game/store.ts` — `enterDungeon()` continues a save and only starts a new game when none exists. `continueReady` is set when a save loads or a new game starts.

## Assets in the scene

All of these files were already in `assets/runtime`:

- `floor_tile_large.gltf`, `wall.gltf`, `wall_doorway.gltf`, `stairs_wide.gltf`, `pillar.gltf`, `banner_red.gltf`, `torch_lit.gltf`, `chest_gold.gltf`
- `Barbarian.glb`, `Rogue.glb`, `Mage.glb`
- `Skeleton_Minion.glb`, `Skeleton_Warrior.glb`
- Idle clip `Idle_A` from `Rig_Medium_General.glb`

No Medieval Hexagon pieces. No screenshot is used as the background. If WebGL fails to start, the same buttons sit on a dark gradient.

## Lighting and motion

Hemisphere fill, one cool rim light, and three torch lights. Shadows are off on this scene so the menu stays lighter than the raid. Fog is `#14100E`. Exposure fades up over about a second. Banners sway. Embers recycle in one `Points` object. Idle clips run on `AnimationMixer`.

GSAP fades the panels in. Skip intro reveals them at once. Buttons lift on hover. Watch trailer runs a camera timeline: gate, Brann, Kara, Ivo, skeletons, then back. Close, Skip, and Replay are on that overlay. Close returns to the menu. Skip ends the shot.

## Navigation

| Control | Opens |
|---|---|
| Home | This menu |
| Raid, Raid card, Enter dungeon | The dungeon, without clearing the save |
| Market, Market card | Player market |
| Workshop, Workshop card | Workshop |
| Agents, Profile | Agent registry |
| Lore, Replay card | Replay and chronicles |
| Settings | Graphics and the explicit New game control |
| New game (only after a save exists) | Clears the save and opens Ashgate |
| Watch trailer | The in-engine camera sequence |

## Data

The card reads the live save: vault as treasury, day, phase as the raid line, living heroes, cinder, reputation. The browser check showed Treasury 1200, day 1, “Before the gate”, 3 heroes, cinder 3, reputation 0. Enter dungeon then showed Gold 140, the same starting purse, not a wiped screen.

## Layout

Wide screens keep the title on the left, the gate in the center, the card on the right, and the four cards along the bottom. Narrow screens stack the card under the title and use two columns of feature cards. A phone width was not captured in the browser.

## Checks

- `npx tsc --noEmit` passed.
- `npx vitest run` — 28 passed.
- Browser: menu, trailer skip and close, Market (nails, iron, bone, ash), back to the menu, Raid card into the dungeon with Gold 140.

This machine is SwiftShader. The menu does not print its own fps counter. It uses fewer lights and no shadow map than the raid, which previously sat near 20 fps on the same GPU.

## Known limits

The three heroes stand close together in the foreground, so the group reads as a cluster more than three full portraits. The skeletons sit by the gate and leave the frame when the camera favors the stairs. There is no separate mountain mesh. New game is a real reset and is labeled as such.
