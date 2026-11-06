# Current implementation audit

6 November 2026, about 4:50 PM Africa/Cairo, before the mock ledger pass.

The playable game already had:

- KayKit dungeon, six characters, two skeletons, traps, page burn, local Gold and Cinder.
- Hero pathing with memory levels, shop badges, craft, supply, and a player stall priced in Gold.
- A cinematic main menu and persistence in IndexedDB plus localStorage.
- `rules/economy.ts` and `src/game/rules/money.ts` for the canonical price, rumour, permit split, and class checks. Those functions were tested. The raid still settled Gold inside `src/game/store.ts`, not through a ledger that could also reject a NEAR sale.

Not present:

- Any network client, wallet, or deployed contract.
- Separate NEAR balances for heroes and merchants inside the running raid.
- Escrow, permit settlement, deeds, or session keys.
- A screen that could show a rejected simulated receipt.

The v10.2 numbers in `rules/economy.ts` stayed the source for prices and class rules. This pass adds a mock ledger beside that file. It does not replace the raid engine.
