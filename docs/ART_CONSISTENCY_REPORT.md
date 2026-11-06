# Art consistency report

The playable scene uses one art family: KayKit's low-poly gradient-atlas style.

Heroes are Barbarian.glb, Rogue.glb, and Mage.glb. They are different meshes, not one mesh recolored. Knight.glb, Ranger.glb, and Rogue_Hooded.glb are in the gallery and are not used as extra heroes.

Skeleton roles use the four free bodies:

- Skeleton Warrior: `Skeleton_Warrior.glb`
- Skeleton Archer: `Skeleton_Rogue.glb` plus `Skeleton_Crossbow.gltf`. There is no file named archer.
- Dungeon Guard: `Skeleton_Minion.glb`. There is no separate guard mesh.
- Skeleton Mage: `Skeleton_Mage.glb`

The environment is Dungeon Pack 1.1. Torches are `torch_mounted.gltf` and `torch_lit.gltf`. The vault is `chest_gold.gltf`. The diary page is `journal_open.gltf` from RPG Tools Bits, because that pack has an open journal and the dungeon pack does not have a parchment page.

The world map is a drawn hex grid. The Medieval Hexagon Pack was not in the authorized downloads, so it is not in the scene. Site markers load real models (doorway, map, anvil, candle, banner).

Lamplighter is not in this repository. Lights are Three.js hemisphere, directional, and point lights.

No audio files shipped in the free archives. Button and combat sounds are short synthesized tones.
