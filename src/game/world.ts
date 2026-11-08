import { dungeon } from "./content";
import { cellKey, isWalkable, walkableCells, type Cell } from "./config/gameRules";
import type { Piece } from "./content";

const CELL = 4;

function piece(partial: Omit<Piece, "y" | "rot"> & { y?: number; rot?: number }): Piece {
  return { y: 0, rot: 0, ...partial };
}

/** Floors and perimeter walls for every walkable cell, plus the dressed rooms. */
export function ashgatePieces(): Piece[] {
  const cells = walkableCells();
  const open = new Set(cells.map((cell) => cellKey(cell.ix, cell.iz)));
  const out: Piece[] = [];
  for (const cell of cells) {
    const file = cell.iz >= 8 ? "floor_wood_large" : "floor_tile_large";
    out.push(piece({
      id: `floor-${cell.ix}-${cell.iz}`,
      url: dungeon(file),
      file: `${file}.gltf`,
      pack: "dungeon-remastered",
      x: cell.ix * CELL,
      z: cell.iz * CELL,
      kind: "floor",
      label: "Stone floor",
    }));
    const edges: Array<{ dx: number; dz: number; side: "n" | "s" | "e" | "w" }> = [
      { dx: 0, dz: -1, side: "n" },
      { dx: 0, dz: 1, side: "s" },
      { dx: 1, dz: 0, side: "e" },
      { dx: -1, dz: 0, side: "w" },
    ];
    for (const edge of edges) {
      if (open.has(cellKey(cell.ix + edge.dx, cell.iz + edge.dz))) continue;
      const doorway = cell.ix === 4 && cell.iz === 11 && edge.side === "s";
      const fileName = doorway ? "wall_doorway" : edge.side === "n" && cell.iz === 3 && cell.ix === 4 ? "wall_gated" : "wall";
      const x = cell.ix * CELL + (edge.side === "w" ? -2 : edge.side === "e" ? 2 : 0);
      const z = cell.iz * CELL + (edge.side === "n" ? -2 : edge.side === "s" ? 2 : 0);
      const rot = edge.side === "w" ? Math.PI / 2 : edge.side === "e" ? -Math.PI / 2 : edge.side === "s" ? Math.PI : 0;
      out.push(piece({
        id: `wall-${edge.side}-${cell.ix}-${cell.iz}`,
        url: dungeon(fileName),
        file: `${fileName}.gltf`,
        pack: "dungeon-remastered",
        x,
        z,
        rot,
        kind: "wall",
        label: doorway ? "Entrance gate" : "Wall",
        cutaway: !doorway && (edge.side === "s" || edge.side === "e"),
      }));
    }
  }
  // Dressing stays off the trap floor. The chest and coins sit on the vault's
  // north wall, the store is two pieces against the west wall, and torches
  // are mounted on walls that the camera does not cut away.
  const props: Array<{ id: string; file: string; x: number; z: number; y?: number; rot?: number; kind?: Piece["kind"]; label: string }> = [
    { id: "vault-chest", file: "chest_gold", x: 4 * CELL, z: -1.05, kind: "vault", label: "Treasure vault" },
    { id: "vault-coins", file: "coin_stack_medium", x: 5 * CELL + 1.15, z: -0.95, label: "Vault coins" },
    { id: "store-barrel", file: "barrel_small", x: -1.2, z: 5 * CELL, rot: 0.35, label: "Store barrel" },
    { id: "store-crates", file: "box_stacked", x: -1.05, z: 6 * CELL + 0.45, rot: -0.15, label: "Store crates" },
    { id: "torch-vault", file: "torch_mounted", x: 3 * CELL, y: 1.65, z: -1.7, kind: "light", label: "Vault torch" },
    { id: "torch-store", file: "torch_mounted", x: -1.75, y: 1.65, z: 4 * CELL, rot: Math.PI / 2, kind: "light", label: "Store torch" },
    { id: "torch-entrance", file: "torch_mounted", x: 4 * CELL - 1.75, y: 1.65, z: 9 * CELL, rot: Math.PI / 2, kind: "light", label: "Entrance torch" },
    { id: "torch-chamber", file: "torch_mounted", x: 8 * CELL, y: 1.65, z: 6 * CELL - 1.7, kind: "light", label: "Chamber torch" },
    { id: "torch-combat", file: "torch_lit", x: 7 * CELL - 1.75, y: 1.5, z: 2 * CELL, rot: Math.PI / 2, kind: "light", label: "Combat torch" },
  ];
  for (const prop of props) {
    out.push(piece({
      id: prop.id,
      url: dungeon(prop.file),
      file: `${prop.file}.gltf`,
      pack: "dungeon-remastered",
      x: prop.x,
      z: prop.z,
      y: prop.y ?? 0,
      rot: prop.rot ?? 0,
      kind: prop.kind ?? "prop",
      label: prop.label,
    }));
  }
  return out;
}

export function roomOf(cell: Cell): string {
  if (cell.iz >= 8) return "entrance";
  if (cell.ix <= 1) return "storage";
  if (cell.ix >= 7 && cell.iz >= 4) return "trap-chamber";
  if (cell.ix >= 7 && cell.iz <= 3) return "combat";
  if (cell.iz <= 2 && cell.ix >= 3 && cell.ix <= 5) return "vault";
  return "hall";
}

export function layoutMatchesWalkable(pieces: Piece[]) {
  const floors = pieces.filter((piece) => piece.kind === "floor");
  return floors.every((floor) => isWalkable(Math.round(floor.x / CELL), Math.round(floor.z / CELL)));
}
