# Economy simulation

`npm run verify:economy` runs the money unit tests and `scripts/economy-sim.test.ts`. The script uses `rules/economy.ts` only. It does not call a model. The output is labelled `SIMULATED`.

The 13 November 2026 run (Africa/Cairo) wrote:

- `docs/sim/economy-60d.json`
- `docs/sim/economy-60d.svg`
- `docs/sim/cinder-decision.json`

It ran 60 days and 1020 raids. Iron prices stayed inside 5 and 20. About 0.1 percent of samples sat on a bound. Permit revenue was 8.56 NEAR and the agent share, 2.57 NEAR, stayed above agent spend, 2.13 NEAR. A washed sample left demand at 0. A closed shop stayed closed until a contribution brought cash and stock back, and then it reopened. Brann, given 0.001 NEAR against a 0.002 rumour price, could not buy.

Cinder variants over 1000 scripted raids:

| burnCost | perKill | perWaveClear | kill pays for its own burn |
| ---: | ---: | ---: | --- |
| 1 | 1 | 0 | yes |
| 2 | 1 | 0 | no |
| 1 | 0 | 2 | no |

The frozen choice is the v10.2 start value: burn cost 2, 1 per kill, no wave-clear bonus, cap 5, start 3. `rules/economy.ts` was not edited. A kill adds 1 Cinder and a burn costs 2, so the kill does not fund the burn. The burn-cost-1 variant fails that test. The wave-clear variant drops the per-kill trickle the raid already uses.

The TypeScript price curve rounds demand to two decimals. The Rust checker uses the exact buy/sell ratio. Both stay on the same published curve for the flood example in `contracts/core`.
