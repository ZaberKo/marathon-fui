import { pageHead, section } from './_ui';
import { checker, pixelIcon, pixelSigil } from '../lib/glyphs';
import {
  mountDefragRing, mountGauge, mountMemoryGrid, mountOrbitMap, mountScope,
  mountSpectrum, mountTerminal, mountTracker,
} from '../lib/hud';
import { hydrate } from '../lib/hydrate';
import { countTo, flickerReadout } from '../lib/motion';
import { bag, pad, stepLoop, $, $$ } from '../lib/util';

export default function mount(root: HTMLElement) {
  const b = bag();
  const panel = (code: string, title: string, body: string, cls = '', state = '') => `
    <div class="k-panel tel-cell ${cls}" ${state ? `data-state="${state}"` : ''}>
      <div class="k-panel__head"><span>${title}</span><span class="t-pixel" style="font-weight:400;font-size:8px">${code}</span></div>
      <div class="k-panel__body">${body}</div>
    </div>`;

  root.innerHTML = `
  <section class="page">
    ${pageHead('05', 'Tele<br><span class="t-outline">metry</span>', ['CANVAS 2D INSTRUMENTS', 'STEP LOOPS 4–20 FPS', 'PAUSE OFF-SCREEN'], 115)}
    <p class="page-lede">Instruments for machine-vision dashboards. Each is <b>mountX(el, opts) → cleanup</b> in <b>lib/hud.ts</b>,
    driven by a fixed-rate <b>stepLoop</b> so readouts jump rather than glide, and pause automatically when scrolled out of view.</p>

    ${section('Dashboard', 'COMPOSITE')}
    <div class="tel-grid">
      ${panel('HUD-01', 'Orbital approach', `<div class="tel-orbit"><canvas id="t-orbit"></canvas>
          <div class="tel-orbit__lbl"><span class="t-display t-wide">System</span><b class="t-display">Approach</b><span style="color:var(--c-cobalt-hi)">${pixelIcon('chevron', { size: 18 })}</span></div>
          <div class="tel-orbit__codes t-micro">340 - 24967<br>QR ER6 9T8<br>TU XEI 0407<br><br>4830 - 2484<br>PK 576 928</div>
          <span class="tel-orbit__ck" style="color:var(--c-cobalt)">${checker(4, 2, { size: 52 })}</span>
        </div>`, 'tel-a', 'cobalt')}
      ${panel('HUD-02', 'Defrag', `<div class="tel-defrag"><canvas id="t-defrag"></canvas><div class="tel-defrag__c"><span class="c-acid">${pixelSigil(4, { size: 20 })}</span><span class="t-pixel c-acid">DEFRAG</span><b class="t-pixel" id="t-defrag-n">000</b></div></div>`, 'tel-b')}
      ${panel('HUD-03', 'Countdown', `<div class="tel-count"><canvas id="t-count-ring"></canvas><div class="tel-count__n"><b class="t-display t-cond" id="t-count">268</b><span class="t-micro">BUFFER REMAINING</span></div></div>`, 'tel-c', 'critical')}
      ${panel('HUD-04', 'Gauges', `<div class="tel-gauges"><div id="g1"></div><div id="g2" data-state="caution"></div><div id="g3" data-state="link"></div></div>`, 'tel-d')}
      ${panel('HUD-05', 'Spectrum', `<canvas class="tel-canvas" id="t-spec"></canvas>`, 'tel-e')}
      ${panel('HUD-06', 'Oscilloscope', `<canvas class="tel-canvas" id="t-scope"></canvas>`, 'tel-f')}
      ${panel('HUD-07', 'Loading memory', `<div class="tel-mem"><div id="t-mem"></div><div class="tel-mem__side t-micro"><span class="t-display c-lime" style="font-size:14px;writing-mode:vertical-rl">Loading memory</span><span>SDR37<br>24455<br>MQ EXC</span></div></div>`, 'tel-g', 'link')}
      ${panel('HUD-08', 'System log', `<div id="t-log"></div>`, 'tel-h')}
      ${panel('HUD-09', 'Target tracker', `<div id="t-track"></div>`, 'tel-i')}
      ${panel('HUD-10', 'Readouts', `<div class="tel-reads">${['SHELL', 'CORE TEMP', 'O2 SAT', 'HEART', 'NEURAL', 'UPLINK', 'LAT', 'LON', 'ALT', 'VEL', 'SECTOR', 'GRID', 'PING', 'LOSS', 'CELL', 'SYNC']
        .map((k, i) => `<div><span>${k}</span><b data-read="${i}">0000</b></div>`)
        .join('')}</div>`, 'tel-j')}
    </div>
  </section>`;

  b.add(hydrate(root));
  b.add(mountOrbitMap($('#t-orbit', root), { target: 'VESTA (7)' }));
  b.add(mountDefragRing($('#t-defrag', root)));
  b.add(mountDefragRing($('#t-count-ring', root), { rings: 2, segs: 64, on: '#ff2a17', dim: '#4d0904', hi: '#ececec', inner: 0.62, fps: 15 }));
  b.add(mountGauge($('#g1', root), { label: 'SHELL INTEGRITY', value: 0.82 }));
  b.add(mountGauge($('#g2', root), { label: 'THERMAL LOAD', value: 0.46 }));
  b.add(mountGauge($('#g3', root), { label: 'LINK QUALITY', value: 0.91 }));
  b.add(mountSpectrum($('#t-spec', root)));
  b.add(mountScope($('#t-scope', root)));
  b.add(mountMemoryGrid($('#t-mem', root), { cols: 10, rows: 7 }));
  b.add(mountTerminal($('#t-log', root)));
  b.add(mountTracker($('#t-track', root)));

  // defrag percentage
  const dn = $('#t-defrag-n', root);
  let dp = 0;
  b.add(stepLoop(6, () => (dn.textContent = pad((dp = (dp + 1) % 101), 3)), dn));

  // countdown
  const cn = $('#t-count', root);
  let n = 268;
  b.add(
    stepLoop(
      2,
      () => {
        n = n <= 0 ? 268 : n - 1;
        if (n % 20 === 0) countTo(cn, n, { from: n + 20, steps: 6, duration: 0.3, pad: 3 });
        else cn.textContent = pad(n, 3);
      },
      cn,
    ),
  );

  $$('[data-read]', root).forEach((el, i) => b.add(flickerReadout(el, { fps: 3 + (i % 4), len: 4, seed: i + 1 })));
  return b.dispose;
}
