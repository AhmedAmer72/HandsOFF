import { BETA, BUYBACK, EPS, GOODS, MARKET, MERCHANT, PERMIT, PRICE_GUARD, RAID, RUMOUR, type Currency, type ItemClass } from "../../../rules/economy";

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

/** The only stock curve. P = clamp(min, max, base * (target / max(S,1))^EPS * (1 + BETA*D)). */
export function stockCurve(base: number, target: number, min: number, max: number, stock: number, d: number) {
  const raw = base * Math.pow(target / Math.max(stock, 1), EPS) * (1 + BETA * d);
  return Math.min(max, Math.max(min, raw));
}

export function emaDemand(previous: number, raw: number) {
  return PRICE_GUARD.EMA_ALPHA * raw + (1 - PRICE_GUARD.EMA_ALPHA) * previous;
}

export function guardPrice(previous: number, next: number, maxFrac = PRICE_GUARD.MAX_CHANGE_PER_RAID) {
  if (!(previous > 0)) return next;
  return Math.min(previous * (1 + maxFrac), Math.max(previous * (1 - maxFrac), next));
}

export function feeSplit(amount: number) {
  const seller = amount * MARKET.split.seller;
  const guild = amount * MARKET.split.guild;
  const ops = amount * MARKET.split.ops;
  return { seller, guild, ops, fee: amount * MARKET.fee };
}

export function stockPrice(id: keyof typeof GOODS, stock: number, buys: number, sells: number, sample: number) {
  const good = GOODS[id];
  const { d, confidence } = demandRatio(buys, sells, sample);
  const price = stockCurve(good.base, good.target, good.min, good.max, stock, d);
  return {
    price,
    currency: good.currency,
    cls: good.cls,
    confidence,
    inputs: { stock, target: good.target, buys, sells, d, base: good.base, eps: EPS, beta: BETA, min: good.min, max: good.max },
    reason: confidence === "low confidence"
      ? `${id} stays near base because fewer than ${PRICE_GUARD.MIN_SAMPLE} settled trades were counted. Stock ${stock}, target ${good.target}, base ${good.base}.`
      : `${id} is ${price.toFixed(4)} ${good.currency} from stock ${stock} / target ${good.target}, demand ${d.toFixed(2)}, base ${good.base}, eps ${EPS}, beta ${BETA}.`,
  };
}

export function liveQuote(id: keyof typeof GOODS, stock: number, buys: number, sells: number, sample: number, previous?: { ema: number; price: number }) {
  const raw = stockPrice(id, stock, buys, sells, sample);
  const ema = previous ? emaDemand(previous.ema, raw.inputs.d) : raw.inputs.d;
  const curved = raw.confidence === "low confidence"
    ? raw.price
    : stockCurve(raw.inputs.base, raw.inputs.target, raw.inputs.min, raw.inputs.max, stock, ema);
  const guarded = previous ? guardPrice(previous.price, curved, PRICE_GUARD.MAX_CHANGE_PER_RAID) : curved;
  return {
    ...raw,
    price: guarded,
    inputs: { ...raw.inputs, ema, previous: previous?.price ?? guarded, unguarded: curved },
    reason: `${raw.reason} Smoothed demand ${ema.toFixed(2)}. Guarded move from ${previous?.price?.toFixed(4) ?? "a fresh quote"} stays inside ${PRICE_GUARD.MAX_CHANGE_PER_RAID * 100}% per raid and ${PRICE_GUARD.MAX_CHANGE_PER_DAY * 100}% per day.`,
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

export type ShopState = "OPEN" | "LOW_STOCK" | "UNDERCAPITALISED" | "CLOSED";

/** Cash is the merchant's mock NEAR balance. Thresholds are MERCHANT.reserveNEAR and closeBelowNEAR. */
export function shopState(near: number, stockQty: number, targetQty: number, sellsGoods: boolean): ShopState {
  if (near < MERCHANT.closeBelowNEAR) return "CLOSED";
  if (sellsGoods && stockQty < 1) return "CLOSED";
  if (near < MERCHANT.reserveNEAR) return "UNDERCAPITALISED";
  if (sellsGoods && targetQty > 0 && stockQty < targetQty * MERCHANT.lowStockRatio) return "LOW_STOCK";
  return "OPEN";
}

export function canReopen(near: number, stockQty: number, sellsGoods: boolean) {
  return near >= MERCHANT.reserveNEAR && (!sellsGoods || stockQty >= 1);
}

export function playBuybackGold(lastGold: number, previousBuybacks: number) {
  const raw = lastGold * BUYBACK.growth ** previousBuybacks;
  return Math.min(BUYBACK.capMult * 20, raw);
}
