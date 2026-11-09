import { ROOM_GATES, RULES, cellKey, isWalkable, type Cell } from "../config/gameRules";
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
  return facts.filter((fact) => !fact.burned && fact.kind === trap.trapId && fact.ix === trap.ix && fact.iz === trap.iz && (fact.epoch ?? 1) === epoch && (!fact.dungeonId || fact.dungeonId === "ashgate"));
}

export function routeCost(cell: Cell, traps: PlacedTrap[], facts: Fact[], profile: HeroProfile) {
  const trap = traps.find((entry) => entry.ix === cell.ix && entry.iz === cell.iz);
  if (!trap) return 1;
  const rule = TRAP_DEFINITIONS[trap.trapId];
  const known = relevant(facts, trap);
  const level = known.map((fact) => fact.memory ?? "warned");
  if (trap.trapId === "bait" && known.length === 0) return Math.max(0.2, 1 - profile.greed / 10);
  const baited = traps.some((entry) => entry.trapId === "bait");
  if (rule.damage > 0 && level.some((entry) => entry === "dodged") && !level.some((entry) => entry === "warned") && baited && profile.greed >= 6) return 1.4;
  if (rule.damage > 0 && level.some((entry) => entry === "warned" || entry === "dodged")) return 12 + profile.caution * profile.riskAversion;
  if (rule.damage > 0 && level.some((entry) => entry === "observed")) return 1.5;
  if (level.some((entry) => entry === "countered")) return 1;
  return 1 + profile.caution * 0.1;
}

function gateBlocks(cell: Cell, closedGateIds: readonly string[]) {
  return ROOM_GATES.some((gate) => closedGateIds.includes(gate.id) && gate.ix === cell.ix && gate.iz === cell.iz);
}

function reconstruct(parent: Map<string, string>, cells: Map<string, Cell>, from: string) {
  const path: Cell[] = [];
  let key: string | undefined = from;
  const seen = new Set<string>();
  while (key && !seen.has(key)) {
    seen.add(key);
    const cell = cells.get(key);
    if (!cell) break;
    path.push(cell);
    key = parent.get(key);
  }
  return path.reverse();
}

export function findPath(traps: PlacedTrap[], facts: Fact[], profile: HeroProfile, closedGateIds: readonly string[] = []): Cell[] {
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
  let bestKey = startKey;
  let bestH = heuristic(start, goal);

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
    if (current.ix === goal.ix && current.iz === goal.iz) return reconstruct(parent, cells, currentKey);
    open.delete(currentKey);
    const here = heuristic(current, goal);
    if (here < bestH) {
      bestH = here;
      bestKey = currentKey;
    }
    for (const [dx, dz] of NEIGHBORS) {
      const next = { ix: current.ix + dx, iz: current.iz + dz };
      if (!isWalkable(next.ix, next.iz) || gateBlocks(next, closedGateIds)) continue;
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
  return reconstruct(parent, cells, bestKey);
}

function heuristic(a: Cell, b: Cell) {
  return Math.abs(a.ix - b.ix) + Math.abs(a.iz - b.iz);
}
