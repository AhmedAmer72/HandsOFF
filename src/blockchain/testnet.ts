import { GAME_CONTRACT, chainSource } from "../chain/mode";
import { viewCall, type ViewResult } from "../chain/rpc";
import { SESSION_METHODS } from "../../services/relayer";

export async function liveStatus(): Promise<ViewResult<Record<string, unknown>>> {
  return viewCall(GAME_CONTRACT, "status", {});
}

export function prepareRaidCall(method: string) {
  if (!SESSION_METHODS.includes(method as (typeof SESSION_METHODS)[number])) {
    return { source: "DISABLED" as const, ok: false, reason: "method is not on the session allowlist" };
  }
  return {
    source: chainSource(),
    ok: true,
    receiver: GAME_CONTRACT,
    method,
    depositYocto: "0",
    reason: "sign this with the player account. The hall does not open a wallet.",
  };
}
