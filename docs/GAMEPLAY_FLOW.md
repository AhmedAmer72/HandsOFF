# Gameplay flow

1. New game writes save version 3 and opens the dungeon on day 1 with 140 Gold and 8 Cinder.
2. The player arms a trap and clicks a walkable tile. `placeTrap` spends the cost from `trapDefinitions.ts` and stores the cell.
3. Open the gate. `chooseRaider` scores Kara, Brann, and Ivo. The first hero whose score meets their threshold is the raider. They may buy one item or one rumour first if their profile allows it and they can pay.
4. `simulateRaid` walks that hero from tile 2,5 to the vault at 2,0. Traps on the path apply their table damage. The skeleton at 2,1 fights only if the path steps on that tile.
5. The 3D view plays those events: walk, hit, attack, death. It does not choose the result.
6. On death, the diary card lists the facts from that raid. Burn spends 3 Cinder and marks the facts burned. Escape gives the facts to Orrin.
7. Next day charges 6 Gold upkeep, restocks merchants toward their targets, and returns to preparation.
8. A later hero who owns a spike fact pays extra path cost for that tile and walks around it. A burned fact is not in anyone's knowledge.
