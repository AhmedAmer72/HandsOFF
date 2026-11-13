//! Settlement commitment shared with `src/chain/settlement.ts`.
//!
//! The playable raid stays the TypeScript walk. This crate hashes the compact
//! record both sides build, so a caller cannot submit an outcome hash that
//! does not match the economic fields.

use sha2::{Digest, Sha256};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Outcome {
    pub raid_id: String,
    pub hero: String,
    pub survived: bool,
    pub gold_delta: i64,
    pub kills: u32,
    pub burns: u32,
    pub landed: Vec<String>,
    pub iron: u32,
    pub bone: u32,
    pub ash: u32,
    pub rules_hash: String,
    pub engine_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BoundsError(pub &'static str);

pub fn fnv1a32(data: &[u8]) -> u32 {
    let mut hash: u32 = 2_166_136_261;
    for byte in data {
        hash ^= u32::from(*byte);
        hash = hash.wrapping_mul(16_777_619);
    }
    hash
}

pub fn fnv_hex(data: &[u8]) -> String {
    format!("{:08x}", fnv1a32(data))
}

pub fn sha256_hex(data: &[u8]) -> String {
    hex::encode(Sha256::digest(data))
}

pub fn canonical(outcome: &Outcome) -> String {
    format!(
        "v1|{raid}|{hero}|{survived}|{gold}|{kills}|{burns}|{landed}|{iron}|{bone}|{ash}|{rules}|{engine}",
        raid = outcome.raid_id,
        hero = outcome.hero,
        survived = if outcome.survived { 1 } else { 0 },
        gold = outcome.gold_delta,
        kills = outcome.kills,
        burns = outcome.burns,
        landed = outcome.landed.join(","),
        iron = outcome.iron,
        bone = outcome.bone,
        ash = outcome.ash,
        rules = outcome.rules_hash,
        engine = outcome.engine_hash,
    )
}

pub fn parse_canonical(text: &str) -> Result<Outcome, BoundsError> {
    let parts: Vec<&str> = text.split('|').collect();
    if parts.len() != 13 || parts[0] != "v1" {
        return Err(BoundsError("canonical record must be v1 with 12 fields"));
    }
    let survived = match parts[3] {
        "1" => true,
        "0" => false,
        _ => return Err(BoundsError("survived must be 0 or 1")),
    };
    Ok(Outcome {
        raid_id: parts[1].to_string(),
        hero: parts[2].to_string(),
        survived,
        gold_delta: parts[4].parse().map_err(|_| BoundsError("gold delta"))?,
        kills: parts[5].parse().map_err(|_| BoundsError("kills"))?,
        burns: parts[6].parse().map_err(|_| BoundsError("burns"))?,
        landed: if parts[7].is_empty() {
            Vec::new()
        } else {
            parts[7].split(',').map(str::to_string).collect()
        },
        iron: parts[8].parse().map_err(|_| BoundsError("iron"))?,
        bone: parts[9].parse().map_err(|_| BoundsError("bone"))?,
        ash: parts[10].parse().map_err(|_| BoundsError("ash"))?,
        rules_hash: parts[11].to_string(),
        engine_hash: parts[12].to_string(),
    })
}

pub fn check_bounds(outcome: &Outcome, rules_hash: &str, engine_hash: &str) -> Result<(), BoundsError> {
    if outcome.rules_hash != rules_hash {
        return Err(BoundsError("rules hash"));
    }
    if outcome.engine_hash != engine_hash {
        return Err(BoundsError("engine hash"));
    }
    if outcome.raid_id.is_empty() || outcome.hero.is_empty() {
        return Err(BoundsError("raid id"));
    }
    if !(-1_200..=1_200).contains(&outcome.gold_delta) {
        return Err(BoundsError("gold delta is outside the vault bound"));
    }
    if outcome.kills > 20 || outcome.burns > 5 {
        return Err(BoundsError("cinder counts"));
    }
    if outcome.landed.len() > 5 || outcome.iron > 40 || outcome.bone > 20 || outcome.ash > 20 {
        return Err(BoundsError("loot bound"));
    }
    for commitment in &outcome.landed {
        if commitment.len() != 64 || !commitment.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(BoundsError("landed commitment must be 64 hex characters"));
        }
    }
    Ok(())
}

pub fn commit_outcome(outcome: &Outcome) -> Result<String, BoundsError> {
    let text = canonical(outcome);
    let parsed = parse_canonical(&text)?;
    if parsed != *outcome {
        return Err(BoundsError("canonical round trip"));
    }
    Ok(fnv_hex(text.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Outcome {
        Outcome {
            raid_id: "raid-1".into(),
            hero: "kara".into(),
            survived: false,
            gold_delta: -40,
            kills: 2,
            burns: 1,
            landed: vec!["ab".repeat(32)],
            iron: 10,
            bone: 5,
            ash: 0,
            rules_hash: "rules".into(),
            engine_hash: "engine".into(),
        }
    }

    #[test]
    fn fnv_matches_the_typescript_offset_basis() {
        assert_eq!(fnv1a32(b""), 2_166_136_261);
        assert_eq!(fnv_hex(b"ashgate"), "0a2c5418");
    }

    #[test]
    fn round_trip_and_bounds() {
        let outcome = sample();
        let hash = commit_outcome(&outcome).unwrap();
        assert_eq!(hash.len(), 8);
        let mut bad = outcome.clone();
        bad.gold_delta = 50_000;
        assert!(check_bounds(&bad, "rules", "engine").is_err());
        bad.gold_delta = -40;
        bad.rules_hash = "other".into();
        assert!(check_bounds(&bad, "rules", "engine").is_err());
    }

    #[test]
    fn plaintext_diary_is_not_a_valid_commitment() {
        let mut outcome = sample();
        outcome.landed = vec!["the spike is at 4,4".into()];
        assert!(check_bounds(&outcome, "rules", "engine").is_err());
    }
}
