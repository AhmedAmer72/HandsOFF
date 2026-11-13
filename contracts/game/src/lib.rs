mod events;
mod state;

#[cfg(test)]
mod tests;

use events::game;
use near_sdk::json_types::U128;
use near_sdk::serde_json::{self, json};
use near_sdk::store::IterableMap;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseResult};
use state::{Agent, Book, Line, Listing, Merchant, Offer, Rumour, Session, Settlement, SESSION_METHODS};
use underrealm_core::agents::{
    check_proposal, Proposal, HERO_METHODS, HERO_RECEIVERS, MERCHANT_METHODS, MERCHANT_RECEIVERS,
};
use underrealm_core::economy::{self, quote_good, CINDER, GOLD, YOCTO};
use underrealm_core::items::{self, class_of, Currency, ItemClass};
use underrealm_core::market::{self, Candidate};
use underrealm_core::merchants::{
    after_contribution_stall, classify_stall, reopen_stall, ShopState,
};
use underrealm_core::permits::{self, split_for};
use underrealm_core::proof::{self, ProofError};
use underrealm_core::rumours::{self, expire, purchase, RumourState};
use underrealm_engine::{check_bounds, fnv_hex, parse_canonical, sha256_hex};

const HERO_START: u128 = YOCTO / 20;
const HERO_MAX: u128 = YOCTO * 3 / 1_000;
const HERO_DAILY: u128 = YOCTO / 50;
const MERCHANT_START: u128 = YOCTO / 10;
const MERCHANT_MAX: u128 = YOCTO / 200;
const MERCHANT_DAILY: u128 = YOCTO * 3 / 100;
const DAY_NS: u64 = 86_400_000_000_000;
const OFFER_TTL_NS: u64 = 30 * 60 * 1_000_000_000;

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    owner_id: AccountId,
    operator_id: AccountId,
    dungeon_owner: AccountId,
    rules_hash: String,
    engine_hash: String,
    paused: bool,
    deeds_id: Option<AccountId>,
    treasury_id: Option<AccountId>,
    guild_yocto: u128,
    ops_yocto: u128,
    dungeon_escrow: u128,
    solvency_yocto: u128,
    raid_slot: u64,
    dungeon_epoch: u32,
    seq: u64,
    audit_seq: u64,
    ai_key: Option<Vec<u8>>,
    balances: IterableMap<String, u128>,
    supply: IterableMap<String, u128>,
    tokens: IterableMap<String, u8>,
    agents: IterableMap<String, Agent>,
    merchants: IterableMap<String, Merchant>,
    offers: IterableMap<String, Offer>,
    listings: IterableMap<String, Listing>,
    rumours: IterableMap<String, Rumour>,
    verified: IterableMap<String, u8>,
    decisions: IterableMap<String, u8>,
    sessions: IterableMap<String, Session>,
    settlements: IterableMap<String, Settlement>,
    actions: IterableMap<String, String>,
    links: IterableMap<String, String>,
    books: IterableMap<String, Book>,
    audits: IterableMap<String, String>,
    guests: IterableMap<String, u8>,
    cinder: IterableMap<String, u32>,
}

#[near]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId, operator_id: AccountId, rules_hash: String, engine_hash: String) -> Self {
        require!(!rules_hash.is_empty() && !engine_hash.is_empty(), "rules and engine hashes are required");
        let maps = state::maps();
        let mut contract = Self {
            owner_id: owner_id.clone(),
            operator_id,
            dungeon_owner: owner_id,
            rules_hash,
            engine_hash,
            paused: false,
            deeds_id: None,
            treasury_id: None,
            guild_yocto: 0,
            ops_yocto: 0,
            dungeon_escrow: 0,
            solvency_yocto: 0,
            raid_slot: 0,
            dungeon_epoch: 1,
            seq: 1,
            audit_seq: 1,
            ai_key: None,
            balances: maps.balances,
            supply: maps.supply,
            tokens: maps.tokens,
            agents: maps.agents,
            merchants: maps.merchants,
            offers: maps.offers,
            listings: maps.listings,
            rumours: maps.rumours,
            verified: maps.verified,
            decisions: maps.decisions,
            sessions: maps.sessions,
            settlements: maps.settlements,
            actions: maps.actions,
            links: maps.links,
            books: maps.books,
            audits: maps.audits,
            guests: maps.guests,
            cinder: maps.cinder,
        };
        contract.bootstrap();
        contract
    }

    pub fn status(&self) -> serde_json::Value {
        json!({
            "network": "testnet",
            "paused": self.paused,
            "rules_hash": self.rules_hash,
            "engine_hash": self.engine_hash,
            "owner_id": self.owner_id,
            "operator_id": self.operator_id,
            "dungeon_owner": self.dungeon_owner,
            "ai_verification": if self.ai_key.is_some() { "KEY_PINNED" } else { "DISABLED" },
            "deeds_id": self.deeds_id,
            "treasury_id": self.treasury_id,
            "raid_slot": self.raid_slot,
            "guild_yocto": self.guild_yocto.to_string(),
            "ops_yocto": self.ops_yocto.to_string(),
            "dungeon_escrow": self.dungeon_escrow.to_string(),
            "solvency_yocto": self.solvency_yocto.to_string(),
        })
    }

    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> String {
        self.balance(account_id.as_str(), &token_id).to_string()
    }

    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<String> {
        token_ids.into_iter().map(|token| self.balance(account_id.as_str(), &token).to_string()).collect()
    }

    pub fn mt_supply(&self, token_id: String) -> Option<String> {
        self.supply.get(&token_id).map(|amount| amount.to_string())
    }

    pub fn mt_batch_supply(&self, token_ids: Vec<String>) -> Vec<Option<String>> {
        token_ids.into_iter().map(|token| self.supply.get(&token).map(|amount| amount.to_string())).collect()
    }

    pub fn mt_token(&self, token_ids: Vec<String>) -> Vec<Option<serde_json::Value>> {
        token_ids.into_iter().map(|token| self.token_json(&token)).collect()
    }

    pub fn mt_tokens(&self, from_index: Option<String>, limit: Option<u32>) -> Vec<serde_json::Value> {
        self.page_tokens(from_index, limit, None)
    }

    pub fn mt_tokens_for_owner(&self, account_id: AccountId, from_index: Option<String>, limit: Option<u32>) -> Vec<serde_json::Value> {
        self.page_tokens(from_index, limit, Some(account_id))
    }

    pub fn mt_metadata_contract(&self) -> serde_json::Value {
        json!({ "spec": "mt-1.0.0", "name": "UNDERREALM" })
    }

    pub fn mt_metadata_base_by_token_id(&self, token_ids: Vec<String>) -> Vec<serde_json::Value> {
        token_ids.iter().map(|token| self.base_metadata(token)).collect()
    }

    pub fn mt_metadata_token_by_token_id(&self, token_ids: Vec<String>) -> Vec<serde_json::Value> {
        token_ids.iter().map(|token| json!({
            "title": token,
            "description": "UNDERREALM item. Class is the token id prefix.",
            "extra": class_of(token).map(|class| format!("{class:?}")).unwrap_or_else(|_| "unknown".into()),
        })).collect()
    }

    pub fn mt_metadata_token_all(&self, token_ids: Vec<String>) -> Vec<serde_json::Value> {
        token_ids.iter().map(|token| json!({
            "base": self.base_metadata(token),
            "token": { "title": token }
        })).collect()
    }

    pub fn mt_metadata_base_by_metadata_id(&self, base_metadata_ids: Vec<String>) -> Vec<serde_json::Value> {
        base_metadata_ids.iter().map(|token| self.base_metadata(token)).collect()
    }

    pub fn mt_tokens_base_metadata_all(&self, from_index: Option<String>, limit: Option<u32>) -> Vec<serde_json::Value> {
        self.page_tokens(from_index, limit, None).into_iter().map(|token| self.base_metadata(token["token_id"].as_str().unwrap_or(""))).collect()
    }

    #[payable]
    pub fn mt_transfer(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>) {
        self.assert_yocto();
        require!(approval.is_none(), "approvals are not enabled");
        self.transfer_many(&receiver_id, &[token_id], &[amount.0], memo.as_deref());
    }

    #[payable]
    pub fn mt_batch_transfer(&mut self, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>, approvals: Option<Vec<Option<(AccountId, u64)>>>, memo: Option<String>) {
        self.assert_yocto();
        require!(approvals.is_none(), "approvals are not enabled");
        let amounts: Vec<u128> = amounts.into_iter().map(|amount| amount.0).collect();
        self.transfer_many(&receiver_id, &token_ids, &amounts, memo.as_deref());
    }

    #[payable]
    pub fn mt_transfer_call(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>, msg: String) -> Promise {
        self.assert_yocto();
        require!(approval.is_none(), "approvals are not enabled");
        self.transfer_call_many(receiver_id, vec![token_id], vec![amount], memo, msg)
    }

    #[payable]
    pub fn mt_batch_transfer_call(&mut self, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>, approvals: Option<Vec<Option<(AccountId, u64)>>>, memo: Option<String>, msg: String) -> Promise {
        self.assert_yocto();
        require!(approvals.is_none(), "approvals are not enabled");
        self.transfer_call_many(receiver_id, token_ids, amounts, memo, msg)
    }

    #[payable]
    pub fn mt_on_transfer(&mut self, sender_id: AccountId, previous_owner_ids: Vec<AccountId>, token_ids: Vec<String>, amounts: Vec<U128>, msg: String) -> Vec<String> {
        require!(env::predecessor_account_id() == env::current_account_id(), "mt_on_transfer is private to this token contract");
        require!(token_ids.len() == amounts.len() && previous_owner_ids.len() == token_ids.len(), "length");
        let mut unused = vec!["0".to_string(); token_ids.len()];
        if let Some((price, currency)) = parse_list_msg(&msg) {
            if token_ids.len() != 1 {
                return amounts.iter().map(|amount| amount.0.to_string()).collect();
            }
            if self.open_listing(&sender_id, &token_ids[0], amounts[0].0, price, currency).is_err() {
                unused[0] = amounts[0].0.to_string();
            }
        } else {
            return amounts.iter().map(|amount| amount.0.to_string()).collect();
        }
        unused
    }

    #[private]
    pub fn mt_resolve_transfer(&mut self, sender_id: AccountId, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>) -> Vec<String> {
        let unused = match env::promise_result(0) {
            PromiseResult::Successful(bytes) => serde_json::from_slice::<Vec<String>>(&bytes).unwrap_or_else(|_| amounts.iter().map(|amount| amount.0.to_string()).collect()),
            PromiseResult::Failed => amounts.iter().map(|amount| amount.0.to_string()).collect(),
        };
        let mut used = Vec::new();
        for (index, token) in token_ids.iter().enumerate() {
            let sent = amounts.get(index).map(|amount| amount.0).unwrap_or(0);
            let refund = unused.get(index).and_then(|value| value.parse::<u128>().ok()).unwrap_or(sent).min(sent);
            let held = self.balance(receiver_id.as_str(), token);
            let refund = refund.min(held);
            if refund > 0 {
                self.sub_balance(receiver_id.as_str(), token, refund);
                self.add_balance(sender_id.as_str(), token, refund);
                events::transfer(&receiver_id, &sender_id, &[token.clone()], &[refund.to_string()], Some("refund"));
            }
            used.push((sent - refund).to_string());
        }
        used
    }

    pub fn quote(&self, token_id: String) -> serde_json::Value {
        let (buys, sells, sample, ema, price, day_open) = self.book_inputs(&token_id);
        let stock = self.stock_of(&token_id);
        match quote_good(&token_id, stock, buys, sells, sample, if price == 0 { None } else { Some((ema, price)) }, if day_open == 0 { None } else { Some(day_open) }) {
            Some(quote) => json!({
                "token_id": token_id,
                "price": quote.price.to_string(),
                "currency": if quote.currency == Currency::Near { "NEAR" } else { "PLAY_GOLD" },
                "class": format!("{:?}", quote.class),
                "low_confidence": quote.low_confidence,
                "inputs": { "S": quote.stock.to_string(), "target": quote.target.to_string(), "buys": buys.to_string(), "sells": sells.to_string(), "D": quote.d_scaled.to_string(), "base": quote.base.to_string(), "ema": quote.ema_scaled.to_string() }
            }),
            None => json!({ "error": "unknown good" }),
        }
    }

    pub fn view_agent(&self, agent_id: String) -> Option<serde_json::Value> {
        self.agents.get(&agent_id).map(|agent| json!({
            "agent_id": agent_id,
            "near": agent.near.to_string(),
            "gold": agent.gold.to_string(),
            "spent_today": agent.spent_today.to_string(),
            "max_single": agent.max_single.to_string(),
            "daily": agent.daily.to_string(),
            "risk_bps": agent.risk_bps,
            "appetite_bps": agent.appetite_bps,
            "nonce": agent.nonce,
            "inventory": agent.inventory.iter().map(|line| json!({"token_id": line.token_id, "amount": line.amount.to_string()})).collect::<Vec<_>>(),
            "decisions": agent.decisions,
        }))
    }

    pub fn view_merchant(&self, merchant_id: String) -> Option<serde_json::Value> {
        self.merchants.get(&merchant_id).map(|merchant| json!({
            "merchant_id": merchant_id,
            "state": shop_name(merchant.state),
            "near": merchant.near.to_string(),
            "gold": merchant.gold.to_string(),
            "stock": merchant.stock.iter().map(|line| json!({"token_id": line.token_id, "amount": line.amount.to_string()})).collect::<Vec<_>>(),
        }))
    }

    pub fn view_offer(&self, offer_id: String) -> Option<serde_json::Value> {
        self.offers.get(&offer_id).map(|offer| json!({
            "offer_id": offer_id,
            "funder": offer.funder,
            "state": offer.state,
            "price": offer.price.to_string(),
            "split": { "owner": offer.owner_bps, "agents": offer.agent_bps, "guild": offer.guild_bps, "ops": offer.ops_bps },
            "hero": offer.hero,
        }))
    }

    pub fn view_listing(&self, listing_id: String) -> Option<serde_json::Value> {
        self.listings.get(&listing_id).map(|listing| json!({
            "id": listing_id,
            "seller": listing.seller,
            "token_id": listing.token_id,
            "amount": listing.amount.to_string(),
            "price": listing.price.to_string(),
            "currency": if listing.currency_near { "NEAR" } else { "PLAY_GOLD" },
            "state": listing.state,
        }))
    }

    pub fn view_rumour(&self, token_id: String) -> Option<serde_json::Value> {
        self.rumours.get(&token_id).map(|rumour| json!({
            "token_id": token_id,
            "state": rumour.state,
            "commitment": rumour.commitment,
            "price": rumour.price.to_string(),
            "buyer": rumour.buyer,
            "epoch": rumour.epoch,
        }))
    }

    pub fn view_audit(&self, audit_id: String) -> Option<String> {
        self.audits.get(&audit_id).cloned()
    }

    pub fn cinder_of(&self, account_id: AccountId) -> u32 {
        self.cinder.get(account_id.as_str()).copied().unwrap_or(0)
    }

    pub fn set_paused(&mut self, paused: bool) {
        self.assert_owner();
        self.paused = paused;
        game("kill_switch", json!({ "paused": paused, "by": self.owner_id }));
    }

    pub fn set_operator(&mut self, operator_id: AccountId) {
        self.assert_owner();
        self.operator_id = operator_id;
    }

    pub fn set_deeds(&mut self, deeds_id: AccountId) {
        self.assert_owner();
        self.deeds_id = Some(deeds_id);
    }

    pub fn set_treasury(&mut self, treasury_id: AccountId) {
        self.assert_owner();
        self.treasury_id = Some(treasury_id);
    }

    pub fn set_engine_hash(&mut self, engine_hash: String) {
        self.assert_owner();
        require!(!engine_hash.is_empty(), "engine hash");
        self.engine_hash = engine_hash;
    }

    pub fn set_ai_key(&mut self, public_key_hex: String) {
        self.assert_owner();
        if public_key_hex.is_empty() {
            self.ai_key = None;
            return;
        }
        let bytes = hex::decode(&public_key_hex).unwrap_or_default();
        require!(bytes.len() == 32, "ai key must be 32 bytes hex, or empty to disable");
        self.ai_key = Some(bytes);
    }

    pub fn set_dungeon_owner(&mut self, dungeon_owner: AccountId) {
        let from_deeds = self.deeds_id.as_ref() == Some(&env::predecessor_account_id());
        if !from_deeds {
            self.assert_owner();
            require!(self.deeds_id.is_none(), "deed ownership is authoritative once deeds are wired");
        }
        self.dungeon_owner = dungeon_owner;
    }

    #[payable]
    pub fn fund_solvency(&mut self) {
        self.assert_owner();
        let amount = env::attached_deposit().as_yoctonear();
        require!(amount > 0, "attach NEAR");
        self.solvency_yocto += amount;
        game("fund_solvency", json!({ "amount": amount.to_string() }));
    }

    #[payable]
    pub fn deposit_near(&mut self) {
        self.assert_not_session();
        let amount = env::attached_deposit().as_yoctonear();
        require!(amount > 0, "attach NEAR");
        let account = env::predecessor_account_id();
        self.add_balance(account.as_str(), "__near", amount);
        game("deposit_near", json!({ "account": account, "amount": amount.to_string() }));
    }

    #[payable]
    pub fn add_working_capital(&mut self, merchant_id: String) {
        self.assert_not_session();
        require!(!self.paused, "paused");
        let amount = env::attached_deposit().as_yoctonear();
        require!(amount > 0, "attach NEAR");
        let mut merchant = self.merchants.get(&merchant_id).cloned().expect("merchant");
        merchant.near += amount;
        self.touch_merchant(&merchant_id, &mut merchant, true);
        self.merchants.insert(merchant_id.clone(), merchant.clone());
        game("working_capital", json!({ "merchant": merchant_id, "amount": amount.to_string(), "state": shop_name(merchant.state), "yield": "0" }));
    }

    #[payable]
    pub fn fund_offer(&mut self) -> String {
        self.assert_not_session();
        require!(!self.paused, "paused");
        permits::assert_price(env::attached_deposit().as_yoctonear()).expect("permit price is 0.01 NEAR");
        let split = split_for(0).expect("split");
        let id = self.next_id("offer");
        let now = env::block_timestamp();
        self.offers.insert(id.clone(), Offer {
            funder: env::predecessor_account_id(),
            dungeon_owner: self.dungeon_owner.clone(),
            price: permits::PERMIT_PRICE,
            owner_bps: split.owner,
            agent_bps: split.agents,
            guild_bps: split.guild,
            ops_bps: split.ops,
            expires_ns: now + OFFER_TTL_NS,
            slot: self.raid_slot,
            state: 0,
            counters: vec![],
            hero: None,
        });
        game("permit_funded", json!({ "offer_id": id, "price": permits::PERMIT_PRICE.to_string(), "currency": "NEAR" }));
        id
    }

    pub fn counter_offer(&mut self, offer_id: String, hero_id: String, shift_bps: u32, decision_id: String) -> String {
        self.assert_operator();
        require!(!self.paused, "paused");
        let result = self.counter_inner(&offer_id, &hero_id, shift_bps, &decision_id);
        if let Err(reason) = &result {
            self.audit(false, "counter_offer", reason);
        }
        match result {
            Ok(()) => "ok".into(),
            Err(reason) => reason,
        }
    }

    pub fn accept_offer(&mut self, offer_id: String) {
        require!(env::predecessor_account_id() == self.dungeon_owner, "only the dungeon owner accepts");
        self.assert_not_session();
        let mut offer = self.offers.get(&offer_id).cloned().expect("offer");
        require!(offer.state == 0, "offer is not open");
        require!(offer.hero.is_some(), "no hero has been accepted by a counter or a direct accept needs a hero");
        self.ensure_live(&offer);
        offer.state = 1;
        self.offers.insert(offer_id, offer);
    }

    pub fn assign_hero(&mut self, offer_id: String, hero_id: String) {
        self.assert_operator();
        require!(matches!(hero_id.as_str(), "kara" | "brann" | "ivo"), "hero");
        let mut offer = self.offers.get(&offer_id).cloned().expect("offer");
        require!(offer.state == 0 && offer.hero.is_none(), "offer");
        self.ensure_live(&offer);
        offer.hero = Some(hero_id);
        self.offers.insert(offer_id, offer);
    }

    pub fn expire_offer(&mut self, offer_id: String) {
        self.assert_not_session();
        let mut offer = self.offers.get(&offer_id).cloned().expect("offer");
        require!(offer.state == 0, "offer is not open");
        let expired = env::block_timestamp() > offer.expires_ns || self.raid_slot > offer.slot + 5;
        require!(expired, "offer has not expired");
        offer.state = 2;
        let funder = offer.funder.clone();
        let price = offer.price;
        self.offers.insert(offer_id.clone(), offer);
        Promise::new(funder).transfer(NearToken::from_yoctonear(price)).detach();
        game("permit_refunded", json!({ "offer_id": offer_id, "amount": price.to_string(), "refund": "1.0" }));
    }

    pub fn execute_agent_decision(
        &mut self,
        agent_id: String,
        decision_id: String,
        nonce: u64,
        method: String,
        receiver: String,
        token_id: String,
        amount: U128,
        currency: String,
        expires_at_ms: u64,
        rules_hash: String,
    ) -> String {
        self.assert_operator();
        if self.paused {
            self.audit(false, "execute_agent_decision", "paused");
            return "paused".into();
        }
        let Some(mut agent) = self.agents.get(&agent_id).cloned() else {
            self.audit(false, "execute_agent_decision", "unknown agent");
            return "unknown agent".into();
        };
        let now_ms = env::block_timestamp() / 1_000_000;
        let day = now_ms / 86_400_000;
        if agent.spent_day != day {
            agent.spent_day = day;
            agent.spent_today = 0;
        }
        let seen = self.decisions.get(&decision_id).is_some();
        let hero = matches!(agent_id.as_str(), "kara" | "brann" | "ivo");
        if method == "dungeon_choice" || method == "fee_haggle" {
            if seen || nonce != agent.nonce || now_ms > expires_at_ms || rules_hash != self.rules_hash {
                self.audit(false, &method, "rejected decision");
                return "rejected decision".into();
            }
            if method == "fee_haggle" {
                let shift = u32::try_from(amount.0).unwrap_or(u32::MAX);
                if self.counter_inner(&receiver, &agent_id, shift, &decision_id).is_err() {
                    self.audit(false, "fee_haggle", "counter rejected");
                    return "counter rejected".into();
                }
            }
            agent.nonce += 1;
            agent.decisions.push(decision_id.clone());
            self.decisions.insert(decision_id, 1);
            self.agents.insert(agent_id, agent);
            self.audit(true, &method, "ok");
            return "ok".into();
        }
        let (methods, receivers, tokens): (&[&str], &[&str], &[&str]) = if hero {
            (HERO_METHODS, HERO_RECEIVERS, &["nb:gear:", "nb:resource:", "rumour:"])
        } else {
            (MERCHANT_METHODS, MERCHANT_RECEIVERS, &["play:resource:", "nb:resource:", "nb:blueprint:", "nb:gear:", "play:gear:"])
        };
        let class = class_of(&token_id);
        let near_backed = class.ok() == Some(ItemClass::NearBacked) || token_id.starts_with("rumour:");
        let currency_near = currency == "NEAR";
        let proposal = Proposal {
            decision_id: &decision_id,
            nonce,
            expected_nonce: agent.nonce,
            method: &method,
            receiver: &receiver,
            token_id: &token_id,
            currency_is_near: currency_near,
            token_is_near_backed: near_backed,
            amount: amount.0,
            balance: if currency_near { agent.near } else { agent.gold },
            spent_today: agent.spent_today,
            max_single: agent.max_single,
            daily_limit: agent.daily,
            expires_at_ms,
            now_ms,
            rules_hash: &rules_hash,
            expected_rules: &self.rules_hash,
            seen,
            allowed_methods: methods,
            allowed_receivers: receivers,
            allowed_tokens: tokens,
        };
        if let Err(error) = check_proposal(&proposal) {
            self.audit(false, "execute_agent_decision", &format!("{error:?}"));
            return format!("{error:?}");
        }
        if currency_near && !near_backed {
            self.audit(false, "execute_agent_decision", "class");
            return "class".into();
        }
        let mut spent = amount.0;
        if method == "rumour_purchase" {
            let price = self.rumours.get(&token_id).map(|rumour| rumour.price).unwrap_or(0);
            if price == 0 || price > amount.0 || self.take_rumour(&token_id, &agent_id, price).is_err() {
                self.audit(false, "rumour_purchase", "rumour");
                return "rumour".into();
            }
            spent = price;
            if let Some(mut broker) = self.agents.get("orrin").cloned() {
                broker.near += price;
                self.agents.insert("orrin".into(), broker);
            }
        } else if method == "gear_purchase" || method == "merchant_restock" {
            if self.merchant_fill(&receiver, &token_id, 1, currency_near, amount.0, hero).is_err() {
                self.audit(false, &method, "merchant");
                return "merchant".into();
            }
        } else {
            self.audit(false, "execute_agent_decision", "method");
            return "method".into();
        }
        if currency_near {
            agent.near -= spent;
            agent.spent_today += spent;
        } else {
            agent.gold -= spent;
        }
        agent.nonce += 1;
        agent.decisions.push(decision_id.clone());
        agent.inventory.push(Line { token_id: token_id.clone(), amount: 1 });
        self.decisions.insert(decision_id, 1);
        self.agents.insert(agent_id, agent);
        self.audit(true, "execute_agent_decision", "ok");
        "ok".into()
    }

    pub fn record_actions(&mut self, raid_id: String, input_log: String, session_nonce: u64) -> String {
        self.gate("record_actions", session_nonce);
        require!(input_log.len() <= 8_192, "input log is too large");
        require!(self.authorized_raider(), "only the dungeon owner or operator records a raid");
        let hash = sha256_hex(input_log.as_bytes());
        self.actions.insert(raid_id, hash.clone());
        hash
    }

    pub fn settle_raid(&mut self, raid_id: String, offer_id: String, input_hash: String, outcome: String, session_nonce: u64) {
        self.gate("settle_raid", session_nonce);
        require!(!self.paused, "paused");
        require!(self.authorized_raider(), "only the dungeon owner or operator settles");
        require!(self.settlements.get(&raid_id).is_none(), "duplicate settlement");
        require!(self.actions.get(&raid_id).map(|stored| stored == &input_hash).unwrap_or(false), "input hash");
        let parsed = parse_canonical(&outcome).expect("canonical outcome");
        require!(fnv_hex(outcome.as_bytes()) == underrealm_engine::commit_outcome(&parsed).expect("hash"), "outcome hash mismatch");
        check_bounds(&parsed, &self.rules_hash, &self.engine_hash).expect("bounds");
        require!(parsed.raid_id == raid_id, "raid id");
        let mut offer = self.offers.get(&offer_id).cloned().expect("offer");
        require!(offer.state == 1, "permit is not accepted");
        require!(offer.hero.as_deref() == Some(parsed.hero.as_str()), "hero");
        let held = self.cinder.get(self.dungeon_owner.as_str()).copied().unwrap_or(CINDER.start);
        let next_cinder = economy::apply_cinder(held, parsed.kills, 0, parsed.burns, CINDER).expect("cinder");
        self.cinder.insert(self.dungeon_owner.to_string(), next_cinder);
        let split = permits::Split { owner: offer.owner_bps, agents: offer.agent_bps, guild: offer.guild_bps, ops: offer.ops_bps };
        let owner_share = split.share(offer.price, split.owner);
        let agent_share = split.share(offer.price, split.agents);
        let guild_share = split.share(offer.price, split.guild);
        let ops_share = offer.price - owner_share - agent_share - guild_share;
        self.guild_yocto += guild_share;
        self.ops_yocto += ops_share;
        if let Some(hero) = offer.hero.clone() {
            if let Some(mut agent) = self.agents.get(&hero).cloned() {
                agent.near += agent_share;
                agent.last_settlement = Some(raid_id.clone());
                self.agents.insert(hero, agent);
            }
        }
        if let Some(treasury) = self.treasury_id.clone() {
            Promise::new(treasury).function_call(
                "credit",
                json!({ "reason": format!("permit {offer_id}"), "raid_id": raid_id }).to_string().into_bytes(),
                NearToken::from_yoctonear(owner_share),
                Gas::from_tgas(10),
            ).detach();
        } else {
            self.dungeon_escrow += owner_share;
        }
        offer.state = 3;
        self.offers.insert(offer_id.clone(), offer);
        let owner = self.dungeon_owner.clone();
        if parsed.gold_delta >= 0 {
            self.add_balance(owner.as_str(), "__gold", u128::from(parsed.gold_delta as u64) * GOLD);
        } else {
            let debit = u128::from(parsed.gold_delta.unsigned_abs()) * GOLD;
            let have = self.balance(owner.as_str(), "__gold");
            self.set_balance(owner.as_str(), "__gold", have.saturating_sub(debit));
        }
        for commitment in &parsed.landed {
            if self.verified.get(commitment).copied() == Some(1) && self.rumour_for(commitment).is_none() {
                self.mint_rumour(commitment);
            }
        }
        self.raid_slot += 1;
        self.expire_rumours();
        self.settlements.insert(raid_id.clone(), Settlement {
            settler: env::predecessor_account_id(),
            outcome_hash: fnv_hex(outcome.as_bytes()),
            input_hash,
            iron: u128::from(parsed.iron),
            bone: u128::from(parsed.bone),
            ash: u128::from(parsed.ash),
            claimed: false,
            offer_id,
        });
        game("settled", json!({ "raid_id": raid_id, "outcome_hash": fnv_hex(outcome.as_bytes()), "gold_delta": parsed.gold_delta, "rumours_require_verification": self.ai_key.is_some() }));
    }

    pub fn claim_salvage(&mut self, raid_id: String, session_nonce: u64) {
        self.gate("claim_salvage", session_nonce);
        let mut settlement = self.settlements.get(&raid_id).cloned().expect("settlement");
        require!(!settlement.claimed, "claimed");
        require!(settlement.settler == env::predecessor_account_id(), "settler");
        settlement.claimed = true;
        let account = settlement.settler.clone();
        self.mint_play(&account, "play:resource:iron", settlement.iron);
        self.mint_play(&account, "play:resource:bone", settlement.bone);
        self.mint_play(&account, "play:resource:ash", settlement.ash);
        self.settlements.insert(raid_id, settlement);
    }

    pub fn supply(&mut self, merchant_id: String, token_id: String, amount: U128, session_nonce: u64) {
        self.gate("supply", session_nonce);
        require!(!self.paused, "paused");
        require!(class_of(&token_id).ok() == Some(ItemClass::PlayOnly), "Mira buys play-only salvage");
        require!(merchant_id == "mira" || merchant_id == "tallow", "merchant");
        let account = env::predecessor_account_id();
        require!(self.sub_balance(account.as_str(), &token_id, amount.0), "balance");
        let price = self.price_of(&token_id).saturating_mul(amount.0);
        let mut merchant = self.merchants.get(&merchant_id).cloned().expect("merchant");
        require!(merchant.gold >= price, "merchant gold");
        merchant.gold -= price;
        add_stock(&mut merchant, &token_id, amount.0);
        self.add_balance(account.as_str(), "__gold", price);
        self.touch_merchant(&merchant_id, &mut merchant, true);
        self.merchants.insert(merchant_id, merchant);
        self.record_mark(&token_id, false);
        let supply = self.supply.get(&token_id).copied().unwrap_or(0).saturating_sub(amount.0);
        self.supply.insert(token_id.clone(), supply);
        events::burn(&account, &[token_id], &[amount.0.to_string()], "supply");
    }

    pub fn craft(&mut self, output: String, session_nonce: u64) {
        self.gate("craft", session_nonce);
        let account = env::predecessor_account_id();
        let recipe = items::recipe(&output).expect("recipe");
        for (token, amount) in recipe.inputs {
            require!(self.sub_balance(account.as_str(), token, *amount), "input");
            let supply = self.supply.get(*token).copied().unwrap_or(0).saturating_sub(*amount);
            self.supply.insert((*token).to_string(), supply);
            events::burn(&account, &[(*token).to_string()], &[amount.to_string()], "craft");
        }
        let inputs: Vec<(&str, u128)> = recipe.inputs.to_vec();
        items::check_craft(&output, &inputs).expect("provenance");
        self.mint_play(&account, &output, 1);
    }

    pub fn list(&mut self, token_id: String, amount: U128, price: U128, currency: String, session_nonce: u64) -> String {
        self.gate("list", session_nonce);
        require!(!self.paused, "paused");
        let account = env::predecessor_account_id();
        require!(self.sub_balance(account.as_str(), &token_id, amount.0), "balance");
        self.add_balance(env::current_account_id().as_str(), &token_id, amount.0);
        let currency = parse_currency(&currency).expect("currency");
        let id = self.open_listing(&account, &token_id, amount.0, price.0, currency).expect("listing");
        events::transfer(&account, &env::current_account_id(), &[token_id], &[amount.0.to_string()], Some("escrow"));
        id
    }

    #[payable]
    pub fn buy_listing(&mut self, listing_id: String) {
        self.assert_not_session();
        require!(!self.paused, "paused");
        let mut listing = self.listings.get(&listing_id).cloned().expect("listing");
        require!(listing.state == 0, "listing is not open");
        require!(env::block_timestamp() <= listing.expires_ns, "expired");
        let buyer = env::predecessor_account_id();
        require!(buyer != listing.seller, "self purchase");
        if listing.currency_near {
            require!(env::attached_deposit().as_yoctonear() == listing.price, "attach the price");
            require!(listing.class == 1, "NEAR listings are NEAR_BACKED");
        } else {
            require!(env::attached_deposit().as_yoctonear() == 0, "gold listings attach no NEAR");
            require!(self.sub_balance(buyer.as_str(), "__gold", listing.price), "gold");
            self.add_balance(listing.seller.as_str(), "__gold", listing.price * 90 / 100);
        }
        require!(self.sub_balance(env::current_account_id().as_str(), &listing.token_id, listing.amount), "escrow");
        self.add_balance(buyer.as_str(), &listing.token_id, listing.amount);
        events::transfer(&env::current_account_id(), &buyer, &[listing.token_id.clone()], &[listing.amount.to_string()], Some("sale"));
        let linked = self.links.get(buyer.as_str()).map(|other| other == listing.seller.as_str()).unwrap_or(false)
            || self.links.get(listing.seller.as_str()).map(|other| other == buyer.as_str()).unwrap_or(false);
        if market::counts_as_demand(listing.seller.as_str(), buyer.as_str(), linked) {
            self.record_mark(&listing.token_id, true);
        }
        if listing.currency_near {
            let (seller, guild, ops) = market::fee_split(listing.price);
            self.guild_yocto += guild;
            self.ops_yocto += ops;
            Promise::new(listing.seller.clone()).transfer(NearToken::from_yoctonear(seller)).detach();
        }
        listing.state = 1;
        self.listings.insert(listing_id, listing);
    }

    pub fn cancel_listing(&mut self, listing_id: String) {
        self.assert_not_session();
        self.return_listing(listing_id, 2);
    }

    pub fn expire_listing(&mut self, listing_id: String) {
        self.assert_not_session();
        let listing = self.listings.get(&listing_id).cloned().expect("listing");
        require!(env::block_timestamp() > listing.expires_ns, "not expired");
        self.return_listing(listing_id, 3);
    }

    pub fn best_listing(&self, token_id: String, currency: String) -> Option<serde_json::Value> {
        let near = currency == "NEAR";
        let rows: Vec<(String, Listing)> = self.listings.iter().map(|(id, listing)| (id.clone(), listing.clone())).filter(|(_, listing)| listing.state == 0 && listing.token_id == token_id && listing.currency_near == near).collect();
        let candidates: Vec<Candidate<'_>> = rows.iter().map(|(id, listing)| Candidate {
            id: id.as_str(),
            price: listing.price,
            listed_at: listing.listed_ns,
            seller: listing.seller.as_str(),
            buyer: "",
            linked: false,
        }).collect();
        market::choose(&candidates).map(|winner| json!({ "id": winner.id, "price": winner.price.to_string(), "reason": "cheapest eligible, earliest on a tie" }))
    }

    #[payable]
    pub fn link_account(&mut self, other: AccountId) {
        self.assert_yocto();
        self.links.insert(env::predecessor_account_id().to_string(), other.to_string());
    }

    pub fn consume_rumour(&mut self, token_id: String, session_nonce: u64) {
        self.gate("consume_rumour", session_nonce);
        require!(!self.paused, "paused");
        let account = env::predecessor_account_id();
        let rumour = self.rumours.get(&token_id).cloned().expect("rumour");
        require!(self.sub_balance(account.as_str(), "__near", rumour.price), "NEAR balance");
        self.take_rumour(&token_id, account.as_str(), rumour.price).expect("consume");
        if let Some(mut orrin) = self.agents.get("orrin").cloned() {
            orrin.near += rumour.price;
            self.agents.insert("orrin".into(), orrin);
        }
    }

    pub fn buy_back(&mut self, token_id: String, session_nonce: u64) {
        self.gate("buy_back", session_nonce);
        require!(env::predecessor_account_id() == self.dungeon_owner, "owner");
        let mut rumour = self.rumours.get(&token_id).cloned().expect("rumour");
        rumours::buy_back(rumour_state(rumour.state)).expect("buy-back");
        let mut orrin = self.merchants.get("orrin").cloned().expect("orrin");
        let price = rumours::buyback_price(rumour.last_price, orrin.buybacks);
        let owner = self.dungeon_owner.to_string();
        require!(self.sub_balance(&owner, "__near", price), "owner NEAR");
        orrin.near += price;
        orrin.buybacks += 1;
        rumour.state = 2;
        rumour.last_price = price;
        self.burn_contract_token(&token_id);
        self.rumours.insert(token_id.clone(), rumour);
        self.merchants.insert("orrin".into(), orrin);
        game("buy_back", json!({ "token_id": token_id, "price": price.to_string(), "burned": true }));
    }

    pub fn relay_epoch(&mut self) {
        require!(env::predecessor_account_id() == self.dungeon_owner, "owner");
        self.assert_not_session();
        self.dungeon_epoch += 1;
        game("epoch", json!({ "epoch": self.dungeon_epoch }));
    }

    pub fn submit_diary_proof(&mut self, commitment_hex: String, signature_hex: String) -> String {
        let signature = hex::decode(signature_hex).unwrap_or_default();
        match proof::verify_diary(self.ai_key.as_deref(), &commitment_hex, &signature) {
            Ok(()) => {
                self.verified.insert(commitment_hex, 1);
                "verified".into()
            }
            Err(ProofError::Disabled) => "DISABLED".into(),
            Err(error) => format!("{error:?}"),
        }
    }

    #[payable]
    pub fn register_session(&mut self, tx_cap: U128, daily_cap: U128) -> String {
        self.assert_yocto();
        let key = env::signer_account_pk().to_string();
        let now = env::block_timestamp();
        self.sessions.insert(key.clone(), Session {
            account: env::predecessor_account_id(),
            nonce: 1,
            expiry_ns: now + DAY_NS,
            revoked: false,
            tx_cap: tx_cap.0,
            daily_cap: daily_cap.0,
            spent_today: 0,
            spent_day: now / DAY_NS,
        });
        key
    }

    pub fn revoke_session(&mut self, public_key: String) {
        let mut session = self.sessions.get(&public_key).cloned().expect("session");
        require!(session.account == env::predecessor_account_id() || env::predecessor_account_id() == self.owner_id, "owner");
        session.revoked = true;
        self.sessions.insert(public_key, session);
    }

    #[payable]
    pub fn merge_guest(&mut self, guest_id: String, nonce: String, items: Vec<(String, U128)>) {
        self.assert_yocto();
        self.assert_not_session();
        require!(!guest_id.is_empty() && !nonce.is_empty(), "nonce");
        require!(self.guests.get(&guest_id).is_none(), "guest already merged");
        require!(items.len() <= 20, "too many lines");
        let account = env::predecessor_account_id();
        for (token, amount) in &items {
            require!(amount.0 > 0 && amount.0 <= 1_000, "amount");
            let class = class_of(token).expect("class");
            require!(class != ItemClass::NonTradeable, "PLAY_GOLD, Cinder, and rumours do not merge");
            require!(token.starts_with("play:gear:") || token.starts_with("play:resource:") || token.starts_with("nb:gear:") || token.starts_with("nb:resource:") || token.starts_with("nb:blueprint:") || token.starts_with("play:trap:"), "only blueprints, gear, and materials");
            self.mint_play(&account, token, amount.0);
        }
        self.guests.insert(guest_id, 1);
    }

    pub fn set_deed_payout(&mut self, token_id: String, inflight: bool) -> Promise {
        require!(env::predecessor_account_id() == self.dungeon_owner || env::predecessor_account_id() == self.operator_id, "owner");
        self.assert_not_session();
        let deeds = self.deeds_id.clone().expect("deeds are not wired");
        Promise::new(deeds).function_call(
            "set_payout",
            json!({ "token_id": token_id, "inflight": inflight }).to_string().into_bytes(),
            NearToken::from_yoctonear(0),
            Gas::from_tgas(15),
        )
    }
}

impl Contract {
    fn bootstrap(&mut self) {
        let heroes = [("kara", 3_000u32, 7_000u32), ("brann", 8_000, 2_000), ("ivo", 5_000, 9_000)];
        for (name, risk, appetite) in heroes {
            self.agents.insert(name.into(), Agent {
                near: HERO_START,
                gold: 0,
                spent_today: 0,
                spent_day: 0,
                max_single: HERO_MAX,
                daily: HERO_DAILY,
                risk_bps: risk,
                appetite_bps: appetite,
                nonce: 0,
                inventory: vec![],
                decisions: vec![],
                last_settlement: None,
            });
        }
        self.agents.insert("mira".into(), self.merchant_agent(90));
        self.agents.insert("orrin".into(), self.merchant_agent(70));
        self.agents.insert("tallow".into(), self.merchant_agent(80));
        self.seed_merchant("mira", &[("play:resource:iron", 100), ("play:resource:ash", 80), ("play:resource:bone", 60), ("nb:resource:iron", 100)], 340);
        self.seed_merchant("tallow", &[("nb:gear:potion", 20), ("nb:gear:armor", 10), ("nb:gear:boots", 15)], 45);
        self.seed_merchant("orrin", &[], 0);
        self.cinder.insert(self.dungeon_owner.to_string(), CINDER.start);
    }

    fn merchant_agent(&self, gold: u128) -> Agent {
        Agent {
            near: MERCHANT_START,
            gold: gold * GOLD,
            spent_today: 0,
            spent_day: 0,
            max_single: MERCHANT_MAX,
            daily: MERCHANT_DAILY,
            risk_bps: 0,
            appetite_bps: 0,
            nonce: 0,
            inventory: vec![],
            decisions: vec![],
            last_settlement: None,
        }
    }

    fn seed_merchant(&mut self, id: &str, stock: &[(&str, u128)], target: u128) {
        for (token, _) in stock {
            self.ensure_token(token);
        }
        self.merchants.insert(id.into(), Merchant {
            near: MERCHANT_START,
            gold: self.agents.get(id).map(|agent| agent.gold).unwrap_or(0),
            state: 0,
            stock: stock.iter().map(|(token, amount)| Line { token_id: (*token).to_string(), amount: *amount }).collect(),
            target,
            buybacks: 0,
        });
    }

    fn assert_yocto(&self) {
        require!(env::attached_deposit().as_yoctonear() == 1, "Requires attached deposit of exactly 1 yoctoNEAR");
    }

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner_id, "owner");
        self.assert_not_session();
    }

    fn assert_operator(&self) {
        let caller = env::predecessor_account_id();
        require!(caller == self.operator_id || caller == self.owner_id, "operator");
        self.assert_not_session();
    }

    fn assert_not_session(&self) {
        let key = env::signer_account_pk().to_string();
        require!(self.sessions.get(&key).is_none(), "session key cannot call this method");
    }

    fn authorized_raider(&self) -> bool {
        let caller = env::predecessor_account_id();
        caller == self.dungeon_owner || caller == self.operator_id || caller == self.owner_id
    }

    fn gate(&mut self, method: &str, nonce: u64) {
        require!(env::attached_deposit().as_yoctonear() == 0, "in-raid actions attach no deposit");
        let key = env::signer_account_pk().to_string();
        if let Some(mut session) = self.sessions.get(&key).cloned() {
            require!(!session.revoked, "revoked");
            require!(env::block_timestamp() < session.expiry_ns, "expired key");
            require!(session.account == env::predecessor_account_id(), "session account");
            require!(SESSION_METHODS.contains(&method), "method is not on the session allowlist");
            require!(nonce == session.nonce, "nonce");
            let day = env::block_timestamp() / DAY_NS;
            if session.spent_day != day {
                session.spent_day = day;
                session.spent_today = 0;
            }
            require!(session.spent_today < session.daily_cap, "daily cap");
            session.spent_today += 1;
            session.nonce += 1;
            self.sessions.insert(key, session);
        }
    }

    fn balance(&self, owner: &str, token: &str) -> u128 {
        self.balances.get(&format!("{owner}\t{token}")).copied().unwrap_or(0)
    }

    fn set_balance(&mut self, owner: &str, token: &str, amount: u128) {
        let key = format!("{owner}\t{token}");
        if amount == 0 {
            self.balances.remove(&key);
        } else {
            self.balances.insert(key, amount);
        }
    }

    fn add_balance(&mut self, owner: &str, token: &str, amount: u128) {
        if amount == 0 {
            return;
        }
        self.set_balance(owner, token, self.balance(owner, token).saturating_add(amount));
    }

    fn sub_balance(&mut self, owner: &str, token: &str, amount: u128) -> bool {
        let have = self.balance(owner, token);
        if have < amount {
            return false;
        }
        self.set_balance(owner, token, have - amount);
        true
    }

    fn ensure_token(&mut self, token: &str) {
        if self.tokens.get(token).is_none() {
            let class = match class_of(token) {
                Ok(ItemClass::PlayOnly) => 0,
                Ok(ItemClass::NearBacked) => 1,
                Ok(ItemClass::NonTradeable) => 2,
                Err(_) => return,
            };
            self.tokens.insert(token.to_string(), class);
            self.supply.insert(token.to_string(), 0);
        }
    }

    fn assert_transferable(&self, token: &str) {
        match class_of(token) {
            Ok(ItemClass::NonTradeable) => env::panic_str("this item cannot be transferred"),
            Ok(_) => {}
            Err(_) => env::panic_str("unknown token"),
        }
    }

    fn transfer_many(&mut self, receiver: &AccountId, tokens: &[String], amounts: &[u128], memo: Option<&str>) {
        require!(tokens.len() == amounts.len() && !tokens.is_empty(), "length");
        let sender = env::predecessor_account_id();
        require!(sender != *receiver, "receiver");
        for (token, amount) in tokens.iter().zip(amounts.iter()) {
            require!(*amount > 0, "amount");
            self.assert_transferable(token);
            require!(self.sub_balance(sender.as_str(), token, *amount), "balance");
            self.add_balance(receiver.as_str(), token, *amount);
        }
        let text: Vec<String> = amounts.iter().map(|amount| amount.to_string()).collect();
        events::transfer(&sender, receiver, tokens, &text, memo);
    }

    fn transfer_call_many(&mut self, receiver: AccountId, token_ids: Vec<String>, amounts: Vec<U128>, memo: Option<String>, msg: String) -> Promise {
        let raw: Vec<u128> = amounts.iter().map(|amount| amount.0).collect();
        let sender = env::predecessor_account_id();
        self.transfer_many(&receiver, &token_ids, &raw, memo.as_deref());
        let call = json!({
            "sender_id": sender,
            "previous_owner_ids": vec![sender.clone(); token_ids.len()],
            "token_ids": token_ids,
            "amounts": amounts,
            "msg": msg,
        });
        let resolve = json!({
            "sender_id": sender,
            "receiver_id": receiver,
            "token_ids": call["token_ids"],
            "amounts": amounts,
        });
        Promise::new(receiver).function_call("mt_on_transfer", call.to_string().into_bytes(), NearToken::from_yoctonear(0), Gas::from_tgas(40)).then(
            Promise::new(env::current_account_id()).function_call("mt_resolve_transfer", resolve.to_string().into_bytes(), NearToken::from_yoctonear(0), Gas::from_tgas(25)),
        )
    }

    fn mint_play(&mut self, account: &AccountId, token: &str, amount: u128) {
        if amount == 0 {
            return;
        }
        self.ensure_token(token);
        self.add_balance(account.as_str(), token, amount);
        let supply = self.supply.get(token).copied().unwrap_or(0).saturating_add(amount);
        self.supply.insert(token.to_string(), supply);
        events::mint(account, &[token.to_string()], &[amount.to_string()], "mint");
    }

    fn next_id(&mut self, prefix: &str) -> String {
        let id = format!("{prefix}-{}", self.seq);
        self.seq += 1;
        id
    }

    fn audit(&mut self, ok: bool, method: &str, reason: &str) {
        let id = self.audit_seq.to_string();
        self.audit_seq += 1;
        self.audits.insert(id, format!("{ok}|{method}|{reason}"));
    }

    fn book_inputs(&self, token: &str) -> (u128, u128, u128, i128, u128, u128) {
        match self.books.get(token) {
            Some(book) => {
                let buys = book.marks.iter().filter(|mark| **mark == 1).count() as u128;
                let sells = book.marks.iter().filter(|mark| **mark == 2).count() as u128;
                (buys, sells, book.marks.len() as u128, book.ema, book.price, book.day_open)
            }
            None => (0, 0, 0, 0, 0, 0),
        }
    }

    fn stock_of(&self, token: &str) -> u128 {
        self.merchants.iter().map(|(_, merchant)| merchant.stock.iter().filter(|line| line.token_id == token).map(|line| line.amount).sum::<u128>()).sum()
    }

    fn price_of(&mut self, token: &str) -> u128 {
        let (buys, sells, sample, ema, price, day_open) = self.book_inputs(token);
        quote_good(token, self.stock_of(token).max(1), buys, sells, sample, if price == 0 { None } else { Some((ema, price)) }, if day_open == 0 { None } else { Some(day_open) })
            .map(|quote| quote.price)
            .unwrap_or(GOLD)
    }

    fn record_mark(&mut self, token: &str, buy: bool) {
        if economy::good(token).is_none() {
            return;
        }
        let day = env::block_timestamp() / DAY_NS;
        let mut book = self.books.get(token).cloned().unwrap_or(Book { ema: 0, price: 0, day_open: 0, day, marks: vec![] });
        if book.day != day {
            book.day = day;
            book.day_open = book.price;
        }
        book.marks.push(if buy { 1 } else { 2 });
        if book.marks.len() > 10 {
            book.marks.remove(0);
        }
        let buys = book.marks.iter().filter(|mark| **mark == 1).count() as u128;
        let sells = book.marks.iter().filter(|mark| **mark == 2).count() as u128;
        let prev = if book.price == 0 { None } else { Some((book.ema, book.price)) };
        let open = if book.day_open == 0 { None } else { Some(book.day_open) };
        if let Some(quote) = quote_good(token, self.stock_of(token).max(1), buys, sells, book.marks.len() as u128, prev, open) {
            book.ema = quote.ema_scaled;
            book.price = quote.price;
            if book.day_open == 0 {
                book.day_open = quote.price;
            }
        }
        self.books.insert(token.to_string(), book);
    }

    fn touch_merchant(&self, id: &str, merchant: &mut Merchant, contributed: bool) {
        let goods = id != "orrin";
        let stock = merchant.stock.iter().map(|line| line.amount).sum();
        let target = merchant.target;
        let state = match merchant.state {
            3 | 4 if contributed => {
                let next = after_contribution_stall(merchant.near, stock, target, goods);
                reopen_stall(next, merchant.near, stock, target, goods)
            }
            3 => ShopState::Closed,
            4 => reopen_stall(ShopState::Recovery, merchant.near, stock, target, goods),
            _ => classify_stall(merchant.near, stock, target, goods),
        };
        merchant.state = shop_byte(state);
    }

    fn open_listing(&mut self, seller: &AccountId, token: &str, amount: u128, price: u128, currency: Currency) -> Result<String, &'static str> {
        if self.paused {
            return Err("paused");
        }
        if amount == 0 || price == 0 {
            return Err("amount");
        }
        let class = class_of(token).map_err(|_| "class")?;
        if !items::can_trade(class, currency) || !items::allowlisted(token, currency) {
            return Err("allowlist");
        }
        let active = self.listings.iter().filter(|(_, listing)| &listing.seller == seller && listing.state == 0).count();
        if active >= 5 {
            return Err("five listings");
        }
        let id = self.next_id("list");
        let now = env::block_timestamp();
        self.listings.insert(id.clone(), Listing {
            seller: seller.clone(),
            token_id: token.to_string(),
            amount,
            price,
            currency_near: currency == Currency::Near,
            class: match class {
                ItemClass::PlayOnly => 0,
                ItemClass::NearBacked => 1,
                ItemClass::NonTradeable => 2,
            },
            listed_ns: now,
            expires_ns: now + DAY_NS,
            state: 0,
        });
        Ok(id)
    }

    fn return_listing(&mut self, listing_id: String, state: u8) {
        let mut listing = self.listings.get(&listing_id).cloned().expect("listing");
        require!(listing.state == 0, "listing");
        require!(listing.seller == env::predecessor_account_id() || state == 3, "seller");
        require!(self.sub_balance(env::current_account_id().as_str(), &listing.token_id, listing.amount), "escrow");
        self.add_balance(listing.seller.as_str(), &listing.token_id, listing.amount);
        events::transfer(&env::current_account_id(), &listing.seller, &[listing.token_id.clone()], &[listing.amount.to_string()], Some("return"));
        listing.state = state;
        self.listings.insert(listing_id, listing);
    }

    fn counter_inner(&mut self, offer_id: &str, hero_id: &str, shift_bps: u32, decision_id: &str) -> Result<(), String> {
        if self.decisions.get(decision_id).is_some() {
            return Err("replay".into());
        }
        let mut offer = self.offers.get(offer_id).cloned().ok_or("offer")?;
        if offer.state != 0 {
            return Err("offer".into());
        }
        if offer.counters.iter().any(|hero| hero == hero_id) {
            return Err("one counter".into());
        }
        let split = split_for(shift_bps).map_err(|_| "shift".to_string())?;
        offer.owner_bps = split.owner;
        offer.agent_bps = split.agents;
        offer.counters.push(hero_id.to_string());
        offer.hero = Some(hero_id.to_string());
        self.offers.insert(offer_id.to_string(), offer);
        self.decisions.insert(decision_id.to_string(), 1);
        Ok(())
    }

    fn ensure_live(&self, offer: &Offer) {
        require!(env::block_timestamp() <= offer.expires_ns && self.raid_slot <= offer.slot + 5, "expired");
    }

    fn take_rumour(&mut self, token_id: &str, buyer: &str, paid: u128) -> Result<(), &'static str> {
        let mut rumour = self.rumours.get(token_id).cloned().ok_or("rumour")?;
        if paid < rumour.price {
            return Err("price");
        }
        purchase(rumour_state(rumour.state)).map_err(|_| "state")?;
        rumour.state = 1;
        rumour.buyer = Some(buyer.to_string());
        rumour.requests += 1;
        self.burn_contract_token(token_id);
        self.rumours.insert(token_id.to_string(), rumour);
        game("rumour_consumed", json!({ "token_id": token_id, "buyer": buyer, "memory": "warned" }));
        Ok(())
    }

    fn mint_rumour(&mut self, commitment: &str) {
        let id = format!("rumour:ashgate:{}:{commitment}", self.dungeon_epoch);
        let price = rumours::rumour_price(0, 0, 1);
        self.ensure_token(&id);
        let contract = env::current_account_id();
        self.add_balance(contract.as_str(), &id, 1);
        let supply = self.supply.get(&id).copied().unwrap_or(0) + 1;
        self.supply.insert(id.clone(), supply);
        events::mint(&contract, &[id.clone()], &["1".into()], "rumour");
        self.rumours.insert(id, Rumour {
            commitment: commitment.to_string(),
            epoch: self.dungeon_epoch,
            tier: 1,
            state: 0,
            price,
            last_price: price,
            slot: self.raid_slot,
            requests: 0,
            buyer: None,
        });
    }

    fn rumour_for(&self, commitment: &str) -> Option<String> {
        self.rumours.iter().find(|(_, rumour)| rumour.commitment == commitment).map(|(id, _)| id.clone())
    }

    fn burn_contract_token(&mut self, token: &str) {
        let contract = env::current_account_id();
        if self.sub_balance(contract.as_str(), token, 1) {
            let supply = self.supply.get(token).copied().unwrap_or(0).saturating_sub(1);
            self.supply.insert(token.to_string(), supply);
            events::burn(&contract, &[token.to_string()], &["1".into()], "burn");
        }
    }

    fn expire_rumours(&mut self) {
        let ids: Vec<String> = self.rumours.iter().map(|(id, _)| id.clone()).collect();
        for id in ids {
            if let Some(mut rumour) = self.rumours.get(&id).cloned() {
                let age = self.raid_slot.saturating_sub(rumour.slot);
                let next = expire(rumour_state(rumour.state), age);
                if next == RumourState::Expired && rumour.state == 0 {
                    rumour.state = 3;
                    self.burn_contract_token(&id);
                    self.rumours.insert(id, rumour);
                }
            }
        }
    }

    fn merchant_fill(&mut self, merchant_id: &str, token: &str, amount: u128, near: bool, paid: u128, to_hero: bool) -> Result<(), &'static str> {
        let class = class_of(token).map_err(|_| "class")?;
        if near && class != ItemClass::NearBacked && !token.starts_with("rumour:") {
            return Err("class");
        }
        if !near && class == ItemClass::NearBacked {
            return Err("class");
        }
        let mut merchant = self.merchants.get(merchant_id).cloned().ok_or("merchant")?;
        let line = merchant.stock.iter_mut().find(|line| line.token_id == token).ok_or("stock")?;
        if line.amount < amount {
            return Err("stock");
        }
        line.amount -= amount;
        if near {
            merchant.near += paid;
        } else {
            merchant.gold += paid;
        }
        self.touch_merchant(merchant_id, &mut merchant, false);
        self.merchants.insert(merchant_id.to_string(), merchant);
        if to_hero {
            self.record_mark(token, true);
        }
        Ok(())
    }

    fn token_json(&self, token: &str) -> Option<serde_json::Value> {
        let class = self.tokens.get(token).copied()?;
        Some(json!({
            "token_id": token,
            "owner_id": null,
            "base_metadata_id": token,
            "class": class,
        }))
    }

    fn base_metadata(&self, token: &str) -> serde_json::Value {
        let class = class_of(token).ok();
        json!({
            "name": token,
            "id": token,
            "symbol": null,
            "icon": null,
            "decimals": "0",
            "base_uri": null,
            "reference": null,
            "copies": null,
            "reference_hash": null,
            "extra": class.map(|value| format!("{value:?}")),
        })
    }

    fn page_tokens(&self, from_index: Option<String>, limit: Option<u32>, owner: Option<AccountId>) -> Vec<serde_json::Value> {
        let start = from_index.and_then(|value| value.parse::<usize>().ok()).unwrap_or(0);
        let limit = limit.unwrap_or(50).min(50) as usize;
        self.tokens
            .iter()
            .filter(|(token, _)| owner.as_ref().map(|account| self.balance(account.as_str(), token) > 0).unwrap_or(true))
            .skip(start)
            .take(limit)
            .filter_map(|(token, _)| self.token_json(token))
            .collect()
    }
}

fn parse_currency(value: &str) -> Result<Currency, &'static str> {
    match value {
        "NEAR" => Ok(Currency::Near),
        "PLAY_GOLD" => Ok(Currency::PlayGold),
        _ => Err("currency"),
    }
}

fn parse_list_msg(msg: &str) -> Option<(u128, Currency)> {
    let mut parts = msg.split('|');
    if parts.next()? != "list" {
        return None;
    }
    let price = parts.next()?.parse().ok()?;
    let currency = parse_currency(parts.next()?).ok()?;
    Some((price, currency))
}

fn add_stock(merchant: &mut Merchant, token: &str, amount: u128) {
    if let Some(line) = merchant.stock.iter_mut().find(|line| line.token_id == token) {
        line.amount += amount;
    } else {
        merchant.stock.push(Line { token_id: token.to_string(), amount });
    }
}

fn shop_byte(state: ShopState) -> u8 {
    match state {
        ShopState::Open => 0,
        ShopState::LowStock => 1,
        ShopState::Undercapitalised => 2,
        ShopState::Closed => 3,
        ShopState::Recovery => 4,
    }
}

fn shop_name(state: u8) -> &'static str {
    match state {
        0 => "OPEN",
        1 => "LOW_STOCK",
        2 => "UNDERCAPITALISED",
        3 => "CLOSED",
        _ => "RECOVERY",
    }
}

fn rumour_state(state: u8) -> RumourState {
    match state {
        1 => RumourState::Consumed,
        2 => RumourState::BoughtBack,
        3 => RumourState::Expired,
        _ => RumourState::Listed,
    }
}

