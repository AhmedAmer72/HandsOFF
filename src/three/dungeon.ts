import gsap from "gsap";
import * as THREE from "three";
import { ANIMATION_FILES, CELL, CLIP_ALIASES, HEROES, item, monsterModel, type HeroId, type Piece, type Quality, type WorldMode } from "../game/content";
import { HERO_PROFILES } from "../game/config/heroProfiles";
import { ENTRANCE_TILES, HERO_POSTS, ROOM_GATES, RULES, isEntranceTile } from "../game/config/gameRules";
import { ashgatePieces } from "../game/world";
import { TRAP_DEFINITIONS, type TrapId } from "../game/config/trapDefinitions";
import type { PlacedTrap } from "../game/engine/types";
import type { VisualStep } from "../game/store";
import { sfx } from "../game/audio";
import { loadGltf, spawn, stripRootMotion } from "./loader";
import { FEEL } from "../../rules/feel";
import { percentile, shakeOffset, visualScale } from "../game/visual/feel";

export interface DungeonHooks {
  getHero: () => HeroId;
  getQuality: () => Quality;
  getMode: () => WorldMode;
  getTrap: () => string | null;
  getSpikeBonus: () => number;
  onSelect: (info: { label: string; file: string; pack: string; note?: string } | null) => void;
  onHeroDamage: (amount: number) => void;
  onEnemyDamage: (id: string, amount: number) => void;
  onEnemies: (enemies: { id: string; name: string; hp: number; maxHp: number; file: string }[]) => void;
  tryPlace: (trapId: TrapId, ix: number, iz: number) => string;
  relayTo: (id: string, ix: number, iz: number) => boolean;
  getTraps: () => PlacedTrap[];
  onStats: (stats: { fps: number; min: number; avg: number; triangles: number; calls: number; renderer: string; p95?: number; textures?: number }) => void;
  onDiary: (phase: "decision") => void;
  diaryChoice: () => "idle" | "decision" | "burned" | "escaped";
  onPrompt: (text: string) => void;
  onGate: () => void;
  onBurn: () => void;
  onPossess: () => void;
  onMerchant: (id: string) => void;
  onCraft: () => void;
  onTrigger: (id: string) => void;
  onBrace: () => void;
  armTrap: (trapId: TrapId) => void;
  clearArm: () => void;
  getPhase: () => string;
  getDay: () => number;
  getShelf: () => { mira: number; tallow: number; orrin: number };
  getCue?: () => { id: string; action: string; nonce: number } | null;
  getReduceMotion?: () => boolean;
  getChain?: () => number;
  getVault?: () => number;
  onRoomGate: (id: string) => boolean;
  getClosedGates: () => string[];
  /** 0 pauses the raid walk. 2 plays it at double speed. */
  getPace?: () => number;
}

interface Actor {
  id: string;
  name: string;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  family: "hero" | "skeleton" | "merchant";
  action: string;
  current: THREE.AnimationAction | null;
  speed: number;
  hp: number;
  maxHp: number;
  file: string;
  home: THREE.Vector3;
  weaponNote: string;
  busyUntil: number;
}

const TORCH = new THREE.Color("#FF9A3C");

export function mountDungeon(canvas: HTMLCanvasElement, hooks: DungeonHooks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor("#14100E");

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#1B1A22", 140, 380);
  scene.add(new THREE.HemisphereLight("#ffe0bf", "#2a1c16", 0.72));
  const hallFocus = new THREE.Vector3(15.5 * CELL, 0, 12.2 * CELL);
  const sun = new THREE.DirectionalLight("#d7e4ff", 0.55);
  sun.position.set(hallFocus.x + 24, 40, hallFocus.z + 18);
  sun.target.position.copy(hallFocus);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 280;
  sun.shadow.camera.left = -130;
  sun.shadow.camera.right = 130;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  scene.add(sun);

  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 420);
  const focus = new THREE.Vector3(8, 0, 8);
  let yaw = 0;
  const HALL_VIEW = 68;
  const RAIDER_VIEW = 4.5;
  let view = HALL_VIEW;
  let releaseZoom: gsap.core.Tween | null = null;
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const selectables: THREE.Object3D[] = [];
  const floors: THREE.Object3D[] = [];
  const actors: Actor[] = [];
  const roomGates: { id: string; ix: number; iz: number; mesh: THREE.Object3D; shut: number; open: number }[] = [];
  const placed: { id: string; trapId: string; mesh: THREE.Object3D; x: number; z: number; spent: boolean }[] = [];
  let clips: THREE.AnimationClip[] = [];
  let hero: Actor | null = null;
  let pendingRelay: string | null = null;
  let trapDrag: { id: string; x: number; y: number } | null = null;
  let lastPrompt = "";
  let journal: THREE.Object3D | null = null;
  let running = true;
  let last = performance.now();
  let fpsAccum = 0;
  let frames = 0;
  let lastStat = 0;
  let minFps = 999;
  let avgFps = 0;
  let samples = 0;
  let rendererInfo = "";
  let placing: THREE.Object3D | null = null;
  let diaryPlayed = false;
  let scripted = false;
  const movers: { actor: Actor; x: number; z: number; resolve: () => void }[] = [];
  let aggro = false;
  let burnStarted = false;
  let releaseStarted = false;
  const keys = new Set<string>();

  const groundPick = new THREE.Mesh(
    new THREE.PlaneGeometry(168, 128),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  groundPick.rotation.x = -Math.PI / 2;
  groundPick.position.set(hallFocus.x, 0.02, hallFocus.z);
  groundPick.userData.meta = {
    id: "ground",
    url: "",
    file: "floor_tile_large.gltf",
    pack: "dungeon-remastered",
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
    kind: "floor",
    label: "Stone floor",
  } satisfies Piece;
  scene.add(groundPick);
  selectables.push(groundPick);
  floors.push(groundPick);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.62, 40),
    new THREE.MeshBasicMaterial({ color: "#e4c48a", side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const ash = makeAsh();
  ash.visible = false;
  scene.add(ash);
  const shelves: { id: string; meshes: THREE.Object3D[] }[] = [];
  const shelfSeen: Record<string, number> = {};
  let lastCue = 0;
  let hitStopUntil = 0;
  let shakeStarted = 0;
  let shakeAmp = 0;
  let slowUntil = 0;
  const frameTimes: number[] = [];
  const livingLights: THREE.PointLight[] = [];
  const livingBanners: THREE.Object3D[] = [];
  const livingCoins: THREE.Object3D[] = [];
  const livingWalls: { mesh: THREE.Object3D; z: number }[] = [];
  const cutawayBatches: { mesh: THREE.InstancedMesh; slots: { matrix: THREE.Matrix4; z: number }[] }[] = [];
  const raidWallBatches: { mesh: THREE.InstancedMesh; slots: { matrix: THREE.Matrix4; x: number; z: number }[] }[] = [];
  const raidLooseWalls: { obj: THREE.Object3D; x: number; z: number }[] = [];
  let raidCutKey = "";
  let cutawayStamp = Number.NaN;
  const floatPool: { sprite: THREE.Sprite; life: number }[] = [];
  const coinBurst = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: "#F2C14E", size: 0.22, transparent: true, depthWrite: false }),
  );
  coinBurst.visible = false;
  coinBurst.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
  scene.add(coinBurst);
  const emberPositions = new Float32Array(36 * 3);
  const embers = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: "#FF9A3C", size: 0.16, transparent: true, depthWrite: false }),
  );
  embers.geometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
  embers.visible = false;
  scene.add(embers);

  function burstEmbers(at: THREE.Vector3) {
    for (let index = 0; index < 36; index += 1) {
      emberPositions[index * 3] = at.x + (Math.random() - 0.5) * 1.2;
      emberPositions[index * 3 + 1] = at.y + 0.2;
      emberPositions[index * 3 + 2] = at.z + (Math.random() - 0.5) * 1.2;
    }
    embers.geometry.attributes.position.needsUpdate = true;
    embers.visible = true;
    const rise = { t: 0 };
    gsap.to(rise, {
      t: 1,
      duration: 1.3,
      onUpdate: () => {
        for (let index = 0; index < 36; index += 1) emberPositions[index * 3 + 1] += 0.025;
        embers.geometry.attributes.position.needsUpdate = true;
      },
      onComplete: () => {
        embers.visible = false;
      },
    });
  }

  function popTrap(step: VisualStep) {
    const entry = placed.find((trap) => Math.abs(trap.x - step.x) < 1.2 && Math.abs(trap.z - step.z) < 1.2);
    if (!entry) return;
    gsap.fromTo(entry.mesh.position, { y: 0.05 }, { y: step.trapId === "pit" ? -0.35 : 0.45, duration: 0.18, yoyo: true, repeat: 1 });
  }

  function applyQuality(quality: Quality) {
    const ratio = quality === "low" ? 1 : quality === "medium" ? 1.25 : Math.min(window.devicePixelRatio, 1.75);
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

  function aimCamera() {
    const az = Math.PI / 4 + yaw;
    const el = 35 * Math.PI / 180;
    const dist = 48;
    camera.up.set(0, 1, 0);
    camera.position.set(
      focus.x + Math.cos(az) * Math.cos(el) * dist,
      2 + Math.sin(el) * dist,
      focus.z + Math.sin(az) * Math.cos(el) * dist,
    );
    const elapsed = Math.max(0, (performance.now() - shakeStarted) / 1000);
    const shake = shakeOffset(elapsed, shakeAmp, hooks.getReduceMotion?.() ?? false);
    camera.position.x += shake.x;
    camera.position.y += shake.y;
    camera.lookAt(focus.x, scripted ? 1.15 : focus.y, focus.z);
    camera.updateMatrixWorld();
  }

  function play(actor: Actor, logical: string, once = false) {
    if (actor.action === logical && !once) return;
    if (once && actor.action === logical && performance.now() < actor.busyUntil) return;
    const names = [...CLIP_ALIASES[logical]];
    const ordered = actor.family === "skeleton" ? names : [...names].reverse();
    const clip = actor.clips.find((entry) => ordered.includes(entry.name));
    if (!clip) return;
    const action = actor.mixer.clipAction(clip);
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.enabled = true;
    action.setEffectiveWeight(1);
    const fade = once ? 0.12 : 0.2;
    if (actor.current && actor.current !== action) {
      actor.current.crossFadeTo(action, fade, false);
    }
    action.fadeIn(fade).play();
    actor.current = action;
    actor.action = logical;
    if (once) actor.busyUntil = performance.now() + clip.duration * 1000 * 0.85;
  }

  async function addActor(options: {
    id: string;
    name: string;
    model: string;
    file: string;
    family: "hero" | "skeleton" | "merchant";
    x: number;
    z: number;
    weapon?: string;
    hp: number;
  }) {
    const model = await spawn(options.model);
    const root = new THREE.Group();
    root.add(model);
    root.position.set(options.x, 0, options.z);
    scene.add(root);
    if (options.weapon) {
      const prop = await spawn(options.weapon, "none");
      prop.scale.setScalar(1);
      prop.position.set(0, 0.12, 0);
      prop.rotation.set(-Math.PI / 2, 0, 0);
      const hand = model.getObjectByName("handslot.r") ?? model.getObjectByName("hand.r") ?? root;
      hand.add(prop);
    }
    const actor: Actor = {
      id: options.id,
      name: options.name,
      root,
      mixer: new THREE.AnimationMixer(model),
      clips,
      family: options.family,
      action: "",
      current: null,
      speed: options.family === "hero" ? (HERO_PROFILES[options.id as HeroId]?.moveSpeed ?? 5) : options.family === "merchant" ? 0 : 3.6,
      hp: options.hp,
      maxHp: options.hp,
      file: options.file,
      home: new THREE.Vector3(options.x, 0, options.z),
      weaponNote: options.weapon ?? "",
      busyUntil: 0,
    };
    play(actor, "idle");
    actors.push(actor);
    root.traverse((obj) => {
      obj.userData.pick = actor;
    });
    selectables.push(root);
    return actor;
  }

  const repeatedFiles = new Set([
    "floor_tile_large.gltf",
    "floor_dirt_large.gltf",
    "floor_tile_large_rocks.gltf",
    "floor_wood_large_dark.gltf",
    "floor_wood_large.gltf",
    "wall.gltf",
    "wall_half.gltf",
    "pillar.gltf",
  ]);

  function placeMatrix(entry: Piece, local: THREE.Matrix4) {
    const placed = new THREE.Matrix4().makeRotationY(entry.rot);
    placed.setPosition(entry.x, entry.y, entry.z);
    return placed.multiply(local);
  }

  async function meshTemplate(url: string) {
    const gltf = await loadGltf(url);
    const meshes: THREE.Mesh[] = [];
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || mesh.name === "Icosphere") return;
      meshes.push(mesh);
    });
    const mesh = meshes.length === 1 ? meshes[0] : null;
    if (!mesh) return null;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.roughness = THREE.MathUtils.clamp(material.roughness, 0.38, 0.72);
      if (/gold/i.test(mesh.name) || /gold/i.test(material.name)) material.metalness = Math.max(material.metalness, 0.42);
      material.envMapIntensity = 0.35;
    }
    mesh.updateWorldMatrix(true, false);
    return { geometry: mesh.geometry, material: mesh.material, local: mesh.matrixWorld.clone() };
  }

  function addInstances(template: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; local: THREE.Matrix4 }, entries: Piece[], cutaway: boolean) {
    if (!entries.length) return;
    const mesh = new THREE.InstancedMesh(template.geometry, template.material, entries.length);
    mesh.userData.level = true;
    mesh.receiveShadow = true;
    mesh.castShadow = entries[0]?.file === "pillar.gltf";
    mesh.frustumCulled = false;
    const slots: { matrix: THREE.Matrix4; x: number; z: number }[] = [];
    entries.forEach((entry, index) => {
      const matrix = placeMatrix(entry, template.local);
      mesh.setMatrixAt(index, matrix);
      slots.push({ matrix, x: entry.x, z: entry.z });
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    const occludes = entries[0]?.file === "wall.gltf" || entries[0]?.file === "wall_half.gltf" || entries[0]?.file === "pillar.gltf";
    if (occludes && !cutaway) raidWallBatches.push({ mesh, slots });
    if (entries[0]?.kind === "floor") {
      mesh.userData.meta = entries[0];
      floors.push(mesh);
      selectables.push(mesh);
    }
    if (cutaway) cutawayBatches.push({ mesh, slots });
  }

  async function buildLevel() {
    for (const child of [...scene.children]) {
      if (child.userData.level) scene.remove(child);
    }
    selectables.length = 0;
    floors.length = 0;
    cutawayBatches.length = 0;
    raidWallBatches.length = 0;
    raidLooseWalls.length = 0;
    raidCutKey = "";
    cutawayStamp = Number.NaN;
    selectables.push(groundPick);
    floors.push(groundPick);
    const layout = ashgatePieces();
    const batches = new Map<string, Piece[]>();
    const loose: Piece[] = [];
    for (const entry of layout) {
      if (!repeatedFiles.has(entry.file)) {
        loose.push(entry);
        continue;
      }
      const list = batches.get(entry.url) ?? [];
      list.push(entry);
      batches.set(entry.url, list);
    }
    await Promise.all(
      [...batches.entries()].map(async ([url, entries]) => {
        const template = await meshTemplate(url);
        if (!template) {
          loose.push(...entries);
          return;
        }
        addInstances(template, entries.filter((entry) => !entry.cutaway), false);
        addInstances(template, entries.filter((entry) => entry.cutaway), true);
      }),
    );
    const groups = new Map<string, Piece[]>();
    for (const entry of loose) {
      const list = groups.get(entry.url) ?? [];
      list.push(entry);
      groups.set(entry.url, list);
    }
    await Promise.all(
      [...groups.entries()].map(async ([url, entries]) => {
        for (const entry of entries) {
          const mesh = await spawn(url, entry.kind === "floor" || entry.kind === "wall" ? "receive" : "cast");
          mesh.position.set(entry.x, entry.y, entry.z);
          mesh.rotation.y = entry.rot;
          mesh.userData.level = true;
          mesh.userData.meta = entry;
          const gate = ROOM_GATES.find((item) => entry.id === `room-gate-${item.id}` || entry.id.startsWith(`room-gate-${item.id}-`));
          if (gate) {
            const shut = gate.rot;
            const ix = Math.round((entry.x - gate.ox) / CELL);
            const iz = Math.round((entry.z - gate.oz) / CELL);
            mesh.rotation.y = shut;
            mesh.userData.action = "room-gate";
            mesh.userData.gateId = gate.id;
            roomGates.push({ id: gate.id, ix, iz, mesh, shut, open: shut + Math.PI / 2 });
            selectables.push(mesh);
          }
          scene.add(mesh);
          if (entry.kind === "floor" || entry.kind === "trap" || entry.kind === "vault" || entry.id === "anvil" || entry.label === "Entrance gate") {
            selectables.push(mesh);
          }
          if (entry.label === "Entrance gate") mesh.userData.action = "gate";
          if (entry.id === "anvil") mesh.userData.action = "craft";
          if (entry.kind === "vault") mesh.userData.action = "brace";
          if (entry.kind === "floor") floors.push(mesh);
          if (entry.kind === "wall") raidLooseWalls.push({ obj: mesh, x: entry.x, z: entry.z });
          if (entry.kind === "light") {
            const low = hooks.getQuality() === "low";
            const vaultLight = entry.id === "torch-vault";
            const light = new THREE.PointLight(vaultLight ? "#ffc56b" : TORCH, low ? 3 : vaultLight ? 9 : 7, low ? 9 : vaultLight ? 14 : 9, 1.4);
            light.position.set(entry.x, entry.y + 0.35, entry.z);
            light.userData.level = true;
            light.userData.glow = !low && vaultLight ? 1.55 : 1;
            scene.add(light);
            const flame = new THREE.PointLight("#ffd2a1", 1.5, 2.5);
            flame.position.copy(light.position);
            flame.userData.level = true;
            flame.userData.flicker = true;
            flame.userData.glow = 1;
            scene.add(flame);
          }
        }
      }),
    );
    cutawayStamp = Number.NaN;
  }

  async function boot() {
    const loaded = await Promise.all(ANIMATION_FILES.map((url) => loadGltf(url)));
    clips = loaded.flatMap((gltf) => gltf.animations.map((clip) => stripRootMotion(clip)));
    applyQuality(hooks.getQuality());
    const gl = renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    rendererInfo = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    await buildLevel();
    for (const trap of hooks.getTraps()) {
      const mesh = await spawn(TRAP_DEFINITIONS[trap.trapId].model, "cast");
      mesh.position.set(trap.ix * CELL, 0.05, trap.iz * CELL);
      mesh.userData.level = true;
      mesh.userData.placedId = trap.id;
      scene.add(mesh);
      selectables.push(mesh);
      placed.push({ id: trap.id, trapId: trap.trapId, mesh, x: trap.ix * CELL, z: trap.iz * CELL, spent: false });
    }
    const heroPosts: Record<HeroId, { x: number; z: number }> = {
      kara: { x: HERO_POSTS.kara.ix * CELL, z: HERO_POSTS.kara.iz * CELL },
      brann: { x: HERO_POSTS.brann.ix * CELL, z: HERO_POSTS.brann.iz * CELL },
      ivo: { x: HERO_POSTS.ivo.ix * CELL, z: HERO_POSTS.ivo.iz * CELL },
    };
    for (const lead of HEROES) {
      const spot = heroPosts[lead.id];
      const actor = await addActor({
        id: lead.id,
        name: lead.name,
        model: lead.model,
        file: lead.modelFile,
        family: "hero",
        x: spot.x,
        z: spot.z,
        weapon: lead.weapon,
        hp: 100,
      });
      actor.root.rotation.y = Math.PI;
      actor.root.visible = false;
      if (lead.id === "kara") hero = actor;
    }
    focus.copy(hallFocus);
    scene.traverse((obj) => {
      if (obj instanceof THREE.PointLight) livingLights.push(obj);
      const meta = obj.userData.meta as Piece | undefined;
      if (meta?.cutaway) livingWalls.push({ mesh: obj, z: meta.z });
      if (meta?.label?.toLowerCase().includes("banner")) livingBanners.push(obj);
      if (meta?.label === "Vault coins") livingCoins.push(obj);
    });
    const posts = [
      { ...RULES.skeletons[0], model: monsterModel("Skeleton_Minion"), file: "Skeleton_Minion.glb", weapon: undefined as string | undefined },
      { ...RULES.skeletons[1], model: monsterModel("Skeleton_Warrior"), file: "Skeleton_Warrior.glb", weapon: undefined as string | undefined },
    ];
    for (const enemy of posts) {
      const actor = await addActor({
        id: enemy.id,
        name: enemy.name,
        model: enemy.model,
        file: enemy.file,
        family: "skeleton",
        x: enemy.ix * CELL,
        z: enemy.iz * CELL,
        weapon: enemy.weapon,
        hp: enemy.hp,
      });
      actor.root.rotation.y = 0;
    }
    const page = await spawn(item("journal_open"));
    page.visible = false;
    page.scale.setScalar(2.2);
    scene.add(page);
    journal = page;
    hooks.onEnemies(
      actors
        .filter((actor) => actor.family === "skeleton")
        .map((actor) => ({ id: actor.id, name: actor.name, hp: actor.hp, maxHp: actor.maxHp, file: actor.file })),
    );
    aimCamera();
  }

  const ready = boot();

  function hitFloor(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(floors, true);
    return hits[0] ?? null;
  }

  function snap(point: THREE.Vector3) {
    return new THREE.Vector3(Math.round(point.x / CELL) * CELL, 0, Math.round(point.z / CELL) * CELL);
  }

  const carried = new Map<string, THREE.Object3D>();
  let carrying: string | null = null;

  async function previewTrap(clientX: number, clientY: number) {
    const trapId = hooks.getTrap();
    if (!trapId) {
      if (placing) placing.visible = false;
      ring.visible = false;
      carrying = null;
      return;
    }
    const hit = hitFloor(clientX, clientY);
    if (!hit) {
      if (placing) placing.visible = false;
      ring.visible = false;
      return;
    }
    const trap = TRAP_DEFINITIONS[trapId as TrapId];
    if (!trap) return;
    if (carrying !== trapId || !placing) {
      if (placing) placing.visible = false;
      let mesh = carried.get(trapId);
      if (!mesh) {
        mesh = await spawn(trap.model);
        if (hooks.getTrap() !== trapId) return;
        mesh.traverse((obj: THREE.Object3D) => {
          const source = (obj as THREE.Mesh).material;
          if (source instanceof THREE.Material) {
            const ghost = source.clone();
            ghost.transparent = true;
            ghost.opacity = 0.55;
            (obj as THREE.Mesh).material = ghost;
          }
        });
        carried.set(trapId, mesh);
        scene.add(mesh);
      }
      placing = mesh;
      carrying = trapId;
    }
    const cell = snap(hit.point);
    const blocked = actors.some((actor) => actor.root.visible && actor.root.position.distanceTo(cell) < 1.4) || !hooks.getPhase || hooks.getPhase() === "raid";
    placing.position.set(cell.x, 0.7, cell.z);
    placing.visible = true;
    ring.position.set(cell.x, 0.08, cell.z);
    ring.visible = true;
    (ring.material as THREE.MeshBasicMaterial).color.set(blocked ? "#c4493a" : "#F2C14E");
  }

  function say(text: string) {
    if (text === lastPrompt) return;
    lastPrompt = text;
    hooks.onPrompt(text);
  }

  function pickedNode(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(selectables, true);
    let passive: { node: THREE.Object3D; point: THREE.Vector3 } | null = null;
    for (const hit of hits) {
      let node: THREE.Object3D | null = hit.object;
      while (node) {
        if (node.userData.action || node.userData.placedId || node.userData.pick || node.userData.rack) {
          return { node, point: hit.point };
        }
        if (!passive && node.userData.meta) passive = { node, point: hit.point };
        node = node.parent;
      }
    }
    return passive;
  }

  function caption(found: { node: THREE.Object3D } | null) {
    if (!found) {
      if (hooks.getTrap()) return "The trap is on your cursor. Click a floor tile to set it.";
      if (pendingRelay) return "Click a neighboring tile to move that trap.";
      return "Choose a trap from the bar, then click a floor tile.";
    }
    const data = found.node.userData;
    if (data.action === "burn") return "Click the page to burn it.";
    if (data.placedId) return "Placed trap. Click it, then a neighboring tile.";
    if (data.action === "room-gate") {
      const name = ROOM_GATES.find((gate) => gate.id === data.gateId)?.name ?? "Iron gate";
      return hooks.getClosedGates().includes(String(data.gateId))
        ? `${name} is locked. Click to unlock it.`
        : `${name}. Click to lock it. A hero stops here and lifts an unlocked gate.`;
    }
    if (data.action === "gate") return hooks.getPhase() === "report" ? "South doorway. Click for the next day." : "South doorway. Click to open the raid.";
    if (data.action === "craft") return "Anvil. Click to craft a spike from iron and bone.";
    if (data.action === "brace") return "Vault chest. Click to brace it.";
    if (data.pick) {
      const actor = data.pick as Actor;
      if (actor.family === "merchant" && actor.id === "mira") return "Mira. Click to supply 5 iron.";
      if (actor.family === "merchant" && actor.id === "orrin") return "Orrin. Click to buy back an unsold page.";
      if (actor.family === "merchant" && actor.id === "tallow") return "Tallow. Click to buy a green phial.";
      if (actor.family === "skeleton" && actor.id === "guard") return hooks.getDay() < 2 ? "Hall guard. Possess opens on raid 2." : "Hall guard. Click to pull them off the tile.";
      if (actor.family === "hero") return `${actor.name}. They choose their own raid.`;
      return actor.name;
    }
    const meta = data.meta as Piece | undefined;
    return meta?.label ?? "";
  }

  function dropTrap(trapId: TrapId, ix: number, iz: number) {
    const id = hooks.tryPlace(trapId, ix, iz);
    if (!id) return;
    const trap = TRAP_DEFINITIONS[trapId];
    spawn(trap.model).then((mesh) => {
      mesh.position.set(ix * CELL, 0.05, iz * CELL);
      mesh.userData.level = true;
      mesh.userData.placedId = id;
      scene.add(mesh);
      selectables.push(mesh);
      placed.push({ id, trapId, mesh, x: ix * CELL, z: iz * CELL, spent: false });
    });
    sfx.place();
    pendingRelay = null;
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button === 2 || event.shiftKey) {
      canvas.dataset.pan = `${event.clientX},${event.clientY}`;
      return;
    }
    const found = pickedNode(event.clientX, event.clientY);
    const data = found?.node.userData;
    if (data?.action === "burn") {
      hooks.onBurn();
      return;
    }
    if (data?.placedId && (hooks.getPhase() === "prep" || hooks.getPhase() === "raid")) {
      trapDrag = { id: String(data.placedId), x: event.clientX, y: event.clientY };
      hooks.clearArm();
      return;
    }
    if (data?.action === "room-gate") {
      const id = String(data.gateId);
      hooks.onRoomGate(id);
      for (const gate of roomGates) {
        if (gate.id === id) gate.mesh.rotation.y = gate.shut;
      }
      return;
    }
    if (data?.action === "gate") {
      hooks.onGate();
      return;
    }
    if (data?.action === "craft") {
      hooks.onCraft();
      return;
    }
    if (data?.action === "brace") {
      hooks.onBrace();
      return;
    }
    if (data?.pick) {
      const actor = data.pick as Actor;
      gsap.to(focus, { x: actor.root.position.x, z: actor.root.position.z, duration: 0.55, overwrite: true });
      ring.position.set(actor.root.position.x, 0.08, actor.root.position.z);
      ring.visible = true;
      if (actor.family === "merchant") {
        play(actor, actor.id === "mira" ? "work" : actor.id === "tallow" ? "restock" : "talk", true);
        hooks.onMerchant(actor.id);
      }
      else if (actor.family === "skeleton" && actor.id === "guard") hooks.onPossess();
      else {
        if (actor.family === "hero") play(actor, "inspect", true);
        hooks.onSelect({ label: actor.name, file: actor.file, pack: actor.family === "hero" ? "characters-adventurers" : "characters-skeletons" });
      }
      return;
    }
    const floorHit = hitFloor(event.clientX, event.clientY);
    if (!floorHit) return;
    const ix = Math.round(floorHit.point.x / CELL);
    const iz = Math.round(floorHit.point.z / CELL);
    if (pendingRelay) {
      const id = pendingRelay;
      if (hooks.relayTo(id, ix, iz)) {
        const entry = placed.find((trap) => trap.id === id);
        if (entry) {
          entry.mesh.position.set(ix * CELL, 0.05, iz * CELL);
          entry.x = ix * CELL;
          entry.z = iz * CELL;
        }
        sfx.place();
      }
      pendingRelay = null;
      return;
    }
    const trapId = hooks.getTrap();
    if (!trapId && !pendingRelay && isEntranceTile(ix, iz)) {
      hooks.onGate();
      return;
    }
    if (trapId) dropTrap(trapId as TrapId, ix, iz);
  }

  function onPointerUp(event: PointerEvent) {
    if (!trapDrag) return;
    const drag = trapDrag;
    trapDrag = null;
    const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    const floorHit = hitFloor(event.clientX, event.clientY);
    if (moved > 18 && floorHit) {
      const ix = Math.round(floorHit.point.x / CELL);
      const iz = Math.round(floorHit.point.z / CELL);
      if (hooks.relayTo(drag.id, ix, iz)) {
        const entry = placed.find((trap) => trap.id === drag.id);
        if (entry) {
          entry.mesh.position.set(ix * CELL, 0.05, iz * CELL);
          entry.x = ix * CELL;
          entry.z = iz * CELL;
        }
        sfx.place();
      }
      return;
    }
    hooks.onTrigger(drag.id);
  }

  function onPointerMove(event: PointerEvent) {
    const pan = canvas.dataset.pan;
    if (pan && (event.buttons === 2 || event.shiftKey)) {
      if (scripted) return;
      const [sx, sy] = pan.split(",").map(Number);
      focus.x -= (event.clientX - sx) * 0.03;
      focus.z -= (event.clientY - sy) * 0.03;
      canvas.dataset.pan = `${event.clientX},${event.clientY}`;
      return;
    }
    void previewTrap(event.clientX, event.clientY);
    if (!hooks.getTrap()) {
      const hit = hitFloor(event.clientX, event.clientY);
      if (hit) {
        const cell = snap(hit.point);
        const ix = Math.round(cell.x / CELL);
        const iz = Math.round(cell.z / CELL);
        if (isEntranceTile(ix, iz)) {
          const door = `${ENTRANCE_TILES[0].ix}, ${ENTRANCE_TILES[0].iz}`;
          say(hooks.getPhase() === "report" ? `Doorway tile ${door}. Click for the next day.` : `Doorway tile ${door}. Click to open the raid.`);
          return;
        }
      }
    }
    if (hooks.getTrap()) {
      const hit = hitFloor(event.clientX, event.clientY);
      if (hit) {
        const cell = snap(hit.point);
        say(`Tile ${Math.round(cell.x / CELL)}, ${Math.round(cell.z / CELL)}. Click to place the trap.`);
        return;
      }
    }
    say(caption(pickedNode(event.clientX, event.clientY)));
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    if (scripted) return;
    releaseZoom?.kill();
    view = THREE.MathUtils.clamp(view + event.deltaY * 0.02, 36, 110);
    resize();
  }

  function onKey(event: KeyboardEvent) {
    keys.add(event.key.toLowerCase());
    if (event.key === "q") yaw = THREE.MathUtils.clamp(yaw - 0.08, -0.7, 0.7);
    if (event.key === "e") yaw = THREE.MathUtils.clamp(yaw + 0.08, -0.7, 0.7);
    if (event.key.toLowerCase() === "r" && !scripted) {
      releaseZoom?.kill();
      gsap.killTweensOf(focus);
      yaw = 0;
      view = HALL_VIEW;
      focus.copy(hallFocus);
      resize();
    }
    if (event.key.toLowerCase() === "f" && hero?.root.visible) focus.set(hero.root.position.x, 0, hero.root.position.z);
  }

  function hurtHero(amount: number) {
    if (!hero || hero.hp <= 0) return;
    hero.hp = Math.max(0, hero.hp - amount);
    hooks.onHeroDamage(amount);
    play(hero, hero.hp <= 0 ? "death" : "hit", true);
    if (hero.hp <= 0) triggerDiary();
  }

  function triggerDiary() {
    if (!hero || !journal || diaryPlayed) return;
    diaryPlayed = true;
    hooks.onDiary("decision");
    journal.visible = true;
    journal.userData.action = "burn";
    if (!selectables.includes(journal)) selectables.push(journal);
    journal.position.copy(hero.root.position);
    journal.position.y = 1.2;
    const gate = new THREE.Vector3(0, 1.6, 3 * CELL);
    gsap.timeline()
      .to(journal.position, { y: 2.1, duration: 0.6, ease: "power2.out" })
      .to(journal.rotation, { y: Math.PI * 2, duration: 1.4, ease: "none" }, "<")
      .to(journal.position, { x: gate.x, y: gate.y, z: gate.z, duration: 1.6, ease: "power1.inOut" })
      .add(() => hooks.onDiary("decision"));
  }

  function burnJournal() {
    if (!journal || burnStarted) return;
    burnStarted = true;
    if (hooks.getReduceMotion?.()) {
      journal.visible = false;
      return;
    }
    sfx.burn();
    ash.visible = true;
    ash.position.copy(journal.position);
    gsap.to(journal.scale, { x: 0.05, y: 0.05, z: 0.05, duration: 1.1, ease: "power2.in" });
    gsap.to(journal.position, { y: journal.position.y + 0.4, duration: 1.1 });
    const positions = ash.geometry.getAttribute("position") as THREE.BufferAttribute;
    gsap.to(positions.array, {
      duration: 1.4,
      onUpdate: () => {
        for (let i = 1; i < positions.array.length; i += 3) positions.array[i] += 0.02;
        positions.needsUpdate = true;
      },
      onComplete: () => {
        ash.visible = false;
        if (journal) {
          burstEmbers(journal.position.clone());
          journal.visible = false;
        }
      },
    });
  }

  function releaseJournal() {
    if (!journal || releaseStarted) return;
    releaseStarted = true;
    gsap.to(journal.position, { z: journal.position.z + 6, y: 3, duration: 1.2, ease: "power2.in", onComplete: () => {
      if (journal) journal.visible = false;
    } });
  }

  function stepActors(dt: number) {
    const now = performance.now();
    for (const actor of actors) {
      actor.mixer.update(dt);
      if (now > actor.busyUntil && ["attack", "hit", "dodge", "interact", "death"].includes(actor.action) && actor.hp > 0) {
        actor.action = "";
      }
      if (actor.hp <= 0) continue;
      if (actor.family === "hero" && !scripted) {
        const delta = actor.home.clone().sub(actor.root.position);
        delta.y = 0;
        if (delta.length() > 0.15) {
          delta.normalize().multiplyScalar(2.2 * dt);
          actor.root.position.add(delta);
          actor.root.lookAt(actor.root.position.x + delta.x, 0, actor.root.position.z + delta.z);
          play(actor, "walk");
        } else if (now > actor.busyUntil && actor.action !== "idle" && actor.action !== "attack") {
          play(actor, "idle");
        }
      } else if (!scripted && aggro && hero && hero.hp > 0 && now > actor.busyUntil) {
        const delta = hero.root.position.clone().sub(actor.root.position);
        delta.y = 0;
        const distance = delta.length();
        if (distance < 1.45) {
          if (now > actor.busyUntil) {
            play(actor, "attack", true);
            actor.busyUntil = now + 1600;
            hurtHero(5);
            sfx.hit();
          }
        } else {
          delta.normalize().multiplyScalar((actor.id === "archer" ? 0.85 : 1.05) * dt);
          actor.root.position.add(delta);
          actor.root.lookAt(hero.root.position.x, 0, hero.root.position.z);
          play(actor, "walk");
        }
      }
      for (const trap of placed) {
        if (trap.spent || actor.family !== "skeleton") continue;
        const dx = actor.root.position.x - trap.x;
        const dz = actor.root.position.z - trap.z;
        if (dx * dx + dz * dz > 2.2) continue;
        trap.spent = true;
        const def = TRAP_DEFINITIONS[trap.trapId as TrapId];
        const bonus = trap.trapId === "spike" ? hooks.getSpikeBonus() : 0;
        const damage = (def?.damage ?? 0) + bonus;
        if (damage > 0) {
          actor.hp = Math.max(0, actor.hp - damage);
          hooks.onEnemyDamage(actor.id, damage);
          gsap.fromTo(trap.mesh.scale, { y: 0.4 }, { y: 1, duration: 0.25 });
          if (actor.hp <= 0) play(actor, "death", true);
          else play(actor, "hit", true);
        } else {
          actor.busyUntil = now + 900;
        }
      }
      if (actor.hp <= 0 && actor.action !== "death") play(actor, "death", true);
    }
    const shelf = hooks.getShelf();
    const cue = hooks.getCue?.() ?? null;
    if (cue && cue.nonce !== lastCue) {
      lastCue = cue.nonce;
      const actor = actors.find((entry) => entry.id === cue.id);
      if (actor) play(actor, cue.action, true);
    }
    for (const row of shelves) {
      const count = row.id === "mira" ? shelf.mira : row.id === "orrin" ? shelf.orrin : shelf.tallow;
      const was = shelfSeen[row.id] ?? count;
      if (count > was) {
        const actor = actors.find((entry) => entry.id === row.id);
        if (actor) play(actor, "restock", true);
      } else if (count < was) {
        const actor = actors.find((entry) => entry.id === row.id);
        if (actor) play(actor, row.id === "mira" ? "work" : "talk", true);
      }
      shelfSeen[row.id] = count;
      row.meshes.forEach((mesh, index) => {
        mesh.visible = index < count;
      });
    }
    if (hooks.diaryChoice() === "burned") burnJournal();
    if (hooks.diaryChoice() === "escaped") releaseJournal();
  }

  function syncRaidWalls() {
    const key = scripted ? `${Math.round(focus.x)}:${Math.round(focus.z)}:${yaw.toFixed(2)}` : "open";
    if (key === raidCutKey) return;
    raidCutKey = key;
    const az = Math.PI / 4 + yaw;
    const towardX = Math.cos(az);
    const towardZ = Math.sin(az);
    const reach = CELL * 4;
    const blocksRaider = (x: number, z: number) => {
      if (!scripted) return false;
      const dx = x - focus.x;
      const dz = z - focus.z;
      if (dx * dx + dz * dz > reach * reach) return false;
      return dx * towardX + dz * towardZ > 0.35;
    };
    for (const batch of raidWallBatches) {
      let count = 0;
      for (const slot of batch.slots) {
        if (blocksRaider(slot.x, slot.z)) continue;
        batch.mesh.setMatrixAt(count, slot.matrix);
        count += 1;
      }
      batch.mesh.count = count;
      batch.mesh.visible = count > 0;
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const wall of raidLooseWalls) wall.obj.visible = !blocksRaider(wall.x, wall.z);
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!scripted) {
      if (keys.has("w")) focus.z -= 6 * dt;
      if (keys.has("s")) focus.z += 6 * dt;
      if (keys.has("a")) focus.x -= 6 * dt;
      if (keys.has("d")) focus.x += 6 * dt;
    }
    const calm = hooks.getReduceMotion?.() ?? false;
    const stopped = now < hitStopUntil;
    const slow = now < slowUntil;
    const scale = visualScale(slow, calm);
    if (!calm) {
      const flicker = 1.15 + Math.sin(now * 0.008) * 0.28 + Math.sin(now * 0.021) * 0.08;
      for (const light of livingLights) light.intensity = flicker * (typeof light.userData.glow === "number" ? light.userData.glow : 1);
      const sway = Math.sin(now * 0.0015) * 0.04;
      for (const banner of livingBanners) banner.rotation.z = sway;
      const bob = Math.sin(now * 0.002) * 0.06;
      for (const coin of livingCoins) coin.position.y = bob;
    }
    const vault = hooks.getVault?.() ?? 1200;
    const fog = scene.fog as THREE.Fog;
    fog.near = vault < 1200 * 0.25 ? 36 : 140;
    const camSide = camera.position.z > focus.z;
    // Near-side interior walls can still cut away when a piece is marked. Ashgate's
    // stone walls are not marked, so the floor-plan outlines stay visible.
    const cutZ = focus.z + CELL;
    const stamp = (camSide ? 1 : 0) * 100000 + Math.floor(cutZ);
    if (stamp !== cutawayStamp) {
      cutawayStamp = stamp;
      for (const wall of livingWalls) wall.mesh.visible = !(camSide && wall.z > cutZ);
      for (const batch of cutawayBatches) {
        let count = 0;
        for (const slot of batch.slots) {
          if (camSide && slot.z > cutZ) continue;
          batch.mesh.setMatrixAt(count, slot.matrix);
          count += 1;
        }
        batch.mesh.count = count;
        batch.mesh.visible = count > 0;
        batch.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    for (const mark of floatPool) {
      if (mark.life <= 0) continue;
      mark.life -= dt;
      mark.sprite.position.y += dt * 0.8;
      mark.sprite.visible = mark.life > 0;
    }
    const pace = hooks.getPace?.() ?? 1;
    gsap.globalTimeline.timeScale(pace);
    const motionDt = stopped || pace === 0 ? 0 : dt * scale * Math.max(pace, 0);
    const pending = [];
    for (const mover of movers) {
      const dx = mover.x - mover.actor.root.position.x;
      const dz = mover.z - mover.actor.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.08) {
        mover.actor.root.position.x = mover.x;
        mover.actor.root.position.z = mover.z;
        mover.resolve();
        continue;
      }
      const step = Math.min(distance, mover.actor.speed * motionDt);
      mover.actor.root.position.x += (dx / distance) * step;
      mover.actor.root.position.z += (dz / distance) * step;
      mover.actor.root.rotation.y = Math.atan2(dx, dz);
      if (mover.actor.action !== "walk") play(mover.actor, "walk");
      pending.push(mover);
    }
    movers.length = 0;
    movers.push(...pending);
    if (scripted && hero?.root.visible) {
      focus.x = hero.root.position.x;
      focus.z = hero.root.position.z;
    }
    syncRaidWalls();
    stepActors(motionDt);
    aimCamera();
    renderer.render(scene, camera);
    frames += 1;
    fpsAccum += dt;
    frameTimes.push(dt * 1000);
    if (frameTimes.length > 120) frameTimes.shift();
    if (now - lastStat > 500) {
      const fps = fpsAccum > 0 ? frames / fpsAccum : 0;
      minFps = Math.min(minFps, fps);
      samples += 1;
      avgFps += (fps - avgFps) / samples;
      hooks.onStats({
        fps,
        min: minFps,
        avg: avgFps,
        triangles: renderer.info.render.triangles,
        calls: renderer.info.render.calls,
        renderer: rendererInfo,
        p95: percentile(frameTimes, 0.95),
        textures: renderer.info.memory.textures,
      });
      frames = 0;
      fpsAccum = 0;
      lastStat = now;
    }
    requestAnimationFrame(frame);
  }

  const listeners: [string, EventListenerOrEventListenerObject, boolean?][] = [
    ["pointerdown", onPointerDown as EventListener],
    ["pointermove", onPointerMove as EventListener],
    ["pointerup", ((event: PointerEvent) => { delete canvas.dataset.pan; onPointerUp(event); }) as EventListener],
    ["contextmenu", (event) => event.preventDefault()],
    ["wheel", onWheel as EventListener, true],
  ];
  for (const [type, fn, capture] of listeners) canvas.addEventListener(type, fn, capture);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("resize", resize);
  resize();
  aimCamera();
  requestAnimationFrame(frame);

  return {
    ready,
    resize,
    async playRoute(steps: VisualStep[]) {
      aggro = false;
      const punch = (kind: "hit" | "kill" | "trap" | "boulder") => {
        if (hooks.getReduceMotion?.()) return;
        const ms = kind === "kill" ? FEEL.hitStopMs.kill : kind === "boulder" ? FEEL.hitStopMs.chain : FEEL.hitStopMs.hit;
        hitStopUntil = performance.now() + ms;
        shakeAmp = kind === "boulder" ? FEEL.shake.boulder : kind === "trap" ? FEEL.shake.trap : FEEL.shake.kill;
        shakeStarted = performance.now();
      };
      const floatDamage = (text: string, x: number, z: number) => {
        if (hooks.getReduceMotion?.() || !text) return;
        let slot = floatPool.find((entry) => entry.life <= 0);
        if (!slot) {
          if (floatPool.length >= 8) return;
          const board = document.createElement("canvas");
          board.width = 128;
          board.height = 64;
          const texture = new THREE.CanvasTexture(board);
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
          sprite.scale.set(1.6, 0.8, 1);
          sprite.userData.board = board;
          sprite.userData.texture = texture;
          scene.add(sprite);
          slot = { sprite, life: 0 };
          floatPool.push(slot);
        }
        const board = slot.sprite.userData.board as HTMLCanvasElement;
        const ctx = board.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 128, 64);
          ctx.fillStyle = "#F2C14E";
          ctx.font = "700 40px Fredoka, sans-serif";
          ctx.fillText(text, 6, 46);
          (slot.sprite.userData.texture as THREE.CanvasTexture).needsUpdate = true;
        }
        slot.sprite.position.set(x, 1.8, z);
        slot.sprite.visible = true;
        slot.life = 0.85;
      };
      const glide = (actor: Actor, x: number, z: number) => new Promise<void>((resolve) => {
        movers.push({ actor, x, z, resolve });
      });
      const pause = (seconds: number) => new Promise<void>((resolve) => {
        gsap.delayedCall(seconds, resolve);
      });
      hero = actors.find((actor) => actor.family === "hero" && actor.id === hooks.getHero()) ?? hero;
      if (hero) hero.root.visible = true;
      if (hero && steps[0]) hero.root.position.set(steps[0].x, 0, steps[0].z);
      if (hero) {
        releaseZoom?.kill();
        gsap.killTweensOf(focus);
        focus.set(hero.root.position.x, 0, hero.root.position.z);
        view = RAIDER_VIEW;
        resize();
      }
      scripted = true;
      syncRaidWalls();
      const locked = new Set(hooks.getClosedGates());
      for (const gate of roomGates) {
        if (!locked.has(gate.id)) gate.mesh.rotation.y = gate.shut;
      }
      for (const step of steps) {
        if (!running || !hero) break;
        if (step.type === "gate") {
          const ix = Math.round(step.x / CELL);
          const iz = Math.round(step.z / CELL);
          const gate = roomGates.find((entry) => entry.ix === ix && entry.iz === iz);
          const leaves = gate ? roomGates.filter((entry) => entry.id === gate.id) : [];
          play(hero, "interact", true);
          if (gate) hero.root.lookAt(gate.mesh.position.x, 0, gate.mesh.position.z);
          sfx.ui();
          for (const leaf of leaves) {
            if (hooks.getReduceMotion?.()) leaf.mesh.rotation.y = leaf.open;
            else gsap.to(leaf.mesh.rotation, { y: leaf.open, duration: 0.55, ease: "power2.out" });
          }
          await pause(hooks.getReduceMotion?.() ? 0.05 : 0.6);
        } else if (step.type === "move" || step.type === "enter") {
          await glide(hero, step.x, step.z);
        } else if (step.type === "trap" && step.trapId === "boulder") {
          play(hero, "hit", true);
          sfx.hit();
          const cask = await spawn(TRAP_DEFINITIONS.boulder.model, "cast");
          cask.position.set(step.x, 0.2, step.z);
          scene.add(cask);
          const roll = { t: 0 };
          gsap.to(roll, {
            t: 1,
            duration: 0.8,
            onUpdate: () => {
              cask.position.x = step.x + roll.t * CELL * 2;
              cask.rotation.z = -roll.t * Math.PI * 3;
            },
            onComplete: () => scene.remove(cask),
          });
          await pause(0.85);
        } else if (step.type === "trap" || step.type === "combat") {
          if (!(hooks.getReduceMotion?.())) await pause(0.12);
          if (step.type === "trap") popTrap(step);
          play(hero, step.type === "combat" ? "attack" : "hit", true);
          punch(step.trapId === "boulder" ? "boulder" : step.type === "trap" ? "trap" : "hit");
          if (step.damage) floatDamage(String(step.damage), step.x, step.z);
          if (step.type === "trap" && hero) {
            hero.root.position.x -= Math.sin(hero.root.rotation.y) * 0.25;
            hero.root.position.z -= Math.cos(hero.root.rotation.y) * 0.25;
          }
          if (step.type === "combat") sfx.attack();
          else sfx.hit();
          await pause(0.32);
        } else if (step.type === "death") {
          play(hero, "death", true);
          punch("kill");
          slowUntil = performance.now() + FEEL.pageSlowMo.seconds * 1000;
          triggerDiary();
          await pause(1.2);
        } else if (step.type === "survive" || step.type === "vault" || step.type === "flee") {
          play(hero, "interact", true);
          if (step.type === "vault") {
            const positions = coinBurst.geometry.getAttribute("position") as THREE.BufferAttribute;
            for (let index = 0; index < 24; index += 1) positions.setXYZ(index, step.x + (Math.random() - 0.5), 0.3, step.z + (Math.random() - 0.5));
            positions.needsUpdate = true;
            coinBurst.position.y = 0;
            coinBurst.visible = !(hooks.getReduceMotion?.());
            if (coinBurst.visible) gsap.to(coinBurst.position, { y: 1.1, duration: 0.7, onComplete: () => { coinBurst.visible = false; } });
          }
          await pause(0.3);
        }
      }
      scripted = false;
      syncRaidWalls();
      gsap.killTweensOf(focus);
      releaseZoom?.kill();
      if (hooks.getReduceMotion?.()) {
        view = HALL_VIEW;
        focus.copy(hallFocus);
        resize();
      } else {
        gsap.to(focus, { x: hallFocus.x, z: hallFocus.z, duration: 0.7, ease: "power2.inOut", overwrite: "auto" });
        const zoom = { value: view };
        releaseZoom = gsap.to(zoom, {
          value: HALL_VIEW,
          duration: 0.7,
          ease: "power2.inOut",
          onUpdate: () => {
            view = zoom.value;
            resize();
          },
        });
      }
      for (const gate of roomGates) gate.mesh.rotation.y = gate.shut;
      if (hero) {
        play(hero, "idle");
        if (hero.hp > 0) {
          hero.root.visible = false;
          hero.root.position.copy(hero.home);
        }
      }
    },
    showTrap(ix: number, iz: number, url: string) {
      void spawn(url, "cast").then((mesh) => {
        mesh.position.set(ix * CELL, 0.05, iz * CELL);
        mesh.userData.level = true;
        scene.add(mesh);
      });
    },
    focusHero() {
      if (hero) gsap.to(focus, { x: hero.root.position.x, z: hero.root.position.z, duration: 0.5 });
    },
    strike() {
      if (!hero || hero.hp <= 0) return;
      play(hero, "attack", true);
      hero.busyUntil = performance.now() + 900;
      aggro = true;
      sfx.attack();
      const slash = new THREE.Mesh(
        new THREE.TorusGeometry(0.85, 0.07, 8, 20, Math.PI * 1.2),
        new THREE.MeshBasicMaterial({ color: "#ffe7b8", toneMapped: false }),
      );
      slash.rotation.y = Math.PI / 2;
      slash.position.set(0.15, 1.15, 0.45);
      hero.root.add(slash);
      gsap.to(slash.rotation, { z: -2, duration: 0.55, onComplete: () => hero?.root.remove(slash) });
      const zoom = { value: view };
      gsap.to(zoom, {
        value: Math.max(6.2, view - 1.4),
        duration: 0.18,
        yoyo: true,
        repeat: 1,
        onUpdate: () => {
          view = zoom.value;
          resize();
        },
      });
      const target = actors
        .filter((actor) => actor.family === "skeleton" && actor.hp > 0)
        .sort((a, b) => a.root.position.distanceTo(hero!.root.position) - b.root.position.distanceTo(hero!.root.position))[0];
      if (target && target.root.position.distanceTo(hero.root.position) < 2.4) {
        target.hp = Math.max(0, target.hp - 16);
        hooks.onEnemyDamage(target.id, 16);
        play(target, target.hp <= 0 ? "death" : "hit", true);
      }
    },
    dodge() {
      if (!hero) return;
      play(hero, "dodge", true);
      hero.root.position.x -= 0.8;
    },
    interact() {
      if (!hero) return;
      play(hero, "interact", true);
      sfx.ui();
    },
    dispose() {
      running = false;
      gsap.globalTimeline.timeScale(1);
      for (const [type, fn] of listeners) canvas.removeEventListener(type, fn);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", resize);
      renderer.dispose();
    },
  };
}

function makeAsh() {
  const count = 48;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.8;
    positions[i * 3 + 1] = Math.random() * 0.4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: "#d7d1cb", size: 0.08, transparent: true, opacity: 0.85 }),
  );
}
