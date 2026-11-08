import { beforeEach, describe, expect, it } from "vitest";
import { PERMIT } from "../../rules/economy";
import { evaluateHero } from "./engine/decisions";
import { createSave } from "./engine/newGame";
import type { Fact } from "./engine/types";
import {
  acceptRaidOffer,
  counterRaidOffer,
  fundRaidOffer,
  getState,
  newGame,
  refuseRaidOffer,
  reviewOffers,
  startRaid,
  switchKeeper,
} from "./store";
import { emptyRegistry, offersOf, readRegistry, resetRegistry } from "./world/registry";

const warned = (id: string): Fact => ({ id, kind: "spike", ix: 4, iz: 6, text: "A spike waits.", quality: 3, burned: false, memory: "warned" });

describe("raid contract board", () => {
  beforeEach(() => {
    resetRegistry(emptyRegistry());
    newGame();
  });

  it("gives the three heroes different answers from the same warnings", () => {
    const save = createSave("dungeon");
    const facts = Array.from({ length: 8 }, (_, index) => warned(`warn-${index}`));
    for (const id of ["kara", "brann", "ivo"] as const) save.heroes[id] = { ...save.heroes[id], facts };
    const traces = (["kara", "brann", "ivo"] as const).map((id) => evaluateHero(save, save.heroes[id]));
    expect(traces.map((trace) => trace.accept)).toEqual([false, true, true]);
    expect(traces.find((trace) => trace.heroId === "ivo")?.counterShift).toBeGreaterThan(0);
    expect(traces.find((trace) => trace.heroId === "brann")?.counterShift).toBe(0);
  });

  it("settles one offer, refuses a second settle, and refunds an expired offer", async () => {
    expect(getState().near).toBeCloseTo(0.05);
    expect((await fundRaidOffer()).ok).toBe(true);
    expect(getState().near).toBeCloseTo(0.04);
    expect((await fundRaidOffer()).ok).toBe(false);
    const offer = offersOf(readRegistry())[0];
    expect(offer.price).toBe(PERMIT.price);
    expect((await counterRaidOffer("brann")).ok).toBe(false);
    expect((await acceptRaidOffer()).ok).toBe(true);
    expect((await acceptRaidOffer()).ok).toBe(false);
    expect(startRaid()?.ok).toBe(true);
    expect(startRaid()?.ok).toBe(false);
    switchKeeper("keeper-b", "Keeper B");
    expect((await fundRaidOffer()).ok).toBe(true);
    const second = offersOf(readRegistry()).find((entry) => entry.dungeonId === "hall:keeper-b" && entry.status === "OPEN");
    expect(second).toBeTruthy();
    reviewOffers((second?.fundedAt ?? 0) + PERMIT.offerTtlMinutes * 60 * 1000 + 1000);
    expect(offersOf(readRegistry()).find((entry) => entry.id === second?.id)?.status).toBe("EXPIRED_REFUNDED");
    expect(getState().near).toBeGreaterThan(0.04);
    switchKeeper("keeper-local", "Ashgate Keeper");
  });

  it("lets only the hall owner refuse a counter", async () => {
    const save = getState();
    save.heroes.kara.facts = Array.from({ length: 3 }, (_, index) => warned(`k-${index}`));
    expect((await fundRaidOffer()).ok).toBe(true);
    const countered = await counterRaidOffer("kara");
    expect(countered.ok).toBe(true);
    switchKeeper("stranger-c", "Stranger");
    expect((await refuseRaidOffer()).ok).toBe(false);
  });
});
