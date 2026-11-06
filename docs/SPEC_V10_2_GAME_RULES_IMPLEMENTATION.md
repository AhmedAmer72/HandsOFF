# Spec v10.2 — game rules now in the local raid

The two source files were `AGENT_PROMPT` v10.2 and `README` v10.2, “UNDERREALM: BURN THE PAGE”. This pass took the game rules from that spec and wired them into the KayKit Ashgate raid that was already playable. Settlement, wallets, and deeds stay out.

Checked 6 November 2026, about 12:10 PM Africa/Cairo. Branch `cursor/underrealm-kaykit-world-f3d8`.

## What the spec asked for, and what shipped

The playable loop is unchanged in shape: place traps, open the gate, one of Kara, Brann, or Ivo walks a path, a death drops a page, you burn it or let it land, then the gate stalls and the workshop sit between raids. The numbers and the information rules now come from `rules/economy.ts`.

| Rule | Live behavior |
|---|---|
| Trap gold | Spike 30, pit 80, boulder 120, bait 25. A crafted copy or a nail kit places for 0. |
| Re-lay | 5 Gold. The trap moves to a free neighbor and its layout epoch goes up. Older rumours no longer match that trap. |
| Vault | Starts at 1200. Bleeds 1 Gold per second of walking time while the hero is inside. The walk time is tile length 4 divided by that hero’s speed. Nothing in the burn choice pauses the bleed. The browser raid bled 4 Gold (1200 → 1196). |
| Cinder | Starts at 3, cap 5, +1 when a hero dies, burn costs 2. One kill from an empty bowl leaves 1, which cannot burn. |
| Page | Flies for 3 seconds. Burn spends 2 Cinder and lists nothing. Doing nothing lands the page with Orrin. Landing teaches nobody. |
| Memory | Five levels: unseen, observed, warned, dodged, countered. The hero who died keeps **observed**. Buying the rumour sets **warned** on that hero only and consumes the page. Observed does not make her walk around the tile. Warned does. A re-lay sends a warned hero back to unseen for that trap. |
| Salvage | A thief death adds 5 bone, a mage death 5 ash, a brute death 10 iron. |
| Craft | Spike is 10 iron + 5 bone. Pit, boulder, potion, armor, and boots are in `rules/economy.ts`. The workshop button crafts a spike and spends those materials. |
| Supply | Mira buys iron for play Gold using the stock formula. She refuses if she cannot pay. |
| Shops | Each stall shows OPEN, LOW_STOCK, UNDERCAPITALISED, or CLOSED. Restock stops while undercapitalised or closed. The cash lines are a play-gold stand-in: reserve 40, close below 20. The spec’s 0.02 / 0.01 NEAR reserves are not charged. |
| Raid board | Kara, Brann, and Ivo each accept or refuse from their own reward, danger, and risk numbers. The same price does not force the same decision. Posting an offer spends no Gold. |
| Player stall | At most 5 listings, play Gold only, play-only class, 10% fee on a sale, cheapest listing of an item wins, a listing from a previous day comes back with no fee. Cancelling returns the item and spends nothing. |
| Possess | From raid 2. 25 Gold. It pulls the hall guard off tile 4, 4 for that raid. It is not a five-second WASD stick. |
| Trigger | Still the free spring when a hero steps on the plate. |
| Banned words | Gameplay screens do not say wallet, token, gas, chain, crypto, NFT, mint, contract, seed, popup, or blockchain. |

## Where the rules live

- `rules/economy.ts` — the v10.2 tables: raid costs, cinder, goods, rumour formula inputs, permit split, market fee, salvage, recipes. NEAR constants stay in this file so the formulas can be tested. Nothing in the raid spends them.
- `rules/feel.ts` — hit-stop, shake, and page timing notes. The page the player sees uses the 3 second flight from the economy file.
- `src/game/rules/money.ts` — the functions: stock price, rumour price, buy-back, trap gold, permit split, item class, shop state.
- `LOOP.md` — the 30-second / 5-minute / session loop, play Gold only.

Stock price is `base * (target / stock) ^ 0.5 * (1 + 0.3 * demand)`. Demand is rounded to two decimals and is 0 below 6 settled trades. The published example holds: iron stock 200, 2 buys, 10 sells, demand −0.67, price about 5.65 Gold. A tier-2 rumour, 3 requests, 1 epoch old, prices at about 0.00327 NEAR inside the test. The live rumour Orrin sells is still priced in Gold (base 20 plus quality), because that NEAR figure is not a charge.

Play-only goods cannot be sold for NEAR. A craft result takes the lower class of its inputs. `killPaysForItsOwnBurn()` is false.

Stall goods that already had names (nails, phials, torches) use the same exponent and demand term. Their own base and target still come from the local goods list.

## What was left out on purpose

Section 7 of the spec, and the prompt’s later milestones, are not in this build:

- No NEAR, wallet, session key, or contract.
- No deed, guild treasury, DAO bounty, or “take it home”.
- No permit is charged. The split math is tested (price stays 0.01, a counter only moves the split) and is not shown as a live payment.
- No renderer rewrite. The dungeon is still plain Three.js with the KayKit rooms.
- Possess does not hand you a monster for five seconds of direct control. The button’s effect is the guard leaving the tile.
- The 60-day file is a scripted book, not a claim that the parameters are frozen.

## Simulation

`npm run verify:economy` runs the money tests and `scripts/economy-sim.test.ts`. The run writes `docs/sim/economy-60d.json` and is labelled **SIMULATED**.

That file records 60 days, 1020 raids, one closure, one recovery, play-iron prices held inside 5–20 Gold, and the three cinder variants. The live variant (burn 2, +1 per kill) does not let a kill pay for its own burn. The book does **not** pass the spec’s freeze bar: prices sit on the 5 and 20 bounds for a large part of the run, including the scripted bankruptcy days. Those start values stay as published. They are not marked frozen.

## What the browser showed

A fresh day opened at Vault 1200, 140 Gold, 3 Cinder, Day 1.

Placing the hall spike logged “Placed Spike Trap at 4, 6 for 30 Gold.” Gold went from 140 to 110.

Opening the gate killed Kara on that spike. The log then read that the vault bled 4 Gold (1200 → 1196), Cinder rose to 4, and Kara’s card said she observed the trap and that burning the page would not erase it. The page was left alone. After the flight the log said Orrin could sell 1 fact. The gate showed the rumour “Spike Trap at tile 4, 6 · epoch 1” with Buy back, and all three stalls as OPEN. The raid board listed three different danger scores. Kara, Brann, and Ivo all accepted that first offer. Next day took 6 Gold of upkeep (110 → 104).

The workshop craft spent 10 iron and 5 bone (12 → 2 iron, 11 → 6 bone; the extra bone was Kara’s salvage). On day 2, Possess the hall guard spent 25 Gold and logged a 5 second pull of the guard.

The 3 second burn button is on the parchment card. The browser driver could not click it before the page landed by itself. The same `resolvePage("burn")` the button calls is covered by `src/game/engine/rulesLoop.test.ts`: after the kill, Cinder is 4; burning leaves 2; Orrin gets no rumour; Kara still has the observed fact. A second test lets the page land, advances a day, and checks that only Kara becomes warned and that the next raid triggers no trap.

Renderer during the play was SwiftShader. The HUD showed about 20 fps at a sample. That is the software GPU in this environment, not a 60 fps claim.

## Tests

`npx tsc --noEmit` passed. `npx vitest run` — 28 passed, including the money worked example, the rumour price, the class guard, the burn loop, and the second-raid detour. `npm run verify:economy` passed and rewrote the JSON above.
