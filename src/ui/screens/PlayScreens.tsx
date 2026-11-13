import { useEffect, useState } from "react";
import { RAID } from "../../../rules/economy";
import { accountNear, deedToken, formatMicro, formatYocto, gameStatus, gameView, transact } from "../../chain/live";
import { HERO_PROFILES } from "../../game/config/heroProfiles";
import { dungeonTier, nextDay, setScreen, useGame } from "../../game/store";
import { shopState, stockPrice } from "../../game/rules/money";
import { Button, Chip, Panel, Receipt, Title } from "../kit";

function useLive<T>(load: () => Promise<T>, refresh = 0) {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let gone = false;
    void load().then((next) => {
      if (!gone) setValue(next);
    }).catch((reason: unknown) => {
      if (!gone) setError(reason instanceof Error ? reason.message : "The contract did not answer.");
    });
    return () => {
      gone = true;
    };
    // The loader is read once per refresh. A new function identity must not refetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);
  return { value, error };
}

export function HomeScreen() {
  const game = useGame();
  const tier = dungeonTier(game.raidsCleared ?? 0);
  const live = useLive(async () => {
    const status = await gameStatus();
    const gold = await gameView<string>("mt_balance_of", { account_id: "neocrafts.testnet", token_id: "__gold" });
    return { status: status.value, gold: gold.value ?? "0", error: status.error };
  });
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <Title>Ashgate</Title>
      <p className="text-sm text-parchment/75">Live on game.neocrafts.testnet. {live.error || live.value?.error || (live.value ? `Network ${live.value.status?.network ?? "testnet"}.` : "Reading the contract.")}</p>
      <div className="flex flex-wrap gap-2">
        <Chip hot={game.vault < RAID.vaultStart * 0.25}>Vault {game.vault}</Chip>
        <Chip>Chain gold {live.value ? formatMicro(live.value.gold) : "…"}</Chip>
        <Chip>Tier {tier}</Chip>
        <Chip>{game.dungeonClosed ? "Closed — restock to reopen" : "Open"}</Chip>
      </div>
      <Button onClick={() => setScreen("dungeon")}>Raid</Button>
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
      <Receipt>
        <p className="font-display text-2xl">{hero.name} {report.survived ? "survived" : "fell"}.</p>
        <p className="mt-2 text-sm">Day {report.day}. Traps sprung {report.trapsTriggered.length}. Chain ×{game.chain ?? 0}.</p>
        <p className="text-sm">Pages burned {burned}. Pages landed {landed}. Memory rating {report.facts.length ? `${burned}/${report.facts.length}` : "no page"}.</p>
        <p className="text-sm">Salvage in hand: iron {game.inventory.iron ?? 0}, ash {game.inventory.ash ?? 0}, bone {game.inventory.bone ?? 0}.</p>
        <p className="text-sm">Spike kills {game.trapKills?.spike ?? 0}. Tier {dungeonTier(game.raidsCleared ?? 0)}.</p>
        <p className="mt-2 text-sm opacity-80">{report.decision.reason}</p>
      </Receipt>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { if (game.phase === "report") nextDay(); else setScreen("dungeon"); }}>Continue</Button>
        <Button tone="ghost" onClick={() => setScreen("dungeon")}>My Dungeon</Button>
        <Button tone="ghost" onClick={() => setScreen("market")}>Market</Button>
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
  const quote = useLive(async () => gameView<Record<string, string>>("quote", { token_id: "play:resource:iron" }));
  const price = quote.value?.value?.price;
  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-ember">Live quote</p>
      <Title>Iron on the contract</Title>
      <p className="text-sm text-parchment/75">The chart is the published stock curve. The number under it is quote() on game.neocrafts.testnet.</p>
      <Panel>
        <p className="text-sm">Contract price {price ? formatMicro(price) : quote.error || "reading"} gold. Currency {quote.value?.value?.currency ?? ""}.</p>
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
  const [note, setNote] = useState("");
  const [nonce, setNonce] = useState(0);
  const live = useLive(async () => {
    const deed = await deedToken();
    const treasury = await accountNear("ashgate.deeds.neocrafts.testnet");
    return { deed: deed.value, error: deed.error, treasury: treasury.liquid };
  }, nonce);
  const owner = live.value?.deed?.owner_id ?? "…";
  const holder = owner === "neocrafts.testnet";
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4" data-tick={nonce}>
      <p className="text-xs uppercase tracking-[0.2em] text-ember">deeds.neocrafts.testnet</p>
      <Title>{holder ? "Ashgate charter" : "Ashgate, held"}</Title>
      <Panel>
        <p>Owner {owner}. Treasury liquid {live.value?.treasury ?? "…"} NEAR. {live.error || live.value?.error || ""}</p>
        <p className="mt-2 text-sm text-parchment/70">Token deed:ashgate. Tier {dungeonTier(game.raidsCleared ?? 0)}. The hall is {game.dungeonClosed ? "closed" : "open"}.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={!holder} onClick={() => void transact({ contract: "deeds.neocrafts.testnet", method: "nft_transfer", account: "neocrafts.testnet", args: { receiver_id: "buyer.neocrafts.testnet", token_id: "deed:ashgate", approval_id: null, memo: null } }).then((result) => { setNote(result.ok ? `Transferred. ${result.explorer ?? ""}` : result.error ?? "Transfer failed."); setNonce((value) => value + 1); })}>Pass the charter to buyer.neocrafts.testnet</Button>
        </div>
        {note && <p className="mt-3 text-sm text-gold">{note}</p>}
      </Panel>
    </section>
  );
}

export function GuildScreen() {
  const live = useLive(async () => gameStatus());
  const guild = live.value?.value?.guild_yocto;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-ember">game.neocrafts.testnet</p>
      <Title>Guild share</Title>
      <p className="text-sm text-parchment/75">The guild portion of each settled permit stays in the game contract. No DAO account is connected, so this screen does not send it anywhere.</p>
      <Panel>
        <p>Guild balance {guild ? formatYocto(guild) : live.error || "reading"} NEAR.</p>
        <p className="mt-2 text-sm">Ops {live.value?.value?.ops_yocto ? formatYocto(live.value.value.ops_yocto) : "…"} NEAR. Solvency {live.value?.value?.solvency_yocto ? formatYocto(live.value.value.solvency_yocto) : "…"} NEAR.</p>
      </Panel>
    </section>
  );
}

export function TakeHomeScreen() {
  const [amount, setAmount] = useState("0.01");
  const [note, setNote] = useState("");
  const live = useLive(async () => {
    const deed = await deedToken();
    const treasury = await accountNear("ashgate.deeds.neocrafts.testnet");
    return { owner: deed.value?.owner_id ?? "", liquid: treasury.liquid };
  });
  const owner = live.value?.owner ?? "";
  const signer = owner === "buyer.neocrafts.testnet" ? "buyer.neocrafts.testnet" : owner === "neocrafts.testnet" ? "neocrafts.testnet" : "";
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-ember">ashgate.deeds.neocrafts.testnet</p>
      <Title>Take it home</Title>
      <Panel>
        <p className="text-sm">Withdrawals move NEAR from the Ashgate treasury to the current deed owner. The call is signed by that owner.</p>
        <p className="mt-2">Owner {owner || "…"}. Liquid {live.value?.liquid ?? "…"} NEAR.</p>
        <label className="mt-3 block text-sm">NEAR
          <input className="control mt-1" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={!signer} onClick={() => {
            const yocto = BigInt(Math.round(Number(amount) * 1e6)) * 10n ** 18n;
            void transact({
              contract: "deeds.neocrafts.testnet",
              method: "withdraw_treasury",
              account: signer,
              args: { token_id: "deed:ashgate", amount: yocto.toString() },
            }).then((result) => setNote(result.ok ? `Withdrawn. ${result.explorer ?? ""}` : result.error ?? "Withdraw failed."));
          }}>Withdraw to the owner</Button>
        </div>
        {note && <p className="mt-2 text-sm text-gold">{note}</p>}
      </Panel>
    </section>
  );
}
