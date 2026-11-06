import { describe, expect, it } from "vitest";
import { HERO_PROFILES } from "../config/heroProfiles";
import { TRAP_DEFINITIONS } from "../config/trapDefinitions";
import { createSave } from "./newGame";
import { applyPurchase, chooseRaider, evaluateHero } from "./decisions";
import { findPath } from "./path";
import { quotePrice } from "./pricing";
import { sameRaid, simulateRaid } from "./raid";
import type { Fact, HeroState } from "./types";

const spike = { id: "s1", trapId: "spike" as const, ix: 4, iz: 6 };

function kara(extra: Partial<HeroState> = {}): HeroState {
  const save = createSave();
  return { ...save.heroes.kara, ...extra };
}

describe("pathing", () => {
  it("walks the center corridor when the spike is unknown", () => {
    const path = findPath([spike], [], HERO_PROFILES.kara);
    expect(path.some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(true);
    expect(path.at(-1)).toEqual({ ix: 4, iz: 0 });
  });

  it("does not detour for a page she only saw, or for a stale epoch", () => {
    const observed: Fact = { id: "eyes", kind: "spike", ix: 4, iz: 6, text: "seen", quality: 3, burned: false, memory: "observed", epoch: 1 };
    const stale: Fact = { id: "old", kind: "spike", ix: 4, iz: 6, text: "old", quality: 3, burned: false, memory: "warned", epoch: 1 };
    expect(findPath([spike], [observed], HERO_PROFILES.kara).some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(true);
    expect(findPath([{ ...spike, epoch: 2 }], [stale], HERO_PROFILES.kara).some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(true);
  });

  it("Kara walks around a spike she knows", () => {
    const fact: Fact = { id: "spike-4,6-d1", kind: "spike", ix: 4, iz: 6, text: "Spike Trap at tile 4, 6.", quality: 3, burned: false };
    const path = findPath([spike], [fact], HERO_PROFILES.kara);
    expect(path.some((cell) => cell.ix === 4 && cell.iz === 6)).toBe(false);
    expect(path.at(-1)).toEqual({ ix: 4, iz: 0 });
  });
});

describe("raid", () => {
  it("kills the fragile first raider on the tutorial spike", () => {
    const result = simulateRaid({ day: 1, seed: 1105, hero: kara(), traps: [spike], tutorial: true });
    expect(result.report.survived).toBe(false);
    expect(result.report.facts.some((fact) => fact.kind === "spike")).toBe(true);
    expect(result.report.events.some((event) => event.type === "death")).toBe(true);
  });

  it("reproduces the same event list for the same inputs", () => {
    const input = { day: 1, seed: 1105, hero: kara(), traps: [spike], tutorial: true };
    const a = simulateRaid(input).report.events;
    const b = simulateRaid(input).report.events;
    expect(sameRaid(a, b)).toBe(true);
  });

  it("lets Kara live when she already knows the spike and can walk around it", () => {
    const fact: Fact = { id: "spike-4,6-d1", kind: "spike", ix: 4, iz: 6, text: "Spike Trap at tile 4, 6.", quality: 3, burned: false };
    const result = simulateRaid({
      day: 2,
      seed: 1105,
      hero: kara({ facts: [fact], hp: 64, maxHp: 64 }),
      traps: [spike],
      tutorial: false,
    });
    expect(result.report.events.some((event) => event.trapId === "spike")).toBe(false);
    expect(result.report.survived).toBe(true);
  });
});

describe("economy", () => {
  it("lowers a price when stock is above target", () => {
    const high = quotePrice("nail", 16);
    const low = quotePrice("nail", 2);
    expect(high.price).toBeLessThan(low.price);
    expect(high.reason).toContain("above the target");
  });

  it("rejects a purchase that the player cannot afford", async () => {
    const { playerBuy } = await import("./decisions");
    const save = createSave();
    save.gold = 1;
    const result = playerBuy(save, "mira", "axe");
    expect(result.ok).toBe(false);
    expect(result.save.gold).toBe(1);
    expect(result.save.merchants.mira.stock.find((line) => line.itemId === "axe")?.qty).toBe(
      createSave().merchants.mira.stock.find((line) => line.itemId === "axe")?.qty,
    );
  });

  it("decreases stock and gold when a purchase succeeds", async () => {
    const { playerBuy } = await import("./decisions");
    const save = createSave();
    const before = save.merchants.tallow.stock.find((line) => line.itemId === "potion")!.qty;
    const result = playerBuy(save, "tallow", "potion");
    expect(result.ok).toBe(true);
    expect(result.save.gold).toBeLessThan(save.gold);
    expect(result.save.inventory.potion).toBe(1);
    expect(result.save.merchants.tallow.stock.find((line) => line.itemId === "potion")!.qty).toBe(before - 1);
  });
});

describe("hero decisions", () => {
  it("Kara accepts a fresh dungeon and the reason uses the same numbers", () => {
    const save = createSave();
    const trace = evaluateHero(save, save.heroes.kara);
    expect(trace.accept).toBe(true);
    expect(trace.reason).toContain(String(trace.reward));
    expect(trace.reason).toContain(trace.danger.toFixed(1));
  });

  it("Kara refuses when known dangers push the score under her threshold", () => {
    const save = createSave();
    const facts: Fact[] = Array.from({ length: 8 }, (_, index) => ({
      id: `spike-fact-${index}`,
      kind: "spike",
      ix: 1,
      iz: 1,
      text: "Spike",
      quality: 3,
      burned: false,
    }));
    const trace = evaluateHero(save, { ...save.heroes.kara, facts });
    expect(trace.accept).toBe(false);
    expect(trace.score).toBeLessThan(HERO_PROFILES.kara.acceptThreshold);
  });

  it("picks an accepting hero for the first day", () => {
    const trace = chooseRaider(createSave());
    expect(trace.accept).toBe(true);
  });

  it("moves Gold to Orrin when Kara buys a rumour and keeps the fact", () => {
    const save = createSave();
    const fact: Fact = { id: "spike-4,6-d1", kind: "spike", ix: 4, iz: 6, text: "Spike Trap at tile 4, 6.", quality: 3, burned: false };
    save.merchants.orrin.rumours = [fact];
    const next = applyPurchase(save, "kara", { merchantId: "orrin", itemId: fact.id, price: 20, reason: "Kara buys the rumour." });
    expect(next.heroes.kara.gold).toBe(save.heroes.kara.gold - 20);
    expect(next.merchants.orrin.gold).toBe(save.merchants.orrin.gold + 20);
    expect(next.heroes.kara.facts.map((entry) => entry.id)).toContain(fact.id);
    expect(next.heroes.kara.facts.find((entry) => entry.id === fact.id)?.memory).toBe("warned");
    expect(next.merchants.orrin.rumours).toHaveLength(0);
  });
});

describe("trap rules", () => {
  it("reads spike damage from the single trap table", () => {
    expect(TRAP_DEFINITIONS.spike.damage).toBe(24);
    expect(TRAP_DEFINITIONS.spike.cost).toBe(30);
  });
});
