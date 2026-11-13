import { CHAIN_MODE, TESTNET_RPC } from "./mode";

export interface ViewResult<T> {
  source: "LIVE" | "MOCK" | "SIMULATED";
  value?: T;
  error?: string;
}

export async function viewCall<T>(contractId: string, method: string, args: Record<string, unknown>): Promise<ViewResult<T>> {
  if (CHAIN_MODE !== "testnet") {
    return { source: "MOCK", error: "testnet mode is off" };
  }
  const response = await fetch(TESTNET_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "underrealm",
      method: "query",
      params: {
        request_type: "call_function",
        account_id: contractId,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
        finality: "final",
      },
    }),
  });
  const body = await response.json() as { result?: { result?: number[] }; error?: { message?: string } };
  if (!body.result?.result) {
    return { source: "LIVE", error: body.error?.message ?? "view failed" };
  }
  const text = String.fromCharCode(...body.result.result);
  return { source: "LIVE", value: JSON.parse(text) as T };
}
