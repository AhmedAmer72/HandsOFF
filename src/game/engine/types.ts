import type { HeroId } from "../content";
import type { TrapId } from "../config/trapDefinitions";

export interface Fact {
  id: string;
  kind: TrapId | "route" | "skeleton" | "outcome";
  ix?: number;
  iz?: number;
  text: string;
  quality: number;
  burned: boolean;
  /** Layout epoch this clue belongs to. A re-lay makes an older clue stale. */
  epoch?: number;
  memory?: "unseen" | "observed" | "warned" | "dodged" | "countered";
  source?: string;
  bornDay?: number;
  buybacks?: number;
}

export interface LedgerLine {
  id: string;
  day: number;
  text: string;
}

export interface StockLine {
  itemId: string;
  qty: number;
}

export interface MerchantState {
  id: "mira" | "orrin" | "tallow";
  name: string;
  role: string;
  gold: number;
  stock: StockLine[];
  rumours: Fact[];
  sales: number;
}

export interface HeroState {
  id: HeroId;
  gold: number;
  hp: number;
  maxHp: number;
  inventory: Record<string, number>;
  equipment: string[];
  facts: Fact[];
  memory: string[];
  history: LedgerLine[];
}

export interface Listing {
  id: string;
  itemId: string;
  seller: "player";
  price: number;
  qty: number;
  listedDay?: number;
  currency?: "PLAY_GOLD";
  cls?: "PLAY_ONLY";
}

export interface PlacedTrap {
  id: string;
  trapId: TrapId;
  ix: number;
  iz: number;
  epoch?: number;
}

export type RaidEventType = "enter" | "move" | "trap" | "combat" | "flee" | "vault" | "death" | "survive";

export interface RaidEvent {
  tick: number;
  type: RaidEventType;
  text: string;
  ix?: number;
  iz?: number;
  heroHp?: number;
  trapId?: TrapId;
  damage?: number;
}

export interface DecisionTrace {
  heroId: HeroId;
  accept: boolean;
  score: number;
  reward: number;
  danger: number;
  reason: string;
  purchase?: { merchantId: string; itemId: string; price: number; reason: string };
}

export interface RaidReport {
  id: string;
  day: number;
  seed: number;
  heroId: HeroId;
  decision: DecisionTrace;
  events: RaidEvent[];
  facts: Fact[];
  survived: boolean;
  goldEarned: number;
  goldLost: number;
  trapsTriggered: string[];
}

export interface SaveData {
  version: 3;
  day: number;
  seed: number;
  gold: number;
  cinder: number;
  reputation: number;
  vault: number;
  inventory: Record<string, number>;
  traps: PlacedTrap[];
  heroes: Record<HeroId, HeroState>;
  merchants: Record<MerchantState["id"], MerchantState>;
  listings: Listing[];
  ledger: LedgerLine[];
  raids: RaidReport[];
  tutorialStep: number;
  upgrades: string[];
  phase: "prep" | "choice" | "raid" | "diary" | "report";
  pending: RaidReport | null;
  screen: string;
}
