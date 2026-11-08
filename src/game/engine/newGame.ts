import { ECONOMY, GOODS } from "../config/economyRules";
import { shopState } from "../rules/money";
import { AGENTS, GOODS as RULE_GOODS, RAID } from "../../../rules/economy";
import { HERO_ORDER, HERO_PROFILES } from "../config/heroProfiles";
import type { HeroId } from "../content";
import type { HeroState, MerchantState, SaveData } from "./types";

function heroState(id: HeroId): HeroState {
  const profile = HERO_PROFILES[id];
  return {
    id,
    gold: profile.startingGold,
    near: profile.nearStart,
    spentTodayNear: 0,
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
  const stall = GOODS.filter((good) => good.merchant === merchant).map((good) => ({ itemId: good.id, qty: good.targetStock }));
  const canonical = Object.entries(RULE_GOODS)
    .filter(([id]) => (merchant === "mira" ? id.startsWith("play:resource:") : merchant === "tallow" ? id.startsWith("nb:gear:") : false))
    .map(([id, good]) => ({ itemId: id, qty: good.target }));
  return [...stall, ...canonical];
}

export function createSave(screen = "menu"): SaveData {
  const heroes = {} as SaveData["heroes"];
  for (const id of HERO_ORDER) heroes[id] = heroState(id);
  const merchants: SaveData["merchants"] = {
    mira: { id: "mira", name: "Mira", role: "Forgemaster", gold: 90, near: AGENTS.merchant.startNEAR, stock: stockFor("mira"), rumours: [], sales: 0, history: [], spentTodayNear: 0, spentTodayGold: 0, quoteBook: {} },
    orrin: { id: "orrin", name: "Orrin", role: "Rumour broker", gold: 70, near: AGENTS.merchant.startNEAR, stock: [], rumours: [], sales: 0, history: [], spentTodayNear: 0, spentTodayGold: 0, quoteBook: {} },
    tallow: { id: "tallow", name: "Tallow", role: "Quartermaster", gold: 80, near: AGENTS.merchant.startNEAR, stock: stockFor("tallow"), rumours: [], sales: 0, history: [], spentTodayNear: 0, spentTodayGold: 0, quoteBook: {} },
  };
  return {
    version: 3,
    day: 1,
    seed: 1105,
    gold: ECONOMY.startingPlayerGold,
    near: 0.05,
    guildGold: 0,
    opsGold: 0,
    classes: { iron: "PLAY_ONLY", ash: "PLAY_ONLY", bone: "PLAY_ONLY", nail: "PLAY_ONLY" },
    cinder: RAID.cinder.start,
    reputation: 0,
    vault: RAID.vaultStart,
    inventory: { nail: 4, iron: 12, bone: 6, ash: 6 },
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
    ownerId: "keeper-local",
    displayName: "Ashgate Keeper",
    dungeonName: "Ashgate",
    dungeonDescription: "The hall under the ash gate.",
    dungeonPublished: false,
  };
}

export function restock(save: SaveData): SaveData {
  const merchants = { ...save.merchants };
  (Object.keys(merchants) as MerchantState["id"][]).forEach((id) => {
    const merchant = merchants[id];
    const target = GOODS.filter((good) => good.merchant === id).reduce((sum, good) => sum + good.targetStock, 0);
    const held = merchant.stock.reduce((sum, line) => sum + line.qty, 0);
    const stateName = shopState(merchant.near ?? AGENTS.merchant.startNEAR, held, target, id !== "orrin");
    if (stateName === "CLOSED" || stateName === "UNDERCAPITALISED") {
      merchants[id] = merchant;
      return;
    }
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
