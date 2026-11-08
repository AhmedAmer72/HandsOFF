import { useEffect, useRef, useState } from "react";
import { enterDungeon, useGame } from "../../game/store";
import { sfx } from "../../game/audio";
import { mountLandingProps } from "../../three/landingProps";

type WalletStatus = "closed" | "prompt" | "rejected" | "failed";

const PILLARS = [
  { title: "Defend the hall", text: "You own Ashgate. Place the traps, watch the vault, and meet the hero who bought a way in." },
  { title: "Burn the page", text: "A fallen hero leaves a diary page. Burn it for cinder, or let one rumour reach Orrin." },
  { title: "Feed the stalls", text: "Mira buys salvage. Tallow sells gear. Prices move when the shelves change." },
];

const FEATURES: { title: string; text: string; live: boolean }[] = [
  { title: "AI heroes", text: "Kara, Brann, and Ivo keep their own purses, gear, and memories.", live: true },
  { title: "Your dungeon", text: "Ashgate is yours to defend. The vault is play gold.", live: true },
  { title: "Traps", text: "Drag, re-lay, and trigger traps on the hall grid.", live: true },
  { title: "Burn or let land", text: "The page flies. Burn it, or let one rumour reach the stall.", live: true },
  { title: "Memory", text: "A hero learns a clue only after buying it. A re-lay makes the old page stale.", live: true },
  { title: "Merchants", text: "Mira, Orrin, and Tallow price from the stock on this device.", live: true },
  { title: "Craft", text: "Spike, pit, boulder, potion, armor, boots. The recipes stay as written.", live: true },
  { title: "Market", text: "Listings sit in a local escrow beside the three stalls.", live: true },
  { title: "Contract board", text: "Each hero accepts or refuses on their own numbers before a wave.", live: true },
  { title: "World map", text: "Published halls on this device can be inspected. Other computers cannot see them yet.", live: false },
  { title: "Replay", text: "A finished raid can be replayed from its record. Live settlement proofs are not on this build.", live: false },
];

const ACTS = [
  { name: "Burn", text: "Spend cinder. The clue never becomes a rumour. What the hero saw in person still remains." },
  { name: "Let it land", text: "One verified page becomes one rumour on Orrin’s stall. No hero learns it until they buy it." },
  { name: "Re-lay", text: "Move the trap and the old page goes stale. Yesterday’s purchase no longer matches the floor." },
];

export function MainMenu() {
  const game = useGame();
  const heroCanvas = useRef<HTMLCanvasElement>(null);
  const [wallet, setWallet] = useState<WalletStatus>("closed");

  useEffect(() => {
    const canvas = heroCanvas.current;
    if (!canvas) return;
    const view = mountLandingProps(canvas);
    return () => view.dispose();
  }, []);

  function start() {
    sfx.ui();
    enterDungeon();
  }

  function connect() {
    sfx.ui();
    setWallet("prompt");
  }

  return (
    <div className="bg-[#100c0a] text-parchment" data-testid="landing">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-gold/15 bg-[#100c0a]/95 px-6 py-3 md:px-10">
        <p className="font-display text-lg tracking-[0.14em] text-gold">UNDERREALM</p>
        <nav className="hidden gap-6 text-sm text-parchment/70 md:flex">
          <a href="#hall">The hall</a>
          <a href="#ledger">Ledger</a>
          <a href="#page">The page</a>
          <a href="#stalls">Stalls</a>
        </nav>
      </header>

      <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden px-6 pb-16 pt-28 md:px-10">
        <canvas ref={heroCanvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#100c0a] via-[#100c0a]/80 to-transparent" />
        <div className="hall-enter relative max-w-xl">
          <h1 className="font-display text-4xl leading-[1.05] text-parchment md:text-6xl">You own the dungeon. The heroes are your customers.</h1>
          <p className="mt-5 max-w-[62ch] text-base text-parchment/85 md:text-lg">Build the hall. Defend the vault. Decide what a fallen hero is allowed to leave behind. Your dungeon. Their money. Your rules.</p>
          <p className="mt-4 text-sm text-gold">Kara, Brann, and Ivo raid. You defend.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="min-h-11 rounded-full bg-gold px-8 font-display text-ink" data-testid="get-started" onClick={start}>Get Started</button>
            <button className="min-h-11 rounded-full border border-gold/50 px-8 text-gold" data-testid="connect-wallet" onClick={connect}>Connect Wallet</button>
          </div>
          {game.continueReady && <p className="mt-4 text-sm text-parchment/70">A guest hall is already saved on this device. Get Started opens it.</p>}
        </div>
      </section>

      {wallet !== "closed" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
          <div className="w-full max-w-md rounded-3xl border border-gold/30 bg-ink p-6 text-left shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
            <h2 id="wallet-title" className="font-display text-2xl text-gold">Connect Wallet</h2>
            <p className="mt-3 text-sm text-parchment/80" data-testid="wallet-status">
              {wallet === "prompt" && "No sign-in provider is configured on this build. Nothing has been linked. Close this and press Get Started to enter as a guest."}
              {wallet === "failed" && "Connection failed. No supported provider answered. Nothing was connected. Get Started still opens the hall."}
              {wallet === "rejected" && "Connection cancelled. Nothing was connected. The entrance is unchanged."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {wallet === "prompt" && <button className="min-h-11 rounded-full bg-gold px-5 text-ink" onClick={() => setWallet("failed")}>Try anyway</button>}
              <button className="min-h-11 rounded-full border border-gold/40 px-5" onClick={() => setWallet(wallet === "prompt" ? "rejected" : "closed")}>{wallet === "prompt" ? "Cancel" : "Close"}</button>
            </div>
          </div>
        </div>
      )}

      <section id="hall" className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 py-20 md:px-10">
        <h2 className="max-w-[16ch] font-display text-4xl text-gold md:text-5xl">How the hall works</h2>
        <div className="mt-12 divide-y divide-gold/20 border-y border-gold/20">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="grid gap-3 py-8 md:grid-cols-[16rem_1fr] md:items-baseline">
              <h3 className="font-display text-2xl text-parchment">{pillar.title}</h3>
              <p className="max-w-[62ch] text-parchment/80">{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="ledger" className="border-y border-gold/15 bg-[#1a1512]">
        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 py-20 md:px-10">
          <h2 className="font-display text-4xl text-gold md:text-5xl">What this build can do</h2>
          <p className="mt-4 max-w-[62ch] text-sm text-parchment/75">A line marked “On this device” can be played here. “Not yet live” is not a running service.</p>
          <ul className="mt-10 divide-y divide-gold/15 border-y border-gold/15">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="grid gap-2 py-4 md:grid-cols-[14rem_1fr_auto] md:items-baseline md:gap-8">
                <h3 className="font-display text-xl text-parchment">{feature.title}</h3>
                <p className="text-sm text-parchment/75">{feature.text}</p>
                <span className={`text-xs uppercase tracking-[0.14em] ${feature.live ? "text-gold" : "text-parchment/45"}`}>{feature.live ? "On this device" : "Not yet live"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="page" className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 py-20 md:px-10">
        <h2 className="max-w-[14ch] font-display text-5xl leading-none text-gold md:text-7xl">Burn it, or let it land.</h2>
        <p className="mt-6 max-w-[62ch] text-parchment/80">When a hero falls, the purse bursts, salvage drops, and a golden diary page flies toward you.</p>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {ACTS.map((act) => (
            <li key={act.name}>
              <h3 className="font-display text-2xl text-parchment">{act.name}</h3>
              <p className="mt-2 text-sm text-parchment/75">{act.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="stalls" className="border-y border-gold/15 bg-[#1a1512]">
        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 py-20 md:px-10">
          <h2 className="font-display text-4xl text-gold md:text-5xl">Three stalls, one loop</h2>
          <p className="mt-4 max-w-[62ch] text-parchment/75">Salvage reaches the stalls. Stock changes. Prices move. The next raid is not a copy of the last.</p>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            <article><h3 className="font-display text-4xl text-parchment">Mira</h3><p className="mt-2 text-sm text-parchment/70">Forgemaster. Buys salvage for gold and sells the materials the recipes ask for.</p></article>
            <article><h3 className="font-display text-4xl text-parchment">Orrin</h3><p className="mt-2 text-sm text-parchment/70">Rumour broker. Lists a landed page once. A buy consumes it.</p></article>
            <article><h3 className="font-display text-4xl text-parchment">Tallow</h3><p className="mt-2 text-sm text-parchment/70">Quartermaster. Sells potions, armor, and boots.</p></article>
          </div>
        </div>
      </section>

      <section id="world" className="mx-auto flex min-h-[80svh] max-w-6xl flex-col justify-center px-6 py-20 md:px-10">
        <h2 className="font-display text-4xl text-gold md:text-5xl">The map shows published halls</h2>
        <p className="mt-4 max-w-[62ch] text-parchment/80">On this device you can read a public name, a tier, and whether the gate is open, and watch a live raid without touching it. Heroes remain the raiders. You do not march into someone else’s hall.</p>
        <p className="mt-4 max-w-[62ch] text-sm text-ember">A shared service for other computers is not live. Switching keepers on the map is a local mock.</p>
      </section>

      <section className="flex min-h-[100svh] flex-col items-start justify-center border-t border-gold/20 px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="font-display text-5xl text-gold md:text-6xl">Your dungeon is waiting.</h2>
          <p className="mt-4 max-w-[48ch] text-parchment/75">Build the defenses. Keep the rumours. Make the next raid count.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="min-h-11 rounded-full bg-gold px-8 font-display text-ink" onClick={start}>Get Started</button>
            <button className="min-h-11 rounded-full border border-gold/50 px-8 text-gold" onClick={connect}>Connect Wallet</button>
          </div>
          <p className="mt-16 text-xs uppercase tracking-[0.16em] text-parchment/40">Guest play on this device · KayKit · 2026</p>
        </div>
      </section>
    </div>
  );
}
