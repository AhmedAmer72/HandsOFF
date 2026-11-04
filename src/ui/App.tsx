import { useEffect, useMemo, useRef, useState } from "react";
import { HEROES, ITEMS, MERCHANTS, NAV, RECIPES, SITES, TRAPS } from "../game/content";
import { sfx } from "../game/audio";
import {
  addPlaced,
  buyFromMerchant,
  buyListing,
  craft,
  damageEnemy,
  damageHero,
  healHero,
  itemName,
  note,
  patch,
  resetSave,
  resolveDiary,
  revive,
  selectHero,
  sellItem,
  setScreen,
  useGame,
} from "../game/store";
import { mountDungeon } from "../three/dungeon";
import { mountGallery } from "../three/gallery";

export function App() {
  const game = useGame();
  return (
    <div className="flex h-full min-h-screen flex-col bg-ink text-parchment">
      <header className="flex items-center justify-between border-b border-gold/30 px-4 py-3">
        <button className="font-display text-xl tracking-[0.18em] text-gold" onClick={() => setScreen("menu")}>
          UNDERREALM
        </button>
        <nav className="flex flex-wrap gap-2 text-sm">
          {NAV.map((entry) => (
            <button
              key={entry.id}
              className={`rounded px-2 py-1 ${game.screen === entry.id || (entry.id === "menu" && game.screen === "dungeon") ? "bg-gold text-ink" : "text-parchment/80 hover:text-gold"}`}
              onClick={() => {
                sfx.ui();
                setScreen(entry.id === "menu" ? "dungeon" : entry.id);
              }}
            >
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="font-display text-sm text-gold">
          {game.gold} gold · {game.cinder} cinder
        </div>
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
  const game = useGame();
  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-6 py-10 md:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Local raid · no chain</p>
        <h1 className="mt-3 font-display text-5xl text-gold">Ashgate waits under the hill.</h1>
        <p className="mt-4 max-w-xl text-lg text-parchment/80">
          A stylized dungeon built from the free KayKit packs. Brann, Kara, and Ivo are distinct Adventurer meshes. The skeletons are the four free bodies. Gold and cinder stay on this machine.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded bg-ember px-4 py-2 font-display text-ink" onClick={() => setScreen("dungeon")}>Enter Dungeon</button>
          <button className="rounded border border-gold/40 px-4 py-2" onClick={() => setScreen("map")}>World Map</button>
          <button className="rounded border border-gold/40 px-4 py-2" onClick={() => setScreen("gallery")}>Asset Gallery</button>
        </div>
      </div>
      <div className="space-y-3">
        {HEROES.map((hero) => (
          <button
            key={hero.id}
            className={`block w-full rounded border p-4 text-left ${game.selectedHero === hero.id ? "border-gold bg-panel" : "border-white/10 bg-panel2"}`}
            onClick={() => selectHero(hero.id)}
          >
            <div className="font-display text-xl text-gold">{hero.name}</div>
            <div className="text-sm text-parchment/70">{hero.role} · {hero.modelFile}</div>
            <p className="mt-2 text-sm">{hero.personality}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function DungeonScreen() {
  const game = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<ReturnType<typeof mountDungeon> | null>(null);
  const [stats, setStats] = useState({ fps: 0, triangles: 0 });
  const hooks = useRef(game);
  hooks.current = game;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    revive();
    const mounted = mountDungeon(canvas, {
      getHero: () => hooks.current.selectedHero,
      getQuality: () => hooks.current.quality,
      getMode: () => hooks.current.worldMode,
      getTrap: () => hooks.current.selectedTrap,
      getSpikeBonus: () => hooks.current.spikeBonus,
      onSelect: (selection) => patch({ selection }),
      onHeroDamage: (amount) => {
        if (hooks.current.heroes[hooks.current.selectedHero].hp <= 0) return;
        damageHero(amount);
      },
      onEnemyDamage: (id, amount) => damageEnemy(id, amount),
      onEnemies: (enemies) => patch({ enemies }),
      onPlace: (trap) => addPlaced(trap),
      onStats: (fps, triangles) => setStats({ fps, triangles }),
      onDiary: () => patch({ diary: "decision" }),
      diaryChoice: () => hooks.current.diary,
    });
    api.current = mounted;
    return () => mounted.dispose();
  }, [game.worldMode, game.selectedHero, game.quality]);

  const hero = HEROES.find((entry) => entry.id === game.selectedHero)!;
  const hp = game.heroes[game.selectedHero];

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto] lg:grid-cols-[240px_1fr_280px] lg:grid-rows-[auto_1fr]">
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-2 text-sm lg:col-span-3">
        <span>Vault chest</span>
        <span className="text-gold">{game.gold} gold</span>
        <span className="text-ember">{game.cinder} cinder</span>
        <span>Wave {game.raid.wave}</span>
        <span>{game.raid.status}</span>
        <span className="ml-auto text-parchment/60">{stats.fps.toFixed(0)} fps · {stats.triangles} tris</span>
      </div>
      <aside className="space-y-3 border-white/10 p-3 lg:border-r">
        {HEROES.map((entry) => (
          <button key={entry.id} className={`w-full rounded border p-3 text-left ${entry.id === game.selectedHero ? "border-gold" : "border-white/10"}`} onClick={() => selectHero(entry.id)}>
            <div className="font-display text-gold">{entry.name}</div>
            <div className="text-xs text-parchment/70">{entry.role} · {entry.modelFile}</div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-black/40">
              <div className="h-full bg-blood" style={{ width: `${(game.heroes[entry.id].hp / game.heroes[entry.id].maxHp) * 100}%` }} />
            </div>
            <div className="mt-1 text-xs">{entry.weaponFile ?? "unarmed"}</div>
          </button>
        ))}
        <div className="text-xs text-parchment/60">Threat: {game.enemies.filter((enemy) => enemy.hp > 0).length} skeletons standing</div>
      </aside>
      <div className="relative min-h-[420px]">
        <canvas ref={canvasRef} className="view h-full w-full" />
        {game.diary === "decision" && (
          <div className="absolute inset-x-0 bottom-4 mx-auto max-w-lg rounded border border-gold/50 bg-parchment p-4 text-ink shadow-panel">
            <div className="font-display text-lg">The page reaches the gate.</div>
            <p className="mt-1 text-sm">Burn it, or let the rumour out.</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded bg-ember px-3 py-1" onClick={() => resolveDiary("burn")}>Burn the page</button>
              <button className="rounded border border-ink/30 px-3 py-1" onClick={() => resolveDiary("release")}>Let it escape</button>
            </div>
          </div>
        )}
        {game.diary === "burned" && <Banner text="Ash on the gate. The rumour dies here." />}
        {game.diary === "escaped" && <Banner text={game.rumour} />}
      </div>
      <aside className="space-y-3 border-white/10 p-3 lg:border-l">
        <div className="font-display text-gold">Selected</div>
        {game.selection ? (
          <div className="text-sm">
            <div>{game.selection.label}</div>
            <div className="text-parchment/60">{game.selection.file}</div>
            <div className="text-parchment/60">{game.selection.pack}</div>
            {game.selection.note && <p className="mt-2 text-parchment/80">{game.selection.note}</p>}
          </div>
        ) : (
          <p className="text-sm text-parchment/60">Click a hero, skeleton, floor, or prop.</p>
        )}
        <div className="text-sm">
          <div className="font-display text-gold">Recent</div>
          {game.chronicle.slice(0, 4).map((line) => (
            <p key={line.id} className="mt-1 text-parchment/75">{line.text}</p>
          ))}
        </div>
        <p className="text-xs text-parchment/50">{hero.name} {hp.hp}/{hp.maxHp}. Q/E rotate, WASD pan, wheel zoom, R reset, F focus.</p>
      </aside>
      <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2 lg:col-span-3">
        {TRAPS.map((trap) => (
          <button key={trap.id} className={`rounded border px-3 py-1 text-sm ${game.selectedTrap === trap.id ? "border-gold text-gold" : "border-white/15"}`} onClick={() => patch({ selectedTrap: game.selectedTrap === trap.id ? null : trap.id })}>
            {trap.name}
          </button>
        ))}
        <button className="rounded bg-gold px-3 py-1 text-sm text-ink" onClick={() => { api.current?.strike(); note(`${hero.name} swings.`); }}>Strike</button>
        <button className="rounded border border-white/20 px-3 py-1 text-sm" onClick={() => api.current?.dodge()}>Dodge</button>
        <button className="rounded border border-white/20 px-3 py-1 text-sm" onClick={() => api.current?.interact()}>Interact</button>
        <button className="rounded border border-white/20 px-3 py-1 text-sm" onClick={() => api.current?.focusHero()}>Focus</button>
        <button className="rounded border border-white/20 px-3 py-1 text-sm" onClick={() => patch({ worldMode: game.worldMode === "prototype" ? "full" : "prototype" })}>
          {game.worldMode === "prototype" ? "Open full Ashgate" : "Back to prototype room"}
        </button>
        <button className="rounded border border-white/20 px-3 py-1 text-sm" onClick={() => setScreen("gate")}>Gate market</button>
        <button className="rounded border border-white/20 px-3 py-1 text-sm" onClick={() => healHero(20)}>Drink phial</button>
      </footer>
    </div>
  );
}

function Banner({ text }: { text: string }) {
  return <div className="absolute left-4 top-4 max-w-sm rounded bg-black/70 px-3 py-2 text-sm text-gold">{text}</div>;
}

function WorldMap() {
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
        <p className="mb-4 text-sm text-parchment/70">Procedural hexes. The Medieval Hexagon Pack was not part of the authorized downloads, so terrain is drawn here and markers use real models.</p>
        <div className="relative h-[420px]">
          {SITES.map((entry) => {
            const x = 180 + entry.q * 92 + entry.r * 46;
            const y = 160 + entry.r * 80;
            return (
              <button key={entry.id} className="absolute h-20 w-20 text-xs" style={{ left: x, top: y, clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)", background: entry.kind === "dungeon" ? "#6a3a28" : "#3d3428" }} onClick={() => { setSite(entry); if (entry.kind === "dungeon") note("Marked Ashgate."); }}>
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
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-3">
      {MERCHANTS.map((merchant) => (
        <article key={merchant.id} className="rounded border border-gold/25 bg-panel p-4">
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p className="text-sm text-parchment/70">{merchant.role}</p>
          <p className="mt-2 text-sm">{merchant.personality}</p>
          <p className="text-sm text-parchment/70">Needs: {merchant.needs}</p>
          <ul className="mt-3 space-y-2">
            {merchant.stock.map((stock) => {
              const record = ITEMS.find((entry) => entry.id === stock.itemId);
              return (
                <li key={stock.itemId} className="flex items-center justify-between gap-2 text-sm">
                  <span>{record?.name ?? stock.itemId} · {stock.qty} · {stock.price}g</span>
                  <button className="rounded border border-gold/40 px-2 py-1" onClick={() => { buyFromMerchant(merchant.id, stock.itemId); sfx.coin(); }}>Buy</button>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
      <article className="rounded border border-white/10 bg-panel2 p-4 lg:col-span-3">
        <h3 className="font-display text-gold">Stall ledger</h3>
        {game.ledger.length === 0 && <p className="text-sm text-parchment/60">No gate trades yet.</p>}
        {game.ledger.map((line) => <p key={line.id} className="text-sm">{line.text}</p>)}
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
        <p className="text-sm text-parchment/70">Simulated listings. Balances never leave this browser.</p>
        <ul className="mt-4 space-y-2">
          {game.listings.map((listing) => (
            <li key={listing.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
              <span>{itemName(listing.itemId)} · {listing.seller} · {listing.price}g · qty {listing.qty}</span>
              <button className="rounded bg-gold px-2 py-1 text-ink" onClick={() => { buyListing(listing.id); sfx.coin(); }}>Buy</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-display text-gold">Your packs</h3>
        {Object.entries(game.inventory).filter(([, qty]) => qty > 0).map(([id, qty]) => (
          <div key={id} className="mt-2 flex items-center justify-between text-sm">
            <span>{itemName(id)} × {qty}</span>
            <button className="rounded border border-white/20 px-2 py-1" onClick={() => sellItem(id, price)}>List for {price}g</button>
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
      <p className="text-sm text-parchment/70">Recipes spend real inventory items. The hammer stays in the shop.</p>
      <ul className="mt-4 space-y-3">
        {RECIPES.map((recipe) => (
          <li key={recipe.id} className="rounded border border-gold/20 p-4">
            <div className="font-display text-xl">{recipe.name}</div>
            <p className="text-sm">{recipe.result}</p>
            <p className="text-xs text-parchment/60">{recipe.needs.map((need) => `${itemName(need.itemId)} × ${need.qty}`).join(", ")}</p>
            <button className="mt-2 rounded bg-ember px-3 py-1 text-ink" onClick={() => craft(recipe.id)}>Craft</button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">Spike bonus this raid: {game.spikeBonus}. Cinder: {game.cinder}.</p>
    </section>
  );
}

function Registry() {
  const game = useGame();
  return (
    <section className="grid gap-4 p-4 lg:grid-cols-2">
      {HEROES.map((hero) => (
        <article key={hero.id} className="rounded border border-white/10 bg-panel p-4">
          <h3 className="font-display text-2xl text-gold">{hero.name}</h3>
          <p>{hero.role} · {hero.personality}</p>
          <p className="text-sm text-parchment/70">Needs {hero.needs}</p>
          <p className="text-sm">HP {game.heroes[hero.id].hp}/{game.heroes[hero.id].maxHp} · model {hero.modelFile}</p>
          <p className="text-sm">Balance share: {Math.floor(game.gold / 3)} gold on the local ledger.</p>
          <div className="mt-2 text-sm">
            {game.heroes[hero.id].memory.map((line, index) => <p key={index}>{line}</p>)}
          </div>
        </article>
      ))}
      {MERCHANTS.map((merchant) => (
        <article key={merchant.id} className="rounded border border-white/10 bg-panel2 p-4">
          <h3 className="font-display text-2xl text-gold">{merchant.name}</h3>
          <p>{merchant.role}. {merchant.personality}</p>
          <p className="text-sm text-parchment/70">Needs {merchant.needs}</p>
        </article>
      ))}
    </section>
  );
}

function Chronicle() {
  const game = useGame();
  const rows = useMemo(() => game.chronicle, [game.chronicle]);
  return (
    <section className="mx-auto max-w-3xl p-6">
      <h2 className="font-display text-3xl text-gold">Replay & chronicles</h2>
      <p className="text-sm text-parchment/70">Raid notes, trades, placements, and diary outcomes stored locally.</p>
      <ol className="mt-4 space-y-2">
        {rows.length === 0 && <li className="text-parchment/60">The book is blank.</li>}
        {rows.map((line) => (
          <li key={line.id} className="border-b border-white/10 py-2 text-sm">
            <span className="text-parchment/50">{new Date(line.when).toLocaleString()}</span> — {line.text}
          </li>
        ))}
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
          <button key={quality} className={`rounded px-3 py-1 ${game.quality === quality ? "bg-gold text-ink" : "border border-white/20"}`} onClick={() => patch({ quality })}>
            {quality}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-parchment/70">Low drops shadows and pixel ratio. High uses a 2048 shadow map. The fps counter in the dungeon is the measurement, not a target.</p>
      <button className="mt-6 rounded border border-blood px-3 py-1 text-blood" onClick={() => resetSave()}>Reset local save</button>
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
    fetch("/catalog.json")
      .then((response) => response.json())
      .then((payload: { assets: CatalogAsset[] }) => setAssets(payload.assets))
      .catch((reason: unknown) => setError(String(reason)));
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
          {categories.map((entry) => (
            <button key={entry} className={`rounded px-2 py-1 text-xs ${category === entry ? "bg-gold text-ink" : "border border-white/15"}`} onClick={() => setCategory(entry)}>{entry}</button>
          ))}
        </div>
        <input className="mt-3 w-full bg-black/40 px-2 py-1 text-sm" placeholder="Filter filename" value={query} onChange={(event) => setQuery(event.target.value)} />
        <ul className="mt-3 space-y-1">
          {visible.map((asset) => (
            <li key={asset.publicPath}>
              <button className="w-full truncate text-left text-sm hover:text-gold" onClick={() => {
                setCurrent(asset);
                setError("");
                view.current?.show(asset.publicPath).then(setClips).catch((reason: unknown) => setError(String(reason)));
              }}>{asset.filename}</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative min-h-[480px]">
        <canvas ref={canvasRef} className="view h-full w-full" />
        {error && <p className="absolute bottom-3 left-3 text-sm text-blood">{error}</p>}
      </div>
      <aside className="overflow-auto border-l border-white/10 p-3 text-sm">
        {current ? (
          <>
            <div className="font-display text-xl text-gold">{current.filename}</div>
            <p>Pack: {current.sourcePack}</p>
            <p>Category: {current.category}</p>
            <p>Triangles: {current.triangles}</p>
            <p>Meshes: {current.meshes} · Materials: {current.materials}</p>
            <p>Skins: {current.skins.join(", ") || "none"}</p>
            <p>Bytes: {current.bytes}</p>
            {current.bounds && <p>Size: {current.bounds.size.map((value) => value.toFixed(2)).join(" × ")}</p>}
            <div className="mt-3 flex flex-col gap-1">
              {clips.map((clip) => (
                <button key={clip} className="text-left text-gold/90" onClick={() => view.current?.play(clip)}>{clip}</button>
              ))}
            </div>
          </>
        ) : (
          <p>Choose a model. Drag to rotate, wheel to zoom.</p>
        )}
      </aside>
    </section>
  );
}
