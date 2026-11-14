import { describe, expect, it } from "vitest";
import { screenRelay } from "./relayer";

describe("relayer allowlist", () => {
  it("rejects another receiver, a deposit, and a method outside the raid list", () => {
    expect(screenRelay({ receiver: "dao.sputnik-dao.near", method: "settle_raid", depositYocto: "0", nonce: "a" }).ok).toBe(false);
    expect(screenRelay({ receiver: "game.neocrafts.testnet", method: "set_paused", depositYocto: "0", nonce: "b" }).ok).toBe(false);
    expect(screenRelay({ receiver: "game.neocrafts.testnet", method: "settle_raid", depositYocto: "1", nonce: "c" }).ok).toBe(false);
    const allowed = screenRelay({ receiver: "game.neocrafts.testnet", method: "settle_raid", depositYocto: "0", nonce: "d" });
    expect(allowed.ok).toBe(true);
    expect(allowed.source).toBe("DISABLED");
    expect(screenRelay({ receiver: "game.neocrafts.testnet", method: "settle_raid", depositYocto: "0", nonce: "d" }).ok).toBe(false);
  });
});
