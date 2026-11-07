import { ECONOMY, goodsRule } from "../config/economyRules";
import { HERO_PROFILES, HERO_ORDER } from "../config/heroProfiles";
import { quotePrice } from "./pricing";
import type { DecisionTrace, Fact, HeroState, MerchantState, SaveData } from "./types";

export function knownFacts(hero: HeroState): Fact[] {
  return hero.facts.filter((fact) => !fact.burned);
}

function freshnessOf(save: SaveData, rumour: Fact) {
  const epochs = Math.max(0, save.day - (rumour.bornDay ?? save.day));
  return Math.max(0.2, 0.85 ** epochs);
}

export function evaluateHero(save: SaveData, hero: HeroState): DecisionTrace {
  const profile = HERO_PROFILES[hero.id];
  const facts = knownFacts(hero);
  const warned = facts.filter((fact) => (fact.memory ?? "warned") === "warned" || fact.memory === "dodged").length;
  const observed = facts.filter((fact) => fact.memory === "observed").length;
  const danger = 12 + warned * 6 * profile.riskAversion + observed * 2 * profile.riskAversion;
  const reward = ECONOMY.vaultReward + Math.max(0, 20 - save.reputation);
  const purchase = planPurchase(save, hero);
  const listed = purchase?.merchantId === "orrin" ? save.merchants.orrin.rumours.find((fact) => fact.id === purchase.itemId) : undefined;
  const rumourBoost = listed ? profile.rumourAppetite * 24 * freshnessOf(save, listed) : 0;
  const score = reward + rumourBoost - danger;
  const accept = hero.gold >= 0 && score >= profile.acceptThreshold;
  const counterShift = accept && profile.risk <= 0.5 && warned + observed > 0 ? 0.05 : 0;
  const nerve = profile.fleeAt > 0.4 ? "retreats early" : profile.fleeAt < 0.2 ? "stays in a fight" : "leaves a fight only when hurt";
  const buyingRumour = purchase?.merchantId === "orrin";
  const route = warned > 0 || buyingRumour
    ? `${profile.name} will walk around ${buyingRumour ? "the tile named in the rumour they are buying" : "tiles they were warned about"}.`
    : observed > 0
      ? `${profile.name} saw a trap and will inspect it, not detour.`
      : `${profile.name} has no trap memory and takes the short walk.`;
  const purse = `Purse ${hero.gold} gold, risk tolerance ${profile.risk}, rumour appetite ${profile.rumourAppetite}. ${profile.name} ${nerve}.`;
  const buy = purchase ? ` ${purchase.reason}` : " No purchase this wave.";
  const reason = accept
    ? `${profile.name} accepted the raid because the expected reward is ${reward} gold and the danger score is ${danger.toFixed(1)}. ${purse} ${route}${counterShift ? " Counter once: agent share 35%. The offer price stays the same." : ""}${buy}`
    : `${profile.name} refused the raid because danger ${danger.toFixed(1)} makes the score ${score.toFixed(1)}, below their threshold of ${profile.acceptThreshold}. ${purse}${buy}`;
  return { heroId: hero.id, accept, score, reward, danger, reason, purchase, counterShift, route };
}

export function chooseRaider(save: SaveData): DecisionTrace {
  const traces = HERO_ORDER.map((id) => evaluateHero(save, save.heroes[id]));
  const willing = traces.filter((trace) => trace.accept);
  return [...willing].sort((a, b) => b.score - a.score)[0] ?? traces[0];
}

function planPurchase(save: SaveData, hero: HeroState): DecisionTrace["purchase"] {
  const profile = HERO_PROFILES[hero.id];
  if (profile.buysRumours) {
    const orrin = save.merchants.orrin;
    const rumour = orrin.rumours.find((fact) => !fact.burned && !hero.facts.some((known) => known.id === fact.id && known.memory !== "observed"));
    if (rumour) {
      const quote = ECONOMY.rumourBasePrice + rumour.quality * 4;
      const epochs = Math.max(0, save.day - (rumour.bornDay ?? save.day));
      const freshness = Math.max(0.2, 0.85 ** epochs);
      const willing = Math.round(quote * (0.55 + profile.rumourAppetite) * (0.5 + freshness));
      const price = Math.min(profile.spendCap, quote);
      if (willing >= price && hero.gold >= price && orrin.gold >= 0) {
        return {
          merchantId: "orrin",
          itemId: rumour.id,
          price,
          reason: `${profile.name} buys the rumour "${rumour.text}" for ${price} gold. Freshness ${freshness.toFixed(2)}. Appetite ${profile.rumourAppetite}. Purse before ${hero.gold}, after ${hero.gold - price}.`,
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
        facts: [...hero.facts, { ...rumour, burned: false, memory: "warned", source: "bought rumour", dungeonId: rumour.dungeonId ?? "ashgate" }],
        history: [{ id: `buy-${save.day}-${rumour.id}`, day: save.day, text: purchase.reason }, ...hero.history],
      };
      return {
        ...save,
        heroes: { ...save.heroes, [heroId]: nextHero },
        merchants: {
          ...save.merchants,
          orrin: { ...merchant, gold: merchant.gold + purchase.price, sales: merchant.sales + 1, rumours: merchant.rumours.filter((fact) => fact.id !== rumour.id) },
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
    return { save, ok: false, reason: "Orrin sells a landed page to one hero. Buying it is the only way that hero learns it." };
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
