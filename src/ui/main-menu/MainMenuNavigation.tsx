import type { ScreenId } from "../../game/content";
import { newGame, setScreen } from "../../game/store";
import { sfx } from "../../game/audio";
import { Logo } from "./Logo";

const LINKS: { id: ScreenId; label: string }[] = [
  { id: "menu", label: "Home" },
  { id: "dungeon", label: "Raid" },
  { id: "market", label: "Market" },
  { id: "workshop", label: "Workshop" },
  { id: "registry", label: "Agents" },
  { id: "chronicle", label: "Lore" },
];

export function MainMenuNavigation({ active, continueReady }: { active: ScreenId; continueReady: boolean }) {
  function go(id: ScreenId) {
    sfx.ui();
    setScreen(id === "menu" ? "menu" : "home");
  }
  return (
    <header className="menu-bit pointer-events-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
      <button onClick={() => go("menu")} aria-label="Home">
        <Logo compact />
      </button>
      <nav className="flex flex-wrap justify-center gap-1 text-[11px] uppercase tracking-[0.16em]">
        {LINKS.map((link) => (
          <button key={link.id} className={`rounded-full px-3 py-1 ${active === link.id ? "bg-gold text-ink" : "text-parchment/80 hover:text-gold"}`} onClick={() => go(link.id)}>
            {link.label}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
        <button className="rounded-full px-3 py-1 text-parchment/80 hover:text-gold" onClick={() => go("settings")}>Settings</button>
        <button className="rounded-full px-3 py-1 text-parchment/80 hover:text-gold" onClick={() => go("registry")}>Profile</button>
        {continueReady ? (
          <button className="rounded-full border border-gold/40 px-3 py-1 text-gold" onClick={() => { sfx.ui(); newGame(); }}>New game</button>
        ) : null}
      </div>
    </header>
  );
}
