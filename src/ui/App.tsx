import { useEffect, useMemo, useRef, useState } from "react";
import { goodsRule } from "../game/config/economyRules";
import { GOODS as RULE_GOODS, RAID } from "../../rules/economy";
import { HERO_PROFILES } from "../game/config/heroProfiles";
import { TRAP_DEFINITIONS, TRAP_IDS } from "../game/config/trapDefinitions";
import { quotePrice } from "../game/engine/pricing";
import { evaluateHero } from "../game/engine/decisions";
import { merchantStatus } from "../game/engine/market";
import { sfx } from "../game/audio";
import {
  acceptRaidOffer,
  armPossess,
  bindDungeon,
  counterRaidOffer,
  fundRaidOffer,
  hallIdOf,
  refuseRaidOffer,
  buyBackRumour,
  buyFromMerchant,
  buyUpgrade,
  craftTrap,
  supplyIron,
  markDiary,
  newGame,
  nextDay,
  note,
  placeTrap,
  relayTrapTo,
  resolvePage,
  selectInfo,
  armTrap,
  triggerTrap,
  dungeonTier,
  clearTrap,
  setQuality,
  setReduceMotion,
  setScreen,
  setStats,
  startRaid,
  toSteps,
  useGame,
} from "../game/store";
import { offersOf, readRegistry } from "../game/world/registry";
import { outcomeHash } from "../game/engine/raid";
import { mountDungeon } from "../three/dungeon";
import { mountGallery } from "../three/gallery";
import { MainMenu } from "./screens/MainMenu";
import { MockSandbox } from "./screens/MockSandbox";
import { DeedScreen, GuildScreen, ReportScreen, TakeHomeScreen, WeekScreen } from "./screens/PlayScreens";
import { MarketHall, WorkshopHall } from "./stalls/StallHalls";
import { SpectatorScreen, WorldMap } from "./world/WorldScreens";
import { renderTrapIcons } from "./trapIcons";
import { Shell } from "./shell";
import { Button, CHRONICLE, chronicleKind, Num, Panel, Receipt } from "./kit";

const TUTORIAL = [
  "Choose Spike Trap on the bar. It follows the cursor. Click tile 4, 6.",
  "Click the south doorway. The chosen hero walks in.",
  "Click the flying page to burn it, or let the moment pass.",
  "Orrin keeps a landed page. Buy it back at his stall in the Market.",
  "Click the south doorway again. A hero who bought the rumour walks around the spike.",
  "Supply iron or buy a phial from the stalls in the Market.",
  "Chapter 7. The vault brace is in the workshop. After that, the next day is yours.",
];

export function App() {
  const game = useGame();
  return (
    <div className="flex h-full min-h-screen bg-ink font-body text-parchment">
      {game.screen !== "menu" && <Shell screen={game.screen} />}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {game.screen === "menu" && <MainMenu />}
        {(game.screen === "dungeon" || game.screen === "home") && <DungeonScreen />}
        {game.screen === "map" && <WorldMap />}
        {game.screen === "gate" && <GateMarket />}
        {game.screen === "market" && <MarketHall />}
        {game.screen === "workshop" && <WorkshopHall />}
        {game.screen === "spectator" && <SpectatorScreen />}
        {game.screen === "registry" && <Registry />}
        {game.screen === "chronicle" && <Chronicle />}
        {game.screen === "report" && <ReportScreen />}
        {game.screen === "week" && <WeekScreen />}
        {game.screen === "deed" && <DeedScreen />}
        {game.screen === "guild" && <GuildScreen />}
        {game.screen === "takehome" && <TakeHomeScreen />}
        {game.screen === "settings" && <Settings />}
        {game.screen === "gallery" && <Gallery />}
        {game.screen === "sandbox" && <MockSandbox />}
      </main>
    </div>
  );
}

function DungeonScreen() {
  const game = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seconds, setSeconds] = useState<number>(RAID.pageFlightSec);
  const [hint, setHint] = useState("Choose a trap on the bar. It follows the cursor until you click a tile.");
  const [trapIcons, setTrapIcons] = useState<Partial<Record<(typeof TRAP_IDS)[number], string>>>({});
  const [openHero, setOpenHero] = useState<"kara" | "brann" | "ivo" | null>(null);
  const [feed, setFeed] = useState("All");
  const [logOpen, setLogOpen] = useState(false);
  const [vaultPulse, setVaultPulse] = useState<"up" | "down" | null>(null);
  const prevVault = useRef(game.vault);
  useEffect(() => {
    const previous = prevVault.current;
    prevVault.current = game.vault;
    if (game.reduceMotion || previous === game.vault) return;
    setVaultPulse(game.vault > previous ? "up" : "down");
    const timer = window.setTimeout(() => setVaultPulse(null), 320);
    return () => window.clearTimeout(timer);
  }, [game.vault, game.reduceMotion]);
  useEffect(() => {
    let live = true;
    void renderTrapIcons().then((icons) => {
      if (live) setTrapIcons(icons);
    }).catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const [toast, setToast] = useState("");
  const hooks = useRef(game);
  hooks.current = game;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mounted = mountDungeon(canvas, {
      getHero: () => hooks.current.pending?.heroId ?? "kara",
      getQuality: () => hooks.current.quality,
      getMode: () => hooks.current.worldMode,
      getTrap: () => hooks.current.selectedTrap,
      getSpikeBonus: () => 0,
      onSelect: (selection) => selectInfo(selection),
      onHeroDamage: () => undefined,
      onEnemyDamage: () => undefined,
      onEnemies: () => undefined,
      tryPlace: (trapId, ix, iz) => {
        const result = placeTrap(trapId, ix, iz);
        if (result.ok) clearTrap();
        setToast(result.ok ? `Trap set at ${ix}, ${iz}.` : result.reason);
        return result.ok ? result.id ?? "" : "";
      },
      relayTo: (id, ix, iz) => {
        const result = relayTrapTo(id, ix, iz);
        setToast(result.reason);
        return result.ok;
      },
      getTraps: () => hooks.current.traps,
      onStats: (stats) => setStats(stats),
      onDiary: () => markDiary(),
      diaryChoice: () => hooks.current.pageResult === "idle" ? "idle" : hooks.current.pageResult,
      onPrompt: (text) => setHint(text),
      onGate: () => {
        if (hooks.current.phase === "report") nextDay();
        else if (hooks.current.phase === "prep") {
          setScreen("gate");
          sfx.ui();
        }
      },
      onBurn: () => {
        const result = resolvePage("burn");
        if (result.ok) sfx.burn();
        setToast(result.reason);
      },
      onPossess: () => setToast(armPossess().reason),
      onMerchant: (id) => {
        if (id === "mira") setToast(supplyIron(5).reason);
        else if (id === "orrin") {
          const rumour = hooks.current.merchants.orrin.rumours[0];
          setToast(rumour ? buyBackRumour(rumour.id).reason : "Orrin has no unsold page.");
        } else setToast(buyFromMerchant("tallow", "potion").reason);
      },
      onCraft: () => setToast(craftTrap("spike").reason),
      onTrigger: (id) => setToast(triggerTrap(id).reason),
      onBrace: () => setToast(buyUpgrade("vault-brace").reason),
      armTrap: (trapId) => armTrap(trapId),
      clearArm: () => clearTrap(),
      getPhase: () => hooks.current.phase,
      getDay: () => hooks.current.day,
      getShelf: () => {
        const shelfSlots = (qty: number, target: number) => qty <= 0 ? 0 : Math.max(1, Math.round(4 * Math.min(1, qty / Math.max(target, 1))));
        const iron = hooks.current.merchants.mira.stock.find((line) => line.itemId === "play:resource:iron");
        const potion = hooks.current.merchants.tallow.stock.find((line) => line.itemId === "nb:gear:potion");
        return {
          mira: shelfSlots(iron?.qty ?? 0, RULE_GOODS["play:resource:iron"].target),
          tallow: shelfSlots(potion?.qty ?? 0, RULE_GOODS["nb:gear:potion"].target),
          orrin: Math.min(4, hooks.current.merchants.orrin.rumours.length),
        };
      },
      getCue: () => hooks.current.merchantCue ?? null,
      getReduceMotion: () => Boolean(hooks.current.reduceMotion),
      getChain: () => hooks.current.chain ?? 0,
      getVault: () => hooks.current.vault,
    });
    bindDungeon(mounted);
    void mounted.ready.then(() => {
      const current = hooks.current;
      if (current.pending && (current.phase === "raid" || current.phase === "report")) {
        void mounted.playRoute(toSteps(current.pending));
      }
    });
    return () => mounted.dispose();
  }, [game.worldMode, game.quality, game.pending?.id]);

  useEffect(() => {
    if (game.pageResult !== "decision") return;
    let left: number = RAID.pageFlightSec;
    setSeconds(left);
    const timer = window.setInterval(() => {
      left = Math.max(0, left - 1);
      setSeconds(left);
      if (left === 0) {
        window.clearInterval(timer);
        resolvePage("escape");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game.pageResult, game.pending?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const key = event.key.toLowerCase();
      const index = Number(key) - 1;
      if (index >= 0 && index < TRAP_IDS.length) {
        const id = TRAP_IDS[index];
        if (game.selectedTrap === id) clearTrap();
        else armTrap(id);
      }
      if (key === "b") armTrap("bait");
      if (key === "p") armPossess();
      if (event.key === " " && game.pageResult === "decision") {
        event.preventDefault();
        resolvePage("burn");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.selectedTrap, game.pageResult]);

  const report = game.pending;
  const hero = report ? HERO_PROFILES[report.heroId] : HERO_PROFILES.kara;

  const picked = openHero ? game.heroes[openHero] : null;
  const pickedProfile = openHero ? HERO_PROFILES[openHero] : null;
  const pickedFacts = picked?.facts.filter((fact) => !fact.burned) ?? [];
  const lowVault = game.vault < RAID.vaultStart * 0.25;

  return (
    <div className={`relative h-full min-h-[640px] ${game.reduceMotion ? "motion-reduce" : ""}`}>
      <canvas ref={canvasRef} className="view absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col gap-2 px-2 sm:px-3">
        <div className="hud-glass pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-hud px-3 py-2 text-sm">
          <span>Vault <Num className={`${lowVault ? "text-blood" : "text-gold"} ${vaultPulse ? "vault-tick" : ""}`}>{game.vault}</Num></span>
          <span className="num">{game.phase === "raid" ? `−${RAID.bleedPerHeroPerSec}/s` : "−0/s"}{lowVault ? " · low" : ""}</span>
          <span>Gold <Num className="text-gold">{Math.round(game.gold)}</Num></span>
          <span className="text-ember" aria-label={`${game.cinder} of ${RAID.cinder.cap} cinder`}>Cinder {"●".repeat(game.cinder)}{"○".repeat(Math.max(0, RAID.cinder.cap - game.cinder))}</span>
          <span className="num">Wave {game.day}</span>
          <span className="num">Tier {dungeonTier(game.raidsCleared ?? 0)}</span>
          {game.phase !== "raid" && game.pageResult !== "decision" && <Button tone="ghost" className="ml-auto" onClick={() => setScreen("gate")}>Contract board</Button>}
          <Button tone="ghost" className={game.phase === "raid" || game.pageResult === "decision" ? "ml-auto" : ""} onClick={() => setLogOpen((value) => !value)}>Chronicle</Button>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          {(["kara", "brann", "ivo"] as const).map((id) => {
            const body = game.heroes[id];
            const profile = HERO_PROFILES[id];
            const open = openHero === id;
            return (
              <button key={id} className={`min-h-11 rounded-full px-3 text-sm ${open ? "bg-gold text-ink" : "hud-glass text-parchment"}`} aria-pressed={open} onClick={() => setOpenHero(open ? null : id)}>
                {profile.name} <span className="num">{body.hp}/{body.maxHp}</span>
              </button>
            );
          })}
        </div>
        {picked && pickedProfile && (
          <div className="hud-glass pointer-events-auto max-w-sm rounded-hud p-3 text-sm">
            <p className="font-display text-xl text-gold">{pickedProfile.name} · {pickedProfile.role}</p>
            <p>HP <span className="num">{picked.hp}/{picked.maxHp}</span> · Purse <span className="num">{picked.gold}</span></p>
            <p className="text-parchment/75">Gear {picked.equipment.join(", ") || "pack only"}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div className="h-full bg-blood" style={{ width: `${Math.max(0, (picked.hp / picked.maxHp) * 100)}%` }} />
            </div>
            {pickedFacts[0] ? <p className="mt-1 text-memory">{pickedFacts[0].memory ?? "warned"} · {pickedFacts[0].source ?? "record"}</p> : <p className="mt-1 text-parchment/70">No trap memory yet</p>}
            <p className="mt-1 text-parchment/80">{picked.memory[0]}</p>
            {pickedFacts.slice(0, 3).map((fact) => <p key={fact.id}>{fact.text}</p>)}
            <button type="button" className="mt-1 min-h-11 text-sm text-gold underline" onClick={() => setScreen("registry")}>Hero record</button>
          </div>
        )}
      </div>
      {game.phase === "report" && report && (
        <Receipt className="pointer-events-auto absolute left-3 top-28 max-w-sm text-sm">
          <div className="font-display text-lg">Raid results</div>
          <p>{report.survived ? `${hero.name} survived.` : `${hero.name} died.`}</p>
          <p>Traps sprung <span className="num">{report.trapsTriggered.length}</span>. Chain ×<span className="num">{game.chain ?? 0}</span>.</p>
          <p>Pages {game.pageResult === "burned" ? "burned" : game.pageResult === "escaped" ? "landed" : "still in the air"}: <span className="num">{report.facts.length}</span>. A landed page is sold. It does not teach a hero.</p>
          <p>Salvage: iron <span className="num">{game.inventory.iron ?? 0}</span>, ash <span className="num">{game.inventory.ash ?? 0}</span>, bone <span className="num">{game.inventory.bone ?? 0}</span>.</p>
          <p>Tier <span className="num">{dungeonTier(game.raidsCleared ?? 0)}</span>.</p>
          {game.dungeonClosed && <p className="text-blood">The vault is empty. The next wave restocks it.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => nextDay()}>{game.dungeonClosed ? "Restock and continue" : "Continue"}</Button>
            <Button tone="ghost" className="!text-ink" onClick={() => setScreen("report")}>Full report</Button>
            <Button tone="ghost" className="!text-ink" onClick={() => setScreen("market")}>Market</Button>
            <Button tone="ghost" className="!text-ink" onClick={() => setScreen("workshop")}>Workshop</Button>
            <Button tone="ghost" className="!text-ink" onClick={() => setScreen("chronicle")}>Watch replay</Button>
          </div>
        </Receipt>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center px-3">
        <div className="hud-glass w-[min(42rem,100%)] rounded-hud px-4 py-3 text-center">
          <p className="text-sm text-parchment">{game.pageResult === "decision" ? `The page is in the air. Burn costs ${RAID.cinder.burnCost} cinder${game.cinder < RAID.cinder.burnCost ? ", and you do not have enough" : ""}. Waiting lets it land as a rumour. No hero learns it until they buy it. ${seconds}s.` : hint}</p>
          {toast && <p className="mt-1 text-xs text-gold">{toast}</p>}
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-parchment/55">{TUTORIAL[Math.min(game.tutorialStep, TUTORIAL.length - 1)]}</p>
        </div>
      </div>
      <div className={`pointer-events-auto absolute right-2 top-36 z-20 w-[min(20rem,calc(100%-1rem))] lg:right-3 ${logOpen ? "block" : "hidden"}`}>
        <div className="hud-glass max-h-72 overflow-auto rounded-2xl p-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-display text-xl text-gold">Chronicle</div>
            <button className="min-h-11 px-2" onClick={() => setLogOpen(false)}>Close</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {["All", ...CHRONICLE].map((label) => (
              <button key={label} className={`min-h-11 rounded-full px-3 ${feed === label ? "bg-gold text-ink" : "bg-white/5"}`} onClick={() => setFeed(label)}>{label}</button>
            ))}
          </div>
          {game.ledger.filter((line) => feed === "All" || chronicleKind(line.text) === feed).slice(0, 8).map((line) => (
            <article key={line.id} className="mt-2 rounded-xl border border-gold/15 bg-ink/40 p-2">
              <p className="text-xs uppercase tracking-wider text-memory">{chronicleKind(line.text)} · day {line.day}</p>
              <p>{line.text}</p>
            </article>
          ))}
          {game.ledger.length === 0 && <p className="mt-2 text-parchment/70">The chronicle is empty.</p>}
        </div>
      </div>
      <div className="absolute bottom-[max(7.5rem,calc(env(safe-area-inset-bottom)+6.5rem))] left-0 right-0 flex justify-start gap-2 overflow-x-auto px-3 pb-1 sm:justify-center">
        {TRAP_IDS.map((id) => {
          const trap = TRAP_DEFINITIONS[id];
          const selected = game.selectedTrap === id;
          const short = game.gold < trap.cost;
          return (
            <button key={id} disabled={short} aria-pressed={selected} className={`hud-glass flex min-h-11 w-24 shrink-0 flex-col items-center gap-1 rounded-hud px-2 py-2 text-sm ${selected ? "ring-2 ring-gold" : ""}`} onClick={() => selected ? clearTrap() : armTrap(id)}>
              {trapIcons[id] ? <img src={trapIcons[id]} alt="" className="h-14 w-14 object-contain" /> : <span className="h-14 w-14 rounded-xl bg-white/5" />}
              <span className={selected ? "text-gold" : "text-parchment"}>{trap.name}</span>
              <span className="num text-[10px] text-gold">{short ? "Short" : `${trap.cost} gold`}</span>
            </button>
          );
        })}
        <button className={`hud-glass min-h-11 w-24 shrink-0 rounded-hud px-2 py-2 text-sm ${game.possessArmed ? "ring-2 ring-gold text-gold" : ""}`} disabled={game.day < RAID.possess.fromWave || game.gold < RAID.possess.cost} onClick={() => armPossess()}>
          Possess
          <span className="num mt-1 block text-[10px] text-gold">{game.day < RAID.possess.fromWave ? `Wave ${RAID.possess.fromWave}` : `${RAID.possess.cost} gold`}</span>
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-1 right-3 text-[10px] text-parchment/35">{game.fps.toFixed(0)} fps · p95 {(game.frameP95 ?? 0).toFixed(0)} ms · {game.drawCalls} draws · {game.triangles} tris · {game.textureCount ?? 0} tex · {game.rendererInfo || "renderer"}</p>
    </div>
  );
}

function GateMarket() {
  const game = useGame();
  const [slip, setSlip] = useState("");
  const merchants = [game.merchants.mira, game.merchants.orrin, game.merchants.tallow];
  const board = (["kara", "brann", "ivo"] as const).map((id) => evaluateHero(game, game.heroes[id]));
  const offer = offersOf(readRegistry()).find((entry) => entry.dungeonId === hallIdOf(game) && !entry.consumed && entry.status !== "EXPIRED_REFUNDED");
  const raider = board.filter((trace) => trace.accept).sort((a, b) => b.score - a.score)[0];
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-3" data-testid="contract-board">
      <div className="lg:col-span-3"><Button tone="ghost" onClick={() => setScreen("dungeon")}>Return to your dungeon</Button></div>
      <Panel className="lg:col-span-3">
        <h3 className="font-display text-2xl text-gold">Raid board</h3>
        <p className="text-sm text-parchment/70">A patron or the owner can fund 0.01 from the mock purse. Heroes decide on their own. A counter moves the split only. The price never changes. This is not a chain payment.</p>
        <p className="num mt-2 text-sm">Mock purse {(game.near ?? 0).toFixed(4)}. {offer ? `Offer ${offer.status}. Split ${Math.round(offer.split.owner * 100)}/${Math.round(offer.split.agents * 100)}/${Math.round(offer.split.guild * 100)}/${Math.round(offer.split.ops * 100)}.` : "No open offer."}</p>
        <ul className="mt-2 space-y-2 text-sm">
          {board.map((trace) => (
            <li key={trace.heroId}>
              <p>{trace.accept ? "Accepted" : "Refused"} · {trace.reason}</p>
              {(trace.counterShift ?? 0) > 0 && offer?.status === "OPEN" && (
                <Button tone="ghost" className="mt-1" onClick={() => void counterRaidOffer(trace.heroId).then((result) => setSlip(result.reason))}>Record {trace.heroId}'s counter</Button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">{raider ? `${raider.heroId} is willing.` : "No hero is willing. A raid cannot start."}</p>
        {slip && <p className="mt-2 text-sm text-gold">{slip}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void fundRaidOffer().then((result) => setSlip(result.reason))}>Fund offer</Button>
          {offer?.status === "COUNTER_PENDING" && <Button tone="ghost" onClick={() => void refuseRaidOffer().then((result) => setSlip(result.reason))}>Refuse counter</Button>}
          {offer && offer.status !== "SETTLED" && <Button tone="ghost" onClick={() => void acceptRaidOffer().then((result) => setSlip(result.reason))}>Accept offer</Button>}
          <Button tone="ghost" disabled={!offer || offer.status !== "SETTLED" || !raider} onClick={() => { const result = startRaid(); setSlip(result?.reason ?? "The raid started."); if (result?.ok) setScreen("dungeon"); }}>Send the willing hero</Button>
        </div>
      </Panel>
      {merchants.map((merchant) => {
        const status = merchantStatus(merchant);
        return (
        <Panel key={merchant.id}>
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p className="text-sm text-parchment/70">{merchant.role} · {merchant.gold.toFixed(0)} gold · {(merchant.near ?? 0).toFixed(4)} mock NEAR · {status}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {merchant.stock.map((line) => {
              const quote = quotePrice(line.itemId, line.qty);
              return (
                <li key={line.itemId} className="flex items-center justify-between gap-2">
                  <span title={quote.reason}>{goodsRule(line.itemId)?.name ?? line.itemId} · {line.qty} · {quote.price < 1 ? quote.price.toFixed(4) : quote.price.toFixed(2)}</span>
                  <button className="rounded border border-gold/40 px-2 py-1" title={quote.reason} onClick={() => { buyFromMerchant(merchant.id, line.itemId); sfx.coin(); }}>Buy</button>
                  <button className="rounded border border-white/20 px-2 py-1" onClick={() => note(quote.reason)}>Why</button>
                </li>
              );
            })}
            {merchant.rumours.map((rumour) => (
              <li key={rumour.id} className="flex items-center justify-between gap-2">
                <span>{rumour.text} · epoch {rumour.epoch ?? 1}</span>
                <button className="min-h-11 rounded border border-gold/40 px-2 py-1" onClick={() => buyBackRumour(rumour.id)}>Buy back</button>
              </li>
            ))}
          </ul>
        </Panel>
        );
      })}
      <article className="rounded border border-white/10 bg-panel2 p-4 lg:col-span-3">
        <h3 className="font-display text-gold">Why the price moved</h3>
        <p className="text-sm">{game.priceNote || "Prices follow stock against each merchant's target."}</p>
        {game.ledger.slice(0, 6).map((line) => <p key={line.id} className="text-sm">{line.text}</p>)}
      </article>
    </section>
  );
}

function Registry() {
  const game = useGame();
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-2">
      <div className="lg:col-span-2"><button className="min-h-11 rounded-2xl border border-gold/40 px-3 text-sm" onClick={() => setScreen("dungeon")}>Return to your dungeon</button></div>
      {(["kara", "brann", "ivo"] as const).map((id) => {
        const profile = HERO_PROFILES[id];
        const hero = game.heroes[id];
        return (
          <article key={id} className="rounded border border-white/10 bg-panel p-4">
            <h3 className="font-display text-2xl text-gold">{profile.name}</h3>
            <p>{profile.role}. {profile.personality}</p>
            <p className="text-sm">Gold {hero.gold}. Mock NEAR {(hero.near ?? profile.nearStart).toFixed(4)}. Health {hero.hp}/{hero.maxHp}. Gear {hero.equipment.join(", ") || "pack only"}.</p>
            <p className="mt-2 text-sm text-parchment/70">{hero.memory[0]}</p>
            {hero.facts.filter((fact) => !fact.burned).map((fact) => <p key={fact.id} className="text-sm">{fact.memory ?? "warned"} · {fact.source ?? "record"} · {fact.text}</p>)}
            <div className="mt-3 rounded-2xl border border-gold/20 p-3 text-sm">
              <p className="font-display text-gold">Verified</p>
              <p className="text-parchment/70">Each row is a simulated check. A mark here is not a live proof.</p>
              {["Agent response", "Gateway attestation", "Model evidence", "Spend policy", "Seed", "Execution pin", "Raid settlement", "Item ownership"].map((row) => (
                <p key={row}>✗ {row} — unverified on this device.</p>
              ))}
            </div>
          </article>
        );
      })}
      {([game.merchants.mira, game.merchants.orrin, game.merchants.tallow]).map((merchant) => (
        <article key={merchant.id} className="rounded border border-white/10 bg-panel2 p-4">
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p>{merchant.role}. Gold {merchant.gold.toFixed(0)}. Mock NEAR {(merchant.near ?? 0).toFixed(4)}. Sales {merchant.sales}. {merchantStatus(merchant)}.</p>
        </article>
      ))}
    </section>
  );
}

function Chronicle() {
  const game = useGame();
  const raid = game.raids[0];
  const rows = useMemo(() => raid?.events ?? [], [raid]);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [feed, setFeed] = useState("All");
  useEffect(() => {
    if (!playing || rows.length === 0) return;
    const timer = window.setInterval(() => {
      setCursor((value) => {
        if (value >= rows.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 800 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, rows.length]);
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Button tone="ghost" className="self-start" onClick={() => setScreen(game.raids.length ? "report" : "dungeon")}>Back to the raid</Button>
      <h2 className="font-display text-3xl text-gold">Replay</h2>
      <p className="text-sm text-parchment/75">Replayed from recorded inputs. Diary text and hero decisions are the ones already stored.</p>
      {raid && <p className="text-sm">Day {raid.day} · {raid.heroId}. Outcome {outcomeHash(rows)}. {raid.decision.reason}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</Button>
        {([1, 2, 4] as const).map((value) => (
          <Button key={value} tone={speed === value ? "gold" : "ghost"} onClick={() => setSpeed(value)}>{value}×</Button>
        ))}
      </div>
      <ol className="space-y-2">
        {rows.map((event, index) => (
          <li key={`${event.tick}-${index}`} className={`rounded-2xl border px-3 py-2 text-sm ${index === cursor ? "border-gold bg-panel" : "border-white/10"}`}>Tick {event.tick}. {event.text}</li>
        ))}
        {rows.length === 0 && <li className="text-parchment/70">No raid has been recorded.</li>}
      </ol>
      <div className="flex flex-wrap gap-1">
        {["All", ...CHRONICLE].map((label) => (
          <button key={label} className={`min-h-11 rounded-full px-3 text-sm ${feed === label ? "bg-gold text-ink" : "border border-gold/20"}`} onClick={() => setFeed(label)}>{label}</button>
        ))}
      </div>
      {game.ledger.filter((line) => feed === "All" || chronicleKind(line.text) === feed).slice(0, 12).map((line) => (
        <article key={line.id} className="rounded-2xl border border-gold/20 bg-panel/80 p-3 text-sm">
          <p className="text-xs uppercase tracking-wider text-memory">{chronicleKind(line.text)} · day {line.day}</p>
          <p>{line.text}</p>
        </article>
      ))}
    </section>
  );
}

function Settings() {
  const game = useGame();
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(false);
  return (
    <section className="mx-auto max-w-xl p-6">
      <Button tone="ghost" className="mb-4" onClick={() => setScreen("dungeon")}>Return to your dungeon</Button>
      <h2 className="font-display text-3xl text-gold">Settings</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={`min-h-11 rounded-2xl px-3 ${sound ? "bg-gold text-ink" : "border border-gold/30"}`} onClick={() => setSound((value) => !value)}>Sound {sound ? "on" : "off"}</button>
        <button className={`min-h-11 rounded-2xl px-3 ${music ? "bg-gold text-ink" : "border border-gold/30"}`} onClick={() => setMusic((value) => !value)}>Music {music ? "on" : "off"}</button>
        <button className={`min-h-11 rounded-2xl px-3 ${game.reduceMotion ? "border border-gold/30" : "bg-gold text-ink"}`} onClick={() => setReduceMotion(!game.reduceMotion)}>Motion {game.reduceMotion ? "reduced" : "on"}</button>
      </div>
      <div className="mt-4 flex gap-2">
        {(["low", "medium", "high"] as const).map((quality) => (
          <button key={quality} className={`rounded px-3 py-1 ${game.quality === quality ? "bg-gold text-ink" : "border border-white/20"}`} onClick={() => setQuality(quality)}>{quality}</button>
        ))}
      </div>
      <p className="mt-3 text-sm text-parchment/70">Low drops shadows. The fps counter in the dungeon is a measurement from this machine.</p>
      <button className="mt-6 rounded border border-blood px-3 py-1 text-blood" onClick={() => newGame()}>New game (clears this browser save)</button>
      <button className="mt-3 block rounded border border-gold/40 px-3 py-2 text-sm" onClick={() => setScreen("sandbox")}>Mock chain</button>
      <button className="mt-3 block rounded border border-white/20 px-3 py-2 text-sm" onClick={() => setScreen("gallery")}>Model shelf</button>
      <button className="mt-3 block rounded border border-white/20 px-3 py-2 text-sm" onClick={() => setScreen("registry")}>Hero directory</button>
      <p className="mt-2 text-xs text-parchment/50">Mock chain is a local ledger. It does not move real funds.</p>
    </section>
  );
}

interface CatalogAsset {
  filename: string;
  publicPath: string;
  sourcePack: string;
  category: string;
  triangles: number;
  meshes: number;
  materials: number;
  animations: string[];
  skins: string[];
  bytes: number;
  bounds: { size: number[] } | null;
}

function Gallery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<ReturnType<typeof mountGallery> | null>(null);
  const [assets, setAssets] = useState<CatalogAsset[]>([]);
  const [category, setCategory] = useState("characters");
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<CatalogAsset | null>(null);
  const [clips, setClips] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/catalog.json").then((response) => response.json()).then((payload: { assets: CatalogAsset[] }) => setAssets(payload.assets)).catch((reason: unknown) => setError(String(reason)));
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    view.current = mountGallery(canvas);
    return () => view.current?.dispose();
  }, []);
  const categories = useMemo(() => ["characters", "monsters", "dungeon", "weapons", "items", "skeleton-props", "animations"], []);
  const visible = assets.filter((asset) => asset.category === category && asset.filename.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="grid h-full min-h-0 lg:grid-cols-[320px_1fr_280px]">
      <div className="overflow-auto border-r border-white/10 p-3">
        <div className="flex flex-wrap gap-1">
          {categories.map((entry) => <button key={entry} className={`rounded px-2 py-1 text-xs ${category === entry ? "bg-gold text-ink" : "border border-white/15"}`} onClick={() => setCategory(entry)}>{entry}</button>)}
        </div>
        <input className="mt-3 w-full bg-black/40 px-2 py-1 text-sm" placeholder="Filter filename" value={query} onChange={(event) => setQuery(event.target.value)} />
        <ul className="mt-3 space-y-1">
          {visible.map((asset) => (
            <li key={asset.publicPath}>
              <button className="w-full truncate text-left text-sm hover:text-gold" onClick={() => { setCurrent(asset); setError(""); view.current?.show(asset.publicPath).then(setClips).catch((reason: unknown) => setError(String(reason))); }}>{asset.filename}</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative min-h-[480px]">
        <canvas ref={canvasRef} className="view h-full w-full" />
        <div className="absolute left-3 top-3 flex gap-1">
          {(["front", "side", "back", "three-quarter"] as const).map((viewName) => (
            <button key={viewName} className="hud-glass rounded-full px-2 py-1 text-[11px] uppercase tracking-wider" onClick={() => view.current?.setView(viewName)}>{viewName}</button>
          ))}
        </div>
        {error && <p className="absolute bottom-3 left-3 text-sm text-blood">{error}</p>}
      </div>
      <aside className="overflow-auto border-l border-white/10 p-3 text-sm">
        {current ? (
          <>
            <div className="font-display text-xl text-gold">{current.filename}</div>
            <p>Pack: {current.sourcePack}</p>
            <p>Triangles: {current.triangles}</p>
            <p>Meshes: {current.meshes} · Materials: {current.materials}</p>
            <p>Skins: {current.skins.join(", ") || "none"}</p>
            {current.bounds && <p>Size: {current.bounds.size.map((value) => value.toFixed(2)).join(" × ")}</p>}
            <div className="mt-3 flex flex-col gap-1">
              {clips.map((clip) => <button key={clip} className="text-left text-gold/90" onClick={() => view.current?.play(clip)}>{clip}</button>)}
            </div>
          </>
        ) : <p>Choose a model. Drag to rotate, wheel to zoom.</p>}
      </aside>
    </section>
  );
}
