import type { SaveData } from "../../game/engine/types";

export function MainMenuStats({ game, continueReady }: { game: SaveData; continueReady: boolean }) {
  const heroes = Object.values(game.heroes).filter((hero) => hero.hp > 0).length;
  const wave = game.phase === "raid" ? "Inside" : game.phase === "diary" ? "The page" : game.phase === "report" ? "After the raid" : "Before the gate";
  const rows = [
    ["Treasury", String(game.vault)],
    ["World day", String(game.day)],
    ["Raid", wave],
    ["Heroes", String(heroes)],
    ["Cinder", String(game.cinder)],
    ["Reputation", String(game.reputation)],
  ];
  return (
    <aside className="menu-bit hud-glass w-full max-w-xs rounded-2xl p-4 text-sm">
      <div className="font-display text-gold">{continueReady ? "Ashgate" : "New dungeon"}</div>
      <ul className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center justify-between gap-3 border-b border-white/10 pb-1">
            <span className="text-parchment/70">{label}</span>
            <span className="font-display text-gold">{value}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
