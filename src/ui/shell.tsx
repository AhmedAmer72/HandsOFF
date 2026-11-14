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

function primaryOf(screen: ScreenId): ScreenId | null {
  if (screen === "market") return "market";
  if (screen === "workshop") return "workshop";
  if (screen === "map" || screen === "spectator" || screen === "public") return "map";
  if (screen === "dungeon" || screen === "home" || screen === "gate" || screen === "report" || screen === "chronicle" || screen === "registry" || screen === "deed" || screen === "guild" || screen === "takehome" || screen === "settings") return "dungeon";
  return null;
}

export function Shell({ screen }: { screen: ScreenId }) {
  const active = primaryOf(screen);
  function go(id: ScreenId) {
    sfx.ui();
    setScreen(id);
  }
  return (
    <aside className="z-30 flex h-full w-[4.5rem] shrink-0 flex-col border-r border-bronze/50 bg-steel pb-[env(safe-area-inset-bottom)] md:w-56">
      <p className="hidden px-4 pb-3 pt-5 font-display text-lg tracking-[0.12em] text-gold md:block">UNDERREALM</p>
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
    </aside>
  );
}
