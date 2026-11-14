import { useEffect, useState } from "react";
import { RAID } from "../../../rules/economy";
import { DEEDS_CONTRACT, GAME_CONTRACT, TREASURY_CONTRACT } from "../../chain/mode";
import { accountNear, deedToken, formatMicro, formatYocto, gameStatus, gameView, keeper, transact } from "../../chain/live";
import { HERO_PROFILES } from "../../game/config/heroProfiles";
import { dungeonTier, nextDay, setScreen, useGame } from "../../game/store";
import { playerLine } from "../playerLine";
import { Button, Chip, Panel, Receipt, Title } from "../kit";

function useLive<T>(load: () => Promise<T>, refresh = 0) {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let gone = false;
    void load().then((next) => {
      if (!gone) setValue(next);
    }).catch((reason: unknown) => {
      if (!gone) setError(reason instanceof Error ? reason.message : "That call failed.");
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
        <Why text={report.decision.reason} />
      </Receipt>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { if (game.phase === "report") nextDay(); else setScreen("dungeon"); }}>Continue</Button>
        <Button tone="ghost" onClick={() => setScreen("chronicle")}>Replay</Button>
      </div>
    </section>
  );
}

function Why({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <Button tone="ghost" onClick={() => setOpen((value) => !value)}>Why?</Button>
      {open && <p className="mt-2 text-sm opacity-80">{text}</p>}
    </div>
  );
}

export function DeedScreen() {
  const game = useGame();
  const [note, setNote] = useState("");
  const [details, setDetails] = useState(false);
  const [amount, setAmount] = useState("0.01");
  const [nonce, setNonce] = useState(0);
  const [signers, setSigners] = useState<string[]>([]);
  const live = useLive(async () => {
    const deed = await deedToken();
    const treasury = await accountNear(TREASURY_CONTRACT);
    const status = await gameStatus();
    return { deed: deed.value, error: deed.error || status.error, treasury: treasury.liquid, status: status.value };
  }, nonce);
  useEffect(() => {
    void keeper().then((body) => setSigners(body.accounts ?? [])).catch(() => setSigners([]));
  }, [nonce]);
  const owner = live.value?.deed?.owner_id ?? "";
  const canSign = Boolean(owner) && signers.includes(owner);
  const guild = live.value?.status?.guild_yocto;
  const ops = live.value?.status?.ops_yocto;
  const solvency = live.value?.status?.solvency_yocto;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4" data-testid="ownership">
      <Button tone="ghost" className="self-start" onClick={() => setScreen("settings")}>Settings</Button>
      <Title>Ownership</Title>
      <Panel>
        <p>Owner {owner || "…"}</p>
        <p className="mt-2">Treasury {live.value?.treasury ?? "…"}</p>
        <p className="mt-2">Guild {guild ? formatYocto(guild) : "…"} · sending it is unavailable</p>
        <p className="mt-2 text-sm">Hall {game.dungeonClosed ? "CLOSED" : "OPEN"} · Tier {dungeonTier(game.raidsCleared ?? 0)}</p>
        <p className="mt-2 text-sm">Ops {ops ? formatYocto(ops) : "…"} · Solvency {solvency ? formatYocto(solvency) : "…"}</p>
        {live.error && <p className="mt-2 text-sm text-blood">{playerLine(live.error)}</p>}
        <label className="mt-4 block text-sm">Amount
          <input className="control mt-1" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={!canSign} onClick={() => {
            const yocto = BigInt(Math.round(Number(amount) * 1e6)) * 10n ** 18n;
            void transact({
              contract: DEEDS_CONTRACT,
              method: "withdraw_treasury",
              account: owner,
              args: { token_id: "deed:ashgate", amount: yocto.toString() },
            }).then((result) => {
              setNote(result.ok ? "Withdrawn." : result.error ?? "Withdraw failed.");
              setNonce((value) => value + 1);
            });
          }}>Withdraw</Button>
        </div>
        {note && <p className="mt-3 text-sm text-gold" data-testid="ownership-note">{playerLine(note)}</p>}
        <Button tone="ghost" className="mt-4" onClick={() => setDetails((value) => !value)}>Details</Button>
        {details && (
          <div className="mt-3 text-sm text-parchment/70">
            <p>{GAME_CONTRACT}</p>
            <p>{DEEDS_CONTRACT}</p>
            <p>{TREASURY_CONTRACT}</p>
            <p className="mt-2">deed:ashgate</p>
            {canSign && owner === "neocrafts.testnet" && (
              <Button className="mt-3" onClick={() => void transact({
                contract: DEEDS_CONTRACT,
                method: "nft_transfer",
                account: owner,
                args: { receiver_id: "buyer.neocrafts.testnet", token_id: "deed:ashgate", approval_id: null, memo: null },
              }).then((result) => {
                setNote(result.ok ? "The deed moved." : result.error ?? "Transfer failed.");
                setNonce((value) => value + 1);
              })}>Pass the deed</Button>
            )}
          </div>
        )}
      </Panel>
    </section>
  );
}
