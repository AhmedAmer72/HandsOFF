import { describe, expect, it } from "vitest";
import { BOULDER_LANE, DOORS, EXAMPLE_TRAP_TILES, FLOORS, LAYOUT_ID, WALLS } from "./config/ashgateLayout";
import { HERO_PROFILES } from "./config/heroProfiles";
import { ROOM_GATES, RULES, floorName, gateCells, isWalkable, roomName, walkableCells, type Cell } from "./config/gameRules";
import { findPath } from "./engine/path";
import { ashgatePieces, layoutMatchesWalkable, roomOf } from "./world";

const CELL = 4;

describe("Ashgate dressing", () => {
  const pieces = ashgatePieces();

  it("covers every blueprint floor and no empty margin", () => {
    const floors = pieces.filter((piece) => piece.kind === "floor");
    expect(floors).toHaveLength(FLOORS.length);
    expect(LAYOUT_ID).toBe("underrealm-blueprint-1.0");
    const seen = new Set<string>();
    for (const floor of floors) {
      const ix = Math.round(floor.x / CELL);
      const iz = Math.round(floor.z / CELL);
      seen.add(`${ix},${iz}`);
      expect(floor.file).toBe(`${floorName(ix, iz)}.gltf`);
    }
    expect(floorName(4, 20)).toBe("floor_wood_large");
    expect(floorName(25, 5)).toBe("floor_wood_large_dark");
    expect(floorName(5, 5)).toBe("floor_wood_large_dark");
    expect(floorName(14, 12)).toBe("floor_tile_large");
    expect(floorName(4, 12)).toBe("floor_tile_large_rocks");
    expect(floorName(26, 15)).toBe("floor_dirt_large");
    expect(floorName(15, 21)).toBe("floor_tile_large_rocks");
    expect(floorName(20, 8)).toBe("floor_tile_large");
    for (const cell of walkableCells()) expect(seen.has(`${cell.ix},${cell.iz}`)).toBe(true);
    expect(layoutMatchesWalkable(pieces)).toBe(true);
  });

  it("dresses the rooms and leaves the route and the example traps clear", () => {
    const chest = pieces.find((piece) => piece.id === "vault-chest");
    expect(chest?.kind).toBe("vault");
    expect(chest && roomOf({ ix: Math.round(chest.x / CELL), iz: Math.round(chest.z / CELL) })).toBe("vault");
    expect(chest?.x).toBe(25 * CELL);
    expect(chest?.z).toBe(5 * CELL);
    const props = pieces.filter((piece) => piece.kind === "prop");
    const rooms: Record<string, string> = {
      "crypt-sarcophagus-a": "crypt",
      "crypt-sarcophagus-b": "crypt",
      "entrance-banner-left": "approach",
      "entrance-banner-right": "approach",
      "library-shelf": "library",
      "library-shelf-east": "library",
      "prison-bars-a": "prison",
      "prison-bars-b": "prison",
      "prison-bars-c": "prison",
      "prison-bars-d": "prison",
      "shrine-altar": "library",
      "vault-coins": "vault",
    };
    expect(props.map((piece) => piece.id).sort()).toEqual(Object.keys(rooms).sort());
    const route = new Set(findPath([], [], HERO_PROFILES.kara).map((cell) => `${cell.ix},${cell.iz}`));
    for (const prop of props) {
      const ix = Math.round(prop.x / CELL);
      const iz = Math.round(prop.z / CELL);
      expect(roomOf({ ix, iz })).toBe(rooms[prop.id]);
      expect(route.has(`${ix},${iz}`)).toBe(false);
    }
    const reserved = [...EXAMPLE_TRAP_TILES, ...BOULDER_LANE];
    for (const [ix, iz] of reserved) {
      expect(isWalkable(ix, iz)).toBe(true);
      expect(props.some((prop) => Math.round(prop.x / CELL) === ix && Math.round(prop.z / CELL) === iz)).toBe(false);
      expect(route.has(`${ix},${iz}`)).toBe(false);
    }
    const lights = pieces.filter((piece) => piece.kind === "light");
    expect(lights).toHaveLength(6);
    expect(lights.every((light) => light.y >= 1.4)).toBe(true);
    expect(pieces.filter((piece) => piece.file === "wall.gltf")).toHaveLength(WALLS.length);
    expect(pieces.filter((piece) => piece.label === "Entrance gate")).toHaveLength(2);
    expect(pieces.filter((piece) => piece.id.startsWith("room-gate-")).map((piece) => piece.id).sort()).toEqual(
      ROOM_GATES.flatMap((gate) => gateCells(gate).map((cell) => (cell.ix === gate.ix && cell.iz === gate.iz ? `room-gate-${gate.id}` : `room-gate-${gate.id}-${cell.ix}-${cell.iz}`))).sort(),
    );
  });

  it("keeps every door open and every room reachable from the south gate", () => {
    const wallKeys = new Set(WALLS.map(([orientation, fixed, along]) => `${orientation}:${fixed}:${along}`));
    for (const [id, orientation, fixed, along] of DOORS) {
      expect(wallKeys.has(`${orientation}:${fixed}:${along}`)).toBe(false);
      if (id === "D1") expect(isWalkable(along, fixed - 1)).toBe(true);
    }
    const open = new Set(walkableCells().map((cell) => `${cell.ix},${cell.iz}`));
    const start = RULES.grid.entrance;
    const queue: Cell[] = [{ ix: start.ix, iz: start.iz }];
    const seen = new Set([`${start.ix},${start.iz}`]);
    for (let index = 0; index < queue.length; index += 1) {
      const cell = queue[index];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const next = { ix: cell.ix + dx, iz: cell.iz + dz };
        const key = `${next.ix},${next.iz}`;
        if (!open.has(key) || seen.has(key)) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    for (const name of ["library", "vault", "crypt", "hall", "entrance", "approach", "prison", "arena"]) {
      expect(walkableCells().some((cell) => roomName(cell.ix, cell.iz) === name && seen.has(`${cell.ix},${cell.iz}`))).toBe(true);
    }
    expect(isWalkable(12, 11)).toBe(false);
    expect(isWalkable(4, 11)).toBe(false);
    expect(isWalkable(27, 14)).toBe(false);
  });

  it("starts at the south gate and bends through the spike door and the vault door", () => {
    const path = findPath([], [], HERO_PROFILES.kara);
    const warrior = RULES.skeletons[1];
    const spike = RULES.spikeTutorialCell;
    expect(path[0]).toEqual({ ix: RULES.grid.entrance.ix, iz: RULES.grid.entrance.iz });
    expect(path.at(-1)).toEqual({ ix: RULES.grid.vault.ix, iz: RULES.grid.vault.iz });
    expect(path.some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(true);
    const at = (ix: number, iz: number) => path.findIndex((cell) => cell.ix === ix && cell.iz === iz);
    expect(at(16, 23)).toBeGreaterThan(0);
    expect(at(16, 23)).toBeLessThan(at(spike.ix, spike.iz));
    expect(at(spike.ix, spike.iz)).toBeLessThan(at(ROOM_GATES[2].ix, ROOM_GATES[2].iz));
    expect(path.some((cell) => cell.ix === RULES.skeletons[0].ix && cell.iz === RULES.skeletons[0].iz)).toBe(true);
    expect(path.some((cell) => cell.ix === warrior.ix && cell.iz === warrior.iz)).toBe(false);
    expect(new Set(path.map((cell) => cell.ix)).size).toBeGreaterThan(2);
    expect(path.length).toBeGreaterThan(18);
    for (const gate of ROOM_GATES) {
      for (const cell of gateCells(gate)) {
        expect(isWalkable(cell.ix, cell.iz)).toBe(true);
        const mesh = pieces.find((piece) => piece.id === (cell.ix === gate.ix && cell.iz === gate.iz ? `room-gate-${gate.id}` : `room-gate-${gate.id}-${cell.ix}-${cell.iz}`));
        expect(mesh?.x).toBe(cell.ix * CELL + gate.ox);
        expect(mesh?.z).toBe(cell.iz * CELL + gate.oz);
        expect(mesh?.rot).toBe(Math.PI / 2);
      }
    }
  });

  it("steps around a locked spike gate and stops a locked vault gate short of the chest", () => {
    const open = findPath([], [], HERO_PROFILES.kara);
    const around = findPath([], [], HERO_PROFILES.kara, ["spike"]);
    const guard = RULES.skeletons[0];
    const warrior = RULES.skeletons[1];
    const spike = RULES.spikeTutorialCell;
    expect(around.some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(false);
    expect(around.some((cell) => cell.ix === guard.ix && cell.iz === guard.iz)).toBe(true);
    expect(around.some((cell) => cell.ix === warrior.ix && cell.iz === warrior.iz)).toBe(false);
    expect(around.at(-1)).toEqual({ ix: RULES.grid.vault.ix, iz: RULES.grid.vault.iz });
    expect(around.length).toBe(open.length);
    const stopped = findPath([], [], HERO_PROFILES.kara, ["vault"]);
    expect(stopped.at(-1)).not.toEqual({ ix: RULES.grid.vault.ix, iz: RULES.grid.vault.iz });
    expect(stopped.at(-1)).toEqual({ ix: 20, iz: 5 });
    expect(stopped.every((cell) => isWalkable(cell.ix, cell.iz))).toBe(true);
  });
});
