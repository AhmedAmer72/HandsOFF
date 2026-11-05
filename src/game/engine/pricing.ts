import { ECONOMY, goodsRule } from "../config/economyRules";

export function quotePrice(itemId: string, stock: number): { price: number; reason: string } {
  const rule = goodsRule(itemId);
  if (!rule) return { price: ECONOMY.rumourBasePrice, reason: "No goods rule; rumour base price is used." };
  const floor = Math.round(rule.basePrice * ECONOMY.priceFloorRatio);
  const ceil = Math.round(rule.basePrice * ECONOMY.priceCeilRatio);
  const raw = Math.round(rule.basePrice * (rule.targetStock / Math.max(stock, 1)));
  const price = Math.min(ceil, Math.max(floor, raw));
  const reason = stock > rule.targetStock
    ? `${rule.name} price is ${price} because stock ${stock} is above the target of ${rule.targetStock}.`
    : stock < rule.targetStock
      ? `${rule.name} price is ${price} because stock ${stock} is below the target of ${rule.targetStock}.`
      : `${rule.name} price is ${price} because stock matches the target of ${rule.targetStock}.`;
  return { price, reason };
}
