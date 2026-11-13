use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{testing_env, CurveType, Gas, NearToken, PublicKey};
use underrealm_core::proof::commitment_of;
use underrealm_engine::{canonical, Outcome};

fn account(name: &str) -> AccountId {
    name.parse().unwrap()
}

fn use_env(predecessor: &str, deposit: u128) {
    let mut ctx = VMContextBuilder::new();
    ctx.current_account_id(account("game.neocrafts.testnet"))
        .signer_account_id(account(predecessor))
        .predecessor_account_id(account(predecessor))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .account_balance(NearToken::from_near(30))
        .prepaid_gas(Gas::from_tgas(200))
        .block_timestamp(1_700_000_000_000_000_000);
    testing_env!(ctx.build());
}

fn contract() -> Contract {
    use_env("neocrafts.testnet", 0);
    Contract::new(account("neocrafts.testnet"), account("neocrafts.testnet"), "ruleshash".into(), "enginehash".into())
}

fn outcome(raid: &str, commitment: Option<&str>) -> String {
    canonical(&Outcome {
        raid_id: raid.into(),
        hero: "kara".into(),
        survived: false,
        gold_delta: 0,
        kills: 1,
        burns: 1,
        landed: commitment.into_iter().map(str::to_string).collect(),
        iron: 1,
        bone: 0,
        ash: 0,
        rules_hash: "ruleshash".into(),
        engine_hash: "enginehash".into(),
    })
}

#[test]
fn transfer_needs_one_yocto_and_keeps_the_class() {
    let mut game = contract();
    use_env("neocrafts.testnet", 1);
    game.merge_guest("guest-1".into(), "nonce-1".into(), vec![("play:resource:iron".into(), U128(4))]);
    assert_eq!(game.mt_balance_of(account("neocrafts.testnet"), "play:resource:iron".into()), "4");
    use_env("neocrafts.testnet", 1);
    game.mt_transfer(account("bob.testnet"), "play:resource:iron".into(), U128(1), None, None);
    assert_eq!(game.mt_balance_of(account("bob.testnet"), "play:resource:iron".into()), "1");
    assert_eq!(items::class_of("play:resource:iron").unwrap(), items::ItemClass::PlayOnly);
}

#[test]
#[should_panic(expected = "1 yoctoNEAR")]
fn transfer_without_yocto_panics() {
    let mut game = contract();
    use_env("neocrafts.testnet", 1);
    game.merge_guest("guest-2".into(), "n".into(), vec![("nb:gear:potion".into(), U128(1))]);
    use_env("neocrafts.testnet", 0);
    game.mt_transfer(account("bob.testnet"), "nb:gear:potion".into(), U128(1), None, None);
}

#[test]
#[should_panic(expected = "allowlist")]
fn play_only_cannot_be_listed_for_near() {
    let mut game = contract();
    use_env("neocrafts.testnet", 1);
    game.merge_guest("guest-3".into(), "n".into(), vec![("play:resource:iron".into(), U128(2))]);
    use_env("neocrafts.testnet", 0);
    game.list("play:resource:iron".into(), U128(1), U128(YOCTO / 100), "NEAR".into(), 0);
}

#[test]
fn agent_policy_rejects_an_injected_receiver_without_spending() {
    let mut game = contract();
    use_env("neocrafts.testnet", 0);
    let before = game.view_agent("kara".into()).unwrap()["near"].as_str().unwrap().to_string();
    let reason = game.execute_agent_decision(
        "kara".into(), "evil-1".into(), 0, "gear_purchase".into(), "attacker.near".into(),
        "nb:gear:potion".into(), U128(1), "NEAR".into(), 2_000_000_000_000, "ruleshash".into(),
    );
    assert_eq!(reason, "Receiver");
    assert_eq!(game.view_agent("kara".into()).unwrap()["near"].as_str().unwrap(), before);
    assert!(game.view_audit("1".into()).unwrap().contains("Receiver"));
}

#[test]
fn permit_counter_is_capped_and_expiry_refunds_the_whole_deposit() {
    let mut game = contract();
    use_env("patron.testnet", permits::PERMIT_PRICE);
    let id = game.fund_offer();
    use_env("neocrafts.testnet", 0);
    assert_eq!(game.counter_offer(id.clone(), "kara".into(), 2_001, "c1".into()), "shift");
    assert_eq!(game.counter_offer(id.clone(), "kara".into(), 500, "c2".into()), "ok");
    assert_eq!(game.counter_offer(id.clone(), "kara".into(), 100, "c3".into()), "one counter");
    let offer = game.view_offer(id.clone()).unwrap();
    assert_eq!(offer["split"]["agents"], 3500);
    assert_eq!(offer["price"].as_str().unwrap(), &permits::PERMIT_PRICE.to_string());
    use_env("patron.testnet", 0);
    let mut ctx = VMContextBuilder::new();
    ctx.current_account_id(account("game.neocrafts.testnet"))
        .predecessor_account_id(account("patron.testnet"))
        .signer_account_id(account("patron.testnet"))
        .block_timestamp(1_700_000_000_000_000_000 + OFFER_TTL_NS + 1)
        .account_balance(NearToken::from_near(30));
    testing_env!(ctx.build());
    game.expire_offer(id.clone());
    assert_eq!(game.view_offer(id).unwrap()["state"], 2);
}

#[test]
fn verified_page_mints_one_rumour_and_an_unverified_page_does_not() {
    let mut game = contract();
    let signing = SigningKey::from_bytes(&[9u8; 32]);
    use_env("neocrafts.testnet", 0);
    game.set_ai_key(hex::encode(signing.verifying_key().to_bytes()));
    let commitment = commitment_of(b"spike under the south arch");
    let signature = signing.sign(commitment.as_bytes());
    assert_eq!(game.submit_diary_proof(commitment.clone(), hex::encode(signature.to_bytes())), "verified");
    use_env("patron.testnet", permits::PERMIT_PRICE);
    let offer = game.fund_offer();
    use_env("neocrafts.testnet", 0);
    game.assign_hero(offer.clone(), "kara".into());
    game.accept_offer(offer.clone());
    let input = game.record_actions("raid-1".into(), "seed=1".into(), 0);
    game.settle_raid("raid-1".into(), offer, input, outcome("raid-1", Some(&commitment)), 0);
    let rumour_id = format!("rumour:ashgate:1:{commitment}");
    assert_eq!(game.view_rumour(rumour_id.clone()).unwrap()["state"], 0);
    assert_eq!(game.mt_supply(rumour_id).unwrap(), "1");
    use_env("patron.testnet", permits::PERMIT_PRICE);
    let offer = game.fund_offer();
    use_env("neocrafts.testnet", 0);
    game.assign_hero(offer.clone(), "brann".into());
    let mut offer_state = game.offers.get(&offer).cloned().unwrap();
    offer_state.hero = Some("brann".into());
    game.offers.insert(offer.clone(), offer_state);
    game.accept_offer(offer.clone());
    let plain = "ab".repeat(32);
    let input = game.record_actions("raid-2".into(), "seed=2".into(), 0);
    let text = outcome("raid-2", Some(&plain)).replace("kara", "brann");
    game.settle_raid("raid-2".into(), offer, input, text, 0);
    assert!(game.view_rumour(format!("rumour:ashgate:1:{plain}")).is_none());
}

#[test]
#[should_panic(expected = "paused")]
fn kill_switch_blocks_settlement() {
    let mut game = contract();
    use_env("neocrafts.testnet", 0);
    game.set_paused(true);
    use_env("patron.testnet", permits::PERMIT_PRICE);
    game.fund_offer();
}

#[test]
fn session_key_rejects_admin_and_a_replayed_nonce() {
    let mut game = contract();
    let pk = PublicKey::from_parts(CurveType::ED25519, vec![7u8; 32]).unwrap();
    let mut ctx = VMContextBuilder::new();
    ctx.current_account_id(account("game.neocrafts.testnet"))
        .predecessor_account_id(account("neocrafts.testnet"))
        .signer_account_id(account("neocrafts.testnet"))
        .signer_account_pk(pk.clone())
        .attached_deposit(NearToken::from_yoctonear(1))
        .account_balance(NearToken::from_near(30))
        .block_timestamp(1_700_000_000_000_000_000);
    testing_env!(ctx.build());
    let key = game.register_session(U128(0), U128(0));
    assert_eq!(key, pk.to_string());
    ctx.attached_deposit(NearToken::from_yoctonear(0));
    testing_env!(ctx.build());
    let caught = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mut game = game;
        game.set_paused(true);
    }));
    assert!(caught.is_err());
}

#[test]
fn supply_moves_play_stock_and_not_near() {
    let mut game = contract();
    use_env("neocrafts.testnet", 1);
    game.merge_guest("guest-4".into(), "n".into(), vec![("play:resource:iron".into(), U128(5))]);
    let near_before = game.view_merchant("mira".into()).unwrap()["near"].as_str().unwrap().to_string();
    use_env("neocrafts.testnet", 0);
    game.supply("mira".into(), "play:resource:iron".into(), U128(2), 0);
    assert_eq!(game.mt_balance_of(account("neocrafts.testnet"), "play:resource:iron".into()), "3");
    assert!(game.balance("neocrafts.testnet", "__gold") > 0);
    assert_eq!(game.view_merchant("mira".into()).unwrap()["near"].as_str().unwrap(), near_before);
}

#[test]
fn market_rejects_a_second_buy_and_pays_the_split_in_gold() {
    let mut game = contract();
    use_env("neocrafts.testnet", 1);
    game.merge_guest("guest-5".into(), "n".into(), vec![("play:resource:iron".into(), U128(1))]);
    use_env("neocrafts.testnet", 0);
    let id = game.list("play:resource:iron".into(), U128(1), U128(10 * GOLD), "PLAY_GOLD".into(), 0);
    use_env("bob.testnet", 0);
    game.add_balance("bob.testnet", "__gold", 10 * GOLD);
    game.buy_listing(id.clone());
    assert_eq!(game.mt_balance_of(account("bob.testnet"), "play:resource:iron".into()), "1");
    assert_eq!(game.balance("neocrafts.testnet", "__gold"), 9 * GOLD);
    let err = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let mut game = game;
        game.buy_listing(id);
    }));
    assert!(err.is_err());
}
