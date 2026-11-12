# Ashgate plate

Frames, buttons, and indicators are the supplied SVG pack. `src/ui/pack` maps each file to a component. Prices, names, and counts stay real text. The marks in this folder remain for any screen that has not switched.

## Pieces

- `marks.tsx` draws the coin, flame, cinder, trap, possess, pause, play, gear, shield, and wax-seal marks.
- `frame.tsx` is `ForgedFrame`. It delegates to `OrnatePanel`, which slices a pack frame with `border-image`. Variants are `steel`, `ledger`, `tablet`, `modal`, `compact`, `hero`, `tall`, and `tooltip`.
- `controls.tsx` is the control set: `SealButton`, `RingButton`, `Medallion`, `Channel`, `TrapSeal`, `HeroPip`, `Notice`, and `Prompt`.
- `src/ui/kit.tsx` keeps `Panel`, `Button`, `Receipt`, `Status`, `Field`, `Title`, and `Num`. `Panel` and `Receipt` render a frame. `Button` renders a seal. Screens that already imported the kit pick up the plates without a logic change.

Tokens live in `tailwind.config.js` and `src/styles.css`. The existing ink, gold, torch, parchment, memory, and blood colors stay. Bronze `#8C6239`, blackened steel `#1A1714`, and the stone channel `#0E0C0B` are added. Lilita One is used for titles and numbers. Fredoka is used for body copy. Both are already loaded in `index.html`.

## Where it is used

The dungeon HUD uses resource panels, trap cards, hero tabs, and circular pause, speed, and settings buttons. The contract board is a parchment panel, and a settled permit carries the pack wax seal. The landing photograph stays behind the hero. Get Started and Connect Wallet use the button frames. The shell uses tab frames and pack icons. The world map stays a list. Market and workshop canvases stay; their sheets open after you walk up and press E.

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
