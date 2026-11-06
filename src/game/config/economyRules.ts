/** Local Gold and Cinder only. These are not a cryptocurrency. */
export const ECONOMY = {
  currency: "Gold",
  resource: "Cinder",
  startingPlayerGold: 140,
  startingCinder: 8,
  operatingCostPerDay: 6,
  vaultReward: 36,
  vaultSteal: 22,
  heroPayOnSurvival: 14,
  priceFloorRatio: 0.55,
  priceCeilRatio: 2.4,
  restockQty: 1,
  burnCinderCost: 3,
  diaryCountdownSeconds: 12,
  rumourBasePrice: 20,
} as const;

export interface GoodsRule {
  id: string;
  name: string;
  basePrice: number;
  targetStock: number;
  maxStock: number;
  merchant: "mira" | "orrin" | "tallow";
}

export const GOODS: GoodsRule[] = [
  { id: "nail", name: "Iron Nail", basePrice: 4, targetStock: 8, maxStock: 16, merchant: "mira" },
  { id: "hammer", name: "Smith Hammer", basePrice: 16, targetStock: 2, maxStock: 4, merchant: "mira" },
  { id: "axe", name: "Brann's Axe", basePrice: 40, targetStock: 1, maxStock: 2, merchant: "mira" },
  { id: "sword", name: "Arming Sword", basePrice: 28, targetStock: 2, maxStock: 3, merchant: "mira" },
  { id: "potion", name: "Green Phial", basePrice: 12, targetStock: 4, maxStock: 8, merchant: "tallow" },
  { id: "torch", name: "Wall Torch", basePrice: 6, targetStock: 4, maxStock: 8, merchant: "tallow" },
  { id: "lantern", name: "Lantern", basePrice: 15, targetStock: 2, maxStock: 3, merchant: "tallow" },
  { id: "staff", name: "Mage Staff", basePrice: 32, targetStock: 1, maxStock: 2, merchant: "tallow" },
];

export function goodsRule(id: string) {
  return GOODS.find((good) => good.id === id);
}
