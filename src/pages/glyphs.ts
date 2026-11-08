import { pageHead, section, spec } from './_ui';
import { barcode, bitmap, brackets, checker, dotMatrix, locator, pixelIcon, pixelIconNames, registration, segRing, triTile } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { markNames, mountMark } from '../lib/marks';
import { scramble } from '../lib/motion';
import { bag, on, $, $$ } from '../lib/util';

const mk = (kind: string, attrs: Record<string, string | number> = {}, cls = '') =>
  `<span class="${cls}" data-mark="${kind}" ${Object.entries(attrs).map(([k, v]) => `data-${k}="${v}"`).join(' ')}></span>`;
const steppedWedge = bitmap(Array.from({ length: 12 }, (_, row) => '#'.repeat(row + 1)), { size: 100 });

export default function mount(root: HTMLElement) {
  const b = bag();
  let sigilSeed = 100;
  const sigils = () =>
    Array.from({ length: 18 }, (_, i) => {
      const s = sigilSeed + i;
      const col = ['var(--c-acid)', 'var(--c-cobalt-hi)', 'var(--c-bone)', 'var(--c-lime)', 'var(--c-crimson)'][s % 5];
      return `<span style="color:${col}" title="seed ${s}">${mk('sigil', { seed: s, w: 5 + (s % 3) * 2, h: 5, size: 44, fps: 6 + (i % 4) })}</span>`;
    }).join('');

  root.innerHTML = `
  <section class="page">
    ${pageHead('04', 'Vector<br><span class="t-outline">Glyphs</span>', ['SVG · crispEdges', 'ANIMATED · STEPPED', 'data-mark="…"'], 94)}
    <p class="page-lede">Late-90s vector tech marks — and they are never still. Locators flip, reticles tick round, plugs seat into sockets,
    barcodes mutate under a scan line, sigils re-roll. Every animated mark is <b>mountMark(el, kind, opts)</b> in <b>lib/marks.ts</b>
    (or just <b>&lt;span data-mark="reticle"&gt;</b> + <b>hydrate()</b>), updates at a fixed low frame rate and inherits <b>currentColor</b> / <b>--accent</b>.</p>

    ${section('Animated marks', `lib/marks.ts · ${markNames.length} kinds`)}
    <div class="gly-marks">
      ${spec({ code: 'MK-01', title: 'Locator / checker', cls: 'locator · checker[mode]', body: `<span class="c-bone">${mk('locator', { size: 64 })}</span><span class="c-bone">${mk('checker', { size: 48, mode: 'invert' })}</span><span class="c-acid">${mk('checker', { cols: 3, rows: 3, size: 48, mode: 'noise', fps: 4 })}</span><span class="c-cobalt" style="color:var(--c-cobalt-hi)">${mk('checker', { cols: 4, rows: 2, size: 72, mode: 'shift', fps: 5 })}</span>` })}
      ${spec({ code: 'MK-02', title: 'Targeting', cls: 'crosshair · reticle', body: `<span class="c-bone">${mk('crosshair', { size: 64 })}</span><span class="c-acid">${mk('reticle', { size: 104 })}</span><span style="color:var(--c-cobalt-hi)">${mk('reticle', { size: 64, fps: 4 })}</span>` })}
      ${spec({ code: 'MK-03', title: 'Target lock', cls: 'target', body: `<span class="c-bone" data-state="caution">${mk('target', { size: 220 })}</span>` })}
      ${spec({ code: 'MK-04', title: 'LINK / sockets', cls: 'link[cols,rows]', body: `<span class="c-lime" data-state="cobalt">${mk('link', { cols: 3, rows: 3, size: 210 })}</span>`, foot: 'Plugs seat in 3 steps, socket fills, sequence loops.' })}
      ${spec({ code: 'MK-05', title: 'Barcode scan', cls: 'barcode', bodyCls: 'spec-body--col', body: `<span class="c-bone">${mk('barcode', { size: 260 })}</span><span class="c-acid">${mk('barcode', { size: 180, bars: 30, seed: 8, fps: 16 })}</span>` })}
      ${spec({ code: 'MK-06', title: 'Defrag mark', cls: 'segring', body: `<span style="color:var(--c-cobalt-hi)">${mk('segring', { size: 116 })}</span>`, foot: 'See the full-size film dials in <a class="c-acid" href="#/telemetry">Telemetry</a>.' })}
      ${spec({ code: 'MK-07', title: 'Scan / alarm dots', cls: 'dots[mode=scan|alarm]', body: `<span class="c-bone">${mk('dots', { cols: 10, rows: 4, size: 100, mode: 'scan' })}</span><span class="c-crimson">${mk('dots', { cols: 3, rows: 6, size: 36, mode: 'alarm', fps: 4 })}</span>` })}
      ${spec({ code: 'MK-08', title: 'Triangle tile', cls: 'tri', body: `<span style="color:var(--c-cobalt)" data-state="caution">${mk('tri', { cols: 12, rows: 5, size: 260 })}</span>` })}
      ${spec({ code: 'MK-09', title: 'Block text decode', cls: 'blocktext[text]', bodyCls: 'spec-body--col', body: `<div class="c-acid" id="bt-out" style="display:grid;place-items:center;min-height:70px">${mk('blocktext', { text: 'SHELL 07', size: 240 })}</div><label class="k-field"><span class="k-field__box"><span class="k-field__prefix">&gt;</span><input id="bt-in" value="SHELL 07" maxlength="14"></span></label>` })}
      ${spec({ code: 'MK-10', title: 'Scan block', cls: 'scanblock', body: `<span data-state="nominal">${mk('scanblock', { size: 280 })}</span>`, foot: 'Shared with the cinema opening. Stepped bands, square gaps at the seam, and a scan bar clipped to the plate.' })}
      ${spec({ code: 'MK-12', title: 'Pins / chevrons / bars', cls: 'connector · chevrons · bars', body: `<span class="c-lime">${mk('connector', { pins: 4, size: 60 })}</span><span class="c-bone">${mk('chevrons', { count: 6, size: 110 })}</span><span class="c-acid">${mk('bars', { count: 8, size: 64 })}</span>` })}
    </div>

    ${section('Pixel icons', `pixelIcon(name) · ${pixelIconNames.length} glyphs · click → copy SVG`)}
    <div class="gly-icons">
      ${pixelIconNames.map((n) => `<button class="gly-icon" data-icon="${n}" title="${n}">${pixelIcon(n, { size: 28 })}<span>${n}</span></button>`).join('')}
    </div>

    ${section('Sigils', 'data-mark="sigil" · re-roll through noise frames')}
    <div class="gly-sigils" id="sigils">${sigils()}</div>
    <div style="margin-top:12px"><button class="k-btn k-btn--sm" id="reseed">Reseed ${pixelIcon('scan', { size: 10 })}</button></div>

    ${section('Static generators', 'lib/glyphs.ts → SVG strings')}
    <div class="spec-grid">
      ${spec({ code: 'SG-01', title: 'Marks', cls: 'locator checker registration', body: `<span class="c-bone">${locator({ size: 40 })}</span><span class="c-bone">${checker(3, 3, { size: 36 })}</span><span class="c-cobalt">${registration({ size: 36 })}</span><span class="c-hazard">${brackets(80, 40, 8, { size: 80 })}</span>` })}
      ${spec({ code: 'SG-02', title: 'Data', cls: 'barcode dotMatrix', body: `<span class="c-bone">${barcode(5, { size: 140, h: 18 })}</span><span class="c-acid">${dotMatrix(8, 4, (x, y) => (x + y) % 3 !== 0, { size: 64 })}</span>` })}
      ${spec({ code: 'SG-03', title: 'Fields', cls: 'segRing triTile', body: `<span style="color:var(--c-cobalt-hi)">${segRing(6, { size: 104 })}</span><span style="color:var(--c-cobalt)">${triTile(8, 3, 4, { size: 150 })}</span>` })}
    </div>

    ${section('Patterns', 'CSS tiles · dots, crosses, hatching and registration screens')}
    <div class="gly-patterns">
      <div><div class="k-hazard k-hazard--bw k-hazard--anim" style="height:80px;--h-w:6px"></div><span class="t-micro">.k-hazard--bw --h-w:6px</span></div>
      <div><div class="k-hazard k-hazard--red" style="height:80px;--h-b:var(--c-cobalt)"></div><span class="t-micro">.k-hazard--red --h-b:cobalt</span></div>
      <div><div class="k-checker k-checker--anim" style="height:80px"></div><span class="t-micro">.k-checker.k-checker--anim</span></div>
      <div><div class="k-checker" style="height:80px;--ck:4px;--ck-a:var(--c-acid)"></div><span class="t-micro">.k-checker --ck:4px</span></div>
      <div><div class="k-dots" style="height:80px;--d:10px;--d-c:var(--c-cobalt)"></div><span class="t-micro">.k-dots --d:10px</span></div>
      <div><div class="k-dots k-dots--x gly-ink-swatch"></div><span class="t-micro">.k-dots--x · spaced crosses</span></div>
      <div><div class="k-dots k-dots--x-block gly-ink-swatch"></div><span class="t-micro">.k-dots--x-block · square tips</span></div>
      <div><div class="k-hatch gly-ink-swatch"></div><span class="t-micro">.k-hatch · diagonal lines</span></div>
      <div><div class="k-hatch k-hatch--cross gly-ink-swatch"></div><span class="t-micro">.k-hatch--cross · diamond mesh</span></div>
      <div><div style="height:80px;background:#000"><div class="k-dotscreen" style="width:78%;height:100%;background:var(--c-acid);clip-path:polygon(0 0,100% 0,100% 60%,75% 60%,75% 100%,0 100%)"></div></div><span class="t-micro">.k-dotscreen on a clipped plate</span></div>
    </div>
    ${spec({
      code: 'PT-01',
      title: 'Broken signal field',
      cls: 'Clipped texture layers',
      bodyCls: 'spec-body--flush',
      style: 'margin-top:var(--gap)',
      body: `<div class="gly-overprint" aria-hidden="true">
        <i class="k-dots gly-overprint__dots"></i>
        <i class="k-hatch gly-overprint__hatch"></i>
        <i class="k-hatch k-hatch--cross gly-overprint__mesh"></i>
        <i class="k-dots k-dots--x gly-overprint__crosses"></i>
        <i class="k-dots k-dots--x-block gly-overprint__dense"></i>
        <span class="gly-overprint__code t-micro">RX 0447 / 07<br>SYNC LOST<br>NO RECOVERY</span>
        <b class="gly-overprint__word t-display">Desync_</b>
      </div>`,
      foot: 'Open dots leave room for type. Clipped hatching and dense crosses build up texture in selected areas of the field.',
    })}
    ${spec({
      code: 'PT-02',
      title: 'Pixel marker field',
      cls: '.k-dots.k-dots--motif',
      bodyCls: 'spec-body--flush',
      style: 'margin-top:var(--gap)',
      body: `<div class="k-dots k-dots--motif gly-motif" aria-hidden="true">
        <span class="gly-motif__wedge">${steppedWedge}</span>
        <span class="gly-motif__wedge gly-motif__wedge--edge">${steppedWedge}</span>
        <span class="gly-motif__index t-micro">SECTOR RX–06</span>
        <span class="gly-motif__latch t-micro">LATCH / 06</span>
        <b class="gly-motif__number t-display">6</b>
      </div>`,
      foot: 'Corners, squares and diagonal steps share a sparse grid. One large index and stepped wedges sit over the flat field.',
    })}
  </section>`;

  b.add(hydrate(root));

  // Copy the selected icon.
  const icons = $$<HTMLButtonElement>('.gly-icon', root);
  icons.forEach((btn) =>
    b.add(
      on(btn, 'click', async () => {
        const name = btn.dataset.icon!;
        try {
          await navigator.clipboard.writeText(pixelIcon(name, { size: 24 }));
        } catch {
          /* ignore */
        }
        const label = btn.querySelector('span')!;
        await scramble(label, 'COPIED', { duration: 0.2 });
        setTimeout(() => (label.textContent = name), 600);
      }),
    ),
  );

  // sigils reseed (re-hydrate the sigil marks)
  let sigilStop: (() => void)[] = [];
  const mountSigils = () => {
    sigilStop.forEach((f) => f());
    $('#sigils', root).innerHTML = sigils();
    sigilStop = $$('#sigils [data-mark]', root).map((el) =>
      mountMark(el, 'sigil', { seed: Number(el.dataset.seed), w: Number(el.dataset.w), h: 5, size: 44, fps: Number(el.dataset.fps) }),
    );
  };
  b.add(
    on($('#reseed', root), 'click', () => {
      sigilSeed += 18;
      mountSigils();
    }),
  );
  b.add(() => sigilStop.forEach((f) => f()));

  // block text input → remount the decode mark
  const bti = $<HTMLInputElement>('#bt-in', root);
  let btStop: () => void = () => {};
  b.add(
    on(bti, 'input', () => {
      btStop();
      const out = $('#bt-out', root);
      out.innerHTML = '<span></span>';
      btStop = mountMark(out.firstElementChild as HTMLElement, 'blocktext', { text: bti.value || ' ', size: Math.min(300, 30 * Math.max(1, bti.value.length)) });
    }),
  );
  b.add(() => btStop());
  return b.dispose;
}
