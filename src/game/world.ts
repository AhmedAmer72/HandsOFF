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
    const rocky = (cell.ix + cell.iz) % 6 === 0;
    const file = rocky ? "floor_tile_large_rocks" : "floor_tile_large";
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
        cutaway: edge.side === "s" || edge.side === "e",
      }));
    }
  }
  const props: Array<{ id: string; file: string; ix: number; iz: number; y?: number; kind?: Piece["kind"]; label: string; pack?: string; url?: string }> = [
    { id: "vault-chest", file: "chest_gold", ix: 4, iz: 0, kind: "vault", label: "Treasure vault" },
    { id: "vault-coins", file: "coin_stack_large", ix: 5, iz: 1, label: "Vault coins" },
    { id: "banner", file: "banner_red", ix: 6, iz: 7, label: "Hall banner" },
    { id: "store-barrel", file: "barrel_small", ix: 0, iz: 5, label: "Store barrel" },
    { id: "store-table", file: "table_small", ix: 1, iz: 6, label: "Store table" },
    { id: "chamber-pillar", file: "pillar", ix: 9, iz: 5, label: "Trap chamber pillar" },
    { id: "combat-rubble", file: "rubble_half", ix: 9, iz: 2, label: "Combat rubble" },
    { id: "torch-a", file: "torch_mounted", ix: 2, iz: 7, y: 1.7, kind: "light", label: "Hall torch" },
    { id: "torch-b", file: "torch_lit", ix: 6, iz: 4, y: 1.6, kind: "light", label: "Hall torch" },
    { id: "torch-c", file: "torch_mounted", ix: 7, iz: 6, y: 1.7, kind: "light", label: "Chamber torch" },
    { id: "torch-d", file: "torch_lit", ix: 3, iz: 1, y: 1.55, kind: "light", label: "Vault torch" },
  ];
  for (const prop of props) {
    out.push(piece({
      id: prop.id,
      url: prop.url ?? dungeon(prop.file),
      file: `${prop.file}.gltf`,
      pack: "dungeon-remastered",
      x: prop.ix * CELL,
      z: prop.iz * CELL,
      y: prop.y ?? 0,
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
