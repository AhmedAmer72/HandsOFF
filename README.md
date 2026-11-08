# UNDERREALM

A local, blockchain-free 3D dungeon built from the free KayKit packs.

```bash
npm install
npm test
npm run dev
npm run build
```

Open the dev server and choose Enter Dungeon. `npm test` runs the rules, raid, market, and mock-ledger checks. `npm run build` typechecks and writes `dist/`.

`BLOCKCHAIN_MODE` is `mock` in `src/blockchain/guard.ts`. The page blocks fetches to NEAR hosts. No wallet is connected and no funds leave the machine.

What is finished, what is not, and the last measurements are in `docs/UNDERREALM_FINAL_ACCEPTANCE_REPORT.md`. Asset provenance and licenses are in `docs/`.

The free tiers are CC0. Paid EXTRA and SOURCE uploads were not downloaded. Character animation clips come from the free KayKit Character Animations pack linked from the official Adventurers page.
