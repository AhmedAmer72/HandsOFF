# Existing assets audit

Runtime counts on 6 November 2026:

| Folder | Files |
|---|---|
| `assets/runtime/characters` | 6 glb: Barbarian, Knight, Mage, Ranger, Rogue, Rogue_Hooded |
| `assets/runtime/monsters` | 4 glb: Skeleton_Mage, Skeleton_Minion, Skeleton_Rogue, Skeleton_Warrior |
| `assets/runtime/dungeon` | 423 files (gltf plus bins) |
| `assets/runtime/weapons` | 67 |
| `assets/runtime/items` | 102 |
| `assets/runtime/animations` | 14 glb (Rig_Medium and Rig_Large) |

Vendor packs, all CC0, recorded in `docs/ASSET_LICENSES.md` and `docs/ASSET_MANIFEST.md`:

- Dungeon Remastered
- Characters Adventurers
- Characters Skeletons
- RPG Tools Bits
- Character Animations 1.1

Not present:

- Medieval Hexagon Pack
- A labeled boulder mesh
- A labeled potion mesh (green dungeon bottle is the phial)
- Separate pit mesh (open grate is the pit)

Character assignment in the live scene:

| Person | File |
|---|---|
| Kara | `Rogue.glb` plus dagger |
| Brann | `Barbarian.glb` plus two-handed axe |
| Ivo | `Mage.glb` plus staff |
| Mira | `Knight.glb` plus hammer |
| Orrin | `Rogue_Hooded.glb` plus map |
| Tallow | `Ranger.glb` plus lantern |
| Hall guard | `Skeleton_Minion.glb` |
| East warrior | `Skeleton_Warrior.glb` |

These are different meshes, not one mesh recolored.
