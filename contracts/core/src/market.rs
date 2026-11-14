#[derive(Clone, Copy, Debug)]
pub struct Candidate<'a> {
    pub id: &'a str,
    pub price: u128,
    pub listed_at: u64,
    pub seller: &'a str,
    pub buyer: &'a str,
    pub linked: bool,
}

pub fn choose<'a>(candidates: &'a [Candidate<'a>]) -> Option<&'a Candidate<'a>> {
    candidates.iter().min_by(|a, b| a.price.cmp(&b.price).then(a.listed_at.cmp(&b.listed_at)))
}

pub fn fee_split(price: u128) -> (u128, u128, u128) {
    let seller = price * 90 / 100;
    let guild = price * 5 / 100;
    let ops = price - seller - guild;
    (seller, guild, ops)
}

pub fn counts_as_demand(seller: &str, buyer: &str, linked: bool) -> bool {
    seller != buyer && !linked
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cheapest_then_earliest_and_fee() {
        let rows = [
            Candidate { id: "late", price: 10, listed_at: 5, seller: "a", buyer: "b", linked: false },
            Candidate { id: "early", price: 10, listed_at: 4, seller: "a", buyer: "b", linked: false },
            Candidate { id: "dear", price: 11, listed_at: 1, seller: "a", buyer: "b", linked: false },
        ];
        assert_eq!(choose(&rows).unwrap().id, "early");
        assert_eq!(fee_split(100), (90, 5, 5));
        assert_eq!(fee_split(10).0 + fee_split(10).1 + fee_split(10).2, 10);
    }

    #[test]
    fn wash_and_linked_trades_are_not_demand() {
        assert!(!counts_as_demand("a", "a", false));
        assert!(!counts_as_demand("a", "b", true));
        assert!(counts_as_demand("a", "b", false));
    }
}
