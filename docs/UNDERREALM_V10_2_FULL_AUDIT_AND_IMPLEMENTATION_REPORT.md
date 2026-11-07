# UNDERREALM v10.2 audit and what shipped

7 November 2026, about 2:45 PM Africa/Cairo.

The dungeon, heroes, traps, page, and local Gold loop were already playing. This pass upgrades the raid HUD and records an honest compliance matrix. It does not replace the 3D world and it does not connect to NEAR.

## 1. What you can do

Enter from the cinematic menu. Place a trap from the picture bar. Open the gate with the red banner. Burn or land the page. Trade on the gate and in the workshop. Open Ownership details to see simulated receipts. The three heroes still choose their own walks.

## 2. Compliance

`docs/README_COMPLIANCE_MATRIX.md`.

Done and checked: the raid loop, the 3-second page, the 5.65 Gold price example, the play-only NEAR rejection, and the KayKit look.

Partial: the five verbs, shop reserves, the permit board, the player stall versus the mock ledger, the HUD (wave is the day, chain is traps sprung), and the long screen list.

Blocked: live NEAR. The guard refuses those hosts.

## 3. What changed in the HUD

`index.html` and Tailwind now load Lilita One for titles and Fredoka for body text.

The raid bar shows vault (blood red under 25% of 1,200), bleed per second while a raid is inside, gold, cinder pips out of 5, the day as the wave, and the trap count for this raid.

Hero cards show HP as a number, purse, and the latest memory word plus its source. Click a card to read the note and up to three facts.

The chronicle can be filtered: All, Traps, Vault, Rumours, Market, Raid.

The trap bar still shows the four models. Possess sits beside them and stays quiet until wave 2. Keys 1–4 pick a trap, B picks bait, P possesses, Space burns a flying page.

Player navigation is Raid, Gate, Workshop, Map, Market, Replay, Settings. The model shelf and hero directory sit in Settings.

## 4. What was already there

The connected Ashgate rooms, six characters, pathing, burn/land, craft, supply, the main menu fortress, and `MockChain` (escrow, fees, permits, deed, session keys). Tests: 37 passed before this HUD pass. `npx tsc --noEmit` passed after it.

## 5. Not finished

These are not claimed:

- A separate free Trigger button. Stepping on a plate is the trigger.
- Direct possess control for 5 seconds.
- World-space health labels over the models.
- Five hex dungeons, a deed dashboard, a guild board, take-it-home quotes, and a 60-second week-of-raids film.
- The full §4.10 scenario list. The committed sim is one iron book and it hits the price bounds.
- 60 fps. This environment’s earlier HUD sample was about 20 fps on SwiftShader.

## 6. How to run

```bash
npm install
npm run dev
npm test
npm run verify:economy
npm run mock:seed
```

Open http://127.0.0.1:5173/. Raid is the dungeon. Settings → Ownership details is the mock ledger.

## 7. Later live replacement

`MockChain` is the seam. A live adapter would implement the same calls. The raid store would need to move onto that adapter before hero NEAR caps apply inside the hall. That move is not done. No contract is deployed.
