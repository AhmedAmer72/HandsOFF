import * as THREE from "three";
import { ANIMATION_FILES, CELL, CLIP_ALIASES, dungeon, heroModel, item, type Piece } from "../game/content";
import type { Quality } from "../game/content";
import { loadGltf, spawn, stripRootMotion } from "./loader";

export interface PlaceSpot {
  id: string;
  label: string;
  prompt: string;
  x: number;
  z: number;
  color: string;
}

interface PlaceMemory {
  x: number;
  z: number;
  yaw: number;
  view: number;
}

const memory = new Map<string, PlaceMemory>();

function tile(ix: number, iz: number) {
  return { x: ix * CELL, z: iz * CELL };
}

function shell(width: number, depth: number): Piece[] {
  const out: Piece[] = [];
  for (let ix = 0; ix < width; ix += 1) {
    for (let iz = 0; iz < depth; iz += 1) {
      const rocky = (ix + iz) % 5 === 0;
      const dirt = (ix * 3 + iz) % 9 === 0;
      const file = dirt ? "floor_dirt_large" : rocky ? "floor_tile_large_rocks" : "floor_tile_large";
      out.push({
        id: `floor-${ix}-${iz}`,
        url: dungeon(file),
        file: `${file}.gltf`,
        pack: "dungeon-remastered",
        x: ix * CELL,
        y: 0,
        z: iz * CELL,
        rot: 0,
        kind: "floor",
        label: "Stone floor",
      });
    }
  }
  const edge = (ix: number, iz: number, side: "n" | "s" | "w" | "e", file = "wall") => {
    const x = ix * CELL + (side === "w" ? -2 : side === "e" ? 2 : 0);
    const z = iz * CELL + (side === "n" ? -2 : side === "s" ? 2 : 0);
    const rot = side === "w" ? Math.PI / 2 : side === "e" ? -Math.PI / 2 : side === "s" ? Math.PI : 0;
    out.push({
      id: `wall-${side}-${ix}-${iz}`,
      url: dungeon(file),
      file: `${file}.gltf`,
      pack: "dungeon-remastered",
      x,
      y: 0,
      z,
      rot,
      kind: "wall",
      label: file === "wall_doorway" ? "Door" : "Wall",
      cutaway: side === "s" || side === "e",
    });
  };
  for (let ix = 0; ix < width; ix += 1) {
    edge(ix, 0, "n", "wall");
    edge(ix, depth - 1, "s", ix === 2 ? "wall_doorway" : "wall");
  }
  for (let iz = 0; iz < depth; iz += 1) {
    edge(0, iz, "w", iz % 3 === 1 ? "wall_pillar" : "wall");
    edge(width - 1, iz, "e", iz % 3 === 2 ? "wall_cracked" : "wall");
  }
  return out;
}

function prop(id: string, file: string, ix: number, iz: number, kind: Piece["kind"] = "prop", y = 0): Piece {
  const at = tile(ix, iz);
  return {
    id,
    url: file.endsWith(".glb") ? file : dungeon(file),
    file: file.endsWith(".glb") ? file : `${file}.gltf`,
    pack: "dungeon-remastered",
    x: at.x,
    y,
    z: at.z,
    rot: 0,
    kind,
    label: id,
  };
}

export function marketLayout(): { pieces: Piece[]; spots: PlaceSpot[]; focus: { x: number; z: number } } {
  const mira = tile(1, 2);
  const orrin = tile(3, 2);
  const tallow = tile(5, 1);
  const board = tile(3, 3);
  const exit = tile(2, 4);
  const pieces = [
    ...shell(6, 5),
    prop("mira-table", "table_medium", 1, 2),
    prop("mira-barrel", "barrel_large", 0, 1),
    prop("mira-crate", "crates_stacked", 1, 1),
    prop("orrin-table", "table_small", 3, 2),
    prop("tallow-table", "table_medium_decorated_A", 5, 1),
    prop("tallow-bottle", "bottle_A_green", 5, 1),
    prop("board-table", "table_long", 3, 3),
    prop("banner", "banner_red", 3, 0),
    prop("torch-a", "torch_lit", 0, 3, "light", 1.6),
    prop("torch-b", "torch_lit", 5, 3, "light", 1.6),
    prop("coins", "coin_stack_medium", 4, 2),
  ];
  pieces.find((entry) => entry.id === "tallow-bottle")!.url = dungeon("bottle_A_green");
  const spots: PlaceSpot[] = [
    { id: "mira", label: "Mira", prompt: "Press E to talk to Mira", x: mira.x, z: mira.z, color: "#b5532e" },
    { id: "orrin", label: "Orrin", prompt: "Press E to talk to Orrin", x: orrin.x, z: orrin.z, color: "#c9a15b" },
    { id: "tallow", label: "Tallow", prompt: "Press E to talk to Tallow", x: tallow.x, z: tallow.z, color: "#f2c14e" },
    { id: "board", label: "Listing board", prompt: "Press E to use the listing board", x: board.x, z: board.z, color: "#3fa7a0" },
    { id: "exit", label: "Door", prompt: "Press E to leave", x: exit.x, z: exit.z, color: "#e9d8b4" },
  ];
  return { pieces, spots, focus: { x: mira.x, z: mira.z } };
}

export function workshopLayout(): { pieces: Piece[]; spots: PlaceSpot[]; focus: { x: number; z: number } } {
  const anvil = tile(1, 2);
  const bench = tile(5, 2);
  const forge = tile(3, 1);
  const exit = tile(2, 4);
  const pieces = [
    ...shell(6, 5),
    prop("anvil", "anvil", 1, 2),
    prop("hammer", "barrel_small", 1, 1),
    prop("bench", "table_long", 5, 2),
    prop("rack", "sword_shield", 5, 1),
    prop("shelves", "shelves", 0, 1),
    prop("forge-barrel", "barrel_large", 3, 2),
    prop("torch-a", "torch_lit", 2, 1, "light", 1.55),
    prop("torch-b", "torch_lit", 4, 1, "light", 1.55),
    prop("banner", "banner_brown", 3, 0),
  ];
  pieces.find((entry) => entry.id === "anvil")!.url = item("anvil");
  pieces.find((entry) => entry.id === "anvil")!.file = "anvil.gltf";
  const spots: PlaceSpot[] = [
    { id: "anvil", label: "Anvil", prompt: "Press E to use the anvil", x: anvil.x, z: anvil.z, color: "#8d6a45" },
    { id: "bench", label: "Armor bench", prompt: "Press E to use the armor bench", x: bench.x, z: bench.z, color: "#f2c14e" },
    { id: "forge", label: "Forge", prompt: "Press E to use the forge", x: forge.x, z: forge.z, color: "#ff7a32" },
    { id: "exit", label: "Door", prompt: "Press E to leave", x: exit.x, z: exit.z, color: "#e9d8b4" },
  ];
  return { pieces, spots, focus: forge };
}

export const MARKET_SPOTS = marketLayout().spots;
export const WORKSHOP_SPOTS = workshopLayout().spots;

export function mountPlace(canvas: HTMLCanvasElement, options: {
  id: "market" | "workshop";
  spots: PlaceSpot[];
  getLocked: () => boolean;
  getQuality: () => Quality;
  onNear: (id: string | null) => void;
  onUse: (id: string) => void;
}) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    options.onNear(null);
    return { ready: Promise.resolve(), dispose() {} };
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor("#14100E");
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#1B1A22", 28, 72);
  scene.add(new THREE.HemisphereLight("#ffe0bf", "#2a1c16", 0.72));
  const sun = new THREE.DirectionalLight("#d7e4ff", 0.55);
  sun.position.set(12, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  const layout = options.id === "market" ? marketLayout() : workshopLayout();
  const saved = memory.get(options.id);
  const focus = new THREE.Vector3(saved?.x ?? layout.focus.x, 0, saved?.z ?? layout.focus.z);
  let yaw = saved?.yaw ?? 0;
  let view = saved?.view ?? 9;
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 120);
  const keys = new Set<string>();
  const lights: THREE.PointLight[] = [];
  const walls: { mesh: THREE.Object3D; z: number; cutaway: boolean }[] = [];
  const clickable: THREE.Object3D[] = [];
  const mixers: THREE.AnimationMixer[] = [];
  let nearId: string | null = null;
  let frame = 0;
  let last = performance.now();
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let downX = 0;
  let downY = 0;

  function applyQuality() {
    const quality = options.getQuality();
    const ratio = quality === "low" ? 1 : quality === "medium" ? 1.25 : Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(ratio);
    renderer.shadowMap.enabled = quality !== "low";
    sun.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
    sun.intensity = quality === "low" ? 0.4 : 0.55;
  }

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const aspect = width / height;
    camera.left = -view * aspect;
    camera.right = view * aspect;
    camera.top = view;
    camera.bottom = -view;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function aim() {
    const az = Math.PI / 4 + yaw;
    const el = 35 * Math.PI / 180;
    const dist = 32;
    camera.position.set(
      focus.x + Math.cos(az) * Math.cos(el) * dist,
      2 + Math.sin(el) * dist,
      focus.z + Math.sin(az) * Math.cos(el) * dist,
    );
    camera.lookAt(focus);
  }

  function tag(mesh: THREE.Object3D, spot: string) {
    mesh.userData.spot = spot;
    mesh.traverse((child) => {
      child.userData.spot = spot;
    });
    clickable.push(mesh);
  }

  const ready = (async () => {
    const groups = new Map<string, Piece[]>();
    for (const entry of layout.pieces) {
      const list = groups.get(entry.url) ?? [];
      list.push(entry);
      groups.set(entry.url, list);
    }
    await Promise.all([...groups.entries()].map(async ([url, entries]) => {
      for (const entry of entries) {
        const mesh = await spawn(url, entry.kind === "floor" || entry.kind === "wall" ? "receive" : "cast");
        mesh.position.set(entry.x, entry.y, entry.z);
        mesh.rotation.y = entry.rot;
        scene.add(mesh);
        if (entry.kind === "wall") walls.push({ mesh, z: entry.z, cutaway: Boolean(entry.cutaway) });
        if (entry.kind === "light") {
          const light = new THREE.PointLight("#FF9A3C", options.getQuality() === "low" ? 3 : 7, 9, 1.4);
          light.position.set(entry.x, entry.y + 0.35, entry.z);
          scene.add(light);
          lights.push(light);
        }
        if (entry.id === "board-table") tag(mesh, "board");
        if (entry.id === "anvil") tag(mesh, "anvil");
        if (entry.id === "bench") tag(mesh, "bench");
        if (entry.id === "forge-barrel") tag(mesh, "forge");
        if (entry.label === "Door") tag(mesh, "exit");
      }
    }));
    const people = options.id === "market"
      ? [
          { id: "mira", model: heroModel("Knight"), weapon: item("hammer"), ...tile(1, 2) },
          { id: "orrin", model: heroModel("Mage"), weapon: item("journal_open"), ...tile(3, 2) },
          { id: "tallow", model: heroModel("Ranger"), weapon: dungeon("bottle_A_green"), ...tile(5, 1) },
        ]
      : [{ id: "forge", model: heroModel("Knight"), weapon: item("hammer"), ...tile(3, 1) }];
    for (const spot of options.spots) {
      const volume = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.3, 2.2, 10),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      volume.position.set(spot.x, 1.1, spot.z);
      scene.add(volume);
      tag(volume, spot.id);
    }
    const clips = (await loadGltf(ANIMATION_FILES[0])).animations.map((clip) => stripRootMotion(clip));
    const idle = clips.find((clip) => CLIP_ALIASES.idle.includes(clip.name));
    for (const person of people) {
      const model = await spawn(person.model);
      model.position.set(person.x, 0, person.z);
      scene.add(model);
      tag(model, person.id);
      if (person.weapon) {
        const held = await spawn(person.weapon, "none");
        held.position.set(0.2, 0.9, 0.2);
        model.add(held);
      }
      if (idle) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(idle).play();
        mixers.push(mixer);
      }
    }
    applyQuality();
  })().catch(() => undefined);

  function nearest() {
    let best: string | null = null;
    let distance = 4.2;
    for (const spot of options.spots) {
      const gap = Math.hypot(spot.x - focus.x, spot.z - focus.z);
      if (gap < distance) {
        distance = gap;
        best = spot.id;
      }
    }
    return best;
  }

  function pick(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickable, true);
    for (const hit of hits) {
      let node: THREE.Object3D | null = hit.object;
      while (node) {
        if (typeof node.userData.spot === "string") return node.userData.spot as string;
        node = node.parent;
      }
    }
    return null;
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
    if (options.getLocked()) return;
    if (event.key.toLowerCase() === "e") {
      if (event.repeat) return;
      event.preventDefault();
      const spot = nearest();
      if (spot) options.onUse(spot);
      return;
    }
    keys.add(event.key.toLowerCase());
    if (event.key === "q") yaw = THREE.MathUtils.clamp(yaw - 0.08, -0.7, 0.7);
    if (event.key === "c") yaw = THREE.MathUtils.clamp(yaw + 0.08, -0.7, 0.7);
    if (event.key.toLowerCase() === "r") {
      yaw = 0;
      view = 9;
      resize();
    }
  }
  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.key.toLowerCase());
  }
  function onPointerDown(event: PointerEvent) {
    downX = event.clientX;
    downY = event.clientY;
  }
  function onPointerUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;
    const spot = pick(event);
    if (spot && spot === nearest()) options.onUse(spot);
  }
  function onWheel(event: WheelEvent) {
    if (options.getLocked()) return;
    event.preventDefault();
    view = THREE.MathUtils.clamp(view + event.deltaY * 0.01, 4.5, 18);
    resize();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  applyQuality();
  resize();
  aim();
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!options.getLocked()) {
      if (keys.has("w")) focus.z -= 6 * dt;
      if (keys.has("s")) focus.z += 6 * dt;
      if (keys.has("a")) focus.x -= 6 * dt;
      if (keys.has("d")) focus.x += 6 * dt;
      focus.x = THREE.MathUtils.clamp(focus.x, 0, 5 * CELL);
      focus.z = THREE.MathUtils.clamp(focus.z, 0, 4 * CELL);
    }
    const flicker = 1.15 + Math.sin(now * 0.008) * 0.28;
    for (const light of lights) light.intensity = flicker;
    aim();
    const camSide = camera.position.z > focus.z;
    for (const wall of walls) wall.mesh.visible = !(wall.cutaway && camSide && wall.z > focus.z - 1);
    for (const mixer of mixers) mixer.update(dt);
    const id = nearest();
    if (id !== nearId) {
      nearId = id;
      options.onNear(id);
    }
    canvas.dataset.x = focus.x.toFixed(2);
    canvas.dataset.z = focus.z.toFixed(2);
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(tick);

  return {
    ready,
    dispose() {
      memory.set(options.id, { x: focus.x, z: focus.z, yaw, view });
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      renderer.dispose();
    },
  };
}
