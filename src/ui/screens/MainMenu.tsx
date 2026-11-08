import { useEffect, useRef, useState } from "react";
import { enterDungeon, useGame } from "../../game/store";
import { sfx } from "../../game/audio";
import { mountLandingProps } from "../../three/landingProps";

type WalletStatus = "closed" | "prompt" | "rejected" | "failed";

const PILLARS = [
  { title: "Defend your dungeon", text: "Build deadly traps, manage your vault, and outsmart incoming AI heroes. You own the hall. You do not play the hero." },
  { title: "Burn the page", text: "Every fallen hero leaves information. Destroy it, or let it become a rumour that changes the next raid." },
  { title: "Control a living economy", text: "Supply merchants, craft equipment, trade items, and watch the stalls react to every decision." },
];

const FEATURES: { title: string; text: string; live: boolean }[] = [
  { title: "AI heroes", text: "Kara, Brann, and Ivo keep their own purses, gear, and memories.", live: true },
  { title: "Player-owned dungeons", text: "Ashgate is yours to defend. The vault is play gold.", live: true },
  { title: "Strategic trap placement", text: "Drag, re-lay, and trigger traps on the hall grid.", live: true },
  { title: "Burn or let land", text: "A diary page flies. Burn it, or let one rumour reach Orrin.", live: true },
  { title: "Rumours and hero memory", text: "A hero learns a clue only after buying it. A re-lay makes the old page stale.", live: true },
  { title: "Dynamic merchant economy", text: "Mira, Orrin, and Tallow price from stock on this device.", live: true },
  { title: "Salvage and crafting", text: "The six recipes are unchanged: spike, pit, boulder, potion, armor, boots.", live: true },
  { title: "Player-owned market", text: "Listings sit in a local escrow beside the three stalls.", live: true },
  { title: "Raid contract board", text: "Heroes accept or refuse on their own numbers before a wave.", live: true },
  { title: "Global dungeon world map", text: "Published halls on this device can be inspected. A network other computers can join is not live.", live: false },
  { title: "Raid replay and verification", text: "A finished raid can be replayed from its record. Live settlement proofs are not on this build.", live: false },
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
    <div className="min-h-full bg-[#100c0a] text-parchment" data-testid="landing">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 bg-ink/90 px-4 py-3 backdrop-blur md:px-8">
        <p className="font-display text-lg tracking-[0.18em] text-gold">UNDERREALM</p>
        <nav className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-parchment/70">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#page">The page</a>
          <a href="#economy">Economy</a>
          <a href="#world">World</a>
        </nav>
      </header>

      <section className="relative isolate overflow-hidden px-4 py-20 md:px-8 md:py-28">
        <canvas ref={heroCanvas} className="pointer-events-none absolute inset-0 h-full w-full opacity-80" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(16,12,10,0.55)_55%,#100c0a_100%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold">UNDERREALM — Your dungeon. Their money. Your rules.</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-parchment md:text-6xl">You own the dungeon. The heroes are your customers.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-parchment/80 md:text-lg">Build your dungeon. Defend your vault. Control the information left behind by fallen heroes. Your traps create stories, your rumours shape enemy decisions, and your economy evolves with every raid.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button className="min-h-11 w-full rounded-full bg-gold px-8 font-display text-ink sm:w-auto" data-testid="get-started" onClick={start}>Get Started</button>
            <button className="min-h-11 w-full rounded-full border border-gold/50 px-8 text-gold sm:w-auto" data-testid="connect-wallet" onClick={connect}>Connect Wallet</button>
          </div>
          {game.continueReady && <p className="mt-4 text-sm text-parchment/70">A guest hall is already saved on this device. Get Started opens it.</p>}
          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-parchment/50">Kara, Brann, and Ivo raid. You defend.</p>
        </div>
      </section>

      {wallet !== "closed" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
          <div className="w-full max-w-md rounded-3xl border border-gold/30 bg-ink p-6 text-left shadow-panel">
            <h2 id="wallet-title" className="font-display text-2xl text-gold">Connect Wallet</h2>
            <p className="mt-3 text-sm text-parchment/80" data-testid="wallet-status">
              {wallet === "prompt" && "No sign-in provider is configured on this build. NEAR Auth and a wallet selector are not connected. Nothing has been linked."}
              {wallet === "failed" && "Connection failed. No supported provider answered. Nothing was connected."}
              {wallet === "rejected" && "Connection cancelled. Nothing was connected. The entrance is unchanged."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {wallet === "prompt" && <button className="min-h-11 rounded-full bg-gold px-5 text-ink" onClick={() => setWallet("failed")}>Try anyway</button>}
              <button className="min-h-11 rounded-full border border-gold/40 px-5" onClick={() => setWallet(wallet === "prompt" ? "rejected" : "closed")}>{wallet === "prompt" ? "Cancel" : "Close"}</button>
            </div>
          </div>
        </div>
      )}

      <section id="how" className="mx-auto grid max-w-6xl gap-4 px-4 py-16 md:grid-cols-3 md:px-8">
        <h2 className="font-display text-3xl text-gold md:col-span-3">How UNDERREALM works</h2>
        {PILLARS.map((pillar, index) => (
          <article key={pillar.title} className="rounded-3xl border border-gold/20 bg-panel/80 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">0{index + 1}</p>
            <h3 className="mt-2 font-display text-2xl">{pillar.title}</h3>
            <p className="mt-2 text-sm text-parchment/75">{pillar.text}</p>
          </article>
        ))}
      </section>

      <section id="features" className="bg-[#1a1512] px-4 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-gold">What is in this build</h2>
          <p className="mt-2 max-w-2xl text-sm text-parchment/70">A mark of “On this device” is playable here. “Not yet live” is not advertised as a running service.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-white/10 bg-ink/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-xl text-parchment">{feature.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${feature.live ? "bg-gold/20 text-gold" : "bg-white/10 text-parchment/60"}`}>{feature.live ? "On this device" : "Not yet live"}</span>
                </div>
                <p className="mt-2 text-sm text-parchment/75">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="page" className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:px-8">
        <div>
          <h2 className="font-display text-3xl text-gold">The information war</h2>
          <p className="mt-3 text-sm text-parchment/80">When a hero falls, the purse bursts, salvage drops, and a golden diary page flies toward you. The timer ring is the decision.</p>
        </div>
        <ul className="space-y-3 text-sm">
          <li className="rounded-2xl border border-ember/40 bg-ink p-4"><b className="text-gold">Burn.</b> Spend cinder. The clue never becomes a rumour. What the hero saw in person still remains.</li>
          <li className="rounded-2xl border border-gold/30 bg-ink p-4"><b className="text-gold">Let it land.</b> One verified page becomes one rumour on Orrin’s stall. No hero learns it until they buy it.</li>
          <li className="rounded-2xl border border-white/15 bg-ink p-4"><b className="text-gold">Re-lay.</b> Moving the trap ages the old page. Yesterday’s purchase no longer matches the floor.</li>
        </ul>
      </section>

      <section id="economy" className="bg-[#1a1512] px-4 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-gold">The living economy</h2>
          <p className="mt-3 max-w-3xl text-sm text-parchment/75">Salvage goes to the stalls. Stock changes. Prices move. Heroes buy different gear and rumours. The next raid is not the last one.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-rust/40 bg-ink p-5"><h3 className="font-display text-2xl text-gold">Mira</h3><p className="text-xs uppercase tracking-wider text-parchment/60">Forgemaster</p><p className="mt-2 text-sm">Buys salvage for gold. Sells traps and the materials the recipes ask for.</p></article>
            <article className="rounded-3xl border border-gold/30 bg-ink p-5"><h3 className="font-display text-2xl text-gold">Orrin</h3><p className="text-xs uppercase tracking-wider text-parchment/60">Rumour broker</p><p className="mt-2 text-sm">Lists a landed page once. A buy consumes it. An unsold page can be bought back.</p></article>
            <article className="rounded-3xl border border-parchment/30 bg-ink p-5"><h3 className="font-display text-2xl text-gold">Tallow</h3><p className="text-xs uppercase tracking-wider text-parchment/60">Quartermaster</p><p className="mt-2 text-sm">Sells potions, armor, and boots, and buys gear the rules allow.</p></article>
          </div>
        </div>
      </section>

      <section id="world" className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 className="font-display text-3xl text-gold">Explore the world</h2>
        <p className="mt-3 max-w-3xl text-sm text-parchment/75">The world map is a diorama of halls published on this device. You can read a public name, tier, and whether the gate is open, and watch a live raid without touching it. Heroes remain the raiders. You do not march into someone else’s hall.</p>
        <p className="mt-3 max-w-3xl text-sm text-ember">A shared service for other computers is not live. Switching keepers on the map is a local MOCK fixture.</p>
      </section>

      <section className="border-t border-gold/20 px-4 py-20 text-center md:px-8">
        <h2 className="font-display text-4xl text-gold">Your dungeon is waiting.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-parchment/75">Build your defenses. Control the rumours. Make every raid count.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button className="min-h-11 w-full rounded-full bg-gold px-8 font-display text-ink sm:w-auto" onClick={start}>Get Started</button>
          <button className="min-h-11 w-full rounded-full border border-gold/50 px-8 text-gold sm:w-auto" onClick={connect}>Connect Wallet</button>
        </div>
        <p className="mt-10 text-[11px] uppercase tracking-[0.16em] text-parchment/40">Guest play · local hall · KayKit · 2026</p>
      </section>
    </div>
  );
}
