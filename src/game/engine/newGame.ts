import { ECONOMY, GOODS } from "../config/economyRules";
import { HERO_ORDER, HERO_PROFILES } from "../config/heroProfiles";
import type { HeroId } from "../content";
import type { HeroState, MerchantState, SaveData } from "./types";

function heroState(id: HeroId): HeroState {
  const profile = HERO_PROFILES[id];
  return {
    id,
    gold: profile.startingGold,
    hp: profile.maxHp,
    maxHp: profile.maxHp,
    inventory: {},
    equipment: [],
    facts: [],
    memory: [`${profile.name} has not raided Ashgate yet.`],
    history: [],
  };
}

function stockFor(merchant: MerchantState["id"]) {
  return GOODS.filter((good) => good.merchant === merchant).map((good) => ({ itemId: good.id, qty: good.targetStock }));
}

export function createSave(screen = "menu"): SaveData {
  const heroes = {} as SaveData["heroes"];
  for (const id of HERO_ORDER) heroes[id] = heroState(id);
  const merchants: SaveData["merchants"] = {
    mira: { id: "mira", name: "Mira", role: "Forgemaster", gold: 90, stock: stockFor("mira"), rumours: [], sales: 0 },
    orrin: { id: "orrin", name: "Orrin", role: "Rumour broker", gold: 70, stock: [], rumours: [], sales: 0 },
    tallow: { id: "tallow", name: "Tallow", role: "Quartermaster", gold: 80, stock: stockFor("tallow"), rumours: [], sales: 0 },
  };
  return {
    version: 3,
    day: 1,
    seed: 1105,
    gold: ECONOMY.startingPlayerGold,
    cinder: ECONOMY.startingCinder,
    reputation: 0,
    vault: 100,
    inventory: { nail: 4 },
    traps: [],
    heroes,
    merchants,
    listings: [],
    ledger: [{ id: "open", day: 1, text: "Ashgate opens. Gold and Cinder are local counts on this machine." }],
    raids: [],
    tutorialStep: 0,
    upgrades: [],
    phase: "prep",
    pending: null,
    screen,
  };
}

export function restock(save: SaveData): SaveData {
  const merchants = { ...save.merchants };
  (Object.keys(merchants) as MerchantState["id"][]).forEach((id) => {
    const merchant = merchants[id];
    const nextStock = merchant.stock.map((line) => {
      const rule = GOODS.find((good) => good.id === line.itemId);
      if (!rule) return line;
      const qty = Math.min(rule.maxStock, line.qty + (line.qty < rule.targetStock ? ECONOMY.restockQty : 0));
      return { ...line, qty };
    });
    const expense = Math.min(merchant.gold, 4);
    merchants[id] = { ...merchant, stock: nextStock, gold: merchant.gold - expense };
  });
  return {
    ...save,
    day: save.day + 1,
    gold: Math.max(0, save.gold - ECONOMY.operatingCostPerDay),
    merchants,
    phase: "prep",
    pending: null,
    ledger: [{ id: `upkeep-${save.day + 1}`, day: save.day + 1, text: `Upkeep costs ${ECONOMY.operatingCostPerDay} Gold. Merchants restock toward their targets.` }, ...save.ledger],
  };
}
