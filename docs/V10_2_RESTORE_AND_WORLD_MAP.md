# v10.2 restore and shared world map

Checked 8 November 2026, 5:28 AM Africa/Cairo. Navigation note, 8 November 2026, 1:46 PM Africa/Cairo: the hex island is no longer a screen. The same sections open from the left icon bar. An old save whose screen is still `map` opens Home.

UNDERREALM stays a dungeon-owner game. Kara, Brann, and Ivo still decide whether to raid. The world map does not offer a player-controlled raid, a party, or an "enter their dungeon" action. `rules/economy.ts` was not edited.

The shared board is local to this device. It is the same store every keeper on that device reads. It is not a mainnet contract and it is not a remote server. Another computer will not see these halls until a real service exists. The label on that gap is BLOCKED, not done.

## What was already compliant

- The player defends Ashgate. Heroes are the raiders. Profiles, memory, and the burn / let-land loop are the ones already covered by `heroBehavior.test.ts` and `rulesLoop.test.ts`.
- Mira buys salvage for Gold. Orrin keeps landed pages. Tallow sells gear. Shop states use the 0.02 / 0.01 mock purse floors.
- Craft output class is the lowest input class. A play-only item still cannot be listed for the small purse currency.
- Permit price in `rules/economy.ts` is still 0.01, and the split is still 50 / 30 / 10 / 10.
- The six recipes are unchanged: spike 10 iron + 5 bone, pit 20 iron + 10 ash, boulder 30 iron + 20 bone, potion 5 ash + 5 bone, armor 20 iron, boots 10 iron + 10 ash.

## Drift found

| Feature | v10.2 | What the build was doing | Files | Correction |
|---|---|---|---|---|
| World map | §5.6 diorama of published halls, open/closed, traffic, spectator | Five local CSS hexes and one prop preview | `App.tsx` | Replaced with the diorama and the public registry |
| Market and workshop | §5.5 stalls and craft, reached from the world | Always-open pages | `App.tsx` | Physical halls. The same buy, supply, list, and craft functions |
| Player as raider | Not in v10.2 | Not present in this branch | — | Not added |

No committed system let a person steer Kara, Brann, or Ivo, or walk into someone else's hall as the attacker. That idea was rejected before it landed.

## Compliance matrix

| Feature | v10.2 | Status | Note |
|---|---|---|---|
| Player owns and defends one hall | §3.1 | COMPLIANT | Raid, traps, vault, pages |
| Three AI heroes raid | §3.6 | COMPLIANT | Independent accept / refuse |
| Five combat verbs | §3.3 | INCOMPLETE | Drag is click-to-place. Trigger spends a trap. Bait and possess are partial. Burn / land works |
| Burn, memory, epoch, rumour | §3.4–3.5 | COMPLIANT | Landing still teaches nobody. Tests cover the five memory levels |
| Raid contract board in the live hall | §3.9, §5.2 | INCOMPLETE | Gate lists hero decisions in play Gold. `MockChain` can fund 0.01 and refund. The live gate does not escrow that permit |
| Canonical prices and classes | §4 | COMPLIANT | `rules/economy.ts` untouched. 70 tests pass |
| Merchants Mira, Orrin, Tallow | §3.7 | COMPLIANT | No fourth merchant ledger |
| Recipes | §3.7 | COMPLIANT | Forge shows potion. Anvil shows the three traps. Bench shows armor and boots |
| World map diorama | §5.6 | COMPLIANT | Orthographic diorama, KayKit props, roads, river, ridges. Markers come only from the registry |
| Shared discovery across devices | §5.6, §7 | BLOCKED | No shared host. Same-device keepers do see each other |
| Public vs private | §5.10 | COMPLIANT | Public card has no trap coordinates and no owner buttons for another keeper |
| Live traffic numbers | §5.6 | COMPLIANT | Traffic is settled raid count. Zero stays zero. No invented arrows |
| Spectator | §3.9, §5.6 | INCOMPLETE | Read-only screen exists and refuses trap, trigger, burn, and a new raid. A live raid was not watched in the browser this pass because none was active |
| Mainnet deed, login, settlement | §7 | BLOCKED | Mock only. Receipts stay simulated |
| Tier 5 and mastery variants | §3.8, roadmap item 18 | INTENTIONALLY DEFERRED | Tiers still stop at the existing 1–4 bands |
| Guest raid with no wallet | §5.0 | COMPLIANT | Market, workshop, and map open with no wallet prompt |

## How a hall becomes visible

`src/game/world/registry.ts` is the only public list. A draft stays on the keeper's save. Publish writes a card: name, owner, description, tier, open/closed, settled raids, hero traffic, merchant shop states, and a pad on the diorama. The card is built by `toPublicCard`, which copies that list and nothing else. Trap coordinates are not on it.

Closing the vault sets the public gate to CLOSED the next time the published hall is mirrored from `startRaid`. Reopening follows the existing free or paid reopen in `nextDay`. Unpublish removes the card.

Keeper B, on the same device, reads that store. The test `lets a second keeper discover a published hall` publishes as Keeper A, sits as Keeper B, sees the hall, and then checks that unpublish hides it.

## Spectator

`watchRaid` opens only when that hall has an active raid record. The screen plays the recorded steps. `placeTrap`, `relayTrap`, `triggerTrap`, `resolvePage`, `armPossess`, and `startRaid` return immediately while `spectating` is set. The browser pass had no live raid, so the button read "No live raid" and stayed disabled.

## Market and workshop

Both rooms use the raid hall's KayKit stone, walls, torches, and orthographic camera. WASD pans that camera, Q and E yaw it, and the wheel zooms, with the same speeds as the raid. Click the stall the view is on. The trading and crafting panel closes without moving the camera.

Mira still buys iron, ash, and bone and sells her stock. Orrin still offers buy-back of unsold pages. Tallow still sells his stock. The listing board is the existing escrow market, not a new merchant. The forge, anvil, and bench call `craftTrap` with the six recipes. The nail kit and vault brace were already on the workshop page. They stayed on the forge. They are not new recipes.

## Tests

`npx vitest run` on 8 November 2026, 5:28 AM Africa/Cairo: 10 files, 70 tests, all passed. `npx tsc --noEmit` passed.

Browser, fresh storage, desktop Chrome with SwiftShader:

- Standing at Mira, E opened her stall. Supply 1 iron returned "Mira took the iron." Close removed the stall. The keeper was still in the market. The pose moved from 5.20, 6.50 to 5.20, 7.17 while S was held.
- The forge prompt appeared. Crafting the potion reported `Crafted potion. Class PLAY_ONLY.` Ash and bone were shown as 6/5 before the craft, which is the published recipe.
- Publish put 1 public hall on the map. Keeper A's card included "Open your hall" and "Charter".
- Sitting as Keeper B, the same Ashgate card was visible. It did not include "Open your hall", "Charter", or a tile coordinate. The log line was `LEAKED false`.
- The only console 404 was `favicon.ico`.

The walk is in `underrealm-map-market-workshop.mp4` with stills `market-talk.png`, `workshop-craft.png`, and `map-other-keeper.png`.

## Still open

- The live gate does not yet escrow a 0.01 permit or show the TTL ring. Heroes still accept from the existing play-Gold board. `MockChain` already has the permit object for the developer screen.
- Possess, bait's three-second path, and a mid-raid trigger bonus are still the partial versions from the earlier audit.
- Spectator playback was proven by the unit test, not by a second browser sitting through a live raid.
- Halls do not leave this device.
