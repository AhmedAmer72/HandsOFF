import { useSyncExternalStore } from "react";
import type { Quality, ScreenId, WorldMode } from "./content";
import { CELL } from "./content";
import { ECONOMY, goodsRule } from "./config/economyRules";
import { quotePrice } from "./engine/pricing";
import { isWalkable, RULES } from "./config/gameRules";
import { TRAP_DEFINITIONS, type TrapId } from "./config/trapDefinitions";
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
}

let state: Session = { ...createSave("menu"), quality: "high", worldMode: "prototype", screen: "menu", selectedTrap: null, selection: null, fps: 0, minFps: 0, avgFps: 0, drawCalls: 0, triangles: 0, rendererInfo: "", lastDecision: "", priceNote: "", pageResult: "idle" };
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
  state = { ...state, ...saved, upgrades: saved.upgrades ?? [], screen: (saved.screen as ScreenId) || "menu" };
  listeners.forEach((listener) => listener());
}

export function bindDungeon(api: typeof dungeonApi) {
  dungeonApi = api;
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
  state = { ...createSave("dungeon"), quality: state.quality, worldMode: "prototype", screen: "dungeon", selectedTrap: null, selection: null, fps: 0, minFps: 0, avgFps: 0, drawCalls: 0, triangles: 0, rendererInfo: state.rendererInfo, lastDecision: "A new dungeon day begins.", priceNote: "", pageResult: "idle" };
  void clearSave();
  emit();
}

export function placeTrap(trapId: TrapId, ix: number, iz: number): { ok: boolean; reason: string } {
  const rule = TRAP_DEFINITIONS[trapId];
  if (!rule) return { ok: false, reason: "Unknown trap." };
  if (state.phase !== "prep") return { ok: false, reason: "Traps can be placed before the raid." };
  const kit = trapId === "spike" ? (state.inventory.kit ?? 0) : 0;
  const cost = kit > 0 ? 0 : rule.cost;
  if (state.gold < cost) return { ok: false, reason: `Need ${cost} Gold for ${rule.name}.` };
  if (state.traps.some((trap) => trap.ix === ix && trap.iz === iz)) return { ok: false, reason: "That tile already holds a trap." };
  if (ix === RULES.grid.vault.ix && iz === RULES.grid.vault.iz) return { ok: false, reason: "The vault tile stays clear." };
  if (ix === RULES.grid.entrance.ix && iz === RULES.grid.entrance.iz) return { ok: false, reason: "The entrance tile stays clear." };
  if (!isWalkable(ix, iz)) return { ok: false, reason: "That tile is not part of the hall." };
  const trap: PlacedTrap = { id: `${trapId}-${ix}-${iz}-${state.day}`, trapId, ix, iz };
  const tutorialStep = state.tutorialStep === 0 && trapId === "spike" && ix === RULES.spikeTutorialCell.ix && iz === RULES.spikeTutorialCell.iz ? 1 : state.tutorialStep;
  state = {
    ...state,
    gold: state.gold - cost,
    inventory: kit > 0 ? { ...state.inventory, kit: kit - 1 } : state.inventory,
    traps: [...state.traps, trap],
    tutorialStep,
    ledger: [{ id: trap.id, day: state.day, text: `Placed ${rule.name} at ${ix}, ${iz} for ${cost} Gold.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: rule.note };
}

export function removeTrap(id: string) {
  const trap = state.traps.find((entry) => entry.id === id);
  if (!trap || state.phase !== "prep") return;
  const refund = TRAP_DEFINITIONS[trap.trapId].cost;
  state = {
    ...state,
    gold: state.gold + refund,
    traps: state.traps.filter((entry) => entry.id !== id),
    ledger: [{ id: `refund-${id}`, day: state.day, text: `Removed ${trap.trapId} and returned ${refund} Gold.` }, ...state.ledger],
  };
  emit();
}

export function startRaid() {
  if (state.phase !== "prep" && state.phase !== "report") return;
  let save: SaveData = state;
  const decision = chooseRaider(save);
  if (decision.purchase) save = applyPurchase(save, decision.heroId, decision.purchase);
  const simulated = simulateRaid({
    day: save.day,
    seed: save.seed + save.day,
    hero: save.heroes[decision.heroId],
    traps: save.traps,
    tutorial: save.tutorialStep < 2,
    upgrades: save.upgrades,
  });
  const report: RaidReport = { ...simulated.report, decision };
  const heroes = { ...save.heroes, [decision.heroId]: simulated.hero };
  const gold = Math.max(0, save.gold - (simulated.report.survived ? simulated.report.goldLost : 0));
  const reputation = save.reputation + (simulated.report.survived ? RULES.reputationPerSurvival : RULES.reputationPerDeath);
  const tutorialStep = save.tutorialStep < 2 ? 2 : save.tutorialStep >= 4 ? Math.max(save.tutorialStep, 5) : save.tutorialStep;
  state = {
    ...state,
    ...save,
    heroes,
    gold,
    reputation,
    phase: simulated.report.survived ? "report" : "raid",
    pending: report,
    raids: [report, ...save.raids].slice(0, 20),
    tutorialStep,
    lastDecision: decision.reason,
    ledger: [{ id: report.id, day: save.day, text: decision.reason }, ...save.ledger],
    screen: "dungeon",
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
    if (state.cinder < ECONOMY.burnCinderCost) return { ok: false, reason: `Burning costs ${ECONOMY.burnCinderCost} Cinder.` };
    const burned = report.facts.map((fact) => ({ ...fact, burned: true }));
    state = {
      ...state,
      cinder: state.cinder - ECONOMY.burnCinderCost,
      phase: "report",
      pageResult: "burned",
      pending: { ...report, facts: burned },
      tutorialStep: Math.max(state.tutorialStep, 3),
      ledger: [{ id: `burn-${report.id}`, day: state.day, text: `Burned ${report.heroId}'s page for ${ECONOMY.burnCinderCost} Cinder. The facts stay out of the market.` }, ...state.ledger],
    };
    emit();
    return { ok: true, reason: "The page is ash." };
  }
  const orrin = state.merchants.orrin;
  state = {
    ...state,
    phase: "report",
    pageResult: "escaped",
    merchants: { ...state.merchants, orrin: { ...orrin, rumours: [...report.facts, ...orrin.rumours] } },
    tutorialStep: Math.max(state.tutorialStep, 3),
    ledger: [{ id: `escape-${report.id}`, day: state.day, text: `The page escaped. Orrin can sell ${report.facts.length} fact(s).` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "Orrin has the page." };
}

function settleListings(save: SaveData): SaveData {
  let gold = save.gold;
  let listings = [...save.listings];
  const merchants = {
    mira: { ...save.merchants.mira, stock: save.merchants.mira.stock.map((line) => ({ ...line })) },
    orrin: { ...save.merchants.orrin, stock: save.merchants.orrin.stock.map((line) => ({ ...line })) },
    tallow: { ...save.merchants.tallow, stock: save.merchants.tallow.stock.map((line) => ({ ...line })) },
  };
  const notes: SaveData["ledger"] = [];
  for (const listing of [...listings]) {
    const rule = goodsRule(listing.itemId);
    if (!rule) continue;
    const merchant = merchants[rule.merchant];
    const line = merchant.stock.find((entry) => entry.itemId === listing.itemId);
    const stock = line?.qty ?? 0;
    const quote = quotePrice(listing.itemId, Math.max(stock, 1));
    if (listing.price > quote.price || merchant.gold < listing.price || stock >= rule.maxStock) continue;
    merchant.gold -= listing.price;
    gold += listing.price;
    if (line) line.qty += 1;
    else merchant.stock.push({ itemId: listing.itemId, qty: 1 });
    listings = listings.filter((entry) => entry.id !== listing.id);
    notes.push({ id: `npc-${listing.id}`, day: save.day, text: `${merchant.name} bought ${rule.name} from your stall for ${listing.price} Gold. Their quote was ${quote.price}.` });
  }
  return { ...save, gold, listings, merchants, ledger: [...notes, ...save.ledger] };
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
  const traded = settleListings(state);
  const stepped = traded.tutorialStep >= 6 ? 7 : traded.tutorialStep === 3 ? 4 : traded.tutorialStep === 5 ? 6 : traded.tutorialStep;
  const saved = restock({ ...traded, tutorialStep: stepped });
  state = { ...state, ...saved, screen: state.screen, tutorialStep: stepped, phase: "prep", pageResult: "idle" };
  emit();
}

export function buyFromMerchant(merchantId: "mira" | "orrin" | "tallow", itemId: string) {
  const result = playerBuy(state, merchantId, itemId);
  state = { ...state, ...result.save, screen: state.screen, priceNote: result.reason, tutorialStep: result.ok && state.tutorialStep === 4 ? 5 : state.tutorialStep };
  emit();
  return result;
}

export function listItem(itemId: string, price: number) {
  const owned = state.inventory[itemId] ?? 0;
  if (owned < 1 || price < 1 || state.listings.length >= 8) return;
  state = {
    ...state,
    inventory: { ...state.inventory, [itemId]: owned - 1 },
    listings: [{ id: `list-${state.day}-${itemId}-${price}`, itemId, seller: "player", price, qty: 1 }, ...state.listings],
    ledger: [{ id: `list-${Date.now()}`, day: state.day, text: `Listed ${itemId} for ${price} Gold.` }, ...state.ledger],
  };
  emit();
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
  const listing = state.listings.find((entry) => entry.id === id);
  if (!listing || state.gold < listing.price) return;
  state = {
    ...state,
    gold: state.gold - listing.price,
    listings: state.listings.filter((entry) => entry.id !== id),
    inventory: { ...state.inventory, [listing.itemId]: (state.inventory[listing.itemId] ?? 0) + listing.qty },
    ledger: [{ id: `bought-${id}`, day: state.day, text: `Bought your own listing back for ${listing.price} Gold.` }, ...state.ledger],
  };
  emit();
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
