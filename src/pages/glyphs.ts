import { pageHead, section, spec } from './_ui';
import { barcode, brackets, checker, dotMatrix, locator, pixelIcon, pixelIconNames, registration, segRing, triTile } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { mountMark } from '../lib/marks';
import { scramble } from '../lib/motion';
import { bag, on, stepLoop, $, $$ } from '../lib/util';

const mk = (kind: string, attrs: Record<string, string | number> = {}, cls = '') =>
  `<span class="${cls}" data-mark="${kind}" ${Object.entries(attrs).map(([k, v]) => `data-${k}="${v}"`).join(' ')}></span>`;

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

    ${section('Animated marks', 'lib/marks.ts · 17 kinds')}
    <div class="gly-marks">
      ${spec({ code: 'MK-01', title: 'Locator / checker', cls: 'locator · checker[mode]', body: `<span class="c-bone">${mk('locator', { size: 64 })}</span><span class="c-bone">${mk('checker', { size: 48, mode: 'invert' })}</span><span class="c-acid">${mk('checker', { cols: 3, rows: 3, size: 48, mode: 'noise', fps: 4 })}</span><span class="c-cobalt" style="color:var(--c-cobalt-hi)">${mk('checker', { cols: 4, rows: 2, size: 72, mode: 'shift', fps: 5 })}</span>` })}
      ${spec({ code: 'MK-02', title: 'Targeting', cls: 'crosshair · reticle', body: `<span class="c-bone">${mk('crosshair', { size: 64 })}</span><span class="c-acid">${mk('reticle', { size: 104 })}</span><span style="color:var(--c-cobalt-hi)">${mk('reticle', { size: 64, fps: 4 })}</span>` })}
      ${spec({ code: 'MK-03', title: 'Target lock', cls: 'target', body: `<span class="c-bone" data-state="caution">${mk('target', { size: 220 })}</span>` })}
      ${spec({ code: 'MK-04', title: 'LINK / sockets', cls: 'link[cols,rows]', body: `<span class="c-lime" data-state="cobalt">${mk('link', { cols: 3, rows: 3, size: 210 })}</span>`, foot: 'Plugs seat in 3 steps, socket fills, sequence loops.' })}
      ${spec({ code: 'MK-05', title: 'Barcode scan', cls: 'barcode', bodyCls: 'spec-body--col', body: `<span class="c-bone">${mk('barcode', { size: 260 })}</span><span class="c-acid">${mk('barcode', { size: 180, bars: 30, seed: 8, fps: 16 })}</span>` })}
      ${spec({ code: 'MK-06', title: 'Defrag ring', cls: 'segring', body: `<span style="color:var(--c-cobalt-hi)">${mk('segring', { size: 140 })}</span><span class="c-acid">${mk('segring', { size: 96, rings: 2, segs: 18, seed: 9, fps: 8 })}</span>` })}
      ${spec({ code: 'MK-07', title: 'Dot matrix', cls: 'dots[mode=wave|scan|alarm|noise]', body: `<span class="c-acid">${mk('dots', { cols: 14, rows: 5, size: 140, mode: 'wave' })}</span><span class="c-bone">${mk('dots', { cols: 10, rows: 4, size: 100, mode: 'scan' })}</span><span class="c-crimson">${mk('dots', { cols: 3, rows: 6, size: 36, mode: 'alarm', fps: 4 })}</span>` })}
      ${spec({ code: 'MK-08', title: 'Triangle tile', cls: 'tri', body: `<span style="color:var(--c-cobalt)" data-state="caution">${mk('tri', { cols: 12, rows: 5, size: 260 })}</span>` })}
      ${spec({ code: 'MK-09', title: 'Block text decode', cls: 'blocktext[text]', bodyCls: 'spec-body--col', body: `<div class="c-acid" id="bt-out" style="display:grid;place-items:center;min-height:70px">${mk('blocktext', { text: 'SHELL 07', size: 240 })}</div><label class="k-field"><span class="k-field__box"><span class="k-field__prefix">&gt;</span><input id="bt-in" value="SHELL 07" maxlength="14"></span></label>` })}
      ${spec({ code: 'MK-10', title: 'Scan block', cls: 'scanblock', body: `<span data-state="nominal">${mk('scanblock', { size: 280 })}</span>`, foot: 'The "INITIATING" composition: sweep bar + progress tick + pixel edge noise.' })}
      ${spec({ code: 'MK-11', title: 'Count ring', cls: 'countring[max,label]', body: `<span class="c-bone" data-state="critical">${mk('countring', { size: 140 })}</span><span class="c-bone" data-state="nominal">${mk('countring', { size: 100, max: 100, label: 'SYNC', fps: 14 })}</span>` })}
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
      ${spec({ code: 'SG-03', title: 'Fields', cls: 'segRing triTile', body: `<span style="color:var(--c-cobalt-hi)">${segRing(6, { size: 72 })}</span><span style="color:var(--c-cobalt)">${triTile(8, 3, 4, { size: 150 })}</span>` })}
    </div>

    ${section('Patterns', 'CSS only · .k-hazard .k-checker .k-dots .k-scan')}
    <div class="gly-patterns">
      <div><div class="k-hazard k-hazard--anim" style="height:80px"></div><span class="t-micro">.k-hazard.k-hazard--anim</span></div>
      <div><div class="k-hazard k-hazard--bw k-hazard--anim" style="height:80px;--h-w:6px"></div><span class="t-micro">.k-hazard--bw --h-w:6px</span></div>
      <div><div class="k-hazard k-hazard--red" style="height:80px;--h-b:var(--c-cobalt)"></div><span class="t-micro">.k-hazard--red --h-b:cobalt</span></div>
      <div><div class="k-checker k-checker--anim" style="height:80px"></div><span class="t-micro">.k-checker.k-checker--anim</span></div>
      <div><div class="k-checker" style="height:80px;--ck:4px;--ck-a:var(--c-acid)"></div><span class="t-micro">.k-checker --ck:4px</span></div>
      <div><div class="k-dots" style="height:80px"></div><span class="t-micro">.k-dots</span></div>
      <div><div class="k-dots" style="height:80px;--d:10px;--d-c:var(--c-cobalt)"></div><span class="t-micro">.k-dots --d:10px</span></div>
      <div><div class="k-scan k-scan--anim" style="height:80px"></div><span class="t-micro">.k-scan.k-scan--anim</span></div>
      <div><div class="k-rule" style="margin-top:36px"></div><span class="t-micro" style="margin-top:35px">.k-rule</span></div>
    </div>
  </section>`;

  b.add(hydrate(root));

  // icons: copy on click; idle glitch on a random icon every few steps
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
  b.add(
    stepLoop(
      2.5,
      () => {
        const ic = icons[Math.floor(Math.random() * icons.length)];
        ic.classList.add('is-glitch');
        setTimeout(() => ic.classList.remove('is-glitch'), 320);
      },
      $('.gly-icons', root),
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
