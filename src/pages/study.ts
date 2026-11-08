import { pageHead, section } from './_ui';
import { pixelIcon } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { bag } from '../lib/util';
import { SHOTS } from '../cine/film';
import { DURATION, LINES } from '../cine/film/cues';

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(1, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;

/** Design decisions behind the film — each states the meaning first, then the treatment. */
const NOTES: [string, string, string][] = [
  ['Solid fields', 'Black separates states and leaves room for the main signal.', 'Cobalt standby and orange-red fault fill the frame. Pixel gaps, clipped patterns and sparse panel groups stay within selected graphics.'],
  ['Motion', 'Each element moves on its own clock.', 'Type, counters and plate displacement jump in steps. Shot cuts land on the score cues.'],
  ['Acquiring the shell', 'The opening links the cached psyche to Shell 07.', 'Horizontal sections of the blue initiating plate shift along a stepped seam. The shell preview resolves beside the link indicator before the defragmentation ring takes over.'],
  ['Anatomy is a graphic plate', 'Quoting a medical plate in smooth line work, kept 2D.', 'Nerve bundles of many strands in several colours fan into fingers and toes; muscles are spline shapes filled with fibre lines; organs are hatched shapes; the brain has gyri, and the optic pathway runs in its own colour.'],
  ['3D structure, 2D signal', 'Memory is a physical module; “loaded” is a flat state.', 'Seen from almost straight above: a chip array of mixed cells (notched packages, dies, bosses, contact rows, edge pins), each a stack of thin layers, in 3D lines with hidden lines removed. Loaded cells become flat lemon graphics with their details cut out. The failure wall is continuous rows of words joined by underscores, the failing word inline.'],
  ['Connections inside the brain', 'The buffer filling is a brain coming alive from within.', 'Tractography: projection fans rising from the brain stem, the corpus callosum arching across, long association arcs front to back, U-fibres under the cortex, coloured by direction. They light from the core outward and signals keep flowing along them. The same network sits inside the transfer head.'],
  ['Voxels from the mesh', 'Cubes on a body are evenly spaced, so they read as a material.', 'One voxel per surface grid cell, anchored to its nearest vertex so it follows the skeleton. In the death shot, green wire voxels turn red from the wound and burst on impact.'],
  ['Glitch lives on the body', 'Interference belongs to the shell itself.', 'Glitch bands are part of the body material. Stencil decals (numbers, stripes, barcodes, chevrons) are laid flat on the surface and ride the bones.'],
  ['Parallel printing, wired to the mind', 'A shell is printed in segments, all at once, from the psyche.', 'The body lies on its back along the frame. Eight cross-section frames divide it; each prints its own front with a real contour, and each frame is wired through one bus to the brain on its grid.'],
  ['One continuous descent', 'System → planet → orbit → drop zone.', 'A drafted chart with a star that dwarfs its planets, a matched scale handoff from dithered schematic to sensor feed, the station in orbit dropping runners down arcs onto every signal, the camera following one drop down — into a contour map of the drop zone (isolines lifted to their height, ruins as map symbols).'],
  ['Entering the device', 'The transfer is the mind moving in, and the film ends there.', 'A wire head built to real proportions (eye line at mid-height, 63 mm between the pupils, a brain that fills the cranium) with about seventy optic fibres per eye. The camera orbits to the back and pushes through the brain to the eyes; 3-2-1 and INIT run in the eyes; at once the view rushes down the optic nerves, the eyes fuse into one ring, blue flood, black — “Good luck.”'],
];

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('09', 'Film<br><span class="t-outline">Shell 07</span>', ['WEB FILM', `${SHOTS.length} SHOTS / ${Math.round(DURATION)}S`, 'SEEKABLE'], 191)}
    <p class="page-lede">A support AI reassembles a dead runner into a newly printed shell, and finds the old shell is still walking.
    The film runs in the browser as a timeline where each frame depends only on the time.</p>
    <ul class="st-facts">
      <li><b>Picture:</b> three.js (WebGPU, falling back to WebGL2) layered with Canvas2D graphics.</li>
      <li><b>Models:</b> every model is generated in code; only the motion data is third-party.</li>
      <li><b>Score:</b> a continuous Lyria 3.5 acid techno track at 128 BPM, with level changes timed to the edit.</li>
      <li><b>Voice:</b> synthetic narration shaped by line and processed with ffmpeg.</li>
      <li><b>Mix:</b> everything is mixed offline with ffmpeg, and the audio clock drives the picture.</li>
    </ul>
    <div class="st-open">
      <a class="k-cta" href="./cinema.html">
        <span class="k-cta__code">FILM 01 / PLAYER</span>
        <span class="k-cta__meta">Sound on · Space play · ←/→ 1 s · C captions EN/中文 · F fullscreen</span>
        <span class="k-cta__label">Play Shell 07</span>
        <span class="k-cta__arrow">${pixelIcon('chevron-2', { size: 20 })}</span>
      </a>
    </div>

    ${section('Design notes', 'MEANING FIRST → TREATMENT')}
    <div class="st-gaps">
      ${NOTES.map(([k, why, how], i) => `
        <article class="spec">
          <div class="spec-head"><span class="code">N-${String(i + 1).padStart(2, '0')}</span><span>${k}</span></div>
          <div class="spec-body st-gap"><p>${why}</p><p class="st-fix"><b>→</b> ${how}</p></div>
        </article>`).join('')}
    </div>

    ${section('Shot list', 'CLICK TO OPEN AT TIME')}
    <div class="st-shots">
      ${SHOTS.map((s) => {
        const vo = LINES.filter((l) => l.t >= s.t0 && l.t < s.t1).map((l) => l.en).join(' ');
        return `
        <a class="st-row" href="./cinema.html?t=${(s.t0 + 0.05).toFixed(2)}">
          <span class="st-id">${s.id}</span>
          <span class="st-time">${fmt(s.t0)}–${fmt(s.t1)}</span>
          <span class="st-title">${s.title}</span>
          <span class="st-note">${vo ? `<i>“${vo}”</i> ` : ''}${s.note ?? ''}</span>
        </a>`;
      }).join('')}
    </div>
  </section>`;
  b.add(hydrate(root));
  return b.dispose;
}
