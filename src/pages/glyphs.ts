import { pageHead, section, spec } from './_ui';
import {
  barcode, blockText, brackets, checker, connector, crosshair, dotMatrix, locator,
  pixelIcon, pixelIconNames, pixelSigil, registration, reticle, segRing, triTile,
} from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { scramble } from '../lib/motion';
import { bag, on, $, $$ } from '../lib/util';

export default function mount(root: HTMLElement) {
  const b = bag();
  let sigilSeed = 100;
  const sigils = () =>
    Array.from({ length: 24 }, (_, i) => {
      const s = sigilSeed + i;
      const col = ['var(--c-acid)', 'var(--c-cobalt-hi)', 'var(--c-bone)', 'var(--c-lime)', 'var(--c-crimson)'][s % 5];
      return `<span style="color:${col}" title="seed ${s}">${pixelSigil(s, { w: 5 + (s % 3) * 2, h: 5, size: 44 })}</span>`;
    }).join('');

  root.innerHTML = `
  <section class="page">
    ${pageHead('04', 'Vector<br><span class="t-outline">Glyphs</span>', ['SVG · crispEdges', 'GENERATED / SEEDED', 'CLICK ICON → COPY SVG'], 94)}
    <p class="page-lede">Late-90s vector tech marks: pixel icons on integer grids, checkerboard locator flags, pseudo-barcodes,
    connector diagrams, crosshairs. Every mark is a <b>function returning an SVG string</b> in <b>lib/glyphs.ts</b> and inherits <b>currentColor</b>.</p>

    ${section('Pixel icons', `pixelIcon(name) · ${pixelIconNames.length} glyphs`)}
    <div class="gly-icons">
      ${pixelIconNames.map((n) => `<button class="gly-icon" data-icon="${n}" title="${n}">${pixelIcon(n, { size: 28 })}<span>${n}</span></button>`).join('')}
    </div>

    ${section('Sigils', 'pixelSigil(seed) · mirrored random clusters')}
    <div class="gly-sigils" id="sigils">${sigils()}</div>
    <div style="margin-top:12px"><button class="k-btn k-btn--sm" id="reseed">Reseed ${pixelIcon('scan', { size: 10 })}</button></div>

    ${section('Marks', 'locator · checker · crosshair · reticle · registration')}
    <div class="spec-grid">
      ${spec({ code: 'MK-01', title: 'Locator / checker', cls: 'locator() checker(c,r)', body: `<span class="c-bone">${locator({ size: 56 })}</span><span class="c-bone">${checker(2, 2, { size: 48 })}</span><span class="c-acid">${checker(3, 3, { size: 48 })}</span><span class="c-cobalt">${checker(4, 2, { size: 64, invert: true })}</span>` })}
      ${spec({ code: 'MK-02', title: 'Targeting', cls: 'crosshair() reticle()', body: `<span class="c-bone">${crosshair({ size: 56 })}</span><span class="c-acid fx-spin-steps" style="display:inline-block">${reticle({ size: 84 })}</span><span class="c-cobalt">${registration({ size: 48 })}</span>` })}
      ${spec({ code: 'MK-03', title: 'Brackets', cls: 'brackets(w,h,len)', body: `<div style="position:relative;display:grid;place-items:center" class="c-hazard">${brackets(180, 90, 14, { size: 180 })}<span class="t-display t-wide" style="position:absolute;color:var(--c-bone);font-size:18px">Target</span></div>` })}
      ${spec({ code: 'MK-04', title: 'Barcodes', cls: 'barcode(seed)', bodyCls: 'spec-body--col', body: `<span class="c-bone">${barcode(3, { size: 220, h: 24 })}</span><span class="c-acid">${barcode(8, { size: 160, h: 10, bars: 30 })}</span><span class="t-micro">SDR37 2445556 · QR EXC FF</span>` })}
      ${spec({ code: 'MK-05', title: 'Connectors', cls: 'connector({pins})', body: `<span class="c-lime">${connector({ pins: 2, size: 36 })}</span><span class="c-lime">${connector({ pins: 4, size: 52 })}</span><span class="c-hazard">${connector({ pins: 6, size: 68 })}</span><span class="t-display t-wide c-lime" style="font-size:22px">Link</span>` })}
      ${spec({ code: 'MK-06', title: 'Segment ring', cls: 'segRing(seed)', body: `<span class="c-cobalt-hi" style="color:var(--c-cobalt-hi)">${segRing(5, { size: 130 })}</span><span class="c-acid">${segRing(9, { size: 90, rings: 3, segs: 24 })}</span>` })}
      ${spec({ code: 'MK-07', title: 'Dot matrix', cls: 'dotMatrix(c,r,fn)', body: `<span class="c-bone">${dotMatrix(5, 5, (x, y) => (x + y) % 2 === 0 || x === 2, { size: 60 })}</span><span class="c-crimson">${dotMatrix(3, 6, () => true, { size: 36 })}</span><span class="c-acid">${dotMatrix(12, 4, (x, y) => Math.sin(x * 0.9 + y) > -0.2, { size: 120 })}</span>` })}
      ${spec({ code: 'MK-08', title: 'Triangle tile', cls: 'triTile(c,r,seed)', body: `<span style="color:var(--c-cobalt)">${triTile(12, 5, 4, { size: 260 })}</span>` })}
      ${spec({ code: 'MK-09', title: 'Block text', cls: 'blockText(str)', bodyCls: 'spec-body--col', body: `<div class="c-acid" id="bt-out" style="display:grid;place-items:center;min-height:70px">${blockText('SHELL 07', { size: 240 })}</div><label class="k-field"><span class="k-field__box"><span class="k-field__prefix">&gt;</span><input id="bt-in" value="SHELL 07" maxlength="14"></span></label>` })}
    </div>

    ${section('Patterns', 'CSS only · .k-hazard .k-checker .k-dots .k-scan')}
    <div class="gly-patterns">
      <div><div class="k-hazard k-hazard--anim" style="height:80px"></div><span class="t-micro">.k-hazard.k-hazard--anim</span></div>
      <div><div class="k-hazard k-hazard--bw" style="height:80px;--h-w:6px"></div><span class="t-micro">.k-hazard--bw --h-w:6px</span></div>
      <div><div class="k-hazard k-hazard--red" style="height:80px;--h-b:var(--c-cobalt)"></div><span class="t-micro">.k-hazard--red --h-b:cobalt</span></div>
      <div><div class="k-checker" style="height:80px"></div><span class="t-micro">.k-checker</span></div>
      <div><div class="k-checker" style="height:80px;--ck:4px;--ck-a:var(--c-acid)"></div><span class="t-micro">.k-checker --ck:4px</span></div>
      <div><div class="k-dots" style="height:80px"></div><span class="t-micro">.k-dots</span></div>
      <div><div class="k-dots" style="height:80px;--d:10px;--d-c:var(--c-cobalt)"></div><span class="t-micro">.k-dots --d:10px</span></div>
      <div><div class="k-scan" style="height:80px"></div><span class="t-micro">.k-scan</span></div>
      <div><div class="k-rule" style="margin-top:36px"></div><span class="t-micro" style="margin-top:35px">.k-rule</span></div>
    </div>
  </section>`;

  b.add(hydrate(root));

  $$<HTMLButtonElement>('.gly-icon', root).forEach((btn) =>
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
    on($('#reseed', root), 'click', () => {
      sigilSeed += 24;
      $('#sigils', root).innerHTML = sigils();
    }),
  );
  const bti = $<HTMLInputElement>('#bt-in', root);
  b.add(
    on(bti, 'input', () => {
      $('#bt-out', root).innerHTML = blockText(bti.value || ' ', { size: Math.min(300, 30 * Math.max(1, bti.value.length)) });
    }),
  );
  return b.dispose;
}
