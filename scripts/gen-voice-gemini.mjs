// Generate the voice-over with gemini-3.8-flash-tts, then process it into a
// mechanical "support AI" voice with ffmpeg.
//   node scripts/gen-voice-gemini.mjs [--force] [ids...]   (previous engine; superseded by gen-voice.mjs / edge-tts)
// raw  → scripts/.cache/vo/raw/<id>.wav (24 kHz mono, as returned)
// proc → scripts/.cache/vo/<id>.wav     (48 kHz mono, trimmed, robotised)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { api } from './gemini.mjs';
import { DELIVERY, LINES, VOICE } from './film-script.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const RAW = 'scripts/.cache/vo/raw';
const OUT = 'scripts/.cache/vo';
fs.mkdirSync(RAW, { recursive: true });

const prompt = (text, delivery) => `# AUDIO PROFILE: ORA — synthetic support intelligence
## THE SCENE
A sterile body-printing facility. The AI reads a status log to a consciousness that is being reassembled.
### DIRECTOR'S NOTES
Style: ${DELIVERY[delivery]}
Accent: neutral.
#### TRANSCRIPT
${text}`;

async function tts(id, text, delivery) {
  const f = `${RAW}/${id}.wav`;
  if (fs.existsSync(f) && !force) return f;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const r = await api('models/gemini-3.8-flash-tts:generateContent', {
        method: 'POST',
        body: {
          contents: [{ parts: [{ text: prompt(text, delivery) }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
        },
      });
      const part = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error('no audio part');
      fs.writeFileSync(f, Buffer.from(part.inlineData.data, 'base64'));
      return f;
    } catch (e) {
      const wait = e.status === 429 ? 20000 * attempt : 1500 * attempt;
      console.warn(id, 'attempt', attempt, String(e.status ?? ''), e.message.slice(0, 80), `→ retry in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`${id} failed`);
}

/**
 * Speech bounds from raw TTS audio. The TTS endpoint can emit a short energy
 * spike (scratch / pop) in the last 50–150 ms of the stream, so trailing loud
 * segments shorter than 60 ms inside the final 250 ms are treated as artefacts,
 * and the cut lands 30 ms after the real speech decay (then faded).
 */
export function speechBounds(src) {
  const sr = 24000;
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', src, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
  const hop = Math.round(sr * 0.005);
  const n = Math.floor(x.length / hop);
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let k = 0; k < hop; k++) e += x[i * hop + k] ** 2;
    db[i] = 10 * Math.log10(e / hop + 1e-12);
  }
  // loud segments (> -45 dB), bridging gaps shorter than 40 ms
  const segs = [];
  let cur = null;
  for (let i = 0; i < n; i++) {
    if (db[i] > -45) {
      if (cur && i - cur[1] <= 8) cur[1] = i;
      else segs.push((cur = [i, i]));
    }
  }
  const total = n * 0.005;
  const kept = segs.filter(([a, b]) => !((b - a + 1) * 0.005 < 0.06 && a * 0.005 > total - 0.25));
  const dropped = segs.length - kept.length;
  const start = kept.length ? Math.max(0, kept[0][0] * 0.005 - 0.02) : 0;
  const end = kept.length ? Math.min(total, (kept.at(-1)[1] + 1) * 0.005 + 0.03) : total;
  return { start, end, dropped, total };
}

/** The mechanical voice chain. `alert` lines get a harder, gated treatment. */
export function processVoice(src, dst, delivery) {
  const b = speechBounds(src);
  if (b.dropped) console.log(`  ${dst.split('/').pop()}: removed ${b.dropped} trailing spike segment(s)`);
  const len = b.end - b.start;
  const trim = `atrim=start=${b.start.toFixed(3)}:end=${b.end.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=${(len - 0.025).toFixed(3)}:d=0.025,aresample=48000`;
  const tempo = delivery === 'count' || delivery === 'soft' ? '' : ',atempo=1.06';
  // chain "A" (ranked best in a blind A/B by the listening model) + gentle de-ess and low-mid weight
  const tone = `deesser=i=0.25:m=0.4:f=0.5,highpass=f=110,lowpass=f=9000,equalizer=f=2600:t=q:w=1.2:g=3,equalizer=f=170:t=q:w=1:g=2,equalizer=f=320:t=q:w=1:g=-2${tempo}`;
  // phase-vocoder robotisation, blended under the dry voice
  const robot = "afftfilt=real='hypot(re,im)':imag='0':win_size=512:overlap=0.75";
  const gate = delivery === 'alert' ? ',tremolo=f=18:d=0.25,acrusher=bits=9:mode=log:aa=1:mix=0.22' : ',acrusher=bits=12:mode=log:aa=1:mix=0.1';
  const graph = [
    `[0:a]${trim},${tone},asplit=2[d][w]`,
    `[w]${robot},volume=${delivery === 'alert' ? 0.75 : 0.55}[r]`,
    `[d][r]amix=inputs=2:weights='1 1':normalize=0,aecho=0.9:0.55:6:0.32${gate},acompressor=threshold=-20dB:ratio=3:attack=4:release=80:makeup=2,apad=pad_dur=0.2[o]`,
  ].join(';');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-filter_complex', graph, '-map', '[o]', '-ac', '1', '-ar', '48000', dst]);
}

const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

const todo = LINES.filter(([id]) => !only.length || only.includes(id));
const queue = [...todo];
const results = {};
await Promise.all(
  Array.from({ length: 1 }, async () => {
    while (queue.length) {
      const [id, text, delivery] = queue.shift();
      const raw = await tts(id, text, delivery);
      const out = `${OUT}/${id}.wav`;
      processVoice(raw, out, delivery);
      results[id] = { raw: dur(raw), dur: dur(out) };
      console.log(id, results[id].dur.toFixed(2) + 's', text);
    }
  }),
);
const index = Object.fromEntries(LINES.map(([id, text, delivery, zh]) => [id, { text, zh, delivery, dur: fs.existsSync(`${OUT}/${id}.wav`) ? dur(`${OUT}/${id}.wav`) : null }]));
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1));
console.log('total speech', Object.values(index).reduce((s, x) => s + (x.dur ?? 0), 0).toFixed(1), 's');
