import { pageHead, section, spec } from './_ui';
import { icon } from '../lib/icons';
import { emblem } from '../lib/glyphs';
import { capsuleText } from '../lib/dotType';
import { hydrate } from '../lib/hydrate';
import { countTo, glitch, reveal, scramble, stamp, typeOut } from '../lib/motion';
import { ORA_BUILD_DURATION, paintOraKit } from '../lib/oraWordmark';
import { SCAN_BLOCK } from '../lib/scanBlock';
import { INITIATING_DURATION, initiatingLockup, initiatingPainter } from '../lib/initiating';
import { bag, crispCanvas, on, pad, $, $$ } from '../lib/util';

const replayButton = (label: string) =>
  `<button class="k-btn k-btn--sm type-replay" type="button" aria-label="Replay ${label}">Replay ${icon('arrow-r', { size: 9 })}</button>`;

function initiatingSpec() {
  return `<div class="type-initiating">${initiatingLockup()}${replayButton('Initiating signal tear')}</div>`;
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
  const paint = initiatingPainter(stage);
  return mountReplay(stage, INITIATING_DURATION, (t) => paint(t >= INITIATING_DURATION ? 11 : Math.floor(t * SCAN_BLOCK.fps)));
}

function mountOra(stage: HTMLElement) {
  const { ctx, size, dispose } = crispCanvas($<HTMLCanvasElement>('canvas', stage));
  const stop = mountReplay(stage, ORA_BUILD_DURATION, (t) => {
    ctx.clearRect(0, 0, size.w, size.h);
    paintOraKit(ctx, t, size.w, size.h);
  });
  return () => {
    stop();
    dispose();
  };
}

export default function mount(root: HTMLElement) {
  const b = bag();

  root.innerHTML = `
  <section class="page">
    ${pageHead('01', 'Type<br><span class="t-outline">Specimen</span>', ['ARCHIVO VAR · WDTH 62–125', 'IBM PLEX MONO · CAPSULE DOT', 'INSTRUMENT SERIF · TITLES'], 31)}
    <p class="page-lede">Four voices, each with one job. No small bitmap fonts.</p>
    <ul class="type-voices">
      <li><b class="t-display t-wide">Display</b><span>Archivo variable, widths 62–125, uppercase with tight leading. Cropped by the frame, rotated 90°, or set black in a lime stepped block.</span></li>
      <li><b class="t-mono">Mono</b><span>IBM Plex Mono for coordinates, codes and commands. Set tiny and dense as a texture layer, not as reading copy.</span></li>
      <li><b class="type-voices__cap">${capsuleText('DOT', { size: 54 })}</b><span>Capsule dot type: a 5 × 7 grid where each run of lit cells is one pill. Big readouts and countdowns only.</span></li>
      <li><b class="type-voices__serif">Serif</b><span>Instrument Serif, regular weight, uppercase. Only for in-game screen titles — The Relay, Warden, Codex. Never bold, never body copy.</span></li>
    </ul>

    ${section('Scale', 'T-01 → T-08')}
    <div class="type-scale">
      <div class="ts-row"><span class="t-micro">T-01 DISPLAY / WDTH 125 / 800</span><div class="t-display t-wide" style="font-size:clamp(48px,7vw,112px)">Signal</div></div>
      <div class="ts-row"><span class="t-micro">T-02 DISPLAY / WDTH 62 / 800</span><div class="t-display t-cond" style="font-size:clamp(56px,8vw,128px)">Consciousness</div></div>
      <div class="ts-row"><span class="t-micro">T-03 OUTLINE / STROKE 1.5</span><div class="t-display t-wide t-outline" style="font-size:clamp(40px,6vw,96px);--stroke:var(--c-cobalt-hi)">Transfer</div></div>
      <div class="ts-row"><span class="t-micro">T-04 DISPLAY / 100 / 700</span><div class="t-display" style="font-size:32px;font-weight:700">Neural subroutine 07</div></div>
      <div class="ts-row"><span class="t-micro">T-05 MONO / 13 / 0.06EM</span><div class="t-mono" style="font-size:13px">assert shell.integrity &gt;= 0.92 :: liminal buffer stable</div></div>
      <div class="ts-row"><span class="t-micro">T-06 MICRO / 9 / 0.08EM</span><div class="t-micro" style="color:var(--c-bone)">SDR37 2445556 · QR EXC FF · RW 0x3F00 · 35 K 35 UV</div></div>
      <div class="ts-row"><span class="t-micro">T-07 CAPSULE DOT / 5×7</span><div class="c-acid">${capsuleText('LOAD 07/07 LINK OK', { size: 520 })}</div></div>
      <div class="ts-row"><span class="t-micro">T-08 SERIF / INSTRUMENT 400 · SCREEN TITLES</span><div class="type-serif">The Relay</div></div>
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
          <div class="tc-lock__a"><span class="t-display t-wide">Sector</span><b class="t-display">Approach</b><span class="c-cobalt">${icon('chevron', { size: 22 })}</span></div>
          <div class="tc-lock__b"><span class="t-display t-wide">System</span><b class="t-display">Vesta_Ring (7)</b>
            <div class="t-micro">N 44'54'32 · E 70'44'21 · 12 - 0448 NA</div></div>
        </div>`,
      })}
      ${spec({
        code: 'TC-03',
        title: 'Cropped / bleeding',
        cls: 'overflow:hidden',
        bodyCls: 'spec-body--flush',
        body: `<div class="tc-crop"><div class="t-display">Shell</div><div class="tc-crop__tag t-pixel">${emblem(3, { size: 20 })} BUFFER</div></div>`,
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
        title: 'Capsule wordmark',
        cls: 'capsuleText()',
        body: `<div style="display:grid;gap:14px;justify-items:start">
          <span class="c-acid">${capsuleText('LINK 07', { size: 300 })}</span>
          <span style="color:var(--c-cobalt-hi)">${capsuleText('T-00:41:07', { size: 300 })}</span>
          <span class="t-micro">EACH RUN OF LIT CELLS IS ONE PILL · SINGLE CELLS ARE DOTS</span>
        </div>`,
      })}
    </div>

    ${section('Kinetic', 'CLICK TO REPLAY')}
    <div class="spec-grid">
      ${spec({ code: 'KT-01', title: 'Scramble decode', cls: 'scramble(el, text)', body: `<div class="kt-target t-display t-wide" data-kt="scramble">Neural map</div>`, foot: 'Characters lock in left → right from noise.' })}
      ${spec({ code: 'KT-02', title: 'Typewriter', cls: 'typeOut(el, text)', body: `<div class="kt-target t-mono" data-kt="type" style="font-size:14px;min-height:2.6em;width:100%">&gt; evaluating motor cortex mapping</div>`, foot: 'Fixed-rate characters + block caret.' })}
      ${spec({ code: 'KT-03', title: 'Stepped reveal', cls: 'reveal(el, {steps})', bodyCls: 'kt-reveal', body: `<div class="kt-target t-display c-acid" data-kt="reveal">Evaluating</div>`, foot: 'clip-path inset in 6 hard steps.' })}
      ${spec({ code: 'KT-04', title: 'Slice glitch', cls: 'glitch(el)', body: `<div class="kt-target t-display t-wide" data-kt="glitch" style="font-size:44px">Runtime</div>`, foot: 'Horizontal slices shift as flat cobalt, crimson and acid copies for 8 frames.' })}
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
        foot: 'Film S22 on a fixed frame: the ring seats, the stem rises as a capsule, the shoulder sweeps from its round top, the bowl closes.',
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
