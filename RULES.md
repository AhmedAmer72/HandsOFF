# Rules

The economy numbers live in `rules/economy.ts`. Contract code and the simulation read that file. `src/game/config/economyRules.ts` is older and is not an input to the chain.

Cinder stays at the v10.2 start value: burn cost 2, 1 per kill, cap 5, start 3. The simulation log is `docs/sim/cinder-decision.json`. Do not change the formulas unless a new run of `npm run verify:economy` records the reason in that log.

Permit price is 0.01 NEAR. PLAY_ONLY cannot take a NEAR path. Cinder is not transferable. PLAY_GOLD has no conversion method.

The playable raid is the TypeScript walk in `src/game/engine/raid.ts`. The Rust engine only checks the canonical settlement line.
