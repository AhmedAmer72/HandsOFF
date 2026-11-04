"""Render EEVEE thumbnails for glTF/GLB files. Headless; no graphical session required."""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def frame_camera(cam: bpy.types.Object, meshes: list[bpy.types.Object]) -> None:
    points = []
    for obj in meshes:
        for corner in obj.bound_box:
            points.append(obj.matrix_world @ Vector(corner))
    if not points:
        return
    center = sum(points, Vector()) / len(points)
    radius = max((p - center).length for p in points)
    radius = max(radius, 0.2)
    direction = Vector((1.15, -1.35, 0.85)).normalized()
    cam.location = center + direction * radius * 3.1
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 50


def render_one(src: Path, dest: Path) -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(src))
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("PreviewWorld")
    scene.world.color = (0.08, 0.06, 0.05)
    light_data = bpy.data.lights.new("Key", "SUN")
    light_data.energy = 3.2
    light_data.color = (1.0, 0.86, 0.7)
    light = bpy.data.objects.new("Key", light_data)
    scene.collection.objects.link(light)
    light.rotation_euler = (math.radians(55), 0, math.radians(35))
    fill_data = bpy.data.lights.new("Fill", "SUN")
    fill_data.energy = 1.1
    fill_data.color = (0.65, 0.75, 1.0)
    fill = bpy.data.objects.new("Fill", fill_data)
    scene.collection.objects.link(fill)
    fill.rotation_euler = (math.radians(70), 0, math.radians(-140))
    cam_data = bpy.data.cameras.new("Camera")
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    meshes = [o for o in scene.objects if o.type == "MESH"]
    frame_camera(cam, meshes)
    dest.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(dest)
    scene.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    print(f"PREVIEW {dest}")


def main() -> None:
    raw = sys.argv[sys.argv.index("--") + 1 :]
    if len(raw) == 2 and Path(raw[0]).is_file():
        render_one(Path(raw[0]), Path(raw[1]))
        return
    folder = Path(raw[0])
    out = Path(raw[1])
    files = [p for p in folder.rglob("*") if p.suffix.lower() in {".glb", ".gltf"}]
    for src in files:
        render_one(src, out / f"{src.stem}.png")


if __name__ == "__main__":
    main()
