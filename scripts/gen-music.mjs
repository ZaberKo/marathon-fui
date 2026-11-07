// Generate the score with Lyria 3.5 (one long take per call).
//   node scripts/gen-music.mjs <name>
import fs from 'node:fs';
import { api } from './gemini.mjs';
const name = process.argv[2] ?? 'take';
export const PROMPT = `Instrumental only, absolutely no vocals or voice. Original score for a 2 minute 20 second science-fiction interface trailer: a dead mercenary's mind is reassembled by a cold support AI and printed into a new body.
Style: cold, precise, minimal electronic with industrial textures. Analog synth bass, granular digital textures, glitch percussion, data clicks, sub drops, metallic hits. Sparse but propulsive. Key D minor, 96 BPM, steady grid.
Timeline:
0:00-0:08 near silence: low sub drone and faint data clicks, one deep boom at 0:02.
0:08-0:40 calibration: steady 96 BPM pulse of filtered synth bass and ticking hi-hats; a glassy arpeggio enters at 0:24; short glitch stutter at 0:30.
0:40-0:50 lift: pads open up, wide, cold and grand.
0:50-1:00 the death: sudden drop to silence at 0:50, a heavy distorted impact at 0:52, shattering granular debris over a low drone.
1:00-1:12 printing: a mechanical rhythm like a machine printing layer by layer, building.
1:12-1:30 the planet: vast cinematic synth swell, slow, ominous, huge space.
1:30-1:46 the error: alarm. Distorted bass, harsh detuned stabs, stuttering glitches, the most intense part.
1:46-2:05 resolution: tension releases into a clean, bright synthetic chord progression with arpeggios, hopeful but artificial.
2:05-2:12 countdown: three rising pulses and a riser.
2:12 hard cut to silence.
2:13-2:20 one final low resonant tone fading out.`;
const t0 = Date.now();
const r = await api('models/lyria-3.5:generateContent', { method: 'POST', body: { contents: [{ parts: [{ text: PROMPT }] }], generationConfig: { responseModalities: ['AUDIO'] } } });
const parts = r.candidates?.[0]?.content?.parts ?? [];
fs.mkdirSync('scripts/.cache/music', { recursive: true });
for (const p of parts) {
  if (p.inlineData) fs.writeFileSync(`scripts/.cache/music/${name}.mp3`, Buffer.from(p.inlineData.data, 'base64'));
  else if (p.text) fs.writeFileSync(`scripts/.cache/music/${name}.txt`, p.text);
}
console.log(name, 'done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
