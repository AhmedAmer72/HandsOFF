import type { HeroId } from "../content";
import type { TrapId } from "../config/trapDefinitions";
import type { Currency, ItemClass } from "../../../rules/economy";

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
  /** Dungeon this clue belongs to. Memory is hero × trap × dungeon × epoch. */
  dungeonId?: string;
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
  /** Local mock NEAR. Not a wallet. */
  near?: number;
  stock: StockLine[];
  rumours: Fact[];
  sales: number;
  history?: LedgerLine[];
  spentTodayNear?: number;
  spentTodayGold?: number;
  quoteBook?: Record<string, { ema: number; price: number; buys: number; sells: number }>;
}

export interface HeroState {
  id: HeroId;
  gold: number;
  /** Local mock NEAR purse from the v10.2 agent table. */
  near?: number;
  spentTodayNear?: number;
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
  seller: "player" | "traveler";
  price: number;
  qty: number;
  listedDay?: number;
  currency?: Currency;
  cls?: ItemClass;
  status?: "LISTED" | "SOLD" | "CANCELLED" | "EXPIRED";
}

export interface PlacedTrap {
  id: string;
  trapId: TrapId;
  ix: number;
  iz: number;
  epoch?: number;
}

export type RaidEventType = "enter" | "move" | "gate" | "trap" | "combat" | "flee" | "vault" | "death" | "survive";

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
  purchase?: { merchantId: string; itemId: string; price: number; reason: string; currency?: Currency };
  counterShift?: number;
  route?: string;
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
  /** Local mock NEAR. Not a wallet. */
  near?: number;
  guildGold?: number;
  opsGold?: number;
  travelerGold?: number;
  classes?: Record<string, ItemClass>;
  cinder: number;
  reputation: number;
  vault: number;
  inventory: Record<string, number>;
  traps: PlacedTrap[];
  /** Room gates the keeper locked shut. An empty list means every gate can be lifted. */
  closedGateIds?: string[];
  heroes: Record<HeroId, HeroState>;
  merchants: Record<MerchantState["id"], MerchantState>;
  listings: Listing[];
  ledger: LedgerLine[];
  raids: RaidReport[];
  tutorialStep: number;
  upgrades: string[];
  trapKills?: Record<string, number>;
  raidsCleared?: number;
  dungeonClosed?: boolean;
  freeReopenUsed?: boolean;
  spentTrapIds?: string[];
  chain?: number;
  phase: "prep" | "choice" | "raid" | "diary" | "report";
  pending: RaidReport | null;
  screen: string;
  /** Local keeper id for this device. Not a wallet account. */
  ownerId?: string;
  displayName?: string;
  dungeonName?: string;
  dungeonDescription?: string;
  dungeonPublished?: boolean;
}
