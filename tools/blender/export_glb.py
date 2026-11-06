"""Re-export a glTF/GLB to GLB without dropping skins or animation clips."""

import sys
from pathlib import Path

import bpy


def main() -> None:
    src, dest = sys.argv[sys.argv.index("--") + 1 :]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    Path(dest).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=dest,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_yup=True,
    )
    print(f"EXPORTED {dest}")


if __name__ == "__main__":
    main()
