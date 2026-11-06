import { RAID } from "../../../rules/economy";
import { dungeon } from "../content";

export type TrapId = "spike" | "pit" | "boulder" | "bait";

export interface TrapDefinition {
  id: TrapId;
  name: string;
  cost: number;
  damage: number;
  model: string;
  file: string;
  note: string;
}

/** Conservative defaults. No separate approved balance sheet was in the repository. */
export const TRAP_DEFINITIONS: Record<TrapId, TrapDefinition> = {
  spike: {
    id: "spike",
    name: "Spike Trap",
    cost: RAID.traps.spike,
    damage: 24,
    model: dungeon("floor_tile_big_spikes"),
    file: "floor_tile_big_spikes.gltf",
    note: "Floor spikes from Dungeon Pack 1.1.",
  },
  pit: {
    id: "pit",
    name: "Pit Trap",
    cost: RAID.traps.pit,
    damage: 30,
    model: dungeon("floor_tile_big_grate_open"),
    file: "floor_tile_big_grate_open.gltf",
    note: "Open grate. The free pack has no separate pit mesh.",
  },
  boulder: {
    id: "boulder",
    name: "Rolling Cask",
    cost: RAID.traps.boulder,
    damage: 20,
    model: dungeon("barrel_large"),
    file: "barrel_large.gltf",
    note: "No boulder mesh shipped in the free packs. barrel_large.gltf is the rolling hazard.",
  },
  bait: {
    id: "bait",
    name: "Bait Plate",
    cost: RAID.bait,
    damage: 0,
    model: dungeon("plate_food_A"),
    file: "plate_food_A.gltf",
    note: "Food plate. It pulls greedy heroes onto its tile.",
  },
};

export const TRAP_IDS = Object.keys(TRAP_DEFINITIONS) as TrapId[];
