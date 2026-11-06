# Animation matrix

Clips come from KayKit Character Animations 1.1. Names below are the names inside the glTF files. The full list is `docs/ANIMATION_CATALOG.md`.

Live characters use Rig_Medium. These files are loaded by `ANIMATION_FILES`:

- Rig_Medium_General
- Rig_Medium_MovementBasic
- Rig_Medium_MovementAdvanced
- Rig_Medium_CombatMelee
- Rig_Medium_Special
- Rig_Medium_Tools
- Rig_Medium_Simulation

| Game state | Clip used | File |
|---|---|---|
| Idle | Idle_A, else Skeletons_Idle | General / Special |
| Walk | Walking_A, else Skeletons_Walking | MovementBasic / Special |
| Run | Running_A | MovementBasic |
| Attack | Melee_1H_Attack_Chop | CombatMelee |
| Hit | Hit_A | General |
| Death | Skeletons_Death, else Death_A | Special / General |
| Dodge | Dodge_Forward | MovementAdvanced |
| Interact | Interact | General |
| Inspect | Interact | General |
| Buy | Use_Item | General |
| Work (Mira) | Hammering | Tools |
| Sell | Interact | General |
| Talk (Orrin) | Waving | Simulation |
| Restock (Tallow) | PickUp | General |

Skeleton idle, walk, and death use the `Skeletons_*` clips in Rig_Medium_Special. Skeleton attack and hit reuse the medium melee and hit clips because the skeleton pack does not ship a separate attack clip on the live loader.

Not loaded in the raid: Rig_Large, Rig_Medium_CombatRanged. Ivo's staff does not fire a ranged clip. Ranged_Magic_Shoot exists in CombatRanged and is not connected, because combat damage is still the melee exchange in `simulateRaid`.

Missing as a dedicated clip, with the substitute in the table: merchant-only "sell" and "restock" performances. There is no clip with those names.
