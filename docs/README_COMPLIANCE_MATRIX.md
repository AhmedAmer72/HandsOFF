# README v10.2 compliance matrix

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
| 3.7a | 3.7 | Mira buys salvage for Gold. Tallow’s NEAR gear stays NEAR | Supply pays play Gold. Stalls sell nails and phials for Gold | `store.ts`, `economyRules.ts` | PARTIAL | No NEAR-backed shelf in the gate UI | Supply iron and read the price inputs |
| 3.7b | 3.7 | Shop OPEN → LOW_STOCK → UNDERCAPITALISED → CLOSED → recover | Badges use a 40/20 Gold stand-in, not 0.02 / 0.01 NEAR | `money.ts` `shopState` | PARTIAL | Live shops were all OPEN. No close/reopen was seen | Drive Mira’s gold under the close line |
| 3.7c | 3.7 | Salvage and the six recipes | Death adds bone, ash, or iron. UI crafts a spike only | `store.ts`, `App.tsx` | PARTIAL | Pit, boulder, potion, armor, boots buttons are absent. No wave-clear iron | Craft each recipe |
| 3.8 | 3.8 | Vault 0 closes the dungeon. Mastery at 10 kills. Tiers at 0/10/30/60 | Vault brace exists. No close, no blueprint, no tier | — | MISSING | All three | Kill the vault, then count trap kills |
| 3.9 | 3.9 | 0.01 offer, split-only counter, TTL refund, no patron control | Gate lists accept/refuse in play Gold. `MockChain` can fund, counter, settle, and refund | `App.tsx` Gate, `MockChain.ts` | PARTIAL | The board does not escrow 0.01 or show a counter | Fund, counter, expire on the gate |
| 3.11 | 3.11 | First 60 seconds script | Tutorial is seven text lines | `App.tsx` | MISSING | The timed beats are not enforced | Fresh guest, stopwatch |
| 3.12 | 3.12 | Banned words stay off the play screens | Raid, gate, workshop, and market text checked this pass did not show those words. Ownership details says “mock” and “NEAR” | `src/ui` | PARTIAL | Settings points at a technical screen on purpose | Read every play screen again after UI edits |

## Economy and mock ledger

| ID | Section | Requirement | Implementation | Files | Status | Missing | Test |
|---|---|---|---|---|---|---|---|
| 4.1 | 4.1 | Two currencies, three classes | `MockChain` keeps `gold` and `near`. Classes go through `canTrade` | `money.ts`, `MockChain.ts` | DONE | Raid Gold is a separate purse | Browser NEAR rejection, balance unchanged |
| 4.2 | 4.2 | Canonical price. Iron 200 / target 100 / buys 2 / sells 10 ≈ 5.65 | `stockPrice` matches | `money.test.ts` | DONE | Gate prices still use the older stall quote | `money.test.ts` |
| 4.6 | 4.6 | ≤5 listings, 24 h, cheapest, 10% fee, cancel returns the item | Both the stall settler and `MockChain` implement pieces of this | `store.ts`, `MockChain.ts` | PARTIAL | Two books. No 24-hour clock in the browser | One purchase that hits both |
| 4.8 | 4.8 | No Gold-to-NEAR path | Salvage → craft → NEAR list is rejected and NEAR does not rise | `MockChain.test.ts` | DONE | — | That test |
| 4.10 | 4.10 | 60 days, ≥1000 raids, many scenarios, SIMULATED | One 1020-raid iron script. It hits the 5 and 20 bounds | `docs/sim/economy-60d.json` | PARTIAL | Bankruptcy, wash trades, permit demand, cinder variants are only partly represented | Re-run `verify:economy` and do not treat it as a freeze |
| 7.x | 7 | Mainnet contracts, login, VRF, Intents, DAO | Guard throws on NEAR host strings. No RPC client | `guard.ts` | BLOCKED | Real network work is out of scope | `MockChain.test.ts` host check |
| M1 | 7.4 | NPC ledgers with the published caps | Kara/Brann/Ivo start at 0.05 NEAR, single cap 0.003, daily 0.02, on the mock ledger only | `rules/economy.ts`, `MockChain.ts` | PARTIAL | A hall purchase does not spend that NEAR | Kara fund-permit test |
| M2 | 7.8 | Deed transfer refused during payout | `transferDeed` restores state when payout is locked | `MockChain.test.ts` | PARTIAL | No holder dashboard | That test, not a screen |

## Screens

| ID | Section | Requirement | What opened in the browser | Status | Missing |
|---|---|---|---|---|---|
| 5.0 | 5.0 | Two seconds, then a guest raid. No sign-in wall | Menu fortress, then Enter dungeon. Progress stays in local storage | PARTIAL | Not an automatic raid. No one-time hint set |
| 5.1 | 5.1 | Home with tier, treasury, and vault as separate chips | Menu shows treasury, day, heroes, cinder, reputation from the save | PARTIAL | No “A Week of Raids”. No closed-dungeon restock state |
| 5.2 | 5.2 | Offer board and three stalls | Gate, this pass. Accept lines and OPEN stalls. Orrin empty | PARTIAL | No TTL, no counter, no NEAR chip |
| 5.3 | 5.3 | Full raid HUD and world labels | Top bar, cards, pictures, possess, chronicle | PARTIAL | No bounty, no 2/4 wave, no world-space bars, no possession stick |
| 5.4 | 5.4 | Raid board with burned vs landed, salvage, mastery | A short survived/died card and “click the gate” | MISSING | The result rows |
| 5.5 | 5.5 | Workshop recipes and listing reasons | Spike craft and supply. Market shows packs and cancel | PARTIAL | Pit/boulder craft buttons. No “cheaper listing won” line in the market UI |
| 5.6 | 5.6 | Five dungeon dioramas and a spectator | Five CSS hexes and one prop preview | PARTIAL | No hex models. No follow-a-hero view |
| 5.7 | 5.7 | Hero card plus a row-by-row verified panel | Hero directory lists gold, gear, and facts. No verified rows | PARTIAL | The eight proof rows |
| 5.8 | 5.8 | Replay with play, pause, 1× 2× 4×, hash match | Replay lists the last raid’s ticks. No controls when empty | MISSING | Speeds and a hash |
| 5.9 | 5.9 | 60-second simulated week | No screen | MISSING | The whole beat |
| 5.10 | 5.10 | Deed dashboard | Only the owner name on Ownership details | MISSING | The page |
| 5.11 | 5.11 | Guild board | No screen | MISSING | The page |
| 5.12 | 5.12 | Take it home | No screen | MISSING | The page. Must stay mock |
| 5.13 | 5.13 | Settings list | Graphics, new game, ownership, model shelf, hero directory | PARTIAL | Sound, music, haptics, language, reduce motion, credits |

## Art, feel, performance

| ID | Section | Requirement | What is true now | Status |
|---|---|---|---|---|
| 6.1 | 6.1 | Low-poly KayKit, orthographic room | The raid camera is orthographic. Models are the KayKit glTF set | DONE |
| 6.2 | 6.2 | Dungeon, adventurers, skeletons. No boulder file | Spike, grate, barrel, and food plate are the trap meshes. Documented in `trapDefinitions.ts` | DONE |
| 6.3 | 6.3 | Torch light, gold accent, red only when the vault is low | Palette matches. Vault text switches under 25% of 1200. No bloom | PARTIAL |
| 6.5 | 6.5 | Draw calls ≤ 100, 60 fps only with a named device | HUD this pass: about 20 fps, SwiftShader. Draws and triangles were not re-sampled | NOT TESTED |
| 6.6 | 6.6 | Lilita One and Fredoka, 12–16 px cards | Those fonts are loaded. Cards are rounded glass. World-space labels are absent | PARTIAL |
| 14 | 14 | Hit-stop, shake, trap wind-up in `rules/feel.ts` | The numbers are in the file. The renderer does not apply the shake and hit-stop table. Burn plays embers | PARTIAL |

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
