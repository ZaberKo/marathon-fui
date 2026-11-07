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
- **Film — SHELL 07:** `/cinema.html` plays a 2:27 web film built from the kit, with sound (see below).
  - Keys: Space play/pause · ←/→ 1 s (Shift: 1 frame) · C captions EN/中文/off · M mute · F fullscreen · Q 3D quality.
  - URL: `?t=81` opens paused at that time; `?capture` shows a bare 1920×1080 frame (no audio, no UI);
    `?perf` shows the perf tag.

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
| 09 | `#/study`    | Film page for SHELL 07: synopsis, design notes, and a shot list (with its voice-over) that deep-links into the player |

### 3D scenes (`src/three/scenes/`)

| Key | Scene | Technique |
|-----|-------|-----------|
| `runner`   | Contour runner   | Generated SDF body on the motion rig, black occluder body, 1px world-Y iso-lines + rim + scan band; marks ride skinned vertices; leader lines |
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
src/three/assets.ts        generated-model loader, skinned vertex sampling, Natural Earth land mask

src/cine/main.ts           film player: the audio clock drives the picture, gate, captions, scrubber
src/cine/engine.ts         seekable shot timeline, shared WebGPU/WebGL2 renderer, stepped-time helpers
src/cine/post.ts           screen layers: uniform block mosaic (screen + multiply), grain, scanlines, vignette
src/cine/backdrop.ts       layered UI-panel walls (3 depths, parallax, blur) — replaces flat random fields
src/cine/anatomy2d.ts      2D anatomical plate in smooth line work: nerve bundles in several colours, hatched
                           muscles, organs, brain with gyri, optic pathway; live nerve pulses and scan
src/cine/draw.ts           Canvas2D frame kit: measured palette, type, scanlines, data field, stripes,
                           checkers, bitmap/sigil glyphs, glitch blocks, triangle field
src/cine/rings.ts          defragRing (frame-scale, stepped, re-sorting) · streakRing · progressRing
src/cine/mats.ts           xray (additive fresnel) · toon (two-tone cel) · screenDots · screenPixels
src/cine/models/sdf.ts     SDF primitives, Surface Nets mesher, skin weights from primitive proximity
src/cine/models/body.ts    SDF humanoid on the motion rig (runner / armor / slim), authored poses
src/cine/models/anatomy.ts neutral SDF head for the scene library; brain geometry re-export
src/cine/models/hard.ts    hard-surface kit: decks, plinths, ribs, any merged geometry; world-lit toon; sweep
src/cine/models/connectome.ts brain tractography (callosal, projection, association, U-fibres) + activation/flow material
src/cine/models/flow.ts    line material with pulses flowing along an arc-length attribute
src/cine/models/station.ts orbital station (hub, habitat ring, truss, solar wings, drop bays)
src/cine/models/voxels.ts  uniform voxel bodies from the mesh grid + WireCubes renderer + analytic burst
src/cine/models/stickers.ts stencil decals laid on the body surface, parented to bones
src/cine/models/colony.ts  the colony set: domes, habitat tubes, towers, pad, solar rows, wall, rubble
src/cine/models/head2.ts   SDF head at real proportions, wire eyes, internal wiring, the visual pathway (~70 fibres/eye)
src/cine/models/slices.ts  cross-sections of a posed skinned mesh along any axis (print fronts)
src/cine/film/*.ts         the film's 26 shots, times.ts (shot boundaries) + cues.ts (generated cue sheet: VO timings, music anchors)

scripts/                   offline audio pipeline (Lyria needs GOOGLE_API_KEY in .env; voice needs edge-tts; ffmpeg with rubberband):
  film-script.mjs            voice-over script (EN + 中文 captions) and delivery notes
  gen-voice.mjs              edge-tts (en-US-AriaNeural +25 Hz) → ffmpeg chain (voice-chains/D|E), every line at −17 LUFS
  gen-voice-gemini.mjs       previous engine (gemini-3.8-flash-tts), kept for reference
  gen-music.mjs              Lyria 3.5 score from a timed brief
  analyze-audio.py, analyze-sections.py, anchors.py  loudness / onsets / silences → music anchors for the edit
  cues.mjs, build-audio.mjs  edit decision list → mix (ducking, SFX, loudness) → public/audio/film.mp3 + cues.ts
  listen.mjs                 asks a multimodal Gemini model to QA audio (transcription, artefacts, balance)
```

## The rules that hold the look together

1. **Colour is state.** Components read `--accent` / `--frame`. Set `data-state="nominal|link|caution|critical|cobalt|fault"` on any ancestor to re-theme.
2. **Nothing glides.** Use `steps(n)` in CSS and GSAP, and `stepLoop(fps, …)` for canvas and SVG marks. 3D time is `floor(t·fps)/fps`.
3. **Black stays dominant** (about 80% of a frame). Use one main signal colour plus one counterpoint. Red only appears for a fault, and then it fills the whole field.
4. **Three type voices:** a wide or condensed display grotesque (Archivo variable, `wdth` 62–125), mono micro-copy as texture, and a pixel face for codes.
5. **3D is drafted, not rendered.** No PBR and no lights. Use black occluders, 1px contours, dither dots and wire, then add a vector layer of triangles, rings, brackets and connector lines on top.

**Corrections learned while making the film:**

- **Rule 3 only holds between beats.** Hold frames and fault frames flood the whole field with one flat colour (cobalt,
  yellow, orange-red, crimson).
- **Scale is part of the style.** Rings, words and figures are cropped by the frame edge.
- **Flats are never clean.** Add scanlines, stepped pixel edges and a dim data layer behind them.
- **Pick the render style per shot.** One skeleton can be drawn as contour, x-ray, cel, halftone, voxels or triangle
  shards; the style changes between beats.

## Credits

- **All meshes are generated in code** (`src/cine/models/`). No third-party geometry is included.
- `public/anim/rig.glb` holds only the skeleton and motion clips, with every mesh stripped. The clips are Mixamo
  animations as distributed with the three.js examples (`Xbot.glb`).
- Land outlines come from `world-atlas` (Natural Earth, public domain). See `public/anim/CREDITS.md`.
- **SHELL 07** is an original story in the graphic-realism idiom. Its world names are our own: Periapt IV,
  ICAR Colonial Authority and ORA. It contains no footage, audio, logos or text from any existing trailer.
- **Audio is AI-generated for this project.**
  - The score is a Google Lyria 3.5 acid-techno take (128 BPM), re-cut on bar lines to the edit (`MUSIC.edit` in
    `scripts/cues.mjs`).
  - The narrator voice is Microsoft edge-tts (en-US-AriaNeural, pitch +25 Hz), processed with ffmpeg chain D:
    mud cut, presence and air EQ, de-ess, a whisper of bit reduction, even compression and a sparse 60–100 ms
    reflection — no frequency shift or short combs. Alarm lines (chain E) add a faint monotone robot layer.
  - The SFX are synthesised with ffmpeg.
