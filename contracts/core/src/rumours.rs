use crate::economy::{SCALE, YOCTO};

pub const BASE: u128 = YOCTO / 500;
pub const EXPIRY_RAIDS: u64 = 20;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RumourState {
    Listed,
    Consumed,
    BoughtBack,
    Expired,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RumourError {
    NotListed,
    Consumed,
    Unverified,
    EmptyCommitment,
}

pub fn freshness(epochs_since: u32) -> u128 {
    let mut value = SCALE;
    for _ in 0..epochs_since {
        value = value * 85 / 100;
    }
    value.max(SCALE / 5)
}

pub fn richness(tier: u32) -> u128 {
    (SCALE + u128::from(tier) * 50_000).min(SCALE * 3 / 2)
}

pub fn rumour_price(requests: u32, epochs_since: u32, tier: u32) -> u128 {
    let demand = u128::from(requests.min(3));
    let factor = SCALE + demand * SCALE / 4;
    let raw = BASE.saturating_mul(factor) / SCALE * freshness(epochs_since) / SCALE * richness(tier) / SCALE;
    raw.clamp(BASE / 5, BASE * 5)
}

pub fn buyback_price(last: u128, previous_buybacks: u32) -> u128 {
    let mut price = last;
    for _ in 0..previous_buybacks {
        price = price.saturating_mul(5) / 4;
    }
    price.min(BASE * 3)
}

pub fn purchase(state: RumourState) -> Result<RumourState, RumourError> {
    if state != RumourState::Listed {
        return Err(RumourError::NotListed);
    }
    Ok(RumourState::Consumed)
}

pub fn buy_back(state: RumourState) -> Result<RumourState, RumourError> {
    if state == RumourState::Consumed {
        return Err(RumourError::Consumed);
    }
    if state != RumourState::Listed {
        return Err(RumourError::NotListed);
    }
    Ok(RumourState::BoughtBack)
}

pub fn expire(state: RumourState, raids_listed: u64) -> RumourState {
    if state == RumourState::Listed && raids_listed >= EXPIRY_RAIDS {
        RumourState::Expired
    } else {
        state
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_two_one_epoch_three_requests() {
        let price = rumour_price(3, 1, 2);
        let near = price as f64 / YOCTO as f64;
        assert!((near - 0.0032725).abs() < 0.00001, "price {near}");
    }

    #[test]
    fn buyback_grows_then_caps_and_consumed_cannot_return() {
        assert_eq!(buyback_price(BASE, 1), BASE * 5 / 4);
        assert_eq!(buyback_price(BASE, 20), BASE * 3);
        assert_eq!(purchase(RumourState::Listed).unwrap(), RumourState::Consumed);
        assert_eq!(buy_back(RumourState::Consumed).unwrap_err(), RumourError::Consumed);
        assert_eq!(buy_back(RumourState::Listed).unwrap(), RumourState::BoughtBack);
        assert_eq!(expire(RumourState::Listed, 20), RumourState::Expired);
        assert_eq!(expire(RumourState::Consumed, 20), RumourState::Consumed);
    }
}
