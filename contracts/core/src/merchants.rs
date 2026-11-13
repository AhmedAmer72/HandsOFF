use crate::economy::{CLOSE_YOCTO, RESERVE_YOCTO};

pub use crate::economy::{CLOSE_YOCTO as CLOSE_BELOW, RESERVE_YOCTO as RESERVE};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ShopState {
    Open,
    LowStock,
    Undercapitalised,
    Closed,
    Recovery,
}

pub fn classify(cash_yocto: u128, stock: u128, target: u128) -> ShopState {
    classify_stall(cash_yocto, stock, target, true)
}

pub fn classify_stall(cash_yocto: u128, stock: u128, target: u128, goods: bool) -> ShopState {
    let low = goods && target > 0 && stock * 2 < target;
    let under = cash_yocto < RESERVE_YOCTO;
    let closed = cash_yocto < CLOSE_YOCTO || (goods && stock == 0);
    if closed {
        ShopState::Closed
    } else if under {
        ShopState::Undercapitalised
    } else if low {
        ShopState::LowStock
    } else {
        ShopState::Open
    }
}

/// Closed shops do not reopen on a clock. A contribution enters recovery,
/// and the shop opens only when cash and stock both clear their thresholds.
pub fn after_contribution(cash_yocto: u128, stock: u128, target: u128) -> ShopState {
    after_contribution_stall(cash_yocto, stock, target, true)
}

pub fn after_contribution_stall(cash_yocto: u128, stock: u128, target: u128, goods: bool) -> ShopState {
    match classify_stall(cash_yocto, stock, target, goods) {
        ShopState::Closed => ShopState::Recovery,
        other => other,
    }
}

pub fn reopen_if_ready(state: ShopState, cash_yocto: u128, stock: u128, target: u128) -> ShopState {
    reopen_stall(state, cash_yocto, stock, target, true)
}

pub fn reopen_stall(state: ShopState, cash_yocto: u128, stock: u128, target: u128, goods: bool) -> ShopState {
    if state != ShopState::Recovery {
        return state;
    }
    let stock_ready = !goods || (stock > 0 && (target == 0 || stock * 2 >= target));
    if cash_yocto >= RESERVE_YOCTO && stock_ready {
        ShopState::Open
    } else {
        ShopState::Recovery
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lifecycle_needs_a_contribution_and_pays_no_yield() {
        assert_eq!(classify(RESERVE_YOCTO, 40, 100), ShopState::LowStock);
        assert_eq!(classify(CLOSE_YOCTO, 100, 100), ShopState::Undercapitalised);
        assert_eq!(classify(CLOSE_YOCTO - 1, 100, 100), ShopState::Closed);
        assert_eq!(classify(RESERVE_YOCTO, 0, 100), ShopState::Closed);
        let contributed = after_contribution(CLOSE_YOCTO - 1, 10, 100);
        assert_eq!(contributed, ShopState::Recovery);
        assert_eq!(reopen_if_ready(contributed, CLOSE_YOCTO - 1, 10, 100), ShopState::Recovery);
        assert_eq!(reopen_if_ready(ShopState::Recovery, RESERVE_YOCTO, 50, 100), ShopState::Open);
        assert_eq!(reopen_if_ready(ShopState::Closed, RESERVE_YOCTO, 100, 100), ShopState::Closed);
    }
}
