import { describe, expect, it } from "vitest";
import { HERO_PROFILES } from "./config/heroProfiles";
import { ROOM_GATES, isWalkable, walkableCells } from "./config/gameRules";
import { findPath } from "./engine/path";
import { ashgatePieces, roomOf } from "./world";

const CELL = 4;

describe("Ashgate dressing", () => {
  const pieces = ashgatePieces();

  it("covers every walkable cell with a plain floor", () => {
    const floors = pieces.filter((piece) => piece.kind === "floor");
    expect(floors).toHaveLength(walkableCells().length);
    for (const floor of floors) {
      const ix = Math.round(floor.x / CELL);
      const iz = Math.round(floor.z / CELL);
      expect(isWalkable(ix, iz)).toBe(true);
      expect(floor.file).toBe(iz >= 10 ? "floor_wood_large.gltf" : "floor_tile_large.gltf");
    }
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
    expect(props.map((piece) => piece.id).sort()).toEqual(["store-barrel", "store-crates", "vault-coins"]);
    for (const prop of props) {
      const room = roomOf({ ix: Math.round(prop.x / CELL), iz: Math.max(0, Math.round(prop.z / CELL)) });
      expect(room === "vault" || room === "storage").toBe(true);
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
    expect(path.some((cell) => cell.ix === 14 && cell.iz === 1)).toBe(false);
    expect(new Set(path.map((cell) => cell.ix)).size).toBeGreaterThan(2);
    expect(path.length).toBeGreaterThan(18);
  });

  it("keeps rooms and corridors several tiles across, with one-tile gates", () => {
    const cells = walkableCells();
    const has = (ix: number, iz: number) => cells.some((cell) => cell.ix === ix && cell.iz === iz);
    const row = (iz: number, x0: number, x1: number) => {
      for (let ix = x0; ix <= x1; ix++) expect(has(ix, iz)).toBe(true);
    };
    row(11, 2, 12);
    row(8, 1, 8);
    row(7, 9, 13);
    row(6, 9, 13);
    row(5, 4, 13);
    row(4, 4, 13);
    row(2, 2, 8);
    row(1, 2, 8);
    row(-1, 1, 8);
    row(-3, 1, 8);
    expect(cells.filter((cell) => cell.iz === 9 && cell.ix >= 1)).toEqual([{ ix: 4, iz: 9 }]);
    expect(cells.filter((cell) => cell.iz === 6 && cell.ix >= 1 && cell.ix <= 8)).toEqual([{ ix: 4, iz: 6 }]);
    expect(cells.filter((cell) => cell.iz === 3)).toEqual([{ ix: 8, iz: 3 }]);
    expect(has(8, 6)).toBe(false);
    expect(has(0, 10)).toBe(false);
    expect(cells.length).toBeGreaterThan(140);
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
