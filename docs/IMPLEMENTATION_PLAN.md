# Implementation plan

1. Read each pack's own page and `License.txt` before download.
2. Download only the free itch.io upload. Leave EXTRA and SOURCE paid files alone.
3. Keep zip archives unchanged under `assets/vendor/kaykit/*/source`.
4. Extract them under `extracted/` and copy glTF/GLB runtime files under `assets/runtime`.
5. Catalog meshes, clips, and bounds from the glTF accessors.
6. Build a Vite + React + Three.js app with an asset gallery and one dungeon prototype.
7. Approve the prototype only after a browser session shows real models, a walk, a strike, and a trap placement.
8. Keep the larger Ashgate layout behind the Open full Ashgate control. It uses the same loader and the same free files.

No wallet, chain, or contract code is part of this plan.
