import { beforeEach, describe, expect, it } from "vitest";

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

const { craftTrap, getState, markDiary, newGame, nextDay, placeTrap, resolvePage, startRaid } = await import("../store");

describe("live raid rules", () => {
  beforeEach(() => {
    newGame();
  });

  it("charges 30 gold for the hall spike and bleeds the vault", () => {
    expect(getState().cinder).toBe(3);
    expect(getState().vault).toBe(1200);
    const placed = placeTrap("spike", 4, 6);
    expect(placed.ok).toBe(true);
    expect(getState().gold).toBe(110);
    startRaid();
    const raid = getState();
    expect(raid.pending?.survived).toBe(false);
    expect(raid.cinder).toBe(4);
    expect(raid.vault).toBeLessThan(1200);
    expect(raid.heroes.kara.facts.some((fact) => fact.memory === "observed")).toBe(true);
  });

  it("burns the page for 2 cinder and does not list a rumour", () => {
    placeTrap("spike", 4, 6);
    startRaid();
    markDiary();
    const burned = resolvePage("burn");
    expect(burned.ok).toBe(true);
    expect(getState().cinder).toBe(2);
    expect(getState().merchants.orrin.rumours).toHaveLength(0);
    expect(getState().heroes.kara.facts.some((fact) => fact.memory === "observed")).toBe(true);
  });

  it("lets a landed page teach only the hero who buys it", () => {
    placeTrap("spike", 4, 6);
    startRaid();
    markDiary();
    resolvePage("escape");
    expect(getState().merchants.orrin.rumours).toHaveLength(1);
    expect(getState().heroes.brann.facts.some((fact) => fact.memory === "warned")).toBe(false);
    nextDay();
    startRaid();
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
