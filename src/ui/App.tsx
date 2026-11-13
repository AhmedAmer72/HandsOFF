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
  publishRaid,
  supplyOnChain,
  buyBackOnChain,
  buyStallOnChain,
  craftOnChain,
  buyUpgrade,
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
  setShowStats,
  setScreen,
  setStats,
  startRaid,
  toggleGate,
  toSteps,
  useGame,
} from "../game/store";
import { outcomeHash } from "../game/engine/raid";
import { mountDungeon } from "../three/dungeon";
import { mountGallery } from "../three/gallery";
import { MainMenu } from "./screens/MainMenu";
import { MockSandbox } from "./screens/MockSandbox";
import { DeedScreen, GuildScreen, ReportScreen, TakeHomeScreen, WeekScreen } from "./screens/PlayScreens";
import { MarketHall, WorkshopHall } from "./stalls/StallHalls";
import { SpectatorScreen, WorldMap } from "./world/WorldScreens";
import { Shell } from "./shell";
import { Channel, HeroPip, Notice } from "./forge/controls";
import { ForgedFrame } from "./forge/frame";
import { CircularGameButton, CinderPips, CornerOrnament, Divider, GameIcon, ItemSlot, ProgressTrack, ResourcePanel, TrapCard, WaxSealMark } from "./pack/components";
import { HERO_ICON, TRAP_ICON, ui } from "./pack/urls";
import { Button, CHRONICLE, chronicleKind, Panel, Receipt } from "./kit";

const TUTORIAL = [
  `The way to the vault bends through gates. Choose Spike and click tile ${RULES.spikeTutorialCell.ix}, ${RULES.spikeTutorialCell.iz}.`,
  "Press Begin the raid. The hero walks in from the south gate.",
  "Click the flying page to burn it, or let the moment pass.",
  "Orrin keeps a landed page. Buy it back at his stall in the Market.",
  "Press Begin the raid again. A hero who bought the rumour walks around the spike.",
  "Supply iron or buy a phial from the stalls in the Market.",
  "Chapter 7. The vault brace is in the workshop. After that, the next day is yours.",
];

export function App() {
  const game = useGame();
  return (
    <div className={`flex h-full min-h-screen bg-ink font-body text-parchment ${game.reduceMotion ? "motion-reduce" : ""}`}>
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
  const [toast, setToast] = useState("");
  const [walking, setWalking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState<1 | 2>(1);
  const [gearOpen, setGearOpen] = useState(false);
  const [raidNote, setRaidNote] = useState("");
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
        if (id === "mira") void supplyOnChain(5).then((result) => setToast(result.reason));
        else if (id === "orrin") {
          const rumour = hooks.current.merchants.orrin.rumours[0];
          void buyBackOnChain(rumour?.id ?? "rumour:ashgate:1:page").then((result) => setToast(result.reason));
        } else void buyStallOnChain("tallow", "nb:gear:potion").then((result) => setToast(result.reason));
      },
      onCraft: () => void craftOnChain("spike").then((result) => setToast(result.reason)),
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
    <div className={`relative h-full w-full overflow-hidden ${game.reduceMotion ? "motion-reduce" : ""}`}>
      <canvas ref={canvasRef} className="view absolute inset-0 h-full w-full" />
      <div className="hud-stack pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-10.5rem)] flex-col gap-2 sm:max-w-[min(28rem,calc(100%-18rem))]">
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <ResourcePanel icon={ui.icon.coin} value={Math.round(game.gold)} label={bleed > 0 ? `−${bleed}/s` : "−0/s"} labelHot={bleed > 0} pulse={Boolean(vaultPulse)} />
          <ResourcePanel icon={ui.icon.wave} value={game.day} label="Wave" />
          <ResourcePanel icon={ui.icon.cinder} value={game.cinder} label="Cinder" labelFor={`${game.cinder} of ${RAID.cinder.cap} cinder`}>
            <CinderPips value={game.cinder} cap={RAID.cinder.cap} />
          </ResourcePanel>
        </div>
        <div className="hud-heroes pointer-events-auto flex flex-wrap gap-1.5">
          {(["kara", "brann", "ivo"] as const).map((id) => {
            const body = game.heroes[id];
            const profile = HERO_PROFILES[id];
            return (
              <HeroPip key={id} name={profile.name} hp={body.hp} max={body.maxHp} pressed={openHero === id} onClick={() => setOpenHero(openHero === id ? null : id)} icon={<GameIcon src={HERO_ICON[id]} />} />
            );
          })}
        </div>
        {picked && pickedProfile && openHero && (
          <ForgedFrame variant="hero" className="pointer-events-auto max-w-sm text-sm">
            <div className="flex items-center gap-2">
              <GameIcon src={HERO_ICON[openHero]} />
              <p className="font-display text-xl text-gold">{pickedProfile.name} · {pickedProfile.role}</p>
            </div>
            <p>HP <span className="num">{picked.hp}/{picked.maxHp}</span> · Purse <span className="num">{picked.gold}</span></p>
            <div className="mt-2 flex items-center gap-2">
              <ItemSlot><GameIcon src={ui.icon.helmet} /></ItemSlot>
              <p className="text-parchment/75">Gear {picked.equipment.join(", ") || "pack only"}</p>
            </div>
            <div className="mt-2">
              <ProgressTrack track="health" pct={Math.max(0, (picked.hp / picked.maxHp) * 100)} label={`Health ${picked.hp} of ${picked.maxHp}`} now={picked.hp} max={picked.maxHp} />
            </div>
            {pickedFacts[0] ? <p className="mt-1 text-memory">{pickedFacts[0].memory ?? "warned"} · {pickedFacts[0].source ?? "record"}</p> : <p className="mt-1 text-parchment/70">No trap memory yet</p>}
            <p className="mt-1 text-parchment/80">{picked.memory[0]}</p>
            {pickedFacts.slice(0, 3).map((fact) => <p key={fact.id}>{fact.text}</p>)}
            <Button tone="ghost" className="mt-2" onClick={() => setScreen("registry")}>Hero record</Button>
          </ForgedFrame>
        )}
        <div className="hud-hint">
          <Notice>
            {game.pageResult === "decision"
              ? `The page is in the air. Burn costs ${RAID.cinder.burnCost} cinder${game.cinder < RAID.cinder.burnCost ? ", and you do not have enough" : ""}. Waiting lets it land as a rumour. ${seconds}s.`
              : hint}
          </Notice>
        </div>
        {game.phase === "prep" && !walking && (
          <ForgedFrame variant="tooltip" className="gate-dock pointer-events-auto max-w-xs">
            <p className="font-display text-lg text-gold">South gate</p>
            <p className="gate-blurb text-sm text-parchment/80">The hero starts beside the banners and walks the corridor.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button onClick={() => {
                const result = startRaid();
                setRaidNote(result.ok ? "The hero is walking. Testnet settlement follows." : result.reason);
                if (!result.ok) return;
                sfx.ui();
                void publishRaid().then((published) => setRaidNote(published.reason));
              }}>Begin the raid</Button>
            </div>
            {raidNote && (
              <>
                <p className="mt-2 text-sm text-gold">{raidNote}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button tone="ghost" onClick={() => void fundRaidOffer().then((result) => setRaidNote(result.reason))}>Fund offer</Button>
                  <Button tone="ghost" onClick={() => void acceptRaidOffer().then((result) => setRaidNote(result.reason))}>Accept offer</Button>
                </div>
              </>
            )}
          </ForgedFrame>
        )}
        {toast && <div className="hud-toast"><Notice tone="gold">{toast}</Notice></div>}
        <p className="hud-tutorial pointer-events-none max-w-[12.5rem] text-[10px] uppercase tracking-[0.14em] text-parchment/75">{TUTORIAL[Math.min(game.tutorialStep, TUTORIAL.length - 1)]}</p>
      </div>
      <div className="trap-bar pointer-events-auto absolute right-3 top-3 z-20 flex w-[9.4rem] flex-wrap justify-end gap-1 sm:w-auto sm:max-w-[calc(100%-20rem)]">
        {TRAP_IDS.map((id) => {
          const trap = TRAP_DEFINITIONS[id];
          const selected = game.selectedTrap === id;
          const short = game.gold < trap.cost;
          return (
            <TrapCard
              key={id}
              selected={selected}
              disabled={short}
              name={trap.name}
              cost={short ? "Short" : `${trap.cost} gold`}
              icon={TRAP_ICON[id]}
              onClick={() => selected ? clearTrap() : armTrap(id)}
            />
          );
        })}
        <TrapCard
          selected={game.possessArmed}
          disabled={possessLocked || game.gold < RAID.possess.cost}
          name="Possess"
          cost={possessLocked ? `Wave ${RAID.possess.fromWave}` : `${RAID.possess.cost} gold`}
          icon={ui.icon.possess}
          onClick={() => armPossess()}
        />
      </div>
      {game.phase === "report" && report && !walking && (
        <Receipt className="pointer-events-auto absolute left-3 top-44 z-20 max-w-sm text-sm">
          <CornerOrnament />
          <div className="font-display text-lg">Raid results</div>
          <Divider />
          <p>{report.survived ? `${hero.name} survived.` : `${hero.name} died.`}</p>
          <p>Traps sprung <span className="num">{report.trapsTriggered.length}</span>. Chain ×<span className="num">{game.chain ?? 0}</span>.</p>
          <p>Pages {game.pageResult === "burned" ? "burned" : game.pageResult === "escaped" ? "landed" : "still in the air"}: <span className="num">{report.facts.length}</span>. A landed page is sold. It does not teach a hero.</p>
          <p>Salvage: iron <span className="num">{game.inventory.iron ?? 0}</span>, ash <span className="num">{game.inventory.ash ?? 0}</span>, bone <span className="num">{game.inventory.bone ?? 0}</span>.</p>
          <p>Tier <span className="num">{tier}</span>.</p>
          {game.dungeonClosed && <p className="text-blood">The vault is empty. The next wave restocks it.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => nextDay()}>{game.dungeonClosed ? "Restock and continue" : "Continue"}</Button>
            <Button tone="ghost" onClick={() => setScreen("report")}>Full report</Button>
            <Button tone="ghost" onClick={() => setScreen("market")}>Market</Button>
            <Button tone="ghost" onClick={() => setScreen("workshop")}>Workshop</Button>
            <Button tone="ghost" onClick={() => setScreen("chronicle")}>Watch replay</Button>
          </div>
        </Receipt>
      )}
      <div className={`pointer-events-auto absolute right-3 top-36 z-20 w-[min(20rem,calc(100%-1rem))] ${logOpen ? "block" : "hidden"}`}>
        <ForgedFrame className="max-h-72 overflow-auto text-sm" pad={false}>
          <div className="forged-body">
          <div className="flex items-center justify-between">
            <div className="font-display text-xl text-gold">Chronicle</div>
            <button className="ur-tab" onClick={() => setLogOpen(false)}><GameIcon src={ui.icon.close} /> Close</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {["All", ...CHRONICLE].map((label) => (
              <button key={label} className={`ur-tab ${feed === label ? "is-on" : ""}`} onClick={() => setFeed(label)}>{label}</button>
            ))}
          </div>
          {game.ledger.filter((line) => feed === "All" || chronicleKind(line.text) === feed).slice(0, 8).map((line) => (
            <article key={line.id} className="event-plate mt-2">
              <p className="text-xs uppercase tracking-wider text-memory">{chronicleKind(line.text)} · day {line.day}</p>
              <p>{line.text}</p>
            </article>
          ))}
          {game.ledger.length === 0 && <p className="mt-2 text-parchment/70">The chronicle is empty.</p>}
          </div>
        </ForgedFrame>
      </div>
      <div className="hud-meters pointer-events-none absolute bottom-24 left-3 z-20 flex w-[calc(100%-1.5rem)] max-w-xs flex-col gap-2 sm:bottom-4 sm:left-4 sm:w-[min(16rem,calc(100%-12rem))]">
        <Channel kicker="Dungeon Tier" value={tier} pct={(tier / 4) * 100} mark={<GameIcon src={ui.icon.shield} />} />
        <Channel
          kicker="Vault Health"
          pct={vaultPct}
          hot={lowVault}
          mark={<GameIcon src={ui.icon.vault} />}
          meter={{ now: game.vault, max: RAID.vaultStart, label: `Vault ${game.vault} of ${RAID.vaultStart}` }}
        />
      </div>
      <div className="hud-controls pointer-events-auto absolute bottom-4 right-4 z-20 flex items-end gap-2">
        <CircularGameButton aria-label={paused ? "Resume" : "Pause"} aria-pressed={paused} pressed={paused} onClick={() => setPaused((value) => !value)}>
          <GameIcon src={paused ? ui.icon.play : ui.icon.pause} />
        </CircularGameButton>
        <CircularGameButton aria-label="Double speed" aria-pressed={rate === 2} pressed={rate === 2} onClick={() => setRate((value) => value === 2 ? 1 : 2)}>2×</CircularGameButton>
        <div className="relative">
          <CircularGameButton aria-label="Settings" aria-expanded={gearOpen} pressed={gearOpen} onClick={() => setGearOpen((value) => !value)}>
            <GameIcon src={ui.icon.settings} />
          </CircularGameButton>
          {gearOpen && (
            <div className="plate-menu bottom-14 right-0" role="menu">
              {([
                ["settings", "Settings"],
                ["market", "Market"],
                ["workshop", "Workshop"],
                ["map", "World map"],
                ["gate", "Contract board"],
                ["registry", "Hero records"],
              ] as const).map(([id, label]) => (
                <button key={id} role="menuitem" onClick={() => { setGearOpen(false); setScreen(id); }}>{label}</button>
              ))}
              <button role="menuitem" onClick={() => { setGearOpen(false); setLogOpen(true); }}>Chronicle</button>
            </div>
          )}
        </div>
      </div>
      {game.showStats && (
        <p className="pointer-events-none absolute bottom-1 left-1/2 z-10 -translate-x-1/2 text-[10px] text-parchment/30">{game.fps.toFixed(0)} fps · p95 {(game.frameP95 ?? 0).toFixed(0)} ms · {game.drawCalls} draws · {game.triangles} tris · {game.textureCount ?? 0} tex · {game.rendererInfo || "renderer"}</p>
      )}
    </div>
  );
}

function GateMarket() {
  const game = useGame();
  const [slip, setSlip] = useState("");
  const merchants = [game.merchants.mira, game.merchants.orrin, game.merchants.tallow];
  const board = (["kara", "brann", "ivo"] as const).map((id) => evaluateHero(game, game.heroes[id]));
  const raider = board.filter((trace) => trace.accept).sort((a, b) => b.score - a.score)[0];
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-3" data-testid="contract-board">
      <div className="lg:col-span-3"><Button tone="ghost" onClick={() => setScreen("dungeon")}>Return to your dungeon</Button></div>
      <Panel variant="ledger" className="lg:col-span-3">
        <div className="ledger-head">
          <div>
        <h3 className="font-display text-2xl text-gold">Raid board</h3>
        <Divider />
        <p className="text-sm text-ink/80">Funding attaches 0.01 NEAR on game.neocrafts.testnet. The price stays fixed. A counter only moves the split. The raid itself attaches no deposit.</p>
          </div>
          {game.chainHero && <WaxSealMark />}
        </div>
        <p className="num mt-2 text-sm">Keeper neocrafts.testnet. {game.chainOfferId ? `Offer ${game.chainOfferId}${game.chainHero ? ` · ${game.chainHero}` : " · waiting for a hero"}.` : "No testnet offer yet."}</p>
        <ul className="mt-2 space-y-2 text-sm">
          {board.map((trace) => (
            <li key={trace.heroId}>
              <p>{trace.accept ? "Accepted" : "Refused"} · {trace.reason}</p>
              {(trace.counterShift ?? 0) > 0 && Boolean(game.chainOfferId) && !game.chainHero && (
                <Button tone="ghost" className="mt-1" onClick={() => void counterRaidOffer(trace.heroId).then((result) => setSlip(result.reason))}>Record {trace.heroId}'s counter</Button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">{raider ? `${raider.heroId} is willing.` : "No hero is willing. A raid cannot start."}</p>
        {slip && <p className="mt-2 text-sm text-gold">{slip}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void fundRaidOffer().then((result) => setSlip(result.reason))}>Fund offer</Button>
          {game.chainOfferId && !game.chainHero && <Button tone="ghost" onClick={() => void acceptRaidOffer().then((result) => setSlip(result.reason))}>Accept offer</Button>}
          <Button tone="ghost" disabled={!game.chainHero || !raider} onClick={() => { const result = startRaid(); setSlip(result?.reason ?? "The raid started."); if (result?.ok) { setScreen("dungeon"); void publishRaid().then((published) => setSlip(published.reason)); } }}>Send the willing hero</Button>
        </div>
      </Panel>
      {merchants.map((merchant) => {
        const status = merchantStatus(merchant);
        return (
        <Panel key={merchant.id} variant="tall">
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p className="text-sm text-parchment/70">{merchant.role} · hall gold {merchant.gold.toFixed(0)} · {status}. Chain balances load on the charter and guild screens.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {merchant.stock.map((line) => {
              const quote = quotePrice(line.itemId, line.qty);
              return (
                <li key={line.itemId} className="flex items-center justify-between gap-2">
                  <span title={quote.reason}>{goodsRule(line.itemId)?.name ?? line.itemId} · {line.qty} · {quote.price < 1 ? quote.price.toFixed(4) : quote.price.toFixed(2)}</span>
                  <Button title={quote.reason} onClick={() => { void buyStallOnChain(merchant.id, line.itemId).then((result) => { setSlip(result.reason); if (result.ok) sfx.coin(); }); }}>Buy</Button>
                  <Button tone="ghost" onClick={() => note(quote.reason)}>Why</Button>
                </li>
              );
            })}
            {merchant.rumours.map((rumour) => (
              <li key={rumour.id} className="flex items-center justify-between gap-2">
                <span>{rumour.text} · epoch {rumour.epoch ?? 1}</span>
                <Button onClick={() => void buyBackOnChain(rumour.id).then((result) => setSlip(result.reason))}>Buy back</Button>
              </li>
            ))}
          </ul>
        </Panel>
        );
      })}
      <Panel className="lg:col-span-3">
        <h3 className="font-display text-gold">Why the price moved</h3>
        <p className="text-sm">{game.priceNote || "Prices follow stock against each merchant's target."}</p>
        {game.ledger.slice(0, 6).map((line) => <p key={line.id} className="text-sm">{line.text}</p>)}
      </Panel>
    </section>
  );
}

function Registry() {
  const game = useGame();
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-2">
      <div className="lg:col-span-2"><Button tone="ghost" onClick={() => setScreen("dungeon")}>Return to your dungeon</Button></div>
      {(["kara", "brann", "ivo"] as const).map((id) => {
        const profile = HERO_PROFILES[id];
        const hero = game.heroes[id];
        return (
          <Panel key={id} variant="hero">
            <div className="flex items-center gap-2">
              <GameIcon src={HERO_ICON[id]} />
              <h3 className="font-display text-2xl text-gold">{profile.name}</h3>
            </div>
            <p>{profile.role}. {profile.personality}</p>
            <p className="text-sm">Gold {hero.gold}. Health {hero.hp}/{hero.maxHp}. Gear {hero.equipment.join(", ") || "pack only"}.</p>
            <p className="mt-2 text-sm text-parchment/70">{hero.memory[0]}</p>
            {hero.facts.filter((fact) => !fact.burned).map((fact) => <p key={fact.id} className="text-sm">{fact.memory ?? "warned"} · {fact.source ?? "record"} · {fact.text}</p>)}
            <div className="mt-3 border border-bronze/40 p-3 text-sm">
              <p className="font-display text-gold">On chain</p>
              <p className="text-parchment/70">Agent ledgers live in game.neocrafts.testnet. NEAR AI verification is disabled until a verifier key is pinned, so diary pages are not minted.</p>
            </div>
          </Panel>
        );
      })}
      {([game.merchants.mira, game.merchants.orrin, game.merchants.tallow]).map((merchant) => (
        <Panel key={merchant.id} variant="tablet">
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p>{merchant.role}. Hall gold {merchant.gold.toFixed(0)}. Sales {merchant.sales}. {merchantStatus(merchant)}.</p>
        </Panel>
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
      <ProgressTrack pct={rows.length ? ((cursor + 1) / rows.length) * 100 : 0} label={`Replay ${rows.length ? cursor + 1 : 0} of ${rows.length}`} now={rows.length ? cursor + 1 : 0} max={Math.max(rows.length, 1)} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</Button>
        {([1, 2, 4] as const).map((value) => (
          <Button key={value} tone={speed === value ? "gold" : "ghost"} onClick={() => setSpeed(value)}>{value}×</Button>
        ))}
      </div>
      <ol className="space-y-2">
        {rows.map((event, index) => (
          <li key={`${event.tick}-${index}`} className={`event-plate text-sm ${index === cursor ? "is-on" : ""}`}>Tick {event.tick}. {event.text}</li>
        ))}
        {rows.length === 0 && <li className="text-parchment/70">No raid has been recorded.</li>}
      </ol>
      <div className="flex flex-wrap gap-1">
        {["All", ...CHRONICLE].map((label) => (
          <button key={label} className={`ur-tab text-sm ${feed === label ? "is-on" : ""}`} onClick={() => setFeed(label)}>{label}</button>
        ))}
      </div>
      {game.ledger.filter((line) => feed === "All" || chronicleKind(line.text) === feed).slice(0, 12).map((line) => (
        <article key={line.id} className="event-plate text-sm">
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
        <Button tone={sound ? "gold" : "ghost"} onClick={() => setSound((value) => !value)}>Sound {sound ? "on" : "off"}</Button>
        <Button tone={music ? "gold" : "ghost"} onClick={() => setMusic((value) => !value)}>Music {music ? "on" : "off"}</Button>
        <Button tone={game.reduceMotion ? "ghost" : "gold"} onClick={() => setReduceMotion(!game.reduceMotion)}>Motion {game.reduceMotion ? "reduced" : "on"}</Button>
        <Button tone={game.showStats ? "gold" : "ghost"} onClick={() => setShowStats(!game.showStats)}>Performance details {game.showStats ? "on" : "off"}</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["low", "medium", "high"] as const).map((quality) => (
          <Button key={quality} tone={game.quality === quality ? "gold" : "ghost"} onClick={() => setQuality(quality)}>{quality}</Button>
        ))}
      </div>
      <p className="mt-3 text-sm text-parchment/70">Low drops shadows. Performance details stay off until you turn them on here. The numbers are a measurement from this machine.</p>
      <div className="mt-6 flex flex-col items-start gap-2">
        <Button tone="ember" onClick={() => newGame()}>New game (clears this browser save)</Button>
        <Button onClick={() => setScreen("sandbox")}>Testnet ledger</Button>
        <Button tone="ghost" onClick={() => setScreen("gallery")}>Model shelf</Button>
        <Button tone="ghost" onClick={() => setScreen("registry")}>Hero directory</Button>
      </div>
      <p className="mt-2 text-xs text-parchment/50">The ledger reads game.neocrafts.testnet, deeds.neocrafts.testnet, and the Ashgate treasury.</p>
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
          {categories.map((entry) => <button key={entry} className={`ur-tab text-xs ${category === entry ? "is-on" : ""}`} onClick={() => setCategory(entry)}>{entry}</button>)}
        </div>
        <input className="control mt-3 text-sm" placeholder="Filter filename" value={query} onChange={(event) => setQuery(event.target.value)} />
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
            <button key={viewName} className="ur-tab text-[11px] uppercase tracking-wider" onClick={() => view.current?.setView(viewName)}>{viewName}</button>
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
