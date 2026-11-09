export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { entrance: { ix: 4, iz: 11 }, vault: { ix: 4, iz: 0 } },
  skeletons: [
    { id: "guard", ix: 8, iz: 4, hp: 36, attack: 11, name: "Dungeon Guard" },
    { id: "warrior", ix: 11, iz: 11, hp: 48, attack: 14, name: "Skeleton Warrior" },
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

/**
 * Doorways a hero must lift. `ix, iz` is the one open cell in a straight wall.
 * The cells on either side are solid, so the grate lines up with that wall.
 * Locking the id removes the cell from pathfinding.
 * Shut yaw is a grate across the middle of the cell, on the same line as the wall.
 */
export const ROOM_GATES = [
  { id: "court", name: "Court gate", ix: 4, iz: 9, rot: Math.PI },
  { id: "spike", name: "Spike gate", ix: 4, iz: 6, rot: Math.PI },
  { id: "elbow", name: "Elbow gate", ix: 8, iz: 3, rot: Math.PI },
  { id: "vault", name: "Vault gate", ix: 4, iz: 1, rot: Math.PI },
  { id: "combat", name: "Combat gate", ix: 7, iz: 9, rot: Math.PI },
] as const;

/** Outer footprint of Ashgate. Rooms sit inside this square. */
export const HALL_SPAN = 11;

export type RoomGateId = (typeof ROOM_GATES)[number]["id"];

/**
 * One square hall. Interior cells are knocked out to make straight walls.
 * Each gate is the single opening in its wall. The south door is one wood
 * tile, and the foyer is only the six cells behind it.
 */
export function walkableCells(): Cell[] {
  const blocked = new Set<string>();
  const block = (x0: number, z0: number, x1: number, z1: number) => {
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) blocked.add(cellKey(ix, iz));
    }
  };
  block(2, 10, 2, 11);
  block(6, 10, 6, 11);
  block(2, 9, 3, 9);
  block(5, 9, 6, 9);
  block(8, 9, 11, 9);
  block(0, 6, 3, 6);
  block(5, 6, 8, 6);
  block(0, 3, 7, 3);
  block(9, 3, 11, 3);
  block(0, 1, 3, 1);
  block(5, 1, 11, 1);
  const cells: Cell[] = [];
  for (let ix = 0; ix <= HALL_SPAN; ix++) {
    for (let iz = 0; iz <= HALL_SPAN; iz++) {
      if (!blocked.has(cellKey(ix, iz))) cells.push({ ix, iz });
    }
  }
  return cells;
}

export function isWalkable(ix: number, iz: number) {
  return walkableCells().some((cell) => cell.ix === ix && cell.iz === iz);
}
