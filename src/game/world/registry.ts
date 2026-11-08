/** Shared public dungeon registry. Drafts and trap layouts never enter this file. */

export interface MerchantPublicState {
  mira: string;
  orrin: string;
  tallow: string;
}

export interface PublicDungeon {
  dungeonId: string;
  ownerId: string;
  displayName: string;
  name: string;
  description: string;
  published: boolean;
  tier: number;
  state: "OPEN" | "CLOSED";
  raidCount: number;
  activeRaidCount: number;
  heroTraffic: number;
  lastActivityAt: string;
  merchantStates: MerchantPublicState;
  pad: number;
  lastRaidSummary: string;
}

export interface PublicRaidEvent {
  tick: number;
  type: string;
  text: string;
  ix?: number;
  iz?: number;
}

export interface PublicActivity {
  dungeonId: string;
  active: boolean;
  heroId: string | null;
  events: PublicRaidEvent[];
  outcomeHash: string | null;
  finished: boolean;
  updatedAt: string;
}

export interface RegistryFile {
  dungeons: PublicDungeon[];
  activity: PublicActivity[];
}

export interface HallQuery {
  name?: string;
  owner?: string;
  tier?: number | "any";
  state?: "OPEN" | "CLOSED" | "any";
  activity?: "active" | "quiet" | "any";
}

/** Pointy-top KayKit hex. Flat-to-flat is 2, point-to-point is about 2.31. */
const HEX_RADIUS = 1.1547005383792515;

export function hexCenter(col: number, row: number) {
  const x = Math.sqrt(3) * HEX_RADIUS * (col + ((row & 1) === 1 ? 0.5 : 0));
  const z = HEX_RADIUS * 1.5 * row;
  return { x, z };
}

/** Landmark hexes on the island. These are places, not dungeon names. */
const LANDMARKS = [
  { id: "castle", col: 4, row: 3 },
  { id: "tower", col: 6, row: 2 },
  { id: "mine", col: 2, row: 4 },
  { id: "tavern", col: 5, row: 4 },
  { id: "church", col: 2, row: 2 },
  { id: "mill", col: 6, row: 4 },
  { id: "home", col: 3, row: 5 },
  { id: "smith", col: 3, row: 2 },
] as const;

export const WORLD_PADS = LANDMARKS.map((place) => ({ id: place.id, ...hexCenter(place.col, place.row) }));

export function emptyRegistry(): RegistryFile {
  return { dungeons: [], activity: [] };
}

export function padIndex(dungeonId: string, taken: Set<number>) {
  let hash = 2166136261;
  for (let index = 0; index < dungeonId.length; index += 1) {
    hash ^= dungeonId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const start = (hash >>> 0) % WORLD_PADS.length;
  for (let step = 0; step < WORLD_PADS.length; step += 1) {
    const index = (start + step) % WORLD_PADS.length;
    if (!taken.has(index)) return index;
  }
  return start;
}

export function padPosition(pad: number) {
  const base = WORLD_PADS[pad] ?? WORLD_PADS[pad % WORLD_PADS.length];
  const overflow = Math.floor(pad / WORLD_PADS.length);
  return { x: base.x + overflow * 3, z: base.z + overflow * 3 };
}

export function toPublicCard(hall: PublicDungeon): PublicDungeon {
  return {
    dungeonId: hall.dungeonId,
    ownerId: hall.ownerId,
    displayName: hall.displayName,
    name: hall.name,
    description: hall.description,
    published: hall.published,
    tier: hall.tier,
    state: hall.state,
    raidCount: hall.raidCount,
    activeRaidCount: hall.activeRaidCount,
    heroTraffic: hall.heroTraffic,
    lastActivityAt: hall.lastActivityAt,
    merchantStates: { ...hall.merchantStates },
    pad: hall.pad,
    lastRaidSummary: hall.lastRaidSummary,
  };
}

export function upsertHall(file: RegistryFile, hall: Omit<PublicDungeon, "pad"> & { pad?: number }, now = new Date().toISOString()): RegistryFile {
  const current = file.dungeons.find((entry) => entry.dungeonId === hall.dungeonId);
  const taken = new Set(file.dungeons.filter((entry) => entry.dungeonId !== hall.dungeonId).map((entry) => entry.pad));
  const pad = current?.pad ?? hall.pad ?? padIndex(hall.dungeonId, taken);
  const next = toPublicCard({
    ...hall,
    published: true,
    pad,
    lastActivityAt: hall.lastActivityAt || now,
    description: hall.description ?? "",
    lastRaidSummary: hall.lastRaidSummary ?? "",
  });
  return {
    dungeons: [...file.dungeons.filter((entry) => entry.dungeonId !== hall.dungeonId), next],
    activity: file.activity,
  };
}

export function unpublishHall(file: RegistryFile, dungeonId: string): RegistryFile {
  return {
    dungeons: file.dungeons.filter((entry) => entry.dungeonId !== dungeonId),
    activity: file.activity.filter((entry) => entry.dungeonId !== dungeonId),
  };
}

export function listPublic(file: RegistryFile, query: HallQuery = {}, offset = 0, limit = 12) {
  const name = (query.name ?? "").trim().toLowerCase();
  const owner = (query.owner ?? "").trim().toLowerCase();
  const halls = file.dungeons
    .filter((hall) => hall.published)
    .filter((hall) => !name || hall.name.toLowerCase().includes(name) || hall.dungeonId.toLowerCase().includes(name))
    .filter((hall) => !owner || hall.displayName.toLowerCase().includes(owner) || hall.ownerId.toLowerCase().includes(owner))
    .filter((hall) => query.tier == null || query.tier === "any" || hall.tier === query.tier)
    .filter((hall) => !query.state || query.state === "any" || hall.state === query.state)
    .filter((hall) => query.activity !== "active" || hall.activeRaidCount > 0)
    .filter((hall) => query.activity !== "quiet" || hall.activeRaidCount === 0)
    .map((hall) => toPublicCard(hall))
    .sort((a, b) => a.name.localeCompare(b.name) || a.dungeonId.localeCompare(b.dungeonId));
  return { halls: halls.slice(offset, offset + limit), total: halls.length };
}

export function beginActivity(file: RegistryFile, activity: PublicActivity): RegistryFile {
  return {
    dungeons: file.dungeons.map((hall) => hall.dungeonId === activity.dungeonId
      ? { ...hall, activeRaidCount: activity.active ? 1 : 0, lastActivityAt: activity.updatedAt }
      : hall),
    activity: [...file.activity.filter((entry) => entry.dungeonId !== activity.dungeonId), activity],
  };
}

export function endActivity(file: RegistryFile, dungeonId: string, summary: string, now = new Date().toISOString()): RegistryFile {
  return {
    dungeons: file.dungeons.map((hall) => hall.dungeonId === dungeonId
      ? { ...hall, activeRaidCount: 0, lastRaidSummary: summary, lastActivityAt: now }
      : hall),
    activity: file.activity.map((entry) => entry.dungeonId === dungeonId
      ? { ...entry, active: false, finished: true, updatedAt: now }
      : entry),
  };
}

export function getActivity(file: RegistryFile, dungeonId: string) {
  return file.activity.find((entry) => entry.dungeonId === dungeonId) ?? null;
}

const KEY = "underrealm-public-registry-v1";

let current = emptyRegistry();

function persist(file: RegistryFile) {
  current = file;
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(file));
  } catch {
    // The in-memory registry still serves this session.
  }
}

export function loadRegistry() {
  try {
    if (typeof localStorage === "undefined") return current;
    const raw = localStorage.getItem(KEY);
    if (!raw) return current;
    const parsed = JSON.parse(raw) as RegistryFile;
    if (!parsed || !Array.isArray(parsed.dungeons) || !Array.isArray(parsed.activity)) return current;
    current = parsed;
  } catch {
    // Keep the last good copy.
  }
  return current;
}

export function readRegistry() {
  return current;
}

export function writeRegistry(file: RegistryFile) {
  persist(file);
  return current;
}

export function resetRegistry(file = emptyRegistry()) {
  persist(file);
}
