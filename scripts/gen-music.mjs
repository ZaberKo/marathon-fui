// Generate the score with Lyria 3.5 (one long take per call).
//   node scripts/gen-music.mjs <name>
import fs from 'node:fs';
import { api } from './gemini.mjs';
const name = process.argv[2] ?? 'take';
export const PROMPT = `Instrumental only, absolutely no vocals or voice. Original 2 minute 20 second ACID TECHNO score for a cold science-fiction interface trailer (a dead mercenary's mind is reassembled by a machine and printed into a new body).
Sound: 130 BPM, 4/4, A minor. A squelchy TB-303 style acid bassline with resonant filter sweeps and accents, tight 909 kick and hats, metallic percussion, glitchy digital clicks, sub drops, industrial hits. Technological, hypnotic, driving and punchy, never cheesy.
Timeline (follow it exactly):
0:00-0:04 near silence: data clicks and a rising sub, then one huge boom at 0:04.
0:04-0:21 groove starts: kick and closed hats, the acid line filtered and slowly opening.
0:21-0:31 full groove; at 0:27 a one-bar dropout with a glitch stutter.
0:31-0:35 build: snare roll and filter rise.
0:35 drop: full squelching acid bassline with kick, the first big peak, until 0:45.
0:45 sudden stop. 0:46.5 one heavy distorted impact. 0:46-0:56 no kick: broken granular debris over a low drone.
0:56-1:08 mechanical: the kick returns, the acid line steps like a machine printing layer by layer, building; a heavy hit on every bar near the end; stop at 1:08.
1:08-1:11 low drone fading. 1:11-1:15 total silence.
1:15-1:35 vast and slow: wide cold pads, deep sub, half-time, a distant filtered acid line, ominous.
1:35-1:41 tension: the kick comes back with a distorted acid line.
1:41-1:53 alarm, the most intense part: distorted acid, harsh detuned stabs, stutters and glitches.
1:53-2:10 release: bright clean synth chords and fast arpeggios over the driving kick, euphoric but artificial.
2:10-2:15 three rising pulses and a fast riser.
2:15 hard cut to silence. 2:15-2:20 silence with one faint low tone.`;
const t0 = Date.now();
const r = await api('models/lyria-3.5:generateContent', { method: 'POST', body: { contents: [{ parts: [{ text: PROMPT }] }], generationConfig: { responseModalities: ['AUDIO'] } } });
const parts = r.candidates?.[0]?.content?.parts ?? [];
fs.mkdirSync('scripts/.cache/music', { recursive: true });
for (const p of parts) {
  if (p.inlineData) fs.writeFileSync(`scripts/.cache/music/${name}.mp3`, Buffer.from(p.inlineData.data, 'base64'));
  else if (p.text) fs.writeFileSync(`scripts/.cache/music/${name}.txt`, p.text);
}
console.log(name, 'done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
