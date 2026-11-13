import { CHAIN_MODE } from "../chain/mode";

export const BLOCKCHAIN_MODE = CHAIN_MODE;

const BLOCKED = /near\.org|nearprotocol|intents\.near|relayer\.near|outlayer|cloud-api\.near\.ai/i;
const TESTNET_RPC = /^https:\/\/rpc\.testnet\.near\.org(\/|$)/i;

export function assertLocalOnly(url: string) {
  if (BLOCKCHAIN_MODE === "testnet" && TESTNET_RPC.test(url)) return;
  if (BLOCKED.test(url)) {
    throw new Error("MOCK MODE: a live network call was blocked.");
  }
}

export function installMockGuard() {
  const host = globalThis as { __urGuard?: boolean; fetch?: typeof fetch };
  if (host.__urGuard || typeof host.fetch !== "function") return;
  host.__urGuard = true;
  const orig = host.fetch.bind(globalThis);
  host.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    assertLocalOnly(url);
    return orig(input, init);
  }) as typeof fetch;
}
