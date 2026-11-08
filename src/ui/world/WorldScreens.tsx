import { useEffect, useMemo, useState } from "react";
import { HERO_PROFILES } from "../../game/config/heroProfiles";
import { fundRaidOffer, hallIdOf, leaveWatch, publishHall, setScreen, switchKeeper, unpublishCurrent, useGame, watchRaid } from "../../game/store";
import { getActivity, listPublic, loadRegistry, pullHalls, readRegistry, type HallQuery, type PublicDungeon } from "../../game/world/registry";
import { Button, Chip, Field, Panel, Title } from "../kit";

const SORTS: { id: NonNullable<HallQuery["sort"]>; label: string }[] = [
  { id: "recent", label: "Recently active" },
  { id: "raids", label: "Most settled raids" },
  { id: "tier-desc", label: "Highest tier" },
  { id: "tier-asc", label: "Lowest tier" },
  { id: "name", label: "Dungeon name" },
];

export function WorldMap() {
  const game = useGame();
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [tier, setTier] = useState<HallQuery["tier"]>("any");
  const [stateFilter, setStateFilter] = useState<HallQuery["state"]>("any");
  const [activity, setActivity] = useState<HallQuery["activity"]>("any");
  const [sort, setSort] = useState<NonNullable<HallQuery["sort"]>>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keeperId, setKeeperId] = useState("");
  const [keeperName, setKeeperName] = useState("");
  const [hallName, setHallName] = useState(game.dungeonName ?? "Ashgate");
  const [blurb, setBlurb] = useState(game.dungeonDescription ?? "");
  const [shownName, setShownName] = useState(game.displayName ?? "");
  const [note, setNote] = useState("");
  const [hallOpen, setHallOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    void pullHalls().then(() => {
      if (live) setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [game.catalogNonce]);

  useEffect(() => {
    setHallName(game.dungeonName ?? "Ashgate");
    setBlurb(game.dungeonDescription ?? "");
    setShownName(game.displayName ?? "");
  }, [game.ownerId, game.dungeonName, game.dungeonDescription, game.displayName]);

  const query = useMemo<HallQuery>(() => ({ name, owner, tier, state: stateFilter, activity, sort }), [name, owner, tier, stateFilter, activity, sort]);
  const board = useMemo(() => {
    loadRegistry();
    return listPublic(readRegistry(), query, 0, 100);
  }, [query, game.catalogNonce, game.dungeonPublished, game.dungeonClosed, game.raidsCleared, loaded]);
  const liveRaids = board.halls.filter((hall) => hall.activeRaidCount > 0).length;
  const selected = board.halls.find((hall) => hall.dungeonId === selectedId) ?? null;

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4 p-4" data-testid="dungeon-directory">
      <header>
        <h2 className="font-display text-4xl text-gold">World Map</h2>
        <p className="mt-2 max-w-[62ch] text-sm text-parchment/75">Discover dungeons across the Underrealm. Heroes raid them. You do not.</p>
        <p className="mt-2 text-sm text-parchment/70" data-testid="hall-count">{board.total} published {board.total === 1 ? "hall" : "halls"}. {liveRaids} live {liveRaids === 1 ? "raid" : "raids"}. Shared by browsers on this server. Not a mainnet.</p>
      </header>
      <div className="flex flex-wrap items-end gap-2" data-testid="map-filters">
        <Field label="Name"><input className="w-full min-w-36 rounded-xl bg-black/40 px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Owner"><input className="w-full min-w-36 rounded-xl bg-black/40 px-3 py-2" value={owner} onChange={(event) => setOwner(event.target.value)} /></Field>
        <Field label="Tier">
          <select className="min-h-11 rounded-xl bg-black/40 px-2" value={String(tier)} onChange={(event) => setTier(event.target.value === "any" ? "any" : Number(event.target.value))}>
            <option value="any">Any</option>
            {[1, 2, 3, 4].map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </Field>
        <Field label="Gate">
          <select className="min-h-11 rounded-xl bg-black/40 px-2" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as HallQuery["state"])}>
            <option value="any">Any</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </Field>
        <Field label="Activity">
          <select className="min-h-11 rounded-xl bg-black/40 px-2" value={activity} onChange={(event) => setActivity(event.target.value as HallQuery["activity"])}>
            <option value="any">Any</option>
            <option value="active">Live raid</option>
            <option value="quiet">Quiet</option>
          </select>
        </Field>
        <Field label="Sort">
          <select className="min-h-11 rounded-xl bg-black/40 px-2" value={sort} onChange={(event) => setSort(event.target.value as NonNullable<HallQuery["sort"]>)}>
            {SORTS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </Field>
      </div>
      {board.total === 0 && <p className="rounded-2xl border border-gold/20 px-4 py-6 text-sm text-parchment/70">No published hall matches. A draft stays with its owner.</p>}
      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <ul className="flex flex-col gap-2">
          {board.halls.map((hall) => (
            <li key={hall.dungeonId}>
              <button className={`min-h-11 w-full rounded-2xl border px-4 py-3 text-left ${selectedId === hall.dungeonId ? "border-gold bg-panel" : "border-gold/20 bg-ink/60"}`} data-testid="dungeon-row" onClick={() => setSelectedId(hall.dungeonId)}>
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-2xl text-gold">{hall.name}</span>
                  <span className={hall.state === "CLOSED" ? "text-blood" : "text-gold"}>{hall.state === "CLOSED" ? "Closed" : "Open"}</span>
                </span>
                <span className="mt-1 block text-sm text-parchment/75">Owner {hall.displayName} · Tier {hall.tier} · Settled raids {hall.raidCount} · Hero traffic {hall.heroTraffic}</span>
                <span className="mt-1 block text-sm">{hall.activeRaidCount > 0 ? "Live raid" : "No live raid"}</span>
              </button>
            </li>
          ))}
        </ul>
        <div>
          {selected && <PublicCard hall={selected} own={selected.ownerId === (game.ownerId || "keeper-local")} onClose={() => setSelectedId(null)} onNote={setNote} />}
          {!selected && <p className="text-sm text-parchment/60">Select a hall to read its public page.</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button tone="ghost" onClick={() => setHallOpen((value) => !value)}>{hallOpen ? "Close your hall" : "Your hall"}</Button>
        {note && <p className="text-sm text-gold">{note}</p>}
      </div>
      {hallOpen && (
        <Panel>
          <p className="font-display text-gold">{game.displayName}</p>
          <p className="text-xs text-parchment/70">{game.dungeonPublished ? "Your hall is public on this server." : "Your hall is still a draft."}</p>
          <Field label="Public name"><input data-testid="publish-name" className="w-full rounded-xl bg-black/40 px-2 py-2" value={hallName} onChange={(event) => setHallName(event.target.value)} /></Field>
          <Field label="Description"><input className="w-full rounded-xl bg-black/40 px-2 py-2" value={blurb} onChange={(event) => setBlurb(event.target.value)} /></Field>
          <Field label="Your name"><input className="w-full rounded-xl bg-black/40 px-2 py-2" value={shownName} onChange={(event) => setShownName(event.target.value)} /></Field>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={() => { const result = publishHall(hallName, blurb, shownName); setNote(result.reason); void pullHalls(); }}>Publish</Button>
            {game.dungeonPublished && <Button tone="ghost" onClick={() => { setNote(unpublishCurrent().reason); void pullHalls(); }}>Unpublish</Button>}
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ember">Mock · this device only</p>
          <Field label="Sit as another keeper"><input data-testid="keeper-id" className="w-full rounded-xl bg-black/40 px-2 py-2" value={keeperId} placeholder="keeper-b" onChange={(event) => setKeeperId(event.target.value)} /></Field>
          <Field label="Their name"><input data-testid="keeper-name" className="w-full rounded-xl bg-black/40 px-2 py-2" value={keeperName} onChange={(event) => setKeeperName(event.target.value)} /></Field>
          <Button tone="ghost" className="mt-2" onClick={() => setNote(switchKeeper(keeperId, keeperName || keeperId).reason)}>Switch keeper</Button>
        </Panel>
      )}
    </section>
  );
}

function PublicCard({ hall, own, onClose, onNote }: { hall: PublicDungeon; own: boolean; onClose: () => void; onNote: (text: string) => void }) {
  const mine = hall.dungeonId === hallIdOf(useGame());
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
        <p className="mt-2 text-xs text-parchment/60">Trap locations stay off this page.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={hall.activeRaidCount < 1} onClick={() => watchRaid(hall.dungeonId)}>{hall.activeRaidCount > 0 ? "Watch live raid" : "No live raid"}</Button>
          <Button tone="ghost" onClick={() => void fundRaidOffer(hall.dungeonId).then((result) => onNote(result.reason))}>Fund raid offer</Button>
          {(own || mine) && <Button tone="ghost" onClick={() => setScreen("dungeon")}>Open your hall</Button>}
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
  const [follow, setFollow] = useState(activity?.heroId ?? "kara");
  useEffect(() => {
    if (!playing || !activity?.events.length) return;
    const timer = window.setInterval(() => {
      setCursor((value) => (value + 1) % activity.events.length);
    }, 700);
    return () => window.clearInterval(timer);
  }, [playing, activity]);
  const event = activity?.events[cursor];
  const visible = !event || !activity?.heroId || activity.heroId === follow;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-4" data-testid="spectator">
      <p className="text-xs uppercase tracking-[0.16em] text-gold">Watching</p>
      <Title>Spectator</Title>
      <p className="text-sm text-parchment/75">You can follow the hero. You cannot place traps, trigger them, burn a page, or spend this hall's gold.</p>
      <div className="flex flex-wrap gap-2">
        {(["kara", "brann", "ivo"] as const).map((id) => (
          <Button key={id} tone={follow === id ? "gold" : "ghost"} onClick={() => setFollow(id)}>{HERO_PROFILES[id].name}</Button>
        ))}
      </div>
      {!activity && <p>That raid is no longer on the board.</p>}
      {activity && (
        <Panel>
          <p className="font-display text-2xl text-gold">{activity.heroId && activity.heroId in HERO_PROFILES ? `${HERO_PROFILES[activity.heroId as keyof typeof HERO_PROFILES].name} · ${HERO_PROFILES[activity.heroId as keyof typeof HERO_PROFILES].role}` : (activity.heroId ?? "Hero")}</p>
          <p className="mt-2 text-sm" data-testid="spectator-line">{visible ? (event?.text ?? "The raid has no steps yet.") : `${HERO_PROFILES[follow as keyof typeof HERO_PROFILES]?.name ?? follow} is not in this raid.`}</p>
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
