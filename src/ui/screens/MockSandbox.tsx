import { useMemo, useState } from "react";
import { MockChain } from "../../blockchain/MockChain";
import { setScreen } from "../../game/store";

export function MockSandbox() {
  const chain = useMemo(() => {
    const book = new MockChain();
    book.seedStandard();
    return book;
  }, []);
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState("MOCK ENVIRONMENT. Nothing here is a live transfer.");
  function run(label: string, action: () => { ok: boolean; receipt: { status: string; reason: string } }) {
    const result = action();
    setNote(`${result.ok ? "MOCK CONFIRMED" : "MOCK REJECTED"} · ${label} · ${result.receipt.reason}`);
    setTick((value) => value + 1);
  }
  const player = chain.account("player");
  const iron = chain.items.find((item) => item.id === "item-iron-1");
  return (
    <section className="mx-auto max-w-3xl p-6" data-tick={tick}>
      <p className="text-xs uppercase tracking-[0.2em] text-ember">Mock environment</p>
      <h2 className="font-display text-3xl text-gold">Ownership details</h2>
      <p className="mt-2 text-sm text-parchment/75">{note}</p>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p>Your Gold {player.gold.toFixed(2)}</p>
        <p>Your simulated NEAR {player.near.toFixed(4)}</p>
        <p>Iron owner {iron?.owner ?? "gone"} · {iron?.cls}</p>
        <p>Kara NEAR {chain.account("kara").near.toFixed(4)}</p>
        <p>Guild Gold {chain.account("guild").gold.toFixed(2)}</p>
        <p>Deed owner {chain.deed.owner}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded border border-gold/40 px-3 py-2 text-sm" onClick={() => run("play iron for NEAR", () => chain.list("player", "item-iron-1", 0.01, "NEAR", `near-${tick}`))}>Try NEAR sale</button>
        <button className="rounded border border-gold/40 px-3 py-2 text-sm" onClick={() => run("list for gold", () => chain.list("player", "item-iron-1", 10, "PLAY_GOLD", "gold-list"))}>List for Gold</button>
        <button className="rounded border border-gold/40 px-3 py-2 text-sm" onClick={() => {
          chain.account("kara").gold = 20;
          const listing = chain.listings.find((entry) => entry.status === "LISTED");
          if (!listing) {
            setNote("MOCK REJECTED · List the iron for Gold first.");
            setTick((value) => value + 1);
            return;
          }
          run("Kara buys", () => chain.buy("kara", listing.id, "kara-buy"));
        }}>Kara buys the listing</button>
        <button className="rounded border border-white/20 px-3 py-2 text-sm" onClick={() => run("Kara funds a permit", () => chain.fundPermit("kara", `kara-fund-${tick}`))}>Kara funds an offer</button>
        <button className="rounded border border-white/20 px-3 py-2 text-sm" onClick={() => { chain.seedStandard(); setNote("Demo ledger reset. Your dungeon save was not cleared."); setTick((value) => value + 1); }}>Reset demo ledger</button>
        <button className="rounded border border-white/20 px-3 py-2 text-sm" onClick={() => setScreen("settings")}>Back to settings</button>
      </div>
      <ol className="mt-6 space-y-2 text-sm">
        {chain.journal.slice(-6).reverse().map((row) => (
          <li key={row.id} className="border-b border-white/10 pb-2">{row.label} {row.status} · {row.method} · {row.reason}</li>
        ))}
      </ol>
    </section>
  );
}
