import { useState, type MouseEvent } from "react";
import { enterDungeon, useGame } from "../../game/store";
import { sfx } from "../../game/audio";
import { ForgedFrame } from "../forge/frame";
import { Button } from "../kit";

type WalletStatus = "closed" | "prompt" | "rejected" | "failed";

const HERO = "/hero/underrealm-hands-off.jpg";

const STEPS = [
  { n: "1", title: "Lay the floor", text: "Choose where the spike, the pit, and the boulder sit. The path is yours until a hero walks it.", shift: "" },
  { n: "2", title: "Open the gate", text: "Begin the raid. Kara, Brann, and Ivo decide from their own purse, gear, and memory.", shift: "land-step-2" },
  { n: "3", title: "Keep the page", text: "Burn the diary for cinder, or let it land as one rumour. Move the trap and yesterday’s page goes stale.", shift: "land-step-3" },
];

const WAYS = [
  { title: "Ashgate", by: "Your hall", text: "Place a trap, open the south gate, and meet the hero who bought a way in. The vault is the prize they came for." },
  { title: "The page", by: "After a fall", text: "A fallen hero leaves a diary page. Burn it, or let one rumour reach Orrin. No hero learns it until they buy it." },
  { title: "The stalls", by: "Mira, Orrin, Tallow", text: "Salvage becomes gold. Stock changes the price. A landed page is listed once, and a buy consumes it." },
];

const NOTES = [
  ["#hall", "The hall"],
  ["#steps", "The gate"],
  ["#ways", "The stalls"],
  ["#ledger", "The page"],
  ["#enter", "The vault"],
  ["#about", "The record"],
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
        <nav className="land-links" aria-label="Landing">
          <a className="is-on" href="#top" onClick={jump}>The hall</a>
          <a href="#about" onClick={jump}>Chronicle</a>
        </nav>
        <button className="land-btn" onClick={start}><span>Enter</span></button>
      </header>

      <section id="top" className="land-hero" style={{ backgroundImage: `url(${HERO})` }}>
        <div className="land-hero-shade" />
        <div className="land-hero-copy">
          <h1 className="sr-only">Underrealm. A dungeon you keep. Heroes who choose. A vault you defend.</h1>
          <p className="land-tagline">A dungeon you keep. Heroes who choose. A vault you defend.</p>
          <div className="land-actions">
            <button className="land-btn" data-testid="get-started" onClick={start}><span>{game.continueReady ? "Enter the hall" : "Play"}</span></button>
            <button className="land-btn land-btn-ghost" data-testid="connect-wallet" onClick={connect}><span>Connect wallet</span></button>
          </div>
          {game.continueReady && <p className="land-note">A guest hall is already saved on this device. Enter the hall opens it.</p>}
          <a className="land-scroll" href="#hall" onClick={jump}>Scroll<span /></a>
        </div>
      </section>

      {wallet !== "closed" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
          <ForgedFrame variant="modal" className="w-full max-w-md text-left">
            <h2 id="wallet-title" className="font-display text-2xl text-gold">Connect Wallet</h2>
            <p className="mt-3 text-sm text-parchment/80" data-testid="wallet-status">
              {wallet === "prompt" && "No sign-in provider is configured on this build. Nothing has been linked. Close this and press Play to enter as a guest."}
              {wallet === "failed" && "Connection failed. No supported provider answered. Nothing was connected. Play still opens the hall."}
              {wallet === "rejected" && "Connection cancelled. Nothing was connected. The entrance is unchanged."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {wallet === "prompt" && <Button onClick={() => setWallet("failed")}>Try anyway</Button>}
              <Button tone="ghost" onClick={() => setWallet(wallet === "prompt" ? "rejected" : "closed")}>{wallet === "prompt" ? "Cancel" : "Close"}</Button>
            </div>
          </ForgedFrame>
        </div>
      )}

      <section id="hall" className="land-section">
        <div className="land-wrap land-split">
          <div>
            <p className="land-kicker"><span>The hall</span></p>
            <h2 className="max-w-[16ch] font-display text-4xl leading-tight text-parchment md:text-5xl">You set the traps. They choose the raid.</h2>
            <p className="mt-5 max-w-[46ch] text-parchment/80">Underrealm is a dungeon you keep. Heroes arrive with their own gold, gear, and memory. You do not steer them. You place the spike, watch the vault, and decide what the next wave is allowed to know.</p>
          </div>
          <div className="land-figure" role="img" aria-label="The stone hand above the bridge" style={{ backgroundImage: `url(${HERO})`, backgroundSize: "360%", backgroundPosition: "100% 64%" }} />
        </div>
      </section>

      <section id="steps" className="land-section pt-0">
        <div className="land-wrap land-steps">
          {STEPS.map((step) => (
            <article key={step.n} className={`land-card ${step.shift}`}>
              <p className="land-num">{step.n}</p>
              <h3 className="mt-4 font-display text-2xl text-parchment">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-parchment/75">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="ways" className="land-section">
        <div className="land-wrap">
          <h2 className="text-center font-display text-3xl text-parchment md:text-4xl">Walk one of these paths</h2>
          <div className="land-plays mt-10">
            {WAYS.map((way) => (
              <button key={way.title} className="land-play" onClick={start}>
                <strong>{way.title}</strong>
                <span className="mt-1 text-sm text-parchment/55">{way.by}</span>
                <span className="mt-3 text-sm leading-relaxed text-parchment/80">{way.text}</span>
                <span className="land-go" aria-hidden="true">▶</span>
                <span className="sr-only">Enter {way.title}</span>
              </button>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <button className="land-btn land-btn-ghost" onClick={start}><span>See the hall</span></button>
          </div>
        </div>
      </section>

      <section id="ledger" className="land-section">
        <div className="land-wrap land-split land-split-flip">
          <div className="land-figure order-last md:order-none" role="img" aria-label="Rune-marked stone above the lava" style={{ backgroundImage: `url(${HERO})`, backgroundSize: "360%", backgroundPosition: "0% 68%" }} />
          <div>
            <p className="land-kicker"><span>The ledger</span></p>
            <h2 className="max-w-[16ch] font-display text-4xl leading-tight text-parchment md:text-5xl">A hall that remembers the last raid.</h2>
            <p className="mt-5 max-w-[46ch] text-parchment/80">Salvage reaches the stalls. Stock changes the price. A rumour is bought once. Move a trap and the old page no longer matches the floor. The next raid is not a copy of the last.</p>
            <button className="land-btn mt-6" onClick={start}><span>Try the hall</span></button>
          </div>
        </div>
      </section>

      <section className="land-band border-y border-gold/15 bg-[#10141a]">
        <h2 className="font-display text-4xl text-parchment md:text-5xl">Free on this device.</h2>
        <p className="mt-3 max-w-[36ch] text-lg text-parchment/85">The hall saves in this browser. A wallet is optional, and nothing is linked until a provider is configured.</p>
        <button className="land-btn land-btn-ghost mt-6" onClick={connect}><span>Connect wallet</span></button>
      </section>

      <section id="enter" className="land-close" style={{ backgroundImage: `url(${HERO})` }}>
        <div className="land-close-shade" />
        <div className="relative z-10">
          <h2 className="font-display text-4xl text-parchment md:text-5xl">Defend the vault. Keep the next raid.</h2>
          <div className="land-actions">
            <button className="land-btn" onClick={start}><span>Enter the hall</span></button>
            <button className="land-btn land-btn-ghost" onClick={connect}><span>Connect wallet</span></button>
          </div>
        </div>
      </section>

      <section id="about" className="land-section">
        <div className="land-wrap">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Dark fantasy strategy</p>
          <h2 className="mt-3 font-display text-5xl text-parchment">Underrealm</h2>
          <p className="mt-4 max-w-[68ch] text-parchment/85">Underrealm is a hall you keep on this device. You place the traps, open the south gate, and meet heroes who spend their own gold. A fallen hero leaves a page. Burn it, or let one rumour reach the stall.</p>
          <p className="mt-3 max-w-[68ch] text-parchment/85">Ashgate, the market, and the workshop are here. A shared service for other computers is not live yet.</p>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-gold">The loop</p>
          <div className="land-chips mt-3">
            {NOTES.map(([href, label]) => (
              <a key={label} className="land-chip" href={href} onClick={jump}>{label}</a>
            ))}
          </div>
        </div>
      </section>

      <footer className="land-foot border-t border-white/10">
        <p>Underrealm · Guest play on this device · 2026</p>
        <nav aria-label="Footer">
          <a href="#hall" onClick={jump}>The hall</a>
          <a href="#ledger" onClick={jump}>Ledger</a>
          <a href="#ways" onClick={jump}>Stalls</a>
          <a href="#about" onClick={jump}>Chronicle</a>
        </nav>
      </footer>
    </div>
  );
}
