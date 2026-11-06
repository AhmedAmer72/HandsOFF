import { BETA, EPS } from "../../../rules/economy";
import { ECONOMY, goodsRule } from "../config/economyRules";
import { demandRatio } from "../rules/money";

export function quotePrice(itemId: string, stock: number, buys = 0, sells = 0, sample = 0): { price: number; reason: string } {
  const rule = goodsRule(itemId);
  if (!rule) return { price: ECONOMY.rumourBasePrice, reason: "No goods rule; rumour base price is used." };
  const { d, confidence } = demandRatio(buys, sells, sample);
  const raw = rule.basePrice * Math.pow(rule.targetStock / Math.max(stock, 1), EPS) * (1 + BETA * d);
  const floor = Math.round(rule.basePrice * ECONOMY.priceFloorRatio);
  const ceil = Math.round(rule.basePrice * ECONOMY.priceCeilRatio);
  const price = Math.min(ceil, Math.max(floor, Math.round(raw)));
  const demand = confidence === "low confidence" ? "Demand is low confidence, so it does not move the price." : `Demand is ${d.toFixed(2)}.`;
  const reason = stock > rule.targetStock
    ? `${rule.name} price is ${price} because stock ${stock} is above the target of ${rule.targetStock}. ${demand}`
    : stock < rule.targetStock
      ? `${rule.name} price is ${price} because stock ${stock} is below the target of ${rule.targetStock}. ${demand}`
      : `${rule.name} price is ${price} because stock matches the target of ${rule.targetStock}. ${demand}`;
  return { price, reason };
}
