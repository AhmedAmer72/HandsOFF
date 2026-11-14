import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AGENTS, CINDER_SIM_VARIANTS, EPS, GOODS, PERMIT, PRICE_GUARD, RAID, RUMOUR } from "../rules/economy";
import { canBurn, cinderAfterKill, demandRatio, stockCurve } from "../src/game/rules/money";

type Mark = { buy: boolean; wash: boolean };

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function quote(stock: number, marks: Mark[]) {
  const clean = marks.filter((mark) => !mark.wash);
  const buys = clean.filter((mark) => mark.buy).length;
  const sells = clean.filter((mark) => !mark.buy).length;
  const { d, confidence } = demandRatio(buys, sells, clean.length);
  const good = GOODS["play:resource:iron"];
  const price = stockCurve(good.base, good.target, good.min, good.max, stock, confidence === "low confidence" ? 0 : d);
  return { price, d, confidence, buys, sells };
}

function push(marks: Mark[], mark: Mark) {
  marks.push(mark);
  if (marks.length > 10) marks.shift();
}

function shop(cash: number, stock: number, target: number) {
  if (cash < 0.01 || stock <= 0) return "CLOSED";
  if (cash < 0.02) return "UNDERCAPITALISED";
  if (stock * 2 < target) return "LOW_STOCK";
  return "OPEN";
}

function runBaseline(days: number, raidsPerDay: number, seed: number) {
  const good = GOODS["play:resource:iron"];
  const random = mulberry32(seed);
  let stock = good.target;
  const marks: Mark[] = [];
  const heroes = {
    kara: { near: AGENTS.kara.startNEAR, spent: 0, appetite: AGENTS.kara.rumourAppetite },
    brann: { near: AGENTS.brann.startNEAR, spent: 0, appetite: AGENTS.brann.rumourAppetite },
    ivo: { near: AGENTS.ivo.startNEAR, spent: 0, appetite: AGENTS.ivo.rumourAppetite },
  };
  let permitRevenue = 0;
  let agentShare = 0;
  let rumourBuys = 0;
  const prices: number[] = [];
  const states: string[] = [];
  let mira = AGENTS.merchant.startNEAR;
  for (let day = 1; day <= days; day += 1) {
    for (const hero of Object.values(heroes)) hero.spent = 0;
    for (let raid = 0; raid < raidsPerDay; raid += 1) {
      const permits = random() > 0.15 ? 1 : 0;
      permitRevenue += permits * PERMIT.price;
      agentShare += permits * PERMIT.price * PERMIT.split.agents;
      if (permits) {
        for (const hero of Object.values(heroes)) hero.near += (PERMIT.price * PERMIT.split.agents) / 3;
      }
      for (const hero of Object.values(heroes)) {
        const cost = RUMOUR.base;
        if (permits && random() < hero.appetite && hero.near >= cost && hero.spent + cost <= AGENTS.kara.daily) {
          hero.near -= cost;
          hero.spent += cost;
          rumourBuys += 1;
        }
      }
      const demand = random();
      if (demand > 0.55 && stock > 1) {
        stock -= 1;
        push(marks, { buy: true, wash: false });
        mira += 0.001;
      } else {
        stock += 1;
        push(marks, { buy: false, wash: false });
      }
      const priced = quote(stock, marks);
      prices.push(Number(priced.price.toFixed(4)));
      states.push(shop(mira, stock, good.target));
    }
  }
  const spend = AGENTS.kara.startNEAR * 3 + agentShare - (heroes.kara.near + heroes.brann.near + heroes.ivo.near);
  return { prices, states, permitRevenue, agentShare, agentSpend: Math.max(0, spend), rumourBuys, endStock: stock, heroes };
}

describe("v10.2 economy simulation", () => {
  it("runs 60 days and 1000 raids, then freezes the cinder start value", () => {
    const good = GOODS["play:resource:iron"];
    const baseline = runBaseline(60, 17, 1105);
    expect(baseline.prices.length).toBeGreaterThanOrEqual(1000);
    const atBound = baseline.prices.filter((price) => price <= good.min + 0.001 || price >= good.max - 0.001).length;
    expect(atBound / baseline.prices.length).toBeLessThanOrEqual(0.2);
    expect(Math.min(...baseline.prices)).toBeGreaterThanOrEqual(good.min);
    expect(Math.max(...baseline.prices)).toBeLessThanOrEqual(good.max);
    expect(baseline.agentShare).toBeGreaterThanOrEqual(baseline.agentSpend);

    const flood = quote(200, Array.from({ length: 10 }, (_, index) => ({ buy: index < 2, wash: false })));
    expect(flood.price).toBeGreaterThan(5);
    expect(flood.price).toBeLessThan(6);
    const scarce = quote(1, Array.from({ length: 10 }, () => ({ buy: true, wash: false })));
    expect(scarce.price).toBe(good.max);

    const washed = quote(100, [
      ...Array.from({ length: 8 }, () => ({ buy: true, wash: true })),
      { buy: false, wash: false },
    ]);
    expect(washed.confidence).toBe("low confidence");
    expect(washed.d).toBe(0);

    let cash = 0.05;
    let stock = 40;
    let closed = false;
    let recovered = false;
    const bankruptcy: string[] = [];
    for (let raid = 0; raid < 40; raid += 1) {
      cash = Math.max(0, cash - 0.002);
      stock = Math.max(0, stock - 4);
      let state = shop(cash, stock, good.target);
      if (state === "CLOSED") closed = true;
      if (closed && raid === 30) {
        cash = 0.03;
        stock = 80;
        state = cash >= 0.02 && stock * 2 >= good.target ? "OPEN" : "RECOVERY";
        if (state === "OPEN") recovered = true;
      }
      bankruptcy.push(state);
    }
    expect(closed).toBe(true);
    expect(recovered).toBe(true);
    expect(bankruptcy.includes("CLOSED")).toBe(true);

    const heroes = [
      { id: "kara", near: 0.004, appetite: AGENTS.kara.rumourAppetite },
      { id: "brann", near: 0.001, appetite: AGENTS.brann.rumourAppetite },
      { id: "ivo", near: 0.001, appetite: AGENTS.ivo.rumourAppetite },
    ];
    const bought = heroes.filter((hero) => hero.near >= RUMOUR.base && hero.appetite >= 0.5);
    const depleted = heroes.filter((hero) => hero.near < RUMOUR.base);
    expect(bought.map((hero) => hero.id)).toContain("kara");
    expect(depleted.map((hero) => hero.id)).toContain("brann");

    const cinder = CINDER_SIM_VARIANTS.map((variant) => {
      let held = RAID.cinder.start;
      let burns = 0;
      let lands = 0;
      for (let raid = 0; raid < 1000; raid += 1) {
        held = Math.min(RAID.cinder.cap, held + variant.perKill);
        if (raid % 5 === 0) held = Math.min(RAID.cinder.cap, held + variant.perWaveClear);
        if (held >= variant.burnCost && raid % 2 === 0) {
          held -= variant.burnCost;
          burns += 1;
        } else lands += 1;
      }
      return {
        ...variant,
        burns,
        lands,
        leftover: held,
        killPaysForBurn: variant.perKill >= variant.burnCost && variant.burnCost > 0,
      };
    });
    const chosen = cinder.find((variant) => !variant.killPaysForBurn && variant.burnCost === 2 && variant.perKill === 1);
    expect(chosen).toBeTruthy();
    expect(canBurn(cinderAfterKill(0))).toBe(false);

    const report = {
      label: "SIMULATED",
      source: "rules/economy.ts",
      days: 60,
      raids: baseline.prices.length,
      eps: EPS,
      beta: 0.3,
      minSample: PRICE_GUARD.MIN_SAMPLE,
      permitPrice: PERMIT.price,
      baseline: {
        permitRevenue: baseline.permitRevenue,
        agentShare: baseline.agentShare,
        agentSpend: baseline.agentSpend,
        rumourBuys: baseline.rumourBuys,
        endStock: baseline.endStock,
        minPrice: Math.min(...baseline.prices),
        maxPrice: Math.max(...baseline.prices),
        boundShare: atBound / baseline.prices.length,
      },
      scenarios: {
        floodPrice: flood.price,
        scarcePrice: scarce.price,
        washDemand: washed.d,
        bankruptcyClosed: true,
        bankruptcyRecovered: true,
        lowPermitDaysShare: 0.15,
        depletedHero: "brann",
      },
      cinderVariants: cinder,
      decision: {
        parameter: "RAID.cinder",
        chosen: { burnCost: 2, perKill: 1, perWaveClear: 0, cap: 5, start: 3 },
        reason: "A kill adds 1 Cinder and a burn costs 2, so a kill cannot fund its own burn. The burn-cost-1 variant fails that test. The wave-clear variant removes the per-kill trickle the raid already uses. Keep the v10.2 start value.",
      },
    };
    mkdirSync("docs/sim", { recursive: true });
    writeFileSync("docs/sim/economy-60d.json", JSON.stringify(report, null, 2));
    writeFileSync("docs/sim/cinder-decision.json", JSON.stringify(report.decision, null, 2));
    const width = 640;
    const height = 180;
    const step = Math.max(1, Math.floor(baseline.prices.length / width));
    const points = baseline.prices.filter((_, index) => index % step === 0).map((price, index) => {
      const x = (index / (width - 1)) * width;
      const y = height - ((price - good.min) / (good.max - good.min)) * (height - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    writeFileSync("docs/sim/economy-60d.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#14110e"/><polyline fill="none" stroke="#e2b657" stroke-width="2" points="${points.join(" ")}"/></svg>`);
  });
});
