# Raid loop phase

7 November 2026, about 3:05 PM Africa/Cairo. No live network calls.

## What changed

The dungeon rooms were already connected. This phase filled the raid verbs and the wave result on the existing engine.

- Click a placed trap to trigger it. Drag it onto a neighbor to re-lay it for 5 Gold. A triggered trap is spent for that wave. `src/game/store.ts` `triggerTrap`, `src/three/dungeon.ts` pointer up.
- Armor on a hero reduces spike damage by 1. A phial stops one lethal hit at 1 health, except on the first-lesson raid so that raid still ends in a page. `src/game/engine/raid.ts`.
- Boots add 30% to the bleed-time speed. `src/game/store.ts`.
- A death on a trap adds salvage and counts toward mastery. Ten kills add one blueprint. A vault clear adds 10 iron. An empty vault closes the dungeon. The first reopen is free and sets the vault to 200. The next reopen costs 40 Gold. `nextDay`.
- The results card shows traps, chain, pages, salvage, spike kills, tier, and Next wave.

Costs stay in `rules/economy.ts`: spike 30, pit 80, boulder 120, bait 25, re-lay 5, possess 25 from wave 2, burn 2, bleed 1 per second.

## Files

- `src/game/engine/raid.ts`
- `src/game/engine/raid.test.ts`
- `src/game/engine/types.ts`
- `src/game/store.ts`
- `src/three/dungeon.ts`
- `src/ui/App.tsx`
- `docs/README_COMPLIANCE_MATRIX.md`

## Tests

`npx tsc --noEmit` passed. `npx vitest run` — 39 passed.

Browser, fresh game:

- Spike on tile 4, 7. Gold 140 to 110.
- Banner opened the raid. Kara died. Traps sprung 1. Spike kills 1. Bone 11. The page was offered, then landed. Orrin can sell 1 fact. Tier 1.
- A separate fresh game triggered the spike first. The chronicle said it would not hit again. Chain ×1.

## Still incomplete

Trigger does not add a ×2 spectacle bonus for a manual kill, and it is resolved by the engine when the gate opens, not by a tap while the hero is on the tile. Possess is still the 25 Gold guard pull, not five seconds of WASD. Bait does not draw a 3-second path line. The first-lesson phial is disabled so the page still appears. Vault 0 was not driven in the browser. Pit and boulder craft buttons are still absent.

## Stop

This phase stops here. No contract, wallet, or live transfer was added.
