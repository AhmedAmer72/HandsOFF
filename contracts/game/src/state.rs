use near_sdk::near;
use near_sdk::store::IterableMap;
use near_sdk::AccountId;

pub const SESSION_METHODS: &[&str] = &[
    "settle_raid",
    "record_actions",
    "supply",
    "craft",
    "list",
    "consume_rumour",
    "buy_back",
    "claim_salvage",
];

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Line {
    pub token_id: String,
    pub amount: u128,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Agent {
    pub near: u128,
    pub gold: u128,
    pub spent_today: u128,
    pub spent_day: u64,
    pub max_single: u128,
    pub daily: u128,
    pub risk_bps: u32,
    pub appetite_bps: u32,
    pub nonce: u64,
    pub inventory: Vec<Line>,
    pub decisions: Vec<String>,
    pub last_settlement: Option<String>,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Merchant {
    pub near: u128,
    pub gold: u128,
    pub state: u8,
    pub stock: Vec<Line>,
    pub target: u128,
    pub buybacks: u32,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Offer {
    pub funder: AccountId,
    pub dungeon_owner: AccountId,
    pub price: u128,
    pub owner_bps: u32,
    pub agent_bps: u32,
    pub guild_bps: u32,
    pub ops_bps: u32,
    pub expires_ns: u64,
    pub slot: u64,
    pub state: u8,
    pub counters: Vec<String>,
    pub hero: Option<String>,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Listing {
    pub seller: AccountId,
    pub token_id: String,
    pub amount: u128,
    pub price: u128,
    pub currency_near: bool,
    pub class: u8,
    pub listed_ns: u64,
    pub expires_ns: u64,
    pub state: u8,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Rumour {
    pub commitment: String,
    pub epoch: u32,
    pub tier: u32,
    pub state: u8,
    pub price: u128,
    pub last_price: u128,
    pub slot: u64,
    pub requests: u32,
    pub buyer: Option<String>,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Session {
    pub account: AccountId,
    pub nonce: u64,
    pub expiry_ns: u64,
    pub revoked: bool,
    pub tx_cap: u128,
    pub daily_cap: u128,
    pub spent_today: u128,
    pub spent_day: u64,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Settlement {
    pub settler: AccountId,
    pub outcome_hash: String,
    pub input_hash: String,
    pub iron: u128,
    pub bone: u128,
    pub ash: u128,
    pub claimed: bool,
    pub offer_id: String,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct Book {
    pub ema: i128,
    pub price: u128,
    pub day_open: u128,
    pub day: u64,
    pub marks: Vec<u8>,
}

pub struct Maps {
    pub balances: IterableMap<String, u128>,
    pub supply: IterableMap<String, u128>,
    pub tokens: IterableMap<String, u8>,
    pub agents: IterableMap<String, Agent>,
    pub merchants: IterableMap<String, Merchant>,
    pub offers: IterableMap<String, Offer>,
    pub listings: IterableMap<String, Listing>,
    pub rumours: IterableMap<String, Rumour>,
    pub verified: IterableMap<String, u8>,
    pub decisions: IterableMap<String, u8>,
    pub sessions: IterableMap<String, Session>,
    pub settlements: IterableMap<String, Settlement>,
    pub actions: IterableMap<String, String>,
    pub links: IterableMap<String, String>,
    pub books: IterableMap<String, Book>,
    pub audits: IterableMap<String, String>,
    pub guests: IterableMap<String, u8>,
    pub cinder: IterableMap<String, u32>,
}

pub fn maps() -> Maps {
    Maps {
        balances: IterableMap::new(b"bal".as_slice()),
        supply: IterableMap::new(b"sup".as_slice()),
        tokens: IterableMap::new(b"tok".as_slice()),
        agents: IterableMap::new(b"agt".as_slice()),
        merchants: IterableMap::new(b"mer".as_slice()),
        offers: IterableMap::new(b"off".as_slice()),
        listings: IterableMap::new(b"lst".as_slice()),
        rumours: IterableMap::new(b"rum".as_slice()),
        verified: IterableMap::new(b"ver".as_slice()),
        decisions: IterableMap::new(b"dec".as_slice()),
        sessions: IterableMap::new(b"ses".as_slice()),
        settlements: IterableMap::new(b"set".as_slice()),
        actions: IterableMap::new(b"act".as_slice()),
        links: IterableMap::new(b"lnk".as_slice()),
        books: IterableMap::new(b"bok".as_slice()),
        audits: IterableMap::new(b"aud".as_slice()),
        guests: IterableMap::new(b"gst".as_slice()),
        cinder: IterableMap::new(b"cin".as_slice()),
    }
}
