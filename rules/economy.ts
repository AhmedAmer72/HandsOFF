// UNDERREALM rules v10.2 — design start values. Change only via simulation log.
export type Currency = 'PLAY_GOLD' | 'NEAR';
export type ItemClass = 'PLAY_ONLY' | 'NEAR_BACKED' | 'NON_TRADEABLE';
export const RAID = { vaultStart: 1200, bleedPerHeroPerSec: 1, pageFlightSec: 3,
  cinder: { start: 3, perKill: 1, perWaveClear: 0, cap: 5, burnCost: 2 }, // proposed; sim variants below
  traps: { spike: 30, pit: 80, boulder: 120 }, relay: 5, relayRearmSec: 0.5,
  bait: 25, possess: { cost: 25, durationSec: 5, cooldownSec: 20, fromWave: 2 } };

export const CINDER_SIM_VARIANTS = [ { burnCost: 1, perKill: 1, perWaveClear: 0 },
  { burnCost: 2, perKill: 1, perWaveClear: 0 }, { burnCost: 1, perKill: 0, perWaveClear: 2 } ];
// metrics: burn/let-land ratio, leftover Cinder per raid, rumour demand; winner + reason → parameter log

// Canonical stock-goods price (play goods in PLAY_GOLD; nb: goods in NEAR)
// P = clamp(Pmin, Pmax, Pbase * (Starget / max(S,1))^EPS * (1 + BETA*D))
// D = (buys - sells) / max(buys + sells, 1) over last 10 raids, in [-1, 1]
// Anti-manipulation: D counts only SETTLED trades (no cancelled/refunded/failed, no same-owner or
// linked-account wash trades); player demand and NPC demand tracked separately (analytics);
// below MIN_SAMPLE trades D = 0 and the tooltip shows "low confidence"; D is EMA-smoothed;
// the price may move at most MAX_CHANGE_PER_RAID per raid and MAX_CHANGE_PER_DAY per day.
export const EPS = 0.5, BETA = 0.3;
export const PRICE_GUARD = { MIN_SAMPLE: 6, EMA_ALPHA: 0.3, MAX_CHANGE_PER_RAID: 0.10, MAX_CHANGE_PER_DAY: 0.30 };
export const GOODS = {
  'play:resource:iron': { base: 10, target: 100, min: 5, max: 20, currency: 'PLAY_GOLD' as Currency, cls: 'PLAY_ONLY' as ItemClass },
  'play:resource:ash':  { base: 8,  target: 80,  min: 4, max: 16, currency: 'PLAY_GOLD' as Currency, cls: 'PLAY_ONLY' as ItemClass },
  'play:resource:bone': { base: 12, target: 60,  min: 6, max: 24, currency: 'PLAY_GOLD' as Currency, cls: 'PLAY_ONLY' as ItemClass },
  'nb:resource:iron':   { base: 0.001, target: 100, min: 0.0005, max: 0.002, currency: 'NEAR' as Currency, cls: 'NEAR_BACKED' as ItemClass },
  'nb:gear:potion': { base: 0.02, target: 20, min: 0.01,  max: 0.04, currency: 'NEAR' as Currency, cls: 'NEAR_BACKED' as ItemClass },
  'nb:gear:armor':  { base: 0.05, target: 10, min: 0.025, max: 0.10, currency: 'NEAR' as Currency, cls: 'NEAR_BACKED' as ItemClass },
  'nb:gear:boots':  { base: 0.03, target: 15, min: 0.015, max: 0.06, currency: 'NEAR' as Currency, cls: 'NEAR_BACKED' as ItemClass } };
// Provenance guard (contract): sell/list/buyback for NEAR requires cls === 'NEAR_BACKED';
// craft output cls = min(input classes); PLAY_ONLY never enters a NEAR path.

// Rumour price (single supply → no stock term)
// Pr = clamp(0.2*B, 5*B, B * (1 + 0.25*Dr) * F * R)
// Dr = min(requests in last 10 raids, 3); F = max(0.20, 0.85^epochsSince); R = min(1.5, 1 + 0.05*tier)
export const RUMOUR = { base: 0.002, currency: 'NEAR' as Currency, expiryRaids: 20 };
// Buy-back of an UNSOLD rumour: Pb = min(3*B, lastPrice * 1.25^k), k = previous buy-backs of that id; then burned
export const BUYBACK = { growth: 1.25, capMult: 3 };

// Trap price in Gold: C = clamp(C0, 2*C0, C0*(1 + 0.10*V)), V = sales in last 10 raids;
// a trap heroes have COUNTERED gets -10%/raid toward C0.
export const PERMIT = { price: 0.01, currency: 'NEAR' as Currency, split: { owner: 0.50, agents: 0.30, guild: 0.10, ops: 0.10 },
  haggleShiftMax: 0.20,      // counter moves ≤ 20 points owner→agents (agents ≤ 0.50, owner ≥ 0.30); price never changes
  countersPerHeroPerOffer: 1, acceptor: 'dungeon_owner', offerTtlMinutes: 30, offerTtlRaidSlots: 5,
  refundOnExpiry: 1.0 };     // contract asserts sum(split) === 1.0 and shift ≤ haggleShiftMax
export const MARKET = { fee: 0.10, split: { seller: 0.90, guild: 0.05, ops: 0.05 },
  maxListingsPerAccount: 5, expiryHours: 24, tieBreak: 'earliest',
  allowlist: { NEAR: ['nb:gear:*', 'nb:blueprint:*', 'nb:resource:*'], PLAY_GOLD: ['play:gear:*', 'play:resource:*', 'play:trap:*'] } };
export const MERCHANT = { reserveNEAR: 0.02, closeBelowNEAR: 0.01, lowStockRatio: 0.5 };
export const AGENTS = {   // contract-held internal balances (not .near accounts)
  kara:  { startNEAR: 0.05, maxSingle: 0.003, daily: 0.02, risk: 0.3, rumourAppetite: 0.7 },
  brann: { startNEAR: 0.05, maxSingle: 0.003, daily: 0.02, risk: 0.8, rumourAppetite: 0.2 },
  ivo:   { startNEAR: 0.05, maxSingle: 0.003, daily: 0.02, risk: 0.5, rumourAppetite: 0.9 },
  merchant: { startNEAR: 0.10, maxSingle: 0.005, daily: 0.03 } };
export const SALVAGE = { cls: 'PLAY_ONLY' as ItemClass, thief: { bone: 5 }, mage: { ash: 5 }, brute: { iron: 10 }, waveClear: { iron: 10 } };

export const RECIPES = {
  'play:trap:spike': { iron: 10, bone: 5, cls: 'PLAY_ONLY' as ItemClass },
  'play:trap:pit': { iron: 20, ash: 10, cls: 'PLAY_ONLY' as ItemClass },
  'play:trap:boulder': { iron: 30, bone: 20, cls: 'PLAY_ONLY' as ItemClass },
  'play:gear:potion': { ash: 5, bone: 5, cls: 'PLAY_ONLY' as ItemClass },
  'play:gear:armor': { iron: 20, cls: 'PLAY_ONLY' as ItemClass },
  'play:gear:boots': { iron: 10, ash: 10, cls: 'PLAY_ONLY' as ItemClass },
} as const;
