import { useEffect, useMemo, useRef, useState } from "react";
import { goodsRule } from "../game/config/economyRules";
import { RULES } from "../game/config/gameRules";
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
  toggleGate,
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
  `The way to the vault bends through gates. Choose Spike and click tile ${RULES.spikeTutorialCell.ix}, ${RULES.spikeTutorialCell.iz}.`,
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
      {game.screen !== "menu" && game.screen !== "dungeon" && game.screen !== "home" && <Shell screen={game.screen} />}
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
  const [hint, setHint] = useState("Choose a trap. It follows the cursor until you click a tile.");
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
  const [walking, setWalking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState<1 | 2>(1);
  const [gearOpen, setGearOpen] = useState(false);
  const paceRef = useRef({ paused: false, rate: 1 as 1 | 2 });
  paceRef.current = { paused, rate };
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
      onRoomGate: (id) => {
        const result = toggleGate(id);
        setToast(result.reason);
        return result.locked;
      },
      getClosedGates: () => hooks.current.closedGateIds ?? [],
      getPace: () => (paceRef.current.paused ? 0 : paceRef.current.rate),
    });
    bindDungeon(mounted);
    let live = true;
    void mounted.ready.then(async () => {
      const current = hooks.current;
      if (!live || !current.pending || (current.phase !== "raid" && current.phase !== "report")) return;
      setWalking(true);
      try {
        await mounted.playRoute(toSteps(current.pending));
      } finally {
        if (live) setWalking(false);
      }
    });
    return () => {
      live = false;
      mounted.dispose();
    };
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
  const tier = dungeonTier(game.raidsCleared ?? 0);
  const vaultPct = Math.max(0, Math.min(100, (game.vault / RAID.vaultStart) * 100));
  const bleed = game.phase === "raid" ? RAID.bleedPerHeroPerSec : 0;
  const possessLocked = game.day < RAID.possess.fromWave;

  return (
    <div className={`relative h-full min-h-[640px] ${game.reduceMotion ? "motion-reduce" : ""}`}>
      <canvas ref={canvasRef} className="view absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[min(28rem,calc(100%-18rem))] flex-col gap-2">
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-full bg-[#120e0c]/92 py-1 pl-1 pr-4 ring-1 ring-gold/40">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-ink" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="7.5" /><path d="M12 8v8M9.2 9.6c.7-.9 4.9-.9 5.6 0 .7.9-.2 1.8-2.8 2s-3.5 1.1-2.8 2 .7 1.8 2.8 1.8 2.1-.8 2.8-1.7" /></svg>
            </span>
            <div className="leading-none">
              <Num className={`block text-lg text-gold ${vaultPulse ? "vault-tick" : ""}`}>{Math.round(game.gold)}</Num>
              <span className={`text-[11px] ${bleed > 0 ? "text-blood" : "text-parchment/60"}`}>{bleed > 0 ? `−${bleed}/s` : "−0/s"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#120e0c]/92 py-1 pl-1 pr-4 ring-1 ring-amber-700/50">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ember text-ink" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 3s5 4.2 5 9a5 5 0 1 1-10 0c0-2.2 1.2-4 2.4-5.2C10 8.2 11 10 12 10c0-2.6.6-4.8 0-7z" /></svg>
            </span>
            <div className="leading-none">
              <Num className="block text-lg text-parchment">{game.day}</Num>
              <span className="text-[11px] text-parchment/70">Wave</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#120e0c]/92 py-1 pl-1 pr-4 ring-1 ring-blood/60" aria-label={`${game.cinder} of ${RAID.cinder.cap} cinder`}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blood text-parchment" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2 20 12 12 22 4 12 12 2z" /></svg>
            </span>
            <div className="leading-none">
              <Num className="block text-lg text-parchment">{game.cinder}</Num>
              <span className="text-[11px] text-parchment/70">Cinder</span>
            </div>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-1.5">
          {(["kara", "brann", "ivo"] as const).map((id) => {
            const body = game.heroes[id];
            const profile = HERO_PROFILES[id];
            const open = openHero === id;
            return (
              <button key={id} className={`min-h-9 rounded-full px-3 text-xs ${open ? "bg-gold text-ink" : "bg-[#120e0c]/80 text-parchment ring-1 ring-gold/25"}`} aria-pressed={open} onClick={() => setOpenHero(open ? null : id)}>
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
        <p className="pointer-events-none max-w-md text-xs text-parchment/80">
          {game.pageResult === "decision"
            ? `The page is in the air. Burn costs ${RAID.cinder.burnCost} cinder${game.cinder < RAID.cinder.burnCost ? ", and you do not have enough" : ""}. Waiting lets it land as a rumour. ${seconds}s.`
            : hint}
        </p>
        {toast && <p className="pointer-events-none max-w-md text-xs text-gold">{toast}</p>}
        <p className="pointer-events-none text-[10px] uppercase tracking-[0.14em] text-parchment/45">{TUTORIAL[Math.min(game.tutorialStep, TUTORIAL.length - 1)]}</p>
      </div>
      <div className="pointer-events-auto absolute right-3 top-3 z-20 flex gap-1 rounded-2xl bg-[#120e0c]/92 p-1.5 ring-1 ring-gold/30">
        {TRAP_IDS.map((id) => {
          const trap = TRAP_DEFINITIONS[id];
          const selected = game.selectedTrap === id;
          const short = game.gold < trap.cost;
          return (
            <button key={id} disabled={short} aria-pressed={selected} className={`flex w-[4.5rem] flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center ${selected ? "bg-gold/15 ring-2 ring-gold" : "hover:bg-white/5"} disabled:opacity-40`} onClick={() => selected ? clearTrap() : armTrap(id)}>
              {trapIcons[id] ? <img src={trapIcons[id]} alt="" className="h-11 w-11 object-contain" /> : <span className="h-11 w-11 rounded-lg bg-white/5" />}
              <span className={`font-display text-xs ${selected ? "text-gold" : "text-parchment"}`}>{trap.name}</span>
              <span className="num text-[10px] text-gold">{short ? "Short" : `${trap.cost} gold`}</span>
            </button>
          );
        })}
        <button className={`flex w-[4.5rem] flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center ${game.possessArmed ? "bg-gold/15 ring-2 ring-gold" : "hover:bg-white/5"} disabled:opacity-40`} disabled={possessLocked || game.gold < RAID.possess.cost} onClick={() => armPossess()}>
          <span className="grid h-11 w-11 place-items-center text-gold" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 11V7a2 2 0 1 1 4 0v4" /><path d="M12 11V5a2 2 0 1 1 4 0v8" /><path d="M16 10V8a2 2 0 1 1 4 0v6c0 4-3 7-8 7s-8-3-8-7v-3a2 2 0 1 1 4 0" /></svg>
          </span>
          <span className="font-display text-xs text-parchment">Possess</span>
          <span className="num text-[10px] text-gold">{possessLocked ? `Wave ${RAID.possess.fromWave}` : `${RAID.possess.cost} gold`}</span>
        </button>
      </div>
      {game.phase === "report" && report && !walking && (
        <Receipt className="pointer-events-auto absolute left-3 top-44 z-20 max-w-sm text-sm">
          <div className="font-display text-lg">Raid results</div>
          <p>{report.survived ? `${hero.name} survived.` : `${hero.name} died.`}</p>
          <p>Traps sprung <span className="num">{report.trapsTriggered.length}</span>. Chain ×<span className="num">{game.chain ?? 0}</span>.</p>
          <p>Pages {game.pageResult === "burned" ? "burned" : game.pageResult === "escaped" ? "landed" : "still in the air"}: <span className="num">{report.facts.length}</span>. A landed page is sold. It does not teach a hero.</p>
          <p>Salvage: iron <span className="num">{game.inventory.iron ?? 0}</span>, ash <span className="num">{game.inventory.ash ?? 0}</span>, bone <span className="num">{game.inventory.bone ?? 0}</span>.</p>
          <p>Tier <span className="num">{tier}</span>.</p>
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
      <div className={`pointer-events-auto absolute right-3 top-36 z-20 w-[min(20rem,calc(100%-1rem))] ${logOpen ? "block" : "hidden"}`}>
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
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex w-56 flex-col gap-2">
        <div className="rounded-2xl bg-[#120e0c]/92 px-3 py-2 ring-1 ring-gold/35">
          <p className="text-[11px] uppercase tracking-[0.16em] text-parchment/65">Dungeon Tier</p>
          <p className="font-display text-3xl leading-none text-gold">{tier}</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/60" aria-hidden="true">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-900 to-gold" style={{ width: `${(tier / 4) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-2xl bg-[#120e0c]/92 px-3 py-2 ring-1 ring-gold/35">
          <div className="flex items-center gap-2">
            <span className="text-gold" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6l-7-3z" /></svg>
            </span>
            <p className="text-[11px] uppercase tracking-[0.16em] text-parchment/65">Vault Health</p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/60" aria-label={`Vault ${game.vault} of ${RAID.vaultStart}`} role="meter" aria-valuenow={game.vault} aria-valuemin={0} aria-valuemax={RAID.vaultStart}>
            <div className={`h-full rounded-full ${lowVault ? "bg-blood" : "bg-gradient-to-r from-amber-700 to-gold"}`} style={{ width: `${vaultPct}%` }} />
          </div>
        </div>
      </div>
      <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex items-end gap-2">
        <button type="button" aria-label={paused ? "Resume" : "Pause"} aria-pressed={paused} className={`grid h-12 w-12 place-items-center rounded-full bg-[#120e0c]/92 text-gold ring-1 ring-gold/50 ${paused ? "ring-2" : ""}`} onClick={() => setPaused((value) => !value)}>
          {paused ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M9 7v10l8-5-8-5z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M8 6h3v12H8V6zm5 0h3v12h-3V6z" /></svg>
          )}
        </button>
        <button type="button" aria-label="Double speed" aria-pressed={rate === 2} className={`grid h-12 w-12 place-items-center rounded-full bg-[#120e0c]/92 font-display text-sm text-gold ring-1 ring-gold/50 ${rate === 2 ? "ring-2 bg-gold text-ink" : ""}`} onClick={() => setRate((value) => value === 2 ? 1 : 2)}>2x</button>
        <div className="relative">
          <button type="button" aria-label="Settings" aria-expanded={gearOpen} className="grid h-12 w-12 place-items-center rounded-full bg-[#120e0c]/92 text-gold ring-1 ring-gold/50" onClick={() => setGearOpen((value) => !value)}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /><path d="M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4M7.7 16.3l-1.4 1.4" /></svg>
          </button>
          {gearOpen && (
            <div className="absolute bottom-14 right-0 w-48 rounded-2xl border border-gold/30 bg-[#120e0c] p-2 shadow-panel" role="menu">
              {([
                ["settings", "Settings"],
                ["market", "Market"],
                ["workshop", "Workshop"],
                ["map", "World map"],
                ["gate", "Contract board"],
                ["registry", "Hero records"],
              ] as const).map(([id, label]) => (
                <button key={id} className="block min-h-11 w-full rounded-xl px-3 text-left text-sm text-parchment hover:bg-white/5 hover:text-gold" role="menuitem" onClick={() => { setGearOpen(false); setScreen(id); }}>{label}</button>
              ))}
              <button className="block min-h-11 w-full rounded-xl px-3 text-left text-sm text-parchment hover:bg-white/5 hover:text-gold" role="menuitem" onClick={() => { setGearOpen(false); setLogOpen(true); }}>Chronicle</button>
            </div>
          )}
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 text-[10px] text-parchment/30">{game.fps.toFixed(0)} fps · p95 {(game.frameP95 ?? 0).toFixed(0)} ms · {game.drawCalls} draws · {game.triangles} tris · {game.textureCount ?? 0} tex · {game.rendererInfo || "renderer"}</p>
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
