import * as THREE from "three";
import { PALETTE } from "../game/visual/palette";
import { dungeon, heroModel, item } from "../game/content";
import { spawn } from "./loader";
import type { Quality } from "../game/content";

export interface PlaceSpot {
  id: string;
  label: string;
  prompt: string;
  x: number;
  z: number;
  color: string;
}

export interface PlacePose {
  x: number;
  z: number;
  yaw: number;
}

const poses = new Map<string, PlacePose>();

export function mountPlace(canvas: HTMLCanvasElement, options: {
  id: "market" | "workshop";
  spots: PlaceSpot[];
  props: Array<{ url: string; x: number; z: number; rot?: number; scale?: number }>;
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
  renderer.setClearColor(options.id === "workshop" ? "#1a120e" : PALETTE.fog);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(options.id === "workshop" ? "#1a120e" : PALETTE.fog, 12, 28);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
  const saved = poses.get(options.id) ?? (options.id === "market"
    ? { x: 5.2, z: 6.5, yaw: Math.PI }
    : { x: 10, z: 9.2, yaw: Math.PI });
  const player = { ...saved };
  const keys = new Set<string>();
  let nearId: string | null = null;
  let frame = 0;

  scene.add(new THREE.HemisphereLight("#f0d7b0", "#2a1c14", 0.45));
  const sun = new THREE.DirectionalLight("#ffd7a1", 0.9);
  sun.position.set(-4, 10, 6);
  scene.add(sun);
  const fill = new THREE.PointLight(options.id === "workshop" ? "#ff7a32" : "#ffb15a", options.id === "workshop" ? 2.2 : 1.2, 14);
  fill.position.set(10, 2.2, 8);
  scene.add(fill);

  const floorMat = new THREE.MeshStandardMaterial({ color: options.id === "workshop" ? "#3b2a22" : "#4a3b30", roughness: 0.86 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.2, 16), floorMat);
  floor.position.set(10, -0.1, 8);
  scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: PALETTE.darkStone, roughness: 0.9 });
  for (const wall of [
    [10, 0.8, -0.2, 22, 1.6, 0.4],
    [-0.2, 0.8, 8, 0.4, 1.6, 16],
    [20.2, 0.8, 8, 0.4, 1.6, 16],
  ]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall[3], wall[4], wall[5]), wallMat);
    mesh.position.set(wall[0], wall[1], wall[2]);
    scene.add(mesh);
  }
  const blocks = [
    { minX: -1, maxX: 21, minZ: -1, maxZ: 0.4 },
    { minX: -1, maxX: 0.4, minZ: -1, maxZ: 17 },
    { minX: 19.6, maxX: 21, minZ: -1, maxZ: 17 },
  ];

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.7, 3, 8),
    new THREE.MeshStandardMaterial({ color: "#8d6a45", roughness: 0.7 }),
  );
  body.position.set(player.x, 0.7, player.z);
  scene.add(body);
  const spots = new THREE.Group();
  scene.add(spots);
  for (const spot of options.spots) {
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: spot.color, emissive: spot.color, emissiveIntensity: 0.15 }),
    );
    stand.position.set(spot.x, 0.04, spot.z);
    stand.userData.spot = spot.id;
    spots.add(stand);
  }

  const ready = (async () => {
    const figure = await spawn(heroModel("Rogue"), "cast").catch(() => null);
    if (figure) {
      figure.position.y = 0;
      figure.scale.setScalar(0.9);
      body.add(figure);
      body.material = new THREE.MeshStandardMaterial({ visible: false });
    }
    await Promise.all(options.props.map(async (prop) => {
      const mesh = await spawn(prop.url, "cast");
      mesh.position.set(prop.x, 0, prop.z);
      mesh.rotation.y = prop.rot ?? 0;
      mesh.scale.setScalar(prop.scale ?? 1);
      scene.add(mesh);
    }));
  })().catch(() => undefined);

  function quality() {
    const level = options.getQuality();
    renderer.setPixelRatio(level === "low" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = level !== "low";
  }
  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  function blocked(x: number, z: number) {
    if (x < 0.6 || x > 19.4 || z < 0.6 || z > 14.6) return true;
    return blocks.some((box) => x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ);
  }
  function nearest() {
    let best: PlaceSpot | null = null;
    let distance = 1.8;
    for (const spot of options.spots) {
      const gap = Math.hypot(spot.x - player.x, spot.z - player.z);
      if (gap < distance) {
        distance = gap;
        best = spot;
      }
    }
    return best;
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
    keys.add(event.key.toLowerCase());
    if (event.key.toLowerCase() === "e" && !options.getLocked() && nearId) {
      event.preventDefault();
      options.onUse(nearId);
    }
  }
  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.key.toLowerCase());
  }
  function onPointer(event: PointerEvent) {
    if (options.getLocked() || event.buttons !== 1) return;
    player.yaw -= event.movementX * 0.005;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointermove", onPointer);
  quality();
  resize();
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);
  const clock = new THREE.Clock();

  function tick() {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!options.getLocked()) {
      const forward = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
      const strafe = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const speed = 4.5;
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      const dx = (sin * forward + cos * strafe) * speed * dt;
      const dz = (cos * forward - sin * strafe) * speed * dt;
      if (!blocked(player.x + dx, player.z)) player.x += dx;
      if (!blocked(player.x, player.z + dz)) player.z += dz;
      if (keys.has("q")) player.yaw += dt;
      if (keys.has("arrowleft")) player.yaw += dt;
      if (keys.has("arrowright")) player.yaw -= dt;
    }
    body.position.set(player.x, 0.7, player.z);
    canvas.dataset.x = player.x.toFixed(2);
    canvas.dataset.z = player.z.toFixed(2);
    body.rotation.y = player.yaw;
    const spot = nearest();
    const id = spot?.id ?? null;
    if (id !== nearId) {
      nearId = id;
      options.onNear(id);
    }
    const look = 6;
    camera.position.set(player.x - Math.sin(player.yaw) * look, 4.2, player.z - Math.cos(player.yaw) * look);
    camera.lookAt(player.x, 1.1, player.z);
    if (options.id === "workshop") fill.intensity = 2 + Math.sin(clock.elapsedTime * 8) * 0.35;
    renderer.render(scene, camera);
  }
  tick();

  return {
    ready,
    dispose() {
      poses.set(options.id, { x: player.x, z: player.z, yaw: player.yaw });
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointermove", onPointer);
      keys.clear();
      renderer.dispose();
    },
  };
}

export const MARKET_SPOTS: PlaceSpot[] = [
  { id: "mira", label: "Mira", prompt: "Press E to speak with Mira", x: 4, z: 6, color: "#b5532e" },
  { id: "orrin", label: "Orrin", prompt: "Press E to speak with Orrin", x: 10, z: 6, color: "#c9a15b" },
  { id: "tallow", label: "Tallow", prompt: "Press E to speak with Tallow", x: 16, z: 6, color: "#f2c14e" },
  { id: "board", label: "Listing board", prompt: "Press E to open the listing board", x: 16, z: 11, color: "#3fa7a0" },
  { id: "exit", label: "Road", prompt: "Press E to leave the market", x: 10, z: 14.2, color: "#e9d8b4" },
];

export const WORKSHOP_SPOTS: PlaceSpot[] = [
  { id: "anvil", label: "Anvil", prompt: "Press E to use the anvil", x: 5, z: 6, color: "#8d6a45" },
  { id: "bench", label: "Armor bench", prompt: "Press E to use the armor bench", x: 15, z: 6, color: "#f2c14e" },
  { id: "forge", label: "Forge", prompt: "Press E to use the forge", x: 10, z: 8, color: "#ff7a32" },
  { id: "exit", label: "Road", prompt: "Press E to leave the workshop", x: 10, z: 14.2, color: "#e9d8b4" },
];

export function marketProps() {
  return [
    { url: item("anvil"), x: 4.8, z: 5.2, scale: 0.8 },
    { url: dungeon("table_medium"), x: 4, z: 6.8 },
    { url: dungeon("table_medium"), x: 10, z: 6.8 },
    { url: dungeon("table_medium"), x: 16, z: 6.8 },
    { url: dungeon("barrel_large"), x: 2, z: 3 },
    { url: dungeon("crates_stacked"), x: 18, z: 3 },
    { url: dungeon("bottle_A_green"), x: 16.4, z: 6.4, scale: 1.4 },
    { url: dungeon("banner_brown"), x: 10, z: 1.2 },
    { url: item("journal_open"), x: 10, z: 10, scale: 1.2 },
    { url: heroModel("Barbarian"), x: 4, z: 5.2, scale: 0.85 },
    { url: heroModel("Mage"), x: 10, z: 5.2, scale: 0.85 },
    { url: heroModel("Ranger"), x: 16, z: 5.2, scale: 0.85 },
  ];
}

export function workshopProps() {
  return [
    { url: item("anvil"), x: 5, z: 5.4 },
    { url: item("hammer"), x: 5.6, z: 5.6, scale: 1.3 },
    { url: dungeon("table_long"), x: 15, z: 6.4 },
    { url: dungeon("shelves"), x: 2.2, z: 4 },
    { url: dungeon("sword_shield"), x: 18, z: 4 },
    { url: dungeon("barrel_small"), x: 8, z: 8 },
    { url: heroModel("Knight"), x: 10, z: 6.6, scale: 0.85, rot: Math.PI },
  ];
}
