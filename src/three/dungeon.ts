import gsap from "gsap";
import * as THREE from "three";
import { ANIMATION_FILES, CELL, CLIP_ALIASES, HEROES, item, monsterModel, type HeroId, type Piece, type Quality, type WorldMode } from "../game/content";
import { HERO_PROFILES } from "../game/config/heroProfiles";
import { RULES } from "../game/config/gameRules";
import { ashgatePieces } from "../game/world";
import { TRAP_DEFINITIONS, type TrapId } from "../game/config/trapDefinitions";
import type { PlacedTrap } from "../game/engine/types";
import type { VisualStep } from "../game/store";
import { sfx } from "../game/audio";
import { loadGltf, spawn, stripRootMotion } from "./loader";

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
  tryPlace: (trapId: TrapId, ix: number, iz: number) => boolean;
  getTraps: () => PlacedTrap[];
  onStats: (stats: { fps: number; min: number; avg: number; triangles: number; calls: number; renderer: string }) => void;
  onDiary: (phase: "decision") => void;
  diaryChoice: () => "idle" | "decision" | "burned" | "escaped";
}

interface Actor {
  id: string;
  name: string;
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  family: "hero" | "skeleton";
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

const TORCH = new THREE.Color("#ff8a3d");

export function mountDungeon(canvas: HTMLCanvasElement, hooks: DungeonHooks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor("#140e0c");

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#140e0c", 22, 78);
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

  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 120);
  const focus = new THREE.Vector3(8, 0, 8);
  let yaw = 0;
  let view = 9;
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const selectables: THREE.Object3D[] = [];
  const floors: THREE.Object3D[] = [];
  const actors: Actor[] = [];
  const placed: { id: string; trapId: string; mesh: THREE.Object3D; x: number; z: number; spent: boolean }[] = [];
  let clips: THREE.AnimationClip[] = [];
  let hero: Actor | null = null;
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
  let placing: THREE.Group | null = null;
  let diaryPlayed = false;
  let scripted = false;
  const movers: { actor: Actor; x: number; z: number; resolve: () => void }[] = [];
  let aggro = false;
  let burnStarted = false;
  let releaseStarted = false;
  const keys = new Set<string>();

  const groundPick = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 64),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  groundPick.rotation.x = -Math.PI / 2;
  groundPick.position.y = 0.02;
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
    const el = 0.78;
    const dist = 32;
    camera.position.set(
      focus.x + Math.cos(az) * Math.cos(el) * dist,
      2 + Math.sin(el) * dist,
      focus.z + Math.sin(az) * Math.cos(el) * dist,
    );
    camera.lookAt(focus);
    camera.updateMatrixWorld();
  }

  function play(actor: Actor, logical: string, once = false) {
    if (actor.action === logical && !once) return;
    if (once && actor.action === logical && performance.now() < actor.busyUntil) return;
    const names = [...CLIP_ALIASES[logical]];
    const ordered = actor.family === "hero" ? names.reverse() : names;
    const clip = actor.clips.find((entry) => ordered.includes(entry.name));
    if (!clip) return;
    const action = actor.mixer.clipAction(clip);
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.setEffectiveWeight(1);
    if (actor.current && actor.current !== action) {
      actor.current.fadeOut(0.18);
      action.fadeIn(0.18).play();
    } else {
      action.fadeIn(0.05).play();
    }
    actor.current = action;
    actor.action = logical;
    if (once) actor.busyUntil = performance.now() + clip.duration * 1000 * 0.85;
  }

  async function addActor(options: {
    id: string;
    name: string;
    model: string;
    file: string;
    family: "hero" | "skeleton";
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
      speed: options.family === "hero" ? (HERO_PROFILES[options.id as HeroId]?.moveSpeed ?? 5) : 3.6,
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

  async function buildLevel() {
    for (const child of [...scene.children]) {
      if (child.userData.level) scene.remove(child);
    }
    selectables.length = 0;
    floors.length = 0;
    selectables.push(groundPick);
    floors.push(groundPick);
    const layout = ashgatePieces();
    const groups = new Map<string, Piece[]>();
    for (const entry of layout) {
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
          scene.add(mesh);
          if (entry.kind === "floor" || entry.kind === "trap" || entry.kind === "prop" || entry.kind === "vault" || entry.kind === "light") {
            selectables.push(mesh);
          }
          if (entry.kind === "floor") floors.push(mesh);
          if (entry.kind === "light") {
            const light = new THREE.PointLight(TORCH, hooks.getQuality() === "low" ? 3 : 7, 9, 1.4);
            light.position.set(entry.x, entry.y + 0.35, entry.z);
            light.userData.level = true;
            scene.add(light);
            const flame = new THREE.PointLight("#ffd2a1", 1.5, 2.5);
            flame.position.copy(light.position);
            flame.userData.level = true;
            flame.userData.flicker = true;
            scene.add(flame);
          }
        }
      }),
    );
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
      scene.add(mesh);
    }
    const lead = HEROES.find((entry) => entry.id === hooks.getHero()) ?? HEROES[0];
    hero = await addActor({
      id: lead.id,
      name: lead.name,
      model: lead.model,
      file: lead.modelFile,
      family: "hero",
      x: RULES.grid.entrance.ix * CELL,
      z: RULES.grid.entrance.iz * CELL,
      weapon: lead.weapon,
      hp: 100,
    });
    focus.set(hero.root.position.x, 0, hero.root.position.z);
    const posts = [
      { ...RULES.skeletons[0], model: monsterModel("Skeleton_Minion"), file: "Skeleton_Minion.glb", weapon: undefined as string | undefined },
      { ...RULES.skeletons[1], model: monsterModel("Skeleton_Warrior"), file: "Skeleton_Warrior.glb", weapon: undefined as string | undefined },
    ];
    for (const enemy of posts) {
      await addActor({
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
    }
    const page = await spawn(item("journal_open"));
    page.visible = false;
    page.scale.setScalar(1.6);
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

  async function previewTrap(clientX: number, clientY: number) {
    const trapId = hooks.getTrap();
    if (!trapId) {
      if (placing) placing.visible = false;
      return;
    }
    const hit = hitFloor(clientX, clientY);
    if (!hit) return;
    const trap = TRAP_DEFINITIONS[trapId as TrapId];
    if (!trap) return;
    if (!placing) {
      placing = new THREE.Group();
      scene.add(placing);
    }
    placing.clear();
    const mesh = await spawn(trap.model);
    const cell = snap(hit.point);
    const blocked = actors.some((actor) => actor.root.position.distanceTo(cell) < 1.4);
    mesh.traverse((obj: THREE.Object3D) => {
      const material = (obj as THREE.Mesh).material;
      if (material instanceof THREE.Material) {
        material.transparent = true;
        material.opacity = 0.55;
      }
    });
    placing.add(mesh);
    placing.position.copy(cell);
    placing.visible = true;
    placing.userData.valid = !blocked;
    ring.position.set(cell.x, 0.08, cell.z);
    ring.visible = true;
    (ring.material as THREE.MeshBasicMaterial).color.set(blocked ? "#c4493a" : "#e4c48a");
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button === 2 || event.shiftKey) {
      canvas.dataset.pan = `${event.clientX},${event.clientY}`;
      return;
    }
    const trapId = hooks.getTrap();
    if (trapId) {
      const hit = hitFloor(event.clientX, event.clientY);
      const trap = TRAP_DEFINITIONS[trapId as TrapId];
      if (hit && trap) {
        const ix = Math.round(hit.point.x / CELL);
        const iz = Math.round(hit.point.z / CELL);
        if (hooks.tryPlace(trap.id, ix, iz)) {
          const id = `${trap.id}-${ix}-${iz}`;
          spawn(trap.model).then((mesh) => {
            mesh.position.set(ix * CELL, 0.05, iz * CELL);
            mesh.userData.level = true;
            scene.add(mesh);
            placed.push({ id, trapId, mesh, x: ix * CELL, z: iz * CELL, spent: false });
          });
          sfx.place();
        }
      }
      return;
    }
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(selectables, true);
    const hit = hits.find((entry) => entry.object.userData.meta || entry.object.userData.pick);
    if (!hit) {
      hooks.onSelect(null);
      ring.visible = false;
      return;
    }
    let node: THREE.Object3D | null = hit.object;
    while (node && !node.userData.meta && !node.userData.pick) node = node.parent;
    if (node?.userData.pick) {
      const actor = node.userData.pick as Actor;
      focus.copy(actor.root.position);
      gsap.to(focus, { duration: 0.45, overwrite: true });
      hooks.onSelect({
        label: actor.name,
        file: actor.file,
        pack: actor.family === "hero" ? "characters-adventurers" : "characters-skeletons",
        note: actor.family === "hero" ? "Rig_Medium hero. Animations come from KayKit Character Animations 1.1." : "Skeleton rig shares Rig_Medium clip names.",
      });
      ring.position.set(actor.root.position.x, 0.08, actor.root.position.z);
      ring.visible = true;
      return;
    }
    const meta = node?.userData.meta as Piece | undefined;
    if (!meta) return;
    if (meta.kind === "floor" && hero && hero.hp > 0) {
      const cell = snap(hit.point);
      hero.home.copy(cell);
      aggro = true;
      play(hero, "walk");
    }
    hooks.onSelect({ label: meta.label, file: meta.file, pack: meta.pack, note: meta.note });
    ring.position.set(meta.x, 0.08, meta.z);
    ring.visible = true;
  }

  function onPointerMove(event: PointerEvent) {
    const pan = canvas.dataset.pan;
    if (pan && (event.buttons === 2 || event.shiftKey)) {
      const [sx, sy] = pan.split(",").map(Number);
      focus.x -= (event.clientX - sx) * 0.03;
      focus.z -= (event.clientY - sy) * 0.03;
      canvas.dataset.pan = `${event.clientX},${event.clientY}`;
      return;
    }
    void previewTrap(event.clientX, event.clientY);
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    view = THREE.MathUtils.clamp(view + event.deltaY * 0.01, 4.5, 18);
    resize();
  }

  function onKey(event: KeyboardEvent) {
    keys.add(event.key.toLowerCase());
    if (event.key === "q") yaw = THREE.MathUtils.clamp(yaw - 0.08, -0.7, 0.7);
    if (event.key === "e") yaw = THREE.MathUtils.clamp(yaw + 0.08, -0.7, 0.7);
    if (event.key.toLowerCase() === "r") {
      yaw = 0;
      view = 9;
      if (hero) focus.set(hero.root.position.x, 0, hero.root.position.z);
      resize();
    }
    if (event.key.toLowerCase() === "f" && hero) focus.set(hero.root.position.x, 0, hero.root.position.z);
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
        if (journal) journal.visible = false;
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
    if (hooks.diaryChoice() === "burned") burnJournal();
    if (hooks.diaryChoice() === "escaped") releaseJournal();
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (keys.has("w")) focus.z -= 6 * dt;
    if (keys.has("s")) focus.z += 6 * dt;
    if (keys.has("a")) focus.x -= 6 * dt;
    if (keys.has("d")) focus.x += 6 * dt;
    scene.traverse((obj) => {
      if (obj.userData.flicker && obj instanceof THREE.PointLight) obj.intensity = 1.2 + Math.sin(now * 0.012) * 0.45;
      const meta = obj.userData.meta as Piece | undefined;
      if (meta?.cutaway) {
        const camSide = camera.position.z > focus.z;
        obj.visible = !(camSide && meta.z > focus.z - 1);
      }
    });
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
      const step = Math.min(distance, mover.actor.speed * dt);
      mover.actor.root.position.x += (dx / distance) * step;
      mover.actor.root.position.z += (dz / distance) * step;
      mover.actor.root.rotation.y = Math.atan2(dx, dz);
      if (mover.actor.action !== "walk") play(mover.actor, "walk");
      pending.push(mover);
    }
    movers.length = 0;
    movers.push(...pending);
    if (scripted && hero) {
      focus.x += (hero.root.position.x - focus.x) * (1 - Math.exp(-4 * dt));
      focus.z += (hero.root.position.z - focus.z) * (1 - Math.exp(-4 * dt));
    }
    stepActors(dt);
    aimCamera();
    renderer.render(scene, camera);
    frames += 1;
    fpsAccum += dt;
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
    ["pointerup", () => { delete canvas.dataset.pan; }],
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
      scripted = true;
      aggro = false;
      const glide = (actor: Actor, x: number, z: number) => new Promise<void>((resolve) => {
        movers.push({ actor, x, z, resolve });
      });
      const pause = (seconds: number) => new Promise<void>((resolve) => {
        gsap.delayedCall(seconds, resolve);
      });
      if (hero && steps[0]) hero.root.position.set(steps[0].x, 0, steps[0].z);
      for (const step of steps) {
        if (!running || !hero) break;
        if (step.type === "move" || step.type === "enter") {
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
          play(hero, step.type === "combat" ? "attack" : "hit", true);
          if (step.type === "combat") sfx.attack();
          else sfx.hit();
          await pause(0.32);
        } else if (step.type === "death") {
          play(hero, "death", true);
          hooks.onDiary("decision");
          await pause(0.45);
        } else if (step.type === "survive" || step.type === "vault" || step.type === "flee") {
          play(hero, "interact", true);
          await pause(0.3);
        }
      }
      scripted = false;
      if (hero && hero.hp > 0) play(hero, "idle");
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
