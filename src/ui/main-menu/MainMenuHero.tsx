import { setScreen } from "../../game/store";
import { sfx } from "../../game/audio";
import { liftButton } from "../../animations/mainMenuTimeline";

export function MainMenuHero({ continueReady, onTrailer }: { continueReady: boolean; onTrailer: () => void }) {
  return (
    <div className="menu-bit max-w-xl">
      <h1 className="font-display text-5xl text-gold drop-shadow md:text-7xl">UNDERREALM</h1>
      <p className="mt-2 text-xs uppercase tracking-[0.35em] text-torch">Build · Defend · Profit</p>
      <p className="mt-4 max-w-md text-lg text-parchment/90">Your dungeon. Your strategy. Your empire.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-gold px-6 py-3 font-display text-ink"
          onMouseEnter={(event) => liftButton(event.currentTarget, true)}
          onMouseLeave={(event) => liftButton(event.currentTarget, false)}
          onClick={() => { sfx.ui(); setScreen("map"); }}
        >
          {continueReady ? "Enter the world" : "New game"}
        </button>
        <button
          className="rounded-full border border-gold/50 px-6 py-3 text-gold"
          onMouseEnter={(event) => liftButton(event.currentTarget, true)}
          onMouseLeave={(event) => liftButton(event.currentTarget, false)}
          onClick={() => { sfx.ui(); onTrailer(); }}
        >
          Watch trailer
        </button>
      </div>
      <p className="mt-3 text-xs text-parchment/60">
        {continueReady ? "The island keeps this save. Walk to Ashgate, the market, or the workshop." : "No save yet. New game opens the island."}
      </p>
    </div>
  );
}
