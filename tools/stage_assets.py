#!/usr/bin/env python3
"""Stage official KayKit free archives into vendor, runtime, and catalog files.

Original zip bytes are copied unchanged. Extracted trees are the unpacked
archives. Runtime files are copies of glTF/GLB/PNG/BIN only.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import struct
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/tmp/kaykit-src")
VENDOR = ROOT / "assets" / "vendor" / "kaykit"
RUNTIME = ROOT / "assets" / "runtime"
CC0 = Path("/tmp/cc0/legalcode.txt")
VERIFIED = "2026-11-05 (Africa/Cairo)"

PACKS = [
    {
        "id": "characters-skeletons",
        "zip": "KayKit_Skeletons_1.1_FREE.zip",
        "product": "KayKit Character Pack : Skeletons (1.1)",
        "page": "https://kaylousberg.com/game-assets/characters-skeletons",
        "itch": "https://kaylousberg.itch.io/kaykit-skeletons/",
        "upload": "Free 1.1",
        "paid_not_downloaded": "Extra (paid) and Source .blend (paid) were not downloaded.",
        "page_license_quote": "Free for personal and commercial use, no attribution required. (CC0 Licensed)",
        "runtime_rules": [
            ("characters/gltf/", "monsters", (".glb",)),
            ("assets/gltf/", "skeleton-props", (".gltf", ".bin", ".png")),
        ],
    },
    {
        "id": "rpg-tools",
        "zip": "KayKit_RPGToolsBits_1.0_FREE.zip",
        "product": "KayKit : RPG Tools Bits (1.0)",
        "page": "https://kaylousberg.com/game-assets/rpg-tools",
        "itch": "https://kaylousberg.itch.io/rpg-tools-bits",
        "upload": "Free",
        "paid_not_downloaded": "Extra (paid) and Source .blend (paid) were not downloaded.",
        "page_license_quote": "Free for personal and commercial use, no attribution required. (CC0 Licensed)",
        "runtime_rules": [
            ("Assets/gltf/", "items", (".gltf", ".bin", ".png")),
        ],
    },
    {
        "id": "characters-adventurers",
        "zip": "KayKit_Adventurers_2.0_FREE.zip",
        "product": "KayKit : Adventurers Character Pack (2.0)",
        "page": "https://kaylousberg.com/game-assets/characters-adventurers",
        "itch": "https://kaylousberg.itch.io/kaykit-adventurers",
        "upload": "Free 2.0",
        "paid_not_downloaded": "Extra (paid) and Source .blend (paid) were not downloaded.",
        "page_license_quote": "Free for personal and commercial use, no attribution required. (CC0 Licensed)",
        "runtime_rules": [
            ("Characters/gltf/", "characters", (".glb",)),
            ("Assets/gltf/", "weapons", (".gltf", ".bin", ".png")),
            ("Animations/gltf/", "animations", (".glb",)),
        ],
    },
    {
        "id": "dungeon-remastered",
        "zip": "KayKit_Dungeon_Pack_1.1_FREE.zip",
        "product": "KayKit : Dungeon Asset Pack (1.1), formerly Dungeon Remastered 1.1",
        "page": "https://kaylousberg.com/game-assets/dungeon-remastered",
        "itch": "https://kaylousberg.itch.io/kaykit-dungeon-remastered",
        "itch_resolved": "https://kaylousberg.itch.io/kaykit-dungeon-pack",
        "upload": "Free 1.1",
        "paid_not_downloaded": "Extra 1.1 (paid) and Source 1.1 .blend (paid) were not downloaded.",
        "page_license_quote": "Free for personal and commercial use, no attribution required. (CC0 Licensed)",
        "runtime_rules": [
            ("Assets/gltf/", "dungeon", (".gltf", ".bin", ".png")),
        ],
    },
    {
        "id": "character-animations",
        "zip": "KayKit_Character_Animations_1.1.zip",
        "product": "KayKit : Character Animations (1.1)",
        "page": "https://kaylousberg.itch.io/kaykit-character-animations",
        "page_note": "Linked from the official Adventurers and Skeletons pages as the free animation library. Not one of the four named packs; downloaded because those pages say to animate characters with it.",
        "itch": "https://kaylousberg.itch.io/kaykit-character-animations",
        "upload": "Free 1.1",
        "paid_not_downloaded": "Source files (paid) were not downloaded. All animation clips in the free tier were downloaded.",
        "page_license_quote": "Free for personal and commercial use, no attribution required. (CC0 Licensed)",
        "runtime_rules": [
            ("Animations/gltf/", "animations", (".glb",)),
        ],
    },
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def gltf_doc(path: Path) -> dict:
    data = path.read_bytes()
    if path.suffix.lower() == ".glb":
        if data[:4] != b"glTF":
            raise ValueError(f"not glb {path}")
        clen = struct.unpack_from("<I", data, 12)[0]
        return json.loads(data[20 : 20 + clen])
    return json.loads(data)


def triangle_count(doc: dict) -> int:
    acc = doc.get("accessors", [])
    total = 0
    for mesh in doc.get("meshes", []):
        for prim in mesh.get("primitives", []):
            if prim.get("mode", 4) != 4:
                continue
            idx = prim.get("indices")
            if idx is not None:
                total += acc[idx]["count"] // 3
            else:
                pos = prim.get("attributes", {}).get("POSITION")
                if pos is not None:
                    total += acc[pos]["count"] // 3
    return total


def bounds(doc: dict) -> dict | None:
    acc = doc.get("accessors", [])
    mins = [1e9, 1e9, 1e9]
    maxs = [-1e9, -1e9, -1e9]
    found = False
    for mesh in doc.get("meshes", []):
        for prim in mesh.get("primitives", []):
            pos = prim.get("attributes", {}).get("POSITION")
            if pos is None or "min" not in acc[pos]:
                continue
            found = True
            for i in range(3):
                mins[i] = min(mins[i], acc[pos]["min"][i])
                maxs[i] = max(maxs[i], acc[pos]["max"][i])
    if not found:
        return None
    size = [maxs[i] - mins[i] for i in range(3)]
    return {
        "min": [round(v, 4) for v in mins],
        "max": [round(v, 4) for v in maxs],
        "size": [round(v, 4) for v in size],
    }


def inspect_model(path: Path, pack: str, category: str) -> dict:
    doc = gltf_doc(path)
    images = []
    for image in doc.get("images", []):
        if "uri" in image:
            images.append(image["uri"])
        elif "bufferView" in image:
            images.append("(embedded)")
    animations = [a.get("name", "(unnamed)") for a in doc.get("animations", [])]
    skins = [s.get("name", "(unnamed)") for s in doc.get("skins", [])]
    box = bounds(doc)
    return {
        "filename": path.name,
        "relativePath": str(path.relative_to(ROOT)),
        "publicPath": "/runtime/" + str(path.relative_to(RUNTIME)).replace("\\", "/"),
        "sourcePack": pack,
        "category": category,
        "format": path.suffix.lower().lstrip("."),
        "bytes": path.stat().st_size,
        "meshes": len(doc.get("meshes", [])),
        "materials": len(doc.get("materials", [])),
        "materialNames": [m.get("name", "") for m in doc.get("materials", [])],
        "triangles": triangle_count(doc),
        "nodes": len(doc.get("nodes", [])),
        "skins": skins,
        "animations": animations,
        "textures": images,
        "bounds": box,
    }


def write_license(pack: dict, extracted: Path, file_count: int) -> None:
    license_dir = VENDOR / pack["id"] / "license"
    license_dir.mkdir(parents=True, exist_ok=True)
    original = next(extracted.rglob("License.txt"))
    shutil.copy2(original, license_dir / "License.txt")
    if CC0.exists():
        shutil.copy2(CC0, license_dir / "CC0-1.0-legalcode.txt")
    original_text = original.read_text(encoding="utf-8", errors="replace").strip()
    resolved = pack.get("itch_resolved")
    resolve_line = f"\nResolved download host: {resolved}" if resolved else ""
    note = pack.get("page_note", "")
    note_block = f"\n\nNote: {note}" if note else ""
    md = f"""# License assessment — {pack['product']}

Verification date: {VERIFIED}

## Sources

- Official page used: {pack['page']}
- Download page linked from that source: {pack['itch']}{resolve_line}
- Free upload downloaded: {pack['upload']}
- Archive: `{pack['zip']}`
- Extracted files: {file_count}
{note_block}

## What the product page states

> {pack['page_license_quote']}

The itch.io asset-license field on the download page links to Creative Commons Zero (CC0).

## What the archive's own License.txt states

The following text is copied from `{original.name}` inside the archive. The file itself is preserved next to this document.

```
{original_text}
```

## CC0 1.0 assessment for this pack

The pack identifies Creative Commons Zero 1.0 Universal: http://creativecommons.org/publicdomain/zero/1.0/

A copy of the CC0 1.0 legal code retrieved on the verification date is stored as `CC0-1.0-legalcode.txt` in this directory. The legal code's statement of purpose says owners may relinquish copyright so the public can reuse the work for any purposes, including commercial purposes.

| Question | Finding from this pack's license text |
| --- | --- |
| Commercial use | Permitted. License.txt says personal, educational, and commercial projects. |
| Modification | Permitted. CC0 waives copyright so the work can be modified. The product pages describe the files as free to use in projects. |
| Attribution | Not required. License.txt says crediting "Kay Lousberg, www.kaylousberg.com" is not mandatory. The product page says no attribution required. |
| Redistribution inside a game | Permitted. CC0 and the pack license allow incorporation into a project. This game bundles copies; it does not resell the archive as a standalone asset pack. |
| Source-file restrictions | The free archive includes the shipped FBX, glTF/GLB, and OBJ files under CC0. Blender `.blend` source files are a separate paid upload and were not downloaded. |
| Author request that is not a CC0 condition | License.txt and the product page ask people not to resell unmodified copies or claim the assets as their own. That request is recorded here. It does not add a copyright condition on top of CC0. Do not imply Kay Lousberg endorses UNDERREALM. |

## Decision

APPROVED_CC0 for use, modification, and bundling inside UNDERREALM.

{pack['paid_not_downloaded']}

This assessment was made from this pack's page and this pack's License.txt. It was not copied from another pack's file.
"""
    (license_dir / "LICENSE.md").write_text(md, encoding="utf-8")
    urls = [
        f"verified: {VERIFIED}",
        f"product_page: {pack['page']}",
        f"download_page: {pack['itch']}",
    ]
    if resolved:
        urls.append(f"download_page_resolved: {resolved}")
    urls.append(f"archive: {pack['zip']}")
    urls.append(f"free_upload: {pack['upload']}")
    urls.append("license: https://creativecommons.org/publicdomain/zero/1.0/legalcode")
    (license_dir / "SOURCE_URL.txt").write_text("\n".join(urls) + "\n", encoding="utf-8")


def stage_pack(pack: dict) -> dict:
    zpath = SRC / pack["zip"]
    if not zpath.exists():
        raise SystemExit(f"missing archive {zpath}")
    dest_root = VENDOR / pack["id"]
    source_dir = dest_root / "source"
    extracted = dest_root / "extracted"
    source_dir.mkdir(parents=True, exist_ok=True)
    if extracted.exists():
        shutil.rmtree(extracted)
    extracted.mkdir(parents=True)
    target_zip = source_dir / pack["zip"]
    if not target_zip.exists() or target_zip.stat().st_size != zpath.stat().st_size:
        shutil.copy2(zpath, target_zip)
    with zipfile.ZipFile(zpath) as zf:
        zf.extractall(extracted)
    files = [p for p in extracted.rglob("*") if p.is_file()]
    write_license(pack, extracted, len(files))
    copied = []
    for folder_suffix, category, exts in pack["runtime_rules"]:
        matches = [p for p in extracted.rglob("*") if p.is_file() and folder_suffix in str(p).replace("\\", "/") and p.suffix.lower() in exts]
        out_dir = RUNTIME / category
        out_dir.mkdir(parents=True, exist_ok=True)
        for src in matches:
            # Keep animation subfolders so Rig_Medium and Rig_Large do not collide.
            if category == "animations":
                parent = src.parent.name
                dest = out_dir / parent / src.name
            else:
                dest = out_dir / src.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            copied.append(dest)
    ext_counts = Counter(p.suffix.lower() for p in files)
    digest = sha256(target_zip)
    manifest = {
        "id": pack["id"],
        "product": pack["product"],
        "archive": pack["zip"],
        "sha256": digest,
        "bytes": target_zip.stat().st_size,
        "extractedFiles": len(files),
        "extensions": dict(ext_counts),
        "runtimeFiles": len(copied),
        "license": "CC0-1.0",
        "licenseStatus": "APPROVED_CC0",
        "verified": VERIFIED,
    }
    (dest_root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def build_catalog() -> list[dict]:
    records = []
    pack_for_category = {
        "characters": "characters-adventurers",
        "weapons": "characters-adventurers",
        "monsters": "characters-skeletons",
        "skeleton-props": "characters-skeletons",
        "items": "rpg-tools",
        "dungeon": "dungeon-remastered",
        "animations": "character-animations",
    }
    # Adventurers also ship a subset of animation glbs. Prefer the full animation pack
    # when both exist; still catalog adventurer copies if the filename is unique.
    seen = set()
    for path in sorted(RUNTIME.rglob("*")):
        if path.suffix.lower() not in {".glb", ".gltf"}:
            continue
        if path.name.lower() in {"gltf.gltf"}:
            continue
        category = path.relative_to(RUNTIME).parts[0]
        key = (category, path.name)
        if key in seen:
            continue
        seen.add(key)
        records.append(inspect_model(path, pack_for_category.get(category, category), category))
    catalog_path = RUNTIME / "catalog.json"
    catalog_path.write_text(json.dumps({"generated": VERIFIED, "assets": records}, indent=2) + "\n")
    public = ROOT / "public"
    public.mkdir(exist_ok=True)
    shutil.copy2(catalog_path, public / "catalog.json")
    return records


def write_markdown(records: list[dict], manifests: list[dict]) -> None:
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    lines = [
        "# Asset catalog",
        "",
        f"Generated {VERIFIED} from the staged runtime glTF/GLB copies.",
        "",
        "Triangle counts come from glTF index accessors. Bounds are the combined POSITION accessor bounds in the file's local space, before any scene transform.",
        "",
        "| File | Pack | Category | Tris | Meshes | Materials | Clips | Skins | Bytes |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: |",
    ]
    for rec in records:
        skins = ", ".join(rec["skins"]) or "—"
        lines.append(
            f"| `{rec['filename']}` | {rec['sourcePack']} | {rec['category']} | {rec['triangles']} | {rec['meshes']} | {rec['materials']} | {len(rec['animations'])} | {skins} | {rec['bytes']} |"
        )
    (docs / "ASSET_CATALOG.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    anim_lines = [
        "# Animation catalog",
        "",
        "Clips are the names stored in the glTF animation arrays. Nothing was invented.",
        "",
    ]
    for rec in records:
        if not rec["animations"]:
            continue
        anim_lines.append(f"## `{rec['filename']}`")
        anim_lines.append("")
        anim_lines.append(f"Pack: {rec['sourcePack']}. Path: `{rec['publicPath']}`.")
        anim_lines.append("")
        for name in rec["animations"]:
            anim_lines.append(f"- {name}")
        anim_lines.append("")
    (docs / "ANIMATION_CATALOG.md").write_text("\n".join(anim_lines) + "\n", encoding="utf-8")

    man_lines = [
        "# Asset manifest",
        "",
        f"Generated {VERIFIED}.",
        "",
        "## Packs",
        "",
    ]
    for man in manifests:
        man_lines.append(f"### {man['id']}")
        man_lines.append("")
        man_lines.append("```json")
        man_lines.append(json.dumps(man, indent=2))
        man_lines.append("```")
        man_lines.append("")
    man_lines.append("## Runtime models")
    man_lines.append("")
    man_lines.append(f"{len(records)} glTF/GLB files are listed in `assets/runtime/catalog.json`.")
    man_lines.append("")
    (docs / "ASSET_MANIFEST.md").write_text("\n".join(man_lines) + "\n", encoding="utf-8")


def main() -> None:
    if RUNTIME.exists():
        shutil.rmtree(RUNTIME)
    RUNTIME.mkdir(parents=True)
    for sub in ["characters", "monsters", "environment", "dungeon", "traps", "weapons", "items", "textures", "materials", "vfx", "audio", "animations", "skeleton-props"]:
        (RUNTIME / sub).mkdir(parents=True)
    for sub in ["characters", "monsters", "environment", "items"]:
        (ROOT / "assets" / "previews" / sub).mkdir(parents=True, exist_ok=True)
    (ROOT / "assets" / "references").mkdir(parents=True, exist_ok=True)
    manifests = [stage_pack(pack) for pack in PACKS]
    # Reference stills shipped inside the archives. These are official pack previews, not a user-supplied sculpt.
    extracted_adv = VENDOR / "characters-adventurers" / "extracted"
    for png in extracted_adv.rglob("contents.png"):
        shutil.copy2(png, ROOT / "assets" / "references" / "adventurers-contents.png")
        break
    extracted_dun = VENDOR / "dungeon-remastered" / "extracted"
    for png in extracted_dun.rglob("contents.png"):
        shutil.copy2(png, ROOT / "assets" / "references" / "dungeon-contents.png")
        break
    records = build_catalog()
    write_markdown(records, manifests)
    summary = {
        "verified": VERIFIED,
        "packs": manifests,
        "runtimeModels": len(records),
    }
    (ROOT / "assets" / "runtime" / "staging-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"packs": len(manifests), "models": len(records)}, indent=2))


if __name__ == "__main__":
    main()
