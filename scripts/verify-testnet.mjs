const rpc = "https://rpc.testnet.near.org";
const accounts = ["game.neocrafts.testnet", "deeds.neocrafts.testnet", "ashgate.deeds.neocrafts.testnet"];

async function view(accountId, method, args = {}) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "verify",
      method: "query",
      params: {
        request_type: "call_function",
        account_id: accountId,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
        finality: "final",
      },
    }),
  });
  const body = await response.json();
  if (body.error || !body.result?.result) {
    throw new Error(body.error?.message ?? body.error?.data ?? `${accountId}.${method} failed`);
  }
  return JSON.parse(Buffer.from(body.result.result).toString("utf8"));
}

async function codeHash(accountId) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "code",
      method: "query",
      params: { request_type: "view_code", account_id: accountId, finality: "final" },
    }),
  });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message ?? `${accountId} has no code`);
  return body.result.hash;
}

const report = {};
for (const account of accounts) {
  report[account] = { codeHash: await codeHash(account) };
}
report["game.neocrafts.testnet"].status = await view("game.neocrafts.testnet", "status");
report["deeds.neocrafts.testnet"].metadata = await view("deeds.neocrafts.testnet", "nft_metadata");
report["deeds.neocrafts.testnet"].ashgate = await view("deeds.neocrafts.testnet", "nft_token", { token_id: "deed:ashgate" });
if (report["game.neocrafts.testnet"].status.network !== "testnet") {
  throw new Error("game status is not testnet");
}
if (report["game.neocrafts.testnet"].status.ai_verification !== "DISABLED") {
  throw new Error("AI verification must stay disabled until a real key is pinned");
}
console.log(JSON.stringify(report, null, 2));
