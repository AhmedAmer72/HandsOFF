import { useEffect, useRef, useState } from "react";
import { GOODS, RECIPES, RAID } from "../../../rules/economy";
import { goodsRule } from "../../game/config/economyRules";
import { RULES } from "../../game/config/gameRules";
import { quotePrice } from "../../game/engine/pricing";
import {
  buyBackRumour,
  buyFromMerchant,
  buyListing,
  buyUpgrade,
  cancelListing,
  craftTrap,
  forgeKit,
  listItem,
  setScreen,
  supplyMaterial,
  useGame,
} from "../../game/store";
import { MARKET_SPOTS, WORKSHOP_SPOTS, mountPlace } from "../../three/places";
import { Button, Panel, Title } from "../kit";

function itemLabel(id: string) {
  return goodsRule(id)?.name ?? id.split(":").pop() ?? id;
}

export function MarketHall() {
  return <StallHall place="market" title="Market" />;
}

export function WorkshopHall() {
  return <StallHall place="workshop" title="Workshop" />;
}

function StallHall({ place, title }: { place: "market" | "workshop"; title: string }) {
  const game = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const openRef = useRef<string | null>(null);
  openRef.current = open;
  const spots = place === "market" ? MARKET_SPOTS : WORKSHOP_SPOTS;
  const spot = spots.find((entry) => entry.id === (open ?? near));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const view = mountPlace(canvas, {
      id: place,
      spots: place === "market" ? MARKET_SPOTS : WORKSHOP_SPOTS,
      getLocked: () => openRef.current != null,
      getQuality: () => game.quality,
      onNear: setNear,
      onUse: (id) => {
        if (id === "exit") setScreen("dungeon");
        else setOpen(id);
      },
    });
    return () => view.dispose();
  }, [place, game.quality]);

  return (
    <section className="relative h-full min-h-[70vh]">
      <canvas ref={canvasRef} data-testid={`${place}-hall`} className="view h-full min-h-[70vh] w-full" />
      <div className="pointer-events-none absolute left-3 top-3">
        <p className="font-display text-2xl text-gold">{title}</p>
        {!open && <p className="mt-2 max-w-xs rounded-2xl bg-ink/80 px-3 py-2 text-sm" data-testid={spot ? "interact-prompt" : "place-controls"}>{spot ? spot.prompt : "WASD moves. Q and C turn. E talks when you are close. R resets the view."}</p>}
      </div>
      {open && (
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[70%] overflow-auto p-3" data-testid={`${place}-panel`}>
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <Title>{spot?.label ?? "Stall"}</Title>
              <Button tone="ghost" onClick={() => setOpen(null)}>Close</Button>
            </div>
            {note && <p className="mt-2 text-sm text-gold" data-testid="stall-note">{note}</p>}
            {place === "market" && open !== "board" && open !== "exit" && (
              <MerchantSheet merchant={open as "mira" | "orrin" | "tallow"} onNote={setNote} />
            )}
            {place === "market" && open === "board" && <ListingSheet onNote={setNote} />}
            {place === "workshop" && <CraftSheet station={open} onNote={setNote} />}
            <p className="mt-3 text-xs text-parchment/60">Gold {game.gold.toFixed(0)} · small purse {(game.near ?? 0).toFixed(4)}</p>
          </Panel>
        </div>
      )}
    </section>
  );
}

function MerchantSheet({ merchant, onNote }: { merchant: "mira" | "orrin" | "tallow"; onNote: (text: string) => void }) {
  const game = useGame();
  const stall = game.merchants[merchant];
  return (
    <div className="mt-3 space-y-2 text-sm">
      <p>{stall.role}. Purse {stall.gold.toFixed(0)} gold · small purse {(stall.near ?? 0).toFixed(4)}.</p>
      {merchant === "mira" && (
        <div className="flex flex-wrap gap-2">
          {(["iron", "ash", "bone"] as const).map((kind) => (
            <Button key={kind} tone="ghost" onClick={() => onNote(supplyMaterial(kind, 1).reason)}>Supply 1 {kind}</Button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {stall.stock.map((line) => {
          const quote = quotePrice(line.itemId, line.qty);
          const currency = line.itemId in GOODS ? GOODS[line.itemId as keyof typeof GOODS].currency : "PLAY_GOLD";
          return (
            <li key={line.itemId} className="flex flex-wrap items-center justify-between gap-2">
              <span className="num">{itemLabel(line.itemId)} · {line.qty} · {quote.price < 1 ? quote.price.toFixed(4) : quote.price.toFixed(2)} {currency === "NEAR" ? "small purse" : "gold"}</span>
              <Button onClick={() => onNote(buyFromMerchant(merchant, line.itemId).reason ?? "")}>Buy</Button>
            </li>
          );
        })}
        {stall.rumours.map((rumour) => (
          <li key={rumour.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>{rumour.text}</span>
            <Button onClick={() => onNote(buyBackRumour(rumour.id).reason)}>Buy back</Button>
          </li>
        ))}
      </ul>
      {stall.stock.length === 0 && stall.rumours.length === 0 && <p>Nothing is on the stall.</p>}
    </div>
  );
}

function ListingSheet({ onNote }: { onNote: (text: string) => void }) {
  const game = useGame();
  const [price, setPrice] = useState(10);
  const open = game.listings.filter((listing) => (listing.status ?? "LISTED") === "LISTED");
  return (
    <div className="mt-3 space-y-2 text-sm">
      <p>A listing sits in escrow. A sale pays the seller 90, the guild 5, and ops 5.</p>
      {open.map((listing) => (
        <div key={listing.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>{itemLabel(listing.itemId)} · {listing.price} {listing.currency ?? "PLAY_GOLD"}</span>
          {listing.seller !== "player" && <Button onClick={() => onNote(buyListing(listing.id).reason ?? "")}>Buy</Button>}
          {listing.seller === "player" && <Button tone="ghost" onClick={() => onNote(cancelListing(listing.id).reason ?? "")}>Cancel</Button>}
        </div>
      ))}
      {open.length === 0 && <p>No listings.</p>}
      <label className="block">Gold ask
        <input className="ml-2 w-20 rounded-xl bg-black/40 px-2 py-1" type="number" min={1} value={price} onChange={(event) => setPrice(Number(event.target.value))} />
      </label>
      {Object.entries(game.inventory).filter(([, qty]) => qty > 0).map(([id, qty]) => (
        <div key={id} className="flex flex-wrap items-center justify-between gap-2">
          <span>{itemLabel(id)} × {qty}</span>
          <Button tone="ghost" onClick={() => onNote(listItem(id, price, "PLAY_GOLD").reason ?? "")}>List</Button>
        </div>
      ))}
    </div>
  );
}

function CraftSheet({ station, onNote }: { station: string; onNote: (text: string) => void }) {
  const game = useGame();
  const kinds = station === "anvil"
    ? (["spike", "pit", "boulder"] as const)
    : station === "bench"
      ? (["armor", "boots"] as const)
      : (["potion"] as const);
  return (
    <div className="mt-3 space-y-3 text-sm">
      {kinds.map((kind) => {
        const id = (kind === "potion" || kind === "armor" || kind === "boots" ? `play:gear:${kind}` : `play:trap:${kind}`) as keyof typeof RECIPES;
        const recipe = RECIPES[id];
        const needs = Object.entries(recipe).filter(([key]) => key !== "cls") as [string, number][];
        const missing = needs.filter(([material, qty]) => (game.inventory[material] ?? 0) < qty);
        return (
          <div key={kind}>
            <p className="font-display text-gold">{kind}</p>
            <ul>
              {needs.map(([material, qty]) => {
                const held = game.inventory[material] ?? 0;
                return <li key={material} className={held >= qty ? "text-emerald-300" : "text-red-300"}>{material} {held}/{qty}</li>;
              })}
            </ul>
            <Button disabled={missing.length > 0} onClick={() => onNote(craftTrap(kind).reason)}>Craft</Button>
          </div>
        );
      })}
      {station === "forge" && (
        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" onClick={() => onNote(forgeKit().reason)}>Forge spike kit · 4 nails</Button>
          <Button tone="ghost" onClick={() => onNote(buyUpgrade("vault-brace").reason)}>Vault brace · {RULES.vaultBraceCost}g</Button>
        </div>
      )}
      <p className="text-xs text-parchment/60">Cinder {game.cinder}. Raid burn still costs {RAID.cinder.burnCost}.</p>
    </div>
  );
}
