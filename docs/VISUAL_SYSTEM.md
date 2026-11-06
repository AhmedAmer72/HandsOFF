# Visual system

## Identity

Stylized low-poly dark fantasy. One KayKit family for characters, skeletons, dungeon stone, and tools. No pixel art and no photoreal meshes.

## Color

Defined in `src/game/visual/palette.ts` and `tailwind.config.js`.

| Token | Hex | Use |
|---|---|---|
| Dark stone | `#2B2A33` | Panels |
| Stone | `#3E3C4A` | Secondary panels |
| Shadow | `#14100E` | Page background, fog, clear color |
| Torch | `#FF9A3C` | Point lights, embers |
| Ember | `#FF5A1F` | Fire and Cinder |
| Gold | `#F2C14E` | Money, banners, trap rings |
| Parchment | `#E9D8B4` | Body text |
| Memory | `#3FA7A0` | Selected object name |
| Rust | `#B5532E` | Reserved accent |
| Critical | `#8E1B1B` | Health bars |

## Camera

Orthographic. Heading is 45 degrees plus Q/E yaw. Elevation is 35 degrees. Wheel zoom. Right-drag pans. Clicking a person eases the focus with GSAP. The south and east walls fade when they sit between the camera and the action, except the entrance doorway.

## Lighting

Three.js only. Hemisphere, one shadowed directional light, and a point light on each torch. Lamplighter is not installed. Quality low turns shadows off and lowers the pixel ratio. Medium and high keep shadows. High uses a 2048 shadow map.

## Materials

KayKit textures stay on the glTF materials. Trap ghosts lower opacity on those materials while placing. Gold rings under the trap kits are an unlit torus. Ember motes are one reused `Points` object.
