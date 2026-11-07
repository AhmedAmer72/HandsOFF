import { FEEL } from "../../../rules/feel";

export function hitStopMs(kind: "hit" | "kill" | "chain") {
  return FEEL.hitStopMs[kind];
}

export function shakeOffset(seconds: number, amplitude: number, reduceMotion: boolean) {
  if (reduceMotion || amplitude <= 0) return { x: 0, y: 0 };
  const decay = Math.exp(-FEEL.shake.decay * seconds);
  const wave = Math.sin(seconds * FEEL.shake.hz);
  const offset = Math.min(FEEL.shake.maxOffset, amplitude) * decay * wave;
  return { x: offset, y: offset * 0.35 };
}

export function visualScale(slow: boolean, reduceMotion: boolean) {
  if (reduceMotion || !slow) return 1;
  return FEEL.pageSlowMo.scale;
}

export function percentile(samples: number[], ratio: number) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return sorted[index];
}
