import * as THREE from "three";
import { TRAP_DEFINITIONS, TRAP_IDS, type TrapId } from "../game/config/trapDefinitions";
import { spawn } from "../three/loader";

const cache = new Map<TrapId, string>();

export async function renderTrapIcons(): Promise<Record<TrapId, string>> {
  if (cache.size === TRAP_IDS.length) return Object.fromEntries(cache) as Record<TrapId, string>;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#fff4e5", "#3a2a22", 1.15));
  const key = new THREE.DirectionalLight("#ffe0b0", 1.6);
  key.position.set(3, 6, 4);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
  const icons = {} as Record<TrapId, string>;
  for (const id of TRAP_IDS) {
    const mesh = await spawn(TRAP_DEFINITIONS[id].model, "none");
    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.4);
    camera.position.set(center.x + radius * 0.9, center.y + radius * 0.85, center.z + radius * 1.15);
    camera.lookAt(center);
    renderer.render(scene, camera);
    const url = canvas.toDataURL("image/png");
    cache.set(id, url);
    icons[id] = url;
    scene.remove(mesh);
  }
  renderer.dispose();
  return icons;
}
