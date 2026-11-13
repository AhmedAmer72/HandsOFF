# Testnet evidence

Queried from `https://rpc.testnet.near.org` on 13 November 2026 (Africa/Cairo). These are testnet results. They are not mainnet proof.

| Account | Code hash | Transaction that deployed it |
| --- | --- | --- |
| `game.neocrafts.testnet` | `144GPofAmnc8mb7Kp39ZLfVYv9MC3UT6YJxv17MVQwRZ` | [E13FxUMKKCcwB4Nm4eUBBCTU6XBU75RhpLbuNWLXdjLe](https://explorer.testnet.near.org/transactions/E13FxUMKKCcwB4Nm4eUBBCTU6XBU75RhpLbuNWLXdjLe) |
| `deeds.neocrafts.testnet` | `5uk3vTQC65XoxqDbSh4sHtTrgX9GYm7tH8Jip3w5XUto` | [8WWMvjZPaGUnqmWb6njbDP1E2Po9GSAV1sXSFCALsPdR](https://explorer.testnet.near.org/transactions/8WWMvjZPaGUnqmWb6njbDP1E2Po9GSAV1sXSFCALsPdR) |
| `ashgate.deeds.neocrafts.testnet` | `CBwDz6zmbTfb3XAQPo3geYpRdgqBWq5D5QeH2SgrCW3S` | [3u4zdXxzBTd5yyt4swmmpnDMU17Syt4iFWp5m7dy2BrU](https://explorer.testnet.near.org/transactions/3u4zdXxzBTd5yyt4swmmpnDMU17Syt4iFWp5m7dy2BrU) |

`status` returned `network: testnet`, `ai_verification: DISABLED`, `rules_hash` `eb9ba748165964d6ecfe97507afcf0fc650a83a028042232152b2246376a75d5`, and `solvency_yocto` `500000000000000000000000`. Init: [73DVB3BgncBf1rh8xj3hvsCqLuDWiWHQSBXhKrr7uMe6](https://explorer.testnet.near.org/transactions/73DVB3BgncBf1rh8xj3hvsCqLuDWiWHQSBXhKrr7uMe6). Solvency funding: [7derLEsnK7mL7NRTRewhNAnuNjZcn7xH4hymF4jBBgkr](https://explorer.testnet.near.org/transactions/7derLEsnK7mL7NRTRewhNAnuNjZcn7xH4hymF4jBBgkr).

`nft_token("deed:ashgate")` returned owner `buyer.neocrafts.testnet` after [Eso7bqC3A3xjgGev6Yi9DxsMbRdLU3bZ5D9AnuSTrt37](https://explorer.testnet.near.org/transactions/Eso7bqC3A3xjgGev6Yi9DxsMbRdLU3bZ5D9AnuSTrt37).

Ownership checks on testnet:

| Check | Result | Transaction |
| --- | --- | --- |
| Abort leaves the owner able to transfer later | The later transfer was signed by `neocrafts.testnet` and succeeded | [HsWwNut8cneComwzM1nEyjwj1YvRGKj77dJeZELE7vcp](https://explorer.testnet.near.org/transactions/HsWwNut8cneComwzM1nEyjwj1YvRGKj77dJeZELE7vcp) |
| In-flight payout blocks `start_transfer` | Transaction failed | [FXABZsR3DQMUpgdm5XkvqnuHmY9yegnASDHxXq4NoQc5](https://explorer.testnet.near.org/transactions/FXABZsR3DQMUpgdm5XkvqnuHmY9yegnASDHxXq4NoQc5) |
| Previous owner cannot withdraw | Transaction failed | [F9vumdtHjEvnke5zgxUMs9rGfqXvQGz8yMCKhFLGP3o4](https://explorer.testnet.near.org/transactions/F9vumdtHjEvnke5zgxUMs9rGfqXvQGz8yMCKhFLGP3o4) |
| Current owner can withdraw 0.01 NEAR | Controller logged `treasury_withdraw` to `buyer.neocrafts.testnet` | [4BzPGMJPCC3qRHKE24UKvCZs4JUYao6y3qrsiu9VzssW](https://explorer.testnet.near.org/transactions/4BzPGMJPCC3qRHKE24UKvCZs4JUYao6y3qrsiu9VzssW) |

Direct zero-deposit `record_actions` signed by `neocrafts.testnet` returned `55a4bc5be68ea5c30cbe4d07e3bf951163b5a207dfd628ea53a2eb21072a9f3b` in [8NGdVeVvcEtj7ZzqMC9PakDqBH7ra1MyyQx1TLk6Q47](https://explorer.testnet.near.org/transactions/8NGdVeVvcEtj7ZzqMC9PakDqBH7ra1MyyQx1TLk6Q47). The same method signed by `relayer.neocrafts.testnet` failed in [J1UJVXwcL52vQtST9MbGYJUNDYeo8YJGTLJu362r5qLA](https://explorer.testnet.near.org/transactions/J1UJVXwcL52vQtST9MbGYJUNDYeo8YJGTLJu362r5qLA).

## Disabled

| Integration | Status | Blocker |
| --- | --- | --- |
| NEAR AI | DISABLED | No verifier key is pinned. `status.ai_verification` is `DISABLED`. |
| OutLayer | DISABLED | The published contract is `outlayer.near` on mainnet. This build did not call it. |
| NEAR Intents | DISABLED | No partner credentials and no testnet custody call. |
| NEAR Auth | DISABLED | No approved credentials. |
| DAO guild | DISABLED | No testnet DAO was named. Guild NEAR stays in `guild_yocto`. |
