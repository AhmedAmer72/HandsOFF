export type IntegrationStatus = "DISABLED" | "LIVE";

export interface Integration {
  name: string;
  status: IntegrationStatus;
  blocker: string;
}

export const NEAR_AI: Integration = {
  name: "NEAR AI",
  status: "DISABLED",
  blocker: "No pinned testnet verification key. The game contract leaves ai_key empty, so submit_diary_proof refuses to mint.",
};

export const OUTLAYER: Integration = {
  name: "OutLayer",
  status: "DISABLED",
  blocker: "The published OutLayer contract is outlayer.near on mainnet. No testnet endpoint was verified, and this build does not call mainnet.",
};

export const INTENTS: Integration = {
  name: "NEAR Intents",
  status: "DISABLED",
  blocker: "No Intents partner credentials and no verified testnet custody call. Item custody stays inside the game contract.",
};

export const DAO: Integration = {
  name: "DAO guild",
  status: "DISABLED",
  blocker: "No existing testnet DAO was named. The guild share stays in the game contract's guild_yocto field and is not sent anywhere.",
};

export const NEAR_AUTH: Integration = {
  name: "NEAR Auth",
  status: "DISABLED",
  blocker: "No approved NEAR Auth credentials. The dev server signs with the near-cli keychain for neocrafts.testnet.",
};

export function assertNotLive(integration: Integration) {
  if (integration.status === "LIVE") {
    throw new Error(`${integration.name} is marked live without a recorded testnet response.`);
  }
  return { source: "DISABLED" as const, status: integration.status, blocker: integration.blocker };
}
