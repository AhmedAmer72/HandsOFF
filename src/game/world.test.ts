import { describe, expect, it } from "vitest";
import { HERO_PROFILES } from "./config/heroProfiles";
import { ROOM_GATES, isWalkable, walkableCells } from "./config/gameRules";
import { findPath } from "./engine/path";
import { ashgatePieces, roomOf } from "./world";

const CELL = 4;

describe("Ashgate dressing", () => {
  const pieces = ashgatePieces();

  it("covers the square with stone and puts wood only on the doorstep", () => {
    const floors = pieces.filter((piece) => piece.kind === "floor");
    expect(floors).toHaveLength(12 * 12);
    const seen = new Set<string>();
    for (const floor of floors) {
      const ix = Math.round(floor.x / CELL);
      const iz = Math.round(floor.z / CELL);
      seen.add(`${ix},${iz}`);
      const wood = iz === 11 && ix === 4;
      expect(floor.file).toBe(wood ? "floor_wood_large.gltf" : "floor_tile_large.gltf");
    }
    for (const cell of walkableCells()) expect(seen.has(`${cell.ix},${cell.iz}`)).toBe(true);
  });

  it("keeps furniture on the vault and store walls and leaves the trap floor empty", () => {
    const ids = new Set(pieces.map((piece) => piece.id));
    for (const gone of ["banner", "store-table", "anvil", "chamber-pillar", "combat-rubble"]) {
      expect(ids.has(gone)).toBe(false);
    }
    const chest = pieces.find((piece) => piece.id === "vault-chest");
    expect(chest?.kind).toBe("vault");
    expect(chest && roomOf({ ix: Math.round(chest.x / CELL), iz: 0 })).toBe("vault");
    expect(chest && chest.z).toBeLessThan(0);
    const props = pieces.filter((piece) => piece.kind === "prop");
    expect(props.map((piece) => piece.id).sort()).toEqual([
      "entrance-banner-left",
      "entrance-banner-right",
      "store-barrel",
      "store-crates",
      "vault-coins",
    ]);
    for (const prop of props) {
      const room = roomOf({ ix: Math.round(prop.x / CELL), iz: Math.max(0, Math.round(prop.z / CELL)) });
      const entranceBanner = prop.id.startsWith("entrance-banner");
      expect(entranceBanner ? room === "entrance" : room === "vault" || room === "storage").toBe(true);
    }
    const lights = pieces.filter((piece) => piece.kind === "light");
    expect(lights).toHaveLength(5);
    expect(lights.every((light) => light.y >= 1.4)).toBe(true);
    expect(pieces.filter((piece) => piece.id.startsWith("room-gate-")).map((piece) => piece.id).sort()).toEqual(
      ROOM_GATES.map((gate) => `room-gate-${gate.id}`).sort(),
    );
  });

  it("bends the short path through rooms instead of a straight run", () => {
    const path = findPath([], [], HERO_PROFILES.kara);
    expect(path[0]).toEqual({ ix: 4, iz: 11 });
    expect(path.at(-1)).toEqual({ ix: 4, iz: 0 });
    expect(path.some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(true);
    expect(path.some((cell) => cell.ix === 8 && cell.iz === 3)).toBe(true);
    expect(path.some((cell) => cell.ix === 11 && cell.iz === 11)).toBe(false);
    expect(new Set(path.map((cell) => cell.ix)).size).toBeGreaterThan(2);
    expect(path.length).toBeGreaterThan(18);
  });

  it("keeps the hall a square and seats every gate in a straight wall", () => {
    const cells = walkableCells();
    const has = (ix: number, iz: number) => cells.some((cell) => cell.ix === ix && cell.iz === iz);
    const xs = cells.map((cell) => cell.ix);
    const zs = cells.map((cell) => cell.iz);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(11);
    expect(Math.min(...zs)).toBe(0);
    expect(Math.max(...zs)).toBe(11);
    expect(has(0, 0) && has(11, 0) && has(0, 11) && has(11, 11)).toBe(true);
    for (const gate of ROOM_GATES) {
      expect(has(gate.ix, gate.iz)).toBe(true);
      expect(has(gate.ix - 1, gate.iz)).toBe(false);
      expect(has(gate.ix + 1, gate.iz)).toBe(false);
      expect(has(gate.ix, gate.iz - 1)).toBe(true);
      expect(has(gate.ix, gate.iz + 1)).toBe(true);
    }
    const foyer = cells.filter((cell) => cell.iz >= 10 && cell.ix >= 3 && cell.ix <= 5);
    expect(foyer).toHaveLength(6);
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
    const south = pieces.filter((piece) => piece.id.startsWith("wall-s-") && piece.z === 11 * CELL + 2);
    const north = pieces.filter((piece) => piece.id.startsWith("wall-n-") && piece.z === -2);
    const west = pieces.filter((piece) => piece.id.startsWith("wall-w-") && piece.x === -2);
    const east = pieces.filter((piece) => piece.id.startsWith("wall-e-") && piece.x === 11 * CELL + 2);
    expect(south).toHaveLength(12);
    expect(north).toHaveLength(12);
    expect(west).toHaveLength(12);
    expect(east).toHaveLength(12);
    const open = findPath([], [], HERO_PROFILES.kara);
    const around = findPath([], [], HERO_PROFILES.kara, ["spike"]);
    const extra = around.length - open.length;
    expect(extra).toBeGreaterThanOrEqual(2);
    expect(extra).toBeLessThanOrEqual(10);
  });

  it("sends a locked spike gate down the long bypass and stops a locked vault gate", () => {
    const around = findPath([], [], HERO_PROFILES.kara, ["spike"]);
    expect(around.some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(false);
    expect(around.at(-1)).toEqual({ ix: 4, iz: 0 });
    expect(around.length).toBeGreaterThan(findPath([], [], HERO_PROFILES.kara).length);
    const stopped = findPath([], [], HERO_PROFILES.kara, ["vault"]);
    expect(stopped.at(-1)).not.toEqual({ ix: 4, iz: 0 });
    expect(stopped.every((cell) => isWalkable(cell.ix, cell.iz))).toBe(true);
  });
});
