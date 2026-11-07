import { beforeEach, describe, expect, it } from "vitest";
import { GOODS, MERCHANT } from "../../../rules/economy";
import { createSave } from "./newGame";
import { applyPurchase, evaluateHero } from "./decisions";
import { buySale, cancelSale, expireSales, itemClass, listForSale, merchantBuyListing, merchantStatus, recoverMerchant } from "./market";
import { feeSplit, guardPrice, liveQuote, shopState, stockPrice } from "../rules/money";
import { craftClass } from "../rules/money";

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

describe("canonical prices", () => {
  it("keeps the iron flood on the single stock curve", () => {
    const quote = stockPrice("play:resource:iron", 200, 2, 10, 12);
    expect(quote.price).toBeCloseTo(5.65, 2);
    expect(quote.inputs.base).toBe(GOODS["play:resource:iron"].base);
    expect(quote.inputs.target).toBe(100);
    expect(quote.reason).toContain("stock 200");
  });

  it("smooths demand and refuses a jump past the raid guard", () => {
    const first = liveQuote("play:resource:iron", 100, 0, 0, 0);
    const jumped = liveQuote("play:resource:iron", 1, 20, 0, 20, { ema: 0, price: first.price });
    expect(jumped.price).toBeLessThanOrEqual(first.price * 1.10 + 1e-9);
    expect(guardPrice(10, 20)).toBeCloseTo(11);
    expect(jumped.reason).toContain("Smoothed demand");
  });
});

describe("shops", () => {
  it("closes below the published reserve and reopens only with cash and stock", () => {
    const save = createSave();
    save.merchants.mira.near = 0.005;
    expect(merchantStatus(save.merchants.mira)).toBe("CLOSED");
    expect(shopState(0.015, 10, 100, true)).toBe("UNDERCAPITALISED");
    expect(shopState(MERCHANT.reserveNEAR, 10, 100, true)).toBe("LOW_STOCK");
    const short = recoverMerchant(save, "mira", 0.01);
    expect(short.ok).toBe(false);
    const opened = recoverMerchant({ ...save, merchants: { ...save.merchants, mira: { ...save.merchants.mira, near: 0, stock: [] } } }, "mira", 0.02, "play:resource:iron", GOODS["play:resource:iron"].target);
    expect(opened.ok).toBe(true);
    expect(merchantStatus(opened.save.merchants.mira)).toBe("OPEN");
  });
});

describe("player market", () => {
  it("rejects a play-only listing priced in NEAR", () => {
    const save = createSave();
    const result = listForSale(save, "iron", 0.01, "NEAR");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("PLAY_ONLY");
    expect(result.save.inventory.iron).toBe(save.inventory.iron);
  });

  it("escrows a gold listing, cancels it, and returns the stack", () => {
    const save = createSave();
    const listed = listForSale(save, "iron", 4, "PLAY_GOLD");
    expect(listed.ok).toBe(true);
    expect(listed.save.inventory.iron).toBe((save.inventory.iron ?? 0) - 1);
    expect(listed.save.listings[0].status).toBe("LISTED");
    const cancelled = cancelSale(listed.save, listed.save.listings[0].id);
    expect(cancelled.ok).toBe(true);
    expect(cancelled.save.inventory.iron).toBe(save.inventory.iron);
    expect(cancelled.save.listings[0].status).toBe("CANCELLED");
  });

  it("settles 90/5/5, refunds a failed purchase, and expires the escrow", () => {
    const save = createSave();
    const traveler = {
      ...save,
      listings: [{ id: "trav-1", itemId: "iron", seller: "traveler" as const, price: 10, qty: 1, listedDay: save.day, currency: "PLAY_GOLD" as const, cls: "PLAY_ONLY" as const, status: "LISTED" as const }],
    };
    const failed = buySale(traveler, "trav-1", true);
    expect(failed.ok).toBe(false);
    expect(failed.save.gold).toBe(traveler.gold);
    expect(failed.reason).toContain("refunded");
    const bought = buySale(traveler, "trav-1");
    expect(bought.ok).toBe(true);
    const split = feeSplit(10);
    expect(bought.save.gold).toBeCloseTo(traveler.gold - 10);
    expect(bought.save.guildGold).toBeCloseTo(split.guild);
    expect(bought.save.opsGold).toBeCloseTo(split.ops);
    expect(bought.save.travelerGold).toBeCloseTo(split.seller);
    expect(bought.save.inventory.iron).toBe((traveler.inventory.iron ?? 0) + 1);
    expect(bought.save.listings[0].status).toBe("SOLD");
    const listed = listForSale(save, "bone", 6, "PLAY_GOLD");
    const expired = expireSales({ ...listed.save, day: listed.save.day + 1 });
    expect(expired.listings.find((entry) => entry.itemId === "bone")?.status).toBe("EXPIRED");
    expect(expired.inventory.bone).toBe(save.inventory.bone);
  });

  it("lets Mira buy a cheap listing and refuses one she cannot afford", () => {
    const save = createSave();
    const listed = listForSale(save, "bone", 2, "PLAY_GOLD");
    const bought = merchantBuyListing(listed.save);
    expect(bought.listings[0].status).toBe("SOLD");
    expect(bought.gold).toBeGreaterThan(save.gold - 2);
    expect(bought.merchants.mira.gold).toBeLessThan(save.merchants.mira.gold);
    const dear = listForSale(save, "bone", 1000, "PLAY_GOLD");
    const skipped = merchantBuyListing(dear.save);
    expect(skipped.listings[0].status).toBe("LISTED");
    expect(skipped.merchants.mira.gold).toBe(save.merchants.mira.gold);
  });

  it("gives a crafted item the lowest input class", () => {
    expect(craftClass(["NEAR_BACKED", "PLAY_ONLY"])).toBe("PLAY_ONLY");
    expect(itemClass(createSave(), "iron")).toBe("PLAY_ONLY");
    expect(itemClass(createSave(), "cinder")).toBe("NON_TRADEABLE");
  });

  it("spends mock NEAR on a rumour and leaves play gold alone", () => {
    const save = createSave();
    save.day = 2;
    save.merchants.orrin.rumours = [{ id: "page-1", kind: "spike", ix: 4, iz: 6, text: "Spike", quality: 3, burned: false, epoch: 1, bornDay: 1, memory: "unseen", source: "landed", dungeonId: "ashgate" }];
    const trace = evaluateHero(save, save.heroes.ivo);
    expect(trace.purchase?.currency).toBe("NEAR");
    const next = applyPurchase(save, "ivo", trace.purchase!);
    expect(next.heroes.ivo.gold).toBe(save.heroes.ivo.gold);
    expect(next.heroes.ivo.near).toBeLessThan(save.heroes.ivo.near ?? 0);
    expect(next.merchants.orrin.near).toBeGreaterThan(save.merchants.orrin.near ?? 0);
    expect(next.heroes.ivo.facts.some((fact) => fact.memory === "warned")).toBe(true);
    expect(next.merchants.orrin.rumours).toHaveLength(0);
    expect(evaluateHero(save, save.heroes.brann).purchase?.currency).not.toBe("NEAR");
  });
});

describe("live stall", () => {
  beforeEach(async () => {
    const { newGame } = await import("../store");
    newGame();
  });

  it("pays Mira for iron from the canonical quote and rejects an empty purse", async () => {
    const { getState, supplyIron } = await import("../store");
    const before = getState();
    const paid = supplyIron(5);
    expect(paid.ok).toBe(true);
    expect(getState().inventory.iron).toBe((before.inventory.iron ?? 0) - 5);
    expect(getState().merchants.mira.gold).toBeLessThan(before.merchants.mira.gold);
    expect(getState().priceNote).toContain("play:resource:iron");
    getState().merchants.mira.gold = 0;
    const broke = supplyIron(5);
    expect(broke.ok).toBe(false);
    expect(broke.reason).toContain("cannot pay");
  });

  it("crafts a play-only spike from salvage", async () => {
    const { craftTrap, getState } = await import("../store");
    const made = craftTrap("spike");
    expect(made.ok).toBe(true);
    expect(getState().classes?.spike).toBe("PLAY_ONLY");
    expect(getState().inventory.spike).toBe(1);
    expect(getState().inventory.iron).toBe(2);
  });
});
