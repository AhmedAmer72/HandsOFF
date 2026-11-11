# SVG pack

The artwork in `public/ui` is the UNDERREALM SVG pack. Each file stays a separate asset. Labels, prices, and counts are HTML.

`OrnatePanel` slices a frame with `border-image`, so the corners stay put while the plate grows. `ProgressTrack` draws `progress-track.svg` and clips `progress-fill.svg` to the live percent. `TrapCard`, `ResourcePanel`, `CircularGameButton`, `ItemSlot`, and `StatusBadge` keep their native aspect ratios.

Icons and circular frames are `<img>` elements, so gradient ids never collide and the browser rasterizes each file once. No extra UI library is required. Vite copies `public/ui` into the production build at `/ui/...`.
