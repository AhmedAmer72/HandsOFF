import { dungeon } from "./content";
import { HALL_SPAN, PILLARS, ROOM_GATES, cellKey, roomModuleAt, walkableCells, type Cell } from "./config/gameRules";
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

function centerPiece(id: string, fileName: string, ix: number, iz: number, rot: number, label: string, cutaway: boolean): Piece {
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
    cutaway,
  });
}

function floorFile(ix: number, iz: number, open: boolean): string {
  if (open && ix === 4 && iz === HALL_SPAN) return "floor_wood_large";
  if (!open) return "floor_tile_large";
  const room = roomOf({ ix, iz });
  if (room === "vault") return "floor_tile_large_rocks";
  if (room === "storage" || room === "combat") return "floor_dirt_large";
  if (room === "hall" && (ix === 1 || ix === 7 || iz === 8)) return "floor_wood_large_dark";
  return roomModuleAt(ix, iz)?.floor ?? "floor_tile_large";
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
      const file = floorFile(ix, iz, open.has(cellKey(ix, iz)));
      out.push(piece({
        id: `floor-${ix}-${iz}`,
        url: dungeon(file),
        file: `${file}.gltf`,
        pack: "dungeon-remastered",
        x: ix * CELL,
        z: iz * CELL,
        kind: "floor",
        label: file === "floor_wood_large" ? "Wood threshold" : "Stone floor",
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
  // Camera-facing interior walls may cut away. The outer shell and the cells
  // beside a gate stay solid, so a grate keeps its jambs.
  const armRot = { e: 0, w: Math.PI, s: -Math.PI / 2, n: Math.PI / 2 } as const;
  const pillarAt = (ix: number, iz: number) => PILLARS.some((cell) => cell.ix === ix && cell.iz === iz);
  const gateJamb = (ix: number, iz: number) => ROOM_GATES.some((gate) => gate.iz === iz && Math.abs(gate.ix - ix) === 1);
  const hideable = (ix: number, iz: number) => !gateJamb(ix, iz) && ix > 0 && ix < HALL_SPAN && iz > 0 && iz < HALL_SPAN;
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
      if (pillarAt(ix, iz)) {
        out.push(centerPiece(`pillar-${ix}-${iz}`, "pillar", ix, iz, 0, "Stone pillar", false));
        for (const side of solid) out.push(centerPiece(`wall-arm-${side}-${ix}-${iz}`, "wall_half", ix, iz, armRot[side], "Wall", hideable(ix, iz)));
        continue;
      }
      const cutaway = hideable(ix, iz);
      const horizontal = solid.some((side) => side === "e" || side === "w") || gateSide.some((side) => side === "e" || side === "w");
      const vertical = solid.some((side) => side === "n" || side === "s");
      if (horizontal && vertical) {
        const arms = new Set([...solid, ...gateSide]);
        for (const side of arms) out.push(centerPiece(`wall-arm-${side}-${ix}-${iz}`, "wall_half", ix, iz, armRot[side], "Wall", cutaway));
      } else {
        out.push(centerPiece(`wall-run-${ix}-${iz}`, "wall", ix, iz, horizontal ? Math.PI : Math.PI / 2, "Wall", cutaway));
      }
    }
  }
  // The door is the south gate, with a banner on each jamb. The chest is on the
  // vault's north wall. The barrel and the crate sit at opposite ends of the store.
  const props: Array<{ id: string; file: string; x: number; z: number; y?: number; rot?: number; kind?: Piece["kind"]; label: string }> = [
    { id: "entrance-banner-left", file: "banner_red", x: 4 * CELL - 2.9, z: HALL_SPAN * CELL + 2.7, label: "Entrance banner" },
    { id: "entrance-banner-right", file: "banner_red", x: 4 * CELL + 2.9, z: HALL_SPAN * CELL + 2.7, label: "Entrance banner" },
    { id: "vault-chest", file: "chest_gold", x: 4 * CELL, z: -1.05, kind: "vault", label: "Treasure vault" },
    { id: "vault-coins", file: "coin_stack_medium", x: 6 * CELL, z: 0.7, label: "Vault coins" },
    { id: "store-barrel", file: "barrel_small", x: 0.5, z: 10 * CELL, rot: 0.4, label: "Store barrel" },
    { id: "store-crates", file: "box_small", x: 1 * CELL, z: 11 * CELL, rot: 0.2, label: "Store crates" },
    { id: "torch-vault", file: "torch_mounted", x: 6 * CELL, y: 1.65, z: -1.7, kind: "light", label: "Vault torch" },
    { id: "torch-store", file: "torch_mounted", x: -1.7, y: 1.65, z: 10 * CELL, rot: Math.PI / 2, kind: "light", label: "Store torch" },
    { id: "torch-gate-west", file: "torch_mounted", x: 3 * CELL, y: 1.65, z: HALL_SPAN * CELL + 1.55, rot: Math.PI, kind: "light", label: "Gate torch" },
    { id: "torch-gate-east", file: "torch_mounted", x: 6 * CELL, y: 1.65, z: HALL_SPAN * CELL + 1.55, rot: Math.PI, kind: "light", label: "Gate torch" },
    { id: "torch-hall", file: "torch_mounted", x: 2 * CELL, y: 1.65, z: 8 * CELL + 1.55, rot: Math.PI, kind: "light", label: "Hall torch" },
    { id: "torch-traps", file: "torch_mounted", x: 2 * CELL - 1.55, y: 1.65, z: 3 * CELL, rot: Math.PI / 2, kind: "light", label: "Trap chamber torch" },
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
  if (cell.iz >= 10 && cell.ix <= 2) return "storage";
  if (cell.iz >= 9 && cell.ix >= 7) return "combat";
  if ((cell.iz >= 10 && cell.ix >= 3 && cell.ix <= 6) || (cell.ix === 5 && cell.iz === 9)) return "entrance";
  if (cell.ix >= 3 && cell.ix <= 7 && cell.iz <= 2) return "vault";
  if (cell.ix === 7 && cell.iz === 3) return "vault";
  if ((cell.iz === 8 && cell.ix >= 1 && cell.ix <= 7) || (cell.iz === 7 && cell.ix >= 1 && cell.ix <= 7)) return "hall";
  if (cell.iz >= 3 && cell.iz <= 5 && cell.ix >= 2 && cell.ix <= 5) return "traps";
  return "corridor";
}

export function layoutMatchesWalkable(pieces: Piece[]) {
  const floors = new Set(pieces.filter((item) => item.kind === "floor").map((item) => cellKey(Math.round(item.x / CELL), Math.round(item.z / CELL))));
  return walkableCells().every((cell) => floors.has(cellKey(cell.ix, cell.iz)));
}
