import { describe, expect, it } from "vitest";
import { HERO_PROFILES } from "./config/heroProfiles";
import { HALL_H, HALL_W, ROOM_GATES, RULES, floorName, isWalkable, walkableCells } from "./config/gameRules";
import { findPath } from "./engine/path";
import { ashgatePieces, roomOf } from "./world";

const CELL = 4;

describe("Ashgate dressing", () => {
  const pieces = ashgatePieces();

  it("covers the blueprint with a floor for every cell", () => {
    const floors = pieces.filter((piece) => piece.kind === "floor");
    expect(floors).toHaveLength((HALL_W + 1) * (HALL_H + 1));
    const seen = new Set<string>();
    for (const floor of floors) {
      const ix = Math.round(floor.x / CELL);
      const iz = Math.round(floor.z / CELL);
      seen.add(`${ix},${iz}`);
      expect(floor.file).toBe(`${floorName(ix, iz)}.gltf`);
    }
    expect(floorName(4, 11)).toBe("floor_wood_large");
    expect(floorName(4, 0)).toBe("floor_wood_large_dark");
    expect(floorName(10, 10)).toBe("floor_wood_large");
    expect(floorName(9, 1)).toBe("floor_tile_large_rocks");
    expect(floorName(16, 11)).toBe("floor_dirt_large");
    expect(floorName(5, 0)).toBe("floor_tile_large");
    for (const cell of walkableCells()) expect(seen.has(`${cell.ix},${cell.iz}`)).toBe(true);
  });

  it("dresses the blueprint rooms and leaves the route clear of furniture", () => {
    const ids = new Set(pieces.map((piece) => piece.id));
    for (const gone of ["banner", "anvil", "chamber-pillar", "combat-rubble"]) {
      expect(ids.has(gone)).toBe(false);
    }
    const chest = pieces.find((piece) => piece.id === "vault-chest");
    expect(chest?.kind).toBe("vault");
    expect(chest && roomOf({ ix: Math.round(chest.x / CELL), iz: 0 })).toBe("vault");
    expect(chest && chest.z).toBeLessThan(0);
    const props = pieces.filter((piece) => piece.kind === "prop");
    const rooms: Record<string, string> = {
      "bedroom-bed": "vault",
      "dining-chair-north": "hall",
      "dining-chair-south": "hall",
      "dining-table": "hall",
      "entrance-banner-left": "entrance",
      "entrance-banner-right": "entrance",
      "round-table": "parlor",
      "store-barrel": "storage",
      "store-crates": "storage",
      "store-table": "storage",
      "vault-coins": "vault",
    };
    expect(props.map((piece) => piece.id).sort()).toEqual(Object.keys(rooms).sort());
    for (const prop of props) {
      const room = roomOf({ ix: Math.round(prop.x / CELL), iz: Math.max(0, Math.round(prop.z / CELL)) });
      expect(room).toBe(rooms[prop.id]);
    }
    const route = new Set(findPath([], [], HERO_PROFILES.kara).map((cell) => `${cell.ix},${cell.iz}`));
    for (const prop of props) {
      if (prop.id.startsWith("entrance-banner")) continue;
      const ix = Math.round(prop.x / CELL);
      const iz = Math.max(0, Math.round(prop.z / CELL));
      expect(route.has(`${ix},${iz}`)).toBe(false);
    }
    const lights = pieces.filter((piece) => piece.kind === "light");
    expect(lights).toHaveLength(6);
    expect(lights.every((light) => light.y >= 1.4)).toBe(true);
    expect(pieces.filter((piece) => piece.id.startsWith("room-gate-")).map((piece) => piece.id).sort()).toEqual(
      ROOM_GATES.map((gate) => `room-gate-${gate.id}`).sort(),
    );
  });

  it("bends the short path through rooms instead of a straight run", () => {
    const path = findPath([], [], HERO_PROFILES.kara);
    const warrior = RULES.skeletons[1];
    expect(path[0]).toEqual({ ix: 4, iz: 11 });
    expect(path.at(-1)).toEqual({ ix: 4, iz: 0 });
    expect(path.some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(true);
    expect(path.some((cell) => cell.ix === ROOM_GATES[0].ix && cell.iz === ROOM_GATES[0].iz)).toBe(true);
    expect(path.some((cell) => cell.ix === ROOM_GATES[2].ix && cell.iz === ROOM_GATES[2].iz)).toBe(true);
    expect(path.some((cell) => cell.ix === RULES.skeletons[0].ix && cell.iz === RULES.skeletons[0].iz)).toBe(true);
    expect(path.some((cell) => cell.ix === warrior.ix && cell.iz === warrior.iz)).toBe(false);
    expect(new Set(path.map((cell) => cell.ix)).size).toBeGreaterThan(2);
    expect(path.length).toBeGreaterThan(18);
  });

  it("keeps the hall the blueprint rectangle and seats every gate in a straight wall", () => {
    const cells = walkableCells();
    const has = (ix: number, iz: number) => cells.some((cell) => cell.ix === ix && cell.iz === iz);
    const xs = cells.map((cell) => cell.ix);
    const zs = cells.map((cell) => cell.iz);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(HALL_W);
    expect(Math.min(...zs)).toBe(0);
    expect(Math.max(...zs)).toBe(HALL_H);
    expect(has(0, HALL_H) && has(HALL_W, HALL_H)).toBe(true);
    expect(has(0, 0)).toBe(true);
    expect(has(4, 0)).toBe(true);
    for (const gate of ROOM_GATES) {
      expect(has(gate.ix, gate.iz)).toBe(true);
      expect(has(gate.ix - 1, gate.iz)).toBe(false);
      expect(has(gate.ix + 1, gate.iz)).toBe(false);
      expect(has(gate.ix, gate.iz - 1)).toBe(true);
      expect(has(gate.ix, gate.iz + 1)).toBe(true);
    }
    expect(cells.filter((cell) => cell.iz === ROOM_GATES[0].iz)).toHaveLength(1);
    for (const gate of ROOM_GATES) {
      const mesh = pieces.find((piece) => piece.id === `room-gate-${gate.id}`);
      expect(mesh?.x).toBe(gate.ix * CELL);
      expect(mesh?.z).toBe(gate.iz * CELL);
      expect(mesh?.rot).toBe(Math.PI);
      for (const side of [-1, 1]) {
        const run = pieces.find((piece) => piece.id === `wall-run-${gate.ix + side}-${gate.iz}`);
        const arm = pieces.find((piece) => piece.id === `wall-arm-${side === -1 ? "e" : "w"}-${gate.ix + side}-${gate.iz}`);
        const neighbor = run ?? arm;
        expect(neighbor?.z).toBe(mesh?.z);
        expect(neighbor?.x).toBe((gate.ix + side) * CELL);
      }
    }
    const south = pieces.filter((piece) => piece.id.startsWith("wall-s-") && piece.z === HALL_H * CELL + 2);
    const north = pieces.filter((piece) => piece.id.startsWith("wall-n-") && piece.z === -2);
    const west = pieces.filter((piece) => piece.id.startsWith("wall-w-") && piece.x === -2);
    const east = pieces.filter((piece) => piece.id.startsWith("wall-e-") && piece.x === HALL_W * CELL + 2);
    expect(south).toHaveLength(HALL_W + 1);
    expect(north).toHaveLength(HALL_W + 1);
    expect(west).toHaveLength(HALL_H + 1);
    expect(east).toHaveLength(HALL_H + 1);
    const open = findPath([], [], HERO_PROFILES.kara);
    const around = findPath([], [], HERO_PROFILES.kara, ["spike"]);
    const extra = around.length - open.length;
    expect(extra).toBeGreaterThanOrEqual(2);
    expect(extra).toBeLessThanOrEqual(10);
  });

  it("sends a locked spike gate down the long bypass and stops a locked vault gate", () => {
    const around = findPath([], [], HERO_PROFILES.kara, ["spike"]);
    const guard = RULES.skeletons[0];
    const warrior = RULES.skeletons[1];
    expect(around.some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(false);
    expect(around.some((cell) => cell.ix === guard.ix && cell.iz === guard.iz)).toBe(true);
    expect(around.some((cell) => cell.ix === warrior.ix && cell.iz === warrior.iz)).toBe(false);
    expect(around.at(-1)).toEqual({ ix: 4, iz: 0 });
    expect(around.length).toBeGreaterThan(findPath([], [], HERO_PROFILES.kara).length);
    const stopped = findPath([], [], HERO_PROFILES.kara, ["vault"]);
    expect(stopped.at(-1)).not.toEqual({ ix: 4, iz: 0 });
    expect(stopped.at(-1)).toEqual({ ix: 4, iz: 2 });
    expect(stopped.every((cell) => isWalkable(cell.ix, cell.iz))).toBe(true);
  });
});
