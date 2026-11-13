# UNDERREALM

A local, blockchain-free 3D dungeon built from the free KayKit packs.

```bash
npm install
npm test
npm run dev
npm run build
```

Open the dev server and choose Enter Dungeon. `npm test` runs the rules, raid, market, and mock-ledger checks. `npm run build` typechecks and writes `dist/`.

`BLOCKCHAIN_MODE` defaults to `mock` in `src/blockchain/guard.ts`. The page blocks fetches to NEAR hosts unless `VITE_CHAIN_MODE=testnet`, and even then only `https://rpc.testnet.near.org` is allowed. Guest play does not connect a wallet.

In-raid actions are zero-deposit game-contract calls. Direct NEP-245 transfers need 1 yoctoNEAR and a full sign-in; they only happen outside raids. A wallet prompt during a raid is a bug — report it with the raid id.

The testnet contracts are `game.neocrafts.testnet`, `deeds.neocrafts.testnet`, and `ashgate.deeds.neocrafts.testnet`. State-changing calls are signed by the player account with `near-cli`. NEP-366 delegation is not the path this build submits: `relayer.neocrafts.testnet` cannot call `record_actions`. `npm run verify:mainnet` fails because mainnet was not deployed. Proofs are in `docs/TESTNET_PROOFS.md`.

What is finished, what is not, and the last measurements are in `docs/UNDERREALM_FINAL_ACCEPTANCE_REPORT.md`. Asset provenance and licenses are in `docs/`.

The free tiers are CC0. Paid EXTRA and SOURCE uploads were not downloaded. Character animation clips come from the free KayKit Character Animations pack linked from the official Adventurers page.
