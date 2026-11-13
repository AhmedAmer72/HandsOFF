import { useEffect, useRef, useState } from "react";
import { GOODS, RECIPES, RAID } from "../../../rules/economy";
import { goodsRule } from "../../game/config/economyRules";
import { RULES } from "../../game/config/gameRules";
import { quotePrice } from "../../game/engine/pricing";
import {
  buyBackOnChain,
  buyStallOnChain,
  buyUpgrade,
  cancelListingOnChain,
  craftOnChain,
  forgeKit,
  listOnChain,
  setScreen,
  supplyOnChain,
  useGame,
} from "../../game/store";
import { MARKET_SPOTS, WORKSHOP_SPOTS, mountPlace } from "../../three/places";
import { Prompt } from "../forge/controls";
import { GameIcon, ItemSlot } from "../pack/components";
import { TRAP_ICON, ui } from "../pack/urls";
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
        {!open && <Prompt className="mt-2" testId={spot ? "interact-prompt" : "place-controls"}>{spot ? spot.prompt : "WASD moves. Q and C turn. E talks when you are close. R resets the view."}</Prompt>}
      </div>
      {open && (
        <div className="absolute bottom-3 right-3 top-16 z-20 w-[min(24rem,calc(100%-1.5rem))] overflow-auto" data-testid={`${place}-panel`}>
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2">
                <GameIcon src={place === "market" ? ui.icon.market : ui.icon.anvil} />
                <Title>{spot?.label ?? "Stall"}</Title>
              </span>
              <Button tone="ghost" onClick={() => setOpen(null)}><GameIcon src={ui.icon.close} /> Close</Button>
            </div>
            {note && <p className="mt-2 text-sm text-gold" data-testid="stall-note">{note}</p>}
            {place === "market" && open !== "board" && open !== "exit" && (
              <MerchantSheet merchant={open as "mira" | "orrin" | "tallow"} onNote={setNote} />
            )}
            {place === "market" && open === "board" && <ListingSheet onNote={setNote} />}
            {place === "workshop" && <CraftSheet station={open} onNote={setNote} />}
            <p className="mt-3 text-xs text-parchment/60">Hall gold {game.gold.toFixed(0)}. NEAR moves only on game.neocrafts.testnet.</p>
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
      <p>{stall.role}. Hall gold {stall.gold.toFixed(0)}. Salvage supply and NEAR gear are signed on testnet.</p>
      {merchant === "mira" && (
        <div className="flex flex-wrap gap-2">
          {(["iron", "ash", "bone"] as const).map((kind) => (
            <Button key={kind} tone="ghost" onClick={() => void supplyOnChain(1, kind).then((result) => onNote(result.reason))}>Supply 1 {kind}</Button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {stall.stock.map((line) => {
          const quote = quotePrice(line.itemId, line.qty);
          const currency = line.itemId in GOODS ? GOODS[line.itemId as keyof typeof GOODS].currency : "PLAY_GOLD";
          return (
            <li key={line.itemId} className="flex flex-wrap items-center justify-between gap-2">
              <span className="num">{itemLabel(line.itemId)} · {line.qty} · {quote.price < 1 ? quote.price.toFixed(4) : quote.price.toFixed(2)} {currency === "NEAR" ? "NEAR" : "hall gold"}</span>
              <Button onClick={() => void buyStallOnChain(merchant, line.itemId).then((result) => onNote(result.reason))}>Buy</Button>
            </li>
          );
        })}
        {stall.rumours.map((rumour) => (
          <li key={rumour.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>{rumour.text}</span>
            <Button onClick={() => void buyBackOnChain(rumour.id).then((result) => onNote(result.reason))}>Buy back</Button>
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
  const [chainListings, setChainListings] = useState<{ id: string; label: string }[]>([]);
  return (
    <div className="mt-3 space-y-2 text-sm">
      <p>Listings are escrow on game.neocrafts.testnet. A play-gold sale pays the seller 90, the guild 5, and ops 5.</p>
      {chainListings.map((listing) => (
        <div key={listing.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>{listing.label}</span>
          <Button tone="ghost" onClick={() => void cancelListingOnChain(listing.id).then((result) => onNote(result.reason))}>Cancel</Button>
        </div>
      ))}
      {chainListings.length === 0 && <p>No testnet listing from this desk yet.</p>}
      <label className="block">Gold ask
        <input className="control ml-2 w-24" type="number" min={1} value={price} onChange={(event) => setPrice(Number(event.target.value))} />
      </label>
      {Object.entries(game.inventory).filter(([, qty]) => qty > 0).map(([id, qty]) => (
        <div key={id} className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2"><ItemSlot><span className="num text-xs">{qty}</span></ItemSlot>{itemLabel(id)} × {qty}</span>
          <Button tone="ghost" onClick={() => void listOnChain(id, price, "PLAY_GOLD").then((result) => {
            onNote(result.reason);
            if (result.ok && "id" in result && result.id) setChainListings((rows) => [...rows, { id: result.id, label: `${itemLabel(id)} · ${price} PLAY_GOLD` }]);
          })}>List on testnet</Button>
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
        return (
          <div key={kind}>
            <p className="flex items-center gap-2 font-display text-gold">
              {(kind === "spike" || kind === "pit" || kind === "boulder") && <GameIcon src={TRAP_ICON[kind]} />}
              {kind === "armor" && <GameIcon src={ui.icon.helmet} />}
              {kind}
            </p>
            <ul>
              {needs.map(([material, qty]) => {
                const held = game.inventory[material] ?? 0;
                return <li key={material} className={held >= qty ? "text-emerald-300" : "text-red-300"}>{material} {held}/{qty}</li>;
              })}
            </ul>
            <Button onClick={() => void craftOnChain(kind).then((result) => onNote(result.reason))}>Craft on testnet</Button>
          </div>
        );
      })}
      {station === "forge" && (
        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" onClick={() => onNote(forgeKit().reason)}><GameIcon src={ui.icon.spike} /> Forge spike kit · 4 nails</Button>
          <Button tone="ghost" onClick={() => onNote(buyUpgrade("vault-brace").reason)}>Vault brace · {RULES.vaultBraceCost}g</Button>
        </div>
      )}
      <p className="text-xs text-parchment/60">Cinder {game.cinder}. Raid burn still costs {RAID.cinder.burnCost}.</p>
    </div>
  );
}
