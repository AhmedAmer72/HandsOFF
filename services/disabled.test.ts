import { describe, expect, it } from "vitest";
import { DAO, INTENTS, NEAR_AI, OUTLAYER, assertNotLive } from "./disabled";

describe("fail-closed integrations", () => {
  it("stays disabled until a real testnet response exists", () => {
    for (const integration of [NEAR_AI, OUTLAYER, INTENTS, DAO]) {
      expect(assertNotLive(integration).status).toBe("DISABLED");
    }
  });
});
