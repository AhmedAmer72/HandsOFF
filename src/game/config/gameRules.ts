export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { entrance: { ix: 4, iz: 11 }, vault: { ix: 4, iz: 0 } },
  skeletons: [
    { id: "guard", ix: 8, iz: 3, hp: 36, attack: 11, name: "Dungeon Guard" },
    { id: "warrior", ix: 14, iz: 1, hp: 48, attack: 14, name: "Skeleton Warrior" },
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

/**
 * Doorways a hero must lift. `ix, iz` is the cell they step onto as it opens.
 * Locking that id removes the cell from pathfinding.
 * The shut yaw matches a wall across the south edge of that cell.
 */
export const ROOM_GATES = [
  { id: "court", name: "Court gate", ix: 4, iz: 9, rot: Math.PI },
  { id: "spike", name: "Spike gate", ix: 4, iz: 6, rot: Math.PI },
  { id: "elbow", name: "Elbow gate", ix: 8, iz: 3, rot: Math.PI },
  { id: "vault", name: "Vault gate", ix: 4, iz: 1, rot: Math.PI },
  { id: "combat", name: "Combat gate", ix: 9, iz: 2, rot: Math.PI / 2 },
] as const;

export type RoomGateId = (typeof ROOM_GATES)[number]["id"];

/**
 * Wide Ashgate. Rooms and the runs between them are several tiles across.
 * The court, spike, elbow, and vault gates stay one tile, so locking one still seals that door.
 * The combat room is a side hall. The skeleton warrior stands there, off the short path.
 */
export function walkableCells(): Cell[] {
  const cells: Cell[] = [];
  fill(cells, 2, 10, 12, 11);
  fill(cells, 4, 9, 4, 9);
  fill(cells, -3, 6, 0, 9);
  fill(cells, 1, 7, 8, 8);
  fill(cells, 4, 6, 4, 6);
  fill(cells, 4, 4, 8, 5);
  fill(cells, 2, 4, 3, 4);
  fill(cells, 9, 4, 13, 4);
  fill(cells, 8, 3, 8, 3);
  fill(cells, 2, 1, 8, 2);
  fill(cells, 4, 0, 4, 0);
  fill(cells, 1, -3, 8, -1);
  fill(cells, 9, 5, 13, 5);
  fill(cells, 9, 6, 13, 8);
  fill(cells, 9, 2, 9, 2);
  fill(cells, 10, 0, 16, 2);
  const unique = new Map<string, Cell>();
  for (const cell of cells) unique.set(cellKey(cell.ix, cell.iz), cell);
  return [...unique.values()];
}

export function isWalkable(ix: number, iz: number) {
  return walkableCells().some((cell) => cell.ix === ix && cell.iz === iz);
}
