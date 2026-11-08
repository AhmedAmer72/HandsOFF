import { useEffect, useState } from "react";
import { canonicalChain } from "../../blockchain/adapters";
import { MockChain } from "../../blockchain/MockChain";
import { RAID } from "../../../rules/economy";
import { HERO_PROFILES } from "../../game/config/heroProfiles";
import { dungeonTier, nextDay, setScreen, useGame } from "../../game/store";
import { shopState, stockPrice } from "../../game/rules/money";
import { Button, Chip, Panel, Title } from "../kit";

function book() {
  return canonicalChain(() => {
    const chain = new MockChain();
    chain.seedStandard();
    return chain;
  });
}

export function HomeScreen() {
  const game = useGame();
  const treasury = book().account("dungeon").gold;
  const tier = dungeonTier(game.raidsCleared ?? 0);
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <Title>Ashgate</Title>
      <p className="text-sm text-parchment/75">{game.continueReady ? "The hall remembers this device." : "First watch. Nothing has been written yet."}</p>
      <div className="flex flex-wrap gap-2">
        <Chip hot={game.vault < RAID.vaultStart * 0.25}>Vault {game.vault}</Chip>
        <Chip>Treasury {treasury.toFixed(0)}</Chip>
        <Chip>Tier {tier}</Chip>
        <Chip>{game.dungeonClosed ? "Closed — restock to reopen" : "Open"}</Chip>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Button onClick={() => setScreen("dungeon")}>Raid</Button>
        <Button tone="ghost" onClick={() => setScreen("gate")}>Gate market</Button>
        <Button tone="ghost" onClick={() => setScreen("workshop")}>Workshop</Button>
        <Button tone="ghost" onClick={() => setScreen("map")}>World map</Button>
        <Button tone="ghost" onClick={() => setScreen("week")}>A week of raids</Button>
        <Button tone="ghost" onClick={() => setScreen("settings")}>Settings</Button>
      </div>
    </section>
  );
}

export function ReportScreen() {
  const game = useGame();
  const report = game.pending ?? game.raids[0];
  if (!report) {
    return <section className="mx-auto max-w-3xl p-4"><Title>Raid report</Title><p className="mt-3 text-sm">No raid has been recorded. Open the hall and send a hero through the gate.</p><Button className="mt-4" onClick={() => setScreen("dungeon")}>Back to the hall</Button></section>;
  }
  const hero = HERO_PROFILES[report.heroId];
  const burned = game.pageResult === "burned" ? report.facts.length : 0;
  const landed = game.pageResult === "escaped" ? report.facts.length : 0;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Title>Raid report</Title>
      <Panel>
        <p className="font-display text-2xl text-gold">{hero.name} {report.survived ? "survived" : "fell"}.</p>
        <p className="mt-2 text-sm">Day {report.day}. Traps sprung {report.trapsTriggered.length}. Chain ×{game.chain ?? 0}.</p>
        <p className="text-sm">Pages burned {burned}. Pages landed {landed}. Memory rating {report.facts.length ? `${burned}/${report.facts.length}` : "no page"}.</p>
        <p className="text-sm">Salvage in hand: iron {game.inventory.iron ?? 0}, ash {game.inventory.ash ?? 0}, bone {game.inventory.bone ?? 0}.</p>
        <p className="text-sm">Spike kills {game.trapKills?.spike ?? 0}. Tier {dungeonTier(game.raidsCleared ?? 0)}.</p>
        <p className="mt-2 text-sm text-parchment/70">{report.decision.reason}</p>
      </Panel>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { if (game.phase === "report") nextDay(); else setScreen("dungeon"); }}>Next wave</Button>
        <Button tone="ghost" onClick={() => setScreen("gate")}>Gate market</Button>
        <Button tone="ghost" onClick={() => setScreen("workshop")}>Workshop</Button>
        <Button tone="ghost" onClick={() => setScreen("chronicle")}>Watch replay</Button>
      </div>
    </section>
  );
}

export function WeekScreen() {
  const stocks = [100, 160, 220, 400, 40, 100];
  const points = stocks.map((stock) => ({ stock, price: stockPrice("play:resource:iron", stock, stock >= 200 ? 1 : 8, stock >= 200 ? 14 : 2, 12).price }));
  const closed = shopState(0.005, 0, 100, true);
  const thin = shopState(0.015, 40, 100, true);
  const open = shopState(0.02, 100, 100, true);
  const max = Math.max(...points.map((point) => point.price));
  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-ember">Simulated</p>
      <Title>A week of raids</Title>
      <p className="text-sm text-parchment/75">Same stock curve as the hall. No one is paid. Iron floods, the price falls, the shop closes, then a restock reopens it.</p>
      <Panel>
        <p className="text-sm">Iron price against stock. Base 10, target 100, floor 5, ceiling 20.</p>
        <div className="mt-4 flex h-40 items-end gap-2">
          {points.map((point) => (
            <div key={point.stock} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-xl bg-gold" style={{ height: `${Math.max(12, (point.price / max) * 100)}%` }} />
              <span className="text-[10px]">{point.price.toFixed(1)}</span>
              <span className="text-[10px] text-parchment/60">s{point.stock}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="flex flex-wrap gap-2 text-sm">
        <Chip>Flood stock 400 → {points[3].price.toFixed(2)}</Chip>
        <Chip>Purse 0.005 and empty shelves → {closed}</Chip>
        <Chip>Purse 0.015 → {thin}</Chip>
        <Chip>Restocked 0.02 and full shelves → {open}</Chip>
      </div>
    </section>
  );
}

export function DeedScreen() {
  const game = useGame();
  const chain = book();
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState("");
  const owner = chain.deed.owner;
  const holder = owner === "player";
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4" data-tick={tick}>
      <Title>{holder ? "Ashgate charter" : "Ashgate, public"}</Title>
      <Panel>
        {holder ? (
          <>
            <p>You hold the charter. Treasury gold {chain.account("dungeon").gold.toFixed(0)}. Status {chain.deed.status}.</p>
            <p className="mt-2 text-sm text-parchment/70">Earlier holders: {(chain.deed.previousOwners ?? []).join(", ") || "none"}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => { const result = chain.transferDeed("player", "mira", `ui-deed-${tick}`); setNote(result.receipt.reason); setTick((value) => value + 1); }}>Pass the charter to Mira</Button>
              <Button tone="ghost" onClick={() => setScreen("takehome")}>Take it home</Button>
            </div>
          </>
        ) : (
          <p>The charter is held by {owner}. Tier {dungeonTier(game.raidsCleared ?? 0)}. The hall is {game.dungeonClosed ? "closed" : "open"}. Traffic this season: {game.raids.length} recorded raids.</p>
        )}
        {note && <p className="mt-3 text-sm text-gold">{note}</p>}
      </Panel>
    </section>
  );
}

export function GuildScreen() {
  const chain = book();
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState("Simulated guild purse. Nothing leaves this device.");
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4" data-tick={tick}>
      <Title>Guild board</Title>
      <p className="text-sm text-parchment/75">{note}</p>
      <Panel>
        <p>Guild purse {chain.account("guild").near.toFixed(4)} on this device.</p>
        {chain.bounties.length === 0 && <p className="mt-2 text-sm">No open tasks.</p>}
        {chain.bounties.map((bounty) => <p key={bounty.id} className="mt-2 text-sm">{bounty.payee} · {bounty.amount} · {bounty.status}</p>)}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => { const result = chain.proposeBounty("mira", 0.01, `ui-bounty-${tick}`); setNote(result.receipt.reason); setTick((value) => value + 1); }}>Post a restock task</Button>
          <Button tone="ghost" disabled={!chain.bounties.some((bounty) => bounty.status === "PROPOSED")} onClick={() => {
            const bounty = chain.bounties.find((entry) => entry.status === "PROPOSED");
            if (!bounty) return;
            const result = chain.approveBounty("guild", bounty.id, `ui-pay-${tick}`);
            setNote(result.receipt.reason);
            setTick((value) => value + 1);
          }}>Pay the open task</Button>
        </div>
      </Panel>
    </section>
  );
}

const STEPS = ["In the hall", "Sent", "On the road", "Delivered"] as const;

export function TakeHomeScreen() {
  const chain = book();
  const treasury = chain.account("dungeon").near;
  const [amount, setAmount] = useState(0.01);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "SUCCESS" | "FAILED">("idle");
  const fee = amount * 0.02;
  const tooMuch = amount > treasury + 1e-9;
  useEffect(() => { setStatus("idle"); setStep(0); }, [amount]);
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-ember">Simulated result</p>
      <Title>Take it home</Title>
      <Panel>
        <p className="text-sm">Only the treasury can leave. Vault gold stays in the hall. Nothing is sent off this device.</p>
        <p className="mt-2">Treasury on this device {treasury.toFixed(4)}.</p>
        <label className="mt-3 block text-sm">Amount
          <input className="mt-1 w-full rounded-xl bg-ink px-3 py-2" type="number" min={0.001} step={0.001} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </label>
        <p className="mt-2 text-sm">Quoted fee {fee.toFixed(4)}. You would keep {(amount - fee).toFixed(4)}. This quote is simulated.</p>
        <p className="mt-2 text-sm">Status: {status === "idle" ? STEPS[step] : status}.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={tooMuch || step >= STEPS.length - 1} onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}>Advance</Button>
          <Button tone="ember" disabled={tooMuch || step < STEPS.length - 1 || status !== "idle"} onClick={() => setStatus("SUCCESS")}>Mark delivered</Button>
          <Button tone="ghost" onClick={() => setStatus("FAILED")}>Mark failed</Button>
        </div>
        {tooMuch && <p className="mt-2 text-sm text-blood">That is more than the treasury.</p>}
        {status !== "idle" && <p className="mt-2 text-sm text-gold">{status}. No funds moved.</p>}
      </Panel>
    </section>
  );
}
