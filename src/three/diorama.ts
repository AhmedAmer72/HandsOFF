import * as THREE from "three";
import { PALETTE } from "../game/visual/palette";
import { ISLAND_FOCUS, hexIsland } from "../game/world/hexIsland";
import { spawn } from "./loader";
import type { Quality } from "../game/content";

export interface MapMarker {
  id: string;
  name: string;
  x: number;
  z: number;
  state: "OPEN" | "CLOSED";
  active: boolean;
  traffic: number;
  own: boolean;
  tier: number;
}

export function mountDiorama(canvas: HTMLCanvasElement, hooks: {
  getMarkers: () => MapMarker[];
  getQuality: () => Quality;
  getReduceMotion: () => boolean;
  onSelect: (id: string | null) => void;
  onLabels?: (labels: Array<{ id: string; name: string; x: number; y: number }>) => void;
}) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    return { ready: Promise.resolve(), dispose() {} };
  }
  renderer.setClearColor("#14161c");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#14161c", 24, 55);
  const camera = new THREE.OrthographicCamera(-20, 20, 14, -14, 0.1, 160);
  const focus = new THREE.Vector3(ISLAND_FOCUS.x, 0, ISLAND_FOCUS.z);
  let yaw = 0.35;
  let view = 14;
  const hemi = new THREE.HemisphereLight("#d9c7a2", "#241910", 0.55);
  const sun = new THREE.DirectionalLight("#ffe0b0", 1.1);
  sun.position.set(-8, 18, 10);
  sun.castShadow = true;
  scene.add(hemi, sun);
  const torch = new THREE.PointLight(PALETTE.torch, 1.4, 18);
  torch.position.set(0, 3, 8);
  scene.add(torch);

  const markers = new THREE.Group();
  scene.add(markers);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let signature = "";
  let labelTick = 0;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let frame = 0;

  function applyQuality() {
    const quality = hooks.getQuality();
    const ratio = quality === "low" ? 1 : quality === "medium" ? 1.25 : Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.shadowMap.enabled = quality !== "low";
    sun.castShadow = quality !== "low";
    sun.intensity = quality === "low" ? 0.7 : 1.1;
  }

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    const aspect = width / height;
    camera.left = -view * aspect;
    camera.right = view * aspect;
    camera.top = view * 0.72;
    camera.bottom = -view * 0.72;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function aim() {
    const dist = 28;
    camera.position.set(focus.x + Math.sin(yaw) * dist, 18, focus.z + Math.cos(yaw) * dist);
    camera.lookAt(focus);
  }

  function rebuild(list: MapMarker[]) {
    markers.clear();
    for (const marker of list) {
      const group = new THREE.Group();
      group.position.set(marker.x, 0, marker.z);
      group.userData.id = marker.id;
      const color = marker.state === "CLOSED" ? "#6d6a62" : marker.active ? "#ff9a3c" : PALETTE.gold;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(marker.own ? 1.15 : 0.95, 0.07, 8, 6),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: marker.state === "CLOSED" ? 0.05 : 0.35 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08;
      group.add(ring);
      const arrows = Math.max(0, Math.min(3, marker.traffic));
      for (let index = 0; index < arrows; index += 1) {
        const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), new THREE.MeshStandardMaterial({ color: PALETTE.memory }));
        arrow.position.set(-1.4 - index * 0.35, 0.35, 0.8);
        arrow.rotation.z = Math.PI / 2;
        group.add(arrow);
      }
      if (marker.active && !hooks.getReduceMotion()) {
        const light = new THREE.PointLight("#ff9a3c", 0.8, 6);
        light.position.y = 1.6;
        group.add(light);
      }
      markers.add(group);
    }
  }

  const ready = (async () => {
    const pieces = hexIsland();
    const groups = new Map<string, typeof pieces>();
    for (const piece of pieces) {
      const list = groups.get(piece.url) ?? [];
      list.push(piece);
      groups.set(piece.url, list);
    }
    await Promise.all([...groups.entries()].map(async ([url, entries]) => {
      for (const entry of entries) {
        const mesh = await spawn(url, "cast");
        mesh.position.set(entry.x, entry.y, entry.z);
        mesh.rotation.y = entry.rot;
        scene.add(mesh);
      }
    }));
  })().catch(() => undefined);

  function pick(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(markers.children, true);
    const hit = hits.find((entry) => entry.object.parent);
    let node: THREE.Object3D | null = hit?.object ?? null;
    while (node && !node.userData.id) node = node.parent;
    return (node?.userData.id as string | undefined) ?? null;
  }

  function onPointerDown(event: PointerEvent) {
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    moved += Math.abs(dx);
    lastX = event.clientX;
    yaw -= dx * 0.005;
  }
  function onPointerUp(event: PointerEvent) {
    dragging = false;
    if (moved < 6) hooks.onSelect(pick(event));
  }
  function onWheel(event: WheelEvent) {
    event.preventDefault();
    view = THREE.MathUtils.clamp(view + event.deltaY * 0.01, 10, 28);
    resize();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  const clock = new THREE.Clock();
  applyQuality();
  resize();

  function tick() {
    frame = requestAnimationFrame(tick);
    const list = hooks.getMarkers();
    const next = list.map((marker) => `${marker.id}:${marker.state}:${marker.active}:${marker.traffic}:${marker.own}:${marker.x}:${marker.z}`).join("|");
    if (next !== signature) {
      signature = next;
      rebuild(list);
    }
    const elapsed = clock.getElapsedTime();
    if (!hooks.getReduceMotion()) torch.intensity = 1.2 + Math.sin(elapsed * 3) * 0.15;
    aim();
    labelTick += 1;
    if (hooks.onLabels && labelTick % 12 === 0) {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      hooks.onLabels(list.map((marker) => {
        const point = new THREE.Vector3(marker.x, 2.2, marker.z).project(camera);
        return {
          id: marker.id,
          name: marker.name,
          x: (point.x * 0.5 + 0.5) * width,
          y: (-point.y * 0.5 + 0.5) * height,
        };
      }));
    }
    renderer.render(scene, camera);
  }
  tick();
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);

  return {
    ready,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      renderer.dispose();
    },
  };
}
