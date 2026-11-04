# Visual quality audit

The workspace did not contain a separate barbarian sculpt reference. The comparison is the written direction, premium stylized 3D fantasy, against the files that were actually downloaded and rendered.

KayKit's own pages describe these packs as stylised low-poly models with one gradient atlas. The renders match that description. They are not high-resolution sculpts, and lighting does not turn them into sculpts.

## What already fits

- Dungeon floors, walls, doorway, chest, barrel, crates, coins, banner, and torches share one stone atlas and read as one place.
- Adventurer and skeleton bodies share proportions and the Rig_Medium skeleton, so they sit in the same world.
- Weapons and the lantern use the same chunky silhouette language.

## What materials and light can improve

- Roughness is already about 0.5 in the glTF. The viewer clamps it into a slightly tighter range and adds warm torch point lights, a cool fill, and ACES tone mapping.
- Gold chest and coin stacks can take a bit more metalness because their meshes are named for gold. The body atlas should stay mostly non-metal or the gradient turns into plastic chrome.

## What would need new geometry

- Faces. Barbarian.glb is 7,123 triangles, one material, and a bear-hat head with dot eyes and a faceted beard. A close gallery render shows the facets. That is the real model.
- Armor edges and cloth folds are painted into the atlas, not modeled.
- There is no boulder mesh. The rolling hazard is `barrel_large.gltf` and the UI calls it a cask.

## What should stay

Do not rebuild these meshes into a different style inside this pass. The dungeon and the cast match each other. Replacing only the hero with a high-detail sculpt would break that match.

## Measured character facts

| File | Triangles | Skins | Embedded clips |
| --- | ---: | --- | --- |
| Barbarian.glb | 7123 | Rig_Medium | none |
| Rogue.glb | 7562 | Rig_Medium | none |
| Mage.glb | 6668 | Rig_Medium | none |
| Skeleton_Warrior.glb | 5934 | Rig_Medium | none |

Clips live in the Character Animations GLBs. Idle, walk, run, hit, death, dodge, and interact are real clip names. The attack used in game is `Melee_1H_Attack_Chop`.
