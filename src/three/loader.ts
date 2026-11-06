import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const loader = new GLTFLoader();
const cache = new Map<string, Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>>();

export function loadGltf(url: string) {
  let pending = cache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url);
    cache.set(url, pending);
  }
  return pending;
}

function hasSkin(root: THREE.Object3D) {
  let skinned = false;
  root.traverse((obj: THREE.Object3D) => {
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
  });
  return skinned;
}

export async function spawn(url: string, shadows: "cast" | "receive" | "none" = "cast") {
  const gltf = await loadGltf(url);
  const clone = hasSkin(gltf.scene) ? cloneSkeleton(gltf.scene) : gltf.scene.clone(true);
  clone.traverse((obj: THREE.Object3D) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.name === "Icosphere") mesh.visible = false;
    if (!mesh.isMesh) return;
    mesh.castShadow = shadows === "cast";
    mesh.receiveShadow = shadows !== "none";
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      material.roughness = THREE.MathUtils.clamp(material.roughness, 0.38, 0.72);
      if (/gold/i.test(mesh.name) || /gold/i.test(material.name)) material.metalness = Math.max(material.metalness, 0.42);
      material.envMapIntensity = 0.35;
    }
  });
  return clone;
}

export function stripRootMotion(clip: THREE.AnimationClip) {
  const tracks = clip.tracks.filter((track) => !track.name.startsWith("root.position"));
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}
