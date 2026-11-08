import { pageHead, section, spec } from './_ui';
import { checker, pixelIcon, pixelSigil, blockText } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { countTo, glitch, reveal, scramble, stamp, typeOut } from '../lib/motion';
import { ORA_BUILD_DURATION, oraBuildAt, oraWordmarkLayout, paintOraLetters, paintOraRing } from '../lib/oraWordmark';
import { SCAN_BLOCK, scanBlockFrame } from '../lib/scanBlock';
import { bag, on, pad, $, $$ } from '../lib/util';

const INIT_SLICES = [[0, 12], [12, 27], [27, 42], [42, SCAN_BLOCK.height]] as const;
const INIT_SHIFTS = [
  0, 0, 2, 5, -3, 0, 0, 3, 6, 2, -4, -2, 0,
  0, 3, -6, -2, 4, 2, 0, 0, -3, 3, 0, 0, 0,
] as const;

const replayButton = (label: string) =>
  `<button class="k-btn k-btn--sm type-replay" type="button" aria-label="Replay ${label}">Replay ${pixelIcon('arrow-r', { size: 9 })}</button>`;

function initiatingSpec() {
  const clips = INIT_SLICES.map(([start, end], i) =>
    `<clipPath id="type-init-slice-${i}"><rect x="-9" y="${start}" width="${SCAN_BLOCK.width + 18}" height="${end - start}"/></clipPath>`,
  ).join('');
  const slices = INIT_SLICES.map((_, i) =>
    `<g clip-path="url(#type-init-slice-${i})"><use href="#type-init-ink" data-init-slice/></g>`,
  ).join('');
  return `
    <div class="type-initiating">
      <svg viewBox="0 0 620 300" role="img" aria-label="Initiating, vertical type beside torn cobalt signal bands">
        <defs>
          ${clips}
          <g id="type-init-ink">
            <path class="type-initiating__plate" data-init-plate/>
            <path class="type-initiating__signal" data-init-signal/>
          </g>
        </defs>
        <path class="type-initiating__signal" d="M206 33h15v3h-15z M206 45h15v3h-15z M221 39h15v3h-15z M236 33h15v3h-15z M236 45h15v3h-15z M257 31h12v12h-12z M269 43h12v12h-12z"/>
        <text class="type-initiating__data" x="46" y="83">3S K  3S K  3S K</text>
        <text class="type-initiating__data" x="46" y="96">3S UV 3S UV 3S UV</text>
        <path class="type-initiating__dim" d="M46 128h102v2H46z M48 135h68v3H48z M53 145h95v2H53z M46 153h49v4H46z M82 164h66v2H82z M46 172h36v2H46z M86 179h21v3H86z M46 190h102v1H46z"/>
        <text class="type-initiating__data" x="46" y="218">KL2 KL4 · R/W 0X3F</text>
        <text class="type-initiating__title" transform="translate(180 72) rotate(90)" data-init-title>INITIATING</text>
        <g transform="translate(230 70) scale(2.3)">${slices}</g>
        <text class="type-initiating__data" x="230" y="230">SDR37 2445 · QR EXC FF</text>
      </svg>
      ${replayButton('Initiating signal tear')}
    </div>`;
}

/** Run once when the stage comes into view, then leave a useful resting frame. */
function mountReplay(stage: HTMLElement, duration: number, draw: (t: number) => void) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  const stop = () => cancelAnimationFrame(frame);
  const settle = () => {
    stop();
    draw(duration);
  };
  const play = () => {
    observer.disconnect();
    stop();
    if (preference.matches) return settle();
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(duration, (now - start) / 1000));
      draw(t);
      if (t < duration) frame = requestAnimationFrame(tick);
    };
    draw(0);
    frame = requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) play();
  }, { threshold: 0.35 });
  const offClick = on($('button', stage), 'click', play);
  const offMotion = on(preference, 'change', () => {
    if (preference.matches) settle();
  });
  settle();
  observer.observe(stage);
  return () => {
    stop();
    observer.disconnect();
    offClick();
    offMotion();
  };
}

function mountInitiating(stage: HTMLElement) {
  const plate = $<SVGPathElement>('[data-init-plate]', stage);
  const signal = $<SVGPathElement>('[data-init-signal]', stage);
  const title = $<SVGTextElement>('[data-init-title]', stage);
  const slices = $$<SVGUseElement>('[data-init-slice]', stage);
  const duration = SCAN_BLOCK.steps / SCAN_BLOCK.fps;
  let last = -1;
  return mountReplay(stage, duration, (t) => {
    const frame = t >= duration ? 11 : Math.floor(t * SCAN_BLOCK.fps);
    if (frame === last) return;
    last = frame;
    const ink = scanBlockFrame(frame);
    plate.setAttribute('d', ink.plate);
    signal.setAttribute('d', ink.signal);
    const shift = INIT_SHIFTS[frame];
    const offsets = [-shift * 0.5, shift, -shift, shift * 0.5];
    slices.forEach((slice, i) => {
      slice.setAttribute('transform', `translate(${offsets[i]} 0)`);
      slice.setAttribute('opacity', i === 2 && (frame === 8 || frame === 15) ? '0' : '1');
    });
    title.classList.toggle('is-outline', frame === 2 || frame === 3 || frame === 9);
  });
}

function mountOra(stage: HTMLElement) {
  const canvas = $<HTMLCanvasElement>('canvas', stage);
  const ctx = canvas.getContext('2d')!;
  return mountReplay(stage, ORA_BUILD_DURATION, (t) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const [r, a] = oraBuildAt(t);
    const radius = 104 - 8 * r - 9 * a;
    const layout = oraWordmarkLayout(radius, r, a);
    const x = (canvas.width - layout.width) / 2;
    const y = canvas.height / 2;
    paintOraRing(ctx, x + radius, y, radius);
    paintOraLetters(ctx, x, y, radius, r, a, layout);
  });
}

export default function mount(root: HTMLElement) {
  const b = bag();

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
        title: 'Initiating signal tear',
        cls: 'scanBlockFrame()',
        bodyCls: 'spec-body--flush',
        body: initiatingSpec(),
        foot: 'Vertical type · 12 fps raster slices · stepped seam and block dropout.',
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
      ${spec({ code: 'KT-03', title: 'Stepped reveal', cls: 'reveal(el, {steps})', bodyCls: 'kt-reveal', body: `<div class="kt-target t-display c-acid" data-kt="reveal">Evaluating</div>`, foot: 'clip-path inset in 6 hard steps.' })}
      ${spec({ code: 'KT-04', title: 'Slice glitch', cls: 'glitch(el)', body: `<div class="kt-target t-display t-wide" data-kt="glitch" style="font-size:44px">Runtime</div>`, foot: 'RGB-separated horizontal slices, 8 frames.' })}
      ${spec({ code: 'KT-05', title: 'Count up', cls: 'countTo(el, n)', body: `<div class="kt-target t-display t-cond" data-kt="count" style="font-size:96px;color:var(--c-crimson)">268</div>`, foot: 'Numbers jump in 14 discrete steps.' })}
      ${spec({ code: 'KT-06', title: 'Stamp', cls: 'stamp(el)', body: `<div class="kt-target" data-kt="stamp"><span class="tc-stamp t-display">Stand by</span></div>`, foot: 'Overshoot + invert flicker.' })}
      ${spec({
        code: 'KT-07',
        title: 'ORA wordmark build',
        cls: 'oraBuildAt()',
        bodyCls: 'spec-body--flush',
        body: `<div class="kt-ora">
          <canvas width="640" height="264" role="img" aria-label="ORA wordmark, assembled from a ring and two drawn letterforms">ORA</canvas>
          ${replayButton('ORA wordmark build')}
        </div>`,
        foot: 'Film S22 · ring, rising stem, swept shoulder and closing bowl.',
      })}
    </div>
  </section>`;

  b.add(hydrate(root));
  b.add(mountInitiating($('.type-initiating', root)));
  b.add(mountOra($('.kt-ora', root)));

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
