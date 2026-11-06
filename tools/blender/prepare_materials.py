"""Tune roughness on imported materials and write a GLB copy. Does not edit the source path."""

import sys
from pathlib import Path

import bpy


def main() -> None:
    src, dest = sys.argv[sys.argv.index("--") + 1 :]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    for mat in bpy.data.materials:
        if not mat.use_nodes or mat.node_tree is None:
            continue
        for node in mat.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                rough = node.inputs.get("Roughness")
                if rough is not None and hasattr(rough, "default_value"):
                    rough.default_value = min(float(rough.default_value), 0.55)
    Path(dest).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=dest,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_yup=True,
    )
    print(f"PREPARED {dest}")


if __name__ == "__main__":
    main()
