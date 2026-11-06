import { RULES, cellKey, isWalkable, type Cell } from "../config/gameRules";
import type { HeroProfile } from "../config/heroProfiles";
import { TRAP_DEFINITIONS, type TrapId } from "../config/trapDefinitions";
import type { Fact } from "./types";

export interface PlacedTrap {
  id: string;
  trapId: TrapId;
  ix: number;
  iz: number;
  epoch?: number;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function relevant(facts: Fact[], trap: PlacedTrap) {
  const epoch = trap.epoch ?? 1;
  return facts.filter((fact) => !fact.burned && fact.kind === trap.trapId && fact.ix === trap.ix && fact.iz === trap.iz && (fact.epoch ?? 1) === epoch);
}

export function routeCost(cell: Cell, traps: PlacedTrap[], facts: Fact[], profile: HeroProfile) {
  const trap = traps.find((entry) => entry.ix === cell.ix && entry.iz === cell.iz);
  if (!trap) return 1;
  const rule = TRAP_DEFINITIONS[trap.trapId];
  const known = relevant(facts, trap);
  const level = known.map((fact) => fact.memory ?? "warned");
  if (trap.trapId === "bait" && known.length === 0) return Math.max(0.2, 1 - profile.greed / 10);
  if (rule.damage > 0 && level.some((entry) => entry === "warned" || entry === "dodged")) return 12 + profile.caution * profile.riskAversion;
  if (rule.damage > 0 && level.some((entry) => entry === "observed")) return 1.5;
  if (level.some((entry) => entry === "countered")) return 1;
  return 1 + profile.caution * 0.1;
}

export function findPath(traps: PlacedTrap[], facts: Fact[], profile: HeroProfile): Cell[] {
  const start = RULES.grid.entrance;
  const goal = RULES.grid.vault;
  const open = new Map<string, number>();
  const gScore = new Map<string, number>();
  const parent = new Map<string, string>();
  const cells = new Map<string, Cell>();
  const startKey = cellKey(start.ix, start.iz);
  open.set(startKey, heuristic(start, goal));
  gScore.set(startKey, 0);
  cells.set(startKey, start);

  while (open.size) {
    let currentKey = "";
    let best = Infinity;
    for (const [key, score] of open) {
      if (score < best) {
        best = score;
        currentKey = key;
      }
    }
    const current = cells.get(currentKey)!;
    if (current.ix === goal.ix && current.iz === goal.iz) {
      const path: Cell[] = [];
      let key: string | undefined = currentKey;
      while (key) {
        path.push(cells.get(key)!);
        key = parent.get(key);
      }
      return path.reverse();
    }
    open.delete(currentKey);
    for (const [dx, dz] of NEIGHBORS) {
      const next = { ix: current.ix + dx, iz: current.iz + dz };
      if (!isWalkable(next.ix, next.iz)) continue;
      const key = cellKey(next.ix, next.iz);
      const step = routeCost(next, traps, facts, profile);
      const g = (gScore.get(currentKey) ?? 0) + step;
      if (g >= (gScore.get(key) ?? Infinity)) continue;
      parent.set(key, currentKey);
      gScore.set(key, g);
      cells.set(key, next);
      open.set(key, g + heuristic(next, goal));
    }
  }
  return [start, goal];
}

function heuristic(a: Cell, b: Cell) {
  return Math.abs(a.ix - b.ix) + Math.abs(a.iz - b.iz);
}
