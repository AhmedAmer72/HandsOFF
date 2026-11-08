import { useSyncExternalStore } from "react";
import type { Quality, ScreenId, WorldMode } from "./content";
import { CELL } from "./content";
import { RAID, RECIPES, RUMOUR, SALVAGE, GOODS as RULE_GOODS, type Currency } from "../../rules/economy";
import { buybackPrice, liveQuote, rumourPrice } from "./rules/money";
import { buySale, cancelSale, craftOutputClass, expireSales, itemClass, listForSale, merchantBuyListing, merchantNear, merchantStatus, recipeInputs, recoverMerchant } from "./engine/market";
import { isWalkable, RULES } from "./config/gameRules";
import { TRAP_DEFINITIONS, type TrapId } from "./config/trapDefinitions";
import { HERO_PROFILES } from "./config/heroProfiles";
import { applyPurchase, chooseRaider, playerBuy } from "./engine/decisions";
import { createSave, restock } from "./engine/newGame";
import { outcomeHash, simulateRaid } from "./engine/raid";
import type { PlacedTrap, RaidReport, SaveData } from "./engine/types";
import { clearSave, readSave, writeSave } from "./persist";
import { beginActivity, endActivity, getActivity, loadRegistry, readRegistry, unpublishHall, upsertHall, writeRegistry } from "./world/registry";

export interface VisualStep {
  type: string;
  x: number;
  z: number;
  text: string;
  trapId?: string;
  damage?: number;
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
  reduceMotion?: boolean;
  frameP95?: number;
  textureCount?: number;
  merchantCue?: { id: string; action: string; nonce: number };
  catalogNonce: number;
  spectating: boolean;
  spectatorDungeonId: string | null;
}

let state: Session = { ...createSave("menu"), quality: "high", worldMode: "prototype", screen: "menu", selectedTrap: null, selection: null, fps: 0, minFps: 0, avgFps: 0, drawCalls: 0, triangles: 0, rendererInfo: "", lastDecision: "", priceNote: "", pageResult: "idle", possessArmed: false, continueReady: false, catalogNonce: 0, spectating: false, spectatorDungeonId: null };
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
    trapKills: state.trapKills ?? {},
    raidsCleared: state.raidsCleared ?? 0,
    dungeonClosed: state.dungeonClosed ?? false,
    freeReopenUsed: state.freeReopenUsed ?? false,
    spentTrapIds: state.spentTrapIds ?? [],
    chain: state.chain ?? 0,
    near: state.near,
    guildGold: state.guildGold,
    opsGold: state.opsGold,
    travelerGold: state.travelerGold,
    classes: state.classes,
    phase: state.phase,
    pending: state.pending,
    screen: state.screen,
    ownerId: state.ownerId,
    displayName: state.displayName,
    dungeonName: state.dungeonName,
    dungeonDescription: state.dungeonDescription,
    dungeonPublished: state.dungeonPublished,
  };
  rememberKeeper(saved);
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
  loadRegistry();
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
  const leavingWatch = screen !== "spectator";
  state = { ...state, screen, spectating: leavingWatch ? false : state.spectating, spectatorDungeonId: leavingWatch ? null : state.spectatorDungeonId };
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

export function setStats(stats: { fps: number; min: number; avg: number; triangles: number; calls: number; renderer: string; p95?: number; textures?: number }) {
  state = { ...state, fps: stats.fps, minFps: stats.min, avgFps: stats.avg, triangles: stats.triangles, drawCalls: stats.calls, rendererInfo: stats.renderer, frameP95: stats.p95 ?? state.frameP95, textureCount: stats.textures ?? state.textureCount };
  listeners.forEach((listener) => listener());
}

export function setReduceMotion(value: boolean) {
  state = { ...state, reduceMotion: value };
  listeners.forEach((listener) => listener());
}

export function newGame() {
  if (state.dungeonPublished) writeRegistry(unpublishHall(readRegistry(), hallIdOf(state)));
  state = { ...createSave("dungeon"), ownerId: state.ownerId, displayName: state.displayName, dungeonName: state.dungeonName, dungeonDescription: state.dungeonDescription, dungeonPublished: false, quality: state.quality, worldMode: "prototype", screen: "dungeon", selectedTrap: null, selection: null, fps: 0, minFps: 0, avgFps: 0, drawCalls: 0, triangles: 0, rendererInfo: state.rendererInfo, lastDecision: "A new dungeon day begins.", priceNote: "", pageResult: "idle", possessArmed: false, continueReady: true, catalogNonce: state.catalogNonce + 1, spectating: false, spectatorDungeonId: null };
  void clearSave();
  emit();
}

export function placeTrap(trapId: TrapId, ix: number, iz: number): { ok: boolean; reason: string; id?: string } {
  if (state.spectating) return { ok: false, reason: "Spectators cannot move traps." };
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
  if (state.spectating) return { ok: false, reason: "Spectators cannot move traps." };
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
  if (state.spectating) return { ok: false, reason: "Spectators cannot move traps." };
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
  if (state.spectating) return { ok: false, reason: "Spectators cannot take the hall guard." };
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

export function triggerTrap(id: string) {
  if (state.spectating) return { ok: false, reason: "Spectators cannot trigger traps." };
  const trap = state.traps.find((entry) => entry.id === id);
  if (!trap) return { ok: false, reason: "That trap is not placed." };
  if (state.phase !== "prep" && state.phase !== "raid") return { ok: false, reason: "Trigger a trap before the page flies." };
  const spent = state.spentTrapIds ?? [];
  if (spent.includes(id)) return { ok: false, reason: "That trap is cooling down." };
  state = {
    ...state,
    spentTrapIds: [...spent, id],
    chain: (state.chain ?? 0) + 1,
    ledger: [{ id: `trig-${id}-${state.day}`, day: state.day, text: `Triggered ${trap.trapId} at ${trap.ix}, ${trap.iz}. It will not hit again this wave.` }, ...state.ledger],
  };
  emit();
  return { ok: true, reason: "The trap is spent." };
}

export function dungeonTier(raidsCleared: number) {
  if (raidsCleared >= 60) return 4;
  if (raidsCleared >= 30) return 3;
  if (raidsCleared >= 10) return 2;
  return 1;
}

export function startRaid() {
  if (state.spectating) return { ok: false, reason: "Spectators cannot open the gate." };
  if (state.dungeonClosed) return;
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
    spentTrapIds: save.spentTrapIds ?? [],
  });
  const report: RaidReport = { ...simulated.report, decision };
  const heroes = { ...save.heroes, [decision.heroId]: simulated.hero };
  const boots = save.heroes[decision.heroId].equipment.includes("boots") ? 1.3 : 1;
  const speed = HERO_PROFILES[decision.heroId].moveSpeed * boots;
  const steps = simulated.report.events.filter((event) => event.type === "move" || event.type === "enter").length;
  const bleed = Math.floor(steps * (4 / speed) * RAID.bleedPerHeroPerSec);
  const kills = simulated.report.events.filter((event) => event.type === "death").length;
  const salvageKind = decision.heroId === "brann" ? "iron" : decision.heroId === "ivo" ? "ash" : "bone";
  const salvageQty = decision.heroId === "brann" ? SALVAGE.brute.iron : decision.heroId === "ivo" ? SALVAGE.mage.ash : SALVAGE.thief.bone;
  const inventory = { ...save.inventory };
  if (!simulated.report.survived) inventory[salvageKind] = (inventory[salvageKind] ?? 0) + salvageQty;
  if (simulated.report.survived && simulated.report.events.some((event) => event.type === "vault")) {
    inventory.iron = (inventory.iron ?? 0) + SALVAGE.waveClear.iron;
  }
  const trapKills = { ...(save.trapKills ?? {}) };
  const deathTrap = simulated.report.events.find((event) => event.type === "death");
  if (deathTrap?.trapId) {
    trapKills[deathTrap.trapId] = (trapKills[deathTrap.trapId] ?? 0) + 1;
    if (trapKills[deathTrap.trapId] === 10) inventory[`blueprint:${deathTrap.trapId}`] = (inventory[`blueprint:${deathTrap.trapId}`] ?? 0) + 1;
  }
  const vaultLeft = Math.max(0, save.vault - bleed);
  const gold = Math.max(0, save.gold - (simulated.report.survived ? simulated.report.goldLost : 0));
  const reputation = save.reputation + (simulated.report.survived ? RULES.reputationPerSurvival : RULES.reputationPerDeath);
  const tutorialStep = save.tutorialStep < 2 ? 2 : save.tutorialStep >= 4 ? Math.max(save.tutorialStep, 5) : save.tutorialStep;
  state = {
    ...state,
    ...save,
    heroes,
    inventory,
    gold,
    vault: vaultLeft,
    trapKills,
    raidsCleared: (save.raidsCleared ?? 0) + 1,
    dungeonClosed: vaultLeft === 0,
    cinder: Math.min(RAID.cinder.cap, save.cinder + kills * RAID.cinder.perKill),
    reputation,
    phase: simulated.report.survived ? "report" : "raid",
    pending: report,
    raids: [report, ...save.raids].slice(0, 20),
    tutorialStep,
    lastDecision: decision.reason,
    ledger: [{ id: `walk-${report.id}`, day: save.day, text: `${decision.heroId} walked ${simulated.report.events.filter((event) => event.type === "move").map((event) => `${event.ix},${event.iz}`).join(" · ")}.` }, { id: `bleed-${report.id}`, day: save.day, text: `The vault bled ${bleed} Gold while ${decision.heroId} was inside.` }, { id: report.id, day: save.day, text: decision.reason }, ...save.ledger],
    screen: "dungeon",
    possessArmed: false,
  };
  if (state.dungeonPublished) {
    const events: { tick: number; type: string; text: string; ix?: number; iz?: number }[] = report.events.map((event) => ({
      tick: event.tick,
      type: event.type,
      text: event.text,
      ix: event.ix,
      iz: event.iz,
    }));
    writeRegistry(upsertHall(readRegistry(), projectHall(state)));
    writeRegistry(beginActivity(readRegistry(), {
      dungeonId: hallIdOf(state),
      active: true,
      heroId: report.heroId,
      events,
      outcomeHash: outcomeHash(report.events),
      finished: false,
      updatedAt: new Date().toISOString(),
    }));
    state = { ...state, catalogNonce: state.catalogNonce + 1 };
  }
  emit();
}

export function markDiary() {
  if (!state.pending || state.pending.survived) return;
  state = { ...state, phase: "diary", pageResult: "decision" };
  emit();
}

export function resolvePage(choice: "burn" | "escape") {
  if (state.spectating) return { ok: false, reason: "Spectators cannot burn or keep a page." };
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
  return merchantBuyListing(expireSales(save));
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
  if (state.spectating) return;
  if (state.phase !== "report") return;
  const settled = state.pending;
  const summary = settled ? `${settled.heroId} ${settled.survived ? "left the hall" : "fell"} on day ${settled.day}.` : "";
  const published = Boolean(state.dungeonPublished);
  const dungeonId = hallIdOf(state);
  const aged = expireRumours(state);
  const traded = settleListings(aged);
  const stepped = traded.tutorialStep >= 6 ? 7 : traded.tutorialStep === 3 ? 4 : traded.tutorialStep === 5 ? 6 : traded.tutorialStep;
  let next = { ...state, ...traded, tutorialStep: stepped };
  if (next.dungeonClosed && !next.freeReopenUsed) {
    next = { ...next, dungeonClosed: false, freeReopenUsed: true, vault: Math.max(next.vault, 200), ledger: [{ id: `reopen-${next.day}`, day: next.day, text: "The first reopen this season is free. The vault holds 200 Gold." }, ...next.ledger] };
  } else if (next.dungeonClosed) {
    if (next.gold < 40) return;
    next = { ...next, gold: next.gold - 40, dungeonClosed: false, vault: 200, ledger: [{ id: `reopen-pay-${next.day}`, day: next.day, text: "Restocked the vault for 40 Gold." }, ...next.ledger] };
  }
  const saved = restock(next);
  state = { ...state, ...saved, screen: state.screen, tutorialStep: stepped, phase: "prep", pageResult: "idle", spentTrapIds: [], chain: 0, dungeonClosed: false };
  if (published) {
    writeRegistry(upsertHall(readRegistry(), projectHall(state)));
    writeRegistry(endActivity(readRegistry(), dungeonId, summary));
    state = { ...state, catalogNonce: state.catalogNonce + 1 };
  }
  emit();
}

export function buyFromMerchant(merchantId: "mira" | "orrin" | "tallow", itemId: string) {
  const merchant = state.merchants[merchantId];
  if (merchantStatus(merchant) === "CLOSED") {
    return { ok: false, reason: `${merchant.name} is closed until the stall has Gold and stock again.`, save: state };
  }
  const result = playerBuy(state, merchantId, itemId);
  state = { ...state, ...result.save, screen: state.screen, priceNote: result.reason, tutorialStep: result.ok && state.tutorialStep === 4 ? 5 : state.tutorialStep };
  emit();
  return result;
}

export function listItem(itemId: string, price: number, currency: Currency = "PLAY_GOLD") {
  const result = listForSale(state, itemId, price, currency);
  state = { ...state, ...result.save, screen: state.screen, priceNote: result.reason };
  emit();
  return result;
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
  const epochs = Math.max(0, state.day - (rumour.bornDay ?? state.day));
  const raids = state.raidsCleared ?? 0;
  const tier = raids >= 60 ? 4 : raids >= 30 ? 3 : raids >= 10 ? 2 : 1;
  const ask = rumourPrice(orrin.sales, epochs, tier);
  const price = buybackPrice(ask.price, rumour.buybacks ?? 0);
  if ((state.near ?? 0) + 1e-9 < price) return { ok: false, reason: `Buy-back costs ${price.toFixed(4)} mock NEAR. Last ask ${ask.price.toFixed(4)}. Nothing was taken.` };
  state = {
    ...state,
    near: (state.near ?? 0) - price,
    merchants: { ...state.merchants, orrin: { ...orrin, near: merchantNear(orrin) + price, rumours: orrin.rumours.filter((fact) => fact.id !== id), history: [{ id: `bb-${id}`, day: state.day, text: `Buy-back burned the page for ${price.toFixed(4)} mock NEAR.` }, ...(orrin.history ?? [])] } },
    ledger: [{ id: `bb-${id}`, day: state.day, text: `Bought the unsold page back for ${price.toFixed(4)} mock NEAR and burned it. Inputs: base ${ask.inputs.base}, freshness ${ask.inputs.freshness.toFixed(2)}, demand ${ask.inputs.demand}, richness ${ask.inputs.richness.toFixed(2)}, previous buy-backs ${rumour.buybacks ?? 0}.` }, ...state.ledger],
    priceNote: `Buy-back ${price.toFixed(4)} = min(3×base, last ${ask.price.toFixed(4)} × 1.25^${rumour.buybacks ?? 0}).`,
    merchantCue: { id: "orrin", action: "talk", nonce: Date.now() },
  };
  emit();
  return { ok: true, reason: "The page is ash." };
}

export function cancelListing(id: string) {
  const result = cancelSale(state, id);
  state = { ...state, ...result.save, screen: state.screen };
  emit();
  return result;
}

export function buyListing(id: string, fail = false) {
  const result = buySale(state, id, fail);
  state = { ...state, ...result.save, screen: state.screen, priceNote: result.reason };
  emit();
  return result;
}

export function fundShop(id: "mira" | "orrin" | "tallow", near: number, itemId?: string, qty = 0) {
  const result = recoverMerchant(state, id, near, itemId, qty);
  state = { ...state, ...result.save, screen: state.screen, priceNote: result.reason, merchantCue: { id, action: "restock", nonce: Date.now() } };
  emit();
  return result;
}

export function craftTrap(kind: "spike" | "pit" | "boulder" | "potion" | "armor" | "boots") {
  const id = (kind === "potion" || kind === "armor" || kind === "boots" ? `play:gear:${kind}` : `play:trap:${kind}`) as keyof typeof RECIPES;
  const inputs = recipeInputs(id);
  const inventory = { ...state.inventory };
  for (const [material, qty] of inputs) {
    if ((inventory[material] ?? 0) < qty) {
      const reason = `Need ${qty} ${material}.`;
      state = { ...state, priceNote: reason };
      emit();
      return { ok: false, reason };
    }
  }
  const classes = inputs.map(([material]) => itemClass(state, material));
  const cls = craftOutputClass(classes);
  for (const [material, qty] of inputs) inventory[material] -= qty;
  const output = kind;
  inventory[output] = (inventory[output] ?? 0) + 1;
  state = {
    ...state,
    inventory,
    classes: { ...state.classes, [output]: cls },
    ledger: [{ id: `craft-${kind}-${state.day}`, day: state.day, text: `Crafted ${kind}. Output class ${cls}, the lowest input class.` }, ...state.ledger],
    priceNote: `Crafted ${kind}. Output class ${cls}, the lowest input class.`,
    merchantCue: { id: "mira", action: "work", nonce: Date.now() },
  };
  emit();
  return { ok: true, reason: `Crafted ${kind}. Class ${cls}.` };
}

export function supplyMaterial(kind: "iron" | "ash" | "bone", qty: number) {
  const held = state.inventory[kind] ?? 0;
  if (qty < 1 || held < qty) return { ok: false, reason: `Not enough ${kind} to supply.` };
  const mira = state.merchants.mira;
  if (merchantStatus(mira) === "CLOSED") return { ok: false, reason: "Mira is closed and is not buying salvage." };
  const goodId = `play:resource:${kind}` as keyof typeof RULE_GOODS;
  const line = mira.stock.find((entry) => entry.itemId === goodId);
  const stock = line?.qty ?? RULE_GOODS[goodId].target;
  const book = mira.quoteBook?.[goodId];
  const quote = liveQuote(goodId, stock, (book?.buys ?? 0) + qty, book?.sells ?? 0, (book?.buys ?? 0) + (book?.sells ?? 0) + qty, book);
  const payout = quote.price * qty;
  if (mira.gold + 1e-9 < payout) return { ok: false, reason: "Mira cannot pay for that salvage. Nothing was taken." };
  const stockNext = line
    ? mira.stock.map((entry) => entry.itemId === goodId ? { ...entry, qty: entry.qty + qty } : entry)
    : [...mira.stock, { itemId: goodId, qty }];
  state = {
    ...state,
    inventory: { ...state.inventory, [kind]: held - qty },
    gold: state.gold + payout,
    classes: { ...state.classes, [kind]: "PLAY_ONLY" },
    merchants: {
      ...state.merchants,
      mira: {
        ...mira,
        gold: mira.gold - payout,
        spentTodayGold: (mira.spentTodayGold ?? 0) + payout,
        stock: stockNext,
        quoteBook: { ...mira.quoteBook, [goodId]: { ema: quote.inputs.ema, price: quote.price, buys: (book?.buys ?? 0) + qty, sells: book?.sells ?? 0 } },
        history: [{ id: `supply-${kind}-${state.day}`, day: state.day, text: quote.reason }, ...(mira.history ?? [])],
      },
    },
    ledger: [{ id: `supply-${state.day}-${kind}-${qty}`, day: state.day, text: `Supplied ${qty} ${kind} to Mira for ${payout.toFixed(2)} Gold. ${quote.reason}` }, ...state.ledger],
    priceNote: `${quote.reason} After delivery, stock is ${stock + qty}.`,
    merchantCue: { id: "mira", action: "work", nonce: Date.now() },
  };
  emit();
  return { ok: true, reason: `Mira took the ${kind}.` };
}

export function supplyIron(qty: number) {
  return supplyMaterial("iron", qty);
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

const keeperSlots = new Map<string, SaveData>();
const KEEPER_KEY = "underrealm-keepers-v1";

export function hallIdOf(save: { ownerId?: string }) {
  return `hall:${save.ownerId || "keeper-local"}`;
}

function projectHall(save: SaveData) {
  const live = save.pending != null && (save.phase === "raid" || save.phase === "diary" || save.phase === "report");
  const previous = readRegistry().dungeons.find((entry) => entry.dungeonId === hallIdOf(save));
  return {
    dungeonId: hallIdOf(save),
    ownerId: save.ownerId || "keeper-local",
    displayName: save.displayName || "Ashgate Keeper",
    name: save.dungeonName || "Ashgate",
    description: save.dungeonDescription || "",
    published: true,
    tier: dungeonTier(save.raidsCleared ?? 0),
    state: save.dungeonClosed ? "CLOSED" as const : "OPEN" as const,
    raidCount: save.raidsCleared ?? 0,
    activeRaidCount: live ? 1 : 0,
    heroTraffic: save.raidsCleared ?? 0,
    lastActivityAt: new Date().toISOString(),
    merchantStates: {
      mira: merchantStatus(save.merchants.mira),
      orrin: merchantStatus(save.merchants.orrin),
      tallow: merchantStatus(save.merchants.tallow),
    },
    lastRaidSummary: previous?.lastRaidSummary ?? "",
  };
}

function rememberKeeper(save: SaveData) {
  const id = save.ownerId || "keeper-local";
  keeperSlots.set(id, save);
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(KEEPER_KEY);
    const bag = raw ? JSON.parse(raw) as Record<string, SaveData> : {};
    bag[id] = save;
    localStorage.setItem(KEEPER_KEY, JSON.stringify(bag));
  } catch {
    // The memory slot is enough for this session.
  }
}

function recallKeeper(id: string): SaveData | null {
  if (keeperSlots.has(id)) return keeperSlots.get(id) ?? null;
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEEPER_KEY);
    const bag = raw ? JSON.parse(raw) as Record<string, SaveData> : {};
    return bag[id] ?? null;
  } catch {
    return null;
  }
}

export function publishHall(name: string, description: string, displayName: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: "The hall needs a public name." };
  state = {
    ...state,
    dungeonPublished: true,
    dungeonName: trimmed,
    dungeonDescription: description.trim(),
    displayName: displayName.trim() || state.displayName || "Ashgate Keeper",
  };
  writeRegistry(upsertHall(readRegistry(), projectHall(state)));
  state = { ...state, catalogNonce: state.catalogNonce + 1, priceNote: `${trimmed} is on the world map.` };
  emit();
  return { ok: true, reason: state.priceNote };
}

export function unpublishCurrent() {
  writeRegistry(unpublishHall(readRegistry(), hallIdOf(state)));
  state = { ...state, dungeonPublished: false, catalogNonce: state.catalogNonce + 1, priceNote: "The hall is a draft again. Other keepers cannot see it." };
  emit();
  return { ok: true, reason: state.priceNote };
}

export function switchKeeper(ownerId: string, displayName: string) {
  const clean = ownerId.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  if (!clean) return { ok: false, reason: "The keeper needs a name." };
  rememberKeeper({
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
    trapKills: state.trapKills,
    raidsCleared: state.raidsCleared,
    dungeonClosed: state.dungeonClosed,
    freeReopenUsed: state.freeReopenUsed,
    spentTrapIds: state.spentTrapIds,
    chain: state.chain,
    near: state.near,
    guildGold: state.guildGold,
    opsGold: state.opsGold,
    travelerGold: state.travelerGold,
    classes: state.classes,
    phase: state.phase,
    pending: state.pending,
    screen: state.screen,
    ownerId: state.ownerId,
    displayName: state.displayName,
    dungeonName: state.dungeonName,
    dungeonDescription: state.dungeonDescription,
    dungeonPublished: state.dungeonPublished,
  });
  const found = recallKeeper(clean);
  const next = found ?? {
    ...createSave("map"),
    ownerId: clean,
    displayName: displayName.trim() || clean,
    dungeonName: `${(displayName.trim() || clean)}'s hall`,
    dungeonPublished: false,
  };
  state = {
    ...createSave("map"),
    ...next,
    ownerId: clean,
    displayName: next.displayName || displayName.trim() || clean,
    quality: state.quality,
    worldMode: state.worldMode,
    screen: "map",
    selectedTrap: null,
    selection: null,
    fps: 0,
    minFps: 0,
    avgFps: 0,
    drawCalls: 0,
    triangles: 0,
    rendererInfo: state.rendererInfo,
    lastDecision: "",
    priceNote: `Sitting as ${next.displayName || clean}.`,
    pageResult: "idle",
    possessArmed: false,
    continueReady: true,
    catalogNonce: state.catalogNonce + 1,
    spectating: false,
    spectatorDungeonId: null,
  };
  emit();
  return { ok: true, reason: state.priceNote };
}

export function watchRaid(dungeonId: string) {
  const activity = getActivity(readRegistry(), dungeonId);
  if (!activity?.active) return { ok: false, reason: "No live raid to watch." };
  state = { ...state, spectating: true, spectatorDungeonId: dungeonId, screen: "spectator" };
  emit();
  return { ok: true, reason: "Watching. You cannot touch the hall." };
}

export function leaveWatch() {
  state = { ...state, spectating: false, spectatorDungeonId: null, screen: "map" };
  emit();
}

export function toSteps(report: RaidReport): VisualStep[] {
  return report.events.map((event) => ({
    type: event.type,
    x: (event.ix ?? RULES.grid.entrance.ix) * CELL,
    z: (event.iz ?? RULES.grid.entrance.iz) * CELL,
    text: event.text,
    trapId: event.trapId,
    damage: event.damage,
  }));
}

export type { Session };
