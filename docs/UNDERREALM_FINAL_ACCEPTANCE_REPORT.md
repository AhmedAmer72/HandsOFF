# UNDERREALM acceptance

8 November 2026, about 3:50 AM Africa/Cairo. No new gameplay was added in this pass except a replay hash of the existing event list, and a `BLOCKCHAIN_MODE` constant set to `mock`.

## 1. Completed features

- KayKit hall: orthographic room, heroes, merchants, skeletons, trap bar, doorway raid start.
- Kara, Brann, and Ivo decide from the v10.2 risk and rumour-appetite table. A bought rumour warns only the buyer. A re-lay or another dungeon makes an old fact stale.
- Play gold for salvage and stalls. Mock NEAR for the rumour formula, NEAR-backed gear quotes, and shop reserves. One stock curve in `src/game/rules/money.ts`.
- Player listings: escrow, cancel, next-day expiry, 90/5/5, play-only goods refused for NEAR.
- Local `MockChain`: permits, deeds, session keys, relayer, simulated VRF and intents. Receipts say SIMULATED. Rejected calls restore balances.
- Screens that read live state: Home, Raid, Gate, Workshop, Market, Map, Heroes, Replay, Report, Week, Charter, Guild, Take it home, Settings, Mock chain.
- Hit-stop, shake, damage marks, vault coins, and page slow-down read `rules/feel.ts`. Reduce Motion skips them.

## 2. Incomplete features

- No mainnet, testnet, wallet, or deployed contract. That is intentional.
- The dungeon gold purse and the mock ledger are still two books.
- Possess is a payment that skips the hall guard. It is not five seconds of stick control.
- A Week of Raids is a chart, not a 60-second film.
- Take it home quotes a local 2% fee. It does not send funds.
- Draw calls are 141, above the 100-draw target.
- Settings has no haptics, language, or credits page.
- Unverified diary pages can still be listed. There is no signature gate.
- The 60-day economy script is one iron path. It is not a freeze of every required scenario.

## 3. Test results

`npm test` on 8 November 2026: 9 files, 66 tests, all passed.

`npx tsc --noEmit` passed. `npm run build` wrote `dist/` (the JS chunk is about 961 kB).

Same raid inputs produce the same event list and the same `outcomeHash`. An empty trap list produces a different hash. `BLOCKCHAIN_MODE` is `mock`. A fetch to `rpc.mainnet.near.org` or `rpc.testnet.near.org` throws.

No test failed in this run.

## 4. Browser verification

This acceptance sitting did not finish one guest session from the gate through the second raid, supply, listing, and replay. The browser driver stopped before that run.

Earlier sittings on this same branch did show, with screenshots:

- Spike at 4, 6. Kara walked through 4,6 and died. The page landed. Ivo walked `4,7 → 5,7 → 5,6 → 5,5` and survived with 0 traps. Brann had no warned fact.
- Ash supply quoted stock 80, target 80, base 8, then stock 85. Play-only iron could not be listed for NEAR.
- Home on a narrow window: Vault 1200, Treasury 1200, Tier 1, Open. The Menu drawer lists every destination.
- Guild post created `bounty-1` PROPOSED on the mock ledger.
- Mock chain: NEAR sale of play iron rejected; Kara’s gold purchase set the owner to Kara and split 9 / 0.50 / 0.50; her 0.0500 purse did not pay a 0.01 permit; the seed line says it is not a VRF proof.

Those earlier sittings are not a substitute for the single path that this acceptance run failed to complete.

## 5. Performance

Machine renderer: ANGLE, Google Vulkan 1.3.0, SwiftShader Device (Subzero). Software WebGL, not a desktop GPU.

| Window | fps | p95 frame | Draws | Triangles | Textures |
| --- | --- | --- | --- | --- | --- |
| High | 36 | 56 ms | 141 | 72,249 | — |
| Low | 38 | 58 ms | 141 | 72,249 | — |
| High again | 28 | 58 ms | 141 | 72,249 | — |
| High, later | 58 | 58 ms | 141 | 72,249 | 88 |

Eight skinned characters. This is not a 60 fps result. Low and High drew the same meshes, so the shadow map was not the limiter. More detail is in `docs/PERFORMANCE_REPORT.md`.

## 6. Screenshots

Kept from the browser sittings on this branch:

- `home-portrait.webp` — Home chips and buttons on a narrow window.
- `menu-drawer-portrait.webp` — Menu drawer.
- `hall-high-swiftshader.webp` — Hall, heroes, torches, entrance banner.
- `supply-ash-why.webp` — Ash price inputs.
- `near-listing-rejected.webp` — Play-only refusal.
- `mock-chain-kara-bought-iron.webp` — Simulated purchase and fee split.
- `mock-chain-simulated-seed.webp` — Seed labeled not a VRF proof.

## 7. Known issues

- Two money books: the hall and `MockChain`.
- Replay hash covers the event list. The combat seed does not change that list today.
- Sound and music toggles are not saved and do not start or stop audio.
- Chronicle on the hall is closed until opened, so a long raid is easier to watch and easier to miss.
- The production JS bundle is one large chunk.
- SwiftShader frame time has a slow tail near 58 ms even when a half-second average looks higher.

## 8. How to run

```bash
npm install
npm test
npm run dev
```

Open the printed local URL and choose Enter dungeon. `npm run build` writes `dist/`.

## 9. Mock blockchain

`src/blockchain/guard.ts` exports `BLOCKCHAIN_MODE = "mock"` and rejects fetches whose URL matches NEAR, Intents, or OutLayer hosts. The developer screen says SIMULATED. VRF, AI checks, the relayer, and intents custody set `genuine` to false. No wallet button is on the play screens. No test in this run opened a socket.

## 10. Remaining work

The single acceptance path in a browser is still open: fresh guest, spike on 4, 6, Kara’s death, landed page, Ivo’s detour, Mira supply, a listing an NPC buys, the receipt, and the replay hash on screen. After that, the two ledgers, possess-as-control, the unverified-diary gate, and a hardware-GPU frame measurement are the gaps already named above. This report stops there.
