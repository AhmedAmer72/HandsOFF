import { describe, expect, it } from "vitest";
import { prepareRaidCall } from "./testnet";

describe("testnet adapter", () => {
  it("keeps raid calls at zero deposit and refuses admin methods", () => {
    const raid = prepareRaidCall("settle_raid");
    expect(raid.ok).toBe(true);
    expect(raid.depositYocto).toBe("0");
    expect(raid.source).toBe("MOCK");
    expect(prepareRaidCall("set_paused").source).toBe("DISABLED");
  });
});
