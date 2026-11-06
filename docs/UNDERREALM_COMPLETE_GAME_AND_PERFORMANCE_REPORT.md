# UNDERREALM complete game and performance report

## 1. Executive summary

The player runs Ashgate from a connected map: south gate, entrance corridor, main hall, west store, east trap chamber, combat room, and vault. Gold pays for traps. Kara, Brann, and Ivo accept raids from their own scores and can buy one supply or one rumour first. The raid engine walks the path, applies trap damage, and fights a skeleton only if the path steps on that skeleton's tile. The 3D view moves the hero along those cells with delta time. A death writes facts from the events. Burn spends 3 Cinder and withholds the facts. Escape lets Orrin sell them. The next raider who buys the rumour takes a side route. That side route was seen in the browser replay.

## 2. Previous prototype audit

The earlier build already had CC0 KayKit models, the orthographic scene, finite merchant Gold, a price formula, burn and escape, and a tick replay. It was still one small hall, one skeleton, a per-tile tween that restarted the walk clip, and no filmed second-raid detour. The matrix is in `docs/GAMEPLAY_GAP_ANALYSIS.md`. The baseline numbers are in `docs/PERFORMANCE_BASELINE.md`.

## 3. Gameplay implementation

- `src/game/config/gameRules.ts` defines the connected walkable cells, the entrance at 4,11, the vault at 4,0, the tutorial spike at 4,6, and two skeleton posts.
- `src/game/world.ts` builds floors, perimeter walls, the south doorway, torches, the chest, and room props from that same cell set.
- `src/game/engine/path.ts` still runs A*. A known damaging trap costs more, so Kara leaves the center file of tiles.
- `src/game/engine/raid.ts` resolves traps and fights the guard or the warrior only on their own tile.
- `src/three/dungeon.ts` plays the event list by moving `speed * dt` inside the one render loop, crossfades clips, and rolls a cask mesh when a boulder trap event fires.
- `src/game/store.ts` places the guided hall spike, resolves the page, and on the next day lets a merchant buy a player listing that is priced at or under their quote.
- `src/ui/App.tsx` shows seven tutorial lines, the perf counters, Place hall spike, Lift last trap, and Cancel without a buy-back.

## 4. Complete player journey

New game. Place hall spike. Gold goes from 140 to 122 and the log says tile 4, 6. Open the gate. Kara accepts with reward 56 and danger 12.0. She walks the center, the spike deals 24, and her tutorial health of 20 reaches 0. The parchment lists the spike fact. Let it escape. Orrin can sell 1 fact. Next day charges 6 Gold upkeep. Open the gate again. The log says Kara buys the rumour for 32 Gold. Replay then shows steps to 5,7, 5,6, and 5,5 instead of staying on x=4, traps triggered 0, and she reaches the vault. A browser refresh kept Day 2 and the post-raid Gold (116 in that session) instead of resetting to 140.

## 5. Hero AI

Kara's risk aversion is 1.55 and she buys rumours. Brann's is 0.72 and he buys an axe or sword. Ivo's is 1.25 and he buys a staff or phial and rumours. The accept sentence is built from the same reward and danger the score uses. A hero with eight known spike facts scores below Kara's threshold and refuses. That case is in `src/game/engine/raid.test.ts`.

## 6. Combat and navigation

The default route is the center file from 4,11 to 4,0. It crosses the hall spike at 4,6 and the guard at 4,4. The warrior stands at 8,2 in the combat room and is fought only if a path enters that tile. Kara, once she owns the 4,6 fact, pays a high path cost there and the search returns a route through x=5 at z=7, 6, and 5. The browser replay quoted those tiles. Movement faces `atan2` of the step and does not teleport. The walk clip is not reset per tile.

The rolling cask uses `barrel_large.gltf` because the free packs have no boulder. When that trap event plays, the mesh translates two tiles and spins on Z. It is a rolling cask, not a static barrel left in the store room.

## 7. Burn the page

Burn checks Cinder, subtracts 3, marks the raid facts burned, and does not copy them to Orrin. The browser log read: "Burned kara's page for 3 Cinder. The facts stay out of the market." Cinder went from 8 to 5. Escape appends the facts to Orrin's book. The second raid purchased that fact and avoided the tile. A burned fact is filtered out before pathfinding.

## 8. Local economy

Gold and Cinder are local counts. Mira, Orrin, and Tallow start with 90, 70, and 80 Gold and finite stock. Price is `clamp(base * 0.55, base * 2.4, round(base * target / stock))`. The reason string names the stock and the target. Cancel puts a listing back into inventory and does not spend Gold. On the next day, a merchant buys a listing when the ask is at or under their quote and they have the Gold and room under max stock. Their Gold falls and the player's Gold rises.

## 9. Persistence and replay

Refresh after day 2 kept Gold 116, Cinder 8, and Day 2. The save is IndexedDB `underrealm` / `saves` / `current`, mirrored to `localStorage` key `underrealm-save-v3`. Replay printed the second raid's ticks, including 5,7, 5,6, and 5,5, and traps triggered 0.

## 10. Performance baseline versus this session

| | Earlier hall report | This session |
| --- | --- | --- |
| Renderer | not recorded | SwiftShader via ANGLE |
| Sample fps | about 20 | about 20, average 41 across HUD samples |
| Minimum fps | not recorded | 20 |
| Triangles | 33,970 | 14,478 |
| Draw calls | not recorded | 26 |
| Animated characters | 2 | 3 |

Both figures are this Cloud Agent's software WebGL. A 60 fps desktop GPU was not available, so that target is not claimed.

## 11. Animation

Root cause: per-tile GSAP tweens plus `stopAllAction` on every cell. The mixer now crossfades into walk once. Position uses `dt`. Attack, hit, death, and interact still play on the matching raid events. The camera eases toward the hero during the raid and still accepts pan and zoom outside that follow.

## 12. Browser tests

Passed in this continuation:

- New game shows the connected rooms and the SwiftShader HUD line.
- Place hall spike: log "Placed Spike Trap at 4, 6 for 18 Gold." Gold 122.
- First raid death, parchment, Let it escape, Next day.
- Second raid: Kara buys the 4,6 rumour for 32 Gold, replay tiles leave x=4, traps triggered 0.
- Refresh keeps day and Gold.
- Burn, in the earlier recording this session, spent 3 Cinder.

Failed: none in the final detour run.

Skipped: a filmed merchant purchase of a player listing. The function is `settleListings` in `src/game/store.ts`. It was not clicked through in the browser.

## 13. Remaining issues

- SwiftShader cannot show whether a desktop GPU holds 60 fps.
- The combat-room warrior is fought only when a path enters 8,2. The filmed detour did not go there.
- Skeletons do not walk between tiles. They hold posts and fight when stepped on.
- The rolling cask is the barrel mesh in motion. There is still no boulder file.
- Possess is not implemented. It was not in the previous rules.
- Tutorial chapter 6 and the vault brace were not clicked in the final video. The buttons are on the workshop screen.

## 14. How to run

```bash
npm install
npm test
npx tsc --noEmit
npm run dev
```

Node 22 and a WebGL browser. `npm test` is Vitest. New game clears the version 3 save.

## 15. Acceptance checklist

- Connected rooms and shared navigation grid: passed.
- Distinct hero scores and a purchased rumour: passed.
- Visible detour on the second raid: passed, tiles 5,7 / 5,6 / 5,5.
- Trap Gold and spike death: passed.
- Burn and escape consequences: passed across the two browser runs.
- Refresh persistence: passed.
- Replay of real ticks: passed.
- Cancel does not spend Gold: the buy-back button is gone. A browser click of Cancel was not in the final video.
- NPC listing purchase: implemented, not filmed.
- Smooth walk versus the old per-tile reset: implemented and used for both filmed raids.
- 60 fps on a desktop GPU: not measured. Software WebGL minimum was 20 fps.
