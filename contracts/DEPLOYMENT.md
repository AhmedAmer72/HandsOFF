# Testnet deployment

Network: NEAR testnet. Admin: `neocrafts.testnet`. Nothing in this file was sent to mainnet.

Measured on 13 November 2026 (Africa/Cairo) after `wasm-opt -Oz --strip-debug`. Storage price on testnet was `10^19` yoctoNEAR per byte.

| WASM | Bytes | Code stake |
| --- | ---: | ---: |
| game | 473104 | 4.7310 NEAR |
| deeds | 182734 | 1.8273 NEAR |
| controller | 153480 | 1.5348 NEAR |

`neocrafts.testnet` held 15 NEAR before these transfers. Accounts were funded from that balance, not from an estimate.

| Account | Funded with | Create transaction |
| --- | ---: | --- |
| `game.neocrafts.testnet` | 6.5 NEAR | [GJH6WiiS7hcnuBx1hwkGRxWYqXjkQH98TnCxkKz8UZFu](https://explorer.testnet.near.org/transactions/GJH6WiiS7hcnuBx1hwkGRxWYqXjkQH98TnCxkKz8UZFu) |
| `deeds.neocrafts.testnet` | 2.4 NEAR, then 2 NEAR more | [HS72eyg3KmvZbmWKcQ1Xja6A8GDa96DykpRwanGqdRi9](https://explorer.testnet.near.org/transactions/HS72eyg3KmvZbmWKcQ1Xja6A8GDa96DykpRwanGqdRi9), [8fFaz1srrLGDyHoDrbX2iTeCaPgLEwADKQLtciBbYpGd](https://explorer.testnet.near.org/transactions/8fFaz1srrLGDyHoDrbX2iTeCaPgLEwADKQLtciBbYpGd) |
| `ashgate.deeds.neocrafts.testnet` | 1.8 NEAR from deeds | [GgNLGXkeBimyVfMP7ZJWf17YyZFk47ERdez6jgFZgKVi](https://explorer.testnet.near.org/transactions/GgNLGXkeBimyVfMP7ZJWf17YyZFk47ERdez6jgFZgKVi) |
| `relayer.neocrafts.testnet` | 0.4 NEAR | [4szwMdfWCWdDQemtLFpjDpydz2d2vaHq7wF3vyrzpKP7](https://explorer.testnet.near.org/transactions/4szwMdfWCWdDQemtLFpjDpydz2d2vaHq7wF3vyrzpKP7) |
| `buyer.neocrafts.testnet` | 0.25 NEAR | [6EHKgfa2n6WgTmipA3nSACMxZuyiyMxr1rg6rWr3bR3H](https://explorer.testnet.near.org/transactions/6EHKgfa2n6WgTmipA3nSACMxZuyiyMxr1rg6rWr3bR3H) |

Deploy transactions:

| Account | Transaction | Code hash (`view_code`) | SHA-256 hex |
| --- | --- | --- | --- |
| game | [E13FxUMKKCcwB4Nm4eUBBCTU6XBU75RhpLbuNWLXdjLe](https://explorer.testnet.near.org/transactions/E13FxUMKKCcwB4Nm4eUBBCTU6XBU75RhpLbuNWLXdjLe) | `144GPofAmnc8mb7Kp39ZLfVYv9MC3UT6YJxv17MVQwRZ` | `00c86f43acd05d5f6dec3a08f8a731d9c0c8f5cf70596b554b137a746acedf80` |
| deeds | [8WWMvjZPaGUnqmWb6njbDP1E2Po9GSAV1sXSFCALsPdR](https://explorer.testnet.near.org/transactions/8WWMvjZPaGUnqmWb6njbDP1E2Po9GSAV1sXSFCALsPdR) | `5uk3vTQC65XoxqDbSh4sHtTrgX9GYm7tH8Jip3w5XUto` | `48f1a082604a531655297fe55b8d4206a61149270c93eebca21b1dd9aff7ac38` |
| controller | [3u4zdXxzBTd5yyt4swmmpnDMU17Syt4iFWp5m7dy2BrU](https://explorer.testnet.near.org/transactions/3u4zdXxzBTd5yyt4swmmpnDMU17Syt4iFWp5m7dy2BrU) | `CBwDz6zmbTfb3XAQPo3geYpRdgqBWq5D5QeH2SgrCW3S` | `a63dace781267232fb6373e386e54dca17b5faefcaed2cbf1d6b0870de54bd89` |

Init transactions:

| Call | Transaction |
| --- | --- |
| `game.new` | [73DVB3BgncBf1rh8xj3hvsCqLuDWiWHQSBXhKrr7uMe6](https://explorer.testnet.near.org/transactions/73DVB3BgncBf1rh8xj3hvsCqLuDWiWHQSBXhKrr7uMe6) |
| `deeds.new` | [762AJeiyZGdGfLZyYZmxMA2i948ixbwjfqt5yAKcyVDD](https://explorer.testnet.near.org/transactions/762AJeiyZGdGfLZyYZmxMA2i948ixbwjfqt5yAKcyVDD) |
| `controller.new` | [J2uzkKz57a32XRDrhQeE9EgrZzyVmEcLN8rkjNqruyMw](https://explorer.testnet.near.org/transactions/J2uzkKz57a32XRDrhQeE9EgrZzyVmEcLN8rkjNqruyMw) |

`rules_hash` is the SHA-256 of `rules/economy.ts`: `eb9ba748165964d6ecfe97507afcf0fc650a83a028042232152b2246376a75d5`.

`engine_hash` is the SHA-256 of `src/game/engine/raid.ts`: `7a67643f1dad39783e46bc0f58d2aae4e5faa68cbfc09ab3314536cb3ee8ad3a`.

Full-access keys were deleted after init and the ownership tests:

| Account | Delete transaction |
| --- | --- |
| game | [LTA8VQt9nLXCCV3eBVwhZZgSZqUM6B1tW1h3v5HfhnW](https://explorer.testnet.near.org/transactions/LTA8VQt9nLXCCV3eBVwhZZgSZqUM6B1tW1h3v5HfhnW) |
| deeds | [ErzTQr2gGtbvcLEXp6z4bbmn8Me2J9w32yM9eLTkjh4X](https://explorer.testnet.near.org/transactions/ErzTQr2gGtbvcLEXp6z4bbmn8Me2J9w32yM9eLTkjh4X) |
| controller | [CKdsRcya6t6AcUHGmrLV9xM6R2Ny5N7mhDiQWZjfRZqp](https://explorer.testnet.near.org/transactions/CKdsRcya6t6AcUHGmrLV9xM6R2Ny5N7mhDiQWZjfRZqp) |

`near account list-keys game.neocrafts.testnet` returned an empty table after that delete. Private keys stayed in the local NEAR CLI credential directory and are not in this repo.

`npm run verify:testnet` reads the three code hashes and `status` from `https://rpc.testnet.near.org`.
