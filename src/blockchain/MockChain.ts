import { AGENTS, MARKET, PERMIT } from "../../rules/economy";
import { canTrade, craftClass, permitSplit } from "../game/rules/money";
import type { Account, ChainItem, Currency, Deed, ItemClass, Listing, PermitOffer, Receipt, SessionKey, TxStatus } from "./types";

export interface ChainResult {
  ok: boolean;
  receipt: Receipt;
}

interface Snapshot {
  accounts: Account[];
  items: ChainItem[];
  listings: Listing[];
  permits: PermitOffer[];
  deed: Deed;
  keys: SessionKey[];
  intents: { itemId: string; owner: string }[];
  bounties: { id: string; payee: string; amount: number; status: "PROPOSED" | "APPROVED" | "PAID" | "REJECTED" }[];
  block: number;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class MockChain {
  accounts: Account[] = [];
  items: ChainItem[] = [];
  listings: Listing[] = [];
  permits: PermitOffer[] = [];
  keys: SessionKey[] = [];
  journal: Receipt[] = [];
  audits: { id: string; ok: boolean; method: string; caller: string; reason: string; simulated: true; label: "SIMULATED" }[] = [];
  verifications: { id: string; kind: string; state: string; genuine: false; detail: string }[] = [];
  intents: { itemId: string; owner: string }[] = [];
  bounties: { id: string; payee: string; amount: number; status: "PROPOSED" | "APPROVED" | "PAID" | "REJECTED" }[] = [];
  private failNext = false;
  deed: Deed = { id: "deed:ashgate", owner: "player", treasury: "dungeon", status: "ACTIVE", payoutLocked: false };
  block = 1;
  now = 1_700_000_000_000;
  private seen = new Map<string, Receipt>();
  private seq = 1;

  seedStandard() {
    const hero = (id: string, name: string, spec: { startNEAR: number; maxSingle: number; daily: number }) => ({
      id, name, near: spec.startNEAR, gold: 0, spentTodayNear: 0, maxSingle: spec.maxSingle, daily: spec.daily,
    });
    const merchant = (id: string, name: string) => ({
      id, name, near: AGENTS.merchant.startNEAR, gold: 40, spentTodayNear: 0, maxSingle: AGENTS.merchant.maxSingle, daily: AGENTS.merchant.daily,
    });
    this.accounts = [
      { id: "player", name: "You", near: 0.2, gold: 140, spentTodayNear: 0, maxSingle: 1, daily: 1 },
      hero("kara", "Kara", AGENTS.kara),
      hero("brann", "Brann", AGENTS.brann),
      hero("ivo", "Ivo", AGENTS.ivo),
      merchant("mira", "Mira"),
      merchant("orrin", "Orrin"),
      merchant("tallow", "Tallow"),
      { id: "treasury", name: "Game treasury", near: 0, gold: 0, spentTodayNear: 0, maxSingle: 10, daily: 10 },
      { id: "ops", name: "Operations", near: 0, gold: 0, spentTodayNear: 0, maxSingle: 10, daily: 10 },
      { id: "guild", name: "Guild treasury", near: 0.05, gold: 0, spentTodayNear: 0, maxSingle: 10, daily: 10 },
      { id: "dungeon", name: "Dungeon treasury", near: 0, gold: 1200, spentTodayNear: 0, maxSingle: 10, daily: 10 },
    ];
    this.items = [{
      id: "item-iron-1",
      typeId: "play:resource:iron",
      cls: "PLAY_ONLY",
      owner: "player",
      history: ["salvage"],
    }];
    this.listings = [];
    this.permits = [];
    this.keys = [];
    this.journal = [];
    this.audits = [];
    this.verifications = [];
    this.intents = [];
    this.bounties = [];
    this.seen.clear();
    this.deed = { id: "deed:ashgate", owner: "player", treasury: "dungeon", status: "ACTIVE", payoutLocked: false };
    this.block = 1;
  }

  account(id: string) {
    const found = this.accounts.find((entry) => entry.id === id);
    if (!found) throw new Error(`Unknown account ${id}`);
    return found;
  }

  private snap(): Snapshot {
    return {
      accounts: clone(this.accounts),
      items: clone(this.items),
      listings: clone(this.listings),
      permits: clone(this.permits),
      deed: clone(this.deed),
      keys: clone(this.keys),
      intents: clone(this.intents),
      bounties: clone(this.bounties),
      block: this.block,
    };
  }

  private restore(snapshot: Snapshot) {
    this.accounts = snapshot.accounts;
    this.items = snapshot.items;
    this.listings = snapshot.listings;
    this.permits = snapshot.permits;
    this.deed = snapshot.deed;
    this.keys = snapshot.keys;
    this.intents = snapshot.intents;
    this.bounties = snapshot.bounties;
    this.block = snapshot.block;
  }

  private receipt(partial: Omit<Receipt, "simulated" | "label" | "source" | "id" | "block" | "blockHash" | "at"> & { status: TxStatus }): Receipt {
    const row: Receipt = {
      simulated: true,
      label: "SIMULATED",
      source: "SIMULATED",
      id: `sim-${this.seq}`,
      block: this.block,
      blockHash: `mock-block-${this.block}`,
      at: this.now,
      ...partial,
    };
    this.seq += 1;
    this.block += 1;
    this.journal.push(row);
    return row;
  }

  private run(key: string | undefined, work: () => ChainResult): ChainResult {
    if (key && this.seen.has(key)) {
      const prior = this.seen.get(key)!;
      return { ok: prior.status === "CONFIRMED" || prior.status === "REFUNDED", receipt: prior };
    }
    const snapshot = this.snap();
    try {
      const result = work();
      if (!result.ok) this.restore(snapshot);
      if (key) this.seen.set(key, result.receipt);
      this.audits.push({ id: result.receipt.id, ok: result.ok, method: result.receipt.method, caller: result.receipt.caller, reason: result.receipt.reason, simulated: true, label: "SIMULATED" });
      return result;
    } catch (error) {
      this.restore(snapshot);
      const receipt = this.receipt({
        caller: "player",
        receiver: "treasury",
        method: "revert",
        amount: 0,
        currency: "NONE",
        status: "FAILED",
        reason: error instanceof Error ? error.message : "Rolled back.",
        idempotencyKey: key,
      });
      if (key) this.seen.set(key, receipt);
      this.audits.push({ id: receipt.id, ok: false, method: receipt.method, caller: receipt.caller, reason: receipt.reason, simulated: true, label: "SIMULATED" });
      return { ok: false, receipt };
    }
  }

  private pay(from: Account, to: Account, amount: number, currency: Currency) {
    if (currency === "NEAR") {
      if (from.near + 1e-12 < amount) throw new Error("Not enough NEAR.");
      if (amount > from.maxSingle) throw new Error("Above the single-purchase cap.");
      if (from.spentTodayNear + amount > from.daily) throw new Error("Above the daily spending cap.");
      from.near -= amount;
      to.near += amount;
      from.spentTodayNear += amount;
      if (this.failNext) {
        this.failNext = false;
        throw new Error("Callback failed.");
      }
      return;
    }
    if (from.gold + 1e-9 < amount) throw new Error("Not enough Gold.");
    from.gold -= amount;
    to.gold += amount;
    if (this.failNext) {
      this.failNext = false;
      throw new Error("Callback failed.");
    }
  }

  list(sellerId: string, itemId: string, price: number, currency: Currency, key?: string): ChainResult {
    return this.run(key, () => {
      const seller = this.account(sellerId);
      const item = this.items.find((entry) => entry.id === itemId);
      if (!item || item.owner !== sellerId) {
        return { ok: false, receipt: this.receipt({ caller: sellerId, receiver: "market", method: "list", amount: price, currency, status: "REJECTED", reason: "You do not own that item.", itemId, idempotencyKey: key }) };
      }
      if (!canTrade(item.cls, currency)) {
        return { ok: false, receipt: this.receipt({ caller: sellerId, receiver: "market", method: "list", amount: price, currency, status: "REJECTED", reason: `Purchase rejected: this item is ${item.cls} and cannot be sold for ${currency}.`, itemId, idempotencyKey: key }) };
      }
      const active = this.listings.filter((entry) => entry.seller === sellerId && entry.status === "LISTED");
      if (active.length >= MARKET.maxListingsPerAccount) {
        return { ok: false, receipt: this.receipt({ caller: sellerId, receiver: "market", method: "list", amount: price, currency, status: "REJECTED", reason: "Five listings is the cap.", itemId, idempotencyKey: key }) };
      }
      item.owner = "escrow";
      item.history.push(`listed by ${sellerId}`);
      this.listings.push({
        id: `list-${this.seq}`,
        itemId,
        seller: sellerId,
        price,
        currency,
        cls: item.cls,
        status: "LISTED",
        at: this.now,
        expiry: this.now + 24 * 60 * 60 * 1000,
      });
      return { ok: true, receipt: this.receipt({ caller: seller.id, receiver: "escrow", method: "list", amount: price, currency, status: "CONFIRMED", reason: "Item is in escrow.", itemId, idempotencyKey: key }) };
    });
  }

  buy(buyerId: string, listingId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const buyer = this.account(buyerId);
      const listing = this.listings.find((entry) => entry.id === listingId);
      if (!listing || listing.status !== "LISTED") {
        return { ok: false, receipt: this.receipt({ caller: buyerId, receiver: "market", method: "buy", amount: 0, currency: "NONE", status: "REJECTED", reason: "That listing is not open.", idempotencyKey: key }) };
      }
      if (this.now > listing.expiry) {
        const expiredItem = this.items.find((entry) => entry.id === listing.itemId);
        if (expiredItem && expiredItem.owner === "escrow") {
          expiredItem.owner = listing.seller;
          expiredItem.history.push("expired");
        }
        listing.status = "EXPIRED";
        return { ok: false, receipt: this.receipt({ caller: buyerId, receiver: listing.seller, method: "buy", amount: listing.price, currency: listing.currency, status: "EXPIRED", reason: "Listing expired. Your item was returned to your inventory.", itemId: listing.itemId, idempotencyKey: key }) };
      }
      const selling = this.items.find((entry) => entry.id === listing.itemId);
      const cheaper = this.listings
        .filter((entry) => entry.status === "LISTED" && entry.currency === listing.currency)
        .filter((entry) => this.items.find((item) => item.id === entry.itemId)?.typeId === selling?.typeId)
        .sort((a, b) => a.price - b.price || a.at - b.at)[0];
      if (cheaper && cheaper.id !== listing.id) {
        return { ok: false, receipt: this.receipt({ caller: buyerId, receiver: cheaper.seller, method: "buy", amount: cheaper.price, currency: cheaper.currency, status: "REJECTED", reason: `A cheaper eligible listing won at ${cheaper.price} ${cheaper.currency}.`, idempotencyKey: key }) };
      }
      const seller = this.account(listing.seller);
      const guild = this.account("guild");
      const ops = this.account("ops");
      const item = selling;
      if (!item) throw new Error("Escrow item missing.");
      this.pay(buyer, seller, listing.price * MARKET.split.seller, listing.currency);
      this.pay(buyer, guild, listing.price * MARKET.split.guild, listing.currency);
      this.pay(buyer, ops, listing.price * MARKET.split.ops, listing.currency);
      item.owner = buyerId;
      item.history.push(`bought by ${buyerId}`);
      listing.status = "SOLD";
      return { ok: true, receipt: this.receipt({ caller: buyerId, receiver: seller.id, method: "buy", amount: listing.price, currency: listing.currency, status: "CONFIRMED", reason: "MOCK CONFIRMED. Seller 90, guild 5, operations 5.", itemId: item.id, idempotencyKey: key }) };
    });
  }

  cancel(sellerId: string, listingId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const listing = this.listings.find((entry) => entry.id === listingId && entry.seller === sellerId && entry.status === "LISTED");
      if (!listing) {
        return { ok: false, receipt: this.receipt({ caller: sellerId, receiver: sellerId, method: "cancel", amount: 0, currency: "NONE", status: "REJECTED", reason: "No open listing to cancel.", idempotencyKey: key }) };
      }
      const item = this.items.find((entry) => entry.id === listing.itemId);
      if (item) {
        item.owner = sellerId;
        item.history.push("cancelled");
      }
      listing.status = "CANCELLED";
      return { ok: true, receipt: this.receipt({ caller: sellerId, receiver: sellerId, method: "cancel", amount: 0, currency: listing.currency, status: "REFUNDED", reason: "Item returned. No fee.", itemId: listing.itemId, idempotencyKey: key }) };
    });
  }

  craft(ownerId: string, inputIds: string[], outputType: string, key?: string): ChainResult {
    return this.run(key, () => {
      const inputs = inputIds.map((id) => this.items.find((item) => item.id === id));
      if (inputs.some((item) => !item || item.owner !== ownerId)) {
        return { ok: false, receipt: this.receipt({ caller: ownerId, receiver: "workshop", method: "craft", amount: 0, currency: "NONE", status: "REJECTED", reason: "Craft inputs are missing.", idempotencyKey: key }) };
      }
      const cls = craftClass(inputs.map((item) => item!.cls));
      for (const item of inputs) {
        item!.owner = "burned";
        item!.history.push("crafted away");
      }
      const made: ChainItem = { id: `craft-${this.seq}`, typeId: outputType, cls, owner: ownerId, history: ["craft", ...inputIds] };
      this.items.push(made);
      return { ok: true, receipt: this.receipt({ caller: ownerId, receiver: ownerId, method: "craft", amount: 0, currency: "NONE", status: "CONFIRMED", reason: `Output class ${cls}.`, itemId: made.id, idempotencyKey: key }) };
    });
  }

  fundPermit(funderId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const funder = this.account(funderId);
      this.pay(funder, this.ensure("escrow", "Escrow"), PERMIT.price, "NEAR");
      const offer: PermitOffer = {
        id: `permit-${this.seq}`,
        funder: funderId,
        price: PERMIT.price,
        split: { ...PERMIT.split },
        status: "OPEN",
        countered: false,
        escrow: PERMIT.price,
      };
      this.permits.push(offer);
      return { ok: true, receipt: this.receipt({ caller: funderId, receiver: "escrow", method: "fundPermit", amount: PERMIT.price, currency: "NEAR", status: "CONFIRMED", reason: "Offer funded. Price stays 0.01.", idempotencyKey: key }) };
    });
  }

  counterPermit(heroId: string, permitId: string, shift: number, key?: string): ChainResult {
    return this.run(key, () => {
      const offer = this.permits.find((entry) => entry.id === permitId);
      if (!offer || offer.status !== "OPEN") {
        return { ok: false, receipt: this.receipt({ caller: heroId, receiver: "board", method: "counter", amount: PERMIT.price, currency: "NEAR", status: "REJECTED", reason: "Offer is not open.", idempotencyKey: key }) };
      }
      if (offer.countered) {
        return { ok: false, receipt: this.receipt({ caller: heroId, receiver: "board", method: "counter", amount: PERMIT.price, currency: "NEAR", status: "REJECTED", reason: "A counter already happened.", idempotencyKey: key }) };
      }
      const next = permitSplit(shift);
      if (!next.legal) {
        return { ok: false, receipt: this.receipt({ caller: heroId, receiver: "board", method: "counter", amount: next.price, currency: "NEAR", status: "REJECTED", reason: "Split is outside the allowed range.", idempotencyKey: key }) };
      }
      offer.split = next.split;
      offer.countered = true;
      offer.status = "COUNTER_PENDING";
      offer.hero = heroId;
      return { ok: true, receipt: this.receipt({ caller: heroId, receiver: offer.funder, method: "counter", amount: next.price, currency: "NEAR", status: "CONFIRMED", reason: "Price unchanged. Split moved.", idempotencyKey: key }) };
    });
  }

  settlePermit(ownerId: string, permitId: string, heroId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const offer = this.permits.find((entry) => entry.id === permitId);
      if (!offer || (offer.status !== "OPEN" && offer.status !== "COUNTER_PENDING")) {
        return { ok: false, receipt: this.receipt({ caller: ownerId, receiver: heroId, method: "settlePermit", amount: 0, currency: "NEAR", status: "REJECTED", reason: "Permit is not open.", idempotencyKey: key }) };
      }
      if (offer.funder !== ownerId && this.deed.owner !== ownerId) {
        return { ok: false, receipt: this.receipt({ caller: ownerId, receiver: heroId, method: "settlePermit", amount: offer.price, currency: "NEAR", status: "REJECTED", reason: "Only the owner can accept.", idempotencyKey: key }) };
      }
      const pot = offer.escrow;
      const escrow = this.ensure("escrow", "Escrow");
      escrow.near -= pot;
      this.account("dungeon").near += pot * offer.split.owner;
      this.account(heroId).near += pot * offer.split.agents;
      this.account("guild").near += pot * offer.split.guild;
      this.account("ops").near += pot * offer.split.ops;
      offer.escrow = 0;
      offer.status = "SETTLED";
      offer.hero = heroId;
      return { ok: true, receipt: this.receipt({ caller: ownerId, receiver: heroId, method: "settlePermit", amount: pot, currency: "NEAR", status: "CONFIRMED", reason: "Escrow split. Permit consumed.", idempotencyKey: key }) };
    });
  }

  expirePermit(permitId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const offer = this.permits.find((entry) => entry.id === permitId);
      if (!offer || offer.status === "SETTLED") {
        return { ok: false, receipt: this.receipt({ caller: "board", receiver: "board", method: "expirePermit", amount: 0, currency: "NEAR", status: "REJECTED", reason: "Nothing to refund.", idempotencyKey: key }) };
      }
      this.ensure("escrow", "Escrow").near -= offer.escrow;
      this.account(offer.funder).near += offer.escrow;
      offer.escrow = 0;
      offer.status = "EXPIRED_REFUNDED";
      return { ok: true, receipt: this.receipt({ caller: "board", receiver: offer.funder, method: "expirePermit", amount: PERMIT.price, currency: "NEAR", status: "REFUNDED", reason: "Full refund. Offer expired.", idempotencyKey: key }) };
    });
  }

  lockPayout(locked: boolean) {
    this.deed.payoutLocked = locked;
    this.deed.status = locked ? "LOCKED" : "ACTIVE";
  }

  transferDeed(from: string, to: string, key?: string): ChainResult {
    return this.run(key, () => {
      if (this.deed.owner !== from) {
        return { ok: false, receipt: this.receipt({ caller: from, receiver: to, method: "transferDeed", amount: 0, currency: "NONE", status: "REJECTED", reason: "You do not hold the deed.", idempotencyKey: key }) };
      }
      if (this.deed.payoutLocked) {
        this.deed.status = "RECOVERY_REQUIRED";
        return { ok: false, receipt: this.receipt({ caller: from, receiver: to, method: "transferDeed", amount: 0, currency: "NONE", status: "REJECTED", reason: "Transfer during payout was refused.", idempotencyKey: key }) };
      }
      this.deed.previousOwners = [...(this.deed.previousOwners ?? []), from];
      this.deed.owner = to;
      this.deed.status = "TRANSFERRED";
      return { ok: true, receipt: this.receipt({ caller: from, receiver: to, method: "transferDeed", amount: 0, currency: "NONE", status: "CONFIRMED", reason: "MOCK OWNERSHIP moved.", idempotencyKey: key }) };
    });
  }

  withdrawTreasury(caller: string, amount: number, key?: string): ChainResult {
    return this.run(key, () => {
      if (this.deed.owner !== caller) {
        return { ok: false, receipt: this.receipt({ caller, receiver: "dungeon", method: "withdraw", amount, currency: "PLAY_GOLD", status: "REJECTED", reason: "Previous owner cannot withdraw.", idempotencyKey: key }) };
      }
      this.pay(this.account("dungeon"), this.account(caller), amount, "PLAY_GOLD");
      return { ok: true, receipt: this.receipt({ caller, receiver: caller, method: "withdraw", amount, currency: "PLAY_GOLD", status: "CONFIRMED", reason: "Treasury paid the current owner.", idempotencyKey: key }) };
    });
  }

  armCallbackFailure() {
    this.failNext = true;
  }

  issueKey(account: string, receiver: string, methods: string[], txCap: number, expiry: number, dailyCap = 0.05): SessionKey {
    const key: SessionKey = { id: `key-${this.seq}`, account, receiver, methods, txCap, nonce: 0, expiry, revoked: false, spent: 0, dailyCap };
    this.seq += 1;
    this.keys.push(key);
    return key;
  }

  callWithKey(keyId: string, method: string, receiver: string, amount: number, nonce: number, key?: string): ChainResult {
    return this.run(key, () => {
      const session = this.keys.find((entry) => entry.id === keyId);
      if (!session || session.revoked) {
        return { ok: false, receipt: this.receipt({ caller: session?.account ?? "unknown", receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "Key is revoked or missing.", idempotencyKey: key }) };
      }
      if (this.now > session.expiry) {
        return { ok: false, receipt: this.receipt({ caller: session.account, receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "Key is expired.", idempotencyKey: key }) };
      }
      if (nonce !== session.nonce + 1) {
        return { ok: false, receipt: this.receipt({ caller: session.account, receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "Nonce does not match.", idempotencyKey: key }) };
      }
      if (receiver !== session.receiver) {
        return { ok: false, receipt: this.receipt({ caller: session.account, receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "Receiver is not allowed.", idempotencyKey: key }) };
      }
      if (!session.methods.includes(method)) {
        return { ok: false, receipt: this.receipt({ caller: session.account, receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "Method is not allowed.", idempotencyKey: key }) };
      }
      if (amount > session.txCap) {
        return { ok: false, receipt: this.receipt({ caller: session.account, receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "Amount is over the key cap.", idempotencyKey: key }) };
      }
      if ((session.spent ?? 0) + amount > (session.dailyCap ?? 0.05)) {
        return { ok: false, receipt: this.receipt({ caller: session.account, receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "Amount is over the daily key cap.", idempotencyKey: key }) };
      }
      session.nonce = nonce;
      session.spent = (session.spent ?? 0) + amount;
      return { ok: true, receipt: this.receipt({ caller: session.account, receiver, method, amount, currency: "NEAR", status: "CONFIRMED", reason: "Mock relayer accepted the action.", idempotencyKey: key }) };
    });
  }

  revokeKey(keyId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const session = this.keys.find((entry) => entry.id === keyId);
      if (!session) {
        return { ok: false, receipt: this.receipt({ caller: "player", receiver: "game.root", method: "revokeKey", amount: 0, currency: "NONE", status: "REJECTED", reason: "Key is missing.", idempotencyKey: key }) };
      }
      session.revoked = true;
      return { ok: true, receipt: this.receipt({ caller: session.account, receiver: "game.root", method: "revokeKey", amount: 0, currency: "NONE", status: "CONFIRMED", reason: "SIMULATED key revoked. It cannot submit again.", idempotencyKey: key }) };
    });
  }

  relay(keyId: string, method: string, receiver: string, amount: number, nonce: number, key?: string): ChainResult {
    if (receiver !== "game.root") {
      return this.run(key, () => ({
        ok: false,
        receipt: this.receipt({ caller: "relayer", receiver, method, amount, currency: "NEAR", status: "REJECTED", reason: "SIMULATED relayer rejected the receiver. No network submission.", idempotencyKey: key }),
      }));
    }
    const result = this.callWithKey(keyId, method, receiver, amount, nonce, key);
    result.receipt.reason = `SIMULATED relayer. ${result.receipt.reason}`;
    return result;
  }

  agentSpend(agentId: string, receiver: string, amount: number, currency: Currency, key?: string): ChainResult {
    const allowed = new Set(["mira", "orrin", "tallow", "escrow", "board", "dungeon"]);
    return this.run(key, () => {
      if (!allowed.has(receiver)) {
        return { ok: false, receipt: this.receipt({ caller: agentId, receiver, method: "agentSpend", amount, currency, status: "REJECTED", reason: "Unlisted receiver. The ledger was not charged.", idempotencyKey: key }) };
      }
      this.pay(this.account(agentId), this.ensure(receiver, receiver), amount, currency);
      return { ok: true, receipt: this.receipt({ caller: agentId, receiver, method: "agentSpend", amount, currency, status: "CONFIRMED", reason: "SIMULATED contract-held spend.", idempotencyKey: key }) };
    });
  }

  verifyDecision(agentId: string, receiver: string, method: string): { genuine: false; state: string; detail: string } {
    const allowed = new Set(["mira", "orrin", "tallow", "escrow", "board", "dungeon"]);
    const state = allowed.has(receiver) ? "simulated_unverified" : "simulated_rejected";
    const detail = "SIMULATED verification. This is not a signature, attestation, or cryptographic proof.";
    this.verifications.push({ id: `ai-${this.seq}`, kind: "ai", state, genuine: false, detail: `${agentId} ${method} → ${receiver}. ${detail}` });
    this.seq += 1;
    return { genuine: false, state, detail };
  }

  vrfSeed(raidId: string) {
    const output = (raidId.length * 997 + this.block) % 1000;
    const row = { id: `vrf-${this.seq}`, kind: "vrf", state: "simulated_seed", genuine: false as const, detail: `SIMULATED seed ${output} for ${raidId}. Not a VRF proof. It does not pay anyone.` };
    this.seq += 1;
    this.verifications.push(row);
    return row;
  }

  intentDeposit(owner: string, itemId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const item = this.items.find((entry) => entry.id === itemId);
      if (!item || item.owner !== owner) {
        return { ok: false, receipt: this.receipt({ caller: owner, receiver: "intents.mock", method: "intentDeposit", amount: 0, currency: "NONE", status: "REJECTED", reason: "You do not hold that item.", itemId, idempotencyKey: key }) };
      }
      item.owner = "intents.mock";
      item.history.push("simulated intents deposit");
      this.intents.push({ itemId, owner });
      return { ok: true, receipt: this.receipt({ caller: owner, receiver: "intents.mock", method: "intentDeposit", amount: 0, currency: "NONE", status: "CONFIRMED", reason: "SIMULATED item custody. Not a cross-chain transfer.", itemId, idempotencyKey: key }) };
    });
  }

  intentWithdraw(owner: string, itemId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const held = this.intents.find((entry) => entry.itemId === itemId && entry.owner === owner);
      const item = this.items.find((entry) => entry.id === itemId);
      if (!held || !item || item.owner !== "intents.mock") {
        return { ok: false, receipt: this.receipt({ caller: owner, receiver: "intents.mock", method: "intentWithdraw", amount: 0, currency: "NONE", status: "REJECTED", reason: "Nothing is in simulated custody.", itemId, idempotencyKey: key }) };
      }
      item.owner = owner;
      item.history.push("simulated intents withdraw");
      this.intents = this.intents.filter((entry) => entry !== held);
      return { ok: true, receipt: this.receipt({ caller: "intents.mock", receiver: owner, method: "intentWithdraw", amount: 0, currency: "NONE", status: "REFUNDED", reason: "SIMULATED withdraw. The item is back with the depositor.", itemId, idempotencyKey: key }) };
    });
  }

  proposeBounty(payee: string, amount: number, key?: string): ChainResult {
    return this.run(key, () => {
      const id = `bounty-${this.seq}`;
      this.bounties.push({ id, payee, amount, status: "PROPOSED" });
      return { ok: true, receipt: this.receipt({ caller: "player", receiver: "guild", method: "proposeBounty", amount, currency: "NEAR", status: "CONFIRMED", reason: "SIMULATED proposal. The guild has not paid.", idempotencyKey: key }) };
    });
  }

  approveBounty(caller: string, bountyId: string, key?: string): ChainResult {
    return this.run(key, () => {
      if (caller !== "guild") {
        return { ok: false, receipt: this.receipt({ caller, receiver: "guild", method: "approveBounty", amount: 0, currency: "NEAR", status: "REJECTED", reason: "Only the guild council approves.", idempotencyKey: key }) };
      }
      const bounty = this.bounties.find((entry) => entry.id === bountyId);
      if (!bounty || bounty.status !== "PROPOSED") {
        return { ok: false, receipt: this.receipt({ caller, receiver: "guild", method: "approveBounty", amount: 0, currency: "NEAR", status: "REJECTED", reason: "No open proposal.", idempotencyKey: key }) };
      }
      this.pay(this.account("guild"), this.account(bounty.payee), bounty.amount, "NEAR");
      bounty.status = "PAID";
      return { ok: true, receipt: this.receipt({ caller: "guild", receiver: bounty.payee, method: "approveBounty", amount: bounty.amount, currency: "NEAR", status: "CONFIRMED", reason: "SIMULATED guild payout. Not a DAO transaction.", idempotencyKey: key }) };
    });
  }

  recoverDeed(caller: string, key?: string): ChainResult {
    return this.run(key, () => {
      if (this.deed.owner !== caller) {
        return { ok: false, receipt: this.receipt({ caller, receiver: "deeds.root", method: "recoverDeed", amount: 0, currency: "NONE", status: "REJECTED", reason: "A previous owner cannot recover the deed.", idempotencyKey: key }) };
      }
      if (this.deed.payoutLocked) {
        return { ok: false, receipt: this.receipt({ caller, receiver: "deeds.root", method: "recoverDeed", amount: 0, currency: "NONE", status: "REJECTED", reason: "Payout is still in flight.", idempotencyKey: key }) };
      }
      this.deed.status = "ACTIVE";
      return { ok: true, receipt: this.receipt({ caller, receiver: "deeds.root", method: "recoverDeed", amount: 0, currency: "NONE", status: "CONFIRMED", reason: "SIMULATED recovery. Stale holders have no treasury access.", idempotencyKey: key }) };
    });
  }

  mtTransfer(from: string, to: string, itemId: string, key?: string): ChainResult {
    return this.run(key, () => {
      const item = this.items.find((entry) => entry.id === itemId);
      if (!item || item.owner !== from) {
        return { ok: false, receipt: this.receipt({ caller: from, receiver: to, method: "mtTransfer", amount: 0, currency: "NONE", status: "REJECTED", reason: "You do not hold that token.", itemId, idempotencyKey: key }) };
      }
      item.owner = to;
      item.history.push(`simulated mt_transfer to ${to}`);
      return { ok: true, receipt: this.receipt({ caller: from, receiver: to, method: "mtTransfer", amount: 0, currency: "NONE", status: "CONFIRMED", reason: "SIMULATED NEP-245 transfer. No yocto deposit and no network.", itemId, idempotencyKey: key }) };
    });
  }

  mtBalance(owner: string, typeId: string) {
    return this.items.filter((item) => item.owner === owner && item.typeId === typeId).length;
  }

  nftOwner(tokenId = "deed:ashgate") {
    return tokenId === this.deed.id ? this.deed.owner : "";
  }

  private ensure(id: string, name: string) {
    const existing = this.accounts.find((entry) => entry.id === id);
    if (existing) return existing;
    const created: Account = { id, name, near: 0, gold: 0, spentTodayNear: 0, maxSingle: 10, daily: 10 };
    this.accounts.push(created);
    return created;
  }
}

export function classOf(typeId: string): ItemClass {
  if (typeId.startsWith("play:")) return "PLAY_ONLY";
  if (typeId.startsWith("nb:")) return "NEAR_BACKED";
  return "NON_TRADEABLE";
}

export function nearFromPlayPath(chain: MockChain, owner: string) {
  const before = chain.account(owner).near;
  const iron = chain.items.find((item) => item.owner === owner && item.cls === "PLAY_ONLY");
  if (!iron) return { gained: 0, rejected: true };
  const crafted = chain.craft(owner, [iron.id], "play:trap:spike", `craft-${iron.id}`);
  if (!crafted.ok || !crafted.receipt.itemId) return { gained: 0, rejected: true };
  const listed = chain.list(owner, crafted.receipt.itemId, 0.01, "NEAR", `near-sale-${iron.id}`);
  return { gained: chain.account(owner).near - before, rejected: !listed.ok };
}
