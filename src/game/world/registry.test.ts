import { beforeEach, describe, expect, it } from "vitest";
import { PERMIT, RECIPES } from "../../../rules/economy";
import {
  getState,
  hallIdOf,
  leaveWatch,
  newGame,
  placeTrap,
  publishHall,
  resolvePage,
  startRaid,
  switchKeeper,
  triggerTrap,
  unpublishCurrent,
  watchRaid,
} from "../store";
import {
  emptyRegistry,
  getActivity,
  listPublic,
  readRegistry,
  resetRegistry,
  toPublicCard,
  upsertHall,
  type PublicDungeon,
} from "./registry";

const sample = {
  dungeonId: "hall:a",
  ownerId: "a",
  displayName: "Keeper A",
  name: "Ashgate",
  description: "A cold gate.",
  published: true,
  tier: 1,
  state: "OPEN" as const,
  raidCount: 0,
  activeRaidCount: 0,
  heroTraffic: 0,
  lastActivityAt: "2026-11-08T00:00:00.000Z",
  merchantStates: { mira: "OPEN", orrin: "OPEN", tallow: "OPEN" },
  lastRaidSummary: "",
};

describe("public dungeon registry", () => {
  beforeEach(() => {
    resetRegistry(emptyRegistry());
    newGame();
  });

  it("hides drafts and never puts trap coordinates on a public card", () => {
    expect(listPublic(readRegistry()).total).toBe(0);
    const dirty = { ...sample, traps: [{ ix: 4, iz: 6, trapId: "spike" }] } as PublicDungeon & { traps: unknown };
    const card = toPublicCard(dirty);
    expect(JSON.stringify(card)).not.toContain("\"ix\"");
    expect(JSON.stringify(card)).not.toContain("spike");
    expect(card.name).toBe("Ashgate");
  });

  it("lets a second keeper discover a published hall, then hides it when unpublished", () => {
    expect(publishHall("Ashgate", "The ash gate.", "Keeper A").ok).toBe(true);
    const id = hallIdOf(getState());
    expect(listPublic(readRegistry()).halls.map((hall) => hall.dungeonId)).toContain(id);
    expect(JSON.stringify(listPublic(readRegistry()).halls[0])).not.toContain("\"traps\"");
    startRaid();
    expect(getActivity(readRegistry(), id)?.active).toBe(true);
    expect(getActivity(readRegistry(), id)?.events.length).toBeGreaterThan(0);
    switchKeeper("keeper-b", "Keeper B");
    expect(getState().ownerId).toBe("keeper-b");
    const seen = listPublic(readRegistry(), { owner: "Keeper A" });
    expect(seen.halls).toHaveLength(1);
    expect(seen.halls[0].state === "OPEN" || seen.halls[0].state === "CLOSED").toBe(true);
    expect(watchRaid(id).ok).toBe(true);
    expect(getState().spectating).toBe(true);
    expect(placeTrap("spike", 4, 6).ok).toBe(false);
    expect(triggerTrap("missing").ok).toBe(false);
    expect(resolvePage("burn").ok).toBe(false);
    expect(getState().traps).toEqual([]);
    leaveWatch();
    switchKeeper("keeper-local", "Keeper A");
    expect(unpublishCurrent().ok).toBe(true);
    expect(listPublic(readRegistry()).halls.some((hall) => hall.dungeonId === id)).toBe(false);
  });

  it("filters and pages public halls and keeps a closed gate closed", () => {
    let file = emptyRegistry();
    file = upsertHall(file, { ...sample, name: "Ashgate" });
    file = upsertHall(file, { ...sample, dungeonId: "hall:b", ownerId: "b", displayName: "Keeper B", name: "Iron Maw", tier: 2 });
    file = upsertHall(file, { ...sample, dungeonId: "hall:c", ownerId: "c", displayName: "Keeper C", name: "Rotfen", state: "CLOSED", heroTraffic: 4, raidCount: 4 });
    expect(listPublic(file, { owner: "Keeper B" }).halls.map((hall) => hall.name)).toEqual(["Iron Maw"]);
    expect(listPublic(file, { state: "CLOSED" }).halls[0].name).toBe("Rotfen");
    expect(listPublic(file, { tier: 2 }).total).toBe(1);
    expect(listPublic(file, {}, 0, 2).halls).toHaveLength(2);
    expect(listPublic(file, {}, 2, 2).halls).toHaveLength(1);
    const closed = upsertHall(file, { ...sample, dungeonId: "hall:c", ownerId: "c", displayName: "Keeper C", name: "Rotfen", state: "CLOSED", raidCount: 4, heroTraffic: 4 });
    expect(listPublic(closed, { name: "Rotfen" }).halls[0].state).toBe("CLOSED");
  });

  it("keeps the permit price, the split, and the six recipes", () => {
    expect(PERMIT.price).toBe(0.01);
    expect(PERMIT.split).toEqual({ owner: 0.5, agents: 0.3, guild: 0.1, ops: 0.1 });
    expect(RECIPES["play:trap:spike"]).toMatchObject({ iron: 10, bone: 5, cls: "PLAY_ONLY" });
    expect(RECIPES["play:trap:pit"]).toMatchObject({ iron: 20, ash: 10 });
    expect(RECIPES["play:trap:boulder"]).toMatchObject({ iron: 30, bone: 20 });
    expect(RECIPES["play:gear:potion"]).toMatchObject({ ash: 5, bone: 5 });
    expect(RECIPES["play:gear:armor"]).toMatchObject({ iron: 20 });
    expect(RECIPES["play:gear:boots"]).toMatchObject({ iron: 10, ash: 10 });
  });
});
