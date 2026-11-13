import { GAME_CONTRACT } from "../src/chain/mode";

export const SESSION_METHODS = [
  "settle_raid",
  "record_actions",
  "supply",
  "craft",
  "list",
  "consume_rumour",
  "buy_back",
  "claim_salvage",
] as const;

export interface RelayRequest {
  receiver: string;
  method: string;
  depositYocto: string;
  nonce: string;
}

export interface RelayDecision {
  ok: boolean;
  source: "LIVE" | "DISABLED";
  reason: string;
}

const seen = new Set<string>();

export function screenRelay(request: RelayRequest): RelayDecision {
  if (request.receiver !== GAME_CONTRACT) {
    return { ok: false, source: "DISABLED", reason: "receiver is not game.neocrafts.testnet" };
  }
  if (!SESSION_METHODS.includes(request.method as (typeof SESSION_METHODS)[number])) {
    return { ok: false, source: "DISABLED", reason: "method is not on the session allowlist" };
  }
  if (request.depositYocto !== "0") {
    return { ok: false, source: "DISABLED", reason: "in-raid calls attach no deposit" };
  }
  if (seen.has(request.nonce)) {
    return { ok: false, source: "DISABLED", reason: "nonce already seen" };
  }
  seen.add(request.nonce);
  return {
    ok: true,
    source: "DISABLED",
    reason: "allowed, but NEP-366 submission is not live; the shipped path is a direct function-call signed by the player account",
  };
}
