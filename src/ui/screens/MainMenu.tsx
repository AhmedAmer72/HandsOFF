import { useState, type MouseEvent } from "react";
import { enterDungeon, useGame } from "../../game/store";
import { sfx } from "../../game/audio";
import { ForgedFrame } from "../forge/frame";
import { Button } from "../kit";

type WalletStatus = "closed" | "prompt" | "linked" | "failed";

const HERO = "/hero/underrealm-hands-off.jpg";

const STEPS = [
  { n: "1", title: "Place a trap", text: "Spike, pit, or boulder. The path is yours until a hero walks it." },
  { n: "2", title: "Open the gate", text: "Kara, Brann, and Ivo decide. You do not steer them." },
  { n: "3", title: "The page", text: "Burn it, or let one rumour land." },
];

const FEATURES = [
  { title: "Your dungeon", text: "Defend the vault." },
  { title: "Their raids", text: "Heroes choose the walk." },
  { title: "The stalls", text: "Mira, Orrin, and Tallow." },
];

export function MainMenu() {
  const game = useGame();
  const [wallet, setWallet] = useState<WalletStatus>("closed");

  function start() {
    sfx.ui();
    enterDungeon();
  }

  function connect() {
    sfx.ui();
    setWallet("prompt");
    void fetch("/api/near").then((response) => response.json()).then((body: { keeper?: string | null }) => {
      setWallet(body.keeper ? "linked" : "failed");
    }).catch(() => setWallet("failed"));
  }

  function jump(event: MouseEvent<HTMLAnchorElement>) {
    const id = event.currentTarget.getAttribute("href")?.slice(1);
    const node = id ? document.getElementById(id) : null;
    if (!node) return;
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="land" data-testid="landing">
      <header className="land-nav">
        <a className="land-brand" href="#top" onClick={jump}>UNDERREALM</a>
        <button className="land-btn" data-testid="get-started" onClick={start}><span>Get Started</span></button>
      </header>

      <section id="top" className="land-hero" style={{ backgroundImage: `url(${HERO})` }}>
        <div className="land-hero-shade" />
        <div className="land-hero-copy">
          <h1 className="sr-only">Underrealm. Your dungeon. Their money. Your rules.</h1>
          <p className="land-tagline">Your dungeon. Their money. Your rules.</p>
          <p className="mt-3 max-w-[36ch] text-parchment/85">Defend the vault. Heroes raid it. A fallen hero leaves a page.</p>
          <div className="land-actions">
            <button className="land-btn" onClick={start}><span>Get Started</span></button>
            <button className="land-btn land-btn-ghost" data-testid="connect-wallet" onClick={connect}><span>Connect Wallet</span></button>
          </div>
          {game.continueReady && <p className="land-note">A hall is saved on this device.</p>}
          <a className="land-scroll" href="#steps" onClick={jump}>Scroll<span /></a>
        </div>
      </section>

      {wallet !== "closed" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
          <ForgedFrame variant="modal" className="w-full max-w-md text-left">
            <h2 id="wallet-title" className="font-display text-2xl text-gold">Signing</h2>
            <p className="mt-3 text-sm text-parchment/80" data-testid="wallet-status">
              {wallet === "prompt" && "Checking this machine."}
              {wallet === "linked" && "A signing key is on this machine. This is not a wallet connection."}
              {wallet === "failed" && "No signing key on this machine."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button tone="ghost" onClick={() => setWallet("closed")}>Close</Button>
            </div>
          </ForgedFrame>
        </div>
      )}

      <section id="hall" className="land-section">
        <div className="land-wrap land-steps">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="land-card">
              <h2 className="font-display text-2xl text-parchment">{feature.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-parchment/75">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="steps" className="land-section pt-0">
        <div className="land-wrap land-steps">
          {STEPS.map((step) => (
            <article key={step.n} className="land-card">
              <p className="land-num">{step.n}</p>
              <h2 className="mt-4 font-display text-2xl text-parchment">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-parchment/75">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="land-foot border-t border-white/10">
        <p>Underrealm · 2026</p>
      </footer>
    </div>
  );
}
