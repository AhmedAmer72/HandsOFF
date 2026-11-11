import { dungeon } from "./content";
import { DOORS, FLOORS, WALLS } from "./config/ashgateLayout";
import {
  PILLARS,
  ROOM_GATES,
  cellKey,
  floorName,
  gateCells,
  hasFloor,
  isEntranceTile,
  roomName,
  walkableCells,
  type Cell,
} from "./config/gameRules";
import type { Piece } from "./content";

const CELL = 4;

function piece(partial: Omit<Piece, "y" | "rot"> & { y?: number; rot?: number }): Piece {
  return { y: 0, rot: 0, ...partial };
}

function edgePiece(ix: number, iz: number, side: "n" | "s" | "e" | "w", fileName: string, label: string): Piece {
  const x = ix * CELL + (side === "w" ? -2 : side === "e" ? 2 : 0);
  const z = iz * CELL + (side === "n" ? -2 : side === "s" ? 2 : 0);
  const rot = side === "w" ? Math.PI / 2 : side === "e" ? -Math.PI / 2 : side === "s" ? Math.PI : 0;
  return piece({
    id: `wall-${side}-${ix}-${iz}`,
    url: dungeon(fileName),
    file: `${fileName}.gltf`,
    pack: "dungeon-remastered",
    x,
    z,
    rot,
    kind: "wall",
    label,
  });
}

function floorLabel(file: string, ix: number, iz: number) {
  if (isEntranceTile(ix, iz)) return "Gate threshold";
  if (file.startsWith("floor_wood")) return "Wood floor";
  if (file.includes("rocks")) return "Rubble floor";
  if (file.includes("dirt")) return "Dirt floor";
  return "Stone floor";
}

/** Place a blueprint edge on the floor tile that owns it. */
function wallOnFloor(orientation: "h" | "v", fixed: number, along: number, fileName: string, label: string): Piece {
  if (orientation === "h") {
    const ix = along;
    const iz = hasFloor(ix, fixed) ? fixed : fixed - 1;
    const side = hasFloor(ix, fixed) ? "n" : "s";
    return edgePiece(ix, iz, side, fileName, label);
  }
  const iz = along;
  const ix = hasFloor(fixed, iz) ? fixed : fixed - 1;
  const side = hasFloor(fixed, iz) ? "w" : "e";
  return edgePiece(ix, iz, side, fileName, label);
}

/** Floors, the blueprint wall segments, and the dressed rooms. */
export function ashgatePieces(): Piece[] {
  const out: Piece[] = [];
  for (const [ix, iz] of FLOORS) {
    const file = floorName(ix, iz);
    out.push(piece({
      id: `floor-${ix}-${iz}`,
      url: dungeon(file),
      file: `${file}.gltf`,
      pack: "dungeon-remastered",
      x: ix * CELL,
      z: iz * CELL,
      kind: "floor",
      label: floorLabel(file, ix, iz),
    }));
  }
  for (const [orientation, fixed, along] of WALLS) {
    out.push(wallOnFloor(orientation, fixed, along, "wall", "Wall"));
  }
  for (const [id, orientation, fixed, along] of DOORS) {
    if (id !== "D1") continue;
    out.push(wallOnFloor(orientation, fixed, along, "wall_doorway", "Entrance gate"));
  }
  for (const column of PILLARS) {
    out.push(piece({
      id: `pillar-${column.ix}-${column.iz}`,
      url: dungeon("pillar"),
      file: "pillar.gltf",
      pack: "dungeon-remastered",
      x: column.ix * CELL,
      z: column.iz * CELL,
      kind: "wall",
      label: "Stone pillar",
    }));
  }
  const props: Array<{ id: string; file: string; ix: number; iz: number; ox?: number; oz?: number; y?: number; rot?: number; kind?: Piece["kind"]; label: string }> = [
    { id: "entrance-banner-left", file: "banner_red", ix: 15, iz: 27, ox: -0.55, oz: 0.55, rot: -Math.PI / 6, label: "Entrance banner" },
    { id: "entrance-banner-right", file: "banner_red", ix: 16, iz: 27, ox: 0.55, oz: 0.55, rot: -Math.PI / 6, label: "Entrance banner" },
    { id: "library-shelf", file: "shelf_large", ix: 3, iz: 4, rot: Math.PI / 2, label: "Library shelf" },
    { id: "library-shelf-east", file: "shelf_large", ix: 7, iz: 7, rot: -Math.PI / 2, label: "Library shelf" },
    { id: "shrine-altar", file: "pillar_decorated", ix: 5, iz: 5, label: "Shrine altar" },
    { id: "crypt-sarcophagus-a", file: "box_large", ix: 4, iz: 11, rot: 0.2, label: "Sarcophagus" },
    { id: "crypt-sarcophagus-b", file: "box_large", ix: 6, iz: 12, rot: 1.2, label: "Sarcophagus" },
    { id: "prison-bars-a", file: "wall_gated", ix: 27, iz: 14, rot: Math.PI / 2, label: "Prison bars" },
    { id: "prison-bars-b", file: "wall_gated", ix: 28, iz: 14, rot: Math.PI / 2, label: "Prison bars" },
    { id: "prison-bars-c", file: "wall_gated", ix: 27, iz: 16, rot: Math.PI / 2, label: "Prison bars" },
    { id: "prison-bars-d", file: "wall_gated", ix: 28, iz: 16, rot: Math.PI / 2, label: "Prison bars" },
    { id: "vault-chest", file: "chest_gold", ix: 25, iz: 5, kind: "vault", label: "Treasure vault" },
    { id: "vault-coins", file: "coin_stack_medium", ix: 27, iz: 5, label: "Vault coins" },
    { id: "torch-library", file: "torch_mounted", ix: 5, iz: 3, y: 1.65, kind: "light", label: "Library torch" },
    { id: "torch-vault", file: "torch_mounted", ix: 23, iz: 3, y: 1.65, kind: "light", label: "Vault torch" },
    { id: "torch-crypt", file: "torch_mounted", ix: 3, iz: 10, y: 1.65, rot: Math.PI / 2, kind: "light", label: "Crypt torch" },
    { id: "torch-hall", file: "torch_mounted", ix: 14, iz: 9, y: 1.65, rot: Math.PI, kind: "light", label: "Hall torch" },
    { id: "torch-gate", file: "torch_mounted", ix: 3, iz: 20, y: 1.65, rot: Math.PI, kind: "light", label: "Gate torch" },
    { id: "torch-prison", file: "torch_mounted", ix: 24, iz: 18, y: 1.65, rot: -Math.PI / 2, kind: "light", label: "Prison torch" },
  ];
  for (const prop of props) {
    out.push(piece({
      id: prop.id,
      url: dungeon(prop.file),
      file: `${prop.file}.gltf`,
      pack: "dungeon-remastered",
      x: prop.ix * CELL + (prop.ox ?? 0),
      z: prop.iz * CELL + (prop.oz ?? 0),
      y: prop.y ?? 0,
      rot: prop.rot ?? 0,
      kind: prop.kind ?? "prop",
      label: prop.label,
    }));
  }
  for (const gate of ROOM_GATES) {
    for (const cell of gateCells(gate)) {
      const primary = cell.ix === gate.ix && cell.iz === gate.iz;
      out.push(piece({
        id: primary ? `room-gate-${gate.id}` : `room-gate-${gate.id}-${cell.ix}-${cell.iz}`,
        url: dungeon("wall_gated"),
        file: "wall_gated.gltf",
        pack: "dungeon-remastered",
        x: cell.ix * CELL + gate.ox,
        z: cell.iz * CELL + gate.oz,
        rot: gate.rot,
        kind: "wall",
        label: gate.name,
      }));
    }
  }
  return out;
}

export function roomOf(cell: Cell): string {
  return roomName(cell.ix, cell.iz);
}

export function layoutMatchesWalkable(pieces: Piece[]) {
  const floors = new Set(pieces.filter((item) => item.kind === "floor").map((item) => cellKey(Math.round(item.x / CELL), Math.round(item.z / CELL))));
  return walkableCells().every((cell) => floors.has(cellKey(cell.ix, cell.iz)));
}
