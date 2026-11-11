import { BLOCKED, COLUMNS, FLOORS, GRID_H, GRID_W, LAYOUT_ID } from "./ashgateLayout";

export { LAYOUT_ID };

export interface Cell {
  ix: number;
  iz: number;
}

export const RULES = {
  /** No approved numeric design sheet was in the repo. Values here are the only copy the game reads. */
  assumption:
    "Trap costs, hero stats, prices, and the burn cost are conservative defaults chosen for this build because the repository had no separate economy rules document.",
  grid: { entrance: { ix: 4, iz: 20 }, vault: { ix: 25, iz: 5 } },
  skeletons: [
    { id: "guard", ix: 20, iz: 8, hp: 36, attack: 11, name: "Dungeon Guard" },
    { id: "warrior", ix: 26, iz: 15, hp: 48, attack: 14, name: "Skeleton Warrior" },
  ],
  tutorialHeroHp: 20,
  /** Doorway tile on the hall-to-vault route. The first raid dies here, then a warned hero steps aside. */
  spikeTutorialCell: { ix: 19, iz: 12 },
  reputationPerSurvival: -4,
  reputationPerDeath: 6,
  vaultBraceCost: 40,
  vaultBraceReduction: 8,
  maxListings: 8,
} as const;

export function cellKey(ix: number, iz: number) {
  return `${ix},${iz}`;
}

export interface RoomGate {
  id: "court" | "spike" | "vault";
  name: string;
  ix: number;
  iz: number;
  rot: number;
  /** Offset from the cell center so the grate sits on the doorway edge. */
  ox: number;
  oz: number;
  /** Other cells this same grate seals. The vault door is two tiles wide. */
  span: readonly Cell[];
}

/**
 * Grates on the entrance-to-vault route, in the order a hero lifts them.
 * Court and spike sit on one tile of a wider door, so locking them is a sidestep.
 * The vault grate seals both tiles of D5-B. Locking it stops short of the chest.
 */
export const ROOM_GATES: readonly RoomGate[] = [
  { id: "court", name: "Court gate", ix: 8, iz: 18, rot: Math.PI / 2, ox: -2, oz: 0, span: [] },
  { id: "spike", name: "Spike gate", ix: 19, iz: 12, rot: Math.PI / 2, ox: -2, oz: 0, span: [] },
  { id: "vault", name: "Vault gate", ix: 21, iz: 6, rot: Math.PI / 2, ox: 2, oz: 0, span: [{ ix: 21, iz: 5 }] },
];

export type RoomGateId = (typeof ROOM_GATES)[number]["id"];

export function gateCells(gate: RoomGate): Cell[] {
  return [{ ix: gate.ix, iz: gate.iz }, ...gate.span];
}

export function gateCovers(gate: RoomGate, ix: number, iz: number) {
  return gateCells(gate).some((cell) => cell.ix === ix && cell.iz === iz);
}

/** South threshold of the exterior gate. Both tiles stay clear. The path starts on the west one. */
export const ENTRANCE_TILES: readonly Cell[] = [
  { ix: 4, iz: 20 },
  { ix: 5, iz: 20 },
];

export function isEntranceTile(ix: number, iz: number) {
  return ENTRANCE_TILES.some((cell) => cell.ix === ix && cell.iz === iz);
}

/** Idle posts inside the gate room, off the shortest walk to the vault. */
export const HERO_POSTS = {
  kara: { ix: 3, iz: 18 },
  brann: { ix: 4, iz: 18 },
  ivo: { ix: 5, iz: 18 },
} as const;

export const HALL_W = GRID_W - 1;
export const HALL_H = GRID_H - 1;

const ROOMS: readonly { name: string; floor: string; x1: number; y1: number; x2: number; y2: number }[] = [
  { name: "library", floor: "floor_wood_large_dark", x1: 2, y1: 3, x2: 8, y2: 8 },
  { name: "vault", floor: "floor_wood_large_dark", x1: 22, y1: 3, x2: 28, y2: 8 },
  { name: "crypt", floor: "floor_tile_large_rocks", x1: 2, y1: 10, x2: 7, y2: 13 },
  { name: "hall", floor: "floor_tile_large", x1: 10, y1: 9, x2: 18, y2: 16 },
  { name: "entrance", floor: "floor_wood_large", x1: 2, y1: 15, x2: 7, y2: 20 },
  { name: "prison", floor: "floor_dirt_large", x1: 23, y1: 13, x2: 29, y2: 19 },
  { name: "arena", floor: "floor_tile_large_rocks", x1: 11, y1: 19, x2: 19, y2: 22 },
];

export const PILLARS: readonly Cell[] = COLUMNS.map(([ix, iz]) => ({ ix, iz }));

const floorKeys = new Set(FLOORS.map(([ix, iz]) => cellKey(ix, iz)));
const blockedKeys = new Set(BLOCKED.map(([ix, iz]) => cellKey(ix, iz)));

let walkableCache: Cell[] | null = null;
let walkableKeys: Set<string> | null = null;

function roomAt(ix: number, iz: number) {
  return ROOMS.find((room) => ix >= room.x1 && ix <= room.x2 && iz >= room.y1 && iz <= room.y2);
}

function buildWalkable(): Cell[] {
  return FLOORS.filter(([ix, iz]) => !blockedKeys.has(cellKey(ix, iz))).map(([ix, iz]) => ({ ix, iz }));
}

/** Rooms and the corridors between them. Columns, sarcophagi, and prison bars are excluded. */
export function walkableCells(): Cell[] {
  walkableCache ??= buildWalkable();
  return walkableCache;
}

export function isWalkable(ix: number, iz: number) {
  if (!walkableKeys) walkableKeys = new Set(walkableCells().map((cell) => cellKey(cell.ix, cell.iz)));
  return walkableKeys.has(cellKey(ix, iz));
}

export function hasFloor(ix: number, iz: number) {
  return floorKeys.has(cellKey(ix, iz));
}

export function floorName(ix: number, iz: number) {
  return roomAt(ix, iz)?.floor ?? "floor_tile_large";
}

export function roomName(ix: number, iz: number) {
  return roomAt(ix, iz)?.name ?? (hasFloor(ix, iz) ? "corridor" : "void");
}
