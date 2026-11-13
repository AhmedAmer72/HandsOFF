import { useEffect, useState } from "react";
import { deedToken, formatMicro, formatYocto, gameStatus, gameView } from "../../chain/live";
import { Button, Panel, Title } from "../kit";

interface MerchantView {
  merchant_id?: string;
  agent_id?: string;
  state?: string;
  near: string;
  gold: string;
}

export function MockSandbox() {
  const [note, setNote] = useState("Reading game.neocrafts.testnet.");
  const [status, setStatus] = useState<Record<string, string> | null>(null);
  const [merchants, setMerchants] = useState<MerchantView[]>([]);
  const [owner, setOwner] = useState("");
  async function refresh() {
    const live = await gameStatus();
    const deed = await deedToken();
    const rows = await Promise.all(["mira", "orrin", "tallow", "kara"].map((id) => gameView<MerchantView>(id === "kara" ? "view_agent" : "view_merchant", id === "kara" ? { agent_id: id } : { merchant_id: id })));
    setStatus(live.value ?? null);
    setOwner(deed.value?.owner_id ?? deed.error ?? "");
    setMerchants(rows.map((row) => row.value).filter((row): row is MerchantView => Boolean(row)));
    setNote(live.error ?? "Live testnet state.");
  }
  useEffect(() => { void refresh(); }, []);
  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <Title>Testnet ledger</Title>
      <p className="text-sm text-parchment/75">{note}</p>
      <Panel>
        <p>Network {status?.network ?? "…"} · AI {status?.ai_verification ?? "…"} · paused {status?.paused ?? "…"}</p>
        <p className="mt-2 text-sm">Rules {status?.rules_hash ?? "…"}</p>
        <p className="text-sm">Guild {status ? formatYocto(status.guild_yocto) : "…"} NEAR · deed owner {owner}</p>
        <Button className="mt-3" onClick={() => void refresh()}>Refresh from testnet</Button>
      </Panel>
      <Panel>
        {merchants.map((merchant) => (
          <p key={merchant.merchant_id ?? merchant.agent_id} className="text-sm">{merchant.merchant_id ?? merchant.agent_id} · {merchant.state ?? "agent"} · {formatYocto(merchant.near)} NEAR · gold {formatMicro(merchant.gold)}</p>
        ))}
      </Panel>
    </section>
  );
}
