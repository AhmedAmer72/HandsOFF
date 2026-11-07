import { heroModel, weapon, type HeroId } from "../content";
import { AGENTS } from "../../../rules/economy";

export interface HeroProfile {
  id: HeroId;
  name: string;
  role: string;
  model: string;
  modelFile: string;
  weapon?: string;
  weaponFile?: string;
  personality: string;
  /** v10.2 risk tolerance. Higher means the hero accepts more danger. */
  risk: number;
  /** Higher means the hero treats danger as more costly. Derived from `risk`. */
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
  /** How much a fresh rumour adds to this hero's utility. From the v10.2 agent table. */
  rumourAppetite: number;
  /** Mock contract purse from the v10.2 table. The hall spends play Gold, not this balance. */
  nearStart: number;
  maxSingle: number;
  daily: number;
  /** World units per second. A floor tile is 4 units. */
  moveSpeed: number;
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
    risk: AGENTS.kara.risk,
    riskAversion: Number(((1 - AGENTS.kara.risk) * 1.25).toFixed(3)),
    acceptThreshold: 8,
    greed: 4,
    caution: 6,
    maxHp: 64,
    attack: 10,
    armor: 2,
    fleeAt: 0.45,
    startingGold: 80,
    spendCap: 36,
    prefers: ["potion", "torch"],
    buysRumours: true,
    rumourAppetite: AGENTS.kara.rumourAppetite,
    nearStart: AGENTS.kara.startNEAR,
    maxSingle: AGENTS.kara.maxSingle,
    daily: AGENTS.kara.daily,
    moveSpeed: 6.4,
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
    risk: AGENTS.brann.risk,
    riskAversion: Number(((1 - AGENTS.brann.risk) * 1.25).toFixed(3)),
    acceptThreshold: 4,
    greed: 8,
    caution: 1,
    maxHp: 110,
    attack: 16,
    armor: 6,
    fleeAt: 0.15,
    startingGold: 70,
    spendCap: 48,
    prefers: ["armor"],
    buysRumours: false,
    rumourAppetite: AGENTS.brann.rumourAppetite,
    nearStart: AGENTS.brann.startNEAR,
    maxSingle: AGENTS.brann.maxSingle,
    daily: AGENTS.brann.daily,
    moveSpeed: 4.4,
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
    risk: AGENTS.ivo.risk,
    riskAversion: Number(((1 - AGENTS.ivo.risk) * 1.25).toFixed(3)),
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
    rumourAppetite: AGENTS.ivo.rumourAppetite,
    nearStart: AGENTS.ivo.startNEAR,
    maxSingle: AGENTS.ivo.maxSingle,
    daily: AGENTS.ivo.daily,
    moveSpeed: 5.2,
  },
};

export const HERO_ORDER: HeroId[] = ["kara", "brann", "ivo"];
