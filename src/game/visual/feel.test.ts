import { describe, expect, it } from "vitest";
import { FEEL } from "../../../rules/feel";
import { hitStopMs, percentile, shakeOffset, visualScale } from "./feel";

describe("presentation timing", () => {
  it("uses the published hit-stop and refuses shake when motion is reduced", () => {
    expect(hitStopMs("hit")).toBe(FEEL.hitStopMs.hit);
    expect(hitStopMs("kill")).toBe(75);
    expect(shakeOffset(0.05, FEEL.shake.trap, true)).toEqual({ x: 0, y: 0 });
    const moving = shakeOffset(0.05, FEEL.shake.trap, false);
    expect(Math.abs(moving.x)).toBeLessThanOrEqual(FEEL.shake.maxOffset);
  });

  it("slows the page only while motion is allowed", () => {
    expect(visualScale(true, false)).toBe(FEEL.pageSlowMo.scale);
    expect(visualScale(true, true)).toBe(1);
    expect(percentile([10, 20, 30, 40], 0.95)).toBe(40);
  });
});