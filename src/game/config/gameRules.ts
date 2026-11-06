export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { entrance: { ix: 4, iz: 11 }, vault: { ix: 4, iz: 0 } },
  skeletons: [
    { id: "guard", ix: 4, iz: 4, hp: 36, attack: 11, name: "Dungeon Guard" },
    { id: "warrior", ix: 8, iz: 2, hp: 48, attack: 14, name: "Skeleton Warrior" },
  ],
  tutorialHeroHp: 20,
  spikeTutorialCell: { ix: 4, iz: 6 },
  reputationPerSurvival: -4,
  reputationPerDeath: 6,
  vaultBraceCost: 40,
  vaultBraceReduction: 8,
  maxListings: 8,
} as const;

export interface Cell {
  ix: number;
  iz: number;
}

export function cellKey(ix: number, iz: number) {
  return `${ix},${iz}`;
}

function fill(cells: Cell[], x0: number, z0: number, x1: number, z1: number) {
  for (let ix = x0; ix <= x1; ix++) {
    for (let iz = z0; iz <= z1; iz++) cells.push({ ix, iz });
  }
}

/** Connected Ashgate: entrance, hall, west store, east trap chamber, combat room, vault. */
export function walkableCells(): Cell[] {
  const cells: Cell[] = [];
  fill(cells, 4, 8, 4, 11);
  fill(cells, 2, 4, 6, 7);
  fill(cells, 0, 4, 1, 6);
  fill(cells, 7, 4, 9, 6);
  fill(cells, 7, 1, 9, 3);
  fill(cells, 2, 3, 6, 3);
  fill(cells, 3, 0, 5, 2);
  const unique = new Map<string, Cell>();
  for (const cell of cells) unique.set(cellKey(cell.ix, cell.iz), cell);
  return [...unique.values()];
}

export function isWalkable(ix: number, iz: number) {
  return walkableCells().some((cell) => cell.ix === ix && cell.iz === iz);
}
