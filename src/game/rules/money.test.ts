import { describe, expect, it } from "vitest";
import { GOODS, PERMIT, RAID } from "../../../rules/economy";
import { buybackPrice, canBurn, canTrade, cinderAfterKill, craftClass, killPaysForItsOwnBurn, permitSplit, rumourPrice, stockPrice, trapGold } from "./money";

describe("stock price", () => {
  it("matches the flood example: stock 200, two buys, ten sells", () => {
    const quote = stockPrice("play:resource:iron", 200, 2, 10, 12);
    expect(quote.price).toBeCloseTo(5.65, 2);
    expect(quote.currency).toBe("PLAY_GOLD");
    expect(quote.cls).toBe("PLAY_ONLY");
    expect(quote.inputs.d).toBeCloseTo(-0.67, 2);
  });

  it("uses zero demand below the sample floor", () => {
    const quote = stockPrice("play:resource:iron", 200, 2, 10, 3);
    expect(quote.confidence).toBe("low confidence");
    expect(quote.inputs.d).toBe(0);
  });
});

describe("rumour and permits", () => {
  it("prices a tier-2 rumour one epoch old with three requests", () => {
    const quote = rumourPrice(3, 1, 2);
    expect(quote.price).toBeCloseTo(0.00327, 5);
    expect(quote.currency).toBe("NEAR");
  });

  it("keeps the permit price fixed and only shifts the split", () => {
    const base = permitSplit(0);
    const countered = permitSplit(0.05);
    expect(base.price).toBe(0.01);
    expect(countered.price).toBe(base.price);
    expect(base.legal).toBe(true);
    expect(countered.legal).toBe(true);
    expect(countered.split.agents).toBeCloseTo(PERMIT.split.agents + 0.05);
    expect(countered.split.owner + countered.split.agents + countered.split.guild + countered.split.ops).toBeCloseTo(1);
  });

  it("caps buy-back growth", () => {
    expect(buybackPrice(0.002, 1)).toBeCloseTo(0.0025, 5);
    expect(buybackPrice(0.002, 20)).toBeLessThanOrEqual(0.006 + 1e-9);
  });
});

describe("provenance and cinder", () => {
  it("refuses to sell play-only goods for NEAR", () => {
    expect(canTrade("PLAY_ONLY", "NEAR")).toBe(false);
    expect(canTrade("PLAY_ONLY", "PLAY_GOLD")).toBe(true);
    expect(canTrade("NEAR_BACKED", "NEAR")).toBe(true);
    expect(canTrade("NON_TRADEABLE", "PLAY_GOLD")).toBe(false);
    expect(craftClass(["NEAR_BACKED", "PLAY_ONLY"])).toBe("PLAY_ONLY");
  });

  it("does not let one kill pay for its own burn", () => {
    expect(killPaysForItsOwnBurn()).toBe(false);
    expect(cinderAfterKill(RAID.cinder.start)).toBe(4);
    expect(canBurn(1)).toBe(false);
    expect(canBurn(RAID.cinder.burnCost)).toBe(true);
  });

  it("raises trap gold with recent sales and eases a countered trap", () => {
    expect(trapGold(RAID.traps.spike, 0, false)).toBe(30);
    expect(trapGold(RAID.traps.spike, 4, false)).toBeCloseTo(42);
    expect(trapGold(RAID.traps.spike, 4, true)).toBeLessThan(trapGold(RAID.traps.spike, 4, false));
  });
});

describe("goods table", () => {
  it("keeps play iron inside the published bounds", () => {
    const iron = GOODS["play:resource:iron"];
    const flooded = stockPrice("play:resource:iron", 400, 0, 20, 20);
    const scarce = stockPrice("play:resource:iron", 1, 20, 0, 20);
    expect(flooded.price).toBeGreaterThanOrEqual(iron.min);
    expect(scarce.price).toBeLessThanOrEqual(iron.max);
  });
});
