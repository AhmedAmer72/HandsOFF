export type ScreenId =
  | "menu"
  | "home"
  | "dungeon"
  | "map"
  | "gate"
  | "market"
  | "workshop"
  | "registry"
  | "chronicle"
  | "report"
  | "week"
  | "deed"
  | "guild"
  | "takehome"
  | "settings"
  | "gallery"
  | "sandbox"
  | "spectator"
  | "public";

export type HeroId = "brann" | "kara" | "ivo";
export type Quality = "low" | "medium" | "high";
export type WorldMode = "prototype" | "full";

export const CELL = 4;

export const dungeon = (file: string) => `/runtime/dungeon/${file}.gltf`;
export const weapon = (file: string) => `/runtime/weapons/${file}.gltf`;
export const item = (file: string) => `/runtime/items/${file}.gltf`;
export const skeletonProp = (file: string) => `/runtime/skeleton-props/${file}.gltf`;
export const heroModel = (file: string) => `/runtime/characters/${file}.glb`;
export const monsterModel = (file: string) => `/runtime/monsters/${file}.glb`;

export const ANIMATION_FILES = [
  "/runtime/animations/Rig_Medium/Rig_Medium_General.glb",
  "/runtime/animations/Rig_Medium/Rig_Medium_MovementBasic.glb",
  "/runtime/animations/Rig_Medium/Rig_Medium_MovementAdvanced.glb",
  "/runtime/animations/Rig_Medium/Rig_Medium_CombatMelee.glb",
  "/runtime/animations/Rig_Medium/Rig_Medium_Special.glb",
  "/runtime/animations/Rig_Medium/Rig_Medium_Tools.glb",
  "/runtime/animations/Rig_Medium/Rig_Medium_Simulation.glb",
];

export const CLIP_ALIASES: Record<string, string[]> = {
  idle: ["Idle_A", "Skeletons_Idle", "Idle_B"],
  walk: ["Walking_A", "Skeletons_Walking", "Walking_B"],
  run: ["Running_A", "Running_B"],
  attack: ["Melee_1H_Attack_Chop", "Melee_1H_Attack_Slice_Horizontal"],
  hit: ["Hit_A", "Hit_B"],
  death: ["Skeletons_Death", "Death_A"],
  dodge: ["Dodge_Forward", "Dodge_Left"],
  interact: ["Interact", "PickUp"],
  inspect: ["Interact", "Lockpicking"],
  buy: ["Use_Item", "PickUp"],
  work: ["Hammering", "Work_A"],
  sell: ["Interact", "Use_Item"],
  talk: ["Waving", "Idle_B"],
  restock: ["PickUp", "Work_B"],
};

export interface HeroDef {
  id: HeroId;
  name: string;
  role: string;
  model: string;
  modelFile: string;
  weapon?: string;
  weaponFile?: string;
  shield?: string;
  shieldFile?: string;
  personality: string;
  needs: string;
  family: "hero";
}

export const HEROES: HeroDef[] = [
  {
    id: "brann",
    name: "Brann",
    role: "Warrior",
    model: heroModel("Barbarian"),
    modelFile: "Barbarian.glb",
    weapon: weapon("axe_2handed"),
    weaponFile: "axe_2handed.gltf",
    shield: weapon("shield_round_barbarian"),
    shieldFile: "shield_round_barbarian.gltf",
    personality: "Charges the first gap he sees and trusts the vault more than plans.",
    needs: "A heavy weapon and a wall at his back.",
    family: "hero",
  },
  {
    id: "kara",
    name: "Kara",
    role: "Rogue",
    model: heroModel("Rogue"),
    modelFile: "Rogue.glb",
    weapon: weapon("dagger"),
    weaponFile: "dagger.gltf",
    personality: "Counts tiles, pockets keys, and leaves the loud work to Brann.",
    needs: "A light blade and an open lane.",
    family: "hero",
  },
  {
    id: "ivo",
    name: "Ivo",
    role: "Mage",
    model: heroModel("Mage"),
    modelFile: "Mage.glb",
    weapon: weapon("staff"),
    weaponFile: "staff.gltf",
    personality: "Reads the room before the fight and hates a wasted page.",
    needs: "A staff and time to cast.",
    family: "hero",
  },
];

export interface EnemyDef {
  id: string;
  name: string;
  role: string;
  model: string;
  modelFile: string;
  weapon?: string;
  note: string;
  home: [number, number];
}

export const ENEMIES: EnemyDef[] = [
  {
    id: "warrior",
    name: "Skeleton Warrior",
    role: "Skeleton Warrior",
    model: monsterModel("Skeleton_Warrior"),
    modelFile: "Skeleton_Warrior.glb",
    weapon: skeletonProp("Skeleton_Blade"),
    note: "Distinct Skeleton_Warrior mesh from the Skeletons free pack.",
    home: [2, 1],
  },
  {
    id: "archer",
    name: "Skeleton Archer",
    role: "Skeleton Archer",
    model: monsterModel("Skeleton_Rogue"),
    modelFile: "Skeleton_Rogue.glb",
    weapon: skeletonProp("Skeleton_Crossbow"),
    note: "No file is named archer. Skeleton_Rogue.glb is the ranged body, with Skeleton_Crossbow.gltf as the weapon.",
    home: [4, 1],
  },
  {
    id: "guard",
    name: "Dungeon Guard",
    role: "Dungeon Guard",
    model: monsterModel("Skeleton_Minion"),
    modelFile: "Skeleton_Minion.glb",
    weapon: skeletonProp("Skeleton_Shield_Large_A"),
    note: "Skeleton_Minion.glb stands in as the guard. There is no separate guard mesh.",
    home: [0, 1],
  },
  {
    id: "mage",
    name: "Skeleton Mage",
    role: "Skeleton variant",
    model: monsterModel("Skeleton_Mage"),
    modelFile: "Skeleton_Mage.glb",
    weapon: skeletonProp("Skeleton_Staff"),
    note: "Fourth skeleton body in the free pack.",
    home: [3, 0],
  },
];

export interface ItemDef {
  id: string;
  name: string;
  category: string;
  model: string;
  file: string;
  pack: string;
  price: number;
  blurb: string;
}

export const ITEMS: ItemDef[] = [
  { id: "axe", name: "Brann's Axe", category: "weapon", model: weapon("axe_2handed"), file: "axe_2handed.gltf", pack: "characters-adventurers", price: 48, blurb: "Two-handed axe from the Adventurers props." },
  { id: "dagger", name: "Kara's Dagger", category: "weapon", model: weapon("dagger"), file: "dagger.gltf", pack: "characters-adventurers", price: 22, blurb: "Light blade." },
  { id: "staff", name: "Ivo's Staff", category: "weapon", model: weapon("staff"), file: "staff.gltf", pack: "characters-adventurers", price: 36, blurb: "Casting staff." },
  { id: "shield", name: "Barbarian Round Shield", category: "shield", model: weapon("shield_round_barbarian"), file: "shield_round_barbarian.gltf", pack: "characters-adventurers", price: 30, blurb: "Round shield modeled for the barbarian." },
  { id: "sword", name: "Arming Sword", category: "weapon", model: weapon("sword_1handed"), file: "sword_1handed.gltf", pack: "characters-adventurers", price: 28, blurb: "One-handed sword." },
  { id: "lantern", name: "Workshop Lantern", category: "tool", model: item("lantern"), file: "lantern.gltf", pack: "rpg-tools", price: 14, blurb: "Lantern from RPG Tools Bits." },
  { id: "map", name: "Route Map", category: "tool", model: item("map"), file: "map.gltf", pack: "rpg-tools", price: 18, blurb: "Folded map from RPG Tools Bits." },
  { id: "journal", name: "Diary Page", category: "relic", model: item("journal_open"), file: "journal_open.gltf", pack: "rpg-tools", price: 0, blurb: "Open journal used as the Burn the Page parchment." },
  { id: "potion", name: "Green Phial", category: "consumable", model: dungeon("bottle_A_green"), file: "bottle_A_green.gltf", pack: "dungeon-remastered", price: 12, blurb: "Dungeon bottle. The free packs have no labeled potion mesh." },
  { id: "nail", name: "Iron Nail", category: "material", model: item("nail"), file: "nail.gltf", pack: "rpg-tools", price: 2, blurb: "Crafting nail." },
  { id: "hammer", name: "Smith Hammer", category: "tool", model: item("hammer"), file: "hammer.gltf", pack: "rpg-tools", price: 16, blurb: "Workshop hammer." },
  { id: "chest", name: "Gold Chest", category: "vault", model: dungeon("chest_gold"), file: "chest_gold.gltf", pack: "dungeon-remastered", price: 80, blurb: "Vault chest." },
  { id: "torch", name: "Wall Torch", category: "light", model: dungeon("torch_mounted"), file: "torch_mounted.gltf", pack: "dungeon-remastered", price: 6, blurb: "Mounted dungeon torch." },
];

export interface TrapDef {
  id: string;
  name: string;
  model: string;
  file: string;
  note: string;
  damage: number;
}

export const TRAPS: TrapDef[] = [
  {
    id: "spike",
    name: "Spike Trap",
    model: dungeon("floor_tile_big_spikes"),
    file: "floor_tile_big_spikes.gltf",
    note: "Real spike floor from Dungeon Pack 1.1.",
    damage: 18,
  },
  {
    id: "pit",
    name: "Pit Trap",
    model: dungeon("floor_tile_big_grate_open"),
    file: "floor_tile_big_grate_open.gltf",
    note: "Open grate tile. There is no separate pit mesh.",
    damage: 22,
  },
  {
    id: "cask",
    name: "Rolling Cask",
    model: dungeon("barrel_large"),
    file: "barrel_large.gltf",
    note: "The free packs do not include a boulder mesh. This trap uses barrel_large and is labeled as a cask, not a boulder.",
    damage: 16,
  },
  {
    id: "bait",
    name: "Bait Plate",
    model: dungeon("plate_food_A"),
    file: "plate_food_A.gltf",
    note: "Food plate used as bait. It slows a skeleton that steps on it.",
    damage: 0,
  },
];

export interface MerchantDef {
  id: string;
  name: string;
  role: string;
  model: string;
  personality: string;
  needs: string;
  stock: { itemId: string; qty: number; price: number }[];
}

export const MERCHANTS: MerchantDef[] = [
  {
    id: "mira",
    name: "Mira",
    role: "Gate factor",
    model: item("map"),
    personality: "Sells routes and remembers who paid.",
    needs: "Fresh maps and quiet customers.",
    stock: [
      { itemId: "map", qty: 2, price: 18 },
      { itemId: "lantern", qty: 3, price: 14 },
      { itemId: "potion", qty: 4, price: 12 },
    ],
  },
  {
    id: "orrin",
    name: "Orrin",
    role: "Smith",
    model: item("anvil"),
    personality: "Prices steel by the dent, not the story.",
    needs: "Nails, hammers, and unbroken edges.",
    stock: [
      { itemId: "axe", qty: 1, price: 48 },
      { itemId: "sword", qty: 2, price: 28 },
      { itemId: "hammer", qty: 2, price: 16 },
      { itemId: "nail", qty: 12, price: 2 },
    ],
  },
  {
    id: "tallow",
    name: "Tallow",
    role: "Wick merchant",
    model: dungeon("candle_lit"),
    personality: "Talks softly and counts flames.",
    needs: "Wax, torches, and a dry stall.",
    stock: [
      { itemId: "torch", qty: 6, price: 6 },
      { itemId: "lantern", qty: 2, price: 15 },
    ],
  },
];

export const RECIPES = [
  {
    id: "spike-upgrade",
    name: "Brood Spikes",
    needs: [
      { itemId: "nail", qty: 4 },
      { itemId: "hammer", qty: 1 },
    ],
    result: "Spike traps you place deal +6 damage for this raid.",
    trapBonus: 6,
  },
  {
    id: "wick-bundle",
    name: "Wick Bundle",
    needs: [{ itemId: "torch", qty: 1 }],
    result: "Adds 8 cinder from rendered tallow.",
    cinder: 8,
  },
];

export interface MapSite {
  id: string;
  name: string;
  kind: "dungeon" | "merchant" | "raid";
  q: number;
  r: number;
  model: string;
  detail: string;
}

export const SITES: MapSite[] = [
  { id: "ashgate", name: "Ashgate Dungeon", kind: "dungeon", q: 0, r: 0, model: dungeon("wall_doorway"), detail: "The playable dungeon. Entrance, hall, and vault." },
  { id: "mira-post", name: "Mira's Post", kind: "merchant", q: 1, r: -1, model: item("map"), detail: "Gate market stall." },
  { id: "orrin", name: "Orrin's Forge", kind: "merchant", q: -1, r: 1, model: item("anvil"), detail: "Workshop smith." },
  { id: "tallow", name: "Tallow's Wick", kind: "merchant", q: 1, r: 1, model: dungeon("candle_lit"), detail: "Candle stall." },
  { id: "cinder-raid", name: "Cinder Raid", kind: "raid", q: -1, r: 0, model: dungeon("banner_red"), detail: "Active raid marker. No separate terrain pack is loaded." },
];

export interface Piece {
  id: string;
  url: string;
  file: string;
  pack: string;
  x: number;
  y: number;
  z: number;
  rot: number;
  kind: "floor" | "wall" | "prop" | "trap" | "vault" | "light";
  label: string;
  cutaway?: boolean;
  trapId?: string;
  note?: string;
}

function piece(
  partial: Omit<Piece, "y" | "rot"> & { y?: number; rot?: number },
): Piece {
  return { y: 0, rot: 0, ...partial };
}

function buildShell(width: number, depth: number, ox: number, oz: number, door: { x: number; z: number; side: "s" | "n" } | null): Piece[] {
  const out: Piece[] = [];
  for (let ix = 0; ix < width; ix++) {
    for (let iz = 0; iz < depth; iz++) {
      const rocky = (ix + iz) % 5 === 0;
      const dirt = (ix * 3 + iz) % 9 === 0;
      const file = dirt ? "floor_dirt_large" : rocky ? "floor_tile_large_rocks" : "floor_tile_large";
      out.push(
        piece({
          id: `floor-${ox + ix}-${oz + iz}`,
          url: dungeon(file),
          file: `${file}.gltf`,
          pack: "dungeon-remastered",
          x: (ox + ix) * CELL,
          z: (oz + iz) * CELL,
          kind: "floor",
          label: file.replaceAll("_", " "),
        }),
      );
    }
  }
  const edge = (ix: number, iz: number, side: "n" | "s" | "w" | "e", file = "wall") => {
    const x = (ox + ix) * CELL + (side === "w" ? -2 : side === "e" ? 2 : 0);
    const z = (oz + iz) * CELL + (side === "n" ? -2 : side === "s" ? 2 : 0);
    const rot = side === "w" ? Math.PI / 2 : side === "e" ? -Math.PI / 2 : side === "s" ? Math.PI : 0;
    const cutaway = side === "s" || side === "e";
    out.push(
      piece({
        id: `wall-${side}-${ox + ix}-${oz + iz}-${file}`,
        url: dungeon(file),
        file: `${file}.gltf`,
        pack: "dungeon-remastered",
        x,
        z,
        rot,
        kind: "wall",
        label: file.replaceAll("_", " "),
        cutaway,
      }),
    );
  };
  for (let ix = 0; ix < width; ix++) {
    const northDoor = door?.side === "n" && door.x === ox + ix && door.z === oz;
    const southDoor = door?.side === "s" && door.x === ox + ix && door.z === oz + depth - 1;
    edge(ix, 0, "n", northDoor ? "wall_doorway" : "wall");
    edge(ix, depth - 1, "s", southDoor ? "wall_doorway" : "wall");
  }
  for (let iz = 0; iz < depth; iz++) {
    edge(0, iz, "w", iz % 3 === 1 ? "wall_pillar" : "wall");
    edge(width - 1, iz, "e", iz % 3 === 2 ? "wall_cracked" : "wall");
  }
  return out;
}

export function prototypeLayout(): Piece[] {
  const room = buildShell(5, 4, 0, 0, { x: 2, z: 3, side: "s" });
  const corridor: Piece[] = [];
  for (const iz of [4, 5]) {
    corridor.push(
      piece({
        id: `corr-floor-${iz}`,
        url: dungeon("floor_tile_large"),
        file: "floor_tile_large.gltf",
        pack: "dungeon-remastered",
        x: 2 * CELL,
        z: iz * CELL,
        kind: "floor",
        label: "corridor floor",
      }),
      piece({
        id: `corr-w-${iz}`,
        url: dungeon("wall"),
        file: "wall.gltf",
        pack: "dungeon-remastered",
        x: 2 * CELL - 2,
        z: iz * CELL,
        rot: Math.PI / 2,
        kind: "wall",
        label: "corridor wall",
      }),
      piece({
        id: `corr-e-${iz}`,
        url: dungeon("wall"),
        file: "wall.gltf",
        pack: "dungeon-remastered",
        x: 2 * CELL + 2,
        z: iz * CELL,
        rot: -Math.PI / 2,
        kind: "wall",
        label: "corridor wall",
        cutaway: true,
      }),
    );
  }
  corridor.push(
    piece({
      id: "entrance",
      url: dungeon("wall_doorway"),
      file: "wall_doorway.gltf",
      pack: "dungeon-remastered",
      x: 2 * CELL,
      z: 5 * CELL + 2,
      rot: Math.PI,
      kind: "wall",
      label: "dungeon entrance",
      cutaway: true,
      note: "Doorway at the near end of the corridor.",
    }),
  );
  const props: Piece[] = [
    piece({
      id: "vault-chest",
      url: dungeon("chest_gold"),
      file: "chest_gold.gltf",
      pack: "dungeon-remastered",
      x: 2 * CELL,
      z: 0.2 * CELL,
      kind: "vault",
      label: "Gold chest",
      note: "Treasure vault.",
    }),
    piece({
      id: "torch-w",
      url: dungeon("torch_mounted"),
      file: "torch_mounted.gltf",
      pack: "dungeon-remastered",
      x: 0.35,
      y: 1.7,
      z: 1 * CELL,
      rot: Math.PI / 2,
      kind: "light",
      label: "Wall torch",
    }),
    piece({
      id: "torch-e",
      url: dungeon("torch_lit"),
      file: "torch_lit.gltf",
      pack: "dungeon-remastered",
      x: 4 * CELL - 0.4,
      y: 1.55,
      z: 2 * CELL,
      rot: -Math.PI / 2,
      kind: "light",
      label: "Lit torch",
    }),
    piece({
      id: "spike",
      url: dungeon("floor_tile_big_spikes"),
      file: "floor_tile_big_spikes.gltf",
      pack: "dungeon-remastered",
      x: 4 * CELL,
      z: 2 * CELL,
      kind: "trap",
      trapId: "spike",
      label: "Spike trap",
    }),
    piece({
      id: "barrel",
      url: dungeon("barrel_large"),
      file: "barrel_large.gltf",
      pack: "dungeon-remastered",
      x: 0.6 * CELL,
      z: 2.2 * CELL,
      kind: "prop",
      label: "Barrel",
    }),
    piece({
      id: "crate",
      url: dungeon("box_stacked"),
      file: "box_stacked.gltf",
      pack: "dungeon-remastered",
      x: 3.4 * CELL,
      z: 0.8 * CELL,
      kind: "prop",
      label: "Stacked boxes",
    }),
    piece({
      id: "banner",
      url: dungeon("banner_red"),
      file: "banner_red.gltf",
      pack: "dungeon-remastered",
      x: 1 * CELL,
      z: 0.15 * CELL,
      kind: "prop",
      label: "Red banner",
    }),
    piece({
      id: "coins",
      url: dungeon("coin_stack_medium"),
      file: "coin_stack_medium.gltf",
      pack: "dungeon-remastered",
      x: 2.6 * CELL,
      z: 0.7 * CELL,
      kind: "prop",
      label: "Coin stack",
    }),
    piece({
      id: "lantern",
      url: item("lantern"),
      file: "lantern.gltf",
      pack: "rpg-tools",
      x: 1.2 * CELL,
      y: 0.72,
      z: 1.3 * CELL,
      kind: "prop",
      label: "Lantern",
      note: "RPG Tools lantern on the dungeon floor.",
    }),
    piece({
      id: "table",
      url: dungeon("table_small"),
      file: "table_small.gltf",
      pack: "dungeon-remastered",
      x: 1.2 * CELL,
      z: 1.3 * CELL,
      kind: "prop",
      label: "Small table",
    }),
    piece({
      id: "sword-prop",
      url: weapon("sword_1handed"),
      file: "sword_1handed.gltf",
      pack: "characters-adventurers",
      x: 3.2 * CELL,
      y: 0.05,
      z: 2.6 * CELL,
      rot: 0.4,
      kind: "prop",
      label: "Dropped sword",
    }),
    piece({
      id: "gate",
      url: dungeon("wall_gated"),
      file: "wall_gated.gltf",
      pack: "dungeon-remastered",
      x: 0 * CELL,
      z: 3 * CELL,
      rot: Math.PI / 2,
      kind: "prop",
      label: "Iron gate",
      note: "Diary pages are carried toward this gate.",
    }),
  ];
  return [...room, ...corridor, ...props];
}

export function fullLayout(): Piece[] {
  const hall = buildShell(7, 5, 0, 1, { x: 3, z: 5, side: "s" });
  const vault = buildShell(3, 2, 2, -1, { x: 3, z: 0, side: "s" });
  const combat = buildShell(4, 4, 7, 2, null);
  const link: Piece[] = [
    piece({
      id: "link-floor",
      url: dungeon("floor_tile_large"),
      file: "floor_tile_large.gltf",
      pack: "dungeon-remastered",
      x: 6.5 * CELL,
      z: 3 * CELL,
      kind: "floor",
      label: "side passage",
    }),
    piece({
      id: "combat-door",
      url: dungeon("wall_doorway"),
      file: "wall_doorway.gltf",
      pack: "dungeon-remastered",
      x: 7 * CELL - 2,
      z: 3 * CELL,
      rot: Math.PI / 2,
      kind: "wall",
      label: "combat room door",
    }),
  ];
  const corridor: Piece[] = [];
  for (const iz of [6, 7]) {
    corridor.push(
      piece({
        id: `full-corr-${iz}`,
        url: dungeon("floor_wood_large"),
        file: "floor_wood_large.gltf",
        pack: "dungeon-remastered",
        x: 3 * CELL,
        z: iz * CELL,
        kind: "floor",
        label: "entrance planks",
      }),
    );
  }
  corridor.push(
    piece({
      id: "full-entrance",
      url: dungeon("wall_doorway"),
      file: "wall_doorway.gltf",
      pack: "dungeon-remastered",
      x: 3 * CELL,
      z: 7 * CELL + 2,
      rot: Math.PI,
      kind: "wall",
      label: "Ashgate entrance",
      cutaway: true,
    }),
  );
  const props: Piece[] = [
    piece({ id: "full-chest", url: dungeon("chest_gold"), file: "chest_gold.gltf", pack: "dungeon-remastered", x: 3 * CELL, z: -0.6 * CELL, kind: "vault", label: "Vault chest" }),
    piece({ id: "full-gate", url: dungeon("wall_gated"), file: "wall_gated.gltf", pack: "dungeon-remastered", x: 2 * CELL, z: 0.2 * CELL, rot: Math.PI / 2, kind: "prop", label: "Vault gate" }),
    piece({ id: "full-spike", url: dungeon("floor_tile_big_spikes"), file: "floor_tile_big_spikes.gltf", pack: "dungeon-remastered", x: 5 * CELL, z: 3 * CELL, kind: "trap", trapId: "spike", label: "Spike trap" }),
    piece({ id: "full-pit", url: dungeon("floor_tile_big_grate_open"), file: "floor_tile_big_grate_open.gltf", pack: "dungeon-remastered", x: 1 * CELL, z: 3 * CELL, kind: "trap", trapId: "pit", label: "Pit grate" }),
    piece({ id: "full-cask", url: dungeon("barrel_large"), file: "barrel_large.gltf", pack: "dungeon-remastered", x: 4 * CELL, z: 4 * CELL, kind: "trap", trapId: "cask", label: "Rolling cask" }),
    piece({ id: "full-bait", url: dungeon("plate_food_A"), file: "plate_food_A.gltf", pack: "dungeon-remastered", x: 2 * CELL, z: 4 * CELL, kind: "trap", trapId: "bait", label: "Bait plate" }),
    piece({ id: "full-torch-a", url: dungeon("torch_mounted"), file: "torch_mounted.gltf", pack: "dungeon-remastered", x: 0.4, y: 1.7, z: 2 * CELL, rot: Math.PI / 2, kind: "light", label: "Torch" }),
    piece({ id: "full-torch-b", url: dungeon("torch_mounted"), file: "torch_mounted.gltf", pack: "dungeon-remastered", x: 6 * CELL - 0.3, y: 1.7, z: 4 * CELL, rot: -Math.PI / 2, kind: "light", label: "Torch" }),
    piece({ id: "full-torch-c", url: dungeon("torch_lit"), file: "torch_lit.gltf", pack: "dungeon-remastered", x: 8 * CELL, y: 1.5, z: 2.2 * CELL, kind: "light", label: "Combat torch" }),
    piece({ id: "full-banner", url: dungeon("banner_patternA_red"), file: "banner_patternA_red.gltf", pack: "dungeon-remastered", x: 1 * CELL, z: 1.2 * CELL, kind: "prop", label: "Banner" }),
    piece({ id: "full-pillar", url: dungeon("pillar"), file: "pillar.gltf", pack: "dungeon-remastered", x: 3 * CELL, z: 3 * CELL, kind: "prop", label: "Pillar" }),
    piece({ id: "full-skulls", url: dungeon("rubble_half"), file: "rubble_half.gltf", pack: "dungeon-remastered", x: 9 * CELL, z: 4 * CELL, kind: "prop", label: "Rubble" }),
    piece({ id: "full-coins", url: dungeon("coin_stack_large"), file: "coin_stack_large.gltf", pack: "dungeon-remastered", x: 3.4 * CELL, z: -0.2 * CELL, kind: "prop", label: "Vault coins" }),
    piece({ id: "full-lantern", url: item("lantern"), file: "lantern.gltf", pack: "rpg-tools", x: 4.5 * CELL, y: 0, z: 2 * CELL, kind: "prop", label: "Lantern" }),
    piece({ id: "full-anvil", url: item("anvil"), file: "anvil.gltf", pack: "rpg-tools", x: 8.5 * CELL, z: 4.2 * CELL, kind: "prop", label: "Anvil" }),
  ];
  return [...hall, ...vault, ...combat, ...link, ...corridor, ...props];
}

export const NAV: { id: ScreenId; label: string }[] = [
  { id: "menu", label: "Enter Dungeon" },
  { id: "map", label: "World Map" },
  { id: "market", label: "Marketplace" },
  { id: "workshop", label: "Workshop" },
  { id: "registry", label: "Agent Registry" },
  { id: "chronicle", label: "Replay & Chronicles" },
  { id: "settings", label: "Settings" },
  { id: "gallery", label: "Asset Gallery" },
];
