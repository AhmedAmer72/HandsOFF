/** Presentation numbers from the design spec §14.1. They never pause the raid rules. */
export const FEEL = {
  hitStopMs: { hit: 30, kill: 75, chain: 110 },
  shake: { kill: 0.35, trap: 0.2, boulder: 0.6, maxOffset: 0.18, decay: 1.6, hz: 22 },
  pageSlowMo: { scale: 0.25, seconds: 1.2 },
  bleedTickSec: 1,
} as const;
