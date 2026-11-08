import type { ScreenId } from "../../game/content";
import { setScreen } from "../../game/store";
import { sfx } from "../../game/audio";
import { liftButton } from "../../animations/mainMenuTimeline";

const CARDS: { id: ScreenId | "raid"; title: string; subtitle: string }[] = [
  { id: "raid", title: "Raid", subtitle: "Epic dungeons" },
  { id: "market", title: "Market", subtitle: "Trade and earn" },
  { id: "workshop", title: "Workshop", subtitle: "Craft and upgrade" },
  { id: "chronicle", title: "Replay", subtitle: "Relive your raids" },
];

export function MainMenuFeatures() {
  function open() {
    sfx.ui();
    setScreen("home");
  }
  return (
    <div className="menu-bit grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => (
        <button
          key={card.title}
          className="hud-glass rounded-2xl px-4 py-3 text-left"
          onMouseEnter={(event) => liftButton(event.currentTarget, true)}
          onMouseLeave={(event) => liftButton(event.currentTarget, false)}
          onClick={() => open()}
        >
          <div className="font-display text-gold">{card.title}</div>
          <svg viewBox="0 0 32 32" className="mt-2 h-6 w-6 text-gold" aria-hidden="true">
            {card.id === "raid" && <path d="M6 26 14 8l4 8 8-14-2 18H6z" fill="currentColor" />}
            {card.id === "market" && <path d="M6 14h20l-2 12H8L6 14zm2-4h16v4H8V10z" fill="currentColor" />}
            {card.id === "workshop" && <path d="M8 22h16v3H8v-3zm2-12 6 6-2 2-6-6 2-2zm8 1 6 6-2 2-6-6 2-2z" fill="currentColor" />}
            {card.id === "chronicle" && <path d="M8 6h12l4 4v16H8V6zm10 1v4h4" fill="currentColor" />}
          </svg>
          <div className="text-xs text-parchment/70">{card.subtitle}</div>
        </button>
      ))}
    </div>
  );
}
