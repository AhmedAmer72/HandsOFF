//! Contract-side spend policy. A signed model output is not permission to spend.

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PolicyError {
    Paused,
    UnknownAgent,
    Balance,
    SingleCap,
    DailyCap,
    Receiver,
    Token,
    Method,
    Currency,
    Nonce,
    Expired,
    Replay,
    RulesHash,
    Class,
}

#[derive(Clone, Debug)]
pub struct Proposal<'a> {
    pub decision_id: &'a str,
    pub nonce: u64,
    pub expected_nonce: u64,
    pub method: &'a str,
    pub receiver: &'a str,
    pub token_id: &'a str,
    pub currency_is_near: bool,
    pub token_is_near_backed: bool,
    pub amount: u128,
    pub balance: u128,
    pub spent_today: u128,
    pub max_single: u128,
    pub daily_limit: u128,
    pub expires_at_ms: u64,
    pub now_ms: u64,
    pub rules_hash: &'a str,
    pub expected_rules: &'a str,
    pub seen: bool,
    pub allowed_methods: &'a [&'a str],
    pub allowed_receivers: &'a [&'a str],
    pub allowed_tokens: &'a [&'a str],
}

pub fn check_proposal(proposal: &Proposal<'_>) -> Result<(), PolicyError> {
    if proposal.seen || proposal.decision_id.is_empty() {
        return Err(PolicyError::Replay);
    }
    if proposal.nonce != proposal.expected_nonce {
        return Err(PolicyError::Nonce);
    }
    if proposal.now_ms > proposal.expires_at_ms {
        return Err(PolicyError::Expired);
    }
    if proposal.rules_hash != proposal.expected_rules {
        return Err(PolicyError::RulesHash);
    }
    if !proposal.allowed_methods.contains(&proposal.method) {
        return Err(PolicyError::Method);
    }
    if !proposal.allowed_receivers.contains(&proposal.receiver) {
        return Err(PolicyError::Receiver);
    }
    if !proposal.allowed_tokens.iter().any(|prefix| proposal.token_id.starts_with(prefix)) {
        return Err(PolicyError::Token);
    }
    if proposal.currency_is_near != proposal.token_is_near_backed {
        return Err(PolicyError::Currency);
    }
    if proposal.currency_is_near && !proposal.token_is_near_backed {
        return Err(PolicyError::Class);
    }
    if proposal.amount > proposal.balance {
        return Err(PolicyError::Balance);
    }
    if proposal.amount > proposal.max_single {
        return Err(PolicyError::SingleCap);
    }
    if proposal.spent_today.saturating_add(proposal.amount) > proposal.daily_limit {
        return Err(PolicyError::DailyCap);
    }
    Ok(())
}

pub const HERO_METHODS: &[&str] = &["dungeon_choice", "rumour_purchase", "gear_purchase", "fee_haggle"];
pub const MERCHANT_METHODS: &[&str] = &["merchant_restock"];
pub const HERO_RECEIVERS: &[&str] = &["mira", "orrin", "tallow"];
pub const MERCHANT_RECEIVERS: &[&str] = &["treasury", "mira", "orrin", "tallow"];

#[cfg(test)]
mod tests {
    use super::*;

    fn ok_proposal() -> Proposal<'static> {
        Proposal {
            decision_id: "d1",
            nonce: 1,
            expected_nonce: 1,
            method: "gear_purchase",
            receiver: "tallow",
            token_id: "nb:gear:potion",
            currency_is_near: true,
            token_is_near_backed: true,
            amount: 2,
            balance: 10,
            spent_today: 0,
            max_single: 5,
            daily_limit: 8,
            expires_at_ms: 100,
            now_ms: 50,
            rules_hash: "rules",
            expected_rules: "rules",
            seen: false,
            allowed_methods: HERO_METHODS,
            allowed_receivers: HERO_RECEIVERS,
            allowed_tokens: &["nb:gear:", "nb:resource:", "rumour:"],
        }
    }

    #[test]
    fn allowed_purchase_passes_and_injected_receiver_does_not() {
        assert!(check_proposal(&ok_proposal()).is_ok());
        let mut evil = ok_proposal();
        evil.receiver = "attacker.near";
        assert_eq!(check_proposal(&evil).unwrap_err(), PolicyError::Receiver);
    }

    #[test]
    fn caps_nonce_replay_expiry_and_currency_fail_closed() {
        let mut over = ok_proposal();
        over.amount = 6;
        assert_eq!(check_proposal(&over).unwrap_err(), PolicyError::SingleCap);
        over.amount = 4;
        over.spent_today = 6;
        assert_eq!(check_proposal(&over).unwrap_err(), PolicyError::DailyCap);
        over.spent_today = 0;
        over.amount = 11;
        assert_eq!(check_proposal(&over).unwrap_err(), PolicyError::Balance);
        let mut replay = ok_proposal();
        replay.seen = true;
        assert_eq!(check_proposal(&replay).unwrap_err(), PolicyError::Replay);
        replay.seen = false;
        replay.nonce = 0;
        assert_eq!(check_proposal(&replay).unwrap_err(), PolicyError::Nonce);
        replay.nonce = 1;
        replay.now_ms = 101;
        assert_eq!(check_proposal(&replay).unwrap_err(), PolicyError::Expired);
        replay.now_ms = 50;
        replay.token_id = "play:gear:potion";
        replay.token_is_near_backed = false;
        replay.currency_is_near = true;
        assert_eq!(check_proposal(&replay).unwrap_err(), PolicyError::Token);
        replay.token_id = "nb:gear:potion";
        replay.allowed_tokens = &["nb:gear:"];
        assert_eq!(check_proposal(&replay).unwrap_err(), PolicyError::Currency);
    }
}
