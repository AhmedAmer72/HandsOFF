import * as THREE from "three";
import { dungeon, weapon } from "../game/content";
import { spawn } from "./loader";

/** Floating KayKit props behind the landing headline, in the CAMP hero arrangement. */
export function mountLandingProps(canvas: HTMLCanvasElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return { dispose() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0.4, 8);
  scene.add(new THREE.AmbientLight("#ffe7c2", 0.45));
  const gold = new THREE.PointLight("#ffb03a", 18, 12);
  gold.position.set(-2, 1, 3);
  const blue = new THREE.PointLight("#3ec6ff", 12, 10);
  blue.position.set(2.4, -0.4, 2);
  scene.add(gold, blue);
  const roots: THREE.Object3D[] = [];
  let frame = 0;
  const ready = (async () => {
    const specs = [
      { url: weapon("axe_2handed"), x: -2.3, y: 0.7, z: 0, s: 1.3, ry: 0.4 },
      { url: dungeon("chest_gold"), x: 2.15, y: 1.15, z: -0.2, s: 1.1, ry: -0.5 },
      { url: weapon("dagger"), x: 2.5, y: -0.9, z: 0.2, s: 1.4, ry: 0.8 },
      { url: dungeon("chest"), x: -1.7, y: -1.25, z: 0.3, s: 0.85, ry: 0.2 },
    ];
    for (const spec of specs) {
      const mesh = await spawn(spec.url, "cast");
      mesh.position.set(spec.x, spec.y, spec.z);
      mesh.scale.setScalar(spec.s);
      mesh.rotation.y = spec.ry;
      scene.add(mesh);
      roots.push(mesh);
    }
  })().catch(() => undefined);

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);
  resize();
  const clock = new THREE.Clock();
  function tick() {
    frame = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    roots.forEach((mesh, index) => {
      mesh.rotation.y += 0.004;
      mesh.position.y += Math.sin(t * 1.2 + index) * 0.002;
    });
    renderer.render(scene, camera);
  }
  tick();
  return {
    ready,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    },
  };
}

/** One KayKit model, centered, for a landing card. */
export function mountOneProp(canvas: HTMLCanvasElement, url: string) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return { dispose() {} };
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0.6, 4.2);
  scene.add(new THREE.AmbientLight("#fff1d6", 0.7));
  const key = new THREE.PointLight("#ffb347", 12, 10);
  key.position.set(1, 2, 2);
  scene.add(key);
  let mesh: THREE.Object3D | null = null;
  let frame = 0;
  const ready = spawn(url, "cast").then((model) => {
    model.position.y = -0.2;
    scene.add(model);
    mesh = model;
  }).catch(() => undefined);
  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);
  resize();
  function tick() {
    frame = requestAnimationFrame(tick);
    if (mesh) mesh.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  tick();
  return {
    ready,
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    },
  };
}
