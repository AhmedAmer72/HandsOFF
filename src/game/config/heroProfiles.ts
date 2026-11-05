import { heroModel, weapon, type HeroId } from "../content";

export interface HeroProfile {
  id: HeroId;
  name: string;
  role: string;
  model: string;
  modelFile: string;
  weapon?: string;
  weaponFile?: string;
  personality: string;
  /** Higher means the hero treats danger as more costly. */
  riskAversion: number;
  /** Utility score required before the hero accepts a raid. */
  acceptThreshold: number;
  greed: number;
  caution: number;
  maxHp: number;
  attack: number;
  armor: number;
  fleeAt: number;
  startingGold: number;
  spendCap: number;
  prefers: string[];
  buysRumours: boolean;
}

export const HERO_PROFILES: Record<HeroId, HeroProfile> = {
  kara: {
    id: "kara",
    name: "Kara",
    role: "Rogue",
    model: heroModel("Rogue"),
    modelFile: "Rogue.glb",
    weapon: weapon("dagger"),
    weaponFile: "dagger.gltf",
    personality: "Agile. She spends on information and walks around tiles she has learned to fear.",
    riskAversion: 1.55,
    acceptThreshold: 8,
    greed: 4,
    caution: 6,
    maxHp: 64,
    attack: 10,
    armor: 2,
    fleeAt: 0.45,
    startingGold: 80,
    spendCap: 36,
    prefers: ["potion"],
    buysRumours: true,
  },
  brann: {
    id: "brann",
    name: "Brann",
    role: "Warrior",
    model: heroModel("Barbarian"),
    modelFile: "Barbarian.glb",
    weapon: weapon("axe_2handed"),
    weaponFile: "axe_2handed.gltf",
    personality: "Aggressive. He accepts physical risk and spends on heavy gear.",
    riskAversion: 0.72,
    acceptThreshold: 4,
    greed: 8,
    caution: 1,
    maxHp: 110,
    attack: 16,
    armor: 6,
    fleeAt: 0.15,
    startingGold: 70,
    spendCap: 48,
    prefers: ["axe", "sword"],
    buysRumours: false,
  },
  ivo: {
    id: "ivo",
    name: "Ivo",
    role: "Mage",
    model: heroModel("Mage"),
    modelFile: "Mage.glb",
    weapon: weapon("staff"),
    weaponFile: "staff.gltf",
    personality: "Analytical. He prepares with a staff and pays for rumours before he walks in.",
    riskAversion: 1.25,
    acceptThreshold: 6,
    greed: 2,
    caution: 5,
    maxHp: 72,
    attack: 13,
    armor: 3,
    fleeAt: 0.35,
    startingGold: 90,
    spendCap: 40,
    prefers: ["staff", "potion"],
    buysRumours: true,
  },
};

export const HERO_ORDER: HeroId[] = ["kara", "brann", "ivo"];
