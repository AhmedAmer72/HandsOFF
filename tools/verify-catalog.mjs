import fs from "node:fs";
import path from "node:path";

const catalog = JSON.parse(fs.readFileSync("public/catalog.json", "utf8"));
let missing = 0;
for (const asset of catalog.assets) {
  const file = path.join("assets/runtime", asset.publicPath.replace(/^\/runtime\//, ""));
  if (!fs.existsSync(file)) {
    missing += 1;
    console.error("missing", file);
  }
  if (asset.format === "gltf") {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const buffer of doc.buffers ?? []) {
      if (buffer.uri && !fs.existsSync(path.join(path.dirname(file), buffer.uri))) {
        missing += 1;
        console.error("missing buffer", buffer.uri, "for", file);
      }
    }
    for (const image of doc.images ?? []) {
      if (image.uri && !fs.existsSync(path.join(path.dirname(file), image.uri))) {
        missing += 1;
        console.error("missing image", image.uri, "for", file);
      }
    }
  }
}
if (missing) {
  console.error(`catalog verification failed: ${missing}`);
  process.exit(1);
}
console.log(`catalog ok: ${catalog.assets.length} models`);
