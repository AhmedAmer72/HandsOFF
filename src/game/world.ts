import { dungeon } from "./content";
import { HALL_H, HALL_W, PILLARS, ROOM_GATES, RULES, cellKey, floorName, roomName, walkableCells, type Cell } from "./config/gameRules";
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
    cutaway: false,
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

function floorLabel(file: string, ix: number, iz: number) {
  if (ix === RULES.grid.entrance.ix && iz === RULES.grid.entrance.iz) return "Wood threshold";
  if (file.startsWith("floor_wood")) return "Wood floor";
  if (file.includes("rocks")) return "Rubble floor";
  if (file.includes("dirt")) return "Dirt floor";
  return "Stone floor";
}

/** Floors and walls for the blueprint hall, plus the dressed rooms. */
export function ashgatePieces(): Piece[] {
  const open = new Set(walkableCells().map((cell) => cellKey(cell.ix, cell.iz)));
  const inside = (ix: number, iz: number) => ix >= 0 && ix <= HALL_W && iz >= 0 && iz <= HALL_H;
  const blocked = (ix: number, iz: number) => inside(ix, iz) && !open.has(cellKey(ix, iz));
  const out: Piece[] = [];
  const seen = new Set<string>();
  const addWall = (ix: number, iz: number, side: "n" | "s" | "e" | "w", fileName: string, label: string) => {
    const id = `wall-${side}-${ix}-${iz}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push(edgePiece(ix, iz, side, fileName, label));
  };
  for (let ix = 0; ix <= HALL_W; ix++) {
    for (let iz = 0; iz <= HALL_H; iz++) {
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
  }
  for (let ix = 0; ix <= HALL_W; ix++) {
    const door = ix === RULES.grid.entrance.ix;
    addWall(ix, HALL_H, "s", door ? "wall_doorway" : "wall", door ? "Entrance gate" : "Wall");
    addWall(ix, 0, "n", "wall", "Wall");
  }
  for (let iz = 0; iz <= HALL_H; iz++) {
    addWall(0, iz, "w", "wall", "Wall");
    addWall(HALL_W, iz, "e", "wall", "Wall");
  }
  // One wall segment per solid cell, centered so a grate sits in the same line.
  // A turn uses two half segments so the corner joins without a second wall.
  // The overhead camera shows every wall, so none of them cut away.
  const armRot = { e: 0, w: Math.PI, s: -Math.PI / 2, n: Math.PI / 2 } as const;
  const pillarAt = (ix: number, iz: number) => PILLARS.some((cell) => cell.ix === ix && cell.iz === iz);
  for (let ix = 0; ix <= HALL_W; ix++) {
    for (let iz = 0; iz <= HALL_H; iz++) {
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
        out.push(centerPiece(`pillar-${ix}-${iz}`, "pillar", ix, iz, 0, "Stone pillar"));
        for (const side of solid) out.push(centerPiece(`wall-arm-${side}-${ix}-${iz}`, "wall_half", ix, iz, armRot[side], "Wall"));
        continue;
      }
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
  // Furniture sits against walls or in side rooms, off the route to the vault.
  const props: Array<{ id: string; file: string; x: number; z: number; y?: number; rot?: number; kind?: Piece["kind"]; label: string }> = [
    { id: "entrance-banner-left", file: "banner_red", x: 4 * CELL - 2.9, z: HALL_H * CELL + 2.7, label: "Entrance banner" },
    { id: "entrance-banner-right", file: "banner_red", x: 4 * CELL + 2.9, z: HALL_H * CELL + 2.7, label: "Entrance banner" },
    { id: "vault-chest", file: "chest_gold", x: 4 * CELL, z: -1.05, kind: "vault", label: "Treasure vault" },
    { id: "vault-coins", file: "coin_stack_medium", x: CELL, z: 0.7, label: "Vault coins" },
    { id: "bedroom-bed", file: "bed_decorated", x: 0.55, z: 5.1, rot: 0.15, label: "Bedroom bed" },
    { id: "round-table", file: "table_medium", x: CELL, z: 4 * CELL, rot: 0.4, label: "Round table" },
    { id: "store-table", file: "table_small", x: CELL, z: 10 * CELL, rot: 0.2, label: "Lower table" },
    { id: "dining-table", file: "table_long", x: 10 * CELL, z: 10 * CELL, rot: Math.PI / 2, label: "Dining table" },
    { id: "dining-chair-north", file: "chair", x: 10 * CELL, z: 10 * CELL - 1.85, rot: Math.PI, label: "Dining chair" },
    { id: "dining-chair-south", file: "chair", x: 10 * CELL, z: 10 * CELL + 1.85, label: "Dining chair" },
    { id: "store-barrel", file: "barrel_small", x: 0.55, z: 11 * CELL, rot: 0.4, label: "Store barrel" },
    { id: "store-crates", file: "box_small", x: 0.7, z: 9 * CELL + 0.4, rot: 0.2, label: "Store crates" },
    { id: "torch-vault", file: "torch_mounted", x: 2 * CELL, y: 1.65, z: -1.65, kind: "light", label: "Vault torch" },
    { id: "torch-store", file: "torch_mounted", x: -1.65, y: 1.65, z: 4 * CELL, rot: Math.PI / 2, kind: "light", label: "Parlor torch" },
    { id: "torch-gate-west", file: "torch_mounted", x: 3 * CELL, y: 1.65, z: HALL_H * CELL + 1.55, rot: Math.PI, kind: "light", label: "Gate torch" },
    { id: "torch-gate-east", file: "torch_mounted", x: 5 * CELL, y: 1.65, z: HALL_H * CELL + 1.55, rot: Math.PI, kind: "light", label: "Gate torch" },
    { id: "torch-hall", file: "torch_mounted", x: 10 * CELL, y: 1.65, z: 9 * CELL - 1.2, rot: Math.PI, kind: "light", label: "Dining torch" },
    { id: "torch-rubble", file: "torch_mounted", x: 9 * CELL, y: 1.65, z: -1.65, kind: "light", label: "Rubble torch" },
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
  return roomName(cell.ix, cell.iz);
}

export function layoutMatchesWalkable(pieces: Piece[]) {
  const floors = new Set(pieces.filter((item) => item.kind === "floor").map((item) => cellKey(Math.round(item.x / CELL), Math.round(item.z / CELL))));
  return walkableCells().every((cell) => floors.has(cellKey(cell.ix, cell.iz)));
}
