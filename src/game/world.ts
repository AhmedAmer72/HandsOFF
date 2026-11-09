import { dungeon } from "./content";
import { HALL_SPAN, ROOM_GATES, cellKey, walkableCells, type Cell } from "./config/gameRules";
import type { Piece } from "./content";

const CELL = 4;

function piece(partial: Omit<Piece, "y" | "rot"> & { y?: number; rot?: number }): Piece {
  return { y: 0, rot: 0, ...partial };
}

function edgePiece(ix: number, iz: number, side: "n" | "s" | "e" | "w", fileName: string, label: string, cutaway: boolean): Piece {
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
    cutaway,
  });
}

function centerPiece(id: string, fileName: string, ix: number, iz: number, rot: number, label: string): Piece {
  return piece({
    id,
    url: dungeon(fileName),
    file: `${fileName}.gltf`,
    pack: "dungeon-remastered",
    x: ix * CELL,
    z: iz * CELL,
    rot,
    kind: "wall",
    label,
    cutaway: false,
  });
}

/** Floors and walls for the square hall, plus the dressed rooms. */
export function ashgatePieces(): Piece[] {
  const open = new Set(walkableCells().map((cell) => cellKey(cell.ix, cell.iz)));
  const inside = (ix: number, iz: number) => ix >= 0 && ix <= HALL_SPAN && iz >= 0 && iz <= HALL_SPAN;
  const blocked = (ix: number, iz: number) => inside(ix, iz) && !open.has(cellKey(ix, iz));
  const out: Piece[] = [];
  const seen = new Set<string>();
  const addWall = (ix: number, iz: number, side: "n" | "s" | "e" | "w", fileName: string, label: string) => {
    const id = `wall-${side}-${ix}-${iz}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push(edgePiece(ix, iz, side, fileName, label, false));
  };
  for (let ix = 0; ix <= HALL_SPAN; ix++) {
    for (let iz = 0; iz <= HALL_SPAN; iz++) {
      const wood = iz === HALL_SPAN && ix === 4;
      const file = wood ? "floor_wood_large" : "floor_tile_large";
      out.push(piece({
        id: `floor-${ix}-${iz}`,
        url: dungeon(file),
        file: `${file}.gltf`,
        pack: "dungeon-remastered",
        x: ix * CELL,
        z: iz * CELL,
        kind: "floor",
        label: "Stone floor",
      }));
    }
  }
  for (let i = 0; i <= HALL_SPAN; i++) {
    const door = i === 4;
    addWall(i, HALL_SPAN, "s", door ? "wall_doorway" : "wall", door ? "Entrance gate" : "Wall");
    addWall(i, 0, "n", "wall", "Wall");
    addWall(0, i, "w", "wall", "Wall");
    addWall(HALL_SPAN, i, "e", "wall", "Wall");
  }
  // One wall segment per solid cell, centered so a grate sits in the same line.
  // A turn uses two half segments so the corner joins without a second wall.
  const armRot = { e: 0, w: Math.PI, s: -Math.PI / 2, n: Math.PI / 2 } as const;
  for (let ix = 0; ix <= HALL_SPAN; ix++) {
    for (let iz = 0; iz <= HALL_SPAN; iz++) {
      if (!blocked(ix, iz)) continue;
      const sides = ["n", "s", "e", "w"] as const;
      const step = (side: (typeof sides)[number]) => ({
        dx: side === "e" ? 1 : side === "w" ? -1 : 0,
        dz: side === "s" ? 1 : side === "n" ? -1 : 0,
      });
      const solid = sides.filter((side) => {
        const { dx, dz } = step(side);
        return blocked(ix + dx, iz + dz);
      });
      const gateSide = sides.filter((side) => {
        const { dx, dz } = step(side);
        return ROOM_GATES.some((gate) => gate.ix === ix + dx && gate.iz === iz + dz);
      });
      const horizontal = solid.some((side) => side === "e" || side === "w") || gateSide.some((side) => side === "e" || side === "w");
      const vertical = solid.some((side) => side === "n" || side === "s");
      if (horizontal && vertical) {
        const arms = new Set([...solid, ...gateSide]);
        for (const side of arms) out.push(centerPiece(`wall-arm-${side}-${ix}-${iz}`, "wall_half", ix, iz, armRot[side], "Wall"));
      } else {
        out.push(centerPiece(`wall-run-${ix}-${iz}`, "wall", ix, iz, horizontal ? Math.PI : Math.PI / 2, "Wall"));
      }
    }
  }
  // The door is the south gate, with a banner on each jamb. The chest is on the
  // vault's north wall. The barrel and the crate sit at opposite ends of the store.
  const props: Array<{ id: string; file: string; x: number; z: number; y?: number; rot?: number; kind?: Piece["kind"]; label: string }> = [
    { id: "entrance-banner-left", file: "banner_red", x: 4 * CELL - 2.9, z: HALL_SPAN * CELL + 2.7, label: "Entrance banner" },
    { id: "entrance-banner-right", file: "banner_red", x: 4 * CELL + 2.9, z: HALL_SPAN * CELL + 2.7, label: "Entrance banner" },
    { id: "vault-chest", file: "chest_gold", x: 4 * CELL, z: -1.05, kind: "vault", label: "Treasure vault" },
    { id: "vault-coins", file: "coin_stack_medium", x: 6 * CELL, z: -0.85, label: "Vault coins" },
    { id: "store-barrel", file: "barrel_small", x: 1 * CELL, z: 7 * CELL, rot: 0.4, label: "Store barrel" },
    { id: "store-crates", file: "box_small", x: 1 * CELL, z: 10 * CELL, rot: 0.3, label: "Store crates" },
    { id: "torch-vault", file: "torch_mounted", x: 2 * CELL, y: 1.65, z: -1.7, kind: "light", label: "Vault torch" },
    { id: "torch-store", file: "torch_mounted", x: -1.7, y: 1.65, z: 7 * CELL, rot: Math.PI / 2, kind: "light", label: "Store torch" },
    { id: "torch-hall", file: "torch_mounted", x: 2 * CELL, y: 1.65, z: 4 * CELL - 1.7, kind: "light", label: "Hall torch" },
    { id: "torch-bypass", file: "torch_mounted", x: 9 * CELL, y: 1.65, z: 8 * CELL - 1.7, kind: "light", label: "Bypass torch" },
    { id: "torch-east", file: "torch_mounted", x: 11 * CELL, y: 1.65, z: 4 * CELL - 1.7, kind: "light", label: "East torch" },
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
    out.push(piece({
      id: `room-gate-${gate.id}`,
      url: dungeon("wall_gated"),
      file: "wall_gated.gltf",
      pack: "dungeon-remastered",
      x: gate.ix * CELL,
      z: gate.iz * CELL,
      rot: gate.rot,
      kind: "wall",
      label: gate.name,
    }));
  }
  return out;
}

export function roomOf(cell: Cell): string {
  if (cell.iz >= 10 && cell.ix >= 3 && cell.ix <= 5) return "entrance";
  if (cell.ix <= 1 && cell.iz >= 7) return "storage";
  if (cell.ix >= 7 && cell.iz >= 10) return "combat";
  if (cell.iz === 0) return "vault";
  if (cell.ix >= 9 && cell.iz >= 4 && cell.iz <= 8) return "bypass";
  if (cell.iz <= 5 && cell.iz >= 2) return "hall";
  return "corridor";
}

export function layoutMatchesWalkable(pieces: Piece[]) {
  const floors = new Set(pieces.filter((item) => item.kind === "floor").map((item) => cellKey(Math.round(item.x / CELL), Math.round(item.z / CELL))));
  return walkableCells().every((cell) => floors.has(cellKey(cell.ix, cell.iz)));
}
