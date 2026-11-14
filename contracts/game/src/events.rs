use near_sdk::serde_json::{json, Value};
use near_sdk::{env, AccountId};

pub fn nep245(event: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({
            "standard": "nep245",
            "version": "1.0.0",
            "event": event,
            "data": [data]
        })
    ));
}

pub fn mint(owner: &AccountId, token_ids: &[String], amounts: &[String], memo: &str) {
    nep245(
        "mt_mint",
        json!({ "owner_id": owner, "token_ids": token_ids, "amounts": amounts, "memo": memo }),
    );
}

pub fn burn(owner: &AccountId, token_ids: &[String], amounts: &[String], memo: &str) {
    nep245(
        "mt_burn",
        json!({ "owner_id": owner, "token_ids": token_ids, "amounts": amounts, "memo": memo }),
    );
}

pub fn transfer(old_owner: &AccountId, new_owner: &AccountId, token_ids: &[String], amounts: &[String], memo: Option<&str>) {
    nep245(
        "mt_transfer",
        json!({
            "old_owner_id": old_owner,
            "new_owner_id": new_owner,
            "token_ids": token_ids,
            "amounts": amounts,
            "memo": memo
        }),
    );
}

pub fn game(event: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({ "standard": "underrealm", "version": "1.0.0", "event": event, "data": data })
    ));
}
