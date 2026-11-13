import { spawnSync } from "node:child_process";

function fnv1a32(bytes) {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const line = "v1|raid-replay|kara|0|-40|2|1|abababababababababababababababababababababababababababababababab|10|5|0|rules|engine";
const typescript = fnv1a32(new TextEncoder().encode(line));
const rust = spawnSync("cargo", ["run", "-q", "-p", "underrealm-engine", "--bin", "settlement-hash"], {
  cwd: new URL("../contracts", import.meta.url),
  input: line,
  encoding: "utf8",
});
if (rust.status !== 0) {
  console.error(rust.stderr || rust.stdout);
  process.exit(rust.status ?? 1);
}
const rustHash = rust.stdout.trim();
if (typescript !== rustHash) {
  console.error(`hash mismatch typescript=${typescript} rust=${rustHash}`);
  process.exit(1);
}
console.log(JSON.stringify({ line, hash: rustHash, source: "SIMULATED" }));
