import { describe, expect, it } from "vitest";
import { canonicalOutcome, fnv1a32, outcomeHash } from "./settlement";

describe("settlement commitment", () => {
  it("matches the Rust FNV-1a of ashgate", () => {
    expect(fnv1a32(new TextEncoder().encode("ashgate"))).toBe("0a2c5418");
  });

  it("round-trips a canonical raid record", () => {
    const text = canonicalOutcome({
      raidId: "raid-1",
      hero: "kara",
      survived: false,
      goldDelta: -40,
      kills: 2,
      burns: 1,
      landed: ["ab".repeat(32)],
      iron: 10,
      bone: 5,
      ash: 0,
      rulesHash: "rules",
      engineHash: "engine",
    });
    expect(text.startsWith("v1|raid-1|kara|0|-40|")).toBe(true);
    expect(outcomeHash({
      raidId: "raid-1",
      hero: "kara",
      survived: false,
      goldDelta: -40,
      kills: 2,
      burns: 1,
      landed: ["ab".repeat(32)],
      iron: 10,
      bone: 5,
      ash: 0,
      rulesHash: "rules",
      engineHash: "engine",
    })).toHaveLength(8);
  });
});
