import type { ReactNode } from "react";
import type { ScreenId } from "../game/content";
import { setScreen } from "../game/store";
import { sfx } from "../game/audio";

/** v10.2 sections 5.1–5.13, without the world map. */
const LINKS: { id: ScreenId; label: string; icon: ReactNode }[] = [
  { id: "home", label: "Home", icon: <path d="M4 11 12 4l8 7v8H4v-8z" /> },
  { id: "dungeon", label: "Raid", icon: <path d="M5 19 12 4l7 15H5zm7-8v5" /> },
  { id: "gate", label: "Gate", icon: <path d="M6 20V8h12v12M9 20v-6h6v6M4 8h16" /> },
  { id: "market", label: "Market", icon: <path d="M4 9h16l-2 11H6L4 9zm2-4h12v4H6V5z" /> },
  { id: "workshop", label: "Workshop", icon: <path d="M4 18h16v2H4v-2zM7 16l5-8 2 2-5 8-2-2zm7-7 4 4-2 2-4-4 2-2z" /> },
  { id: "report", label: "Board", icon: <path d="M6 4h9l3 3v13H6V4zm8 1v3h3" /> },
  { id: "registry", label: "Heroes", icon: <path d="M8 19v-2a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /> },
  { id: "chronicle", label: "Replay", icon: <path d="M8 6v12l10-6-10-6z" /> },
  { id: "week", label: "Week", icon: <path d="M5 19V7h14v12H5zm0-9h14M8 4v3M16 4v3" /> },
  { id: "deed", label: "Charter", icon: <path d="M7 3h8l3 3v15H7V3zm7 1v3h3M9 11h6M9 15h6" /> },
  { id: "guild", label: "Guild", icon: <path d="M4 18 12 4l8 14H4zm8-6v4" /> },
  { id: "takehome", label: "Take home", icon: <path d="M5 10h14v9H5v-9zm2-4h10v4H7V6z" /> },
  { id: "settings", label: "Settings", icon: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 4h2m10 0h2M12 5v2m0 10v2" /> },
];

export function Shell({ screen }: { screen: ScreenId }) {
  function go(id: ScreenId) {
    sfx.ui();
    setScreen(id);
  }
  return (
    <aside className="z-30 flex h-full w-[4.5rem] shrink-0 flex-col border-r border-gold/20 bg-ink/95 md:w-52">
      <button className="hidden px-4 py-4 text-left font-display text-sm tracking-[0.16em] text-gold md:block" onClick={() => go("home")}>UNDERREALM</button>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {LINKS.map((link) => {
          const active = screen === link.id;
          return (
            <button
              key={link.id}
              title={link.label}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center gap-3 rounded-2xl px-2 text-left text-sm md:justify-start md:px-3 ${active ? "bg-gold text-ink" : "text-parchment/80 hover:bg-white/5 hover:text-gold"}`}
              onClick={() => go(link.id)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{link.icon}</svg>
              <span className="hidden md:inline">{link.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
