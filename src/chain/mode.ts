export type ChainSource = "LIVE" | "MOCK" | "SIMULATED";

function envMode() {
  const vite = import.meta.env.VITE_CHAIN_MODE;
  const node = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VITE_CHAIN_MODE;
  const chosen = vite ?? node;
  return chosen === "mock" ? "mock" : "testnet";
}

export const CHAIN_MODE = envMode();

export const GAME_CONTRACT = "game.neocrafts.testnet";
export const DEEDS_CONTRACT = "deeds.neocrafts.testnet";
export const TREASURY_CONTRACT = "ashgate.deeds.neocrafts.testnet";
export const TESTNET_RPC = "https://rpc.testnet.near.org";

export function chainSource(): ChainSource {
  return CHAIN_MODE === "testnet" ? "LIVE" : "MOCK";
}
