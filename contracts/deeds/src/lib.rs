use near_sdk::json_types::U128;
use near_sdk::serde_json::{json, Value};
use near_sdk::store::IterableMap;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Deed {
    pub owner_id: AccountId,
    pub treasury: AccountId,
    pub title: String,
    pub state: String,
    pub pending_to: Option<AccountId>,
    pub previous: Vec<String>,
}

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Deeds {
    admin_id: AccountId,
    game_id: AccountId,
    tokens: IterableMap<String, Deed>,
    payout: IterableMap<String, u8>,
}

#[near]
impl Deeds {
    #[init]
    pub fn new(admin_id: AccountId, game_id: AccountId) -> Self {
        Self { admin_id, game_id, tokens: IterableMap::new(b"d"), payout: IterableMap::new(b"p") }
    }

    pub fn nft_metadata(&self) -> Value {
        json!({ "spec": "nft-1.0.0", "name": "UNDERREALM Deeds", "symbol": "DEED" })
    }

    pub fn nft_token(&self, token_id: String) -> Option<Value> {
        self.tokens.get(&token_id).map(|deed| json!({
            "token_id": token_id,
            "owner_id": deed.owner_id,
            "metadata": { "title": deed.title, "description": deed.treasury }
        }))
    }

    pub fn nft_supply_for_owner(&self, account_id: AccountId) -> String {
        self.tokens.iter().filter(|(_, deed)| deed.owner_id == account_id).count().to_string()
    }

    pub fn deed(&self, token_id: String) -> Option<Deed> {
        self.tokens.get(&token_id).cloned()
    }

    pub fn mint_deed(&mut self, token_id: String, owner_id: AccountId, treasury: AccountId, title: String) {
        require!(env::predecessor_account_id() == self.admin_id, "admin");
        require!(self.tokens.get(&token_id).is_none(), "exists");
        require!(token_id.starts_with("deed:"), "token id");
        self.tokens.insert(token_id.clone(), Deed {
            owner_id: owner_id.clone(),
            treasury,
            title,
            state: "ACTIVE".into(),
            pending_to: None,
            previous: vec![],
        });
        env::log_str(&format!("EVENT_JSON:{}", json!({
            "standard": "nep171", "version": "1.0.0", "event": "nft_mint",
            "data": [{ "owner_id": owner_id, "token_ids": [token_id] }]
        })));
    }

    pub fn set_game(&mut self, game_id: AccountId) {
        require!(env::predecessor_account_id() == self.admin_id, "admin");
        self.game_id = game_id;
    }

    pub fn set_payout(&mut self, token_id: String, inflight: bool) {
        require!(env::predecessor_account_id() == self.game_id, "only the game contract sets payout state");
        require!(self.tokens.get(&token_id).is_some(), "deed");
        if inflight {
            self.payout.insert(token_id, 1);
        } else {
            self.payout.remove(&token_id);
        }
    }

    #[payable]
    pub fn start_transfer(&mut self, token_id: String, receiver_id: AccountId) {
        require!(env::attached_deposit().as_yoctonear() == 1, "Requires attached deposit of exactly 1 yoctoNEAR");
        let mut deed = self.tokens.get(&token_id).cloned().expect("deed");
        require!(env::predecessor_account_id() == deed.owner_id, "owner");
        require!(self.payout.get(&token_id).is_none(), "transfer is locked while a payout is in flight");
        require!(deed.state == "ACTIVE", "transfer already pending");
        deed.state = "TRANSFER_PENDING".into();
        deed.pending_to = Some(receiver_id);
        self.tokens.insert(token_id, deed);
    }

    pub fn finish_transfer(&mut self, token_id: String) {
        let mut deed = self.tokens.get(&token_id).cloned().expect("deed");
        require!(env::predecessor_account_id() == deed.owner_id, "owner");
        require!(deed.state == "TRANSFER_PENDING", "no pending transfer");
        require!(self.payout.get(&token_id).is_none(), "payout");
        let next = deed.pending_to.clone().expect("receiver");
        deed.previous.push(deed.owner_id.to_string());
        deed.owner_id = next;
        deed.pending_to = None;
        deed.state = "ACTIVE".into();
        self.tokens.insert(token_id.clone(), deed.clone());
        env::log_str(&format!("EVENT_JSON:{}", json!({
            "standard": "nep171", "version": "1.0.0", "event": "nft_transfer",
            "data": [{ "old_owner_id": deed.previous.last(), "new_owner_id": deed.owner_id, "token_ids": [token_id] }]
        })));
    }

    pub fn abort_transfer(&mut self, token_id: String) {
        let mut deed = self.tokens.get(&token_id).cloned().expect("deed");
        require!(env::predecessor_account_id() == deed.owner_id, "owner");
        require!(deed.state == "TRANSFER_PENDING", "no pending transfer");
        deed.pending_to = None;
        deed.state = "ACTIVE".into();
        self.tokens.insert(token_id, deed);
    }

    #[payable]
    pub fn nft_transfer(&mut self, receiver_id: AccountId, token_id: String, approval_id: Option<u64>, memo: Option<String>) {
        require!(approval_id.is_none(), "approvals are not enabled");
        let _ = memo;
        self.start_transfer(token_id.clone(), receiver_id);
        self.finish_transfer(token_id);
    }

    pub fn withdraw_treasury(&mut self, token_id: String, amount: U128) -> Promise {
        let deed = self.tokens.get(&token_id).cloned().expect("deed");
        require!(env::predecessor_account_id() == deed.owner_id, "owner");
        require!(deed.state == "ACTIVE", "transfer pending");
        require!(self.payout.get(&token_id).is_none(), "payout in flight");
        require!(amount.0 > 0, "amount");
        Promise::new(deed.treasury).function_call(
            "withdraw",
            json!({ "token_id": token_id, "receiver_id": deed.owner_id, "amount": amount }).to_string().into_bytes(),
            NearToken::from_yoctonear(0),
            Gas::from_tgas(20),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{testing_env, Gas, NearToken};

    fn account(name: &str) -> AccountId {
        name.parse().unwrap()
    }

    fn env(predecessor: &str, deposit: u128) {
        let mut ctx = VMContextBuilder::new();
        ctx.current_account_id(account("deeds.neocrafts.testnet"))
            .predecessor_account_id(account(predecessor))
            .signer_account_id(account(predecessor))
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .account_balance(NearToken::from_near(10))
            .prepaid_gas(Gas::from_tgas(100))
            .block_timestamp(1_700_000_000_000_000_000);
        testing_env!(ctx.build());
    }

    fn minted() -> Deeds {
        env("neocrafts.testnet", 0);
        let mut deeds = Deeds::new(account("neocrafts.testnet"), account("game.neocrafts.testnet"));
        deeds.mint_deed(
            "deed:ashgate".into(),
            account("neocrafts.testnet"),
            account("ashgate.deeds.neocrafts.testnet"),
            "Ashgate".into(),
        );
        deeds
    }

    #[test]
    fn previous_owner_cannot_withdraw_after_transfer() {
        let mut deeds = minted();
        env("neocrafts.testnet", 1);
        deeds.nft_transfer(account("buyer.neocrafts.testnet"), "deed:ashgate".into(), None, None);
        let token = deeds.nft_token("deed:ashgate".into()).unwrap();
        assert_eq!(token["owner_id"], "buyer.neocrafts.testnet");
        env("neocrafts.testnet", 0);
        let caught = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let mut deeds = deeds;
            let _ = deeds.withdraw_treasury("deed:ashgate".into(), U128(1));
        }));
        assert!(caught.is_err());
    }

    #[test]
    fn abort_keeps_the_current_owner() {
        let mut deeds = minted();
        env("neocrafts.testnet", 1);
        deeds.start_transfer("deed:ashgate".into(), account("buyer.neocrafts.testnet"));
        env("neocrafts.testnet", 0);
        deeds.abort_transfer("deed:ashgate".into());
        let deed = deeds.deed("deed:ashgate".into()).unwrap();
        assert_eq!(deed.owner_id, account("neocrafts.testnet"));
        assert_eq!(deed.state, "ACTIVE");
        assert!(deed.pending_to.is_none());
    }

    #[test]
    #[should_panic(expected = "payout is in flight")]
    fn inflight_payout_blocks_transfer() {
        let mut deeds = minted();
        env("game.neocrafts.testnet", 0);
        deeds.set_payout("deed:ashgate".into(), true);
        env("neocrafts.testnet", 1);
        deeds.start_transfer("deed:ashgate".into(), account("buyer.neocrafts.testnet"));
    }
}
