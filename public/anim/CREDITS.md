# Asset credits

All **meshes are generated in code** (`src/cine/models/`): SDF bodies meshed with Surface Nets
and skinned automatically, an SDF head, an articulated SDF hand, organs, brain and fibres,
the ship, station and planets. No third-party geometry ships with this project.

| File       | Contents | Source / License |
|------------|----------|------------------|
| `rig.glb`  | Skeleton + 7 clips (agree, headShake, idle, run, sad_pose, sneak_pose, walk) — **every mesh, material and texture stripped** | Mixamo (Adobe) animations as distributed with the three.js examples (`examples/models/gltf/Xbot.glb`) |

Land outlines for the orbital scene come from `world-atlas` (Natural Earth, public domain).

## Audio (`public/audio/film.mp3`)

Generated for this project by `scripts/` (see README):

- Score: Google **Lyria 3.5** (`lyria-3.5`), from a timed text brief.
- Narrator: Microsoft **edge-tts** neural voice en-US-AriaNeural. It is processed into a mechanical support-AI sound
  with the ffmpeg chains in `scripts/voice-chains/` (frequency shift, comb, compression; alarms add a phase-vocoder
  robot layer and an octave double).
- SFX: synthesised with ffmpeg generators (no samples).
