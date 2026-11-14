# Agents

The running app reads and writes NEAR testnet. Do not add a wallet prompt inside the raid loop. `npm test` keeps the local permit fixture because `appUsesChain()` is false under Vitest.

Contract work uses Rust 1.95 and `near-sdk` 5.30.1. The workspace is `contracts/`. One game WASM. Deeds and the Ashgate controller are separate accounts.

Deploy and proof commands use NEAR testnet and `neocrafts.testnet`. Do not send a mainnet transaction. Do not print or commit credential files. `npm run verify:mainnet` must keep failing closed.

NEAR AI, OutLayer, Intents, NEAR Auth, and the DAO stay disabled until a real testnet response is recorded in `docs/TESTNET_PROOFS.md`. Do not invent a transaction id.

The near-dapp skill is saved at `.agents/skills/near-dapp/SKILL.md`. It is a wallet guide and its example network is mainnet. It is not the contract template, and it is not wired into the hall.
