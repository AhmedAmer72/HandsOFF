import { RULES, cellKey, isWalkable, type Cell } from "../config/gameRules";
import type { HeroProfile } from "../config/heroProfiles";
import { TRAP_DEFINITIONS, type TrapId } from "../config/trapDefinitions";
import type { Fact } from "./types";

export interface PlacedTrap {
  id: string;
  trapId: TrapId;
  ix: number;
  iz: number;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function knows(facts: Fact[], trap: PlacedTrap) {
  return facts.some((fact) => fact.kind === trap.trapId && fact.ix === trap.ix && fact.iz === trap.iz);
}

export function routeCost(cell: Cell, traps: PlacedTrap[], facts: Fact[], profile: HeroProfile) {
  const trap = traps.find((entry) => entry.ix === cell.ix && entry.iz === cell.iz);
  if (!trap) return 1;
  const rule = TRAP_DEFINITIONS[trap.trapId];
  if (trap.trapId === "bait" && !knows(facts, trap)) return Math.max(0.2, 1 - profile.greed / 10);
  if (knows(facts, trap) && rule.damage > 0) return 12 + profile.caution * profile.riskAversion;
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
