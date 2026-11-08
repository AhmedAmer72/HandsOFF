import { useState, type ReactNode } from "react";
import type { ScreenId } from "../game/content";
import { setScreen } from "../game/store";
import { sfx } from "../game/audio";

const LINKS: { id: ScreenId; label: string; icon: ReactNode }[] = [
  { id: "dungeon", label: "My Dungeon", icon: <path d="M4 20V9l8-5 8 5v11H4zm6 0v-6h4v6" /> },
  { id: "map", label: "World Map", icon: <path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6zm5 0v14m6-12v14" /> },
  { id: "market", label: "Market", icon: <path d="M4 9h16l-2 11H6L4 9zm2-4h12v4H6V5z" /> },
  { id: "workshop", label: "Workshop", icon: <path d="M4 18h16v2H4v-2zM7 16l5-8 2 2-5 8-2-2zm7-7 4 4-2 2-4-4 2-2z" /> },
];

const MORE: { id: ScreenId; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "deed", label: "Charter" },
  { id: "takehome", label: "Take it home" },
  { id: "guild", label: "Guild · simulated" },
  { id: "week", label: "A week of raids · simulated" },
  { id: "menu", label: "Entrance" },
];

function primaryOf(screen: ScreenId): ScreenId | null {
  if (screen === "market") return "market";
  if (screen === "workshop") return "workshop";
  if (screen === "map" || screen === "spectator" || screen === "public") return "map";
  if (screen === "dungeon" || screen === "home" || screen === "gate" || screen === "report" || screen === "chronicle" || screen === "registry") return "dungeon";
  return null;
}

export function Shell({ screen }: { screen: ScreenId }) {
  const [open, setOpen] = useState(false);
  const active = primaryOf(screen);
  function go(id: ScreenId) {
    sfx.ui();
    setOpen(false);
    setScreen(id);
  }
  return (
    <aside className="z-30 flex h-full w-[4.5rem] shrink-0 flex-col border-r border-gold/20 bg-ink/95 pb-[env(safe-area-inset-bottom)] md:w-56">
      <p className="hidden px-4 pb-1 pt-5 font-display text-lg tracking-[0.12em] text-gold md:block">UNDERREALM</p>
      <p className="hidden px-4 pb-3 text-[11px] leading-snug text-parchment/70 md:block">Guest — progress is saved on this device until you sign in.</p>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Game">
        {LINKS.map((link) => {
          const current = active === link.id;
          return (
            <button
              key={link.id}
              title={link.label}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center gap-3 rounded-hud px-2 text-left font-display tracking-wide md:justify-start md:px-3 ${current ? "bg-gold text-ink shadow-[inset_0_-2px_0_rgba(58,42,26,0.45)]" : "text-parchment/80 hover:bg-panel hover:text-gold"}`}
              onClick={() => go(link.id)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{link.icon}</svg>
              <span className="hidden md:inline">{link.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="relative border-t border-gold/20 p-2">
        <p className="mb-2 px-1 text-[10px] leading-snug text-parchment/70 md:hidden">Guest save on this device.</p>
        <button className="flex min-h-11 w-full items-center justify-center gap-3 rounded-2xl px-2 text-sm text-parchment/80 hover:bg-white/5 hover:text-gold md:justify-start md:px-3" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 4h2m10 0h2M12 5v2m0 10v2" /></svg>
          <span className="hidden md:inline">More</span>
        </button>
        {open && (
          <div className="absolute bottom-16 left-2 z-40 w-56 rounded-2xl border border-gold/30 bg-ink p-2 shadow-panel" role="menu">
            {MORE.map((item) => (
              <button key={item.id} className="block min-h-11 w-full rounded-xl px-3 text-left text-sm text-parchment hover:bg-white/5 hover:text-gold" role="menuitem" onClick={() => go(item.id)}>{item.label}</button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
