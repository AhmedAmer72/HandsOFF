# Hall rendering

7 November 2026, about 7:00 PM Africa/Cairo. Measured in the Chrome window on this machine. The renderer string was ANGLE, Google Vulkan 1.3.0, SwiftShader Device (Subzero). That is software WebGL. It is not a desktop GPU result, and it is not a 60 fps claim.

## What the counter showed

The line is a half-second window for fps, and the 95th percentile of the latest 120 frame times.

| Preset | fps in that window | p95 frame | Draws | Triangles |
| --- | --- | --- | --- | --- |
| High, first read | 36 | 56 ms | 141 | 72,249 |
| Low | 38 | 58 ms | 141 | 72,249 |
| High, later read | 28 | 58 ms | 141 | 72,249 |
| High, after the texture counter | 58 | 58 ms | 141 | 72,249 |

Textures in that last read: 88. Skinned characters in the hall: 3 heroes, 3 merchants, 2 skeletons.

Low and High landed on the same draw and triangle counts. Turning the shadow map off did not change how many meshes are drawn. On this software renderer the cost is rasterizing those triangles, not the shadow map. A later half-second reached 58 fps while the slow tail stayed near 58 ms, so the average and the tail are not the same number.

## What changed in the loop

The frame used to walk every object in the scene to flicker lights and hide cutaway walls. Lights, banners, coins, and cutaway walls are collected once when the hall finishes loading. Mixers still advance in that same `requestAnimationFrame` loop. Raid outcomes are already decided before the walk animation starts, so a hit-stop only freezes the picture.

KayKit materials and meshes were left in place. Floor tiles stay separate because placement raycasts them. KTX2 was not applied: the packs ship their own images, and transcoding them would replace working textures. Character LOD was not added: eight skinned actors are the whole cast, and a swapped silhouette would change the read of the models.

Graphics presets: Low uses pixel ratio 1 and no shadow map. Medium uses 1.25 and a 1024 shadow map. High uses at most 1.75 and a 2048 map. Reduce Motion, in Settings, skips shake, hit-stop, damage marks, torch flicker, banner sway, coin bob, the page slow-down, and the burn dissolve.

## Feel, tied to raid steps

`rules/feel.ts` supplies the hit-stop (30 / 75 / 110 ms), the shake amplitudes, and the page scale of 0.25 for 1.2 s. A trap step waits a short beat, pops the mesh, shakes, and floats the damage from that step. A vault step plays the pooled gold points. A death step starts the page slow-down. Burning the page still shrinks it and raises the ember pool, unless Reduce Motion is on.
