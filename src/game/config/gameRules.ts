export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { entrance: { ix: 4, iz: 11 }, vault: { ix: 4, iz: 0 } },
  skeletons: [
    { id: "guard", ix: 4, iz: 2, hp: 36, attack: 11, name: "Dungeon Guard" },
    { id: "warrior", ix: 16, iz: 11, hp: 48, attack: 14, name: "Skeleton Warrior" },
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
  { id: "court", name: "Court gate", ix: 4, iz: 8, rot: Math.PI },
  { id: "spike", name: "Spike gate", ix: 4, iz: 6, rot: Math.PI },
  { id: "vault", name: "Vault gate", ix: 4, iz: 1, rot: Math.PI },
] as const;

export type RoomGateId = (typeof ROOM_GATES)[number]["id"];

/**
 * Ashgate copied from the reference floor plan. Row 0 is north, column 0 is west.
 * `#` is a stone wall, `P` is a pillar. Other letters are floors:
 * V bedroom vault, U its gate, R rubble, G and S small north rooms,
 * t round-table room, Q side chamber, K spike door, C court gate,
 * L lower furnished room, E entrance, W dining hall, N lower-right room.
 * `.` is stone corridor. The right-hand corridor and the room walls follow the plan.
 */
export const HALL_PLAN = [
  "VVVVV##RPRR#GG.#SS",
  "VVV#U##RPRR#GG.#SS",
  "VVV#...RRRR###.#..",
  "######.##.####.#.#",
  "tttt...##..###.#QQ",
  "ttttt####..##.#.QQ",
  ".###K####..###.#..",
  ".....#####.###.#..",
  "####C#########.NNN",
  "LLL#...#WWWW##.NNN",
  "LLL###.#WWWW##.NNN",
  "LLL.EE.WWWW..#.NNN",
] as const;

export const HALL_W = HALL_PLAN[0].length - 1;
export const HALL_H = HALL_PLAN.length - 1;

const FLOOR_BY_LETTER: Record<string, string> = {
  V: "floor_wood_large_dark",
  L: "floor_wood_large_dark",
  W: "floor_wood_large",
  E: "floor_wood_large",
  R: "floor_tile_large_rocks",
  G: "floor_dirt_large",
  S: "floor_dirt_large",
  Q: "floor_dirt_large",
  N: "floor_dirt_large",
};

export const PILLARS: readonly Cell[] = HALL_PLAN.flatMap((row, iz) =>
  [...row].flatMap((letter, ix) => (letter === "P" ? [{ ix, iz }] : [])),
);

let walkableCache: Cell[] | null = null;
let walkableKeys: Set<string> | null = null;

function letterAt(ix: number, iz: number) {
  if (ix < 0 || iz < 0 || ix > HALL_W || iz > HALL_H) return "#";
  return HALL_PLAN[iz][ix];
}

function buildWalkable(): Cell[] {
  const cells: Cell[] = [];
  for (let iz = 0; iz <= HALL_H; iz++) {
    for (let ix = 0; ix <= HALL_W; ix++) {
      const letter = HALL_PLAN[iz][ix];
      if (letter !== "#" && letter !== "P") cells.push({ ix, iz });
    }
  }
  return cells;
}

/** Rooms and the corridors between them. */
export function walkableCells(): Cell[] {
  walkableCache ??= buildWalkable();
  return walkableCache;
}

export function isWalkable(ix: number, iz: number) {
  if (!walkableKeys) walkableKeys = new Set(walkableCells().map((cell) => cellKey(cell.ix, cell.iz)));
  return walkableKeys.has(cellKey(ix, iz));
}

export function floorName(ix: number, iz: number) {
  return FLOOR_BY_LETTER[letterAt(ix, iz)] ?? "floor_tile_large";
}

export function roomName(ix: number, iz: number) {
  if (iz > HALL_H && ix >= 3 && ix <= 5) return "entrance";
  const letter = letterAt(ix, iz);
  if (letter === "V" || letter === "U") return "vault";
  if (letter === "L") return "storage";
  if (letter === "E" || letter === "C") return "entrance";
  if (letter === "W") return "hall";
  if (letter === "N") return "combat";
  if (letter === "t") return "parlor";
  return "corridor";
}
