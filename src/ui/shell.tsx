import { useState } from "react";
import type { ScreenId } from "../game/content";
import { setScreen } from "../game/store";
import { sfx } from "../game/audio";
import { GameIcon } from "./pack/components";
import { ui } from "./pack/urls";

const LINKS: { id: ScreenId; label: string; icon: string }[] = [
  { id: "dungeon", label: "My Dungeon", icon: ui.icon.gate },
  { id: "map", label: "World Map", icon: ui.icon.dungeon },
  { id: "market", label: "Market", icon: ui.icon.market },
  { id: "workshop", label: "Workshop", icon: ui.icon.anvil },
];

const MORE: { id: ScreenId; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "deed", label: "Charter" },
  { id: "takehome", label: "Take it home" },
  { id: "guild", label: "Guild" },
  { id: "week", label: "Prices" },
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
    <aside className="z-30 flex h-full w-[4.5rem] shrink-0 flex-col border-r border-bronze/50 bg-steel pb-[env(safe-area-inset-bottom)] md:w-56">
      <p className="hidden px-4 pb-1 pt-5 font-display text-lg tracking-[0.12em] text-gold md:block">UNDERREALM</p>
      <p className="hidden px-4 pb-3 text-[11px] leading-snug text-parchment/70 md:block">Testnet keeper neocrafts.testnet. Raid calls attach no deposit.</p>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Game">
        {LINKS.map((link) => {
          const current = active === link.id;
          return (
            <button
              key={link.id}
              title={link.label}
              aria-current={current ? "page" : undefined}
              className={`nav-plate w-full ${current ? "is-on" : ""}`}
              onClick={() => go(link.id)}
            >
              <GameIcon src={link.icon} />
              <span className="hidden md:inline">{link.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="relative border-t border-bronze/40 p-2">
        <p className="mb-2 px-1 text-[10px] leading-snug text-parchment/70 md:hidden">Testnet · neocrafts.testnet</p>
        <button className={`nav-plate w-full ${open ? "is-on" : ""}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
          <GameIcon src={ui.icon.settings} />
          <span className="hidden md:inline">More</span>
        </button>
        {open && (
          <div className="plate-menu bottom-16 left-2 w-56" role="menu">
            {MORE.map((item) => (
              <button key={item.id} role="menuitem" onClick={() => go(item.id)}>{item.label}</button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
