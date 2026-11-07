# Economy and the player market

7 November 2026, about 5:05 PM Africa/Cairo. Every balance below is a local mock. Nothing calls NEAR.

## One price module

`src/game/rules/money.ts` is the only place that evaluates the v10.2 curves:

- Stock: `P = clamp(min, max, base * (target / max(S,1))^0.5 * (1 + 0.3*D))`, with D zero below 6 settled trades.
- A live quote then smooths D with EMA alpha 0.3 and refuses a move larger than 10% in one raid.
- Rumours: `Pr = clamp(0.2*B, 5*B, B * (1 + 0.25*Dr) * F * R)` with B = 0.002.
- Buy-back: `min(3*B, last * 1.25^k)`.
- Fees: seller 0.90, guild 0.05, ops 0.05.
- Shop: closed below 0.01 mock NEAR, undercapitalised below 0.02, low stock below half the target. Recovery needs both the reserve and at least one item.

Stall nails and phials call that same stock curve. They do not keep a second copy of the math.

## What the browser did

Fresh game.

- Crafting `play:trap:spike` said: Crafted spike. Output class PLAY_ONLY, the lowest input class. Iron went from 12 to 2. Bone went from 6 to 1.
- Supplying 5 ash said stock 80, target 80, base 8, then stock 85. Mira paid 40 play Gold from the base quote.
- The gate showed Mira, Orrin, and Tallow each at 0.1000 mock NEAR and OPEN. Why on ash repeated stock 85, target 80, base 8.
- Listing iron for 10 play Gold moved one iron into escrow. Cancel put it back.
- Listing that iron for mock NEAR was rejected: this item is PLAY_ONLY and cannot be sold for NEAR. The stack did not move.

## Tests

`npx vitest run` — 7 files, 57 tests, all passed. `npx tsc --noEmit` passed before the last display rounding.

Covered there: the iron flood at 5.65, the 10% guard, shop close and recovery, escrow and cancel, 90/5/5, a failed purchase that does not move gold, expiry, Mira refusing a listing she cannot pay, play-only craft class, and Ivo paying mock NEAR for a rumour while Brann does not.

## Files

- `src/game/rules/money.ts`
- `src/game/engine/pricing.ts`
- `src/game/engine/market.ts`
- `src/game/engine/economyMarket.test.ts`
- `src/game/engine/decisions.ts`
- `src/game/engine/newGame.ts`
- `src/game/engine/types.ts`
- `src/game/store.ts`
- `src/ui/App.tsx`
- `src/three/dungeon.ts`
- `src/blockchain/MockChain.ts`
- `docs/README_COMPLIANCE_MATRIX.md`
