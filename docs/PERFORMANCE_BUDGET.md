# Performance budget

Target on a desktop GPU: 60 fps, under 100 draw calls in the dungeon view, shared materials from the glTF cache in `src/three/loader.ts`.

This cloud machine renders with SwiftShader (software WebGL). A 60 fps claim is not valid here. The budget for this environment is: the scene stays interactive, one animation frame loop, no React update per rendered frame, and the HUD reports fps, draws, and triangles.

Earlier measured sample, before this visual pass, from `docs/PERFORMANCE_BASELINE.md` and the live HUD: about 20 fps at a sample, average about 41, minimum 20, about 26 draws, about 14,500 triangles.

This pass adds two animation files, four shelf props per stall, one points object, and trap-ring meshes. It does not add a second render loop or postprocessing. A new HUD sample belongs in the final report after the browser check.

Instanced dungeon tiles and KTX2 were not added. The loader already caches glTF files. Creating instances would need a material audit of the KayKit tiles and is not done in this pass.
