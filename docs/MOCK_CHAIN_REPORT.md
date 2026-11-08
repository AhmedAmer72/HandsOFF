# Mock chain

7 November 2026, about 5:20 PM Africa/Cairo. No mainnet, testnet, wallet, or contract deploy.

## What runs locally

`MockChain` is the ledger. `src/blockchain/adapters.ts` is a thin front for accounts, NEP-245 balances and transfers, NEP-171 deed ownership, the six NPC ledgers, the marketplace, escrow, permits, session keys, the relayer, AI checks, VRF seeds, intents custody, deeds, and guild bounties. Every adapter calls that same object.

Each call snapshots the books, checks the caller, the method, the currency, the balance, the owner, the item class, and the spending caps, then commits or restores the snapshot. A repeated idempotency key returns the first receipt. The journal keeps the receipt. The audit list keeps the same id. Both say SIMULATED.

Budgets are the v10.2 table: heroes 0.05 NEAR, single 0.003, daily 0.02; merchants 0.10, single 0.005, daily 0.03. A permit is 0.01, escrowed, price fixed, one counter, owner settlement, full refund on expiry.

VRF output, AI verification, relayer submission, and intents deposit are labeled simulated. `genuine` is false. A seed does not pay anyone.

## Developer screen

Settings → Mock chain lists accounts, the six ledgers, item owners, escrow, permits, receipts, rejections, and verification rows. The buttons call the ledger methods. Resetting that ledger does not clear the dungeon save.

## Tests

`npx vitest run src/blockchain/MockChain.test.ts src/blockchain/security.test.ts` — 16 passed.

They cover overspending, a bad relayer receiver, a wrong method, a wrong nonce, replay, an expired key, a revoked key, a second buyer, a second settlement, a play-only NEAR listing, a callback that fails after the debit, and a previous deed holder. In each rejection the balances and the owner match the pre-call snapshot.

`installMockGuard` still throws if something asks `fetch` for a NEAR host.
