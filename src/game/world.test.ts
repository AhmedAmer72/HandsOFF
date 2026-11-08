import { describe, expect, it } from "vitest";
import { isWalkable, walkableCells } from "./config/gameRules";
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
      expect(floor.file).toBe(iz >= 8 ? "floor_wood_large.gltf" : "floor_tile_large.gltf");
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
  });
});
