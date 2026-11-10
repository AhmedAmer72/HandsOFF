export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { entrance: { ix: 4, iz: 11 }, vault: { ix: 4, iz: 0 } },
  skeletons: [
    { id: "guard", ix: 7, iz: 4, hp: 36, attack: 11, name: "Dungeon Guard" },
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
  { id: "court", name: "Court gate", ix: 5, iz: 9, rot: Math.PI },
  { id: "spike", name: "Spike gate", ix: 4, iz: 6, rot: Math.PI },
  { id: "vault", name: "Vault gate", ix: 7, iz: 3, rot: Math.PI },
] as const;

/** Outer footprint of Ashgate. Rooms sit inside this square. */
export const HALL_SPAN = 11;

export type RoomGateId = (typeof ROOM_GATES)[number]["id"];

/** Inclusive rectangle of floor cells. */
export interface RoomRect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/**
 * One hand-authored room. `floor` is the glTF name used for its walkable tiles.
 * The hall's south and side edges are dressed separately so the trap row stays plain stone.
 */
export interface RoomModule {
  id: string;
  floor: string;
  rects: readonly RoomRect[];
}

/**
 * Flagship Ashgate. South to north: store and armory flank a gate chamber,
 * a wide hall, the spike door, a deeper trap chamber, a short east corridor,
 * and the vault. The west corridor is the only way around the spike door.
 * Corner columns are omitted here so they stay solid.
 */
export const ROOM_MODULES: readonly RoomModule[] = [
  {
    id: "store",
    floor: "floor_dirt_large",
    rects: [{ x0: 0, z0: 10, x1: 2, z1: 11 }],
  },
  {
    id: "gate",
    floor: "floor_tile_large",
    rects: [
      { x0: 3, z0: 10, x1: 6, z1: 11 },
      { x0: 5, z0: 9, x1: 5, z1: 9 },
    ],
  },
  {
    id: "armory",
    floor: "floor_dirt_large",
    rects: [
      { x0: 7, z0: 10, x1: 11, z1: 11 },
      { x0: 9, z0: 9, x1: 11, z1: 9 },
    ],
  },
  {
    id: "hall",
    floor: "floor_tile_large",
    rects: [
      { x0: 2, z0: 8, x1: 6, z1: 8 },
      { x0: 1, z0: 7, x1: 7, z1: 7 },
    ],
  },
  {
    id: "spike",
    floor: "floor_tile_large",
    rects: [{ x0: 4, z0: 6, x1: 4, z1: 6 }],
  },
  {
    id: "bypass",
    floor: "floor_tile_large",
    rects: [
      { x0: 0, z0: 4, x1: 1, z1: 6 },
      { x0: 0, z0: 7, x1: 0, z1: 7 },
    ],
  },
  {
    id: "traps",
    floor: "floor_tile_large",
    rects: [{ x0: 2, z0: 3, x1: 5, z1: 5 }],
  },
  {
    id: "approach",
    floor: "floor_tile_large",
    rects: [
      { x0: 6, z0: 4, x1: 7, z1: 5 },
      { x0: 7, z0: 3, x1: 7, z1: 3 },
    ],
  },
  {
    id: "vault",
    floor: "floor_tile_large_rocks",
    rects: [
      { x0: 4, z0: 0, x1: 4, z1: 0 },
      { x0: 6, z0: 0, x1: 7, z1: 0 },
      { x0: 3, z0: 1, x1: 7, z1: 1 },
      { x0: 7, z0: 2, x1: 7, z1: 2 },
    ],
  },
];

/** Blocked corner columns. They are not on either route to the vault. */
export const PILLARS: readonly Cell[] = [
  { ix: 1, iz: 8 },
  { ix: 7, iz: 8 },
  { ix: 3, iz: 0 },
  { ix: 5, iz: 0 },
];

let walkableCache: Cell[] | null = null;
let walkableKeys: Set<string> | null = null;

function buildWalkable(): Cell[] {
  const open = new Set<string>();
  for (const room of ROOM_MODULES) {
    for (const rect of room.rects) {
      for (let ix = rect.x0; ix <= rect.x1; ix++) {
        for (let iz = rect.z0; iz <= rect.z1; iz++) open.add(cellKey(ix, iz));
      }
    }
  }
  return [...open].map((key) => {
    const [ix, iz] = key.split(",").map(Number) as [number, number];
    return { ix, iz };
  });
}

/** Rooms and the corridors between them, inside the square. */
export function walkableCells(): Cell[] {
  walkableCache ??= buildWalkable();
  return walkableCache;
}

export function isWalkable(ix: number, iz: number) {
  if (!walkableKeys) walkableKeys = new Set(walkableCells().map((cell) => cellKey(cell.ix, cell.iz)));
  return walkableKeys.has(cellKey(ix, iz));
}

export function roomModuleAt(ix: number, iz: number): RoomModule | undefined {
  return ROOM_MODULES.find((room) => room.rects.some((rect) => ix >= rect.x0 && ix <= rect.x1 && iz >= rect.z0 && iz <= rect.z1));
}
