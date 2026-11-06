import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CINDER_SIM_VARIANTS, GOODS, RAID } from "../rules/economy";
import { canBurn, cinderAfterKill, stockPrice } from "../src/game/rules/money";

describe("simulated 60-day play-iron book", () => {
  it("runs at least 1000 cycles and records a closure and a recovery", () => {
    const iron = GOODS["play:resource:iron"];
    let stock = iron.target;
    let closures = 0;
    let recoveries = 0;
    let closed = false;
    let closedRaids = 0;
    const path: number[] = [];
    for (let day = 1; day <= 60; day++) {
      for (let raid = 0; raid < 17; raid++) {
        const bust = day >= 20 && day <= 27;
        const buys = bust ? 12 : 2 + (raid % 3);
        const sells = bust ? 0 : day % 11 === 0 ? 14 : 3;
        stock = Math.max(1, stock + sells - buys);
        if (day === 28 && raid === 0 && closed) {
          stock = 80;
          closed = false;
          recoveries += 1;
        }
        const quote = stockPrice("play:resource:iron", stock, buys, sells, buys + sells);
        path.push(Number(quote.price.toFixed(2)));
        if (stock < 8 && !closed) {
          closed = true;
          closures += 1;
        }
        if (closed) closedRaids += 1;
        if (closed && stock > 40) {
          closed = false;
          recoveries += 1;
          stock = 80;
        }
      }
    }
    const cinder = CINDER_SIM_VARIANTS.map((variant) => {
      let held = RAID.cinder.start;
      let burns = 0;
      for (let n = 0; n < 60; n++) {
        held = Math.min(RAID.cinder.cap, held + variant.perKill + variant.perWaveClear);
        if (held >= variant.burnCost) {
          held -= variant.burnCost;
          burns += 1;
        }
      }
      return { ...variant, burns, leftover: held, killPaysForBurn: variant.perKill >= variant.burnCost };
    });
    const out = {
      label: "SIMULATED",
      source: "rules/economy.ts",
      days: 60,
      raids: path.length,
      closures,
      recoveries,
      closedRaids,
      endPrice: path.at(-1),
      min: Math.min(...path),
      max: Math.max(...path),
      liveCinder: { start: RAID.cinder.start, burnCost: RAID.cinder.burnCost, afterOneKillFromEmpty: cinderAfterKill(0), killAlonePaysForBurn: canBurn(cinderAfterKill(0)) },
      cinderVariants: cinder,
      note: "Play Gold only. NEAR reserves, permits, and deeds are not settled here.",
    };
    mkdirSync("docs/sim", { recursive: true });
    writeFileSync("docs/sim/economy-60d.json", JSON.stringify(out, null, 2));
    expect(path.length).toBeGreaterThanOrEqual(1000);
    expect(closures).toBeGreaterThan(0);
    expect(recoveries).toBeGreaterThan(0);
    expect(out.min).toBeGreaterThanOrEqual(iron.min);
    expect(out.max).toBeLessThanOrEqual(iron.max);
    expect(out.liveCinder.killAlonePaysForBurn).toBe(false);
  });
});
