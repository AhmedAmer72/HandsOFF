import { sha256Hex } from "./hash";

export interface OutcomeRecord {
  raidId: string;
  hero: string;
  survived: boolean;
  goldDelta: number;
  kills: number;
  burns: number;
  landed: string[];
  iron: number;
  bone: number;
  ash: number;
  rulesHash: string;
  engineHash: string;
}

export function fnv1a32(bytes: Uint8Array) {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function canonicalOutcome(outcome: OutcomeRecord) {
  return [
    "v1",
    outcome.raidId,
    outcome.hero,
    outcome.survived ? "1" : "0",
    String(outcome.goldDelta),
    String(outcome.kills),
    String(outcome.burns),
    outcome.landed.join(","),
    String(outcome.iron),
    String(outcome.bone),
    String(outcome.ash),
    outcome.rulesHash,
    outcome.engineHash,
  ].join("|");
}

export function outcomeHash(outcome: OutcomeRecord) {
  return fnv1a32(new TextEncoder().encode(canonicalOutcome(outcome)));
}

export async function inputHash(inputLog: string) {
  return sha256Hex(inputLog);
}
