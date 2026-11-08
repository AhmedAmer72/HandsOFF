import type { ScreenId } from "../content";
import { hexCenter } from "./registry";

export interface HexPiece {
  url: string;
  x: number;
  z: number;
  rot: number;
  y: number;
  placeId?: string;
}

export interface MapGate {
  id: string;
  name: string;
  screen: ScreenId;
  col: number;
  row: number;
}

const tile = (file: string) => `/runtime/hex/tiles/${file}`;
const nature = (file: string) => `/runtime/hex/decoration/nature/${file}`;
const prop = (file: string) => `/runtime/hex/decoration/props/${file}`;
const house = (color: string, name: string) => `/runtime/hex/buildings/${color}/${name}`;

function piece(col: number, row: number, url: string, rot = 0, y = 0, placeId?: string): HexPiece {
  const center = hexCenter(col, row);
  return { url, x: center.x, z: center.z, rot, y, placeId };
}

function neighbors(col: number, row: number) {
  const offset = (row & 1) === 1
    ? [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]]
    : [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
  return offset.map(([dx, dz]) => [col + dx, row + dz] as const);
}

/** Places you enter from the island. The menu does not list these. */
export const MAP_GATES: MapGate[] = [
  { id: "gate:dungeon", name: "Ashgate", screen: "dungeon", col: 7, row: 4 },
  { id: "gate:market", name: "Market", screen: "market", col: 6, row: 7 },
  { id: "gate:workshop", name: "Workshop", screen: "workshop", col: 9, row: 8 },
  { id: "gate:gate", name: "Gate", screen: "gate", col: 8, row: 7 },
  { id: "gate:registry", name: "Heroes", screen: "registry", col: 5, row: 5 },
  { id: "gate:chronicle", name: "Replay", screen: "chronicle", col: 11, row: 3 },
  { id: "gate:week", name: "Week", screen: "week", col: 4, row: 3 },
  { id: "gate:deed", name: "Charter", screen: "deed", col: 8, row: 5 },
  { id: "gate:guild", name: "Guild", screen: "guild", col: 4, row: 9 },
  { id: "gate:takehome", name: "Take home", screen: "takehome", col: 10, row: 9 },
  { id: "gate:home", name: "Camp", screen: "home", col: 6, row: 9 },
  { id: "gate:settings", name: "Settings", screen: "settings", col: 3, row: 5 },
];

function onLand(col: number, row: number) {
  const dx = col - 7;
  const dz = row - 6;
  if (dx * dx + dz * dz * 1.2 > 46) return false;
  if (col >= 12 && row >= 6) return false;
  return row >= 0 && row <= 12 && col >= 0 && col <= 14;
}

/** A large KayKit hex island. Fixed buildings are the game's entrances. */
export function hexIsland(): HexPiece[] {
  const land: Array<[number, number]> = [];
  const landSet = new Set<string>();
  const key = (col: number, row: number) => `${col},${row}`;
  for (let row = 0; row <= 12; row += 1) {
    for (let col = 0; col <= 14; col += 1) {
      if (!onLand(col, row)) continue;
      land.push([col, row]);
      landSet.add(key(col, row));
    }
  }
  const water: Array<[number, number]> = [];
  const waterSet = new Set<string>();
  for (let row = 4; row <= 12; row += 1) {
    for (let col = 11; col <= 16; col += 1) {
      if (landSet.has(key(col, row))) continue;
      const near = neighbors(col, row).some(([nx, nz]) => landSet.has(key(nx, nz)));
      if (!near && !(col >= 12 && row >= 6 && row <= 11)) continue;
      water.push([col, row]);
      waterSet.add(key(col, row));
    }
  }
  const pieces: HexPiece[] = [];
  for (const [col, row] of water) pieces.push(piece(col, row, tile("base/hex_water.gltf"), 0, -0.04));
  for (const [col, row] of land) {
    const shore = neighbors(col, row).find(([nx, nz]) => waterSet.has(key(nx, nz)));
    if (shore) {
      const from = hexCenter(col, row);
      const to = hexCenter(shore[0], shore[1]);
      pieces.push(piece(col, row, tile("coast/hex_coast_A.gltf"), Math.atan2(to.x - from.x, to.z - from.z)));
    } else {
      pieces.push(piece(col, row, tile("base/hex_grass.gltf")));
    }
  }
  const roads = new Set<string>();
  for (let row = 2; row <= 10; row += 1) roads.add(key(7, row));
  for (let col = 5; col <= 10; col += 1) roads.add(key(col, 7));
  for (const cell of roads) {
    const [col, row] = cell.split(",").map(Number);
    if (!landSet.has(cell)) continue;
    const vertical = roads.has(key(col, row - 1)) || roads.has(key(col, row + 1));
    pieces.push(piece(col, row, tile("roads/hex_road_A.gltf"), vertical ? 0 : Math.PI / 2, 0.01));
  }
  const gates = new Set(MAP_GATES.map((gate) => key(gate.col, gate.row)));
  const decor: Array<[number, number, string]> = [
    [6, 1, nature("mountain_A_grass_trees.gltf")],
    [8, 1, nature("mountain_B_grass_trees.gltf")],
    [4, 1, nature("hills_A_trees.gltf")],
    [10, 2, nature("hills_C_trees.gltf")],
    [2, 3, nature("hills_B.gltf")],
    [1, 6, nature("trees_A_large.gltf")],
    [2, 8, nature("trees_B_large.gltf")],
    [0, 5, nature("trees_A_medium.gltf")],
    [12, 4, nature("trees_B_medium.gltf")],
    [9, 11, nature("trees_A_small.gltf")],
    [5, 11, nature("tree_single_A.gltf")],
    [11, 8, nature("rock_single_C.gltf")],
  ];
  for (const [col, row, url] of decor) {
    if (landSet.has(key(col, row))) pieces.push(piece(col, row, url, 0, 0.02));
  }
  for (const [col, row] of land) {
    if (gates.has(key(col, row)) || roads.has(key(col, row))) continue;
    const roll = (col * 13 + row * 7) % 11;
    if (roll === 0) pieces.push(piece(col, row, nature("trees_A_small.gltf"), 0, 0.02));
    else if (roll === 1) pieces.push(piece(col, row, nature("tree_single_B.gltf"), 0, 0.02));
    else if (roll === 2 && row < 3) pieces.push(piece(col, row, nature("rock_single_A.gltf"), 0, 0.02));
  }
  const buildings: Array<[MapGate, string]> = [
    [MAP_GATES[0], house("blue", "building_castle_blue.gltf")],
    [MAP_GATES[1], house("blue", "building_market_blue.gltf")],
    [MAP_GATES[2], house("blue", "building_blacksmith_blue.gltf")],
    [MAP_GATES[3], house("red", "building_tavern_red.gltf")],
    [MAP_GATES[4], house("blue", "building_church_blue.gltf")],
    [MAP_GATES[5], house("blue", "building_tower_A_blue.gltf")],
    [MAP_GATES[6], house("green", "building_windmill_green.gltf")],
    [MAP_GATES[7], house("blue", "building_barracks_blue.gltf")],
    [MAP_GATES[8], house("red", "building_barracks_red.gltf")],
    [MAP_GATES[9], house("yellow", "building_home_A_yellow.gltf")],
    [MAP_GATES[10], house("green", "building_home_B_green.gltf")],
    [MAP_GATES[11], prop("tent.gltf")],
  ];
  for (const [gate, url] of buildings) pieces.push(piece(gate.col, gate.row, url, 0, 0.03, gate.id));
  return pieces;
}

export const ISLAND_FOCUS = hexCenter(7, 6);
