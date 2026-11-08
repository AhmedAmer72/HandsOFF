# README v10.2 compliance matrix

The 8 November 2026, 5:28 AM Africa/Cairo pass for the shared world map, the physical market, and the physical workshop is in `docs/V10_2_RESTORE_AND_WORLD_MAP.md`. That note wins for §5.6 and for the market and workshop screens. The tables below stay as the earlier audit.

## Acceptance pass (8 November 2026, about 3:50 AM Africa/Cairo)

`npm test` passed: 9 files, 66 tests. `npm run build` completed. The one-sitting browser path from a fresh guest through trap, death, rumour, second raid, supply, listing, and replay was not finished; the browser driver stopped before that run. Statuses below stay PARTIAL or MISSING where that sitting did not produce evidence. Earlier sittings on this branch did open the screens named in the later notes. Rows in the tables that still say a screen does not exist are out of date; this note wins.

Replay: the same raid inputs produce the same event list and the same `outcomeHash`. A different layout produces a different hash. `BLOCKCHAIN_MODE` is `mock`.

## Rendering pass (7 November 2026, about 7:00 PM Africa/Cairo)

The hall was measured on SwiftShader, not a hardware GPU. A half-second window moved between 28 and 58 fps. The 95th percentile frame stayed near 56–58 ms. The scene drew 141 calls, 72,249 triangles, and 88 textures, with 8 skinned characters. Low and High shared those draw counts, so the shadow map was not the limiter on this renderer. Details are in `docs/PERFORMANCE_REPORT.md`. This is not a 60 fps result.

Hit-stop, shake, damage marks, the vault coin burst, and the page slow-down use `rules/feel.ts` and only run for a real raid step. Reduce Motion turns them off.

## Interface pass (7 November 2026, about 5:40 PM Africa/Cairo)

Home, Gate, Raid, Workshop, Market, Map, Heroes, Replay, A Week of Raids, Charter, Guild, Take it home, Settings, and Mock chain share one stone-and-gold shell. Titles use Lilita One. Body text uses Fredoka. Cards are 16px rounds. Portrait width collapses the links into a Menu drawer. The raid chronicle is a set of category cards and stays closed on a narrow hall until Chronicle is opened. Guild “Post a restock task” wrote a real simulated proposal. Take it home shows a simulated fee and does not send anything. Play screens do not use wallet, token, gas, chain, or NFT wording. The verified rows on Heroes are marked unverified.

## Mock chain pass (7 November 2026, about 5:20 PM Africa/Cairo)

The developer screen at Settings → Mock chain drives one local `MockChain`. Receipts are labeled SIMULATED. VRF seeds, AI checks, intents custody, the relayer, and guild payouts are marked as not cryptographic and do not open a socket. `installMockGuard` still throws on NEAR host names.

Security tests cover a second buyer, a second settlement, a callback that fails after the debit, an unlisted receiver, a bad relayer receiver, replay, the daily key cap, a revoked key, a previous deed holder, and a guild bounty. Invalid calls leave balances and owners where they were. `npx vitest run src/blockchain/security.test.ts src/blockchain/MockChain.test.ts`: 16 passed.

The dungeon play-gold purse stays the raid book. Resetting the demo ledger does not clear that save.

## Economy pass (7 November 2026, about 5:05 PM Africa/Cairo)

Merchants price canonical goods through `stockPrice` / `liveQuote` in `src/game/rules/money.ts`. Stall goods use the same `stockCurve`. Rumours use `rumourPrice`. Buy-back uses `buybackPrice`. Shop state uses `MERCHANT.reserveNEAR` 0.02 and `closeBelowNEAR` 0.01 on the mock NEAR purse. A sale splits 90 / 5 / 5. Play-only goods cannot be listed for NEAR. Craft output class is the lowest input class.

Browser, fresh game: crafting a spike reported `PLAY_ONLY`. Supplying 5 ash quoted stock 80 / target 80 / base 8, then stock 85. The gate showed Mira, Orrin, and Tallow open with 0.1000 mock NEAR, and a Why line with those inputs. Listing iron for play gold put it in escrow; cancel returned it. Listing it for NEAR was rejected and the stack did not move. `npx vitest run`: 7 files, 57 tests.

The live hall still does not call a network. Mock NEAR is a number on the save.

## Hero behavior pass (7 November 2026, about 4:30 PM Africa/Cairo)

Kara, Brann, and Ivo now read the v10.2 agent table: risk 0.3 / 0.8 / 0.5, rumour appetite 0.7 / 0.2 / 0.9, mock purse 0.05. The hall still spends play Gold. A browser raid on one spike at 4, 6 showed Kara walk `4,11 · 4,10 · 4,9 · 4,8 · 4,7 · 4,6`, die, and keep `observed · eyes` after the page landed. Ivo bought that rumour, then walked `4,11 · 4,10 · 4,9 · 4,8 · 4,7 · 5,7 · 5,6 · 5,5 · 4,5 · 4,4 · 4,3 · 4,2 · 4,1 · 4,0` and survived with traps sprung 0. Brann’s card stayed “No trap memory yet.” `npx vitest run` is the automated check for the same split, plus dodged, countered, bait, and a stale epoch.

3.5 is DONE for the five memory levels in tests, and the film covers unseen, observed, and warned. 3.6a stays DONE. 3.6b stays PARTIAL: the counter moves the recorded agent share once and the offer price does not change, but the live purse is play Gold. Gear does change a hit (armor −1, a phial outside the tutorial, boots ×1.3 on the vault bleed).

## Raid-loop pass (7 November 2026, about 3:05 PM Africa/Cairo)

Browser, fresh game, spike placed at 4, 7 (on the walk). Kara died. Traps sprung 1. Spike kills 1. Bone went from 6 to 11 (thief salvage). The page was offered for 2 Cinder, then landed. Orrin can sell 1 fact. Tier 1. Next wave advanced the day. An earlier fresh game triggered the spike before the gate: the chronicle said it would not hit again, and the chain read ×1.

Engine tests now also cover a spent spike (no 24 damage) and a phial that stops a lethal spike. The first-lesson raid still kills Kara, because the phial does not fire during that tutorial. 39 tests passed after this change.

Rows below are the earlier audit. Where this pass changed a status, the note above wins: 3.3b is PARTIAL (trigger spends the trap before the gate; it is not a mid-fight tap with a spectacle kill bonus). 3.3c was seen in the browser as a flying page that landed. 3.7c salvage on death was seen (bone 11). 3.8 mastery counter moved to 1 and is still not a blueprint. 5.4 now has a results card with pages, salvage, spike kills, tier, and Next wave. Vault-0 close and the paid reopen exist in `nextDay` and were not driven to 0 in the browser.

## Earlier audit the same day

Checked 7 November 2026, about 2:46 PM Africa/Cairo. The app was open at http://127.0.0.1:5173/. `npx vitest run` reported 5 files, 37 tests, all passed. The renderer line on the raid screen read about 20 fps, ANGLE, SwiftShader. That is software WebGL on this machine, not a desktop GPU average.

Statuses mean: DONE was seen working in this audit or in a test that still passes. PARTIAL exists but does not match the section. MISSING has no player-facing behavior. NOT TESTED was not exercised this pass. BLOCKED is real-network work, which this project must not do.

## Screenshot notes (raid, gate, map, settings)

The raid HUD shows Vault 1200, −0/s, Gold 110, three cinder pips, Wave 1, and ×0. Kara reads HP 64/64 and purse 80. Brann and Ivo show full bars and purses. None of the cards show a bounty. Memory says “No trap memory yet,” which matches a spike that has not been walked. The chronicle filters are All, Traps, Vault, Rumours, Market. The Raid filter is easy to miss. Entries are still full sentences (“Placed Spike Trap at 4, 6 for 30 Gold”). The trap bar shows four model pictures plus Possess at 25 gold. The hint bar covers the bottom of the hall. There are no health bars on the 3D figures.

Gate shows a text raid board. Kara, Brann, and Ivo each have an accept line with different danger numbers (18.2, 12.0, 12.0). Mira, Orrin, and Tallow are OPEN with gold balances. Orrin’s stall is empty. There is no TTL ring, no split counter, and no 0.01 price. Prices are play Gold (nails 4, phial 12).

The world map draws five CSS hexes (Ashgate, Cinder Raid, Mira, Orrin, Tallow). The side view is one dungeon prop, not five dioramas. The caption admits the hexes are drawn, not a hex pack.

Settings has low / medium / high, New game, Ownership details, Model shelf, and Hero directory. No sound, music, haptics, language, or reduce-motion control. The page is mostly empty.

Workshop, from this pass’s navigation notes and the craft buttons in `src/ui/App.tsx`, exposes a spike craft, an iron supply, a nail kit, and the vault brace. Pit and boulder recipes exist in `rules/economy.ts` and `craftTrap`, but the screen does not offer those buttons.

## Gameplay

| ID | Section | What the spec requires | What is implemented | Files | Status | Missing | Test still needed |
|---|---|---|---|---|---|---|---|
| 3.1 | 3.1 | Player defends, supplies, controls pages, runs the market | Traps, supply, burn/land, and a Gold stall exist | `src/game/store.ts` | PARTIAL | Market and raid do not share one ledger | One raid that changes both books |
| 3.2 | 3.2 | Gate, bleed 1/s, death, page, between-wave economy, raid end | One hero per day walks a path. Vault bleed is applied from step time. Page is 3 seconds | `raid.ts`, `store.ts` | PARTIAL | No funded offer before the walk. No vault-0 close. No outcome hash | Vault at 0; offer then raid |
| 3.3a | 3.3 | Drag / re-lay. Spike 30, pit 80, boulder 120, re-lay 5, epoch +1 | Toolbar ghost, click to place, click a placed trap then a neighbor. Costs match `RAID` | `dungeon.ts`, `trapDefinitions.ts` | PARTIAL | Not a pointer drag. Rearm 0.5 s is not shown | Drag from the bar onto a tile |
| 3.3b | 3.3 | Trigger is free and builds ×2, ×3 | Walking onto a plate springs it. The HUD × is the trap count, not a spectacle multiplier | `raid.ts`, `App.tsx` | MISSING | No tap-to-fire and no chain bonus | Tap a trap during a raid |
| 3.3c | 3.3 | Burn costs 2 Cinder or the page lands | Countdown lands the page. Burn spends 2. Observed memory remains | `store.ts` `resolvePage` | DONE | Timer is digits, not a ring. Burn target size was not measured | Click the page mesh in the browser |
| 3.3d | 3.3 | Bait 25 Gold, path shown 3 s | Bait is a placeable trap. Greedy heroes prefer an unknown bait in `path.ts` | `path.ts` | PARTIAL | No 3-second revealed path | Place bait and watch the route |
| 3.3e | 3.3 | Possess from wave 2, 25 Gold, 5 s, WASD | Button pays 25 Gold and skips the hall guard | `store.ts` `armPossess` | PARTIAL | No hold, no stick, no 20 s cooldown | Wave 2 possess in the browser |
| 3.4a | 3.4 | Land teaches nobody. Buy sets warned and consumes the rumour | Purchase copies the fact as warned and removes Orrin’s copy | `decisions.ts` | DONE | Token id is not `rumour:<dungeon>:<epoch>:<page>` | `rulesLoop.test.ts` |
| 3.4b | 3.4 | Buy-back of an unsold page only, then burn | Gate has Buy back. Consumed pages are already gone | `store.ts` `buyBackRumour` | PARTIAL | Escalating price is the mock formula, not shown on the gate | Buy back in the browser |
| 3.4c | 3.4 | Re-lay makes old rumours stale | Path ignores a fact whose epoch does not match | `path.ts` | DONE | Freshness price on the rumour is not shown | Epoch test in `raid.test.ts` |
| 3.4d | 3.4 | Unsold rumour expires after 20 raids | `expireRumours` uses `RUMOUR.expiryRaids` | `store.ts` | NOT TESTED | Not walked for 20 days in the browser | Advance 20 days |
| 3.4e | 3.4 | Cinder starts 3, cap 5, +1 per kill, burn 2 | New game and the HUD pips match. One kill does not pay for a burn | `rules/economy.ts` | DONE | — | HUD showed ●●●○○ at 3 cinder |
| 3.4f | 3.4 | Unverified diary never becomes a rumour | No verification gate. Every landed page can be listed | — | MISSING | Reject an unverified page | A failed verify leaves Orrin empty |
| 3.5 | 3.5 | Five memory levels change the route | Unseen walks the spike. Observed does not detour. Warned and dodged detour. A baited brute can step on a dodge. Countered costs the same as open floor. Another dungeon’s fact does not count | `path.ts`, `raid.ts`, `heroBehavior.test.ts` | DONE | The film showed unseen, observed, and warned. Dodged and countered were the unit tests | Browser second raid, plus `heroBehavior.test.ts` |
| 3.6a | 3.6 | Three different heroes | Profiles differ. The gate board showed three different danger scores | `heroProfiles.ts`, `decisions.ts` | DONE | — | Gate screen this pass |
| 3.6b | 3.6 | Contract balances, one counter, gear changes survival | Risk, appetite, and the 0.05 mock purse come from `AGENTS`. One counter adds 5 points to the agent share and leaves the price alone. Armor −1, a phial, and boots ×1.3 apply outside the first lesson | `heroProfiles.ts`, `decisions.ts`, `raid.ts` | PARTIAL | The hall spends play Gold. The 0.05 figure is not charged | Same offer in `heroBehavior.test.ts`; Kara’s counter line on the gate |
| 3.7a | 3.7 | Mira buys salvage for Gold. Tallow’s NEAR gear stays NEAR | Supply pays play Gold from `stockPrice`. The gate lists `nb:gear` potions, armor, and boots in mock NEAR | `store.ts`, `money.ts`, `App.tsx` | DONE | The NEAR number is local. No network transfer | Supply ash in the browser; `economyMarket.test.ts` |
| 3.7b | 3.7 | Shop OPEN → LOW_STOCK → UNDERCAPITALISED → CLOSED → recover | `shopState` uses 0.02 and 0.01 mock NEAR. Recovery stays closed until both cash and stock clear the floor | `money.ts`, `market.ts` | DONE | The browser shops were OPEN. Closure and recovery are the unit test | `economyMarket.test.ts` |
| 3.7c | 3.7 | Salvage and the six recipes | Workshop buttons call every recipe in `RECIPES`. The browser crafted the spike as PLAY_ONLY | `store.ts`, `App.tsx` | PARTIAL | Pit, boulder, potion, armor, and boots were not clicked in the browser. They use the same craft function | Click the other five after a fresh inventory |
| 3.8 | 3.8 | Vault 0 closes the dungeon. Mastery at 10 kills. Tiers at 0/10/30/60 | Vault brace exists. No close, no blueprint, no tier | — | MISSING | All three | Kill the vault, then count trap kills |
| 3.9 | 3.9 | 0.01 offer, split-only counter, TTL refund, no patron control | Gate lists accept/refuse in play Gold. `MockChain` can fund, counter, settle, and refund | `App.tsx` Gate, `MockChain.ts` | PARTIAL | The board does not escrow 0.01 or show a counter | Fund, counter, expire on the gate |
| 3.11 | 3.11 | First 60 seconds script | Tutorial is seven text lines | `App.tsx` | MISSING | The timed beats are not enforced | Fresh guest, stopwatch |
| 3.12 | 3.12 | Banned words stay off the play screens | Raid, gate, workshop, and market text checked this pass did not show those words. Ownership details says “mock” and “NEAR” | `src/ui` | PARTIAL | Settings points at a technical screen on purpose | Read every play screen again after UI edits |

## Economy and mock ledger

| ID | Section | Requirement | Implementation | Files | Status | Missing | Test |
|---|---|---|---|---|---|---|---|
| 4.1 | 4.1 | Two currencies, three classes | `MockChain` keeps `gold` and `near`. Classes go through `canTrade` | `money.ts`, `MockChain.ts` | DONE | Raid Gold is a separate purse | Browser NEAR rejection, balance unchanged |
| 4.2 | 4.2 | Canonical price. Iron 200 / target 100 / buys 2 / sells 10 ≈ 5.65 | `stockPrice` matches | `money.test.ts` | DONE | Gate prices still use the older stall quote | `money.test.ts` |
| 4.6 | 4.6 | ≤5 listings, 24 h, cheapest, 10% fee, cancel returns the item | Live listings escrow, cancel, expire on the next day, and split 90/5/5. A failed settlement leaves the purse unchanged | `market.ts`, `MockChain.ts` | DONE | One wave stands for the 24 hour expiry in this local clock. Rumours stay off the player stall | Browser list/cancel; `economyMarket.test.ts` |
| 4.8 | 4.8 | No Gold-to-NEAR path | Salvage → craft → NEAR list is rejected and NEAR does not rise | `MockChain.test.ts` | DONE | — | That test |
| 4.10 | 4.10 | 60 days, ≥1000 raids, many scenarios, SIMULATED | One 1020-raid iron script. It hits the 5 and 20 bounds | `docs/sim/economy-60d.json` | PARTIAL | Bankruptcy, wash trades, permit demand, cinder variants are only partly represented | Re-run `verify:economy` and do not treat it as a freeze |
| 7.x | 7 | Mainnet contracts, login, VRF, Intents, DAO | Local adapters only. Guard throws on NEAR host strings. No RPC client | `guard.ts`, `adapters.ts` | BLOCKED | Real network work is out of scope. The mocks are labeled SIMULATED | `security.test.ts` |
| M1 | 7.4 | NPC ledgers with the published caps | Kara/Brann/Ivo start at 0.05, single 0.003, daily 0.02. Merchants start at 0.10, single 0.005, daily 0.03. An unlisted receiver is rejected | `MockChain.ts` | DONE | The raid hall still spends its own play-gold purse | `security.test.ts` stranger spend |
| M2 | 7.8 | Deed transfer refused during payout | Transfer during payout rolls back. The previous holder cannot withdraw or recover. The developer screen shows the owner | `MockChain.ts`, `MockSandbox.tsx` | DONE | There is no mainnet deed | `security.test.ts` and the Mock chain screen |

## Screens

| ID | Section | Requirement | What opened in the browser | Status | Missing |
|---|---|---|---|---|---|
| 5.0 | 5.0 | Two seconds, then a guest raid. No sign-in wall | Menu fortress, then Enter dungeon. Progress stays in local storage | PARTIAL | Not an automatic raid. No one-time hint set |
| 5.1 | 5.1 | Home with tier, treasury, and vault as separate chips | Home shows Ashgate, vault, treasury, tier, and open/closed. Screenshot `home-portrait.webp` | PARTIAL | The first screen is still the cinematic menu, not an automatic guest raid |
| 5.2 | 5.2 | Offer board and three stalls | Gate, this pass. Accept lines and OPEN stalls. Orrin empty | PARTIAL | No TTL, no counter, no NEAR chip |
| 5.3 | 5.3 | Full raid HUD and world labels | Top bar, cards, pictures, possess, chronicle | PARTIAL | No bounty, no 2/4 wave, no world-space bars, no possession stick |
| 5.4 | 5.4 | Raid board with burned vs landed, salvage, mastery | In-raid results card and a Report screen read the last raid | PARTIAL | Mastery and a bounty claimant were not re-checked in the acceptance sitting |
| 5.5 | 5.5 | Workshop recipes and listing reasons | Spike craft and supply. Market shows packs and cancel | PARTIAL | Pit/boulder craft buttons. No “cheaper listing won” line in the market UI |
| 5.6 | 5.6 | Five dungeon dioramas and a spectator | Five CSS hexes and one prop preview | PARTIAL | No hex models. No follow-a-hero view |
| 5.7 | 5.7 | Hero card plus a row-by-row verified panel | Hero directory lists gold, gear, and facts. No verified rows | PARTIAL | The eight proof rows |
| 5.8 | 5.8 | Replay with play, pause, 1× 2× 4×, hash match | Replay has play, pause, and 1× 2× 4×. `outcomeHash` matches for the same events | PARTIAL | The acceptance sitting did not press Play in the browser |
| 5.9 | 5.9 | 60-second simulated week | Week screen plots `stockPrice` and shop states. Labeled simulated | PARTIAL | Not a 60-second film |
| 5.10 | 5.10 | Deed dashboard | Charter page reads the local deed owner and can pass it | PARTIAL | No mainnet deed |
| 5.11 | 5.11 | Guild board | Guild page posted a simulated bounty that showed on the mock ledger | PARTIAL | Not a live DAO payout |
| 5.12 | 5.12 | Take it home | Screen quotes a local fee and does not send funds | PARTIAL | Not a live quote |
| 5.13 | 5.13 | Settings list | Sound, music, reduce motion, Low/Medium/High, new game, mock chain | PARTIAL | No haptics, language, or credits page |

## Art, feel, performance

| ID | Section | Requirement | What is true now | Status |
|---|---|---|---|---|
| 6.1 | 6.1 | Low-poly KayKit, orthographic room | The raid camera is orthographic. Models are the KayKit glTF set | DONE |
| 6.2 | 6.2 | Dungeon, adventurers, skeletons. No boulder file | Spike, grate, barrel, and food plate are the trap meshes. Documented in `trapDefinitions.ts` | DONE |
| 6.3 | 6.3 | Torch light, gold accent, red only when the vault is low | Palette matches. Vault text switches under 25% of 1200. No bloom | PARTIAL |
| 6.5 | 6.5 | Draw calls ≤ 100, 60 fps only with a named device | SwiftShader: 28–58 fps windows, p95 56–58 ms, 141 draws, 72,249 triangles, 88 textures | PARTIAL | Over the 100-draw target. Not 60 fps |
| 6.6 | 6.6 | Lilita One and Fredoka, 12–16 px cards | Those fonts are loaded. Cards are rounded glass. World-space labels are absent | PARTIAL |
| 14 | 14 | Hit-stop, shake, trap wind-up in `rules/feel.ts` | The renderer reads those numbers on a raid step. Reduce Motion skips them. `feel.test.ts` locks the values | PARTIAL | A hit-stop was not filmed in the acceptance sitting |

## Tests that already pass

`npx vitest run` on 7 November 2026: 37 passed. They cover the price example, the play-only NEAR rejection, permit price, deed lock, session-key failures, the tutorial spike death, and the warned detour. They do not cover a full browser raid.

## Prioritized implementation list

Do these in order. Do not start live NEAR.

1. One ledger. Raid Gold, hero purses, merchant stock, and the mock book should be the same state. A play-only item must still be unable to create NEAR.
2. Manual Trigger and a real chain multiplier. Possess stays incomplete until it is five seconds of control, or the HUD should say what it actually does.
3. Gear: a potion survives one lethal hit, armor reduces trap damage by 1, boots change spike speed. Same inputs must still be deterministic.
4. Rumour id, 20-raid expiry, and buy-back price on Orrin’s stall. Landing still teaches nobody.
5. Raid result card: pages burned and landed, salvage, and a next-wave action. Vault 0 closes the dungeon.
6. Workshop buttons for every published recipe. Gate prices should call `stockPrice` and show the inputs.
7. Replay controls that walk the recorded ticks at 1×, 2×, and 4×. Same events, same order.
8. HUD: bounty, memory icons that are not only a sentence, and less overlap between the hint bar and the floor.
9. World map: either real hex models or an honest list of dungeons. Do not call the CSS hexes a diorama.
10. A Week of Raids only if it runs `rules/economy.ts` and is labeled SIMULATED. Deed, guild, and take-it-home screens stay mock and out of the raid.
11. Measure fps, draws, and triangles on a named GPU before any 60 fps sentence.

## What this audit did not change

No raid rule, asset, or screen behavior was edited. The only file written for this pass is this matrix.
