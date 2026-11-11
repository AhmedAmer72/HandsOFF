/** Public URLs for the UNDERREALM SVG pack. Vite copies `public/ui` into the production build. */
const root = "/ui";

export const ui = {
  frame: {
    hero: `${root}/frames/hero-card-frame.svg`,
    item: `${root}/frames/item-slot-frame.svg`,
    modal: `${root}/frames/modal-frame.svg`,
    compact: `${root}/frames/panel-compact.svg`,
    parchment: `${root}/frames/panel-parchment.svg`,
    square: `${root}/frames/panel-square.svg`,
    tall: `${root}/frames/panel-tall.svg`,
    wide: `${root}/frames/panel-wide.svg`,
    tab: `${root}/frames/tab-frame.svg`,
    tooltip: `${root}/frames/tooltip-frame.svg`,
    trap: `${root}/frames/trap-card-frame.svg`,
  },
  control: {
    circular: `${root}/controls/circular-button-frame.svg`,
    danger: `${root}/controls/danger-button-frame.svg`,
    primary: `${root}/controls/primary-button-frame.svg`,
    secondary: `${root}/controls/secondary-button-frame.svg`,
    smallCircular: `${root}/controls/small-circular-button-frame.svg`,
  },
  indicator: {
    pipFull: `${root}/indicators/cinder-pip-full.svg`,
    pipEmpty: `${root}/indicators/cinder-pip-empty.svg`,
    health: `${root}/indicators/healthbar-track.svg`,
    fill: `${root}/indicators/progress-fill.svg`,
    track: `${root}/indicators/progress-track.svg`,
    resource: `${root}/indicators/resource-panel.svg`,
    badge: `${root}/indicators/status-badge-frame.svg`,
  },
  ornament: {
    wax: `${root}/ornaments/wax-seal.svg`,
    divider: `${root}/ornaments/ornate-divider.svg`,
    corner: `${root}/ornaments/corner-ornament.svg`,
  },
  icon: {
    anvil: `${root}/icons/anvil.svg`,
    bait: `${root}/icons/bait.svg`,
    boulder: `${root}/icons/boulder-trap.svg`,
    brute: `${root}/icons/brute.svg`,
    cinder: `${root}/icons/cinder-flame.svg`,
    close: `${root}/icons/close.svg`,
    coin: `${root}/icons/coin-gold.svg`,
    dungeon: `${root}/icons/dungeon-marker.svg`,
    gate: `${root}/icons/gate.svg`,
    helmet: `${root}/icons/helmet.svg`,
    mage: `${root}/icons/mage.svg`,
    market: `${root}/icons/market-stall.svg`,
    pause: `${root}/icons/pause.svg`,
    pit: `${root}/icons/pit-trap.svg`,
    play: `${root}/icons/play.svg`,
    possess: `${root}/icons/possess.svg`,
    search: `${root}/icons/search.svg`,
    settings: `${root}/icons/settings.svg`,
    shield: `${root}/icons/shield.svg`,
    spike: `${root}/icons/spike-trap.svg`,
    thief: `${root}/icons/thief.svg`,
    vault: `${root}/icons/vault.svg`,
    wave: `${root}/icons/wave.svg`,
  },
} as const;

export const HERO_ICON = {
  kara: ui.icon.thief,
  brann: ui.icon.brute,
  ivo: ui.icon.mage,
} as const;

export const TRAP_ICON = {
  spike: ui.icon.spike,
  pit: ui.icon.pit,
  boulder: ui.icon.boulder,
  bait: ui.icon.bait,
} as const;
