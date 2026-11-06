# Gameplay gap analysis

Checked against `docs/UNDERREALM_GAMEPLAY_IMPLEMENTATION_REPORT.md` and the source before this pass.

| Feature | Existing status | Actual behavior | Required action |
| --- | --- | --- | --- |
| Dungeon builder | Partial | One 5 by 4 hall plus a corridor. Traps spend Gold. | Build connected rooms on the same grid the pathfinder uses. |
| Hero AI | Partial | Utility scores and one purchase. Distinct profiles. | Keep the scores. Make the bought rumour change the visible route. |
| Navigation | Partial | A* on the small hall. One corridor, so some tiles cannot be avoided. | Add a west bypass around the hall spike. |
| Combat | Partial | One skeleton, and only if the path steps on that tile. | Two posted skeletons. The guard stands on the center route. The warrior stands in the combat room. |
| Traps | Partial | Spike, pit, cask, bait costs exist. The cask did not roll. | Roll the cask mesh when that trap fires. |
| Diary and burn | Working | Facts come from the raid. Burn spends Cinder. Escape feeds Orrin. | Keep it. Show the second raid detour in the browser. |
| Merchants | Working | Finite Gold and stock. Prices follow stock versus target. | Add NPC purchases of player listings. |
| Player market | Partial | Cancel returns the item. Buy-back spent the player's Gold. | Remove buy-back. Let a merchant buy a cheap listing. |
| Workshop | Partial | Four nails make a spike kit. | Add the vault brace upgrade. |
| Persistence | Partial | Version 3 save is written. Refresh was not in the earlier report. | Refresh was checked in this pass. |
| Replay | Working | Tick list matches the engine. | Keep it, and use it to show the detour tiles. |
| Performance | Measured on SwiftShader | About 20 fps and 33,970 triangles in the old hall. | Move characters with delta time and stop restarting the walk clip every tile. |
