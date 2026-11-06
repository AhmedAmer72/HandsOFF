# Visual implementation plan

The pass keeps the raid engine and changes presentation only.

1. Put the official colors in `src/game/visual/palette.ts` and Tailwind.
2. Set the orthographic elevation to 35 degrees and ease the camera with GSAP when a person is clicked.
3. Load Rig_Medium Tools and Simulation. Map work, talk, inspect, buy, sell, and restock onto clips that exist in those files.
4. Play Hammering for Mira, PickUp for Tallow, and Waving for Orrin when they are clicked.
5. Pop the placed trap mesh when the raid steps on it. Keep the rolling cask for the boulder trap.
6. Add ember points to the burn timeline. The page outcome still comes from `resolvePage`.
7. Show up to four nails by Mira and four bottles by Tallow, matching stall stock.
8. Add named gallery views.
9. Add a trap chip bar and a chronicle card. Placement still happens by clicking the world.
10. Measure fps in the browser. Do not claim a 60 fps result on SwiftShader.
11. Leave the hex world map unimplemented until the Medieval Hexagon Pack is in the repo.
