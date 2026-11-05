# Current status

The core loop is playable: prepare traps, open the gate, watch a rules-driven raid, burn or release the diary page, trade with finite merchants, and advance the day.

Prototype graphics are unchanged. The raid result comes from `src/game/engine/raid.ts`.

Tests: `npx vitest run` — 13 passed. `npx tsc --noEmit` passed after the diary countdown type fix.

Browser: spike at 2,2 costs 18 Gold (140 to 122), Kara dies on that spike, the parchment offers Burn, and burning spends 3 Cinder (8 to 5). Replay lists the ticks.

Report: `docs/UNDERREALM_GAMEPLAY_IMPLEMENTATION_REPORT.md`.
