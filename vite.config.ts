import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import {
  beginActivity,
  counterRecord,
  emptyRegistry,
  endActivity,
  expireRecord,
  fundRecord,
  offerExpired,
  offersOf,
  publicEvents,
  refuseRecord,
  settleRecord,
  consumeRecord,
  unpublishHall,
  upsertHall,
  type PublicActivity,
  type PublicDungeon,
  type RegistryFile,
} from "./src/game/world/registry";

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

function readBody(req: import("node:http").IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function hallsApi(): Plugin {
  const file = path.resolve("data/public-registry.json");
  function read(): RegistryFile {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as RegistryFile;
      if (!parsed || !Array.isArray(parsed.dungeons) || !Array.isArray(parsed.activity)) return emptyRegistry();
      return {
        dungeons: parsed.dungeons,
        activity: parsed.activity.map((entry) => ({ ...entry, events: publicEvents(entry.events ?? []) })),
        offers: offersOf(parsed),
      };
    } catch {
      return emptyRegistry();
    }
  }
  function write(next: RegistryFile) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const safe: RegistryFile = {
      dungeons: next.dungeons.map((hall) => ({
        dungeonId: hall.dungeonId,
        ownerId: hall.ownerId,
        displayName: hall.displayName,
        name: hall.name,
        description: hall.description,
        published: true,
        tier: hall.tier,
        state: hall.state,
        raidCount: hall.raidCount,
        activeRaidCount: hall.activeRaidCount,
        heroTraffic: hall.heroTraffic,
        lastActivityAt: hall.lastActivityAt,
        merchantStates: hall.merchantStates,
        pad: hall.pad,
        lastRaidSummary: hall.lastRaidSummary,
      })),
      activity: next.activity.map((entry) => ({ ...entry, events: publicEvents(entry.events) })),
      offers: offersOf(next),
    };
    fs.writeFileSync(file, JSON.stringify(safe));
    return safe;
  }
  return {
    name: "underrealm-halls",
    configureServer(server) {
      server.middlewares.use("/api/halls", (req, res, next) => {
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(read()));
          return;
        }
        if (req.method !== "POST") {
          next();
          return;
        }
        void readBody(req).then((raw) => {
          const body = JSON.parse(raw || "{}") as { action?: string; hall?: PublicDungeon; dungeonId?: string; summary?: string; activity?: PublicActivity; funderId?: string; slotsAtFund?: number | null; offerId?: string; heroId?: string; shift?: number; now?: number; raidsCleared?: number };
          let file = read();
          if (body.action === "upsert" && body.hall?.published && body.hall.name) file = upsertHall(file, body.hall);
          else if (body.action === "unpublish" && body.dungeonId) file = unpublishHall(file, body.dungeonId);
          else if (body.action === "activity" && body.activity) file = beginActivity(file, body.activity);
          else if (body.action === "end" && body.dungeonId) file = endActivity(file, body.dungeonId, body.summary ?? "");
          else if (body.action === "fund" && body.dungeonId && body.funderId) file = fundRecord(file, { dungeonId: body.dungeonId, funderId: body.funderId, slotsAtFund: body.slotsAtFund ?? null, now: body.now }).file;
          else if (body.action === "counter" && body.offerId && body.heroId) file = counterRecord(file, body.offerId, body.heroId, body.shift ?? 0).file;
          else if (body.action === "refuse" && body.offerId) file = refuseRecord(file, body.offerId).file;
          else if (body.action === "settle" && body.offerId) file = settleRecord(file, body.offerId).file;
          else if (body.action === "expire" && body.offerId) file = expireRecord(file, body.offerId).file;
          else if (body.action === "consume" && body.offerId) file = consumeRecord(file, body.offerId).file;
          else if (body.action === "review" && typeof body.now === "number") {
            for (const offer of offersOf(file)) {
              if (offerExpired(offer, body.now, body.raidsCleared ?? 0)) file = expireRecord(file, offer.id).file;
            }
          }
          const saved = write(file);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(saved));
        }).catch(() => {
          res.statusCode = 400;
          res.end("{\"dungeons\":[],\"activity\":[],\"offers\":[]}");
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveRuntime(), hallsApi()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".cursorvm.com"],
  },
});
