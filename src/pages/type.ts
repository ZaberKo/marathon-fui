import { pageHead, section, spec } from './_ui';
import { checker, pixelIcon, pixelSigil, blockText } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { countTo, glitch, reveal, scramble, stamp, typeOut } from '../lib/motion';
import { bag, on, pad, $$ } from '../lib/util';

export default function mount(root: HTMLElement) {
  const b = bag();
  const codeCol = (n: number, seed: number) =>
    Array.from({ length: n }, (_, i) => `<div>${['QR EXC FF', 'SDR37 2445', 'KL2 KL4', 'R/W 0x3F', 'TU XEI 0407', 'PK 576 928'][(i + seed) % 6]}</div>`).join('');

  root.innerHTML = `
  <section class="page">
    ${pageHead('01', 'Type<br><span class="t-outline">Specimen</span>', ['ARCHIVO VAR · WDTH 62–125', 'IBM PLEX MONO', 'SILKSCREEN PIXEL'], 31)}
    <p class="page-lede">Three voices. <b>Display</b> — a grotesque pushed to extreme widths, always uppercase, tight leading, often rotated 90° or cropped by the frame.
    <b>Mono</b> — coordinates, addresses, commands; set tiny and dense as a texture layer, not for reading. <b>Pixel</b> — system codes and indices.</p>

    ${section('Scale', 'T-01 → T-07')}
    <div class="type-scale">
      <div class="ts-row"><span class="t-micro">T-01 DISPLAY / WDTH 125 / 800</span><div class="t-display t-wide" style="font-size:clamp(48px,7vw,112px)">Signal</div></div>
      <div class="ts-row"><span class="t-micro">T-02 DISPLAY / WDTH 62 / 800</span><div class="t-display t-cond" style="font-size:clamp(56px,8vw,128px)">Consciousness</div></div>
      <div class="ts-row"><span class="t-micro">T-03 OUTLINE / STROKE 1.5</span><div class="t-display t-wide t-outline" style="font-size:clamp(40px,6vw,96px);--stroke:var(--c-cobalt-hi)">Transfer</div></div>
      <div class="ts-row"><span class="t-micro">T-04 DISPLAY / 100 / 700</span><div class="t-display" style="font-size:32px;font-weight:700">Neural subroutine 07</div></div>
      <div class="ts-row"><span class="t-micro">T-05 MONO / 13 / 0.06EM</span><div class="t-mono" style="font-size:13px">assert shell.integrity &gt;= 0.92 :: liminal buffer stable</div></div>
      <div class="ts-row"><span class="t-micro">T-06 MICRO / 9 / 0.08EM</span><div class="t-micro" style="color:var(--c-bone)">SDR37 2445556 · QR EXC FF · RW 0x3F00 · 35 K 35 UV</div></div>
      <div class="ts-row"><span class="t-micro">T-07 PIXEL / 12</span><div class="t-pixel c-acid" style="font-size:16px">LOAD 07/07 · LINK OK</div></div>
    </div>

    ${section('Composition', 'LOCKUPS')}
    <div class="spec-grid spec-grid--2">
      ${spec({
        code: 'TC-01',
        title: 'Vertical stack',
        cls: '.t-vert-up',
        bodyCls: 'spec-body--flush',
        body: `<div class="tc-vert">
          <div class="tc-vert__codes t-micro">${codeCol(6, 0)}</div>
          <div class="t-display tc-vert__word">Initiating</div>
          <div class="tc-vert__bars"><i></i><i></i><i class="g"></i><i></i></div>
          <div class="tc-vert__codes t-micro">${codeCol(6, 3)}</div>
        </div>`,
      })}
      ${spec({
        code: 'TC-02',
        title: 'Label lockup',
        bodyCls: 'spec-body--flush',
        body: `<div class="tc-lock">
          <div class="tc-lock__a"><span class="t-display t-wide">Sector</span><b class="t-display">Approach</b><span class="c-cobalt">${pixelIcon('chevron', { size: 22 })}</span></div>
          <div class="tc-lock__b"><span class="t-display t-wide">System</span><b class="t-display">Vesta_Ring (7)</b>
            <div class="t-micro">N 44'54'32 · E 70'44'21 · 12 - 0448 NA</div></div>
        </div>`,
      })}
      ${spec({
        code: 'TC-03',
        title: 'Cropped / bleeding',
        cls: 'overflow:hidden',
        bodyCls: 'spec-body--flush',
        body: `<div class="tc-crop"><div class="t-display">Shell</div><div class="tc-crop__tag t-pixel">${pixelSigil(3, { size: 20 })} BUFFER</div></div>`,
      })}
      ${spec({
        code: 'TC-04',
        title: 'Inverse slab',
        bodyCls: 'spec-body--flush',
        body: `<div class="tc-slab">
          <span class="t-micro c-bone">A DISCONNECTED</span>
          <div class="tc-slab__bar t-display">Consciousness<i></i></div>
          <div class="tc-slab__row t-micro"><span class="c-acid">92EE/S</span><span>023 820 320</span><span>QR EXC FF</span></div>
        </div>`,
      })}
      ${spec({
        code: 'TC-05',
        title: 'Micro-copy texture',
        bodyCls: 'spec-body--flush',
        body: `<div class="tc-texture t-micro">${Array.from({ length: 64 }, (_, i) => `<span${i % 11 === 3 ? ' class="c-acid"' : i % 17 === 5 ? ' class="c-crimson"' : ''}>${(0x3f00 + i * 37).toString(16).toUpperCase()} ${pad((i * 73) % 999, 3)}</span>`).join('')}</div>`,
      })}
      ${spec({
        code: 'TC-06',
        title: 'Pixel wordmark',
        cls: 'blockText()',
        body: `<div style="display:grid;gap:14px;justify-items:center">
          <span class="c-acid">${blockText('OK', { size: 120 })}</span>
          <span class="c-cobalt">${blockText('LINK 07', { size: 220 })}</span>
          <span style="color:var(--c-bone)">${checker(6, 1, { size: 72 })}</span>
        </div>`,
      })}
    </div>

    ${section('Kinetic', 'CLICK TO REPLAY')}
    <div class="spec-grid">
      ${spec({ code: 'KT-01', title: 'Scramble decode', cls: 'scramble(el, text)', body: `<div class="kt-target t-display t-wide" data-kt="scramble">Neural map</div>`, foot: 'Characters lock in left → right from noise.' })}
      ${spec({ code: 'KT-02', title: 'Typewriter', cls: 'typeOut(el, text)', body: `<div class="kt-target t-mono" data-kt="type" style="font-size:14px;min-height:2.6em;width:100%">&gt; evaluating motor cortex mapping</div>`, foot: 'Fixed-rate characters + block caret.' })}
      ${spec({ code: 'KT-03', title: 'Stepped reveal', cls: 'reveal(el, {steps})', body: `<div class="kt-target t-display" data-kt="reveal" style="font-size:52px;color:var(--c-acid)">Evaluating</div>`, foot: 'clip-path inset in 6 hard steps.' })}
      ${spec({ code: 'KT-04', title: 'Slice glitch', cls: 'glitch(el)', body: `<div class="kt-target t-display t-wide" data-kt="glitch" style="font-size:44px">Runtime</div>`, foot: 'RGB-separated horizontal slices, 8 frames.' })}
      ${spec({ code: 'KT-05', title: 'Count up', cls: 'countTo(el, n)', body: `<div class="kt-target t-display t-cond" data-kt="count" style="font-size:96px;color:var(--c-crimson)">268</div>`, foot: 'Numbers jump in 14 discrete steps.' })}
      ${spec({ code: 'KT-06', title: 'Stamp', cls: 'stamp(el)', body: `<div class="kt-target" data-kt="stamp"><span class="tc-stamp t-display">Stand by</span></div>`, foot: 'Overshoot + invert flicker.' })}
    </div>
  </section>`;

  b.add(hydrate(root));

  const run = (el: HTMLElement) => {
    const kind = el.dataset.kt;
    const txt = (el.dataset.orig ??= el.textContent ?? '');
    if (kind === 'scramble') scramble(el, txt, { duration: 0.9 });
    if (kind === 'type') typeOut(el, txt, { cps: 36 });
    if (kind === 'reveal') reveal(el, { steps: 6, duration: 0.5 });
    if (kind === 'glitch') glitch(el, { frames: 10 });
    if (kind === 'count') countTo(el, 268, { from: 0, steps: 14, duration: 0.8, pad: 3 });
    if (kind === 'stamp') stamp(el.firstElementChild as HTMLElement);
  };
  $$('[data-kt]', root).forEach((el) => {
    const card = el.closest('.spec') as HTMLElement;
    card.style.cursor = 'pointer';
    b.add(on(card, 'click', () => run(el)));
    setTimeout(() => run(el), 300);
  });

  return b.dispose;
}
