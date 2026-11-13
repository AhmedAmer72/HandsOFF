export type Currency = "PLAY_GOLD" | "NEAR";
export type ItemClass = "PLAY_ONLY" | "NEAR_BACKED" | "NON_TRADEABLE";
export type TxStatus = "CREATED" | "PENDING" | "VALIDATING" | "EXECUTING" | "CONFIRMED" | "FAILED" | "REJECTED" | "REFUNDED" | "EXPIRED";

export interface Receipt {
  simulated: true;
  label: "SIMULATED";
  source: "SIMULATED";
  id: string;
  block: number;
  blockHash: string;
  caller: string;
  receiver: string;
  method: string;
  amount: number;
  currency: Currency | "NONE";
  status: TxStatus;
  reason: string;
  itemId?: string;
  idempotencyKey?: string;
  at: number;
}

export interface ChainItem {
  id: string;
  typeId: string;
  cls: ItemClass;
  owner: string;
  history: string[];
}

export interface Listing {
  id: string;
  itemId: string;
  seller: string;
  price: number;
  currency: Currency;
  cls: ItemClass;
  status: "LISTED" | "SOLD" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  at: number;
  expiry: number;
}

export interface PermitOffer {
  id: string;
  funder: string;
  price: number;
  split: { owner: number; agents: number; guild: number; ops: number };
  status: "OPEN" | "COUNTER_PENDING" | "ACCEPTED" | "SETTLED" | "EXPIRED_REFUNDED";
  countered: boolean;
  hero?: string;
  escrow: number;
}

export interface Deed {
  id: string;
  owner: string;
  treasury: string;
  status: "ACTIVE" | "TRANSFER_PENDING" | "LOCKED" | "TRANSFERRED" | "RECOVERY_REQUIRED";
  payoutLocked: boolean;
  previousOwners?: string[];
}

export interface SessionKey {
  id: string;
  account: string;
  receiver: string;
  methods: string[];
  txCap: number;
  nonce: number;
  expiry: number;
  revoked: boolean;
  spent?: number;
  dailyCap?: number;
}

export interface Account {
  id: string;
  name: string;
  near: number;
  gold: number;
  spentTodayNear: number;
  maxSingle: number;
  daily: number;
}
