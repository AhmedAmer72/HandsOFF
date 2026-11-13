use near_sdk::json_types::U128;
use near_sdk::serde_json::{json, Value};
use near_sdk::store::IterableMap;
use near_sdk::{env, near, require, AccountId, NearToken, PanicOnDefault, Promise};

#[near(serializers = [borsh])]
#[derive(Clone)]
struct Payout {
    token_id: String,
    receiver_id: AccountId,
    amount: u128,
    reason: String,
}

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Controller {
    deeds_id: AccountId,
    history: IterableMap<String, Payout>,
    seq: u64,
}

#[near]
impl Controller {
    #[init]
    pub fn new(deeds_id: AccountId) -> Self {
        Self { deeds_id, history: IterableMap::new(b"h"), seq: 1 }
    }

    #[payable]
    pub fn credit(&mut self, reason: String, raid_id: Option<String>) {
        let amount = env::attached_deposit().as_yoctonear();
        require!(amount > 0, "attach NEAR");
        let id = self.seq.to_string();
        self.seq += 1;
        self.history.insert(id, Payout {
            token_id: raid_id.unwrap_or_else(|| "credit".into()),
            receiver_id: env::predecessor_account_id(),
            amount,
            reason,
        });
    }

    pub fn withdraw(&mut self, token_id: String, receiver_id: AccountId, amount: U128) -> Promise {
        require!(env::predecessor_account_id() == self.deeds_id, "only deeds.neocrafts.testnet can move this treasury");
        require!(env::attached_deposit().as_yoctonear() == 0, "no deposit");
        require!(amount.0 > 0, "amount");
        let id = self.seq.to_string();
        self.seq += 1;
        self.history.insert(id.clone(), Payout {
            token_id: token_id.clone(),
            receiver_id: receiver_id.clone(),
            amount: amount.0,
            reason: "withdraw".into(),
        });
        env::log_str(&format!("EVENT_JSON:{}", json!({
            "standard": "underrealm", "version": "1.0.0", "event": "treasury_withdraw",
            "data": { "id": id, "token_id": token_id, "receiver_id": receiver_id, "amount": amount.0.to_string() }
        })));
        Promise::new(receiver_id).transfer(NearToken::from_yoctonear(amount.0))
    }

    pub fn history(&self, id: String) -> Option<Value> {
        self.history.get(&id).map(|row| json!({
            "token_id": row.token_id,
            "receiver_id": row.receiver_id,
            "amount": row.amount.to_string(),
            "reason": row.reason,
        }))
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

    fn env(predecessor: &str) {
        let mut ctx = VMContextBuilder::new();
        ctx.current_account_id(account("ashgate.deeds.neocrafts.testnet"))
            .predecessor_account_id(account(predecessor))
            .signer_account_id(account(predecessor))
            .attached_deposit(NearToken::from_yoctonear(0))
            .account_balance(NearToken::from_near(5))
            .prepaid_gas(Gas::from_tgas(50))
            .block_timestamp(1_700_000_000_000_000_000);
        testing_env!(ctx.build());
    }

    #[test]
    #[should_panic(expected = "only deeds.neocrafts.testnet")]
    fn a_user_key_cannot_withdraw() {
        env("neocrafts.testnet");
        let mut controller = Controller::new(account("deeds.neocrafts.testnet"));
        let _ = controller.withdraw("deed:ashgate".into(), account("neocrafts.testnet"), U128(1));
    }

    #[test]
    fn the_deeds_contract_can_request_a_withdrawal() {
        env("deeds.neocrafts.testnet");
        let mut controller = Controller::new(account("deeds.neocrafts.testnet"));
        controller.withdraw("deed:ashgate".into(), account("neocrafts.testnet"), U128(1)).detach();
        let row = controller.history("1".into()).unwrap();
        assert_eq!(row["receiver_id"], "neocrafts.testnet");
        assert_eq!(row["amount"], "1");
    }
}
