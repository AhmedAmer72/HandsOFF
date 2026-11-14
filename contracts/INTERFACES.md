# Interfaces

Amounts that cross the contract boundary are decimal strings. Internal gold uses microgold (`1_000_000` = 1 gold). Internal NEAR uses yoctoNEAR.

## NEP-245

`mt_transfer`, `mt_batch_transfer`, `mt_transfer_call`, `mt_batch_transfer_call` require 1 yoctoNEAR. `mt_on_transfer` returns unused amounts. `mt_resolve_transfer` is private to the contract and includes `amounts`, because a refund cannot be computed without them. Views: `mt_balance_of`, `mt_batch_balance_of`, `mt_supply`, `mt_batch_supply`, `mt_token`, `mt_tokens`, `mt_tokens_for_owner`, and the metadata methods. Events use standard `nep245`, version `1.0.0`.

Approval management is not implemented. A listing escrows tokens on the contract account through the internal `list` method or through `mt_on_transfer` with message `list|{price}|{currency}`.

## Zero-deposit raid methods

`record_actions`, `settle_raid`, `supply`, `craft`, `list`, `consume_rumour`, `buy_back`, `claim_salvage`.

`settle_raid` accepts a canonical line:

`v1|{raid}|{hero}|{survived 0/1}|{gold}|{kills}|{burns}|{landed comma-separated}|{iron}|{bone}|{ash}|{rules}|{engine}`

The FNV-1a 32 hex of that exact string must equal the hash of the parsed record. Bounds reject a gold delta outside -1200..1200, more than 20 kills, more than 5 burns, more than 5 landed pages, more than 40 iron, or more than 20 bone or ash. Landed pages must already be in the verified map. The deployed contract has no AI key, so that map stays empty and no rumour is minted on the live contract.

## Permits, agents, market

`fund_offer` attaches exactly 0.01 NEAR. `counter_offer` moves the split by at most 2000 bps and keeps the owner share at or above 3000 bps. `expire_offer` refunds the whole deposit. `execute_agent_decision` is operator-only and writes an audit when the proposal is rejected.

`buy_listing` pays the seller 90 percent. The same owner, or a linked account, does not count as demand.

## Deeds

`mint_deed` is admin-only and the token id must start with `deed:`. `nft_transfer` starts and finishes in one call. `withdraw_treasury` is the current owner only. Controller `withdraw` is the deeds contract only. Controller `credit` records an attached deposit and does not pay anyone.
