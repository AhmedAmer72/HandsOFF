import * as THREE from "three";
import type { AnimationClip } from "three";
import { loadGltf, spawn, stripRootMotion } from "./loader";

export function mountGallery(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor("#1a120f");
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#fff1df", "#3a2418", 1.1));
  const key = new THREE.DirectionalLight("#ffe0bf", 1.4);
  key.position.set(3, 5, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#9eb6ff", 0.45);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 48),
    new THREE.MeshStandardMaterial({ color: "#2a1d16", roughness: 0.9 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001;
  scene.add(ground);
  let mixer: THREE.AnimationMixer | null = null;
  let clips: AnimationClip[] = [];
  let yaw = 0.6;
  let pitch = 0.4;
  let dist = 4;
  let running = true;
  let dragging = false;
  let last = performance.now();

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function frameCamera() {
    const box = new THREE.Box3().setFromObject(pivot);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()).length();
    dist = THREE.MathUtils.clamp(size * 1.8, 1.8, 16);
    const center = box.getCenter(new THREE.Vector3());
    pivot.position.sub(center);
  }

  function aim() {
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist + 0.4,
      Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    camera.lookAt(0, 0, 0);
  }

  function loop(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    mixer?.update(dt);
    aim();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointerdown", () => { dragging = true; });
  window.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    yaw += event.movementX * 0.01;
    pitch = THREE.MathUtils.clamp(pitch + event.movementY * 0.008, -0.2, 1.2);
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    dist = THREE.MathUtils.clamp(dist + event.deltaY * 0.005, 0.8, 18);
  }, { passive: false });
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);

  return {
    async show(url: string) {
      pivot.clear();
      mixer = null;
      clips = [];
      const model = await spawn(url);
      pivot.add(model);
      const source = await loadGltf(url);
      clips = source.animations.map((clip) => stripRootMotion(clip));
      if (clips.length) {
        mixer = new THREE.AnimationMixer(model);
        const idle = clips.find((clip) => clip.name === "Idle_A") ?? clips.find((clip) => clip.name !== "T-Pose");
        if (idle) mixer.clipAction(idle).play();
      }
      frameCamera();
      return clips.map((clip) => clip.name).filter((name) => name !== "T-Pose");
    },
    play(name: string) {
      if (!mixer) return;
      const clip = clips.find((entry) => entry.name === name);
      if (!clip) return;
      mixer.stopAllAction();
      mixer.clipAction(clip).reset().play();
    },
    dispose() {
      running = false;
      renderer.dispose();
    },
    resize,
  };
}
