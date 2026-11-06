# Gameplay completion plan

Done in the playable build:

- Guest entry from the main menu into Ashgate.
- Trap placement, raid, page, memory, craft, supply, and the Gold stall.
- Mock ledger for class checks, fees, permits, the deed, and session keys.
- Ownership screen that runs those actions and shows SIMULATED receipts.

Still the play-gold raid, not a second economy inside every click:

- Hero NEAR purses are on the mock ledger, not deducted when Kara buys a phial in the dungeon. That purchase still uses her play Gold.
- Shop open and closed states on the gate use the play-gold stand-in from `shopState`, not the 0.02 NEAR reserve.
- One dungeon, not five hex regions.
- Replay is the recorded raid event list, not a 30 Hz hash chain.
- No simulated swap, DAO proposal screen, or week-of-raids fast forward beyond the existing economy test.

Those stay out until the raid store is moved onto `MockChain` without breaking the current save. This pass does not start a live network client.
