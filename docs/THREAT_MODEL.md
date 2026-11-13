# Threat model

The app talks to NEAR testnet. `BLOCKCHAIN_MODE` defaults to `testnet`. The fetch guard allows only `https://rpc.testnet.near.org` and rejects mainnet, Intents, OutLayer, and NEAR AI hosts. `VITE_CHAIN_MODE=mock` is the local-ledger escape hatch.

On testnet, the assets that matter are the NEAR held by `game.neocrafts.testnet`, `deeds.neocrafts.testnet`, and `ashgate.deeds.neocrafts.testnet`, plus the deed `deed:ashgate`.

| Threat | Control |
| --- | --- |
| A raid opens a wallet or attaches a deposit | Zero-deposit methods panic if deposit is not 0. The hall does not import a wallet connector. |
| A session key calls `set_paused` or another admin method | Admin methods reject a signer whose public key is in the session map. |
| An agent is told to pay an unlisted receiver | The proposal is rejected and the ledger is unchanged. An audit row is written. |
| PLAY_ONLY is sold for NEAR, or a play input crafts a NEAR-backed output | Class checks panic before the listing or craft is stored. |
| A sold listing is bought twice | The listing state is no longer open, so the second call panics. |
| A permit is settled twice | The settlement id is stored and the second call panics. |
| The previous deed owner withdraws the treasury | `withdraw_treasury` requires the current `owner_id`. |
| Someone calls the treasury controller directly | `withdraw` requires the predecessor to be `deeds.neocrafts.testnet`. |
| A transfer races a payout | `set_payout(true)` makes `start_transfer` panic. |
| The contract code is replaced | The three contract accounts have no access keys. |
| A disabled integration is reported as live | `services/disabled.ts` refuses a LIVE status. `verify:mainnet` exits non-zero. |

The owner key of `neocrafts.testnet` can still pause the game, change the operator, and call settlement. That key is the remaining administrative trust. It is not in the repository.
