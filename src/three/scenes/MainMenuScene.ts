import gsap from "gsap";
import * as THREE from "three";
import { MENU_ASSETS } from "../../assets/manifest/mainMenuAssets";
import { PALETTE } from "../../game/visual/palette";
import type { Quality } from "../../game/content";
import { loadGltf, spawn, stripRootMotion } from "../loader";

export interface MainMenuHandle {
  ready: Promise<void>;
  resize: () => void;
  dispose: () => void;
  playTrailer: () => void;
  skipTrailer: () => void;
  failed: boolean;
}

export function mountMainMenu(canvas: HTMLCanvasElement, quality: Quality): MainMenuHandle {
  const status = { failed: false };
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== "low", alpha: false, powerPreference: "high-performance" });
  } catch {
    status.failed = true;
    return { ready: Promise.resolve(), resize: () => undefined, dispose: () => undefined, playTrailer: () => undefined, skipTrailer: () => undefined, failed: true };
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.2;
  renderer.setPixelRatio(quality === "low" ? 1 : Math.min(window.devicePixelRatio, 1.25));
  renderer.setClearColor(PALETTE.shadow);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.shadow, 12, 38);
  scene.add(new THREE.HemisphereLight("#ffd7b0", "#241810", 0.55));
  const moon = new THREE.DirectionalLight("#9eb4d6", 0.35);
  moon.position.set(-6, 8, 4);
  scene.add(moon);
  const entrance = new THREE.PointLight(PALETTE.torch, 0, 14, 1.6);
  entrance.position.set(0, 2.4, -4);
  scene.add(entrance);
  const leftTorch = new THREE.PointLight(PALETTE.ember, 0, 7, 1.8);
  leftTorch.position.set(-3.2, 1.8, 1);
  scene.add(leftTorch);
  const rightTorch = new THREE.PointLight(PALETTE.torch, 0, 7, 1.8);
  rightTorch.position.set(3.2, 1.8, 1);
  scene.add(rightTorch);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  const look = new THREE.Vector3(0, 1.5, -1);
  let angle = 0.55;
  let running = true;
  let mode: "orbit" | "trailer" = "orbit";
  let trailer: gsap.core.Timeline | null = null;
  const mixers: THREE.AnimationMixer[] = [];
  const banners: THREE.Object3D[] = [];
  let last = performance.now();

  const emberCount = quality === "low" ? 24 : 48;
  const emberPositions = new Float32Array(emberCount * 3);
  for (let index = 0; index < emberCount; index += 1) {
    emberPositions[index * 3] = (Math.random() - 0.5) * 10;
    emberPositions[index * 3 + 1] = Math.random() * 4;
    emberPositions[index * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  const embers = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: PALETTE.torch, size: 0.08, transparent: true, depthWrite: false }),
  );
  embers.geometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
  scene.add(embers);

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function aim() {
    camera.position.set(Math.sin(angle) * 13, 4.4, Math.cos(angle) * 12);
    camera.lookAt(look);
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (mode === "orbit") angle += dt * 0.05;
    for (const mixer of mixers) mixer.update(dt);
    for (const banner of banners) banner.rotation.z = Math.sin(now * 0.001) * 0.04;
    const flicker = 1 + Math.sin(now * 0.01) * 0.08;
    leftTorch.intensity = 6 * flicker * Math.min(1, renderer.toneMappingExposure);
    rightTorch.intensity = 5.5 * flicker * Math.min(1, renderer.toneMappingExposure);
    for (let index = 0; index < emberCount; index += 1) {
      emberPositions[index * 3 + 1] += dt * 0.35;
      if (emberPositions[index * 3 + 1] > 4.5) emberPositions[index * 3 + 1] = 0.2;
    }
    embers.geometry.attributes.position.needsUpdate = true;
    aim();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  async function place(url: string, x: number, y: number, z: number, rotY = 0, scale = 1) {
    const mesh = await spawn(url, "none");
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.scale.setScalar(scale);
    scene.add(mesh);
    return mesh;
  }

  async function actor(url: string, x: number, z: number, rotY: number, idle: THREE.AnimationClip | null) {
    const mesh = await spawn(url, "none");
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    if (!idle) return mesh;
    const mixer = new THREE.AnimationMixer(mesh);
    mixer.clipAction(idle).play();
    mixers.push(mixer);
    return mesh;
  }

  const ready = (async () => {
    const general = await loadGltf(MENU_ASSETS.idle);
    const idle = general.animations.find((clip) => clip.name === "Idle_A") ?? null;
    const clip = idle ? stripRootMotion(idle) : null;
    await place(MENU_ASSETS.floor, 0, 0, 0);
    await place(MENU_ASSETS.floor, -4, 0, 0);
    await place(MENU_ASSETS.floor, 4, 0, 0);
    await place(MENU_ASSETS.floor, 0, 0, -4);
    await place(MENU_ASSETS.floor, 0, 0, 4);
    await place(MENU_ASSETS.stairs, 0, 0, -1.2);
    await place(MENU_ASSETS.gate, 0, 0, -4.2);
    await place(MENU_ASSETS.wall, -4.2, 0, -4);
    await place(MENU_ASSETS.wall, 4.2, 0, -4);
    await place(MENU_ASSETS.pillar, -2.4, 0, -2.2);
    await place(MENU_ASSETS.pillar, 2.4, 0, -2.2);
    banners.push(await place(MENU_ASSETS.banner, -3.4, 0, -3.2));
    banners.push(await place(MENU_ASSETS.banner, 3.4, 0, -3.2));
    await place(MENU_ASSETS.torch, -3.1, 0, 0.4);
    await place(MENU_ASSETS.torch, 3.1, 0, 0.4);
    await place(MENU_ASSETS.chest, 2.2, 0, -0.4);
    await actor(MENU_ASSETS.brann, -1.5, 2.4, Math.PI, clip);
    await actor(MENU_ASSETS.kara, 0, 2.8, Math.PI, clip);
    await actor(MENU_ASSETS.ivo, 1.5, 2.4, Math.PI, clip);
    await actor(MENU_ASSETS.guard, -1.6, -2.6, 0, clip);
    await actor(MENU_ASSETS.warrior, 1.6, -2.6, 0, clip);
    gsap.to(renderer, { toneMappingExposure: 1.05, duration: 1.1, ease: "power2.out" });
    gsap.to(entrance, { intensity: 8, duration: 1.1, ease: "power2.out" });
  })().catch(() => {
    status.failed = true;
  });

  function playTrailer() {
    trailer?.kill();
    mode = "trailer";
    const shot = { angle, x: look.x, y: look.y, z: look.z };
    trailer = gsap.timeline({
      onComplete: () => {
        mode = "orbit";
      },
    });
    trailer
      .to(shot, { angle: 0.15, x: 0, y: 2.2, z: -3, duration: 2.2, ease: "power1.inOut", onUpdate: () => { angle = shot.angle; look.set(shot.x, shot.y, shot.z); } })
      .to(shot, { angle: 0.9, x: -1.5, y: 1.5, z: 2.4, duration: 1.6, onUpdate: () => { angle = shot.angle; look.set(shot.x, shot.y, shot.z); } })
      .to(shot, { angle: 0.2, x: 0, y: 1.5, z: 2.8, duration: 1.4, onUpdate: () => { angle = shot.angle; look.set(shot.x, shot.y, shot.z); } })
      .to(shot, { angle: -0.2, x: 1.5, y: 1.6, z: 2.4, duration: 1.4, onUpdate: () => { angle = shot.angle; look.set(shot.x, shot.y, shot.z); } })
      .to(shot, { angle: 0.4, x: 0, y: 1.4, z: -2.2, duration: 1.8, onUpdate: () => { angle = shot.angle; look.set(shot.x, shot.y, shot.z); } })
      .to(shot, { angle: 0.55, x: 0, y: 1.5, z: -1, duration: 1.4, onUpdate: () => { angle = shot.angle; look.set(shot.x, shot.y, shot.z); } });
  }

  function skipTrailer() {
    trailer?.progress(1).kill();
    trailer = null;
    mode = "orbit";
    look.set(0, 1.5, -1);
  }

  resize();
  aim();
  requestAnimationFrame(frame);
  return {
    ready,
    resize,
    get failed() {
      return status.failed;
    },
    playTrailer,
    skipTrailer,
    dispose() {
      running = false;
      trailer?.kill();
      renderer.dispose();
    },
  };
}
