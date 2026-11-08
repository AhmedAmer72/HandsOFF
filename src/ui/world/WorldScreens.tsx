import { useEffect, useMemo, useRef, useState } from "react";
import { leaveWatch, publishHall, setScreen, switchKeeper, unpublishCurrent, useGame, watchRaid } from "../../game/store";
import { getActivity, listPublic, loadRegistry, padPosition, readRegistry, type HallQuery, type PublicDungeon } from "../../game/world/registry";
import { mountDiorama, type MapMarker } from "../../three/diorama";
import { Button, Chip, Field, Panel, Title } from "../kit";

export function WorldMap() {
  const game = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [tier, setTier] = useState<HallQuery["tier"]>("any");
  const [stateFilter, setStateFilter] = useState<HallQuery["state"]>("any");
  const [activity, setActivity] = useState<HallQuery["activity"]>("any");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keeperId, setKeeperId] = useState("");
  const [keeperName, setKeeperName] = useState("");
  const [hallName, setHallName] = useState(game.dungeonName ?? "Ashgate");
  const [blurb, setBlurb] = useState(game.dungeonDescription ?? "");
  const [shownName, setShownName] = useState(game.displayName ?? "");
  const [note, setNote] = useState("");
  const [labels, setLabels] = useState<Array<{ id: string; name: string; x: number; y: number }>>([]);
  const markersRef = useRef<MapMarker[]>([]);
  const selectRef = useRef(setSelectedId);
  selectRef.current = setSelectedId;

  const query = useMemo<HallQuery>(() => ({ name, owner, tier, state: stateFilter, activity }), [name, owner, tier, stateFilter, activity]);
  const board = useMemo(() => {
    loadRegistry();
    return listPublic(readRegistry(), query, 0, 24);
  }, [query, game.catalogNonce, game.dungeonPublished, game.dungeonClosed, game.raidsCleared]);
  const selected = board.halls.find((hall) => hall.dungeonId === selectedId) ?? null;
  markersRef.current = board.halls.map((hall) => {
    const pad = padPosition(hall.pad);
    return {
      id: hall.dungeonId,
      name: hall.name,
      x: pad.x,
      z: pad.z,
      state: hall.state,
      active: hall.activeRaidCount > 0,
      traffic: hall.heroTraffic,
      own: hall.ownerId === (game.ownerId || "keeper-local"),
      tier: hall.tier,
    };
  });

  useEffect(() => {
    setHallName(game.dungeonName ?? "Ashgate");
    setBlurb(game.dungeonDescription ?? "");
    setShownName(game.displayName ?? "");
    setSelectedId(null);
  }, [game.ownerId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const view = mountDiorama(canvas, {
      getMarkers: () => markersRef.current,
      getQuality: () => game.quality,
      getReduceMotion: () => Boolean(game.reduceMotion),
      onSelect: (id) => selectRef.current(id),
      onLabels: (next) => {
        setLabels((current) => {
          if (current.length === next.length && current.every((label, index) => label.id === next[index].id && Math.abs(label.x - next[index].x) < 2 && Math.abs(label.y - next[index].y) < 2)) return current;
          return next;
        });
      },
    });
    return () => view.dispose();
  }, [game.quality, game.reduceMotion]);

  return (
    <section className="relative h-full min-h-[70vh]">
      <canvas ref={canvasRef} data-testid="world-map" className="view h-full min-h-[70vh] w-full" />
      {labels.map((label) => (
        <button key={label.id} data-testid="dungeon-marker" className="absolute z-10 -translate-x-1/2 rounded-full bg-ink/80 px-2 py-1 text-xs text-gold" style={{ left: label.x, top: label.y }} onClick={() => setSelectedId(label.id)}>
          {label.name}
        </button>
      ))}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
        <div className="pointer-events-auto flex flex-wrap items-end gap-2 rounded-2xl bg-ink/80 p-3" data-testid="map-filters">
          <Field label="Name"><input className="w-28 rounded-xl bg-black/40 px-2 py-2" value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Owner"><input className="w-28 rounded-xl bg-black/40 px-2 py-2" value={owner} onChange={(event) => setOwner(event.target.value)} /></Field>
          <Field label="Tier">
            <select className="rounded-xl bg-black/40 px-2 py-2" value={String(tier)} onChange={(event) => setTier(event.target.value === "any" ? "any" : Number(event.target.value))}>
              <option value="any">Any</option>
              {[1, 2, 3, 4].map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </Field>
          <Field label="Gate">
            <select className="rounded-xl bg-black/40 px-2 py-2" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as HallQuery["state"])}>
              <option value="any">Any</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </Field>
          <Field label="Activity">
            <select className="rounded-xl bg-black/40 px-2 py-2" value={activity} onChange={(event) => setActivity(event.target.value as HallQuery["activity"])}>
              <option value="any">Any</option>
              <option value="active">Live raid</option>
              <option value="quiet">Quiet</option>
            </select>
          </Field>
          <p className="pb-2 text-xs text-parchment/70" data-testid="hall-count">{board.total} public {board.total === 1 ? "hall" : "halls"}</p>
        </div>
        <div className="pointer-events-auto grid gap-3 lg:grid-cols-[280px_1fr]">
          <Panel>
            <p className="font-display text-gold">{game.displayName}</p>
            <p className="text-xs text-parchment/70">{game.dungeonPublished ? "Your hall is public." : "Your hall is still a draft."}</p>
            <Field label="Public name"><input data-testid="publish-name" className="w-full rounded-xl bg-black/40 px-2 py-2" value={hallName} onChange={(event) => setHallName(event.target.value)} /></Field>
            <Field label="Description"><input className="w-full rounded-xl bg-black/40 px-2 py-2" value={blurb} onChange={(event) => setBlurb(event.target.value)} /></Field>
            <Field label="Your name"><input className="w-full rounded-xl bg-black/40 px-2 py-2" value={shownName} onChange={(event) => setShownName(event.target.value)} /></Field>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button onClick={() => { setNote(publishHall(hallName, blurb, shownName).reason); setSelectedId(`hall:${game.ownerId || "keeper-local"}`); }}>Publish</Button>
              {game.dungeonPublished && <Button tone="ghost" onClick={() => setNote(unpublishCurrent().reason)}>Unpublish</Button>}
            </div>
            <Field label="Sit as another keeper"><input data-testid="keeper-id" className="w-full rounded-xl bg-black/40 px-2 py-2" value={keeperId} placeholder="keeper-b" onChange={(event) => setKeeperId(event.target.value)} /></Field>
            <Field label="Their name"><input data-testid="keeper-name" className="w-full rounded-xl bg-black/40 px-2 py-2" value={keeperName} onChange={(event) => setKeeperName(event.target.value)} /></Field>
            <Button tone="ghost" className="mt-2" onClick={() => setNote(switchKeeper(keeperId, keeperName || keeperId).reason)}>Switch keeper</Button>
            {note && <p className="mt-2 text-sm text-gold">{note}</p>}
          </Panel>
          {selected && <PublicCard hall={selected} own={selected.ownerId === (game.ownerId || "keeper-local")} onClose={() => setSelectedId(null)} />}
        </div>
      </div>
    </section>
  );
}

function PublicCard({ hall, own, onClose }: { hall: PublicDungeon; own: boolean; onClose: () => void }) {
  return (
    <div data-testid="public-dungeon">
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <Title>{hall.name}</Title>
        <Button tone="ghost" onClick={onClose}>Close</Button>
      </div>
      <p className="text-sm">{hall.description || "No public description."}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip>Owner {hall.displayName}</Chip>
        <Chip>Tier {hall.tier}</Chip>
        <Chip hot={hall.state === "CLOSED"}>{hall.state === "CLOSED" ? "Closed" : "Open"}</Chip>
        <Chip>Raids settled {hall.raidCount}</Chip>
        <Chip>Hero traffic {hall.heroTraffic}</Chip>
        <Chip>{hall.activeRaidCount > 0 ? "Live raid" : "No live raid"}</Chip>
      </div>
      <p className="mt-2 text-sm">Mira {hall.merchantStates.mira} · Orrin {hall.merchantStates.orrin} · Tallow {hall.merchantStates.tallow}</p>
      {hall.lastRaidSummary && <p className="mt-2 text-sm text-parchment/80">{hall.lastRaidSummary}</p>}
      <p className="mt-2 text-xs text-parchment/60">Trap locations stay off this page. Heroes still learn a hall by watching it, buying a rumour, or dying in it.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={hall.activeRaidCount < 1} onClick={() => watchRaid(hall.dungeonId)}>{hall.activeRaidCount > 0 ? "Watch raid" : "No live raid"}</Button>
        {own && <Button tone="ghost" onClick={() => setScreen("dungeon")}>Open your hall</Button>}
        {own && <Button tone="ghost" onClick={() => setScreen("deed")}>Charter</Button>}
      </div>
    </Panel>
    </div>
  );
}

export function SpectatorScreen() {
  const game = useGame();
  const activity = game.spectatorDungeonId ? getActivity(readRegistry(), game.spectatorDungeonId) : null;
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || !activity?.events.length) return;
    const timer = window.setInterval(() => {
      setCursor((value) => (value + 1) % activity.events.length);
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing, activity]);
  const event = activity?.events[cursor];
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4" data-testid="spectator">
      <p className="text-xs uppercase tracking-[0.16em] text-gold">Watching</p>
      <Title>Spectator</Title>
      <p className="text-sm text-parchment/75">You can follow the hero. You cannot place traps, trigger them, burn a page, or spend this hall's gold.</p>
      {!activity && <p>That raid is no longer on the board.</p>}
      {activity && (
        <Panel>
          <p className="font-display text-2xl text-gold">{activity.heroId ?? "Hero"}</p>
          <p className="mt-2 text-sm" data-testid="spectator-line">{event?.text ?? "The raid has no steps yet."}</p>
          <p className="mt-2 text-xs text-parchment/60">Step {activity.events.length ? cursor + 1 : 0} of {activity.events.length}. Outcome {activity.outcomeHash ?? "not settled"}.</p>
        </Panel>
      )}
      <div className="flex flex-wrap gap-2">
        <Button tone="ghost" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</Button>
        <Button onClick={() => leaveWatch()}>Leave</Button>
      </div>
    </section>
  );
}
