# Mock ledger architecture

`BLOCKCHAIN_MODE` is mock. There is no mainnet adapter.

`installMockGuard()` in `src/blockchain/guard.ts` rejects fetch URLs that point at NEAR RPC, Intents, or OutLayer hosts. The game does not call those hosts.

`MockChain` in `src/blockchain/MockChain.ts` is the only writer of simulated balances, items, listings, permits, the deed, and session keys.

Each call:

1. Returns the previous receipt if the same idempotency key was already used.
2. Snapshots accounts, items, listings, permits, the deed, and keys.
3. Validates ownership, item class, currency, and spending caps.
4. Commits only when the action returns ok.
5. Restores the snapshot when the action returns not ok or throws.
6. Appends a receipt with `simulated: true` and `label: "SIMULATED"`.

Currencies stay in separate fields, `gold` and `near`. Item class comes from `canTrade` and `craftClass` in `src/game/rules/money.ts`. A play-only craft cannot be listed for NEAR.

The dungeon still spends play Gold through `src/game/store.ts`. The ownership screen uses `MockChain` directly so a rejected NEAR sale cannot move the raid save.

Later, a real adapter would implement the same method names. Nothing in the raid imports a network client today.
