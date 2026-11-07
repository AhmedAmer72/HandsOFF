# README v10.2 compliance matrix

Checked 7 November 2026, about 2:40 PM Africa/Cairo, against the running Ashgate build. Status is what the code and a browser pass can support. A screen that exists is not marked DONE unless the behavior was exercised.

| ID | Section | Requirement | Status | Source | Missing | Test |
|---|---|---|---|---|---|---|
| G1 | 3.2 | Place traps, open the gate, one hero walks | DONE | `src/game/engine/raid.ts`, `src/three/dungeon.ts` | — | Browser: spike from the bar, gold 140→110 |
| G2 | 3.3 | Five verbs: drag/re-lay, trigger, burn/land, bait, possess | PARTIAL | `store.ts`, dungeon click path | Trigger is the walk-on spring, not a separate free button. Possess pulls the hall guard from wave 2; it is not a 5-second stick | `rulesLoop.test.ts`; possess button on the bar |
| G3 | 3.4 | Page flies ~3s, burn costs 2 Cinder, land lists one rumour | DONE | `App.tsx` timer, `resolvePage` | — | Store test: burn leaves 2 Cinder and no rumour |
| G4 | 3.5 | Memory unseen/observed/warned/dodged/countered changes the path | PARTIAL | `path.ts` | Dodged and countered are defined; the live path uses warned vs observed. Countered gear is not a separate fight outcome | Path tests |
| G5 | 3.6 | Kara, Brann, and Ivo decide differently | DONE | `heroProfiles.ts`, `decisions.ts` | — | Accept/refuse tests use different thresholds |
| G6 | 3.7 | Salvage, recipes, shop states | PARTIAL | `newGame.ts`, `store.ts` | Shop close uses a play-gold stand-in, not 0.02 NEAR | Craft test spends 10 iron + 5 bone |
| G7 | 3.9 | Raid board, fixed permit price, split-only counter | PARTIAL | Gate screen + `MockChain` | The board shows accept/refuse. Permit escrow is on the ownership ledger, not charged inside the raid | Ledger tests: price stays 0.01 |
| G8 | 4.1 | PLAY_GOLD and NEAR never mix | DONE | `MockChain.ts`, `money.ts` | The raid purse is still play Gold only | NEAR sale of play iron rejected in the browser |
| G9 | 4.2 | Stock price example ≈ 5.65 Gold | DONE | `money.ts` | — | `money.test.ts` |
| G10 | 4.6 | Market cap 5, 10% fee, cheapest wins, cancel returns the item | PARTIAL | `store.ts` settle + `MockChain.buy` | The dungeon stall and the mock ledger are two books | Ledger fee test 90/5/5 |
| G11 | 4.10 | 60-day / 1000-raid sim, labeled SIMULATED | PARTIAL | `scripts/economy-sim.test.ts` | One scripted iron book, not every scenario in §4.10. Prices hit the bounds, so parameters are not frozen | `docs/sim/economy-60d.json` |
| G12 | 5.3 | Raid HUD: vault, bleed, gold, cinder, wave, chain, hero purse and memory | PARTIAL | `App.tsx` dungeon overlay | Wave is the day number. Chain is traps sprung this raid. No world-space nameplates | Browser HUD after this pass |
| G13 | 5.1–5.13 | Home, gate, workshop, market, map, replay, deed, guild, take-it-home, week of raids | PARTIAL | Existing screens + menu | Deed, guild, take-it-home, and the 60-second week view are not full screens. Map is not five hex dungeons | Menu and gate were used in earlier browser passes |
| G14 | 6 | KayKit low-poly, palette, 35° camera | DONE | `palette.ts`, dungeon scene | Hex pack is not in the repo | Screenshot of the hall |
| G15 | 6.5 | ≤100 draws, ~60 fps on a desktop GPU | NOT TESTED | HUD fps line | This machine is SwiftShader. Last honest sample was about 20 fps. A 31 fps ANGLE reading was reported on another GPU and is not an average | Do not claim 60 fps |
| G16 | 7 | NEAR mainnet, wallets, contracts | BLOCKED | `guard.ts` | Forbidden for this assignment. Mock only | Guard test rejects `rpc.mainnet.near.org` |
| G17 | 14 | Hit-stop, shake, page slow-mo numbers | PARTIAL | `rules/feel.ts` | Values are stored. Hit-stop and shake are not all applied in the renderer. Embers play on burn | Feel file vs dungeon playback |

Legend: DONE was exercised. PARTIAL runs but does not cover the whole section. MISSING has no behavior. NOT TESTED was not measured here. BLOCKED is out of scope by the mock-only rule.
