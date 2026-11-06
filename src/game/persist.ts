import type { SaveData } from "./engine/types";

const DB_NAME = "underrealm";
const STORE = "saves";
const KEY = "current";
const LOCAL_KEY = "underrealm-save-v3";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function writeSave(save: SaveData) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(save));
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(save, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // localStorage already holds the save if IndexedDB is blocked.
  }
}

export async function readSave(): Promise<SaveData | null> {
  try {
    const db = await openDb();
    const stored = await new Promise<SaveData | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result as SaveData | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (stored?.version === 3) return stored;
  } catch {
    // Fall through to the localStorage mirror.
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    return parsed.version === 3 ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearSave() {
  localStorage.removeItem(LOCAL_KEY);
  localStorage.removeItem("underrealm-save-v2");
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // The local mirror is already gone.
  }
}
