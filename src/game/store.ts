import { useSyncExternalStore } from "react";
import { HEROES, ITEMS, MERCHANTS, type HeroId, type Quality, type ScreenId, type WorldMode } from "./content";

export interface Listing {
  id: string;
  itemId: string;
  seller: string;
  price: number;
  qty: number;
}

export interface LedgerLine {
  id: string;
  when: number;
  text: string;
}

export interface EnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  file: string;
}

export interface PlacedTrap {
  id: string;
  trapId: string;
  x: number;
  z: number;
}

export interface GameState {
  screen: ScreenId;
  quality: Quality;
  worldMode: WorldMode;
  gold: number;
  cinder: number;
  selectedHero: HeroId;
  heroes: Record<HeroId, { hp: number; maxHp: number; memory: string[] }>;
  inventory: Record<string, number>;
  listings: Listing[];
  ledger: LedgerLine[];
  chronicle: LedgerLine[];
  enemies: EnemyState[];
  placed: PlacedTrap[];
  selectedTrap: string | null;
  raid: { wave: number; status: string };
  diary: "idle" | "decision" | "burned" | "escaped";
  rumour: string;
  spikeBonus: number;
  selection: { label: string; file: string; pack: string; note?: string } | null;
  fps: number;
  triangles: number;
}

const SAVE = "underrealm-save-v2";

function fresh(): GameState {
  const heroes = {} as GameState["heroes"];
  for (const hero of HEROES) {
    heroes[hero.id] = { hp: 100, maxHp: 100, memory: [`${hero.name} entered Ashgate with the free KayKit company.`] };
  }
  return {
    screen: "menu",
    quality: "high",
    worldMode: "prototype",
    gold: 120,
    cinder: 10,
    selectedHero: "brann",
    heroes,
    inventory: { nail: 6, hammer: 1, torch: 2, potion: 1 },
    listings: [
      { id: "list-sword", itemId: "sword", seller: "Orrin", price: 28, qty: 1 },
      { id: "list-lantern", itemId: "lantern", seller: "Mira", price: 14, qty: 2 },
      { id: "list-shield", itemId: "shield", seller: "Brann", price: 26, qty: 1 },
    ],
    ledger: [],
    chronicle: [],
    enemies: [],
    placed: [],
    selectedTrap: null,
    raid: { wave: 1, status: "Scouting" },
    diary: "idle",
    rumour: "",
    spikeBonus: 0,
    selection: null,
    fps: 0,
    triangles: 0,
  };
}

let state = load();
const listeners = new Set<() => void>();

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return { ...fresh(), ...parsed, screen: parsed.screen ?? "menu" };
  } catch {
    return fresh();
  }
}

function emit() {
  const { fps, triangles, ...saved } = state;
  void fps;
  void triangles;
  localStorage.setItem(SAVE, JSON.stringify(saved));
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

export function patch(next: Partial<GameState>) {
  state = { ...state, ...next };
  emit();
}

export function setScreen(screen: ScreenId) {
  patch({ screen });
}

export function note(text: string) {
  const line = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, when: Date.now(), text };
  state = {
    ...state,
    chronicle: [line, ...state.chronicle].slice(0, 80),
    ledger: text.startsWith("Trade") || text.startsWith("Bought") || text.startsWith("Sold") || text.startsWith("Craft")
      ? [line, ...state.ledger].slice(0, 40)
      : state.ledger,
  };
  emit();
}

export function selectHero(id: HeroId) {
  patch({ selectedHero: id });
  note(`${HEROES.find((hero) => hero.id === id)?.name} takes the lead.`);
}

export function damageHero(amount: number) {
  const id = state.selectedHero;
  const hero = state.heroes[id];
  const hp = Math.max(0, hero.hp - amount);
  const heroes = { ...state.heroes, [id]: { ...hero, hp, memory: [`Hit for ${amount}.`, ...hero.memory].slice(0, 8) } };
  state = { ...state, heroes, raid: { ...state.raid, status: hp === 0 ? "Hero down" : "Contact" } };
  emit();
  if (hp === 0) note(`${HEROES.find((item) => item.id === id)?.name} falls. The diary page is in the air.`);
}

export function revive() {
  const heroes = { ...state.heroes };
  (Object.keys(heroes) as HeroId[]).forEach((id) => {
    heroes[id] = { ...heroes[id], hp: heroes[id].maxHp };
  });
  state = { ...state, heroes, diary: "idle", selectedTrap: null, raid: { ...state.raid, status: "Scouting" } };
  emit();
}

export function healHero(amount: number) {
  const id = state.selectedHero;
  const hero = state.heroes[id];
  const heroes = { ...state.heroes, [id]: { ...hero, hp: Math.min(hero.maxHp, hero.hp + amount) } };
  state = { ...state, heroes };
  emit();
}

export function setEnemies(enemies: EnemyState[]) {
  patch({ enemies });
}

export function damageEnemy(id: string, amount: number) {
  const enemies = state.enemies.map((enemy) => (enemy.id === id ? { ...enemy, hp: Math.max(0, enemy.hp - amount) } : enemy));
  const alive = enemies.some((enemy) => enemy.hp > 0);
  state = {
    ...state,
    enemies,
    raid: { ...state.raid, status: alive ? "Contact" : "Room clear" },
    gold: alive ? state.gold : state.gold + 8,
    cinder: alive ? state.cinder : state.cinder + 2,
  };
  emit();
}

export function addPlaced(trap: PlacedTrap) {
  state = { ...state, placed: [...state.placed, trap] };
  emit();
  note(`Placed ${trap.trapId} at ${trap.x.toFixed(1)}, ${trap.z.toFixed(1)}.`);
}

export function buyListing(id: string) {
  const listing = state.listings.find((entry) => entry.id === id);
  if (!listing || listing.qty < 1 || state.gold < listing.price) return;
  const item = ITEMS.find((entry) => entry.id === listing.itemId);
  state = {
    ...state,
    gold: state.gold - listing.price,
    inventory: { ...state.inventory, [listing.itemId]: (state.inventory[listing.itemId] ?? 0) + 1 },
    listings: state.listings.map((entry) => (entry.id === id ? { ...entry, qty: entry.qty - 1 } : entry)).filter((entry) => entry.qty > 0),
  };
  emit();
  note(`Bought ${item?.name ?? listing.itemId} from ${listing.seller} for ${listing.price} gold.`);
}

export function sellItem(itemId: string, price: number) {
  const qty = state.inventory[itemId] ?? 0;
  if (qty < 1) return;
  const item = ITEMS.find((entry) => entry.id === itemId);
  state = {
    ...state,
    inventory: { ...state.inventory, [itemId]: qty - 1 },
    listings: [{ id: `player-${Date.now()}`, itemId, seller: "You", price, qty: 1 }, ...state.listings],
  };
  emit();
  note(`Trade listed ${item?.name ?? itemId} for ${price} gold.`);
}

export function buyFromMerchant(merchantId: string, itemId: string) {
  const merchant = MERCHANTS.find((entry) => entry.id === merchantId);
  const stock = merchant?.stock.find((entry) => entry.itemId === itemId);
  if (!merchant || !stock || stock.qty < 1 || state.gold < stock.price) return;
  stock.qty -= 1;
  state = {
    ...state,
    gold: state.gold - stock.price,
    inventory: { ...state.inventory, [itemId]: (state.inventory[itemId] ?? 0) + 1 },
    ledger: [{ id: `m-${Date.now()}`, when: Date.now(), text: `Bought ${itemId} from ${merchant.name} for ${stock.price} gold.` }, ...state.ledger],
  };
  emit();
  note(`Bought ${itemId} from ${merchant.name} for ${stock.price} gold.`);
}

export function craft(recipeId: string) {
  const recipe = recipeId === "spike-upgrade"
    ? { needs: [{ itemId: "nail", qty: 4 }, { itemId: "hammer", qty: 1 }], cinder: 0, bonus: 6, name: "Brood Spikes" }
    : { needs: [{ itemId: "torch", qty: 1 }], cinder: 8, bonus: 0, name: "Wick Bundle" };
  for (const need of recipe.needs) {
    if ((state.inventory[need.itemId] ?? 0) < need.qty) return;
  }
  const inventory = { ...state.inventory };
  for (const need of recipe.needs) {
    if (need.itemId !== "hammer") inventory[need.itemId] -= need.qty;
  }
  state = { ...state, inventory, cinder: state.cinder + recipe.cinder, spikeBonus: state.spikeBonus + recipe.bonus };
  emit();
  note(`Crafted ${recipe.name}.`);
}

export function resolveDiary(choice: "burn" | "release") {
  if (choice === "burn") {
    state = { ...state, diary: "burned", cinder: state.cinder + 5, rumour: "The page is ash. No rumour leaves Ashgate." };
    note("Burned the diary page. Cinder +5.");
  } else {
    state = { ...state, diary: "escaped", gold: Math.max(0, state.gold - 10), rumour: "The page escaped. The gate market repeats a worse version of the raid." };
    note("The diary page escaped. Gold -10.");
  }
  emit();
}

export function resetSave() {
  localStorage.removeItem(SAVE);
  state = fresh();
  emit();
}

export function itemName(id: string) {
  return ITEMS.find((item) => item.id === id)?.name ?? id;
}
