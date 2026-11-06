"""Print mesh, material, armature, and animation facts for a glTF/GLB file."""

import json
import sys

import bpy


def args() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1 :]


def main() -> None:
    path = args()[0]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    armatures = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    tris = 0
    for obj in meshes:
        for poly in obj.data.polygons:
            tris += max(1, len(poly.vertices) - 2)
    actions = sorted({a.name for a in bpy.data.actions})
    report = {
        "file": path,
        "meshes": len(meshes),
        "materials": len(bpy.data.materials),
        "triangles": tris,
        "armatures": [a.name for a in armatures],
        "actions": actions,
        "objects": [o.name for o in bpy.context.scene.objects],
    }
    print("UNDERREALM_INSPECT " + json.dumps(report))


if __name__ == "__main__":
    main()
