import { ECONOMY, goodsRule } from "../config/economyRules";
import { HERO_PROFILES, HERO_ORDER } from "../config/heroProfiles";
import { quotePrice } from "./pricing";
import type { DecisionTrace, Fact, HeroState, MerchantState, SaveData } from "./types";

export function knownFacts(hero: HeroState): Fact[] {
  return hero.facts.filter((fact) => !fact.burned);
}

export function evaluateHero(save: SaveData, hero: HeroState): DecisionTrace {
  const profile = HERO_PROFILES[hero.id];
  const facts = knownFacts(hero);
  const danger = 12 + facts.filter((fact) => fact.kind !== "outcome").length * 4 * profile.riskAversion;
  const reward = ECONOMY.vaultReward + Math.max(0, 20 - save.reputation);
  const score = reward - danger;
  const purchase = planPurchase(save, hero);
  const accept = hero.gold >= 0 && score >= profile.acceptThreshold;
  const reason = accept
    ? `${profile.name} accepted the raid because the expected reward is ${reward} gold and the danger score is ${danger.toFixed(1)} under their risk tolerance (${profile.riskAversion}).`
    : `${profile.name} refused the raid because danger ${danger.toFixed(1)} makes the score ${score.toFixed(1)}, below their threshold of ${profile.acceptThreshold}.`;
  return { heroId: hero.id, accept, score, reward, danger, reason, purchase };
}

export function chooseRaider(save: SaveData): DecisionTrace {
  const traces = HERO_ORDER.map((id) => evaluateHero(save, save.heroes[id]));
  return traces.find((trace) => trace.accept) ?? traces[0];
}

function planPurchase(save: SaveData, hero: HeroState): DecisionTrace["purchase"] {
  const profile = HERO_PROFILES[hero.id];
  if (profile.buysRumours) {
    const orrin = save.merchants.orrin;
    const rumour = orrin.rumours.find((fact) => !fact.burned && !hero.facts.some((known) => known.id === fact.id));
    if (rumour) {
      const price = Math.min(profile.spendCap, ECONOMY.rumourBasePrice + rumour.quality * 4);
      if (hero.gold >= price && orrin.gold >= 0) {
        return {
          merchantId: "orrin",
          itemId: rumour.id,
          price,
          reason: `${profile.name} buys the rumour "${rumour.text}" for ${price} gold because they spend on information.`,
        };
      }
    }
  }
  for (const itemId of profile.prefers) {
    if ((hero.inventory[itemId] ?? 0) > 0 || hero.equipment.includes(itemId)) continue;
    const rule = goodsRule(itemId);
    if (!rule) continue;
    const merchant = save.merchants[rule.merchant];
    const line = merchant.stock.find((entry) => entry.itemId === itemId);
    if (!line || line.qty < 1) continue;
    const quote = quotePrice(itemId, line.qty);
    if (quote.price > profile.spendCap || hero.gold < quote.price) continue;
    return {
      merchantId: merchant.id,
      itemId,
      price: quote.price,
      reason: `${profile.name} buys ${rule.name} for ${quote.price} gold. ${quote.reason}`,
    };
  }
  return undefined;
}

export function applyPurchase(save: SaveData, heroId: HeroState["id"], purchase: NonNullable<DecisionTrace["purchase"]>): SaveData {
  const hero = save.heroes[heroId];
  if (hero.gold < purchase.price) return save;
  const merchant = save.merchants[purchase.merchantId as MerchantState["id"]];
  if (purchase.merchantId === "orrin") {
    const rumour = merchant.rumours.find((fact) => fact.id === purchase.itemId);
    if (rumour) {
      if (hero.gold < purchase.price) return save;
      const nextHero: HeroState = {
        ...hero,
        gold: hero.gold - purchase.price,
        facts: [...hero.facts, { ...rumour, burned: false }],
        history: [{ id: `buy-${save.day}-${rumour.id}`, day: save.day, text: purchase.reason }, ...hero.history],
      };
      return {
        ...save,
        heroes: { ...save.heroes, [heroId]: nextHero },
        merchants: {
          ...save.merchants,
          orrin: { ...merchant, gold: merchant.gold + purchase.price, sales: merchant.sales + 1 },
        },
        ledger: [{ id: `led-${save.day}-${rumour.id}`, day: save.day, text: purchase.reason }, ...save.ledger],
      };
    }
  }
  const line = merchant.stock.find((entry) => entry.itemId === purchase.itemId);
  if (!line || line.qty < 1 || hero.gold < purchase.price) return save;
  const nextHero: HeroState = {
    ...hero,
    gold: hero.gold - purchase.price,
    inventory: { ...hero.inventory, [purchase.itemId]: (hero.inventory[purchase.itemId] ?? 0) + 1 },
    equipment: hero.equipment.includes(purchase.itemId) ? hero.equipment : [...hero.equipment, purchase.itemId],
    history: [{ id: `buy-${save.day}-${purchase.itemId}`, day: save.day, text: purchase.reason }, ...hero.history],
  };
  return {
    ...save,
    heroes: { ...save.heroes, [heroId]: nextHero },
    merchants: {
      ...save.merchants,
      [merchant.id]: {
        ...merchant,
        gold: merchant.gold + purchase.price,
        sales: merchant.sales + 1,
        stock: merchant.stock.map((entry) => entry.itemId === purchase.itemId ? { ...entry, qty: entry.qty - 1 } : entry),
      },
    },
    ledger: [{ id: `led-${save.day}-${purchase.itemId}`, day: save.day, text: purchase.reason }, ...save.ledger],
  };
}

export function playerBuy(save: SaveData, merchantId: MerchantState["id"], itemId: string): { save: SaveData; ok: boolean; reason: string } {
  const merchant = save.merchants[merchantId];
  if (merchantId === "orrin") {
    const rumour = merchant.rumours.find((fact) => fact.id === itemId);
    if (!rumour) return { save, ok: false, reason: "That rumour is not in Orrin's book." };
    const price = ECONOMY.rumourBasePrice + rumour.quality * 4;
    if (save.gold < price) return { save, ok: false, reason: "Not enough Gold." };
    return {
      ok: true,
      reason: `Bought the rumour for ${price} Gold.`,
      save: {
        ...save,
        gold: save.gold - price,
        merchants: { ...save.merchants, orrin: { ...merchant, gold: merchant.gold + price, rumours: merchant.rumours.filter((fact) => fact.id !== itemId), sales: merchant.sales + 1 } },
        ledger: [{ id: `player-rumour-${itemId}`, day: save.day, text: `You bought a rumour from Orrin for ${price} Gold.` }, ...save.ledger],
      },
    };
  }
  const line = merchant.stock.find((entry) => entry.itemId === itemId);
  if (!line || line.qty < 1) return { save, ok: false, reason: "That item is out of stock." };
  const quote = quotePrice(itemId, line.qty);
  if (save.gold < quote.price) return { save, ok: false, reason: "Not enough Gold." };
  return {
    ok: true,
    reason: quote.reason,
    save: {
      ...save,
      gold: save.gold - quote.price,
      inventory: { ...save.inventory, [itemId]: (save.inventory[itemId] ?? 0) + 1 },
      merchants: {
        ...save.merchants,
        [merchantId]: {
          ...merchant,
          gold: merchant.gold + quote.price,
          sales: merchant.sales + 1,
          stock: merchant.stock.map((entry) => entry.itemId === itemId ? { ...entry, qty: entry.qty - 1 } : entry),
        },
      },
      ledger: [{ id: `player-${save.day}-${itemId}-${line.qty}`, day: save.day, text: `You bought ${itemId} for ${quote.price} Gold. ${quote.reason}` }, ...save.ledger],
    },
  };
}
