import { PERMIT } from "../../../rules/economy";
import { permitSplit } from "../rules/money";

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

export interface BoardOffer {
  id: string;
  dungeonId: string;
  funderId: string;
  price: number;
  split: { owner: number; agents: number; guild: number; ops: number };
  status: "OPEN" | "COUNTER_PENDING" | "SETTLED" | "EXPIRED_REFUNDED";
  countered: boolean;
  counterHeroId?: string;
  escrow: number;
  fundedAt: number;
  slotsAtFund: number | null;
  consumed: boolean;
}

export interface RegistryFile {
  dungeons: PublicDungeon[];
  activity: PublicActivity[];
  offers: BoardOffer[];
}

export interface HallQuery {
  name?: string;
  owner?: string;
  tier?: number | "any";
  state?: "OPEN" | "CLOSED" | "any";
  activity?: "active" | "quiet" | "any";
  sort?: "recent" | "raids" | "tier-desc" | "tier-asc" | "name";
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
  { id: "west-wood", col: 2, row: 7 },
  { id: "north-ridge", col: 9, row: 2 },
  { id: "south-march", col: 5, row: 11 },
  { id: "east-watch", col: 11, row: 5 },
  { id: "old-mine", col: 3, row: 10 },
  { id: "far-tower", col: 10, row: 10 },
  { id: "lake-fort", col: 12, row: 4 },
  { id: "low-camp", col: 1, row: 4 },
] as const;

export const WORLD_PADS = LANDMARKS.map((place) => ({ id: place.id, ...hexCenter(place.col, place.row) }));

export function emptyRegistry(): RegistryFile {
  return { dungeons: [], activity: [], offers: [] };
}

export function offersOf(file: RegistryFile) {
  return file.offers ?? [];
}

/** Spectator copies keep the step and the words. Tile numbers stay off the board. */
export function publicEvents(events: PublicRaidEvent[]): PublicRaidEvent[] {
  return events.map((event) => ({
    tick: event.tick,
    type: event.type,
    text: event.text.replace(/\d+\s*,\s*\d+/g, "a tile"),
  }));
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
    offers: offersOf(file),
  };
}

export function unpublishHall(file: RegistryFile, dungeonId: string): RegistryFile {
  return {
    dungeons: file.dungeons.filter((entry) => entry.dungeonId !== dungeonId),
    activity: file.activity.filter((entry) => entry.dungeonId !== dungeonId),
    offers: offersOf(file).filter((offer) => offer.dungeonId !== dungeonId),
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
    .sort((a, b) => compareHalls(a, b, query.sort ?? "name"));
  return { halls: halls.slice(offset, offset + limit), total: halls.length };
}

export function beginActivity(file: RegistryFile, activity: PublicActivity): RegistryFile {
  const safe = { ...activity, events: publicEvents(activity.events) };
  return {
    dungeons: file.dungeons.map((hall) => hall.dungeonId === safe.dungeonId
      ? { ...hall, activeRaidCount: safe.active ? 1 : 0, lastActivityAt: safe.updatedAt }
      : hall),
    activity: [...file.activity.filter((entry) => entry.dungeonId !== safe.dungeonId), safe],
    offers: offersOf(file),
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
    offers: offersOf(file),
  };
}

function compareHalls(a: PublicDungeon, b: PublicDungeon, sort: NonNullable<HallQuery["sort"]>) {
  if (sort === "recent") return b.lastActivityAt.localeCompare(a.lastActivityAt) || a.name.localeCompare(b.name);
  if (sort === "raids") return b.raidCount - a.raidCount || a.name.localeCompare(b.name);
  if (sort === "tier-desc") return b.tier - a.tier || a.name.localeCompare(b.name);
  if (sort === "tier-asc") return a.tier - b.tier || a.name.localeCompare(b.name);
  return a.name.localeCompare(b.name) || a.dungeonId.localeCompare(b.dungeonId);
}

function withOffers(file: RegistryFile, offers: BoardOffer[]): RegistryFile {
  return { ...file, offers };
}

export function fundRecord(file: RegistryFile, input: { dungeonId: string; funderId: string; slotsAtFund: number | null; now?: number }) {
  const live = offersOf(file).find((offer) => offer.dungeonId === input.dungeonId && !offer.consumed && offer.status !== "EXPIRED_REFUNDED");
  if (live) return { file, offer: live, ok: false, reason: "An offer is already open for this hall. Nothing more was taken." };
  const now = input.now ?? Date.now();
  const offer: BoardOffer = {
    id: `offer-${input.dungeonId}-${now}`,
    dungeonId: input.dungeonId,
    funderId: input.funderId,
    price: PERMIT.price,
    split: { ...PERMIT.split },
    status: "OPEN",
    countered: false,
    escrow: PERMIT.price,
    fundedAt: now,
    slotsAtFund: input.slotsAtFund,
    consumed: false,
  };
  return {
    file: withOffers(file, [...offersOf(file), offer]),
    offer,
    ok: true,
    reason: "Offer funded from the mock purse. The price stays 0.01. This is not a chain payment.",
  };
}

export function counterRecord(file: RegistryFile, offerId: string, heroId: string, shift: number) {
  const offer = offersOf(file).find((entry) => entry.id === offerId);
  if (!offer || offer.status !== "OPEN") return { file, ok: false, reason: "That offer is not open." };
  if (offer.countered) return { file, ok: false, reason: "A counter already happened." };
  const next = permitSplit(shift);
  if (!next.legal) return { file, ok: false, reason: "The split is outside the allowed range. The price was not changed." };
  const updated: BoardOffer = { ...offer, split: next.split, countered: true, status: "COUNTER_PENDING", counterHeroId: heroId };
  return {
    file: withOffers(file, offersOf(file).map((entry) => entry.id === offerId ? updated : entry)),
    ok: true,
    reason: "The price stays 0.01. The split moved toward the heroes.",
  };
}

export function refuseRecord(file: RegistryFile, offerId: string) {
  const offer = offersOf(file).find((entry) => entry.id === offerId);
  if (!offer || offer.status !== "COUNTER_PENDING") return { file, ok: false, reason: "There is no counter to refuse." };
  const updated: BoardOffer = { ...offer, split: { ...PERMIT.split }, status: "OPEN" };
  return {
    file: withOffers(file, offersOf(file).map((entry) => entry.id === offerId ? updated : entry)),
    ok: true,
    reason: "The counter is refused. The original split stands. The price was not changed.",
  };
}

export function settleRecord(file: RegistryFile, offerId: string) {
  const offer = offersOf(file).find((entry) => entry.id === offerId);
  if (!offer || (offer.status !== "OPEN" && offer.status !== "COUNTER_PENDING")) return { file, ok: false, reason: "That offer cannot be accepted." };
  const updated: BoardOffer = { ...offer, status: "SETTLED", escrow: 0 };
  return {
    file: withOffers(file, offersOf(file).map((entry) => entry.id === offerId ? updated : entry)),
    offer: updated,
    ok: true,
    reason: "The offer is settled. The permit can be used once.",
  };
}

export function expireRecord(file: RegistryFile, offerId: string) {
  const offer = offersOf(file).find((entry) => entry.id === offerId);
  if (!offer || offer.status === "SETTLED" || offer.status === "EXPIRED_REFUNDED") return { file, ok: false, refund: 0, reason: "Nothing to refund." };
  const refund = offer.escrow;
  const updated: BoardOffer = { ...offer, status: "EXPIRED_REFUNDED", escrow: 0 };
  return {
    file: withOffers(file, offersOf(file).map((entry) => entry.id === offerId ? updated : entry)),
    ok: true,
    refund,
    funderId: offer.funderId,
    reason: "The offer expired. The full mock purse amount is refunded. Nothing was sent on a chain.",
  };
}

export function consumeRecord(file: RegistryFile, offerId: string) {
  const offer = offersOf(file).find((entry) => entry.id === offerId);
  if (!offer || offer.status !== "SETTLED" || offer.consumed) return { file, ok: false, reason: "That permit cannot be used." };
  const updated: BoardOffer = { ...offer, consumed: true };
  return {
    file: withOffers(file, offersOf(file).map((entry) => entry.id === offerId ? updated : entry)),
    ok: true,
    reason: "The permit is consumed.",
  };
}

export function offerExpired(offer: BoardOffer, now: number, raidsCleared: number) {
  if (offer.status === "SETTLED" || offer.status === "EXPIRED_REFUNDED" || offer.consumed) return false;
  const minutes = (now - offer.fundedAt) / 60000;
  const slots = offer.slotsAtFund == null ? 0 : raidsCleared - offer.slotsAtFund;
  return minutes >= PERMIT.offerTtlMinutes || slots >= PERMIT.offerTtlRaidSlots;
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
    current = { dungeons: parsed.dungeons, activity: parsed.activity.map((entry) => ({ ...entry, events: publicEvents(entry.events ?? []) })), offers: offersOf(parsed) };
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

export function adoptRegistry(file: RegistryFile) {
  if (!file || !Array.isArray(file.dungeons) || !Array.isArray(file.activity)) return current;
  persist({
    dungeons: file.dungeons,
    activity: file.activity.map((entry) => ({ ...entry, events: publicEvents(entry.events ?? []) })),
    offers: offersOf(file),
  });
  return current;
}

export async function pullHalls() {
  try {
    const response = await fetch("/api/halls");
    if (!response.ok) return current;
    return adoptRegistry(await response.json() as RegistryFile);
  } catch {
    return current;
  }
}

export async function pushHalls(action: unknown) {
  try {
    const response = await fetch("/api/halls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action),
    });
    if (!response.ok) return current;
    return adoptRegistry(await response.json() as RegistryFile);
  } catch {
    return current;
  }
}
