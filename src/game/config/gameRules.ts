export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { width: 5, depth: 6, entrance: { ix: 2, iz: 5 }, vault: { ix: 2, iz: 0 } },
  skeleton: { ix: 2, iz: 1, hp: 48, attack: 14, name: "Skeleton Warrior" },
  tutorialHeroHp: 20,
  spikeTutorialCell: { ix: 2, iz: 2 },
  reputationPerSurvival: -4,
  reputationPerDeath: 6,
  maxListings: 8,
} as const;

export interface Cell {
  ix: number;
  iz: number;
}

export function cellKey(ix: number, iz: number) {
  return `${ix},${iz}`;
}

/** Prototype room: 5 by 4 tiles plus the two-tile southern corridor at x = 2. */
export function walkableCells(): Cell[] {
  const cells: Cell[] = [];
  for (let ix = 0; ix < 5; ix++) {
    for (let iz = 0; iz < 4; iz++) cells.push({ ix, iz });
  }
  cells.push({ ix: 2, iz: 4 }, { ix: 2, iz: 5 });
  return cells;
}

export function isWalkable(ix: number, iz: number) {
  return walkableCells().some((cell) => cell.ix === ix && cell.iz === iz);
}
