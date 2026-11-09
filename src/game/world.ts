import { dungeon } from "./content";
import { ROOM_GATES, cellKey, isWalkable, walkableCells, type Cell } from "./config/gameRules";
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
    const file = cell.iz >= 10 ? "floor_wood_large" : "floor_tile_large";
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
      const fileName = doorway ? "wall_doorway" : "wall";
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
  // Dressing stays off the trap floor. The chest sits on the vault's north wall,
  // the store is two pieces on the west wall, and torches are on standing walls.
  const props: Array<{ id: string; file: string; x: number; z: number; y?: number; rot?: number; kind?: Piece["kind"]; label: string }> = [
    { id: "vault-chest", file: "chest_gold", x: 4 * CELL, z: -3 * CELL - 1.05, kind: "vault", label: "Treasure vault" },
    { id: "vault-coins", file: "coin_stack_medium", x: 6 * CELL + 0.4, z: -3 * CELL - 0.7, label: "Vault coins" },
    { id: "store-barrel", file: "barrel_small", x: -3 * CELL - 1.2, z: 8 * CELL, rot: 0.35, label: "Store barrel" },
    { id: "store-crates", file: "box_stacked", x: -3 * CELL - 0.4, z: 9 * CELL + 0.35, rot: -0.15, label: "Store crates" },
    { id: "torch-vault", file: "torch_mounted", x: 3 * CELL, y: 1.65, z: -3 * CELL - 1.7, kind: "light", label: "Vault torch" },
    { id: "torch-store", file: "torch_mounted", x: -3 * CELL - 1.75, y: 1.65, z: 8 * CELL, rot: Math.PI / 2, kind: "light", label: "Store torch" },
    { id: "torch-court", file: "torch_mounted", x: 9 * CELL, y: 1.65, z: 10 * CELL - 1.7, kind: "light", label: "Court torch" },
    { id: "torch-bypass", file: "torch_mounted", x: 12 * CELL, y: 1.65, z: 8 * CELL - 1.7, kind: "light", label: "Bypass torch" },
    { id: "torch-combat", file: "torch_lit", x: 13 * CELL, y: 1.65, z: -1.7, kind: "light", label: "Combat torch" },
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
  for (const gate of ROOM_GATES) {
    const east = gate.id === "combat";
    out.push(piece({
      id: `room-gate-${gate.id}`,
      url: dungeon("wall_gated"),
      file: "wall_gated.gltf",
      pack: "dungeon-remastered",
      x: east ? gate.ix * CELL - 2 : gate.ix * CELL,
      z: east ? gate.iz * CELL : gate.iz * CELL + 2,
      rot: gate.rot,
      kind: "wall",
      label: gate.name,
    }));
  }
  return out;
}

export function roomOf(cell: Cell): string {
  if (cell.iz >= 10) return "entrance";
  if (cell.ix <= 0) return "storage";
  if (cell.ix >= 10 && cell.iz <= 2) return "combat";
  if (cell.iz <= 0 && cell.ix <= 8) return "vault";
  if (cell.ix >= 9 && cell.iz >= 5) return "bypass";
  if (cell.iz <= 5 && cell.iz >= 1 && cell.ix <= 8) return "hall";
  return "corridor";
}

export function layoutMatchesWalkable(pieces: Piece[]) {
  const floors = pieces.filter((piece) => piece.kind === "floor");
  return floors.every((floor) => isWalkable(Math.round(floor.x / CELL), Math.round(floor.z / CELL)));
}
