// Generate one continuous instrumental score with Lyria 3.5.
//   node scripts/gen-music.mjs [name]
import fs from 'node:fs';
import { api } from './gemini.mjs';

const name = process.argv[2] ?? 'shell-07';
export const PROMPT = `Compose one continuous 2 minute 27 second instrumental score for SHELL 07, an original science-fiction short. This is one song with a single production palette and a recurring three-note acid motif. All scene cues describe changes within the same performance. Stay at 128 BPM in 4/4 with an A-minor tonal centre; use half-time perception where indicated. Sound sources: short 909 drums, a resonant 303 bass, dry metallic ticks, cold analogue pads and controlled sub. The mix has room for a narrator and separate effects. Instrumental throughout. No singing, speech, whispers, choir, samples of voices, or literal sound effects. Follow these film-time cues.

[00:00–00:04] Boot. Almost silent. Three dry electronic ticks and a restrained low swell set up the first hit.
[00:04–00:08] Initiating. Single low downbeat. Introduce the three-note bass motif as short, filtered pulses under the link and printing slate.
[00:08–00:12] Defragmentation. Keep the same bass; rearrange dry metallic ticks around it, resolving into a repeating pattern as the ring sorts.
[00:12–00:16.8] Vital signs. Thin heartbeat-like kick and a quiet two-note diagnostic response. Keep the centre open.
[00:16.8–00:20.8] Recognition. Repeat the diagnostic rhythm with a brighter envelope and a single rising accent.
[00:20.8–00:31.4] Memory loading. Assemble the groove one subdivision at a time. At 00:26.25, interrupt it with a brief muted stutter for the rejected memory; continue in the same tempo and key.
[00:31.4–00:41.97] Neural circuits activate. Interlocking short arpeggios turn on in separate registers, as if paths are connecting across two hemispheres. Build in waves with a short filter rise near 00:40.09.
[00:41.97–00:45.2] Runner reveal. First clear acid-techno drop. Full kick and bass, tightly articulated, with a sharply defined downbeat.
[00:45.2–00:48.6] Disembodied consciousness. Let gated delay echoes of that motif trail the beat; make the lead feel detached from the kick.
[00:48.6–00:53.22] Printed shell. Bring the bass back into tight mechanical alignment. Add one dry metallic accent and then strip the beat away.
[00:53.22–00:59.5] Previous shell killed. Sudden near-silence from 00:53.22 to 00:54.70. Leave the impact to the film, then carry a fractured, kickless low bed.
[00:59.5–01:04.07] Psyche ejected. A high, thin tone rises out of the low bed as the rhythm hangs.
[01:04.07–01:15.32] Shell printed. Return the kick in an assembly-line pattern. Reintroduce the motif one layer at a time; add heavier accents near 01:14.4 and stop at 01:15.32.
[01:15.32–01:21.2] Stand by. Hold a faint cold tone, letting it recede to near silence. Leave room for the short status line.
[01:21.2–01:32.6] Periapt IV and orbital drop. Open wide, cold pads over a half-time sub pulse. At 01:27.3 introduce descending sequencer accents for the orbital drop.
[01:32.6–01:37.82] Drop-zone survey. Keep the orbital pad; add sparse, precise pulses that step down like map contours.
[01:37.82–01:43.45] Authority patrol. Narrow the stereo field, restore the kick and use a darker, syncopated version of the same motif.
[01:43.45–01:46.8] Cognition runtime error. Abrupt peak in pressure with clipped off-beat synth stabs. Leave holes for alarm effects and narration.
[01:46.8–01:49.75] Shell 06 signal. Collapse to a solitary repeated pitched pulse with a thin sub tail.
[01:49.75–01:52.8] Two instances. Answer the same pulse with a second, detuned version on the opposite side of the stereo field.
[01:52.8–01:56.4] Suboptimal settings. Let the pair resolve into a compromised groove with missing beats.
[01:56.4–02:06.4] Buffer complete. Rebuild from the original three-note motif. Clear downbeat near 02:00.32 and a decisive second lift, controlled rather than triumphant.
[02:06.4–02:12] ORA. Smooth out the rough edges into a clean, bright but synthetic chord over the existing bass.
[02:12–02:17.2] Contract. Hold the tempo, thin the arrangement and introduce one darker note as Shell 06 is named.
[02:17.2–02:22.82] Transfer countdown. Reduce to three spaced rising synth pulses at about 02:20.85, 02:21.50 and 02:22.15; let the narrator carry the countdown.
[02:22.82–02:27] Initiate and close. Hard musical cutoff at 02:22.82. Leave the ending nearly silent with one short low residual tone.`;

const started = Date.now();
const result = await api('interactions', {
  method: 'POST',
  body: { model: 'lyria-3.5', input: PROMPT, store: false },
});
const parts = result.steps?.filter((step) => step.type === 'model_output').flatMap((step) => step.content ?? [])
  ?? result.outputs ?? [];
const audio = parts.filter((part) => part.type === 'audio' && part.data);
if (audio.length !== 1) {
  throw new Error(`Expected one Lyria audio output, got ${audio.length} (${result.status ?? 'unknown status'}).`);
}
const folder = 'scripts/.cache/music';
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(`${folder}/${name}.mp3`, Buffer.from(audio[0].data, 'base64'));
const notes = parts.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
if (notes) fs.writeFileSync(`${folder}/${name}.txt`, notes);
console.log(`${name} generated in ${((Date.now() - started) / 1000).toFixed(0)}s`);
