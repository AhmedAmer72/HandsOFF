import { GOODS } from "../../../rules/economy";
import { ECONOMY, goodsRule } from "../config/economyRules";
import { demandRatio, stockCurve, stockPrice } from "../rules/money";

export function quotePrice(itemId: string, stock: number, buys = 0, sells = 0, sample = 0): { price: number; reason: string } {
  if (itemId in GOODS) {
    const quote = stockPrice(itemId as keyof typeof GOODS, stock, buys, sells, sample);
    return { price: quote.price, reason: quote.reason };
  }
  const rule = goodsRule(itemId);
  if (!rule) return { price: 0, reason: "That item has no price rule." };
  const { d, confidence } = demandRatio(buys, sells, sample);
  const min = rule.basePrice * ECONOMY.priceFloorRatio;
  const max = rule.basePrice * ECONOMY.priceCeilRatio;
  const price = Math.round(stockCurve(rule.basePrice, rule.targetStock, min, max, stock, d));
  const demand = confidence === "low confidence" ? "Demand is low confidence, so it does not move the price." : `Demand is ${d.toFixed(2)}.`;
  const versus = stock > rule.targetStock ? "above the target" : stock < rule.targetStock ? "below the target" : "at the target";
  return {
    price,
    reason: `${rule.name} is ${price} because stock ${stock} is ${versus} of ${rule.targetStock}. Base ${rule.basePrice}, demand ${d.toFixed(2)}, floor ${min.toFixed(2)}, ceiling ${max.toFixed(2)}. ${demand}`,
  };
}
