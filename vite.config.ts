import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function serveRuntime(): Plugin {
  const root = path.resolve("assets/runtime");
  const types: Record<string, string> = {
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".bin": "application/octet-stream",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".json": "application/json",
  };
  return {
    name: "serve-underrealm-runtime",
    configureServer(server) {
      server.middlewares.use("/runtime", (req, res, next) => {
        const raw = decodeURIComponent((req.url ?? "/").split("?")[0]);
        const file = path.normalize(path.join(root, raw));
        if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          next();
          return;
        }
        res.setHeader("Content-Type", types[path.extname(file).toLowerCase()] ?? "application/octet-stream");
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      fs.cpSync(root, path.resolve("dist/runtime"), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveRuntime()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".cursorvm.com"],
  },
});
