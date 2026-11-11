# Ashgate plate

The interface is a set of struck plates: blackened steel for the hall and navigation, parchment ledgers for contracts and receipts, and stone tablets for the world-map list. Ornaments are original SVG marks. Prices, names, and counts stay real text.

## Pieces

- `marks.tsx` draws the coin, flame, cinder, trap, possess, pause, play, gear, shield, and wax-seal marks.
- `frame.tsx` is `ForgedFrame`. Corners are fixed rivets. The edge is an inset stroke. The center is a flat fill, so a plate can grow without stretching the rivets. Variants are `steel`, `ledger`, and `tablet`.
- `controls.tsx` is the control set: `SealButton`, `RingButton`, `Medallion`, `Channel`, `TrapSeal`, `HeroPip`, `Notice`, and `Prompt`.
- `src/ui/kit.tsx` keeps `Panel`, `Button`, `Receipt`, `Status`, `Field`, `Title`, and `Num`. `Panel` and `Receipt` render a frame. `Button` renders a seal. Screens that already imported the kit pick up the plates without a logic change.

Tokens live in `tailwind.config.js` and `src/styles.css`. The existing ink, gold, torch, parchment, memory, and blood colors stay. Bronze `#8C6239`, blackened steel `#1A1714`, and the stone channel `#0E0C0B` are added. Lilita One is used for titles and numbers. Fredoka is used for body copy. Both are already loaded in `index.html`.

## Where it is used

The dungeon HUD in `src/ui/App.tsx` keeps the same corners: medallions, trap seals, tier and vault channels, and iron rings. The contract board is a ledger, and a settled permit carries the wax seal. The landing photograph stays behind the hero. Get Started and Connect Wallet are seals. The shell is a steel rail. The world map stays a list of tablets. Market and workshop canvases stay; their sheets are plaques beside the stall.

Trap prices shown on the seals are the live economy values. The raid simulation, path costs, store actions, and the raid camera lock are unchanged.

## Motion

Press inset, hover sheen, the selected trap ring, the existing vault tick, and fades are the only motion. Nothing glows continuously. `prefers-reduced-motion` and the in-game `.motion-reduce` class remove those transitions. The landing scroll effect also stops when either one is set.

## Libraries

No component library, icon pack, or renderer was added.

- Tailwind and the CSS already in the app style the plates.
- The SVG marks are hand-built, so there is no icon font to subset or license.
- GSAP and Lenis were already on the landing page and stay there.
- Radix is unnecessary: the buttons, menus, and dialogs are short and already have their labels and keyboard-reachable controls.
- Lucide would replace marks that need to match the traps and the wax seal.
- React Three Fiber would wrap a dungeon, market, and workshop that already run on plain Three.js.
- Playwright would repeat the browser pass already used to check these screens.
- Figma and Blender do not ship in the page. The frames are code, and the 3D scenes already use the KayKit models.
