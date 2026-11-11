import { beforeEach, describe, expect, it } from "vitest";
import { RULES } from "../config/gameRules";

const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => mem.set(key, value),
    removeItem: (key: string) => mem.delete(key),
    clear: () => mem.clear(),
    key: () => null,
    length: 0,
  },
});

const { acceptRaidOffer, craftTrap, fundRaidOffer, getState, markDiary, newGame, nextDay, placeTrap, resolvePage, startRaid } = await import("../store");

async function raid() {
  expect((await fundRaidOffer()).ok).toBe(true);
  expect((await acceptRaidOffer()).ok).toBe(true);
  expect(startRaid()?.ok).toBe(true);
}

describe("live raid rules", () => {
  beforeEach(() => {
    newGame();
  });

  it("charges 30 gold for the hall spike and bleeds the vault", async () => {
    expect(getState().cinder).toBe(3);
    expect(getState().vault).toBe(1200);
    const placed = placeTrap("spike", RULES.spikeTutorialCell.ix, RULES.spikeTutorialCell.iz);
    expect(placed.ok).toBe(true);
    expect(getState().gold).toBe(110);
    await raid();
    const after = getState();
    expect(after.pending?.survived).toBe(false);
    expect(after.cinder).toBe(4);
    expect(after.vault).toBeLessThan(1200);
    expect(after.heroes.kara.facts.some((fact) => fact.memory === "observed")).toBe(true);
  });

  it("burns the page for 2 cinder and does not list a rumour", async () => {
    placeTrap("spike", RULES.spikeTutorialCell.ix, RULES.spikeTutorialCell.iz);
    await raid();
    markDiary();
    const burned = resolvePage("burn");
    expect(burned.ok).toBe(true);
    expect(getState().cinder).toBe(2);
    expect(getState().merchants.orrin.rumours).toHaveLength(0);
    expect(getState().heroes.kara.facts.some((fact) => fact.memory === "observed")).toBe(true);
  });

  it("lets a landed page teach only the hero who buys it", async () => {
    placeTrap("spike", RULES.spikeTutorialCell.ix, RULES.spikeTutorialCell.iz);
    await raid();
    markDiary();
    resolvePage("escape");
    expect(getState().merchants.orrin.rumours).toHaveLength(1);
    expect(getState().heroes.brann.facts.some((fact) => fact.memory === "warned")).toBe(false);
    nextDay();
    await raid();
    const second = getState();
    expect(second.merchants.orrin.rumours).toHaveLength(0);
    expect(second.pending?.heroId).toBe("ivo");
    expect(second.heroes.ivo.facts.some((fact) => fact.memory === "warned")).toBe(true);
    expect(second.heroes.kara.facts.some((fact) => fact.memory === "warned")).toBe(false);
    expect(second.heroes.kara.facts.some((fact) => fact.memory === "observed")).toBe(true);
    expect(second.pending?.trapsTriggered).toHaveLength(0);
  });

  it("crafts a spike from the published iron and bone recipe", () => {
    const crafted = craftTrap("spike");
    expect(crafted.ok).toBe(true);
    expect(getState().inventory.iron).toBe(2);
    expect(getState().inventory.bone).toBe(1);
    expect(getState().inventory.spike).toBe(1);
  });
});
