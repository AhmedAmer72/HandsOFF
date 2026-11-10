export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { entrance: { ix: 4, iz: 11 }, vault: { ix: 4, iz: 0 } },
  skeletons: [
    { id: "guard", ix: 7, iz: 5, hp: 36, attack: 11, name: "Dungeon Guard" },
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
  { id: "vault", name: "Vault gate", ix: 9, iz: 3, rot: Math.PI },
] as const;

/** Outer footprint of Ashgate. Rooms sit inside this square. */
export const HALL_SPAN = 11;

export type RoomGateId = (typeof ROOM_GATES)[number]["id"];

/**
 * Rooms and the corridors between them, inside the square.
 * The south door opens into the foyer, then the court, the spike door, the
 * gallery, a short corridor, and the vault room. A west corridor bypasses the
 * spike door. The vault is the north room that holds tile 4, 0.
 */
export function walkableCells(): Cell[] {
  const open = new Set<string>();
  const add = (x0: number, z0: number, x1: number, z1: number) => {
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) open.add(cellKey(ix, iz));
    }
  };
  add(0, 9, 1, 11);
  add(2, 9, 2, 9);
  add(3, 10, 5, 11);
  add(4, 9, 4, 9);
  add(2, 7, 5, 8);
  add(4, 6, 4, 6);
  add(2, 4, 6, 4);
  add(2, 5, 8, 5);
  add(9, 4, 10, 5);
  add(9, 3, 9, 3);
  add(4, 0, 9, 2);
  add(0, 0, 1, 2);
  add(1, 3, 1, 4);
  add(11, 0, 11, 4);
  add(8, 10, 11, 11);
  add(6, 10, 7, 10);
  add(0, 5, 1, 7);
  const cells: Cell[] = [];
  for (const key of open) {
    const [ix, iz] = key.split(",").map(Number) as [number, number];
    cells.push({ ix, iz });
  }
  return cells;
}

export function isWalkable(ix: number, iz: number) {
  return walkableCells().some((cell) => cell.ix === ix && cell.iz === iz);
}
