import { AGENTS, GOODS, MARKET, RECIPES, type Currency, type ItemClass } from "../../../rules/economy";
import { buybackPrice, canReopen, canTrade, craftClass, feeSplit, liveQuote, rumourPrice, shopState } from "../rules/money";
import type { Listing, MerchantState, SaveData } from "./types";

export function itemClass(save: SaveData, itemId: string): ItemClass {
  if (save.classes?.[itemId]) return save.classes[itemId];
  if (itemId in GOODS) return GOODS[itemId as keyof typeof GOODS].cls;
  if (itemId.startsWith("nb:")) return "NEAR_BACKED";
  if (itemId.startsWith("play:")) return "PLAY_ONLY";
  if (itemId === "cinder" || itemId.startsWith("rumour") || itemId.startsWith("blueprint")) return "NON_TRADEABLE";
  return "PLAY_ONLY";
}

export function merchantNear(merchant: MerchantState) {
  return merchant.near ?? AGENTS.merchant.startNEAR;
}

export function stockTotals(merchant: MerchantState) {
  const held = merchant.stock.reduce((sum, line) => sum + line.qty, 0);
  const target = merchant.stock.reduce((sum, line) => {
    if (line.itemId in GOODS) return sum + GOODS[line.itemId as keyof typeof GOODS].target;
    return sum + line.qty;
  }, 0);
  return { held, target };
}

export function merchantStatus(merchant: MerchantState) {
  const { held, target } = stockTotals(merchant);
  return shopState(merchantNear(merchant), held, target, merchant.id !== "orrin");
}

function note(save: SaveData, id: string, text: string): SaveData {
  return { ...save, ledger: [{ id, day: save.day, text }, ...save.ledger] };
}

export function listForSale(save: SaveData, itemId: string, price: number, currency: Currency): { save: SaveData; ok: boolean; reason: string } {
  const cls = itemClass(save, itemId);
  if (!canTrade(cls, currency)) {
    return { save, ok: false, reason: `Purchase rejected: this item is ${cls} and cannot be sold for ${currency}.` };
  }
  const owned = save.inventory[itemId] ?? 0;
  if (owned < 1 || price <= 0) return { save, ok: false, reason: "Nothing to list at that price." };
  const open = save.listings.filter((entry) => (entry.status ?? "LISTED") === "LISTED" && entry.seller === "player");
  if (open.length >= MARKET.maxListingsPerAccount) return { save, ok: false, reason: "Five listings is the cap." };
  const listing: Listing = {
    id: `list-${save.day}-${itemId}-${open.length}-${currency}`,
    itemId,
    seller: "player",
    price,
    qty: 1,
    listedDay: save.day,
    currency,
    cls,
    status: "LISTED",
  };
  return {
    ok: true,
    reason: `Listed in escrow for ${price} ${currency}. Fee on a sale is 90/5/5. It returns after one day if nobody buys it.`,
    save: note({
      ...save,
      inventory: { ...save.inventory, [itemId]: owned - 1 },
      listings: [listing, ...save.listings],
    }, listing.id, `Escrowed ${itemId} at ${price} ${currency}. Class ${cls}.`),
  };
}

export function cancelSale(save: SaveData, id: string): { save: SaveData; ok: boolean; reason: string } {
  const listing = save.listings.find((entry) => entry.id === id && (entry.status ?? "LISTED") === "LISTED");
  if (!listing || listing.seller !== "player") return { save, ok: false, reason: "No open listing to cancel." };
  return {
    ok: true,
    reason: "Item returned. No fee.",
    save: note({
      ...save,
      inventory: { ...save.inventory, [listing.itemId]: (save.inventory[listing.itemId] ?? 0) + listing.qty },
      listings: save.listings.map((entry) => entry.id === id ? { ...entry, status: "CANCELLED" as const } : entry),
    }, `cancel-${id}`, `Cancelled ${listing.itemId}. The item left escrow.`),
  };
}

export function expireSales(save: SaveData): SaveData {
  let next = save;
  for (const listing of save.listings) {
    if ((listing.status ?? "LISTED") !== "LISTED") continue;
    if ((listing.listedDay ?? save.day) >= save.day) continue;
    const owner = listing.seller === "player" ? next.inventory : next.inventory;
    next = {
      ...next,
      inventory: listing.seller === "player" ? { ...owner, [listing.itemId]: (owner[listing.itemId] ?? 0) + listing.qty } : owner,
      listings: next.listings.map((entry) => entry.id === listing.id ? { ...entry, status: "EXPIRED" as const } : entry),
      ledger: [{ id: `expire-${listing.id}`, day: save.day, text: `${listing.itemId} expired after ${MARKET.expiryHours} hours. It was returned. No fee.` }, ...next.ledger],
    };
  }
  return next;
}

export function buySale(save: SaveData, id: string, fail = false): { save: SaveData; ok: boolean; reason: string } {
  const listing = save.listings.find((entry) => entry.id === id);
  if (!listing || (listing.status ?? "LISTED") !== "LISTED") return { save, ok: false, reason: "That listing is not open." };
  if ((listing.listedDay ?? save.day) < save.day) {
    const expired = expireSales({ ...save, day: save.day });
    return { save: expired, ok: false, reason: "Listing expired. The item was returned. No fee." };
  }
  const currency = listing.currency ?? "PLAY_GOLD";
  const cls = listing.cls ?? itemClass(save, listing.itemId);
  if (!canTrade(cls, currency)) return { save, ok: false, reason: `Purchase rejected: this item is ${cls} and cannot be sold for ${currency}.` };
  const same = save.listings.filter((entry) => (entry.status ?? "LISTED") === "LISTED" && entry.itemId === listing.itemId && (entry.currency ?? "PLAY_GOLD") === currency);
  const cheapest = [...same].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))[0];
  if (cheapest && cheapest.id !== listing.id) {
    return { save, ok: false, reason: `A cheaper eligible listing won at ${cheapest.price} ${currency}.` };
  }
  const purse = currency === "NEAR" ? (save.near ?? 0) : save.gold;
  if (purse + 1e-9 < listing.price) return { save, ok: false, reason: `Not enough ${currency}. The purchase was rejected and nothing was taken.` };
  const split = feeSplit(listing.price);
  if (fail) {
    return { save, ok: false, reason: "Settlement failed. The mock payment was refunded and the item stays in escrow." };
  }
  const paid = currency === "NEAR"
    ? { ...save, near: (save.near ?? 0) - listing.price }
    : { ...save, gold: save.gold - listing.price };
  const sellerIsPlayer = listing.seller === "player";
  const next: SaveData = {
    ...paid,
    gold: sellerIsPlayer && currency === "PLAY_GOLD" ? paid.gold + split.seller : paid.gold,
    near: sellerIsPlayer && currency === "NEAR" ? (paid.near ?? 0) + split.seller : paid.near,
    travelerGold: sellerIsPlayer ? paid.travelerGold : (paid.travelerGold ?? 0) + (currency === "PLAY_GOLD" ? split.seller : 0),
    guildGold: (paid.guildGold ?? 0) + (currency === "PLAY_GOLD" ? split.guild : 0),
    opsGold: (paid.opsGold ?? 0) + (currency === "PLAY_GOLD" ? split.ops : 0),
    inventory: sellerIsPlayer ? paid.inventory : { ...paid.inventory, [listing.itemId]: (paid.inventory[listing.itemId] ?? 0) + listing.qty },
    classes: { ...paid.classes, [listing.itemId]: cls },
    listings: paid.listings.map((entry) => entry.id === id ? { ...entry, status: "SOLD" as const } : entry),
  };
  return {
    ok: true,
    reason: `Settled ${listing.price} ${currency}. Seller ${split.seller.toFixed(4)}, guild ${split.guild.toFixed(4)}, ops ${split.ops.toFixed(4)}.`,
    save: note(next, `sold-${id}`, `Bought ${listing.itemId}. Seller 90, guild 5, ops 5.`),
  };
}

export function merchantBuyListing(save: SaveData): SaveData {
  let next = save;
  const open = next.listings.filter((entry) => (entry.status ?? "LISTED") === "LISTED" && entry.seller === "player" && (entry.currency ?? "PLAY_GOLD") === "PLAY_GOLD");
  const ranked = [...open].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  const won = new Set<string>();
  for (const listing of ranked) {
    if (won.has(listing.itemId)) continue;
    const merchantId = listing.itemId.startsWith("nb:gear") || listing.itemId === "potion" || listing.itemId === "armor" || listing.itemId === "boots" ? "tallow" : "mira";
    const merchant = next.merchants[merchantId];
    const line = merchant.stock.find((entry) => entry.itemId === listing.itemId);
    const stock = line?.qty ?? (listing.itemId in GOODS ? GOODS[listing.itemId as keyof typeof GOODS].target : 1);
    const buys = merchant.quoteBook?.[listing.itemId]?.buys ?? 0;
    const sells = merchant.quoteBook?.[listing.itemId]?.sells ?? 0;
    const quote = listing.itemId in GOODS
      ? liveQuote(listing.itemId as keyof typeof GOODS, Math.max(stock, 1), buys, sells, buys + sells, merchant.quoteBook?.[listing.itemId])
      : null;
    const cap = quote ? quote.price : listing.price;
    const spent = merchant.spentTodayGold ?? 0;
    if (listing.price > cap + 1e-9) continue;
    if (merchant.gold + 1e-9 < listing.price) continue;
    if (listing.currency === "NEAR" && listing.price > AGENTS.merchant.maxSingle) continue;
    const split = feeSplit(listing.price);
    const stockNext = line
      ? merchant.stock.map((entry) => entry.itemId === listing.itemId ? { ...entry, qty: entry.qty + listing.qty } : entry)
      : [...merchant.stock, { itemId: listing.itemId, qty: listing.qty }];
    next = {
      ...next,
      gold: next.gold + split.seller,
      guildGold: (next.guildGold ?? 0) + split.guild,
      opsGold: (next.opsGold ?? 0) + split.ops,
      listings: next.listings.map((entry) => entry.id === listing.id ? { ...entry, status: "SOLD" as const } : entry),
      merchants: {
        ...next.merchants,
        [merchantId]: {
          ...merchant,
          gold: merchant.gold - listing.price,
          spentTodayGold: spent + listing.price,
          stock: stockNext,
          sales: merchant.sales + 1,
          history: [{ id: `npc-${listing.id}`, day: next.day, text: `${merchant.name} bought ${listing.itemId} for ${listing.price}. Seller ${split.seller}, guild ${split.guild}, ops ${split.ops}.` }, ...(merchant.history ?? [])],
        },
      },
      ledger: [{ id: `npc-${listing.id}`, day: next.day, text: `${merchant.name} bought ${listing.itemId} for ${listing.price} Gold. You received ${split.seller}. Guild ${split.guild}, ops ${split.ops}.` }, ...next.ledger],
    };
    won.add(listing.itemId);
  }
  return next;
}

export function recoverMerchant(save: SaveData, id: MerchantState["id"], near: number, itemId?: string, qty = 0): { save: SaveData; ok: boolean; reason: string } {
  const merchant = save.merchants[id];
  const funded = merchantNear(merchant) + near;
  const stock = itemId
    ? merchant.stock.some((line) => line.itemId === itemId)
      ? merchant.stock.map((line) => line.itemId === itemId ? { ...line, qty: line.qty + qty } : line)
      : [...merchant.stock, { itemId, qty }]
    : merchant.stock;
  const held = stock.reduce((sum, line) => sum + line.qty, 0);
  const nextMerchant = { ...merchant, near: funded, stock, history: [{ id: `recover-${id}-${save.day}`, day: save.day, text: `Recovery added ${near} mock NEAR${itemId ? ` and ${qty} ${itemId}` : ""}.` }, ...(merchant.history ?? [])] };
  const open = canReopen(funded, held, id !== "orrin");
  return {
    ok: open,
    reason: open ? `${merchant.name} is open again. Cash ${funded.toFixed(4)} and stock ${held}.` : `${merchant.name} stays closed until cash is at least ${0.02} and stock is at least 1.`,
    save: {
      ...save,
      merchants: { ...save.merchants, [id]: nextMerchant },
      ledger: [{ id: `recover-${id}-${save.day}-${near}`, day: save.day, text: open ? `${merchant.name} reopened.` : `${merchant.name} took the funds and is still closed.` }, ...save.ledger],
    },
  };
}

export function rumourAsk(sales: number, epochs: number, tier: number) {
  return rumourPrice(sales, epochs, tier);
}

export function rumourBuyback(lastPrice: number, times: number) {
  return buybackPrice(lastPrice, times);
}

export function craftOutputClass(inputs: ItemClass[]) {
  return craftClass(inputs);
}

export function recipeInputs(id: keyof typeof RECIPES) {
  const recipe = RECIPES[id];
  return Object.entries(recipe).filter(([key]) => key !== "cls") as [string, number][];
}
