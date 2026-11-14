# Operations

`npm run dev` talks to NEAR testnet. State changes from this machine are signed by `neocrafts.testnet` or `buyer.neocrafts.testnet` through the Vite `/api/near` route. `npm test` does not send those calls.

Testnet reads:

```bash
npm run verify:testnet
```

That command queries `https://rpc.testnet.near.org` for the code hash of `game.neocrafts.testnet`, `deeds.neocrafts.testnet`, and `ashgate.deeds.neocrafts.testnet`, then calls `status`, `nft_metadata`, and `nft_token` for `deed:ashgate`. It fails if `status.network` is not `testnet` or if `ai_verification` is anything other than `DISABLED`.

```bash
npm run verify:mainnet
```

This exits 1. Mainnet was not deployed.

Pause and unpause, signed by `neocrafts.testnet`:

```bash
near contract call-function as-transaction game.neocrafts.testnet set_paused json-args '{"paused":true}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as neocrafts.testnet network-config testnet sign-with-keychain send
```

The contract accounts cannot sign. Their full-access keys were deleted. Owner calls are signed by `neocrafts.testnet`.

In-raid calls attach 0 NEAR and are signed by the player account. The relayer account `relayer.neocrafts.testnet` was funded, and a call from it to `record_actions` was rejected. NEP-366 delegated actions are not the path this build submits. See `services/relayer.ts`.

Do not print or commit the credential files under `~/.near-credentials`. If a contract account runs out of liquid NEAR above its storage stake, top up from `neocrafts.testnet` or the public testnet faucet and record the new balance in this file. Do not deploy a larger WASM on a guess.
