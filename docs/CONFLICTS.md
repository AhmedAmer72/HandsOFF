# Documentation conflicts

Checked before contract code. Sources were read on 13 November 2026 (Africa/Cairo).

## near-sdk

- Crate: `near-sdk` 5.30.1, published 5 November 2026.
- `rust-version` is 1.95 and the crate uses Rust edition 2024.
- This machine started on Rust 1.83.0. The contract workspace pins Rust 1.95.0 in `contracts/rust-toolchain.toml`.
- Resolution: compile with 1.95.0. Do not use an older SDK to dodge the toolchain.

## NEP-245

- Core methods and events are taken from the Final NEP text: https://github.com/near/NEPs/blob/master/neps/nep-0245.md
- Amounts are decimal strings (`U128`). The game client uses JavaScript numbers. Conversion happens in the adapter. Contract math uses integers.
- The TypeScript signature of `mt_resolve_transfer` omits `amounts`, while the prose and the worked example require them to refund unused tokens. Resolution: the method includes `amounts`. Refunds clamp to the transferred amount.
- `mt_on_transfer` returns unused amounts. A failed callback refunds the full transfer. A return value of unused tokens greater than the transfer is clamped.
- Approval Management is not implemented. v10.2 says market escrow uses `mt_transfer_call` and does not need approvals.
- Metadata and enumeration follow the extension texts. `owner_id` is null on the catalogue token for fungible classes. Balances are read with `mt_balance_of`.

## near-dapp skill

- The skill at https://github.com/near/agent-skills/tree/main/skills/near-dapp was fetched and saved at `.agents/skills/near-dapp/SKILL.md`.
- It covers wallet connection for a React app (`@hot-labs/near-connect`, network default mainnet). It does not contain a Rust NEP-245 template.
- Resolution: guest play stays on the mock chain. Testnet calls use `near-cli` and a small RPC adapter. The wallet connector is not added to the raid loop, because a wallet prompt during a raid is a bug. The skill's mainnet default is not used.

## Network

- v10.2 says testnet must not be presented as mainnet proof.
- The deployment request is testnet on `neocrafts.testnet`.
- Resolution: deploy only to testnet. `verify:mainnet` exits non-zero and says mainnet is not deployed.

## Package manager

- v10.2 names `pnpm` scripts. This repo is npm with `package-lock.json`.
- Resolution: the same script names are npm scripts. The lockfile stays npm.

## Raid engine

- v10.2 asks for a Rust engine at a fixed 30 ticks per second.
- The playable raid is the TypeScript walk in `src/game/engine/raid.ts`.
- Resolution: that loop stays. `contracts/engine` hashes the same canonical settlement record the client builds. The contract checks that hash, the pinned rules hash, and the pinned engine hash. It does not re-run pathfinding.

## Demand rounding

- `src/game/rules/money.ts` rounds demand to two decimals before the price curve. The worked example 5.65 Gold uses that rounded demand.
- The contract uses the exact ratio `(buys - sells) / max(buys + sells, 1)`.
- Resolution: do not change `rules/economy.ts` or the TypeScript curve. Contract quotes return exact integer inputs. Both results stay inside the published min and max.

## External integrations

- NEAR Auth, NEAR Intents, OutLayer, and a guild DAO need credentials or a third-party account this environment does not have.
- OutLayer's own docs name mainnet contract `outlayer.near`. No testnet contract was verified.
- Resolution: those modules fail closed and are marked DISABLED. No mainnet call is made.
