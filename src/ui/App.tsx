import { useEffect, useMemo, useRef, useState } from "react";
import { ITEMS, SITES } from "../game/content";
import { goodsRule } from "../game/config/economyRules";
import { GOODS as RULE_GOODS, RAID, RECIPES } from "../../rules/economy";
import { HERO_PROFILES } from "../game/config/heroProfiles";
import { RULES } from "../game/config/gameRules";
import { TRAP_DEFINITIONS, TRAP_IDS } from "../game/config/trapDefinitions";
import { quotePrice } from "../game/engine/pricing";
import { chooseRaider, evaluateHero } from "../game/engine/decisions";
import { merchantStatus } from "../game/engine/market";
import { sfx } from "../game/audio";
import {
  armPossess,
  bindDungeon,
  buyBackRumour,
  buyFromMerchant,
  buyUpgrade,
  cancelListing,
  craftTrap,
  forgeKit,
  supplyIron,
  supplyMaterial,
  listItem,
  buyListing,
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
import { mountDungeon } from "../three/dungeon";
import { mountGallery } from "../three/gallery";
import { MainMenu } from "./screens/MainMenu";
import { MockSandbox } from "./screens/MockSandbox";
import { DeedScreen, GuildScreen, HomeScreen, ReportScreen, TakeHomeScreen, WeekScreen } from "./screens/PlayScreens";
import { renderTrapIcons } from "./trapIcons";
import { Shell } from "./shell";
import { CHRONICLE, chronicleKind } from "./kit";

const TUTORIAL = [
  "Choose Spike Trap on the bar. It follows the cursor. Click tile 4, 6.",
  "Click the red banner in the south doorway. The chosen hero walks in.",
  "Click the flying page to burn it, or let the moment pass.",
  "Orrin keeps a landed page. Click him to buy it back.",
  "Click the gate again. A hero who bought the rumour walks around the spike.",
  "Click Mira to supply iron, or Tallow to buy a phial.",
  "Chapter 7. The vault brace is in the workshop. After that, the next day is yours.",
];

export function App() {
  const game = useGame();
  return (
    <div className="flex h-full min-h-screen flex-col bg-ink font-body text-parchment">
      {game.screen !== "menu" && <Shell screen={game.screen} />}
      <main className="min-h-0 flex-1">
        {game.screen === "menu" && <MainMenu />}
        {game.screen === "home" && <HomeScreen />}
        {game.screen === "dungeon" && <DungeonScreen />}
        {game.screen === "map" && <WorldMap />}
        {game.screen === "gate" && <GateMarket />}
        {game.screen === "market" && <Marketplace />}
        {game.screen === "workshop" && <Workshop />}
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
          startRaid();
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

  return (
    <div className="relative h-full min-h-[640px]">
      <canvas ref={canvasRef} className="view absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col gap-2 px-2 sm:px-3">
        <div className="hud-glass pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-2 text-sm">
          <span>Vault <b className={game.vault < RAID.vaultStart * 0.25 ? "text-blood" : "text-gold"}>{game.vault}</b></span>
          <span>{game.phase === "raid" ? `−${RAID.bleedPerHeroPerSec}/s` : "−0/s"}</span>
          <span>Gold <b className="text-gold">{Math.round(game.gold)}</b></span>
          <span className="text-ember" aria-label={`${game.cinder} cinder`}>Cinder {"●".repeat(game.cinder)}{"○".repeat(Math.max(0, RAID.cinder.cap - game.cinder))}</span>
          <span>Wave {game.day}</span>
          <span>Tier {dungeonTier(game.raidsCleared ?? 0)}</span>
          <span>Chain ×{game.chain ?? 0}</span>
          <button className="ml-auto min-h-11 rounded-2xl border border-gold/30 px-3" onClick={() => setLogOpen((value) => !value)}>Chronicle</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["kara", "brann", "ivo"] as const).map((id) => {
            const body = game.heroes[id];
            const profile = HERO_PROFILES[id];
            const known = body.facts.filter((fact) => !fact.burned);
            const open = openHero === id;
            const bounty = game.raids.filter((raid) => raid.heroId === id && raid.survived).length;
            return (
              <button key={id} className="hud-glass pointer-events-auto w-52 shrink-0 rounded-2xl px-3 py-2 text-left" onClick={() => setOpenHero(open ? null : id)}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl text-gold">{profile.name}</span>
                  <span className="text-xs uppercase tracking-wider text-parchment/70">{profile.role}</span>
                </div>
                <p className="text-sm">HP {body.hp}/{body.maxHp}</p>
                <p className="text-sm">Purse {body.gold} · Bounty {bounty}</p>
                <p className="text-xs text-parchment/70">Gear {body.equipment.join(", ") || "pack only"}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-blood" style={{ width: `${Math.max(0, (body.hp / body.maxHp) * 100)}%` }} />
                </div>
                {known[0] ? <p className="mt-1 text-sm text-memory">{known[0].memory ?? "warned"} · {known[0].source ?? "record"}</p> : <p className="mt-1 text-sm text-parchment/70">No trap memory yet</p>}
                {open && <p className="mt-1 text-sm text-parchment/90">{body.memory[0]}</p>}
                {open && known.slice(0, 3).map((fact) => <p key={fact.id} className="text-sm">{fact.text}</p>)}
              </button>
            );
          })}
        </div>
      </div>
      {game.phase === "report" && report && (
        <div className="hud-glass pointer-events-auto absolute left-3 top-28 max-w-sm rounded-2xl p-4 text-sm">
          <div className="font-display text-lg text-gold">Raid results</div>
          <p>{report.survived ? `${hero.name} survived.` : `${hero.name} died.`}</p>
          <p>Traps sprung: {report.trapsTriggered.length}. Chain ×{game.chain ?? 0}.</p>
          <p>Walked {report.events.filter((event) => event.type === "move").map((event) => `${event.ix},${event.iz}`).join(" · ")}.</p>
          <p>Pages {game.pageResult === "burned" ? "burned" : game.pageResult === "escaped" ? "landed" : "still in the air"}: {report.facts.length}.</p>
          <p>Salvage in hand: iron {game.inventory.iron ?? 0}, ash {game.inventory.ash ?? 0}, bone {game.inventory.bone ?? 0}.</p>
          <p>Spike kills {game.trapKills?.spike ?? 0}. Tier {dungeonTier(game.raidsCleared ?? 0)}.</p>
          {game.dungeonClosed && <p className="text-blood">The vault is empty. The next wave restocks it.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="min-h-11 rounded-2xl bg-gold px-3 text-ink" onClick={() => nextDay()}>{game.dungeonClosed ? "Restock and continue" : "Next wave"}</button>
            <button className="min-h-11 rounded-2xl border border-gold/40 px-3" onClick={() => setScreen("report")}>Full report</button>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="hud-glass w-[min(42rem,100%)] rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-parchment">{game.pageResult === "decision" ? `The page is in the air. Click it to burn for ${RAID.cinder.burnCost} cinder. ${seconds}s.` : hint}</p>
          {toast && <p className="mt-1 text-xs text-gold">{toast}</p>}
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-parchment/45">{TUTORIAL[Math.min(game.tutorialStep, TUTORIAL.length - 1)]}</p>
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
      <div className="absolute bottom-24 left-0 right-0 flex justify-start gap-2 overflow-x-auto px-3 pb-1 sm:justify-center">
        {TRAP_IDS.map((id) => {
          const trap = TRAP_DEFINITIONS[id];
          const selected = game.selectedTrap === id;
          return (
            <button key={id} className={`hud-glass flex min-h-11 w-24 shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-sm ${selected ? "ring-2 ring-gold" : "hover:ring-1 hover:ring-gold/50"}`} onClick={() => selected ? clearTrap() : armTrap(id)}>
              {trapIcons[id] ? <img src={trapIcons[id]} alt="" className="h-14 w-14 object-contain" /> : <span className="h-14 w-14 rounded-xl bg-white/5" />}
              <span className={selected ? "text-gold" : "text-parchment"}>{trap.name}</span>
              <span className="text-[10px] text-gold">{trap.cost} gold</span>
            </button>
          );
        })}
        <button className={`hud-glass min-h-11 w-24 shrink-0 rounded-2xl px-2 py-2 text-sm ${game.possessArmed ? "ring-2 ring-gold text-gold" : ""}`} disabled={game.day < RAID.possess.fromWave} onClick={() => armPossess()}>
          Possess
          <span className="mt-1 block text-[10px] text-gold">{RAID.possess.cost} gold</span>
        </button>
      </div>
      <p className="pointer-events-none absolute bottom-1 right-3 text-[10px] text-parchment/35">{game.fps.toFixed(0)} fps · p95 {(game.frameP95 ?? 0).toFixed(0)} ms · {game.drawCalls} draws · {game.triangles} tris · {game.textureCount ?? 0} tex · {game.rendererInfo || "renderer"}</p>
    </div>
  );
}

function WorldMap() {
  const game = useGame();
  const [site, setSite] = useState(SITES[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const view = mountGallery(canvas);
    void view.show(site.model);
    return () => view.dispose();
  }, [site]);
  return (
    <section className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="font-display text-3xl text-gold">World map</h2>
        <p className="mb-4 text-sm text-parchment/70">Day {game.day}. Reputation {game.reputation}. The hexes are drawn here. Markers use the downloaded models.</p>
        <div className="relative h-[420px]">
          {SITES.map((entry) => {
            const x = 180 + entry.q * 92 + entry.r * 46;
            const y = 160 + entry.r * 80;
            return (
              <button key={entry.id} className="absolute h-20 w-20 text-xs" style={{ left: x, top: y, clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: entry.kind === "dungeon" ? "#6a3a28" : "#3d3428" }} onClick={() => { setSite(entry); note(`Marked ${entry.name}.`); }}>
                <span className="block px-2 pt-6 text-parchment">{entry.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded border border-gold/30 bg-panel p-3">
        <div className="font-display text-xl text-gold">{site.name}</div>
        <p className="text-sm text-parchment/75">{site.detail}</p>
        <canvas ref={canvasRef} className="view mt-3 h-64 w-full rounded bg-black" />
        {site.kind === "dungeon" && <button className="mt-3 rounded bg-ember px-3 py-1 text-ink" onClick={() => setScreen("dungeon")}>Enter</button>}
        {site.kind === "merchant" && <button className="mt-3 rounded bg-gold px-3 py-1 text-ink" onClick={() => setScreen("gate")}>Open gate market</button>}
      </div>
    </section>
  );
}

function GateMarket() {
  const game = useGame();
  const merchants = [game.merchants.mira, game.merchants.orrin, game.merchants.tallow];
  const board = (["kara", "brann", "ivo"] as const).map((id) => evaluateHero(game, game.heroes[id]));
  const raider = chooseRaider(game);
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-3">
      <article className="rounded border border-gold/25 bg-panel p-4 lg:col-span-3">
        <h3 className="font-display text-2xl text-gold">Raid board</h3>
        <p className="text-sm text-parchment/70">Each hero accepts or refuses on their own numbers. A counter would move a split only. Posting an offer does not spend Gold.</p>
        <ul className="mt-2 space-y-1 text-sm">
          {board.map((trace) => <li key={trace.heroId}>{trace.accept ? "Accepted" : "Refused"} · {trace.reason}</li>)}
        </ul>
        <p className="mt-2 text-sm">Next through the gate: {raider.heroId}.</p>
      </article>
      {merchants.map((merchant) => {
        const status = merchantStatus(merchant);
        return (
        <article key={merchant.id} className="rounded border border-gold/25 bg-panel p-4">
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
        </article>
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

function Marketplace() {
  const game = useGame();
  const [price, setPrice] = useState(10);
  const [nearPrice, setNearPrice] = useState(0.01);
  const open = game.listings.filter((listing) => (listing.status ?? "LISTED") === "LISTED");
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-3xl text-gold">Player market</h2>
        <p className="text-sm text-parchment/70">A listing sits in escrow. A sale pays the seller 90, the guild 5, and ops 5. Cancel and expiry return the item with no fee. Play-only goods cannot be listed for mock NEAR.</p>
        <p className="mt-2 text-sm">Your mock NEAR {game.near ?? 0}. Guild gold {(game.guildGold ?? 0).toFixed(2)}. Ops gold {(game.opsGold ?? 0).toFixed(2)}.</p>
        {game.priceNote && <p className="mt-2 text-sm text-gold">{game.priceNote}</p>}
        <ul className="mt-4 space-y-2">
          {open.map((listing) => (
            <li key={listing.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-sm">
              <span>{goodsRule(listing.itemId)?.name ?? listing.itemId} · {listing.price} {listing.currency ?? "PLAY_GOLD"} · {listing.cls ?? "PLAY_ONLY"} · escrow</span>
              <span className="flex gap-2">
                {listing.seller !== "player" && <button className="rounded border border-gold/40 px-2 py-1" onClick={() => buyListing(listing.id)}>Buy</button>}
                {listing.seller === "player" && <button className="rounded border border-white/20 px-2 py-1" onClick={() => cancelListing(listing.id)}>Cancel</button>}
              </span>
            </li>
          ))}
          {open.length === 0 && <li className="text-sm text-parchment/60">No listings.</li>}
        </ul>
      </div>
      <div>
        <h3 className="font-display text-gold">Your packs</h3>
        {Object.entries(game.inventory).filter(([, qty]) => qty > 0).map(([id, qty]) => (
          <div key={id} className="mt-2 flex items-center justify-between gap-2 text-sm">
            <span>{goodsRule(id)?.name ?? ITEMS.find((item) => item.id === id)?.name ?? id} × {qty} · {game.classes?.[id] ?? "PLAY_ONLY"}</span>
            <span className="flex gap-1">
              <button className="rounded border border-white/20 px-2 py-1" onClick={() => listItem(id, price, "PLAY_GOLD")}>List {price}g</button>
              <button className="rounded border border-white/20 px-2 py-1" onClick={() => listItem(id, nearPrice, "NEAR")}>List NEAR</button>
            </span>
          </div>
        ))}
        <label className="mt-4 block text-sm">Gold ask
          <input className="ml-2 w-20 bg-black/40 px-2" type="number" value={price} min={1} onChange={(event) => setPrice(Number(event.target.value))} />
        </label>
        <label className="mt-2 block text-sm">Mock NEAR ask
          <input className="ml-2 w-24 bg-black/40 px-2" type="number" value={nearPrice} min={0.0001} step={0.001} onChange={(event) => setNearPrice(Number(event.target.value))} />
        </label>
      </div>
    </section>
  );
}

function Workshop() {
  const game = useGame();
  return (
    <section className="mx-auto max-w-3xl p-6">
      <h2 className="font-display text-3xl text-gold">Workshop</h2>
      <p className="text-sm text-parchment/70">Four iron nails become a spike kit. The next spike trap then costs no Gold.</p>
      <p className="mt-3 text-sm">Nails in hand: {game.inventory.nail ?? 0}. Kits: {game.inventory.kit ?? 0}. Cinder: {game.cinder}.</p>
      <p className="mt-3 text-sm">Iron {game.inventory.iron ?? 0} · ash {game.inventory.ash ?? 0} · bone {game.inventory.bone ?? 0}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(RECIPES) as (keyof typeof RECIPES)[]).map((id) => {
          const kind = id.endsWith("potion") ? "potion" : id.endsWith("armor") ? "armor" : id.endsWith("boots") ? "boots" : id.endsWith("pit") ? "pit" : id.endsWith("boulder") ? "boulder" : "spike";
          return <button key={id} className="rounded bg-ember px-3 py-1 text-ink" onClick={() => craftTrap(kind)}>{id}</button>;
        })}
      </div>
      <button className="mt-4 rounded border border-gold/40 px-3 py-1" onClick={() => supplyIron(5)}>Supply 5 iron</button>
      <button className="mt-4 ml-3 rounded border border-gold/40 px-3 py-1" onClick={() => supplyMaterial("ash", 5)}>Supply 5 ash</button>
      <button className="mt-4 ml-3 rounded border border-gold/40 px-3 py-1" onClick={() => supplyMaterial("bone", 5)}>Supply 5 bone</button>
      <button className="mt-4 ml-3 rounded bg-ember px-3 py-1 text-ink" onClick={() => forgeKit()}>Forge spike kit</button>
      <button className="mt-4 ml-3 rounded border border-gold/40 px-3 py-1" onClick={() => buyUpgrade("vault-brace")}>Vault brace · {RULES.vaultBraceCost}g</button>
      <p className="mt-3 text-sm">Installed: {game.upgrades.join(", ") || "none"}.</p>
      {game.priceNote && <p className="mt-3 text-sm text-gold">{game.priceNote}</p>}
    </section>
  );
}

function Registry() {
  const game = useGame();
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-2">
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
      <h2 className="font-display text-3xl text-gold">Replay</h2>
      <p className="text-sm text-parchment/75">Replayed from recorded inputs. Diary text and hero decisions are the ones already stored.</p>
      {raid && <p className="text-sm">Day {raid.day} · {raid.heroId}. {raid.decision.reason}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="min-h-11 rounded-2xl bg-gold px-4 text-ink" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button>
        {([1, 2, 4] as const).map((value) => (
          <button key={value} className={`min-h-11 rounded-2xl px-4 ${speed === value ? "bg-gold text-ink" : "border border-gold/40"}`} onClick={() => setSpeed(value)}>{value}×</button>
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
