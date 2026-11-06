import { useEffect, useMemo, useRef, useState } from "react";
import { ITEMS, NAV, SITES } from "../game/content";
import { goodsRule } from "../game/config/economyRules";
import { RAID } from "../../rules/economy";
import { HERO_PROFILES } from "../game/config/heroProfiles";
import { RULES } from "../game/config/gameRules";
import { TRAP_DEFINITIONS, TRAP_IDS } from "../game/config/trapDefinitions";
import { quotePrice } from "../game/engine/pricing";
import { chooseRaider, evaluateHero } from "../game/engine/decisions";
import { shopState } from "../game/rules/money";
import { GOODS as STALL_GOODS } from "../game/config/economyRules";
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
  listItem,
  markDiary,
  newGame,
  nextDay,
  note,
  placeTrap,
  relayTrapTo,
  resolvePage,
  selectInfo,
  armTrap,
  clearTrap,
  setQuality,
  setScreen,
  setStats,
  startRaid,
  toSteps,
  useGame,
} from "../game/store";
import { mountDungeon } from "../three/dungeon";
import { mountGallery } from "../three/gallery";

const TUTORIAL = [
  "Click the spiked floor piece on the gold ring, then click tile 4, 6.",
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
    <div className="flex h-full min-h-screen flex-col bg-ink text-parchment">
      <header className="z-20 flex items-center justify-between gap-3 border-b border-gold/15 bg-ink/80 px-4 py-2 backdrop-blur">
        <button className="font-display text-sm tracking-[0.22em] text-gold" onClick={() => setScreen("menu")}>UNDERREALM</button>
        <nav className="flex flex-wrap gap-1 text-[11px] uppercase tracking-[0.14em]">
          {NAV.map((entry) => (
            <button key={entry.id} className={`rounded-full px-3 py-1 ${game.screen === entry.id ? "bg-gold text-ink" : "text-parchment/70 hover:bg-white/5 hover:text-gold"}`} onClick={() => { sfx.ui(); setScreen(entry.id === "menu" ? "dungeon" : entry.id); }}>
              {entry.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="min-h-0 flex-1">
        {game.screen === "menu" && <Menu />}
        {game.screen === "dungeon" && <DungeonScreen />}
        {game.screen === "map" && <WorldMap />}
        {game.screen === "gate" && <GateMarket />}
        {game.screen === "market" && <Marketplace />}
        {game.screen === "workshop" && <Workshop />}
        {game.screen === "registry" && <Registry />}
        {game.screen === "chronicle" && <Chronicle />}
        {game.screen === "settings" && <Settings />}
        {game.screen === "gallery" && <Gallery />}
      </main>
    </div>
  );
}

function Menu() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-gold">Local dungeon · local gold</p>
      <h1 className="mt-3 font-display text-5xl text-gold">Will you burn the page?</h1>
      <p className="mt-4 text-lg text-parchment/80">
        Ashgate is yours. Heroes choose their own raids. A death leaves a diary page. Burn it, or let the knowledge reach Orrin and change the next walk.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded bg-ember px-4 py-2 font-display text-ink" onClick={() => { newGame(); sfx.ui(); }}>New game</button>
        <button className="rounded border border-gold/40 px-4 py-2" onClick={() => setScreen("dungeon")}>Continue</button>
        <button className="rounded border border-gold/40 px-4 py-2" onClick={() => setScreen("gallery")}>Asset gallery</button>
      </div>
    </section>
  );
}

function DungeonScreen() {
  const game = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seconds, setSeconds] = useState<number>(RAID.pageFlightSec);
  const [hint, setHint] = useState("Click a gold ring, then a floor tile.");
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
        setToast(result.ok ? "The trap is set." : result.reason);
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
      onBrace: () => setToast(buyUpgrade("vault-brace").reason),
      armTrap: (trapId) => armTrap(trapId),
      clearArm: () => clearTrap(),
      getPhase: () => hooks.current.phase,
      getDay: () => hooks.current.day,
      getShelf: () => {
        const miraHeld = hooks.current.merchants.mira.stock.reduce((sum, line) => sum + line.qty, 0);
        const tallowHeld = hooks.current.merchants.tallow.stock.reduce((sum, line) => sum + line.qty, 0);
        const miraTarget = STALL_GOODS.filter((good) => good.merchant === "mira").reduce((sum, good) => sum + good.targetStock, 1);
        const tallowTarget = STALL_GOODS.filter((good) => good.merchant === "tallow").reduce((sum, good) => sum + good.targetStock, 1);
        return {
          mira: Math.round(4 * Math.min(1, miraHeld / miraTarget)),
          tallow: Math.round(4 * Math.min(1, tallowHeld / tallowTarget)),
          orrin: hooks.current.merchants.orrin.rumours.length,
        };
      },
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

  const report = game.pending;
  const hero = report ? HERO_PROFILES[report.heroId] : HERO_PROFILES.kara;

  return (
    <div className="relative h-full min-h-[640px]">
      <canvas ref={canvasRef} className="view absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-wrap items-start justify-between gap-3 px-3">
        <div className="flex gap-2">
          {(["kara", "brann", "ivo"] as const).map((id) => {
            const body = game.heroes[id];
            const profile = HERO_PROFILES[id];
            return (
              <div key={id} className="hud-glass w-36 rounded-2xl px-3 py-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-sm text-gold">{profile.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-parchment/50">{profile.role}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-blood" style={{ width: `${(body.hp / body.maxHp) * 100}%` }} />
                </div>
                <p className="mt-1 truncate text-[11px] text-parchment/70">{body.memory[0]}</p>
              </div>
            );
          })}
        </div>
        <div className="hud-glass flex items-center gap-4 rounded-2xl px-4 py-2 text-sm">
          <span>Vault <b className="text-gold">{game.vault}</b></span>
          <span>Gold <b className="text-gold">{game.gold}</b></span>
          <span>Cinder <b className="text-ember">{game.cinder}</b></span>
          <span className="text-parchment/60">Day {game.day}</span>
        </div>
      </div>
      {game.phase === "report" && report && (
        <div className="hud-glass pointer-events-none absolute left-3 top-28 max-w-sm rounded-2xl p-4 text-sm">
          <div className="font-display text-gold">Raid</div>
          <p>{report.survived ? `${hero.name} survived.` : `${hero.name} died.`}</p>
          <p className="text-parchment/70">Traps sprung: {report.trapsTriggered.length}. Click the gate for the next day.</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="hud-glass w-[min(42rem,100%)] rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-parchment">{game.pageResult === "decision" ? `The page is in the air. Click it to burn for ${RAID.cinder.burnCost} cinder. ${seconds}s.` : hint}</p>
          {toast && <p className="mt-1 text-xs text-gold">{toast}</p>}
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-parchment/45">{TUTORIAL[Math.min(game.tutorialStep, TUTORIAL.length - 1)]}</p>
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 top-28 hidden w-64 lg:block">
        <div className="hud-glass max-h-72 overflow-hidden rounded-2xl p-3 text-xs">
          <div className="font-display text-sm text-gold">Chronicle</div>
          {game.selection && <p className="mt-1 text-memory">{game.selection.label}</p>}
          {game.ledger.slice(0, 5).map((line) => <p key={line.id} className="mt-1 text-parchment/80">{line.text}</p>)}
        </div>
      </div>
      <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 gap-2">
        {TRAP_IDS.map((id) => (
          <button key={id} className={`hud-glass rounded-full px-3 py-2 text-xs ${game.selectedTrap === id ? "text-gold" : "text-parchment"}`} onClick={() => armTrap(id)}>
            {TRAP_DEFINITIONS[id].name} · {TRAP_DEFINITIONS[id].cost}
          </button>
        ))}
      </div>
      <p className="pointer-events-none absolute bottom-1 right-3 text-[10px] text-parchment/35">{game.fps.toFixed(0)} fps · {game.rendererInfo || "renderer"}</p>
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
        const target = STALL_GOODS.filter((good) => good.merchant === merchant.id).reduce((sum, good) => sum + good.targetStock, 0);
        const held = merchant.stock.reduce((sum, line) => sum + line.qty, 0);
        const status = shopState(merchant.gold, held, target, merchant.id !== "orrin");
        return (
        <article key={merchant.id} className="rounded border border-gold/25 bg-panel p-4">
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p className="text-sm text-parchment/70">{merchant.role} · {merchant.gold} gold · {status}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {merchant.stock.map((line) => {
              const quote = quotePrice(line.itemId, line.qty);
              return (
                <li key={line.itemId} className="flex items-center justify-between gap-2">
                  <span>{goodsRule(line.itemId)?.name ?? line.itemId} · {line.qty} · {quote.price}g</span>
                  <button className="rounded border border-gold/40 px-2 py-1" onClick={() => { buyFromMerchant(merchant.id, line.itemId); sfx.coin(); }}>Buy</button>
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
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-2">
      <div>
        <h2 className="font-display text-3xl text-gold">Player market</h2>
        <p className="text-sm text-parchment/70">Listings move local Gold. Five at a time. A day on the stall returns the item. The fee is 10% when it sells.</p>
        <ul className="mt-4 space-y-2">
          {game.listings.map((listing) => (
            <li key={listing.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-sm">
              <span>{goodsRule(listing.itemId)?.name ?? listing.itemId} · {listing.price}g</span>
              <span className="flex gap-2">
                <button className="rounded border border-white/20 px-2 py-1" onClick={() => cancelListing(listing.id)}>Cancel</button>
              </span>
            </li>
          ))}
          {game.listings.length === 0 && <li className="text-sm text-parchment/60">No listings.</li>}
        </ul>
      </div>
      <div>
        <h3 className="font-display text-gold">Your packs</h3>
        {Object.entries(game.inventory).filter(([, qty]) => qty > 0).map(([id, qty]) => (
          <div key={id} className="mt-2 flex items-center justify-between text-sm">
            <span>{goodsRule(id)?.name ?? ITEMS.find((item) => item.id === id)?.name ?? id} × {qty}</span>
            <button className="rounded border border-white/20 px-2 py-1" onClick={() => listItem(id, price)}>List for {price}g</button>
          </div>
        ))}
        <label className="mt-4 block text-sm">Asking price
          <input className="ml-2 w-20 bg-black/40 px-2" type="number" value={price} min={1} onChange={(event) => setPrice(Number(event.target.value))} />
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
      <button className="mt-4 rounded bg-ember px-3 py-1 text-ink" onClick={() => craftTrap("spike")}>Craft spike</button>
      <button className="mt-4 ml-3 rounded border border-gold/40 px-3 py-1" onClick={() => supplyIron(5)}>Supply 5 iron to Mira</button>
      <button className="mt-4 ml-3 rounded bg-ember px-3 py-1 text-ink" onClick={() => forgeKit()}>Forge spike kit</button>
      <button className="mt-4 ml-3 rounded border border-gold/40 px-3 py-1" onClick={() => buyUpgrade("vault-brace")}>Vault brace · {RULES.vaultBraceCost}g</button>
      <p className="mt-3 text-sm">Installed: {game.upgrades.join(", ") || "none"}.</p>
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
            <p className="text-sm">Gold {hero.gold}. Health {hero.hp}/{hero.maxHp}. Gear {hero.equipment.join(", ") || "pack only"}.</p>
            <p className="mt-2 text-sm text-parchment/70">{hero.memory[0]}</p>
            {hero.facts.filter((fact) => !fact.burned).map((fact) => <p key={fact.id} className="text-sm">{fact.memory ?? "warned"} · {fact.source ?? "record"} · {fact.text}</p>)}
          </article>
        );
      })}
      {([game.merchants.mira, game.merchants.orrin, game.merchants.tallow]).map((merchant) => (
        <article key={merchant.id} className="rounded border border-white/10 bg-panel2 p-4">
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p>{merchant.role}. Local balance {merchant.gold} gold. Sales {merchant.sales}.</p>
        </article>
      ))}
    </section>
  );
}

function Chronicle() {
  const game = useGame();
  const raid = game.raids[0];
  const rows = useMemo(() => raid?.events ?? [], [raid]);
  return (
    <section className="mx-auto max-w-3xl p-6">
      <h2 className="font-display text-3xl text-gold">Replay & chronicles</h2>
      <p className="text-sm text-parchment/70">The latest raid is the event list from the rules engine. The same traps and day produce the same list.</p>
      {raid && <p className="mt-3 text-sm">Day {raid.day} · {raid.heroId} · {raid.decision.reason}</p>}
      <ol className="mt-4 space-y-2">
        {rows.map((event, index) => <li key={`${event.tick}-${index}`} className="border-b border-white/10 py-2 text-sm">Tick {event.tick}. {event.text}</li>)}
        {rows.length === 0 && <li className="text-parchment/60">No raid has been recorded.</li>}
      </ol>
    </section>
  );
}

function Settings() {
  const game = useGame();
  return (
    <section className="mx-auto max-w-xl p-6">
      <h2 className="font-display text-3xl text-gold">Settings</h2>
      <div className="mt-4 flex gap-2">
        {(["low", "medium", "high"] as const).map((quality) => (
          <button key={quality} className={`rounded px-3 py-1 ${game.quality === quality ? "bg-gold text-ink" : "border border-white/20"}`} onClick={() => setQuality(quality)}>{quality}</button>
        ))}
      </div>
      <p className="mt-3 text-sm text-parchment/70">Low drops shadows. The fps counter in the dungeon is a measurement from this machine.</p>
      <button className="mt-6 rounded border border-blood px-3 py-1 text-blood" onClick={() => newGame()}>New game (clears this browser save)</button>
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
