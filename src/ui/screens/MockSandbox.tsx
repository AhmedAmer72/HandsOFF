import { useState } from "react";
import { canonicalChain, resetCanonicalChain } from "../../blockchain/adapters";
import { MockChain } from "../../blockchain/MockChain";
import { setScreen } from "../../game/store";

function freshBook() {
  const book = new MockChain();
  book.seedStandard();
  return book;
}

export function MockSandbox() {
  const [chain, setChain] = useState(() => canonicalChain(freshBook));
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState("SIMULATED ledger. These receipts are not cryptographic proofs and no network is contacted.");
  function run(label: string, action: () => { ok: boolean; receipt: { id: string; status: string; reason: string; label: string } }) {
    const result = action();
    setNote(`${result.receipt.label} ${result.ok ? "CONFIRMED" : "REJECTED"} · ${label} · ${result.receipt.id} · ${result.receipt.reason}`);
    setTick((value) => value + 1);
  }
  const rejected = chain.journal.filter((row) => row.status === "REJECTED" || row.status === "FAILED");
  const escrow = chain.items.filter((item) => item.owner === "escrow" || item.owner === "intents.mock");
  return (
    <section className="mx-auto max-w-5xl p-6" data-tick={tick}>
      <p className="text-xs uppercase tracking-[0.2em] text-ember">Developer only · simulated</p>
      <h2 className="font-display text-3xl text-gold">Mock chain</h2>
      <p className="mt-2 text-sm text-parchment/80">{note}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <button className="rounded border border-gold/40 px-3 py-2" onClick={() => run("list gold", () => chain.list("player", "item-iron-1", 10, "PLAY_GOLD", `gold-list-${tick}`))}>List iron for Gold</button>
        <button className="rounded border border-gold/40 px-3 py-2" onClick={() => run("list NEAR", () => chain.list("player", "item-iron-1", 0.01, "NEAR", `near-list-${tick}`))}>Try NEAR sale</button>
        <button className="rounded border border-gold/40 px-3 py-2" onClick={() => {
          const listing = chain.listings.find((entry) => entry.status === "LISTED");
          if (!listing) {
            setNote("SIMULATED REJECTED · List the iron for Gold first.");
            setTick((value) => value + 1);
            return;
          }
          chain.account("kara").gold = Math.max(chain.account("kara").gold, 20);
          run("Kara buys", () => chain.buy("kara", listing.id, `kara-buy-${tick}`));
        }}>Kara buys</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => run("fund permit", () => chain.fundPermit("player", `fund-${tick}`))}>Fund offer</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => {
          const offer = chain.permits.find((entry) => entry.status === "OPEN");
          if (!offer) {
            setNote("SIMULATED REJECTED · Fund an offer first.");
            setTick((value) => value + 1);
            return;
          }
          run("Ivo counters", () => chain.counterPermit("ivo", offer.id, 0.05, `counter-${tick}`));
        }}>Ivo counters</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => {
          const offer = chain.permits.find((entry) => entry.status === "OPEN" || entry.status === "COUNTER_PENDING");
          if (!offer) {
            setNote("SIMULATED REJECTED · No open offer.");
            setTick((value) => value + 1);
            return;
          }
          run("Owner settles", () => chain.settlePermit("player", offer.id, "ivo", `settle-${tick}`));
        }}>Owner settles</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => run("Kara overspends", () => chain.fundPermit("kara", `kara-fund-${tick}`))}>Kara funds</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => run("stranger", () => chain.agentSpend("kara", "stranger", 0.001, "NEAR", `stranger-${tick}`))}>Kara pays a stranger</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => { chain.lockPayout(true); run("locked transfer", () => chain.transferDeed("player", "mira", `lock-deed-${tick}`)); }}>Transfer during payout</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => { chain.lockPayout(false); run("transfer deed", () => chain.transferDeed(chain.deed.owner, chain.deed.owner === "player" ? "mira" : "player", `deed-${tick}`)); }}>Transfer deed</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => run("old owner withdraw", () => chain.withdrawTreasury("player", 10, `old-${tick}`))}>Old owner withdraws</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => { const seed = chain.vrfSeed(`raid-${tick}`); setNote(`${seed.detail}`); setTick((value) => value + 1); }}>Draw simulated seed</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => { setChain(resetCanonicalChain(freshBook)); setNote("Demo ledger reset. The dungeon save was not cleared."); setTick((value) => value + 1); }}>Reset demo ledger</button>
        <button className="rounded border border-white/20 px-3 py-2" onClick={() => setScreen("settings")}>Back to settings</button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded border border-white/10 p-3 text-sm">
          <h3 className="font-display text-gold">Accounts</h3>
          {chain.accounts.map((account) => (
            <p key={account.id}>{account.name} · gold {account.gold.toFixed(2)} · mock NEAR {account.near.toFixed(4)} · cap {account.maxSingle}</p>
          ))}
        </article>
        <article className="rounded border border-white/10 p-3 text-sm">
          <h3 className="font-display text-gold">Agent ledgers</h3>
          {["kara", "brann", "ivo", "mira", "orrin", "tallow"].map((id) => {
            const account = chain.account(id);
            return <p key={id}>{account.name} · spent today {account.spentTodayNear.toFixed(4)} / {account.daily} · single {account.maxSingle}</p>;
          })}
        </article>
        <article className="rounded border border-white/10 p-3 text-sm">
          <h3 className="font-display text-gold">Items and escrow</h3>
          {chain.items.map((item) => <p key={item.id}>{item.id} · {item.cls} · owner {item.owner}</p>)}
          <p className="mt-2">Escrow rows {escrow.length}. Deed {chain.deed.id} owner {chain.deed.owner} · {chain.deed.status}{chain.deed.payoutLocked ? " · payout locked" : ""}.</p>
          <p>Previous holders {(chain.deed.previousOwners ?? []).join(", ") || "none"}.</p>
        </article>
        <article className="rounded border border-white/10 p-3 text-sm">
          <h3 className="font-display text-gold">Permits and bounties</h3>
          {chain.permits.map((offer) => <p key={offer.id}>{offer.id} · {offer.status} · escrow {offer.escrow.toFixed(4)} · agents {(offer.split.agents * 100).toFixed(0)}%</p>)}
          {chain.permits.length === 0 && <p>No offers.</p>}
          {chain.bounties.map((bounty) => <p key={bounty.id}>{bounty.id} · {bounty.status} · {bounty.amount} to {bounty.payee}</p>)}
        </article>
      </div>
      <article className="mt-4 rounded border border-white/10 p-3 text-sm">
        <h3 className="font-display text-gold">Receipts</h3>
        {chain.journal.slice(-8).reverse().map((row) => (
          <p key={row.id}>{row.label} {row.status} · {row.id} · {row.method} · {row.caller} → {row.receiver} · {row.reason}</p>
        ))}
      </article>
      <article className="mt-4 rounded border border-white/10 p-3 text-sm">
        <h3 className="font-display text-gold">Rejected operations</h3>
        {rejected.slice(-6).reverse().map((row) => <p key={row.id}>{row.id} · {row.method} · {row.reason}</p>)}
        {rejected.length === 0 && <p>None yet.</p>}
      </article>
      <article className="mt-4 rounded border border-white/10 p-3 text-sm">
        <h3 className="font-display text-gold">Verification</h3>
        {chain.verifications.slice(-4).reverse().map((row) => <p key={row.id}>{row.kind} · {row.state} · genuine {String(row.genuine)} · {row.detail}</p>)}
        {chain.verifications.length === 0 && <p>No simulated checks yet.</p>}
      </article>
    </section>
  );
}
