import { BETA, BUYBACK, EPS, GOODS, PERMIT, PRICE_GUARD, RAID, RUMOUR, type Currency, type ItemClass } from "../../../rules/economy";

export type MemoryLevel = "unseen" | "observed" | "warned" | "dodged" | "countered";

const RANK: Record<ItemClass, number> = { PLAY_ONLY: 0, NEAR_BACKED: 1, NON_TRADEABLE: 2 };

export function canTrade(cls: ItemClass, currency: Currency) {
  if (cls === "NON_TRADEABLE") return false;
  if (currency === "NEAR") return cls === "NEAR_BACKED";
  return cls === "PLAY_ONLY" || cls === "NEAR_BACKED";
}

export function craftClass(inputs: ItemClass[]): ItemClass {
  return inputs.reduce((lowest, item) => (RANK[item] < RANK[lowest] ? item : lowest));
}

export function demandRatio(buys: number, sells: number, sample: number) {
  if (sample < PRICE_GUARD.MIN_SAMPLE) return { d: 0, confidence: "low confidence" as const };
  const raw = (buys - sells) / Math.max(buys + sells, 1);
  const d = Math.round(Math.max(-1, Math.min(1, raw)) * 100) / 100;
  return { d, confidence: "settled" as const };
}

export function stockPrice(id: keyof typeof GOODS, stock: number, buys: number, sells: number, sample: number) {
  const good = GOODS[id];
  const { d, confidence } = demandRatio(buys, sells, sample);
  const raw = good.base * Math.pow(good.target / Math.max(stock, 1), EPS) * (1 + BETA * d);
  const price = Math.min(good.max, Math.max(good.min, raw));
  return {
    price,
    currency: good.currency,
    cls: good.cls,
    confidence,
    inputs: { stock, target: good.target, buys, sells, d, base: good.base, eps: EPS, beta: BETA },
    reason: confidence === "low confidence"
      ? `${id} stays near base because fewer than ${PRICE_GUARD.MIN_SAMPLE} settled trades were counted.`
      : `${id} is ${price.toFixed(2)} ${good.currency} from stock ${stock} / target ${good.target} and demand ${d.toFixed(2)}.`,
  };
}

export function rumourPrice(requests: number, epochsSince: number, tier: number) {
  const base = RUMOUR.base;
  const demand = Math.min(requests, 3);
  const freshness = Math.max(0.2, 0.85 ** epochsSince);
  const richness = Math.min(1.5, 1 + 0.05 * tier);
  const raw = base * (1 + 0.25 * demand) * freshness * richness;
  const price = Math.min(5 * base, Math.max(0.2 * base, raw));
  return { price, currency: RUMOUR.currency, inputs: { base, demand, freshness, richness, tier, epochsSince } };
}

export function buybackPrice(lastPrice: number, previousBuybacks: number) {
  const raw = lastPrice * BUYBACK.growth ** previousBuybacks;
  return Math.min(BUYBACK.capMult * RUMOUR.base, raw);
}

export function trapGold(base: number, recentSales: number, countered: boolean) {
  const lifted = Math.min(2 * base, base * (1 + 0.1 * recentSales));
  return countered ? Math.max(base, lifted * 0.9) : lifted;
}

export function permitSplit(agentShift = 0) {
  const shift = Math.max(0, Math.min(PERMIT.haggleShiftMax, agentShift));
  const split = {
    owner: PERMIT.split.owner - shift,
    agents: PERMIT.split.agents + shift,
    guild: PERMIT.split.guild,
    ops: PERMIT.split.ops,
  };
  const sum = split.owner + split.agents + split.guild + split.ops;
  const legal = Math.abs(sum - 1) < 1e-9 && split.owner >= 0.3 && split.agents <= 0.5 && PERMIT.price === 0.01;
  return { price: PERMIT.price, currency: PERMIT.currency, split, legal };
}

export function cinderAfterKill(current: number) {
  return Math.min(RAID.cinder.cap, current + RAID.cinder.perKill);
}

export function canBurn(cinder: number) {
  return cinder >= RAID.cinder.burnCost;
}

export function killPaysForItsOwnBurn() {
  return RAID.cinder.perKill >= RAID.cinder.burnCost;
}

/** Play-gold stand-in for the shop reserve. NEAR reserves are not charged. */
export const PLAY_SHOP = { reserveGold: 40, closeBelowGold: 20, lowStockRatio: 0.5 };

export type ShopState = "OPEN" | "LOW_STOCK" | "UNDERCAPITALISED" | "CLOSED";

export function shopState(gold: number, stockQty: number, targetQty: number, sellsGoods: boolean): ShopState {
  if (gold < PLAY_SHOP.closeBelowGold) return "CLOSED";
  if (sellsGoods && stockQty < 1) return "CLOSED";
  if (gold < PLAY_SHOP.reserveGold) return "UNDERCAPITALISED";
  if (sellsGoods && targetQty > 0 && stockQty < targetQty * PLAY_SHOP.lowStockRatio) return "LOW_STOCK";
  return "OPEN";
}

export function playBuybackGold(lastGold: number, previousBuybacks: number) {
  const raw = lastGold * BUYBACK.growth ** previousBuybacks;
  return Math.min(BUYBACK.capMult * 20, raw);
}
