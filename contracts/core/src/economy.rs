//! Integer form of the v10.2 price curves.
//!
//! Demand is the exact ratio. The TypeScript display rounds that ratio to two
//! decimals before drawing the curve. See docs/CONFLICTS.md.

use crate::items::{class_of, Currency, ItemClass};

pub const SCALE: u128 = 1_000_000;
pub const GOLD: u128 = 1_000_000;
pub const YOCTO: u128 = 1_000_000_000_000_000_000_000_000;
pub const RESERVE_YOCTO: u128 = YOCTO / 50;
pub const CLOSE_YOCTO: u128 = YOCTO / 100;
pub const MIN_SAMPLE: u128 = 6;
pub const MAX_CHANGE_PER_RAID_BPS: u128 = 1_000;
pub const MAX_CHANGE_PER_DAY_BPS: u128 = 3_000;

#[derive(Clone, Copy, Debug)]
pub struct Good {
    pub token_id: &'static str,
    pub base: u128,
    pub target: u128,
    pub min: u128,
    pub max: u128,
    pub currency: Currency,
}

pub const GOODS: &[Good] = &[
    Good { token_id: "play:resource:iron", base: 10 * GOLD, target: 100, min: 5 * GOLD, max: 20 * GOLD, currency: Currency::PlayGold },
    Good { token_id: "play:resource:ash", base: 8 * GOLD, target: 80, min: 4 * GOLD, max: 16 * GOLD, currency: Currency::PlayGold },
    Good { token_id: "play:resource:bone", base: 12 * GOLD, target: 60, min: 6 * GOLD, max: 24 * GOLD, currency: Currency::PlayGold },
    Good { token_id: "nb:resource:iron", base: YOCTO / 1_000, target: 100, min: YOCTO / 2_000, max: YOCTO / 500, currency: Currency::Near },
    Good { token_id: "nb:gear:potion", base: YOCTO / 50, target: 20, min: YOCTO / 100, max: YOCTO / 25, currency: Currency::Near },
    Good { token_id: "nb:gear:armor", base: YOCTO / 20, target: 10, min: YOCTO / 40, max: YOCTO / 10, currency: Currency::Near },
    Good { token_id: "nb:gear:boots", base: YOCTO * 3 / 100, target: 15, min: YOCTO * 3 / 200, max: YOCTO * 3 / 50, currency: Currency::Near },
];

pub fn good(token_id: &str) -> Option<&'static Good> {
    GOODS.iter().find(|good| good.token_id == token_id)
}

pub fn isqrt(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = x.div_ceil(2);
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

pub fn demand(buys: u128, sells: u128, sample: u128) -> (i128, bool) {
    if sample < MIN_SAMPLE {
        return (0, true);
    }
    let denom = (buys + sells).max(1) as i128;
    let raw = (buys as i128 - sells as i128) * SCALE as i128 / denom;
    (raw.clamp(-(SCALE as i128), SCALE as i128), false)
}

pub fn ema(previous: i128, raw: i128) -> i128 {
    (previous * 7 + raw * 3) / 10
}

pub fn guard(previous: u128, next: u128, max_bps: u128) -> u128 {
    if previous == 0 {
        return next;
    }
    let lo = previous.saturating_mul(10_000 - max_bps) / 10_000;
    let hi = previous.saturating_mul(10_000 + max_bps) / 10_000;
    next.clamp(lo, hi)
}

pub fn stock_curve(base: u128, target: u128, min: u128, max: u128, stock: u128, d_scaled: i128) -> u128 {
    let stock = stock.max(1);
    let root = isqrt(target.saturating_mul(SCALE).saturating_mul(SCALE) / stock);
    let factor = (SCALE as i128 + d_scaled * 3 / 10).max(0) as u128;
    let raw = base.saturating_mul(root).saturating_mul(factor) / SCALE / SCALE;
    raw.clamp(min, max)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Quote {
    pub price: u128,
    pub currency: Currency,
    pub class: ItemClass,
    pub d_scaled: i128,
    pub low_confidence: bool,
    pub ema_scaled: i128,
    pub stock: u128,
    pub target: u128,
    pub base: u128,
}

pub fn quote_good(
    token_id: &str,
    stock: u128,
    buys: u128,
    sells: u128,
    sample: u128,
    previous: Option<(i128, u128)>,
    day_open: Option<u128>,
) -> Option<Quote> {
    let good = good(token_id)?;
    let (raw_d, low) = demand(buys, sells, sample);
    let ema_scaled = if low { 0 } else { previous.map(|(prev, _)| ema(prev, raw_d)).unwrap_or(raw_d) };
    let d = if low { 0 } else { ema_scaled };
    let curved = stock_curve(good.base, good.target, good.min, good.max, stock, d);
    let mut price = previous.map(|(_, prev)| guard(prev, curved, MAX_CHANGE_PER_RAID_BPS)).unwrap_or(curved);
    if let Some(open) = day_open {
        price = guard(open, price, MAX_CHANGE_PER_DAY_BPS);
    }
    price = price.clamp(good.min, good.max);
    Some(Quote {
        price,
        currency: good.currency,
        class: class_of(token_id).ok()?,
        d_scaled: if low { 0 } else { raw_d },
        low_confidence: low,
        ema_scaled,
        stock,
        target: good.target,
        base: good.base,
    })
}

#[derive(Clone, Copy, Debug)]
pub struct CinderParams {
    pub start: u32,
    pub per_kill: u32,
    pub per_wave_clear: u32,
    pub cap: u32,
    pub burn_cost: u32,
}

pub const CINDER: CinderParams = CinderParams { start: 3, per_kill: 1, per_wave_clear: 0, cap: 5, burn_cost: 2 };

pub fn apply_cinder(held: u32, kills: u32, wave_clears: u32, burns: u32, params: CinderParams) -> Result<u32, &'static str> {
    let gained = kills.saturating_mul(params.per_kill).saturating_add(wave_clears.saturating_mul(params.per_wave_clear));
    let held = held.saturating_add(gained).min(params.cap);
    let cost = burns.saturating_mul(params.burn_cost);
    if held < cost {
        return Err("not enough cinder to burn");
    }
    Ok(held - cost)
}

pub fn kill_pays_for_its_own_burn(params: CinderParams) -> bool {
    params.per_kill >= params.burn_cost && params.burn_cost > 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flood_example_stays_on_the_published_curve() {
        let quote = quote_good("play:resource:iron", 200, 2, 10, 12, None, None).unwrap();
        assert!(!quote.low_confidence);
        assert_eq!(quote.d_scaled, -666_666);
        let gold = quote.price as f64 / GOLD as f64;
        assert!((gold - 5.656).abs() < 0.01, "price {gold}");
        assert!(quote.price >= 5 * GOLD && quote.price <= 20 * GOLD);
    }

    #[test]
    fn low_sample_uses_zero_demand() {
        let quote = quote_good("play:resource:iron", 200, 2, 10, 3, None, None).unwrap();
        assert!(quote.low_confidence);
        assert_eq!(quote.d_scaled, 0);
    }

    #[test]
    fn raid_guard_caps_a_ten_percent_move() {
        let base = 10 * GOLD;
        let next = stock_curve(10 * GOLD, 100, 5 * GOLD, 20 * GOLD, 1, SCALE as i128);
        let guarded = guard(base, next, MAX_CHANGE_PER_RAID_BPS);
        assert!(guarded <= base * 110 / 100);
    }

    #[test]
    fn chosen_cinder_is_not_self_funding() {
        assert!(!kill_pays_for_its_own_burn(CINDER));
        assert!(apply_cinder(0, 1, 0, 1, CINDER).is_err());
        assert_eq!(apply_cinder(3, 1, 0, 2, CINDER).unwrap(), 0);
        assert!(kill_pays_for_its_own_burn(CinderParams { burn_cost: 1, ..CINDER }));
    }
}
