# Contract security

## Deposits

`mt_transfer` and `mt_transfer_call` require exactly 1 yoctoNEAR. These are the external NEP-245 paths.

`settle_raid`, `record_actions`, `supply`, `craft`, `list`, `consume_rumour`, `buy_back`, and `claim_salvage` require 0 attached deposit. They change internal balances. A raid must not open a wallet.

## What a bad call does

An unlisted receiver, a stale nonce, an expired key, a wrong currency, or a class that the method does not allow returns an error or panics before the economic write. `execute_agent_decision` writes an audit row and leaves the ledger unchanged. A second buy of a sold listing panics. A second settlement of the same raid id panics.

PLAY_ONLY cannot be listed for NEAR. Cinder and rumour tokens cannot be transferred. PLAY_GOLD has no conversion method. Crafting refuses an output whose class is not exactly the lowest class of its inputs.

## Kill switch

`set_paused(true)` is owner-only. Settlement, the market, and agent spending check `paused`. Views stay available.

## Session keys

`register_session` stores the signer public key for 24 hours. That key cannot call owner methods. Each accepted raid call increments `spent_today` and must stay under `daily_cap`. The nonce must match. `tx_cap` is recorded for the off-chain signer. The zero-deposit methods do not carry a NEAR amount, so the contract enforces the call count and the method list, and the signer must still attach 0.

## Deeds

`start_transfer` needs 1 yoctoNEAR and the current owner. `finish_transfer` moves ownership. `abort_transfer` returns the deed to ACTIVE and does not change the owner. `set_payout(true)` refuses a transfer while a payout is in flight. `withdraw_treasury` checks the current owner, then calls the controller. The controller accepts `withdraw` only from `deeds.neocrafts.testnet`.

## Ledgers

Kara, Brann, Ivo, Mira, Orrin, and Tallow are maps inside the game contract. They are not NEAR accounts. Rumour purchases credit the Orrin agent ledger. Merchant buy-backs credit the Orrin merchant ledger. Those two balances are separate on purpose and are both internal.

Seed NEAR on those ledgers is an accounting liability. `fund_solvency` parks attached NEAR on the contract without crediting a player. The 13 November 2026 deploy parked 0.5 NEAR this way. That covers the 0.45 NEAR seed. Later permit deposits are real NEAR.

## What is not live

NEAR AI verification stays off until `set_ai_key` is given a 32-byte key from a real verifier. The deployed status field is `DISABLED`. OutLayer, Intents, NEAR Auth, and a guild DAO are not called. See `services/disabled.ts`.
