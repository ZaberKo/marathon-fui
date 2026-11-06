# RUNTIME//KIT

A demo library of FUI elements in a **graphic-realism / neo-brutalist sci-fi** idiom:
pure black field, flat signal colours, Swiss grid, vector tech marks, stepped motion,
3D translated into flat drafting language.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + production build → dist/
```

Append `?gl=webgl` to the URL to force the WebGL2 backend. WebGPU is used by default and
automatically falls back to WebGL2 if the device fails.

## Pages

| #  | Route        | Contents |
|----|--------------|----------|
| 00 | `#/`         | Boot sequence, 3D slice-figure hero, module index |
| 01 | `#/type`     | Type scale, lockups (vertical, cropped, slab, micro-copy texture, pixel wordmark), kinetic type |
| 02 | `#/signal`   | Palette, colour ratio, `data-state` themes, poster studies |
| 03 | `#/controls` | Buttons (10+ variants), CTA blocks, switch/check/radio, segmented, stepper, tabs, field/select/range, progress, tags, toasts |
| 04 | `#/glyphs`   | 24 pixel icons, seeded sigils, locators, crosshairs, barcodes, connectors, segment rings, triangle tiles, block text, CSS patterns |
| 05 | `#/telemetry`| Orbit map, defrag ring, countdown, gauges, spectrum, scope, memory grid, log, tracker, readouts |
| 06 | `#/motion`   | Easing comparison, transition monitor (wipe / flash / flip / glitch / cut), loaders, marquees |
| 07 | `#/spatial`  | 4 WebGPU scenes (TSL slice material, neural voxels, bar-field planet, CAD bay) with fps / pixel / slice controls |
| 08 | `#/fault`    | Full-screen runtime-error inversion, alerts, caution banner, modal |

## Reusing pieces

```
src/styles/tokens.css      colours, type, [data-state] themes  ← start here
src/styles/components.css  .k-* components (pure CSS, state-aware via --accent)
src/styles/fx.css          marquee, glitch layers, HUD widget styles, scanline/dither utils
src/lib/glyphs.ts          SVG string generators (pixelIcon, checker, locator, barcode, blockText…)
src/lib/motion.ts          scramble, typeOut, glitch, flashBlocks, reveal, barWipe, countTo, stamp
src/lib/hud.ts             mountDefragRing / OrbitMap / Spectrum / Scope / MemoryGrid / Terminal / Gauge / Tracker
src/lib/hydrate.ts         data-attribute behaviours (data-scramble-hover, data-hold, tabs, range…)
src/lib/toast.ts           notify({ title, msg, state })
src/lib/util.ts            stepLoop (fixed-fps loop), rng, crispCanvas, cleanup bag
src/three/core.ts          createStage(): WebGPURenderer + quantised time + pixel scale + fallback
src/three/scenes.ts        sliceMaterial() + the four scenes
```

The rules that hold the look together:

1. **Colour is state.** Components read `--accent` / `--frame`. Set `data-state="nominal|link|caution|critical|cobalt|fault"` on any ancestor to re-theme.
2. **Nothing glides.** Use `steps(n)` in CSS and GSAP, and `stepLoop(fps, …)` for canvas. 3D time is `floor(t·fps)/fps`.
3. **Black stays dominant** (about 80% of a frame). Use one main signal colour plus one counterpoint. Red only appears for a fault, and then it fills the whole field.
4. **Three type voices:** a wide or condensed display grotesque (Archivo variable, `wdth` 62–125), mono micro-copy as texture, and a pixel face for codes.
5. **3D gets no PBR and no lights.** Draw it with slices, voxels, 1px lines and corner-tick bounding boxes.
