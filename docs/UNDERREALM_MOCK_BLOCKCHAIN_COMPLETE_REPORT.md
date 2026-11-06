# UNDERREALM mock ledger

6 November 2026, about 5:00 PM Africa/Cairo.

This build keeps the playable Ashgate raid and adds a local ledger that behaves like the v10.2 money rules. Every receipt is marked SIMULATED. No live network call is made. No real funds move.

## What you can do

Open Settings, then Ownership details.

- Try NEAR sale on the play-iron item. The ledger rejects it: PLAY_ONLY cannot be sold for NEAR. The simulated NEAR balance stays 0.2000.
- List that iron for 10 Gold. Kara buys it. You receive 9 Gold, the guild receives 0.50, operations receives 0.50, and the iron’s owner becomes Kara.
- Kara funding a 0.01 offer fails because her single-purchase cap is 0.003. Her NEAR balance is unchanged.
- Reset demo ledger reloads the demo accounts and does not clear the dungeon save.

The same engine is covered by `src/blockchain/MockChain.test.ts`.

## What already played before this pass

See `docs/CURRENT_IMPLEMENTATION_AUDIT.md`. The dungeon, heroes, traps, page, craft, and Gold stall were already running. `rules/economy.ts` was already the price table.

## How the ledger is shaped

See `docs/MOCK_BLOCKCHAIN_ARCHITECTURE.md`.

Accounts: you, Kara, Brann, Ivo, Mira, Orrin, Tallow, game treasury, operations, guild treasury, dungeon treasury, and escrow when an offer is funded.

Kara, Brann, and Ivo start at 0.05 NEAR, a 0.003 single cap, and a 0.02 daily cap, from `AGENTS` in `rules/economy.ts`. Merchants start at 0.10 NEAR. Gold and NEAR are separate fields.

A failed action restores the snapshot taken at the start of the call. Repeating the same idempotency key returns the first receipt and does not pay twice.

`installMockGuard()` refuses fetch URLs for NEAR RPC, Intents, and OutLayer hosts.

## What the tests check

`npx vitest run` — 37 passed, including the 9 new ledger tests:

- Live host string is rejected.
- Salvage iron crafted into a play spike cannot be listed for NEAR, and NEAR does not increase.
- Gold purchase pays 90 / 5 / 5 and a second submit with the same key does not charge again.
- A buyer with 1 Gold does not move the item or the balances.
- Cancel returns the item and takes no fee.
- Permit price stays 0.01, one counter is allowed, a second counter is rejected, and settlement does not run twice.
- Deed transfer is refused while a payout is locked. After a clean transfer the previous owner cannot withdraw and the new owner can.
- Session key: success, replayed nonce, wrong method, wrong receiver, over cap, expiry, and revocation.

`npm run mock:seed` runs that same file.

## What is still the raid’s own Gold

Heroes buying a phial in the dungeon still spend play Gold in `src/game/store.ts`. The gate’s shop badge still uses the play-gold stand-in, not the 0.02 NEAR reserve. There is one dungeon, not five regions. Replay is the raid’s event list. There is no swap screen, DAO board, or week-of-raids fast forward in the UI.

Those are listed in `docs/GAMEPLAY_COMPLETION_PLAN.md`. They are not claimed as done.

## Browser

Settings → Ownership details.

Try NEAR sale: `MOCK REJECTED` and the reason that PLAY_ONLY cannot be sold for NEAR. Simulated NEAR stayed 0.2000.

List for Gold, then Kara buys: `MOCK CONFIRMED`. Gold went from 140 to 149. Guild Gold became 0.50. Iron owner became kara.

## How to run

```bash
npm run dev
npm test
npm run mock:seed
```

The dev server is http://127.0.0.1:5173/. Open Settings, then Ownership details.

## Migration

A later live adapter would replace `MockChain` method calls. The raid does not import a network client. This build does not deploy a contract and does not connect a wallet.
