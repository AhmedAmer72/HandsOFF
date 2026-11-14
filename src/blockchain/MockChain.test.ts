import { describe, expect, it } from "vitest";
import { assertLocalOnly, BLOCKCHAIN_MODE } from "./guard";
import { MockChain, nearFromPlayPath } from "./MockChain";

function chain() {
  const book = new MockChain();
  book.seedStandard();
  return book;
}

describe("mock chain", () => {
  it("rejects a live network host", () => {
    expect(BLOCKCHAIN_MODE).toBe("testnet");
    expect(() => assertLocalOnly("https://rpc.mainnet.near.org")).toThrow(/blocked/);
    expect(() => assertLocalOnly("https://rpc.testnet.near.org")).not.toThrow();
  });

  it("rejects selling play-only salvage for NEAR and mints no NEAR", () => {
    const book = chain();
    const before = book.account("player").near;
    const result = nearFromPlayPath(book, "player");
    expect(result.rejected).toBe(true);
    expect(result.gained).toBe(0);
    expect(book.account("player").near).toBe(before);
    expect(book.items.find((item) => item.typeId === "play:trap:spike")?.cls).toBe("PLAY_ONLY");
  });

  it("sells play iron for gold, pays the fee, and is idempotent", () => {
    const book = chain();
    const listed = book.list("player", "item-iron-1", 10, "PLAY_GOLD", "list-1");
    expect(listed.ok).toBe(true);
    expect(listed.receipt.label).toBe("SIMULATED");
    book.account("kara").gold = 20;
    const first = book.buy("kara", book.listings[0].id, "buy-1");
    const second = book.buy("kara", book.listings[0].id, "buy-1");
    expect(first.ok).toBe(true);
    expect(second.receipt.id).toBe(first.receipt.id);
    expect(book.account("kara").gold).toBeCloseTo(10);
    expect(book.account("player").gold).toBeCloseTo(140 - 0 + 9);
    expect(book.account("guild").gold).toBeCloseTo(0.5);
    expect(book.account("ops").gold).toBeCloseTo(0.5);
    expect(book.items[0].owner).toBe("kara");
  });

  it("rolls back a purchase the buyer cannot afford", () => {
    const book = chain();
    book.list("player", "item-iron-1", 10, "PLAY_GOLD", "list-poor");
    book.account("kara").gold = 1;
    const before = book.account("kara").gold;
    const result = book.buy("kara", book.listings[0].id, "buy-poor");
    expect(result.ok).toBe(false);
    expect(book.account("kara").gold).toBe(before);
    expect(book.items[0].owner).toBe("escrow");
    expect(book.listings[0].status).toBe("LISTED");
  });

  it("returns an item on cancel without a fee", () => {
    const book = chain();
    book.list("player", "item-iron-1", 10, "PLAY_GOLD", "list-cancel");
    const result = book.cancel("player", book.listings[0].id, "cancel-1");
    expect(result.receipt.status).toBe("REFUNDED");
    expect(book.items[0].owner).toBe("player");
  });

  it("keeps the permit price fixed and refunds an expired offer", () => {
    const book = chain();
    const funded = book.fundPermit("player", "fund-1");
    expect(funded.ok).toBe(true);
    const countered = book.counterPermit("ivo", book.permits[0].id, 0.05, "counter-1");
    expect(countered.ok).toBe(true);
    expect(book.permits[0].price).toBe(0.01);
    expect(book.permits[0].split.agents).toBeCloseTo(0.35);
    const again = book.counterPermit("kara", book.permits[0].id, 0.05, "counter-2");
    expect(again.ok).toBe(false);
    const settled = book.settlePermit("player", book.permits[0].id, "ivo", "settle-1");
    const replay = book.settlePermit("player", book.permits[0].id, "kara", "settle-1");
    expect(settled.ok).toBe(true);
    expect(replay.receipt.id).toBe(settled.receipt.id);
    expect(book.permits[0].status).toBe("SETTLED");
  });

  it("refuses a deed transfer during payout and blocks the old owner", () => {
    const book = chain();
    book.lockPayout(true);
    const blocked = book.transferDeed("player", "mira", "deed-locked");
    expect(blocked.ok).toBe(false);
    expect(book.deed.owner).toBe("player");
    book.lockPayout(false);
    expect(book.transferDeed("player", "mira", "deed-ok").ok).toBe(true);
    const withdrawn = book.withdrawTreasury("player", 10, "old-owner");
    expect(withdrawn.ok).toBe(false);
    expect(book.withdrawTreasury("mira", 10, "new-owner").ok).toBe(true);
    expect(book.account("mira").gold).toBeCloseTo(50);
  });

  it("enforces session key receiver, method, nonce, expiry, and cap", () => {
    const book = chain();
    const key = book.issueKey("player", "market", ["buy"], 0.01, book.now + 1000);
    expect(book.callWithKey(key.id, "buy", "market", 0.01, 1, "sk-1").ok).toBe(true);
    expect(book.callWithKey(key.id, "buy", "market", 0.01, 1, "sk-replay").ok).toBe(false);
    expect(book.callWithKey(key.id, "withdraw", "market", 0.01, 2, "sk-method").ok).toBe(false);
    expect(book.callWithKey(key.id, "buy", "dao", 0.01, 2, "sk-receiver").ok).toBe(false);
    expect(book.callWithKey(key.id, "buy", "market", 1, 2, "sk-cap").ok).toBe(false);
    book.now = key.expiry + 1;
    expect(book.callWithKey(key.id, "buy", "market", 0.01, 2, "sk-expired").ok).toBe(false);
    const fresh = book.issueKey("player", "market", ["buy"], 0.01, book.now + 1000);
    fresh.revoked = true;
    expect(book.callWithKey(fresh.id, "buy", "market", 0.01, 1, "sk-revoked").ok).toBe(false);
  });

  it("rejects a hero who tries to fund a permit above the single-purchase cap", () => {
    const book = chain();
    const before = book.account("kara").near;
    const result = book.fundPermit("kara", "kara-fund");
    expect(result.ok).toBe(false);
    expect(book.account("kara").near).toBe(before);
  });
});
