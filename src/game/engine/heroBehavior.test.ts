import { describe, expect, it } from "vitest";
import { HERO_PROFILES } from "../config/heroProfiles";
import { RULES } from "../config/gameRules";
import { createSave } from "./newGame";
import { chooseRaider, evaluateHero } from "./decisions";
import { findPath } from "./path";
import { simulateRaid } from "./raid";
import type { Fact } from "./types";

const spike = { id: "s1", trapId: "spike" as const, ix: RULES.spikeTutorialCell.ix, iz: RULES.spikeTutorialCell.iz };
const rumour: Fact = {
  id: "spike-door",
  kind: "spike",
  ix: RULES.spikeTutorialCell.ix,
  iz: RULES.spikeTutorialCell.iz,
  text: "Spike at the vault door.",
  quality: 3,
  burned: false,
  epoch: 1,
  bornDay: 1,
  memory: "unseen",
  source: "landed",
};

describe("distinct hero behavior", () => {
  it("gives the fresh rumour to Ivo and leaves Brann unaware", () => {
    const save = createSave();
    save.day = 2;
    save.merchants.orrin.rumours = [rumour];
    save.heroes.kara.facts = [{ ...rumour, id: "eyes", memory: "observed", source: "eyes" }];
    const traces = (["kara", "brann", "ivo"] as const).map((id) => evaluateHero(save, save.heroes[id]));
    const ivo = traces.find((trace) => trace.heroId === "ivo")!;
    const kara = traces.find((trace) => trace.heroId === "kara")!;
    const brann = traces.find((trace) => trace.heroId === "brann")!;
    expect(ivo.purchase?.merchantId).toBe("orrin");
    expect(brann.purchase?.merchantId).not.toBe("orrin");
    expect(ivo.score).toBeGreaterThan(kara.score);
    expect(chooseRaider(save).heroId).toBe("ivo");
    expect(kara.reason).toContain("0.3");
    expect(brann.reason).toContain("0.8");
    expect(ivo.reason).toContain("0.9");
    expect(ivo.reason).toContain("rumour they are buying");
    expect(brann.reason).toContain("Mail Coat");
    expect(brann.purchase?.itemId).toBe("armor");
    expect(brann.accept).toBe(true);
    expect(kara.counterShift).toBe(0.05);
    expect(brann.counterShift).toBe(0);
  });

  it("walks Ivo around a warning and lets Brann take the spike", () => {
    const warned: Fact = { ...rumour, memory: "warned", source: "bought rumour" };
    const ivoPath = findPath([spike], [warned], HERO_PROFILES.ivo);
    const brannPath = findPath([spike], [], HERO_PROFILES.brann);
    const karaPath = findPath([spike], [{ ...rumour, memory: "observed", source: "eyes" }], HERO_PROFILES.kara);
    expect(ivoPath.some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(false);
    expect(brannPath.some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(true);
    expect(karaPath.some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(true);
  });

  it("refuses the same offer for Kara and accepts it for Brann", () => {
    const save = createSave();
    const facts: Fact[] = Array.from({ length: 8 }, (_, index) => ({
      id: `spike-fact-${index}`,
      kind: "spike",
      ix: 1,
      iz: index,
      text: "Spike",
      quality: 3,
      burned: false,
      dungeonId: "ashgate",
      epoch: 1,
      memory: "warned" as const,
      source: "bought rumour",
    }));
    const kara = evaluateHero(save, { ...save.heroes.kara, facts });
    const brann = evaluateHero(save, save.heroes.brann);
    expect(kara.accept).toBe(false);
    expect(brann.accept).toBe(true);
    expect(kara.score).not.toBe(brann.score);
  });

  it("lets bait pull Brann onto a trap he already dodged", () => {
    const dodged: Fact = { ...rumour, memory: "dodged", source: "previous raid" };
    const bait = { id: "b1", trapId: "bait" as const, ix: 3, iz: 5 };
    expect(findPath([spike, bait], [dodged], HERO_PROFILES.brann).some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(true);
    expect(findPath([spike, bait], [dodged], HERO_PROFILES.kara).some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(false);
    expect(findPath([spike], [dodged], HERO_PROFILES.brann).some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(false);
  });

  it("ignores a warning from another dungeon", () => {
    const foreign: Fact = { ...rumour, memory: "warned", source: "bought rumour", dungeonId: "otherhall" };
    const path = findPath([spike], [foreign], HERO_PROFILES.ivo);
    expect(path.some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(true);
  });

  it("marks a survived warning as dodged, and armor as countered", () => {
    const save = createSave();
    const warned: Fact = { ...rumour, ix: RULES.grid.vault.ix, iz: RULES.grid.vault.iz, id: "spike-vault", text: "Spike on the chest.", memory: "warned", source: "bought rumour", epoch: 1, dungeonId: "ashgate" };
    const vaultSpike = { id: "vault", trapId: "spike" as const, ix: RULES.grid.vault.ix, iz: RULES.grid.vault.iz, epoch: 1 };
    const dodged = simulateRaid({ day: 2, seed: 3, hero: { ...save.heroes.ivo, facts: [{ ...warned }] }, traps: [vaultSpike], tutorial: false });
    expect(dodged.hero.facts.find((fact) => fact.id === warned.id)?.memory).toBe("dodged");
    const countered = simulateRaid({ day: 2, seed: 3, hero: { ...save.heroes.brann, facts: [{ ...warned }], equipment: ["armor"] }, traps: [vaultSpike], tutorial: false });
    expect(countered.hero.facts.find((fact) => fact.id === warned.id)?.memory).toBe("countered");
    expect(countered.hero.facts.find((fact) => fact.id === warned.id)?.source).toBe("gear");
  });

  it("sends a stale warning back to the short path", () => {
    const stale: Fact = { ...rumour, memory: "warned", epoch: 1 };
    const path = findPath([{ ...spike, epoch: 2 }], [stale], HERO_PROFILES.ivo);
    expect(path.some((cell) => cell.ix === spike.ix && cell.iz === spike.iz)).toBe(true);
  });
});
