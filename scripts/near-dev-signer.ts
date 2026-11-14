import { spawn } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import type { Plugin } from "vite";

const ACCOUNTS = ["neocrafts.testnet", "buyer.neocrafts.testnet"] as const;
const CONTRACTS = new Set(["game.neocrafts.testnet", "deeds.neocrafts.testnet", "ashgate.deeds.neocrafts.testnet"]);
const ZERO = new Set([
  "assign_hero",
  "accept_offer",
  "counter_offer",
  "record_actions",
  "settle_raid",
  "claim_salvage",
  "supply",
  "craft",
  "list",
  "cancel_listing",
  "consume_rumour",
  "buy_back",
  "execute_agent_decision",
  "expire_offer",
  "set_paused",
  "withdraw_treasury",
  "abort_transfer",
]);
const YOCTO = new Set(["merge_guest", "link_account", "mt_transfer", "nft_transfer", "start_transfer"]);

let queue: Promise<unknown> = Promise.resolve();

function credential(account: string) {
  return path.join(os.homedir(), ".near-credentials", "testnet", `${account}.json`);
}

function enqueue<T>(work: () => Promise<T>) {
  const run = queue.then(work, work);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

function runNear(args: string[]) {
  return new Promise<{ code: number; out: string }>((resolve) => {
    const child = spawn("/home/ubuntu/.local/bin/near", args, { env: process.env });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      out += String(chunk);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function depositFor(method: string, requested?: string) {
  if (method === "fund_offer") return "0.01 NEAR";
  if (method === "add_working_capital") return requested === "0.02 NEAR" ? "0.02 NEAR" : "0.01 NEAR";
  if (method === "buy_listing") return requested && requested !== "0 NEAR" ? requested : "0 NEAR";
  if (YOCTO.has(method)) return "1 yoctoNEAR";
  if (ZERO.has(method)) return "0 NEAR";
  return null;
}

function parseCall(out: string, code: number) {
  const tx = out.match(/Transaction ID:\s*([A-Za-z0-9]+)/);
  const failed = code !== 0 || /ERROR Transaction failed|ExecutionError/.test(out);
  const lines = out.split("\n").map((line) => line.replace(/^│\s*/, "").trim()).filter(Boolean);
  let value: unknown;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.startsWith("\"") && !line.startsWith("{") && !line.startsWith("[")) continue;
    try {
      value = JSON.parse(line);
      break;
    } catch {
      // The CLI paints a box around the payload. Keep scanning.
    }
  }
  const panic = lines.find((line) => line.includes("ExecutionError") || line.includes("unreachable") || line.includes("panic"));
  return {
    ok: !failed,
    source: "LIVE" as const,
    txHash: tx?.[1] ?? null,
    value: value ?? null,
    error: failed ? panic ?? "The contract rejected the call." : undefined,
    explorer: tx ? `https://explorer.testnet.near.org/transactions/${tx[1]}` : null,
  };
}

export function nearDevSigner(): Plugin {
  return {
    name: "underrealm-near-signer",
    configureServer(server) {
      server.middlewares.use("/api/near", (req, res, next) => {
        if (req.method === "GET") {
          const present = ACCOUNTS.filter((account) => fs.existsSync(credential(account)));
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ source: "LIVE", accounts: present, keeper: present[0] ?? null }));
          return;
        }
        if (req.method !== "POST") {
          next();
          return;
        }
        void readBody(req).then((raw) => enqueue(async () => {
          const body = JSON.parse(raw || "{}") as { account?: string; contract?: string; method?: string; args?: Record<string, unknown>; deposit?: string };
          const account = body.account ?? "neocrafts.testnet";
          const contract = body.contract ?? "game.neocrafts.testnet";
          const method = body.method ?? "";
          const deposit = depositFor(method, body.deposit);
          if (!ACCOUNTS.includes(account as (typeof ACCOUNTS)[number]) || !CONTRACTS.has(contract) || !deposit || !fs.existsSync(credential(account))) {
            send(res, 400, { ok: false, source: "LIVE", error: "That account, contract, or method is not available from this dev signer." });
            return;
          }
          const args = JSON.stringify(body.args ?? {});
          if (args.length > 12_000) {
            send(res, 400, { ok: false, source: "LIVE", error: "The call is too large." });
            return;
          }
          const result = await runNear([
            "contract", "call-function", "as-transaction", contract, method,
            "json-args", args,
            "prepaid-gas", "180 Tgas",
            "attached-deposit", deposit,
            "sign-as", account,
            "network-config", "testnet",
            "sign-with-keychain", "send",
          ]);
          const parsed = parseCall(result.out, result.code);
          send(res, parsed.ok ? 200 : 400, parsed);
        })).catch((error: unknown) => {
          send(res, 400, { ok: false, source: "LIVE", error: error instanceof Error ? error.message : "signer failed" });
        });
      });
    },
  };
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
