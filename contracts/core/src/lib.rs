//! Pure v10.2 rules. The game contract calls these and does not keep a second formula.

pub mod agents;
pub mod economy;
pub mod items;
pub mod market;
pub mod merchants;
pub mod permits;
pub mod proof;
pub mod rumours;

pub use underrealm_engine::{check_bounds, commit_outcome, canonical, parse_canonical, Outcome};
