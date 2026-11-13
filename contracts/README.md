# UNDERREALM contracts

One game contract and two deed accounts, all on NEAR testnet.

| Account | Contract | Role |
| --- | --- | --- |
| `game.neocrafts.testnet` | `contracts/game` | NEP-245 items, permits, merchants, rumours, settlement |
| `deeds.neocrafts.testnet` | `contracts/deeds` | NEP-171 deed `deed:ashgate` |
| `ashgate.deeds.neocrafts.testnet` | `contracts/deed-controller` | Treasury. Withdraws only when the predecessor is the deeds contract |

`neocrafts.testnet` is the owner and operator. The three contract accounts have no access keys after deployment. A code change needs a new full-access key, which nobody can add while the accounts have none.

The playable raid stays in `src/game/engine/raid.ts`. `contracts/engine` hashes the same canonical settlement line the TypeScript adapter builds. It does not replace the 3D raid.

Build:

```bash
cargo test --manifest-path contracts/Cargo.toml -p underrealm-core -p underrealm-engine -p underrealm-game -p underrealm-deeds -p underrealm-deed-controller
cargo build --manifest-path contracts/Cargo.toml -p underrealm-game -p underrealm-deeds -p underrealm-deed-controller --target wasm32-unknown-unknown --release
wasm-opt -Oz --strip-debug -o game.wasm contracts/target/wasm32-unknown-unknown/release/underrealm_game.wasm
```

Rust 1.95.0 is pinned in `contracts/rust-toolchain.toml`. The numbers come from `rules/economy.ts`.
