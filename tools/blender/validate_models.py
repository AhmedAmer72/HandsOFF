"""Fail if a glTF/GLB import has no mesh."""

import sys

import bpy


def main() -> None:
    path = sys.argv[sys.argv.index("--") + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit(f"no mesh in {path}")
    print(f"VALID {path} meshes={len(meshes)}")


if __name__ == "__main__":
    main()
