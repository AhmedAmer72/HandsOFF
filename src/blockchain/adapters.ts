import type { MockChain } from "./MockChain";

/** Thin local adapters. Every call hits the same MockChain. None of them open a socket. */

export function mockAccounts(chain: MockChain) {
  return { get: (id: string) => chain.account(id), list: () => chain.accounts };
}

export function mockNep245(chain: MockChain) {
  return {
    balanceOf: (owner: string, typeId: string) => chain.mtBalance(owner, typeId),
    transfer: (from: string, to: string, itemId: string, key?: string) => chain.mtTransfer(from, to, itemId, key),
  };
}

export function mockNep171(chain: MockChain) {
  return {
    ownerOf: (tokenId?: string) => chain.nftOwner(tokenId),
    transfer: (from: string, to: string, key?: string) => chain.transferDeed(from, to, key),
  };
}

export function mockLedgers(chain: MockChain) {
  const ids = ["kara", "brann", "ivo", "mira", "orrin", "tallow"];
  return { all: () => ids.map((id) => chain.account(id)), spend: chain.agentSpend.bind(chain) };
}

export function mockMarketplace(chain: MockChain) {
  return { list: chain.list.bind(chain), buy: chain.buy.bind(chain), cancel: chain.cancel.bind(chain) };
}

export function mockEscrow(chain: MockChain) {
  return { held: () => chain.items.filter((item) => item.owner === "escrow" || item.owner === "intents.mock") };
}

export function mockPermits(chain: MockChain) {
  return {
    fund: chain.fundPermit.bind(chain),
    counter: chain.counterPermit.bind(chain),
    settle: chain.settlePermit.bind(chain),
    expire: chain.expirePermit.bind(chain),
  };
}

export function mockSession(chain: MockChain) {
  return { issue: chain.issueKey.bind(chain), call: chain.callWithKey.bind(chain), revoke: chain.revokeKey.bind(chain) };
}

export function mockRelayer(chain: MockChain) {
  return { submit: chain.relay.bind(chain) };
}

export function mockAi(chain: MockChain) {
  return { verify: chain.verifyDecision.bind(chain) };
}

export function mockVrf(chain: MockChain) {
  return { seed: chain.vrfSeed.bind(chain) };
}

export function mockIntents(chain: MockChain) {
  return { deposit: chain.intentDeposit.bind(chain), withdraw: chain.intentWithdraw.bind(chain) };
}

export function mockDeeds(chain: MockChain) {
  return { transfer: chain.transferDeed.bind(chain), withdraw: chain.withdrawTreasury.bind(chain), recover: chain.recoverDeed.bind(chain) };
}

export function mockDao(chain: MockChain) {
  return { propose: chain.proposeBounty.bind(chain), approve: chain.approveBounty.bind(chain) };
}

let canonical: MockChain | null = null;

export function canonicalChain(factory: () => MockChain) {
  if (!canonical) canonical = factory();
  return canonical;
}

export function resetCanonicalChain(factory: () => MockChain) {
  canonical = factory();
  return canonical;
}
