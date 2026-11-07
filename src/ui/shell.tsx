import { useState } from "react";
import type { ScreenId } from "../game/content";
import { setScreen } from "../game/store";
import { sfx } from "../game/audio";

const LINKS: { id: ScreenId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "dungeon", label: "Raid" },
  { id: "gate", label: "Gate" },
  { id: "workshop", label: "Workshop" },
  { id: "market", label: "Market" },
  { id: "map", label: "Map" },
  { id: "registry", label: "Heroes" },
  { id: "chronicle", label: "Replay" },
  { id: "week", label: "Week" },
  { id: "deed", label: "Charter" },
  { id: "guild", label: "Guild" },
  { id: "takehome", label: "Take home" },
  { id: "settings", label: "Settings" },
];

export function Shell({ screen }: { screen: ScreenId }) {
  const [open, setOpen] = useState(false);
  function go(id: ScreenId) {
    sfx.ui();
    setScreen(id);
    setOpen(false);
  }
  return (
    <header className="z-30 border-b border-gold/20 bg-ink/90 px-3 py-2 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button className="font-display text-lg tracking-[0.18em] text-gold" onClick={() => go("home")}>UNDERREALM</button>
        <nav className="hidden flex-wrap justify-end gap-1 lg:flex">
          {LINKS.map((link) => (
            <button key={link.id} className={`min-h-11 rounded-2xl px-3 text-xs uppercase tracking-[0.12em] ${screen === link.id ? "bg-gold text-ink" : "text-parchment/80 hover:bg-white/5 hover:text-gold"}`} onClick={() => go(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>
        <button className="min-h-11 rounded-2xl border border-gold/40 px-3 text-sm text-gold lg:hidden" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <nav className="mt-2 grid grid-cols-2 gap-2 lg:hidden">
          {LINKS.map((link) => (
            <button key={link.id} className={`min-h-11 rounded-2xl px-3 text-left text-sm ${screen === link.id ? "bg-gold text-ink" : "border border-gold/20 text-parchment"}`} onClick={() => go(link.id)}>
              {link.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
