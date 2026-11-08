import type { ScreenId } from "../game/content";
import { setScreen } from "../game/store";
import { sfx } from "../game/audio";

export function Shell({ screen }: { screen: ScreenId }) {
  function go(id: ScreenId) {
    sfx.ui();
    setScreen(id);
  }
  return (
    <header className="z-30 border-b border-gold/20 bg-ink/90 px-3 py-2 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button className="font-display text-lg tracking-[0.18em] text-gold" onClick={() => go("map")}>UNDERREALM</button>
        {screen !== "map" && (
          <button className="min-h-11 rounded-2xl bg-gold px-4 text-sm text-ink" onClick={() => go("map")}>Map</button>
        )}
      </div>
    </header>
  );
}
