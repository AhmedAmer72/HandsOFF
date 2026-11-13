use crate::economy::YOCTO;

pub const PERMIT_PRICE: u128 = YOCTO / 100;
pub const SHIFT_MAX_BPS: u32 = 2_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Split {
    pub owner: u32,
    pub agents: u32,
    pub guild: u32,
    pub ops: u32,
}

impl Split {
    pub fn sum(self) -> u32 {
        self.owner + self.agents + self.guild + self.ops
    }

    pub fn share(self, amount: u128, bps: u32) -> u128 {
        amount * u128::from(bps) / 10_000
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PermitError {
    Price,
    Shift,
    OwnerFloor,
    AgentCeiling,
    AlreadyCountered,
    NotOwner,
}

pub fn split_for(shift_bps: u32) -> Result<Split, PermitError> {
    if shift_bps > SHIFT_MAX_BPS {
        return Err(PermitError::Shift);
    }
    let owner = 5_000 - shift_bps;
    let agents = 3_000 + shift_bps;
    if owner < 3_000 {
        return Err(PermitError::OwnerFloor);
    }
    if agents > 5_000 {
        return Err(PermitError::AgentCeiling);
    }
    let split = Split { owner, agents, guild: 1_000, ops: 1_000 };
    if split.sum() != 10_000 {
        return Err(PermitError::Shift);
    }
    Ok(split)
}

pub fn assert_price(attached: u128) -> Result<(), PermitError> {
    if attached == PERMIT_PRICE { Ok(()) } else { Err(PermitError::Price) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_is_fixed_and_counter_only_moves_the_split() {
        assert_eq!(PERMIT_PRICE, YOCTO / 100);
        assert!(assert_price(PERMIT_PRICE - 1).is_err());
        let base = split_for(0).unwrap();
        let countered = split_for(500).unwrap();
        assert_eq!(base.sum(), 10_000);
        assert_eq!(countered.owner, 4_500);
        assert_eq!(countered.agents, 3_500);
        assert_eq!(countered.sum(), 10_000);
        assert!(split_for(2_001).is_err());
        assert!(split_for(2_000).is_ok());
        let paid = countered.share(PERMIT_PRICE, countered.owner)
            + countered.share(PERMIT_PRICE, countered.agents)
            + countered.share(PERMIT_PRICE, countered.guild)
            + countered.share(PERMIT_PRICE, countered.ops);
        assert_eq!(paid, PERMIT_PRICE);
    }
}
