// Mix score + voice-over + synthesised SFX into the film soundtrack and export
// the cue sheet the player uses for picture timing and captions.
//   node scripts/build-audio.mjs
// → public/audio/film.mp3, src/cine/film/cues.ts
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { LINES } from './film-script.mjs';
import { ANCHORS, CUES, MUSIC, SFX } from './cues.mjs';

const VO = 'scripts/.cache/vo';
const TMP = 'scripts/.cache/mix';
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync('public/audio', { recursive: true });
fs.mkdirSync('src/cine/film', { recursive: true });
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

/* ---------------- SFX synthesis (48 kHz stereo wav) ---------------- */
const SFX_DEF = {
  blip: "sine=f=1760:d=0.06,afade=t=out:st=0.02:d=0.04",
  tick: "sine=f=2400:d=0.035,afade=t=out:st=0.01:d=0.025",
  glitch: "anoisesrc=d=0.18:c=white:a=0.6,acrusher=bits=4:mode=lin:mix=1,tremolo=f=40:d=0.9,highpass=f=800,afade=t=out:st=0.08:d=0.1",
  crush: "anoisesrc=d=0.5:c=pink:a=0.7,acrusher=bits=3:samples=12:mix=1,tremolo=f=22:d=1,bandpass=f=1800:w=1600,afade=t=out:st=0.25:d=0.25",
  servo: "sine=f=180:d=0.6,vibrato=f=12:d=0.6,acrusher=bits=6:mix=0.4,afade=t=in:d=0.05,afade=t=out:st=0.35:d=0.25",
  shatter: "anoisesrc=d=1.4:c=white:a=0.8,highpass=f=2500,tremolo=f=30:d=0.8,afade=t=out:st=0.1:d=1.3",
  alarm: "sine=f=880:d=0.42,volume=1,afade=t=out:st=0.36:d=0.06",
  flash: "anoisesrc=d=1.2:c=white:a=0.9,lowpass=f=6000,areverse,afade=t=in:d=0.9,afade=t=out:st=1.05:d=0.15",
  drone: "sine=f=49:d=3.5,afade=t=in:d=0.4,afade=t=out:st=1.5:d=2",
  impact: "anoisesrc=d=1.0:c=brown:a=1,lowpass=f=260,acrusher=bits=5:mix=0.5,volume=6dB,afade=t=out:st=0.04:d=0.95",
  whoosh: "anoisesrc=d=1.0:c=white:a=0.8,highpass=f=300,lowpass=f=9000,afade=t=in:d=0.12,afade=t=out:st=0.25:d=0.75",
};
const sfxFiles = {};
for (const [k, src] of Object.entries(SFX_DEF)) {
  const f = `${TMP}/sfx_${k}.wav`;
  if (k === 'alarm') ff('-f', 'lavfi', '-i', 'sine=f=880:d=0.21', '-f', 'lavfi', '-i', 'sine=f=660:d=0.21', '-filter_complex', '[0][1]concat=n=2:v=0:a=1,aresample=48000,afade=t=out:st=0.36:d=0.06,pan=stereo|c0=c0|c1=c0', f);
  else ff('-f', 'lavfi', '-i', src, '-af', 'aresample=48000,pan=stereo|c0=c0|c1=c0', f);
  sfxFiles[k] = f;
}

/* ---------------- graph ---------------- */
const inputs = [];
const parts = [];
// music: re-cut on bar lines (MUSIC.edit) into one file, then ducks
const score = `${TMP}/score.wav`;
{
  const ein = [];
  const ep = [];
  const labs = [];
  let filmT = 0;
  MUSIC.edit.forEach((e, i) => {
    if (e[0] === 'gap') {
      ein.push('-f', 'lavfi', '-t', String(e[1]), '-i', 'anullsrc=r=48000:cl=stereo');
      ep.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo[e${i}]`);
      filmT += e[1];
    } else {
      const [a, b, g] = e;
      ein.push('-ss', String(a), '-t', String(b - a), '-i', MUSIC.file);
      ep.push(`[${i}:a]aresample=48000,aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${b - a},asetpts=PTS-STARTPTS,volume=${g}dB,afade=t=in:d=0.012,afade=t=out:st=${(b - a - 0.012).toFixed(3)}:d=0.012[e${i}]`);
      filmT += b - a;
    }
    labs.push(`[e${i}]`);
  });
  const ducks = MUSIC.duck.map(([t0, t1, g]) => `volume=${Math.pow(10, g / 20).toFixed(4)}:enable='between(t,${t0},${t1})'`).join(',');
  ep.push(`${labs.join('')}concat=n=${labs.length}:v=0:a=1${ducks ? ',' + ducks : ''}[m]`);
  ff(...ein, '-filter_complex', ep.join(';'), '-map', '[m]', '-c:a', 'pcm_s16le', score);
  console.log('score re-cut:', filmT.toFixed(3), 's');
}
inputs.push('-i', score);
parts.push(`[0:a]aresample=48000,volume=${MUSIC.gain}dB[mus]`);
// voice lines
const voLabels = [];
let idx = 1;
for (const [id] of LINES) {
  const t = CUES[id];
  if (t == null) throw new Error(`no cue for ${id}`);
  inputs.push('-i', `${VO}/${id}.wav`);
  const ms = Math.round(t * 1000);
  parts.push(`[${idx}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay=${ms}|${ms}[v${idx}]`);
  voLabels.push(`[v${idx}]`);
  idx++;
}
parts.push(`${voLabels.join('')}amix=inputs=${voLabels.length}:normalize=0:duration=longest,volume=1.0[vo]`);
// sfx
const sfxLabels = [];
for (const [t, kind, g] of SFX) {
  inputs.push('-i', sfxFiles[kind]);
  const ms = Math.round(t * 1000);
  parts.push(`[${idx}:a]volume=${g}dB,adelay=${ms}|${ms}[s${idx}]`);
  sfxLabels.push(`[s${idx}]`);
  idx++;
}
parts.push(`${sfxLabels.join('')}amix=inputs=${sfxLabels.length}:normalize=0:duration=longest[sfx]`);
// duck the score under the voice, then sum
parts.push('[vo]asplit=2[vo1][vosc]');
parts.push('[mus][vosc]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=350:makeup=1[musd]');
parts.push(`[musd][vo1][sfx]amix=inputs=3:weights='0.82 1.25 0.8':normalize=0:duration=longest,apad=whole_dur=${ANCHORS.end},atrim=0:${ANCHORS.end},loudnorm=I=-15:TP=-1.2:LRA=12[out]`);

ff(...inputs, '-filter_complex', parts.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '192k', 'public/audio/film.mp3');
console.log('film.mp3', dur('public/audio/film.mp3').toFixed(2), 's');

/* ---------------- cue sheet for the player ---------------- */
const index = JSON.parse(fs.readFileSync(`${VO}/index.json`, 'utf8'));
const lines = LINES.map(([id, text, , zh]) => ({ id, t: CUES[id], d: Number(index[id].dur.toFixed(2)), en: text, zh }));
const ts = `// GENERATED by scripts/build-audio.mjs — do not edit by hand.
export type Line = { id: string; t: number; d: number; en: string; zh: string };
export const AUDIO_SRC = 'audio/film.mp3';
export const DURATION = ${ANCHORS.end};
export const ANCHORS = ${JSON.stringify(ANCHORS, null, 2)} as const;
export const LINES: Line[] = ${JSON.stringify(lines, null, 1)};
export const cue = (id: string) => LINES.find((l) => l.id === id)!.t;
`;
fs.writeFileSync('src/cine/film/cues.ts', ts);
// check overlaps
for (let i = 1; i < lines.length; i++) {
  const gap = lines[i].t - (lines[i - 1].t + lines[i - 1].d);
  if (gap < 0) console.warn(`overlap ${lines[i - 1].id}→${lines[i].id}: ${gap.toFixed(2)}s`);
}
console.log('cues.ts written,', lines.length, 'lines');
