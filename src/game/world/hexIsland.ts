import { hexCenter } from "./registry";

export interface HexPiece {
  url: string;
  x: number;
  z: number;
  rot: number;
  y: number;
}

const tile = (file: string) => `/runtime/hex/tiles/${file}`;
const nature = (file: string) => `/runtime/hex/decoration/nature/${file}`;
const house = (color: string, name: string) => `/runtime/hex/buildings/${color}/${name}`;

function piece(col: number, row: number, url: string, rot = 0, y = 0): HexPiece {
  const center = hexCenter(col, row);
  return { url, x: center.x, z: center.z, rot, y };
}

function neighbors(col: number, row: number) {
  const offset = (row & 1) === 1
    ? [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]]
    : [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
  return offset.map(([dx, dz]) => [col + dx, row + dz] as const);
}

/** A KayKit hex island. The cells are terrain, not dungeon names. */
export function hexIsland(): HexPiece[] {
  const land = new Set<string>();
  const key = (col: number, row: number) => `${col},${row}`;
  const cells: Array<[number, number]> = [];
  for (let row = 0; row <= 7; row += 1) {
    for (let col = 0; col <= 8; col += 1) {
      const edge = (row === 0 && (col < 2 || col > 6))
        || (row === 7 && (col < 2 || col > 5))
        || (row === 1 && col === 0)
        || (row === 6 && col > 6)
        || (col === 8 && row < 3);
      if (edge) continue;
      cells.push([col, row]);
      land.add(key(col, row));
    }
  }
  const water: Array<[number, number]> = [];
  for (let row = 3; row <= 8; row += 1) {
    for (let col = 6; col <= 10; col += 1) {
      if (land.has(key(col, row))) continue;
      if (row < 4 && col < 8) continue;
      water.push([col, row]);
    }
  }
  const waterSet = new Set(water.map(([col, row]) => key(col, row)));
  const pieces: HexPiece[] = [];
  for (const [col, row] of water) pieces.push(piece(col, row, tile("base/hex_water.gltf"), 0, -0.04));
  for (const [col, row] of cells) {
    const shore = neighbors(col, row).find(([nx, nz]) => waterSet.has(key(nx, nz)));
    if (shore) {
      const from = hexCenter(col, row);
      const to = hexCenter(shore[0], shore[1]);
      const rot = Math.atan2(to.x - from.x, to.z - from.z);
      pieces.push(piece(col, row, tile("coast/hex_coast_A.gltf"), rot));
    } else {
      pieces.push(piece(col, row, tile("base/hex_grass.gltf")));
    }
  }
  const decor: Array<[number, number, string, number?]> = [
    [3, 0, nature("mountain_A_grass_trees.gltf")],
    [5, 0, nature("mountain_B_grass.gltf")],
    [2, 1, nature("hills_A_trees.gltf")],
    [6, 1, nature("hills_C_trees.gltf")],
    [1, 3, nature("trees_A_large.gltf")],
    [0, 4, nature("trees_B_medium.gltf")],
    [1, 5, nature("trees_A_small.gltf")],
    [7, 3, nature("trees_B_large.gltf")],
    [4, 7, nature("trees_A_medium.gltf")],
    [2, 6, nature("tree_single_B.gltf")],
    [5, 6, nature("rock_single_B.gltf")],
    [4, 2, tile("roads/hex_road_A.gltf")],
    [4, 3, tile("roads/hex_road_A.gltf")],
    [4, 4, tile("roads/hex_road_A.gltf")],
    [4, 5, tile("roads/hex_road_A.gltf")],
    [4, 6, tile("roads/hex_road_B.gltf"), Math.PI / 3],
    [5, 3, tile("rivers/hex_river_A.gltf"), Math.PI / 2],
    [6, 3, tile("rivers/hex_river_B.gltf")],
    [4, 3, house("blue", "building_castle_blue.gltf")],
    [6, 2, house("blue", "building_tower_A_blue.gltf")],
    [2, 4, house("yellow", "building_mine_yellow.gltf")],
    [5, 4, house("red", "building_tavern_red.gltf")],
    [2, 2, house("blue", "building_church_blue.gltf")],
    [6, 4, house("green", "building_windmill_green.gltf")],
    [3, 5, house("yellow", "building_home_A_yellow.gltf")],
    [3, 2, house("blue", "building_blacksmith_blue.gltf")],
    [5, 2, house("green", "building_home_B_green.gltf")],
    [7, 5, house("neutral", "building_bridge_A.gltf")],
    [1, 2, house("red", "building_lumbermill_red.gltf")],
    [3, 6, house("yellow", "building_watermill_yellow.gltf")],
  ];
  for (const [col, row, url, rot] of decor) {
    if (!land.has(key(col, row)) && !url.includes("bridge")) continue;
    pieces.push(piece(col, row, url, rot ?? 0, 0.02));
  }
  return pieces;
}

export const ISLAND_FOCUS = hexCenter(4, 3);
