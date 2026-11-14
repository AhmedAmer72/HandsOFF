import { GAME_CONTRACT, DEEDS_CONTRACT } from "./mode";
import { viewCall } from "./rpc";
import { canonicalOutcome, type OutcomeRecord } from "./settlement";
import { sha256Hex } from "./hash";

export interface TxResult {
  ok: boolean;
  source: "LIVE";
  txHash?: string | null;
  value?: unknown;
  error?: string;
  explorer?: string | null;
}

export function formatYocto(value: string) {
  const amount = BigInt(value || "0");
  const scale = 10n ** 24n;
  const whole = amount / scale;
  const frac = (amount % scale).toString().padStart(24, "0").slice(0, 4);
  return `${whole}.${frac}`;
}

export function formatMicro(value: string) {
  const amount = BigInt(value || "0");
  const whole = amount / 1_000_000n;
  const frac = (amount % 1_000_000n).toString().padStart(6, "0").slice(0, 2);
  return `${whole}.${frac}`;
}

export function appUsesChain() {
  if (import.meta.env.VITEST) return false;
  if (import.meta.env.VITE_CHAIN_MODE === "mock") return false;
  return true;
}

export async function keeper() {
  try {
    const response = await fetch("/api/near");
    if (!response.ok) return { source: "LIVE" as const, accounts: [] as string[], keeper: null };
    return await response.json() as { source: "LIVE"; accounts: string[]; keeper: string | null };
  } catch {
    return { source: "LIVE" as const, accounts: [], keeper: null };
  }
}

export async function transact(input: {
  method: string;
  args?: Record<string, unknown>;
  contract?: string;
  account?: string;
  deposit?: string;
}): Promise<TxResult> {
  try {
    const response = await fetch("/api/near", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        account: input.account ?? "neocrafts.testnet",
        contract: input.contract ?? GAME_CONTRACT,
        method: input.method,
        args: input.args ?? {},
        deposit: input.deposit,
      }),
    });
    const body = await response.json() as TxResult;
    return { ...body, source: "LIVE", ok: response.ok && body.ok !== false };
  } catch {
    return { ok: false, source: "LIVE", error: "No signing key on this host." };
  }
}

export async function gameStatus() {
  return viewCall<Record<string, string>>(GAME_CONTRACT, "status", {});
}

export async function gameView<T>(method: string, args: Record<string, unknown>) {
  return viewCall<T>(GAME_CONTRACT, method, args);
}

export async function deedToken() {
  return viewCall<{ token_id: string; owner_id: string; metadata?: { title?: string } } | null>(DEEDS_CONTRACT, "nft_token", { token_id: "deed:ashgate" });
}

export async function accountNear(accountId: string) {
  const response = await fetch("https://rpc.testnet.near.org", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "account",
      method: "query",
      params: { request_type: "view_account", finality: "final", account_id: accountId },
    }),
  });
  const body = await response.json() as { result?: { amount?: string; storage_usage?: number } };
  const amount = BigInt(body.result?.amount ?? "0");
  const storage = BigInt(body.result?.storage_usage ?? 0) * 10_000_000_000_000_000_000n;
  const liquid = amount > storage ? amount - storage : 0n;
  return { source: "LIVE" as const, liquid: formatYocto(liquid.toString()) };
}

export async function settlePublishedRaid(input: {
  offerId: string;
  hero: string;
  raidId: string;
  survived: boolean;
  goldDelta: number;
  kills: number;
  iron: number;
  bone: number;
  ash: number;
  log: string;
}) {
  const status = await gameStatus();
  if (!status.value) return { ok: false, source: "LIVE" as const, error: status.error ?? "The game contract did not answer." };
  const record: OutcomeRecord = {
    raidId: input.raidId,
    hero: input.hero,
    survived: input.survived,
    goldDelta: input.goldDelta,
    kills: input.kills,
    burns: 0,
    landed: [],
    iron: input.iron,
    bone: input.bone,
    ash: input.ash,
    rulesHash: status.value.rules_hash,
    engineHash: status.value.engine_hash,
  };
  const outcome = canonicalOutcome(record);
  const logged = input.log.slice(0, 8000);
  const hash = await sha256Hex(logged);
  const recorded = await transact({ method: "record_actions", args: { raid_id: input.raidId, input_log: logged, session_nonce: 0 } });
  if (!recorded.ok) return recorded;
  const settled = await transact({
    method: "settle_raid",
    args: { raid_id: input.raidId, offer_id: input.offerId, input_hash: hash, outcome, session_nonce: 0 },
  });
  if (!settled.ok) return settled;
  if (input.iron + input.bone + input.ash > 0) {
    const claimed = await transact({ method: "claim_salvage", args: { raid_id: input.raidId, session_nonce: 0 } });
    if (!claimed.ok) return claimed;
  }
  return { ok: true, source: "LIVE" as const, txHash: settled.txHash, explorer: settled.explorer, error: undefined };
}
