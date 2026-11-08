import { useEffect, useRef, useState } from "react";
import { setScreen, useGame } from "../../game/store";
import { sfx } from "../../game/audio";
import { mountLandingProps, mountOneProp } from "../../three/landingProps";
import { dungeon, weapon } from "../../game/content";

const GEAR = [
  { name: "Spike trap", note: "Thirty gold. The careless step.", tone: "from-emerald-900/80", url: weapon("dagger") },
  { name: "Vault chest", note: "Bleeds while a hero lives.", tone: "from-amber-900/80", url: dungeon("chest_gold") },
  { name: "Brann's axe", note: "The brute spends on armor.", tone: "from-rose-950/80", url: weapon("axe_2handed") },
];

function PropShot({ url }: { url: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const view = mountOneProp(canvas, url);
    return () => view.dispose();
  }, [url]);
  return <canvas ref={ref} className="h-full w-full" />;
}

export function MainMenu() {
  const game = useGame();
  const scroller = useRef<HTMLDivElement>(null);
  const heroCanvas = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [gear, setGear] = useState(1);
  const [sent, setSent] = useState("");

  useEffect(() => {
    const canvas = heroCanvas.current;
    if (!canvas) return;
    const view = mountLandingProps(canvas);
    return () => view.dispose();
  }, []);

  function onScroll() {
    const node = scroller.current;
    if (!node) return;
    const max = node.scrollHeight - node.clientHeight;
    setProgress(max > 0 ? node.scrollTop / max : 0);
  }

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[#09090b] bg-[radial-gradient(circle_at_top,_#2a241c,_#09090b_55%)] p-3 text-parchment md:p-6">
      <div className="relative mx-auto flex h-[calc(100vh-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:h-[calc(100vh-3rem)]">
        <header className="z-20 grid grid-cols-[auto_1fr_auto] items-center border-b border-white/10 bg-black/80">
          <button className="border-r border-white/10 px-4 py-3 font-camp text-lg tracking-[0.14em] text-white" onClick={() => go("camp-hero")}>UNDERREALM</button>
          <nav className="flex justify-center gap-6 text-xs uppercase tracking-[0.18em] text-white/70">
            <button onClick={() => { sfx.ui(); setScreen("map"); }}>World</button>
            <button onClick={() => go("camp-realm")}>About</button>
            <button onClick={() => go("camp-symbols")}>Symbols</button>
          </nav>
          <div className="flex border-l border-white/10">
            <span className="grid h-12 w-12 place-items-center border-r border-white/10 text-sm" aria-hidden="true">⌘</span>
            <span className="grid h-12 w-12 place-items-center text-sm" aria-hidden="true">◉</span>
          </div>
        </header>
        <div className="pointer-events-none absolute bottom-16 left-4 top-20 z-20 hidden md:block">
          <div className="relative h-full w-px bg-white/20">
            <span className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_12px_#F2C14E]" style={{ top: `${progress * 92}%` }} />
          </div>
        </div>
        <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
          <section id="camp-hero" className="relative flex min-h-[78vh] flex-col items-center justify-center px-6 text-center">
            <canvas ref={heroCanvas} className="pointer-events-none absolute inset-0 h-full w-full" />
            <h1 className="relative max-w-3xl font-camp text-4xl uppercase leading-[0.95] text-white drop-shadow md:text-6xl">Ashgate opens: burn the page</h1>
            <p className="relative mt-5 max-w-md text-sm text-white/75">Three heroes buy a way in. You lay the traps. A diary page flies. Burn it, or let the rumour land.</p>
            <button className="relative mt-8 bg-gold px-10 py-2 font-camp text-sm tracking-[0.2em] text-black shadow-[0_0_24px_rgba(242,193,78,0.45)] [clip-path:polygon(10%_0,90%_0,100%_50%,90%_100%,10%_100%,0_50%)]" onClick={() => { sfx.ui(); setScreen("map"); }}>Discover</button>
            <button className="relative mt-14 text-[10px] uppercase tracking-[0.28em] text-white/60" onClick={() => go("camp-realm")}>⌄<br />Scroll down</button>
          </section>
          <section id="camp-realm" className="relative min-h-[70vh] bg-[radial-gradient(circle_at_20%_40%,#1d4d46,transparent_40%),radial-gradient(circle_at_80%_60%,#123a55,transparent_42%),linear-gradient(#102018,#05070a)] px-4 py-16">
            <p className="mb-8 text-center font-camp text-2xl uppercase text-white md:text-4xl">Defend the hall. Spend the page.</p>
            <div className="mx-auto max-w-xl rounded-sm border border-cyan-200/40 bg-black/70 p-6 shadow-[0_0_40px_rgba(80,200,255,0.18)] backdrop-blur">
              <h2 className="font-camp text-2xl uppercase text-white">The underrealm is open</h2>
              <p className="mt-3 text-sm text-white/75">Kara, Brann, and Ivo raid on their own gold. You keep the vault, the market, and whatever a dead hero writes down.</p>
              <div className="mt-4 flex gap-2 text-[10px] uppercase tracking-[0.14em]">
                <span className="rounded-full bg-gold px-3 py-1 text-black">3 heroes</span>
                <span className="rounded-full bg-gold px-3 py-1 text-black">Tier {game.raidsCleared && game.raidsCleared >= 10 ? 2 : 1}</span>
              </div>
            </div>
          </section>
          <section id="camp-symbols" className="relative px-6 py-20 text-center">
            <h2 className="font-camp text-3xl uppercase text-white">The flying page</h2>
            <div className="relative mx-auto mt-10 h-56 max-w-lg">
              <div className="absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffb347,#7a2e12_55%,transparent_70%)] shadow-[0_0_40px_#ff8a2a]" />
              <div className="absolute left-1/2 top-16 h-24 w-28 -translate-x-1/2 rounded-sm border border-gold/70 bg-gradient-to-b from-amber-100 to-amber-700 shadow-lg" />
              <span className="absolute bottom-2 left-1/2 h-2 w-2 -translate-x-6 rounded-full bg-white" />
              <span className="absolute bottom-2 left-1/2 h-2 w-2 translate-x-3 rounded-full bg-white/30" />
            </div>
            <div className="mx-auto mt-2 grid max-w-3xl gap-4 text-left text-xs text-white/70 md:grid-cols-2">
              <p className="rounded-md border border-white/15 bg-white/5 p-4">Burning the page keeps it off Orrin's stall. What a hero saw with their own eyes still remains.</p>
              <p className="rounded-md border border-white/15 bg-white/5 p-4">Let it land and one hero can buy the rumour. Re-lay the trap and yesterday's clue goes stale.</p>
            </div>
            <button className="mt-8 bg-gold px-8 py-2 font-camp text-xs tracking-[0.18em] text-black [clip-path:polygon(10%_0,90%_0,100%_50%,90%_100%,10%_100%,0_50%)]" onClick={() => go("camp-gear")}>Learn more</button>
          </section>
          <section id="camp-gear" className="px-4 py-16 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">Lay the set before the next wave walks in</p>
            <h2 className="mt-3 font-camp text-3xl uppercase text-white">Hall equipment</h2>
            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 items-end gap-3">
              {GEAR.map((item, index) => (
                <button key={item.name} className={`rounded-md border border-white/15 bg-gradient-to-b ${item.tone} to-black p-3 text-left ${index === gear ? "scale-105 border-gold" : "opacity-80"}`} onClick={() => setGear(index)}>
                  <div className={`mx-auto mb-3 ${index === gear ? "h-28" : "h-20"} w-full overflow-hidden rounded bg-black/40`}>
                    {index === gear && <PropShot url={item.url} />}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-white">{item.name}</div>
                  <div className="mt-2 flex gap-1">
                    {[0, 1, 2, 3].map((dot) => <span key={dot} className={`h-2 w-2 rounded-full ${dot <= index ? "bg-gold" : "bg-white/20"}`} />)}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/70">{GEAR[gear].note}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button className="h-9 w-9 rounded border border-white/20" aria-label="Previous" onClick={() => setGear((value) => (value + GEAR.length - 1) % GEAR.length)}>‹</button>
              <button className="h-9 w-9 rounded border border-white/20" aria-label="Next" onClick={() => setGear((value) => (value + 1) % GEAR.length)}>›</button>
            </div>
          </section>
          <section id="camp-contact" className="px-6 py-16">
            <h2 className="text-center font-camp text-3xl uppercase text-white">Get in touch</h2>
            <div className="mx-auto mt-8 grid max-w-3xl items-center gap-8 md:grid-cols-2">
              <form className="text-left" onSubmit={(event) => { event.preventDefault(); setSent("Kept on this device. Nothing was sent."); }}>
                <p className="text-sm text-white/70">A note for the keeper. It stays in this browser.</p>
                <input className="mt-4 w-full bg-white/10 px-3 py-2 text-sm outline-none" placeholder="Name" aria-label="Name" />
                <input className="mt-3 w-full bg-white/10 px-3 py-2 text-sm outline-none" placeholder="Email" aria-label="Email" type="email" />
                <button className="mt-4 bg-gold px-8 py-2 font-camp text-xs tracking-[0.18em] text-black [clip-path:polygon(10%_0,90%_0,100%_50%,90%_100%,10%_100%,0_50%)]">Send</button>
                {sent && <p className="mt-3 text-xs text-gold">{sent}</p>}
              </form>
              <div className="h-48 overflow-hidden rounded border border-gold/30 bg-[#140c08] shadow-[0_0_30px_rgba(242,193,78,0.25)]">
                <PropShot url={dungeon("chest_gold")} />
              </div>
            </div>
          </section>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 px-6 py-4 text-[10px] uppercase tracking-[0.16em] text-white/50">
            <span>2026 Underrealm · KayKit · local play</span>
            <span>Follow the hall</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
