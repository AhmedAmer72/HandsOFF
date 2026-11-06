import { useSyncExternalStore } from "react";
import type { Quality, ScreenId, WorldMode } from "./content";
import { CELL } from "./content";
import { ECONOMY, GOODS as STALL_GOODS, goodsRule } from "./config/economyRules";
import { MARKET, RAID, RECIPES, RUMOUR, SALVAGE } from "../../rules/economy";
import { playBuybackGold, shopState, stockPrice } from "./rules/money";
import { quotePrice } from "./engine/pricing";
import { isWalkable, RULES } from "./config/gameRules";
import { TRAP_DEFINITIONS, type TrapId } from "./config/trapDefinitions";
import { HERO_PROFILES } from "./config/heroProfiles";
import { applyPurchase, chooseRaider, playerBuy } from "./engine/decisions";
import { createSave, restock } from "./engine/newGame";
import { simulateRaid } from "./engine/raid";
import type { PlacedTrap, RaidReport, SaveData } from "./engine/types";
import { clearSave, readSave, writeSave } from "./persist";

export interface VisualStep {
  type: string;
  x: number;
  z: number;
  text: string;
  trapId?: string;
}

interface Session extends SaveData {
  quality: Quality;
  worldMode: WorldMode;
  screen: ScreenId;
  selectedTrap: TrapId | null;
  selection: { label: string; file: string; pack: string; note?: string } | null;
  fps: number;
  minFps: number;
  avgFps: number;
  drawCalls: number;
  triangles: number;
  rendererInfo: string;
  lastDecision: string;
  priceNote: string;
  pageResult: "idle" | "decision" | "burned" | "escaped";
  possessArmed: boolean;
  continueReady: boolean;
}

let state: Session = { ...createSave("menu"), quality: "high", worldMode: "prototype", screen: "menu", selectedTrap: null, selection: null, fps: 0, minFps: 0, avgFps: 0, drawCalls: 0, triangles: 0, rendererInfo: "", lastDecision: "", priceNote: "", pageResult: "idle", possessArmed: false, continueReady: false };
const listeners = new Set<() => void>();
let dungeonApi: { ready: Promise<void>; playRoute: (steps: VisualStep[]) => Promise<void>; focusHero: () => void } | null = null;

function emit() {
  const saved: SaveData = {
    version: 3,
    day: state.day,
    seed: state.seed,
    gold: state.gold,
    cinder: state.cinder,
    reputation: state.reputation,
    vault: state.vault,
    inventory: state.inventory,
    traps: state.traps,
    heroes: state.heroes,
    merchants: state.merchants,
    listings: state.listings,
    ledger: state.ledger,
    raids: state.raids,
    tutorialStep: state.tutorialStep,
    upgrades: state.upgrades,
    phase: state.phase,
    pending: state.pending,
    screen: state.screen,
  };
  void writeSave(saved);
  listeners.forEach((listener) => listener());
}

export function getState() {
  return state;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGame() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export async function hydrate() {
  const saved = await readSave();
  if (!saved) return;
  state = { ...state, ...saved, upgrades: saved.upgrades ?? [], continueReady: true, screen: (saved.screen as ScreenId) || "menu" };
  listeners.forEach((listener) => listener());
}

export function bindDungeon(api: typeof dungeonApi) {
  dungeonApi = api;
}

export function enterDungeon() {
  let stored = false;
  try {
    stored = Boolean(localStorage.getItem("underrealm-save-v3"));
  } catch {
    stored = false;
  }
  if (state.continueReady || stored) {
    setScreen("dungeon");
    return;
  }
  newGame();
}

export function setScreen(screen: ScreenId) {
  state = { ...state, screen };
  emit();
}

export function setQuality(quality: Quality) {
  state = { ...state, quality };
  emit();
}

export function setWorldMode(worldMode: WorldMode) {
  state = { ...state, worldMode };
  emit();
}

export function selectTrap(trapId: TrapId | null) {
  state = { ...state, selectedTrap: state.selectedTrap === trapId ? null : trapId };
  emit();
}

export function selectInfo(selection: Session["selection"]) {
  state = { ...state, selection };
  emit();
}

export function setStats(stats: { fps: number; min: number; avg: number; triangles: number; calls: number; renderer: string }) {
  state = { ...state, fps: stats.fps, minFps: stats.min, avgFps: stats.avg, triangles: stats.triangles, drawCalls: stats.calls, rendererInfo: stats.renderer };
  listeners.forEach((listener) => listener());
}

export function newGame() {
  state = { ...createSave("dungeon"), quality: state.quality, worldMode: "prototype", screen: "dungeon", selectedTrap: null, selection: null, fps: 0, minFps: 0, avgFps: 0, drawCalls: 0, triangles: 0, rendererInfo: state.rendererInfo, lastDecision: "A new dungeon day begins.", priceNote: "", pageResult: "idle", possessArmed: false, continueReady: true };
  void clearSave();
  emit();
}

export function placeTrap(trapId: TrapId, ix: number, iz: number): { ok: boolean; reason: string; id?: string } {
  const rule = TRAP_DEFINITIONS[trapId];
  if (!rule) return { ok: false, reason: "Unknown trap." };
  if (state.phase !== "prep") return { ok: false, reason: "Traps can be placed before the raid." };
  const crafted = state.inventory[trapId] ?? 0;
  const kit = trapId === "spike" ? (state.inventory.kit ?? 0) : 0;
  const cost = crafted > 0 || kit > 0 ? 0 : rule.cost;
  if (state.gold < cost) return { ok: false, reason: `Need ${cost} Gold for ${rule.name}.` };
  if (state.traps.some((trap) => trap.ix === ix && trap.iz === iz)) return { ok: false, reason: "That tile already holds a trap." };
  if (ix === RULES.grid.vault.ix && iz === RULES.grid.vault.iz) return { ok: false, reason: "The vault tile stays clear." };
  if (ix === RULES.grid.entrance.ix && iz === RULES.grid.entrance.iz) return { ok: false, reason: "The entrance tile stays clear." };
  if (!isWalkable(ix, iz)) return { ok: false, reason: "That tile is not part of the hall." };
  const trap: PlacedTrap = { id: `${trapId}-${ix}-${iz}-${state.day}`, trapId, ix, iz, epoch: 1 };
  const tutorialStep = state.tutorialStep === 0 && trapId === "spike" && ix === RULES.spikeTutorialCell.ix && iz === RULES.spikeTutorialCell.iz ? 1 : state.tutorialStep;
  state = {
    ...state,
    gold: state.gold - cost,
    inventory: crafted > 0 ? { ...state.inventory, [trapId]: crafted - 1 } : kit > 0 ? { ...state.inventory, kit: kit - 1 } : state.inventory,
    traps: [...state.traps, trap],
    tutorialStep,
    ledger: [{ id: trap.id, day: state.day, text: `Placed ${rule.name} at ${ix}, ${iz} for ${cost} Gold.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: rule.note, id: trap.id };
}

export function relayTrap(id: string) {
  const trap = state.traps.find((entry) => entry.id === id);
  if (!trap || state.phase !== "prep") return { ok: false, reason: "Re-lay before the gate opens." };
  if (state.gold < RAID.relay) return { ok: false, reason: `Re-lay costs ${RAID.relay} Gold.` };
  const options = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const next = options
    .map(([dx, dz]) => ({ ix: trap.ix + dx, iz: trap.iz + dz }))
    .find((cell) => isWalkable(cell.ix, cell.iz) && !(cell.ix === RULES.grid.vault.ix && cell.iz === RULES.grid.vault.iz) && !(cell.ix === RULES.grid.entrance.ix && cell.iz === RULES.grid.entrance.iz) && !state.traps.some((other) => other.ix === cell.ix && other.iz === cell.iz));
  if (!next) return { ok: false, reason: "No open tile beside that trap." };
  const moved: PlacedTrap = { ...trap, ix: next.ix, iz: next.iz, epoch: (trap.epoch ?? 1) + 1 };
  state = {
    ...state,
    gold: state.gold - RAID.relay,
    traps: state.traps.map((entry) => entry.id === id ? moved : entry),
    ledger: [{ id: `relay-${id}-${moved.epoch}`, day: state.day, text: `Re-laid ${trap.trapId} to ${next.ix}, ${next.iz} for ${RAID.relay} Gold. Layout epoch ${moved.epoch}. Older rumours are stale.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "The trap moved." };
}

export function relayTrapTo(id: string, ix: number, iz: number) {
  const trap = state.traps.find((entry) => entry.id === id);
  if (!trap || state.phase !== "prep") return { ok: false, reason: "Re-lay before the gate opens." };
  if (Math.abs(trap.ix - ix) + Math.abs(trap.iz - iz) !== 1) return { ok: false, reason: "Re-lay onto a neighboring tile." };
  if (state.gold < RAID.relay) return { ok: false, reason: `Re-lay costs ${RAID.relay} Gold.` };
  if (!isWalkable(ix, iz)) return { ok: false, reason: "That tile is not open." };
  if ((ix === RULES.grid.vault.ix && iz === RULES.grid.vault.iz) || (ix === RULES.grid.entrance.ix && iz === RULES.grid.entrance.iz)) {
    return { ok: false, reason: "That tile stays clear." };
  }
  if (state.traps.some((other) => other.ix === ix && other.iz === iz)) return { ok: false, reason: "A trap already sits there." };
  const moved: PlacedTrap = { ...trap, ix, iz, epoch: (trap.epoch ?? 1) + 1 };
  state = {
    ...state,
    gold: state.gold - RAID.relay,
    traps: state.traps.map((entry) => entry.id === id ? moved : entry),
    ledger: [{ id: `relay-${id}-${moved.epoch}`, day: state.day, text: `Re-laid ${trap.trapId} to ${ix}, ${iz} for ${RAID.relay} Gold. Layout epoch ${moved.epoch}. Older rumours are stale.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "The trap moved." };
}

export function armTrap(trapId: TrapId) {
  state = { ...state, selectedTrap: trapId };
  emit();
}

export function clearTrap() {
  if (!state.selectedTrap) return;
  state = { ...state, selectedTrap: null };
  emit();
}

export function armPossess() {
  if (state.day < RAID.possess.fromWave) return { ok: false, reason: "Possess opens on raid 2." };
  if (state.possessArmed) return { ok: true, reason: "The hall guard is already marked." };
  if (state.gold < RAID.possess.cost) return { ok: false, reason: `Possess costs ${RAID.possess.cost} Gold.` };
  state = {
    ...state,
    possessArmed: true,
    gold: state.gold - RAID.possess.cost,
    ledger: [{ id: `possess-${state.day}`, day: state.day, text: `Paid ${RAID.possess.cost} Gold to pull the hall guard off the tile for ${RAID.possess.durationSec}s.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "The guard will be off the tile." };
}

export function startRaid() {
  if (state.phase !== "prep" && state.phase !== "report") return;
  let save: SaveData = state;
  const decision = chooseRaider(save);
  if (decision.purchase) save = applyPurchase(save, decision.heroId, decision.purchase);
  const possessGuard = state.possessArmed && save.day >= RAID.possess.fromWave;
  const simulated = simulateRaid({
    day: save.day,
    seed: save.seed + save.day,
    hero: save.heroes[decision.heroId],
    traps: save.traps,
    tutorial: save.tutorialStep < 2,
    upgrades: save.upgrades,
    possessGuard,
  });
  const report: RaidReport = { ...simulated.report, decision };
  const heroes = { ...save.heroes, [decision.heroId]: simulated.hero };
  const speed = HERO_PROFILES[decision.heroId].moveSpeed;
  const steps = simulated.report.events.filter((event) => event.type === "move" || event.type === "enter").length;
  const bleed = Math.floor(steps * (4 / speed) * RAID.bleedPerHeroPerSec);
  const kills = simulated.report.events.filter((event) => event.type === "death").length;
  const salvageKind = decision.heroId === "brann" ? "iron" : decision.heroId === "ivo" ? "ash" : "bone";
  const salvageQty = decision.heroId === "brann" ? SALVAGE.brute.iron : decision.heroId === "ivo" ? SALVAGE.mage.ash : SALVAGE.thief.bone;
  const inventory = { ...save.inventory };
  if (!simulated.report.survived) inventory[salvageKind] = (inventory[salvageKind] ?? 0) + salvageQty;
  const gold = Math.max(0, save.gold - (simulated.report.survived ? simulated.report.goldLost : 0));
  const reputation = save.reputation + (simulated.report.survived ? RULES.reputationPerSurvival : RULES.reputationPerDeath);
  const tutorialStep = save.tutorialStep < 2 ? 2 : save.tutorialStep >= 4 ? Math.max(save.tutorialStep, 5) : save.tutorialStep;
  state = {
    ...state,
    ...save,
    heroes,
    inventory,
    gold,
    vault: Math.max(0, save.vault - bleed),
    cinder: Math.min(RAID.cinder.cap, save.cinder + kills * RAID.cinder.perKill),
    reputation,
    phase: simulated.report.survived ? "report" : "raid",
    pending: report,
    raids: [report, ...save.raids].slice(0, 20),
    tutorialStep,
    lastDecision: decision.reason,
    ledger: [{ id: `bleed-${report.id}`, day: save.day, text: `The vault bled ${bleed} Gold while ${decision.heroId} was inside.` }, { id: report.id, day: save.day, text: decision.reason }, ...save.ledger],
    screen: "dungeon",
    possessArmed: false,
  };
  emit();
}

export function markDiary() {
  if (!state.pending || state.pending.survived) return;
  state = { ...state, phase: "diary", pageResult: "decision" };
  emit();
}

export function resolvePage(choice: "burn" | "escape") {
  const report = state.pending;
  if (!report || state.phase !== "diary") return { ok: false, reason: "No diary page is waiting." };
  if (choice === "burn") {
    if (state.cinder < RAID.cinder.burnCost) return { ok: false, reason: `Burning costs ${RAID.cinder.burnCost} Cinder.` };
    const burned = report.facts.map((fact) => ({ ...fact, burned: true }));
    state = {
      ...state,
      cinder: state.cinder - RAID.cinder.burnCost,
      phase: "report",
      pageResult: "burned",
      pending: { ...report, facts: burned },
      tutorialStep: Math.max(state.tutorialStep, 3),
      ledger: [{ id: `burn-${report.id}`, day: state.day, text: `Burned ${report.heroId}'s page for ${RAID.cinder.burnCost} Cinder. The facts stay out of the market.` }, ...state.ledger],
    };
    emit();
    return { ok: true, reason: "The page is ash." };
  }
  const orrin = state.merchants.orrin;
  state = {
    ...state,
    phase: "report",
    pageResult: "escaped",
    merchants: { ...state.merchants, orrin: { ...orrin, rumours: [...report.facts.map((fact) => ({ ...fact, bornDay: state.day, memory: "unseen" as const, source: "landed" })), ...orrin.rumours] } },
    tutorialStep: Math.max(state.tutorialStep, 3),
    ledger: [{ id: `escape-${report.id}`, day: state.day, text: `The page escaped. Orrin can sell ${report.facts.length} fact(s).` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "Orrin has the page." };
}

function settleListings(save: SaveData): SaveData {
  let gold = save.gold;
  const inventory = { ...save.inventory };
  let listings = [...save.listings];
  const merchants = {
    mira: { ...save.merchants.mira, stock: save.merchants.mira.stock.map((line) => ({ ...line })) },
    orrin: { ...save.merchants.orrin, stock: save.merchants.orrin.stock.map((line) => ({ ...line })) },
    tallow: { ...save.merchants.tallow, stock: save.merchants.tallow.stock.map((line) => ({ ...line })) },
  };
  const notes: SaveData["ledger"] = [];
  const expired = listings.filter((listing) => (listing.listedDay ?? save.day) < save.day);
  for (const listing of expired) {
    inventory[listing.itemId] = (inventory[listing.itemId] ?? 0) + listing.qty;
    notes.push({ id: `expire-${listing.id}`, day: save.day, text: `${listing.itemId} came back from the stall. A day passed and no fee was taken.` });
  }
  listings = listings.filter((listing) => (listing.listedDay ?? save.day) >= save.day);
  const ranked = [...listings].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  const won = new Set<string>();
  for (const listing of ranked) {
    if (listing.cls && listing.cls !== "PLAY_ONLY") continue;
    if (won.has(listing.itemId)) {
      notes.push({ id: `lose-${listing.id}`, day: save.day, text: `A cheaper seller won the bid for ${listing.itemId}.` });
      continue;
    }
    const rule = goodsRule(listing.itemId);
    if (!rule) continue;
    const merchant = merchants[rule.merchant];
    const line = merchant.stock.find((entry) => entry.itemId === listing.itemId);
    const stock = line?.qty ?? 0;
    const quote = quotePrice(listing.itemId, Math.max(stock, 1));
    if (listing.price > quote.price || merchant.gold < listing.price || stock >= rule.maxStock) continue;
    const payout = Math.round(listing.price * (1 - MARKET.fee));
    merchant.gold -= listing.price;
    gold += payout;
    if (line) line.qty += 1;
    else merchant.stock.push({ itemId: listing.itemId, qty: 1 });
    listings = listings.filter((entry) => entry.id !== listing.id);
    won.add(listing.itemId);
    notes.push({ id: `npc-${listing.id}`, day: save.day, text: `${merchant.name} bought ${rule.name} for ${listing.price} Gold. You received ${payout} after the stall fee. Their quote was ${quote.price}.` });
  }
  return { ...save, gold, inventory, listings, merchants, ledger: [...notes, ...save.ledger] };
}

export function buyUpgrade(id: "vault-brace") {
  if (state.upgrades.includes(id) || state.gold < RULES.vaultBraceCost) return { ok: false, reason: "Cannot buy that upgrade." };
  state = {
    ...state,
    gold: state.gold - RULES.vaultBraceCost,
    upgrades: [...state.upgrades, id],
    ledger: [{ id: `up-${id}-${state.day}`, day: state.day, text: `Vault brace installed. Raiders take ${RULES.vaultBraceReduction} less Gold.` }, ...state.ledger],
    tutorialStep: Math.max(state.tutorialStep, 7),
  };
  emit();
  return { ok: true, reason: "Vault brace is active." };
}

export function nextDay() {
  if (state.phase !== "report") return;
  const aged = expireRumours(state);
  const traded = settleListings(aged);
  const stepped = traded.tutorialStep >= 6 ? 7 : traded.tutorialStep === 3 ? 4 : traded.tutorialStep === 5 ? 6 : traded.tutorialStep;
  const saved = restock({ ...traded, tutorialStep: stepped });
  state = { ...state, ...saved, screen: state.screen, tutorialStep: stepped, phase: "prep", pageResult: "idle" };
  emit();
}

export function buyFromMerchant(merchantId: "mira" | "orrin" | "tallow", itemId: string) {
  const merchant = state.merchants[merchantId];
  const target = STALL_GOODS.filter((good) => good.merchant === merchantId).reduce((sum, good) => sum + good.targetStock, 0);
  const held = merchant.stock.reduce((sum, line) => sum + line.qty, 0);
  if (shopState(merchant.gold, held, target, merchantId !== "orrin") === "CLOSED") {
    return { ok: false, reason: `${merchant.name} is closed until the stall has Gold and stock again.`, save: state };
  }
  const result = playerBuy(state, merchantId, itemId);
  state = { ...state, ...result.save, screen: state.screen, priceNote: result.reason, tutorialStep: result.ok && state.tutorialStep === 4 ? 5 : state.tutorialStep };
  emit();
  return result;
}

export function listItem(itemId: string, price: number) {
  const owned = state.inventory[itemId] ?? 0;
  if (itemId === "cinder" || itemId.startsWith("rumour")) return { ok: false, reason: "That cannot be listed." };
  if (owned < 1 || price < 1) return { ok: false, reason: "Nothing to list at that price." };
  if (state.listings.length >= MARKET.maxListingsPerAccount) return { ok: false, reason: "Five listings is the cap." };
  state = {
    ...state,
    inventory: { ...state.inventory, [itemId]: owned - 1 },
    listings: [{ id: `list-${state.day}-${itemId}-${price}`, itemId, seller: "player", price, qty: 1, listedDay: state.day, currency: "PLAY_GOLD", cls: "PLAY_ONLY" }, ...state.listings],
    ledger: [{ id: `list-${Date.now()}`, day: state.day, text: `Listed ${itemId} for ${price} Gold. Play gold only. The stall fee is 10% if it sells.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "Listed." };
}

function expireRumours(save: SaveData): SaveData {
  const orrin = save.merchants.orrin;
  const kept = orrin.rumours.filter((fact) => save.day - (fact.bornDay ?? save.day) < RUMOUR.expiryRaids);
  if (kept.length === orrin.rumours.length) return save;
  return {
    ...save,
    merchants: { ...save.merchants, orrin: { ...orrin, rumours: kept } },
    ledger: [{ id: `rumour-expire-${save.day}`, day: save.day, text: `${orrin.rumours.length - kept.length} unsold rumour(s) burned after ${RUMOUR.expiryRaids} raids.` }, ...save.ledger],
  };
}

export function buyBackRumour(id: string) {
  const orrin = state.merchants.orrin;
  const rumour = orrin.rumours.find((fact) => fact.id === id);
  if (!rumour || rumour.burned) return { ok: false, reason: "Already learned — buy-back impossible." };
  const last = ECONOMY.rumourBasePrice + rumour.quality * 4;
  const price = Math.round(playBuybackGold(last, rumour.buybacks ?? 0));
  if (state.gold < price) return { ok: false, reason: `Buy-back costs ${price} Gold.` };
  state = {
    ...state,
    gold: state.gold - price,
    merchants: { ...state.merchants, orrin: { ...orrin, gold: orrin.gold + price, rumours: orrin.rumours.filter((fact) => fact.id !== id) } },
    ledger: [{ id: `bb-${id}`, day: state.day, text: `Bought the unsold page back for ${price} Gold and burned it. Heroes who already saw the death still remember it.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "The page is ash." };
}

export function cancelListing(id: string) {
  const listing = state.listings.find((entry) => entry.id === id);
  if (!listing) return;
  state = {
    ...state,
    listings: state.listings.filter((entry) => entry.id !== id),
    inventory: { ...state.inventory, [listing.itemId]: (state.inventory[listing.itemId] ?? 0) + listing.qty },
  };
  emit();
}

export function buyListing(id: string) {
  cancelListing(id);
}

export function craftTrap(kind: "spike" | "pit" | "boulder") {
  const recipe = RECIPES[`play:trap:${kind}`];
  const inventory = { ...state.inventory };
  for (const [material, qty] of Object.entries(recipe)) {
    if (material === "cls") continue;
    if ((inventory[material] ?? 0) < Number(qty)) return { ok: false, reason: `Need ${qty} ${material}.` };
  }
  for (const [material, qty] of Object.entries(recipe)) {
    if (material === "cls") continue;
    inventory[material] -= Number(qty);
  }
  inventory[kind] = (inventory[kind] ?? 0) + 1;
  state = {
    ...state,
    inventory,
    ledger: [{ id: `craft-${kind}-${state.day}`, day: state.day, text: `Crafted a play-only ${kind}. Iron, ash, and bone stay play materials.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: `Crafted ${kind}.` };
}

export function supplyIron(qty: number) {
  const held = state.inventory.iron ?? 0;
  if (qty < 1 || held < qty) return { ok: false, reason: "Not enough iron to supply." };
  const mira = state.merchants.mira;
  const heldIron = mira.stock.filter((line) => line.itemId === "iron").reduce((sum, line) => sum + line.qty, 0);
  const quote = stockPrice("play:resource:iron", heldIron > 0 ? heldIron : 100, 0, qty, 12);
  const payout = Math.round(quote.price * qty);
  if (mira.gold < payout) return { ok: false, reason: "Mira cannot pay for that iron." };
  const stock = mira.stock.some((line) => line.itemId === "iron")
    ? mira.stock.map((line) => line.itemId === "iron" ? { ...line, qty: line.qty + qty } : line)
    : [...mira.stock, { itemId: "iron", qty }];
  state = {
    ...state,
    inventory: { ...state.inventory, iron: held - qty },
    gold: state.gold + payout,
    merchants: { ...state.merchants, mira: { ...mira, gold: mira.gold - payout, stock } },
    ledger: [{ id: `supply-${state.day}-${qty}`, day: state.day, text: `Supplied ${qty} iron to Mira for ${payout} Gold. ${quote.reason}` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "Mira took the iron." };
}

export function forgeKit() {
  const nails = state.inventory.nail ?? 0;
  if (nails < 4) return { ok: false, reason: "The forge needs 4 iron nails." };
  state = {
    ...state,
    inventory: { ...state.inventory, nail: nails - 4, kit: (state.inventory.kit ?? 0) + 1 },
    ledger: [{ id: `kit-${state.day}-${nails}`, day: state.day, text: "Mira's pattern: 4 nails become one spike kit. The next spike trap costs no Gold." }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "Spike kit ready." };
}

export function note(text: string) {
  state = { ...state, ledger: [{ id: `note-${Date.now()}`, day: state.day, text }, ...state.ledger] };
  emit();
}

export function toSteps(report: RaidReport): VisualStep[] {
  return report.events.map((event) => ({
    type: event.type,
    x: (event.ix ?? RULES.grid.entrance.ix) * CELL,
    z: (event.iz ?? RULES.grid.entrance.iz) * CELL,
    text: event.text,
    trapId: event.trapId,
  }));
}

export type { Session };
