# Hero behavior

7 November 2026, about 4:30 PM Africa/Cairo. Local mock Gold only. No network wallet.

## What the three heroes do

Kara’s risk tolerance is 0.3 and her rumour appetite is 0.7. She buys a cheap phial, retreats early, and inspects a trap she only saw. She does not treat that observation as a warning, so she does not walk around it.

Brann’s risk tolerance is 0.8 and his rumour appetite is 0.2. He does not buy a normal rumour. He buys the mail coat when he is the one spending. He stays in a fight. A bait plate can pull him back onto a trap he already dodged.

Ivo’s risk tolerance is 0.5 and his rumour appetite is 0.9. He pays the posted rumour price when the page is still fresh, then walks around that tile. The same quote does not make Brann buy it.

The utility score is expected vault gold, plus a freshness-weighted rumour bonus, minus danger. Danger uses warned and observed facts, the hero’s own risk, and their purse. A counter is one shift of the agent share. The offer price is not changed. Each fact stores its source, the dungeon (`ashgate`), and the layout epoch. Burning a page does not delete an observation. Landing a page teaches nobody. Re-laying a trap advances the epoch, and the old fact no longer matches.

## Browser

One spike at tile 4, 6. Kara walked `4,11 · 4,10 · 4,9 · 4,8 · 4,7 · 4,6`, died, and kept `observed · eyes` after the page landed. Ivo bought the rumour. His second walk was `4,11 · 4,10 · 4,9 · 4,8 · 4,7 · 5,7 · 5,6 · 5,5 · 4,5 · 4,4 · 4,3 · 4,2 · 4,1 · 4,0`. Traps sprung: 0. Brann’s card still said “No trap memory yet.” The mage model stepped around the spike mesh.

## Tests

`npx tsc --noEmit` passed. `npx vitest run` passed after the route sentence was tightened: 6 files, 46 tests.

## Files

- `src/game/config/heroProfiles.ts` — v10.2 risk, appetite, and mock purse
- `src/game/config/economyRules.ts` — mail coat on Tallow’s stall
- `src/game/engine/decisions.ts` — utility, counter, purchases
- `src/game/engine/path.ts` — memory, epoch, dungeon, bait
- `src/game/engine/raid.ts` — observed, dodged, countered
- `src/game/engine/types.ts` — dungeon on a fact, counter on a decision
- `src/game/engine/heroBehavior.test.ts` — the three profiles
- `src/game/engine/rulesLoop.test.ts` — the landed page teaches Ivo only
- `src/game/store.ts` — the walked tiles go into the chronicle
- `src/three/dungeon.ts` — tile hint, doorway click
- `src/ui/App.tsx` — risk line and walked tiles on the results card
- `docs/README_COMPLIANCE_MATRIX.md`
