import { describe, expect, it } from "vitest";
import { mockDeeds, mockNep171, mockPermits, mockRelayer } from "./adapters";
import { MockChain } from "./MockChain";

function chain() {
  const book = new MockChain();
  book.seedStandard();
  return book;
}

describe("mock security", () => {
  it("rejects a second buyer and a second settlement without moving balances twice", () => {
    const book = chain();
    book.list("player", "item-iron-1", 10, "PLAY_GOLD", "sec-list");
    book.account("kara").gold = 30;
    book.account("brann").gold = 30;
    const first = book.buy("kara", book.listings[0].id, "sec-buy-1");
    const kara = book.account("kara").gold;
    const second = book.buy("brann", book.listings[0].id, "sec-buy-2");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(book.account("kara").gold).toBeCloseTo(kara);
    expect(book.account("brann").gold).toBeCloseTo(30);
    expect(book.items[0].owner).toBe("kara");

    const funded = book.fundPermit("player", "sec-fund");
    expect(funded.ok).toBe(true);
    const heroBefore = book.account("ivo").near;
    const settled = book.settlePermit("player", book.permits[0].id, "ivo", "sec-settle-1");
    const again = book.settlePermit("player", book.permits[0].id, "ivo", "sec-settle-2");
    expect(settled.ok).toBe(true);
    expect(again.ok).toBe(false);
    expect(book.account("ivo").near).toBeCloseTo(heroBefore + 0.003);
    expect(book.permits[0].status).toBe("SETTLED");
  });

  it("rolls back a callback that fails after the debit", () => {
    const book = chain();
    book.list("player", "item-iron-1", 10, "PLAY_GOLD", "fail-list");
    book.account("kara").gold = 30;
    const beforeGold = book.account("kara").gold;
    const beforeOwner = book.items[0].owner;
    book.armCallbackFailure();
    const result = book.buy("kara", book.listings[0].id, "fail-buy");
    expect(result.ok).toBe(false);
    expect(result.receipt.reason).toContain("Callback failed");
    expect(result.receipt.label).toBe("SIMULATED");
    expect(book.account("kara").gold).toBeCloseTo(beforeGold);
    expect(book.items[0].owner).toBe(beforeOwner);
    expect(book.listings[0].status).toBe("LISTED");
  });

  it("leaves an agent ledger unchanged when the receiver is not allowed", () => {
    const book = chain();
    const before = book.account("kara").near;
    const result = book.agentSpend("kara", "stranger", 0.001, "NEAR", "inject");
    expect(result.ok).toBe(false);
    expect(book.account("kara").near).toBe(before);
    const check = book.verifyDecision("kara", "stranger", "agentSpend");
    expect(check.genuine).toBe(false);
    expect(check.state).toBe("simulated_rejected");
  });

  it("rejects a bad relayer receiver, a replay, and a revoked key", () => {
    const book = chain();
    const session = mockRelayer(book);
    const key = book.issueKey("player", "game.root", ["settle_raid"], 0.02, book.now + 1000, 0.03);
    expect(session.submit(key.id, "settle_raid", "dao", 0.01, 1, "relay-bad").ok).toBe(false);
    expect(session.submit(key.id, "settle_raid", "game.root", 0.02, 1, "relay-ok").ok).toBe(true);
    expect(session.submit(key.id, "settle_raid", "game.root", 0.02, 1, "relay-replay").ok).toBe(false);
    expect(session.submit(key.id, "settle_raid", "game.root", 0.02, 2, "relay-daily").ok).toBe(false);
    const fresh = book.issueKey("player", "game.root", ["settle_raid"], 0.01, book.now + 1000);
    expect(book.revokeKey(fresh.id, "revoke-1").ok).toBe(true);
    expect(book.callWithKey(fresh.id, "settle_raid", "game.root", 0.01, 1, "revoked-call").ok).toBe(false);
  });

  it("refuses a deed transfer by the previous owner and still lets the holder withdraw", () => {
    const book = chain();
    const deeds = mockDeeds(book);
    const nft = mockNep171(book);
    expect(deeds.transfer("player", "mira", "deed-move").ok).toBe(true);
    expect(nft.ownerOf()).toBe("mira");
    const treasury = book.account("dungeon").gold;
    const stolen = deeds.withdraw("player", 10, "old-withdraw");
    expect(stolen.ok).toBe(false);
    expect(book.account("dungeon").gold).toBeCloseTo(treasury);
    expect(book.account("player").gold).toBeCloseTo(140);
    expect(deeds.recover("player", "old-recover").ok).toBe(false);
    expect(deeds.withdraw("mira", 10, "new-withdraw").ok).toBe(true);
    expect(deeds.recover("mira", "holder-recover").ok).toBe(true);
    expect(book.deed.status).toBe("ACTIVE");
  });

  it("marks VRF and intents as simulated and returns the item", () => {
    const book = chain();
    const seed = book.vrfSeed("raid-1");
    expect(seed.genuine).toBe(false);
    expect(seed.detail).toContain("Not a VRF proof");
    expect(book.account("player").near).toBeCloseTo(0.2);
    const deposited = book.intentDeposit("player", "item-iron-1", "intent-in");
    expect(deposited.ok).toBe(true);
    expect(deposited.receipt.reason).toContain("Not a cross-chain");
    expect(book.items[0].owner).toBe("intents.mock");
    expect(book.intentWithdraw("player", "item-iron-1", "intent-out").ok).toBe(true);
    expect(book.items[0].owner).toBe("player");
  });

  it("pays a guild bounty once from the guild purse", () => {
    const book = chain();
    const permits = mockPermits(book);
    expect(permits.fund("player", "dao-fund").ok).toBe(true);
    const guildBefore = book.account("guild").near;
    const proposed = book.proposeBounty("mira", 0.01, "bounty-1");
    expect(proposed.ok).toBe(true);
    const id = book.bounties[0].id;
    expect(book.approveBounty("player", id, "bounty-no").ok).toBe(false);
    expect(book.approveBounty("guild", id, "bounty-yes").ok).toBe(true);
    expect(book.account("guild").near).toBeCloseTo(guildBefore - 0.01);
    expect(book.account("mira").near).toBeCloseTo(0.1 + 0.01);
    expect(book.bounties[0].status).toBe("PAID");
  });
});
