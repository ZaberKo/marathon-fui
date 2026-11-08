// Generate the voice-over with Microsoft edge-tts (free) and process it into
// the mechanical support-AI voice with the ffmpeg chains in scripts/voice-chains/.
//   node scripts/gen-voice.mjs [--force] [ids...]
// Needs the `edge-tts` CLI for new takes, ffmpeg, and Python with
// `praat-parselmouth==0.4.7`. Set EDGE_TTS or VOICE_PYTHON to override paths.
// Install the Python processor with `python3 -m pip install praat-parselmouth==0.4.7`.
// raw  → scripts/.cache/vo/edge/<id>.mp3   (24 kHz MP3 as returned)
// proc → scripts/.cache/vo/<id>.wav        (48 kHz mono, trimmed, processed)
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { EDGE_PROSODY, EDGE_VOICE, LINES } from './film-script.mjs';

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const EDGE = process.env.EDGE_TTS ?? 'edge-tts';
const PYTHON = process.env.VOICE_PYTHON ?? 'python3';
const RAW = 'scripts/.cache/vo/edge';
const OUT = 'scripts/.cache/vo';
fs.mkdirSync(RAW, { recursive: true });
execFileSync(PYTHON, ['-c', 'import parselmouth'], { stdio: 'inherit' });

const supportsSoxr = execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).includes('--enable-libsoxr');
const chain = (name) => {
  const filters = fs.readFileSync(`scripts/voice-chains/chain_${name}.txt`, 'utf8').trim();
  return supportsSoxr ? filters : filters.replace('aresample=48000:resampler=soxr:precision=28', 'aresample=48000');
};
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

/** integrated loudness (LUFS) — ebur128 prints its summary on stderr */
function measureI(f) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...`${r.stdout}\n${r.stderr}`.matchAll(/^\s+I:\s+(-?[\d.]+) LUFS/gm)].pop();
  return m ? Number(m[1]) : -20;
}

function tts(id, text, p) {
  const f = `${RAW}/${id}.mp3`;
  if (fs.existsSync(f) && !force) return f;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      execFileSync(EDGE, ['--voice', EDGE_VOICE, `--rate=${p.rate}`, `--pitch=${p.pitch}`, '--text', text, '--write-media', f], { stdio: ['ignore', 'ignore', 'pipe'] });
      if (fs.statSync(f).size > 1000) return f;
    } catch (e) {
      console.warn(id, 'attempt', attempt, String(e.stderr ?? e.message).slice(0, 160));
    }
  }
  throw new Error(`${id} failed`);
}

function mechanicalVoice(input, output, delivery) {
  const pcm = execFileSync(PYTHON, ['scripts/shape-voice.py', input, delivery], { maxBuffer: 16 * 1024 * 1024 });
  const tone = '[0:a]asplit=2[direct][tap];[tap]highpass=f=950,lowpass=f=4900,adelay=192S,volume=-17dB[metal];'
    + '[direct][metal]amix=inputs=2:normalize=0:duration=first';
  const render = (gain) => execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-f', 'f32le', '-ar', '48000', '-ac', '1', '-i', 'pipe:0',
    '-filter_complex', `${tone},volume=${gain}dB,alimiter=limit=-2dB:attack=1:release=50:level=0:latency=1`,
    '-c:a', 'pcm_s24le', output,
  ], { input: pcm });
  render(0);
  const makeup = Math.max(-3, Math.min(3, measureI(input) - measureI(output)));
  if (Math.abs(makeup) > 0.1) render(makeup.toFixed(2));
}

for (const [id, text, delivery] of LINES) {
  if (only.length && !only.includes(id)) continue;
  const p = EDGE_PROSODY[delivery] ?? EDGE_PROSODY.log;
  const raw = tts(id, text, p);
  const I = measureI(raw);
  const G = (-20 - I).toFixed(2);
  const out = `${OUT}/${id}.wav`;
  const tmp = `${OUT}/${id}.tmp.wav`;
  const trimmed = `${OUT}/${id}.trimmed.wav`;
  const filters = chain(p.chain);
  const run = (makeup) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-filter_complex', filters.replaceAll('GAIN_IN', G).replaceAll('MAKEUP', makeup.toFixed(2)), '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', tmp]);
  try {
    // Level and trim the existing line before modifying the voiced pitch contour.
    run(0);
    if (filters.includes('MAKEUP')) run(Math.max(-6, Math.min(18, -17 - measureI(tmp))));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', 'areverse,silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.05:detection=peak,afade=t=in:d=0.03,areverse', '-c:a', 'pcm_s24le', trimmed]);
    mechanicalVoice(trimmed, tmp, delivery);
    fs.renameSync(tmp, out);
  } finally {
    fs.rmSync(tmp, { force: true });
    fs.rmSync(trimmed, { force: true });
  }
  console.log(id, `${dur(out).toFixed(2)}s`, `chain ${p.chain}`, `in ${I} LUFS`, text);
}
const index = Object.fromEntries(LINES.map(([id, text, delivery, zh]) => [id, { text, zh, delivery, dur: fs.existsSync(`${OUT}/${id}.wav`) ? dur(`${OUT}/${id}.wav`) : null }]));
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1));
console.log('total speech', Object.values(index).reduce((s, x) => s + (x.dur ?? 0), 0).toFixed(1), 's');
