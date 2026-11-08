import * as THREE from "three";
import { PALETTE } from "../game/visual/palette";
import { dungeon } from "../game/content";
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
  renderer.setClearColor(PALETTE.fog);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, 28, 70);
  const camera = new THREE.OrthographicCamera(-20, 20, 14, -14, 0.1, 120);
  const focus = new THREE.Vector3(0, 0, 0);
  let yaw = 0.6;
  let view = 18;
  const hemi = new THREE.HemisphereLight("#d9c7a2", "#241910", 0.55);
  const sun = new THREE.DirectionalLight("#ffe0b0", 1.1);
  sun.position.set(-8, 18, 10);
  sun.castShadow = true;
  scene.add(hemi, sun);
  const torch = new THREE.PointLight(PALETTE.torch, 1.4, 18);
  torch.position.set(0, 3, 8);
  scene.add(torch);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.4, 34),
    new THREE.MeshStandardMaterial({ color: "#3A2A1A", roughness: 0.9 }),
  );
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  scene.add(ground);
  const river = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.08, 4),
    new THREE.MeshStandardMaterial({ color: "#1d3a3a", roughness: 0.4, metalness: 0.1 }),
  );
  river.position.set(0, 0.02, 0);
  scene.add(river);
  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.85 });
  const roadNS = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 30), roadMat);
  roadNS.position.set(0, 0.05, 0);
  const roadEW = new THREE.Mesh(new THREE.BoxGeometry(40, 0.08, 2.2), roadMat);
  roadEW.position.set(0, 0.05, -2);
  scene.add(roadNS, roadEW);
  for (const bridgeX of [-8, 8]) {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 4.4), new THREE.MeshStandardMaterial({ color: "#6b4a2e", roughness: 0.8 }));
    bridge.position.set(bridgeX, 0.12, 0);
    scene.add(bridge);
  }
  const ridgeMat = new THREE.MeshStandardMaterial({ color: PALETTE.darkStone, roughness: 0.95 });
  for (const hill of [[-18, -12, 6], [18, -11, 5], [-16, 12, 4], [17, 11, 5.5]]) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(hill[2], hill[2] * 1.3, 5), ridgeMat);
    mesh.position.set(hill[0], hill[2] * 0.4, hill[1]);
    scene.add(mesh);
  }
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
      const color = marker.state === "CLOSED" ? "#5c584f" : marker.active ? "#ff9a3c" : "#f2c14e";
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 0.4, 6),
        new THREE.MeshStandardMaterial({ color: marker.state === "CLOSED" ? "#3a3834" : "#4a3828", roughness: 0.8 }),
      );
      plinth.position.y = 0.2;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.5 + marker.tier * 0.35, 0.7),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: marker.active ? "#ff9a3c" : "#000000", emissiveIntensity: marker.active ? 0.35 : 0 }),
      );
      tower.position.y = 0.7 + marker.tier * 0.15;
      group.add(plinth, tower);
      if (marker.own) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.15, 0.06, 6, 16),
          new THREE.MeshStandardMaterial({ color: PALETTE.gold, emissive: PALETTE.gold, emissiveIntensity: 0.2 }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.08;
        group.add(ring);
      }
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

  const props: Array<[string, number, number, number]> = [
    ["banner_red", -14, -8, 0],
    ["pillar", 16, -2, 0.4],
    ["rubble_large", -12, 6, 0],
    ["wall_broken", 8, -8, 1],
    ["barrel_large", 0, 8, 0],
  ];
  const ready = Promise.all(props.map(async ([file, x, z, rot]) => {
    const mesh = await spawn(dungeon(file), "cast");
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rot;
    mesh.scale.setScalar(file === "banner_red" ? 0.8 : 1);
    scene.add(mesh);
  })).catch(() => undefined);

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
        const point = new THREE.Vector3(marker.x, 1.2, marker.z).project(camera);
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
