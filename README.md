# RUNTIME//KIT

A demo library of FUI elements in a **graphic-realism / neo-brutalist sci-fi** idiom:
pure black field, flat signal colours, Swiss grid, vector tech marks, stepped motion,
and 3D that is never shown "as 3D": contour lines, dither dots, wire and connector lines.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + production build → dist/
```

- WebGPU is the default. If the device fails or is lost, scenes remount on WebGL2 automatically.
  Append `?gl=webgl` to force WebGL2.
- **Perf tag:** a floating, draggable tag (toggle `PERF` in the top bar). It shows the 3D backend,
  GPU adapter, page FPS with a frame-time graph, JS heap, and per-scene render FPS / CPU ms /
  draw calls / triangles / lines / GPU memory. Double-click or `+` expands it; its position is remembered.
- **Lab viewer (dev only):** `/lab.html?s=runner` renders one scene full-window. Keys: `runner`,
  `shell`, `psyche`, `orbital`, `dropzone`, `headscan`, `terrain`.

## Pages

| #  | Route        | Contents |
|----|--------------|----------|
| 00 | `#/`         | Boot sequence, contour-runner hero, live marks, module index |
| 01 | `#/type`     | Type scale, lockups (vertical, cropped, slab, micro-copy texture, pixel wordmark), kinetic type |
| 02 | `#/signal`   | Palette, colour ratio, `data-state` themes, poster studies |
| 03 | `#/controls` | Buttons (10+ variants), CTA blocks, switch/check/radio, segmented, stepper, tabs, field/select/range, progress, tags, toasts |
| 04 | `#/glyphs`   | 12 cards of animated marks (17 kinds), 24 pixel icons, morphing sigils, static generators, CSS patterns |
| 05 | `#/telemetry`| Orbit map, defrag ring, countdown, gauges, spectrum, scope, memory grid, log, tracker, readouts |
| 06 | `#/motion`   | Easing comparison, transition monitor, loaders (count ring, plug sequence, scan block…), text wall, marquees |
| 07 | `#/spatial`  | 7 WebGPU scenes (below), lazy-mounted, with fps / pixel / label controls and a wide toggle |
| 08 | `#/fault`    | Full-screen runtime-error inversion with a text wall, alarm grid, triangle field; alerts, banner, modal |

### 3D scenes (`src/three/scenes/`)

| Key | Scene | Technique |
|-----|-------|-----------|
| `runner`   | Contour runner   | Skinned GLB, black occluder body, 1px world-Y iso-lines + rim + scan band; marks ride skinned vertices; leader lines |
| `shell`    | Shell / dot cloud | Bayer 4×4 ordered dither on facing ratio; cyan joint plates; outline triangles pop in steps; bezier fan |
| `psyche`   | Psyche link      | Procedural ridged-noise brain in local-space contours on a grid plate; yellow connectors to a contour figure |
| `orbital`  | Orbital uplink   | Earth = latitude slices only over land (Natural Earth); wire satellites; nadir line, footprint, uplink arcs |
| `dropzone` | Drop zone        | Pixel-texture planet horizon; target triangles; green arcs fall from an orbital source in sequence |
| `headscan` | Head scan        | Two contour families (orange Y / cobalt X) = curved wire grid; cranium nodes, circuit traces, optic rings |
| `terrain`  | Contour field    | Marching-squares topography lifted per level, rebuilt every 3 steps; pod convoy with axis-ring contours |

## Reusing pieces

```
src/styles/tokens.css      colours, type, [data-state] themes  ← start here
src/styles/components.css  .k-* components (pure CSS, state-aware via --accent)
src/styles/fx.css          marquee, text wall, entrances, marks, HUD widgets, perf tag, 3D labels
src/lib/glyphs.ts          static SVG generators (pixelIcon, checker, locator, barcode, blockText…)
src/lib/marks.ts           ANIMATED marks: mountMark(el, kind) or <span data-mark="reticle">
                           checker · locator · crosshair · reticle · target · barcode · link · segring
                           dots · tri · sigil · blocktext · scanblock · countring · chevrons · bars · connector
src/lib/motion.ts          scramble, typeOut, glitch, flashBlocks, reveal, barWipe, countTo, stamp
src/lib/compose.ts         textWall() + animateTextWall()
src/lib/hud.ts             mountDefragRing / OrbitMap / Spectrum / Scope / MemoryGrid / Terminal / Gauge / Tracker
src/lib/hydrate.ts         data-attribute behaviours (+ data-mark, stepped block-wipe entrances)
src/lib/ambient.ts         dim cobalt pixel-block field behind the stage
src/lib/perf.ts, perfHud.ts  perf registry (no three import) + floating tag
src/lib/toast.ts           notify({ title, msg, state })
src/lib/util.ts            stepLoop (fixed-fps loop), rng, crispCanvas, cleanup bag

src/three/core.ts          createStage(): WebGPURenderer, quantised time, perf stats, fallback
src/three/materials.ts     contourMaterial(): TSL iso-lines (fwidth), 2nd family, rim, Bayer dither, scan
src/three/overlay.ts       LineBatch / FillBatch: billboarded px-sized marks, connectors, beziers, rings
src/three/procedural.ts    brain, satellite, marching squares, pixel planet texture
src/three/assets.ts        meshopt GLB loader, skinned vertex sampling, Natural Earth land mask
```

## The rules that hold the look together

1. **Colour is state.** Components read `--accent` / `--frame`. Set `data-state="nominal|link|caution|critical|cobalt|fault"` on any ancestor to re-theme.
2. **Nothing glides.** Use `steps(n)` in CSS and GSAP, and `stepLoop(fps, …)` for canvas and SVG marks. 3D time is `floor(t·fps)/fps`.
3. **Black stays dominant** (about 80% of a frame). Use one main signal colour plus one counterpoint. Red only appears for a fault, and then it fills the whole field.
4. **Three type voices:** a wide or condensed display grotesque (Archivo variable, `wdth` 62–125), mono micro-copy as texture, and a pixel face for codes.
5. **3D is drafted, not rendered.** No PBR and no lights. Use black occluders, 1px contours, dither dots and wire, then add a vector layer of triangles, rings, brackets and connector lines on top.

## Credits

- `public/models/soldier.glb`, `xbot.glb` are Mixamo characters/animations as distributed with the three.js examples.
- `public/models/head.glb` is the Lee Perry-Smith head scan, CC BY 3.0.
- Land outlines come from `world-atlas` (Natural Earth, public domain). See `public/models/CREDITS.md`.
