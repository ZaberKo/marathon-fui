import gsap from 'gsap';
import { pageHead, section, spec } from './_ui';
import { checker } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { markOptsFrom, mountMark } from '../lib/marks';
import { animateTextWall, textWall } from '../lib/compose';
import { barWipe, flashBlocks, glitch, scramble } from '../lib/motion';
import { bag, on, stepLoop, $, $$ } from '../lib/util';

// slides carry live marks (data-mark) that are mounted when the slide is shown
const SLIDES = [
  `<div class="mo-slide" style="background:var(--c-cobalt)">
     <span style="color:#fff" data-mark="checker" data-size="64" data-mode="invert"></span>
     <div style="display:grid;gap:4px"><span class="t-micro" style="color:#fff">LATCH · PULL · KL2 KL4</span><b class="t-display" style="color:var(--c-acid);font-size:clamp(36px,5vw,72px)">Stand by</b><i class="k-hazard k-hazard--anim" style="--h-a:var(--c-acid);--h-b:var(--c-cobalt);height:10px;--h-w:4px"></i></div>
     <span style="color:#fff" data-mark="checker" data-size="64" data-mode="invert" data-fps="5"></span>
   </div>`,
  `<div class="mo-slide" style="background:#000;justify-content:flex-start;padding-left:10%">
     <b class="t-display" style="color:var(--c-acid);font-size:clamp(40px,6vw,90px);writing-mode:vertical-rl;transform:rotate(180deg)">Initiating</b>
     <span data-mark="scanblock" data-size="360"></span>
   </div>`,
  `<div class="mo-slide" style="background:#000">
     <span style="color:var(--c-acid)" data-mark="blocktext" data-text="OK" data-size="200"></span>
     <span class="t-micro c-acid" style="align-self:flex-end">NEURAL SUBROUTINE<br>07/07 MOUNTED</span>
   </div>`,
  `<div class="mo-slide" style="background:var(--c-crimson);flex-direction:column;gap:0">
     <b class="t-display" style="color:var(--c-cobalt);font-size:clamp(44px,7vw,110px);white-space:nowrap">Error_error_</b>
     <span class="t-micro" style="color:#000">RUNTIME EXCEPTION 0x3F · LIMINAL BUFFER CRITICAL</span>
   </div>`,
  `<div class="mo-slide" style="background:#000">
     <span style="color:var(--c-lime)" data-mark="segring" data-size="150"></span>
     <b class="t-display t-wide" style="color:var(--c-lime);font-size:clamp(24px,3vw,40px)">Loading<br>memory</b>
   </div>`,
];

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('06', 'Stepped<br><span class="t-outline">Motion</span>', ['NO SMOOTH EASING', 'HARD CUTS · BLOCK FLASH', 'GSAP steps(n) · CSS steps()'], 136)}
    <p class="page-lede">Motion is machine-driven: <b>stepped frames</b>, mechanical jumps, hard cuts through solid colour blocks.
    Use <b>steps(n)</b> everywhere — CSS transitions, GSAP eases, and fixed-rate canvas loops. Interpolation is the enemy.</p>

    ${section('Easing', 'SAME DURATION · DIFFERENT TIMING')}
    <div class="mo-lanes">
      <div class="mo-lane" style="--tf:linear"><span class="t-micro">linear <em class="c-crimson">AVOID</em></span><div><i></i></div></div>
      <div class="mo-lane" style="--tf:steps(4,end)"><span class="t-micro">steps(4)</span><div><i></i></div></div>
      <div class="mo-lane" style="--tf:steps(12,end)"><span class="t-micro">steps(12) — "on twos"</span><div><i></i></div></div>
      <div class="mo-lane" style="--tf:steps(24,end)"><span class="t-micro">steps(24) — readouts</span><div><i></i></div></div>
    </div>

    ${section('Transitions', 'CLICK TO CUT TO NEXT FRAME')}
    <div class="mo-monitor-wrap">
      <div class="mo-monitor" id="mon">
        <div class="mo-stage" id="mon-stage">${SLIDES[0]}</div>
        <div class="mo-wipe" id="mon-wipe">${'<i></i>'.repeat(7)}</div>
        <div class="mo-mon-hud t-micro"><span id="mon-idx">FRAME 01/05</span><span id="mon-fx">—</span></div>
      </div>
      <div class="mo-ctrls">
        ${[
          ['wipe', 'Bar wipe', 'barWipe(overlay, swap)'],
          ['flash', 'Block flash', 'flashBlocks(el)'],
          ['flip', 'Colour flip', 'steps(1) bg flips'],
          ['glitch', 'Slice glitch', 'glitch(el)'],
          ['cut', 'Hard cut', 'swap + 1-frame invert'],
        ]
          .map(([k, l, c]) => `<button class="k-btn mo-btn" data-fx="${k}"><span>${l}</span><span class="k-btn__code">${c}</span></button>`)
          .join('')}
        <label class="k-switch" style="margin-top:8px"><input type="checkbox" id="mon-auto"><span class="k-switch__track"><span>OFF</span><span>ON</span></span>Auto-cycle</label>
      </div>
    </div>

    ${section('Loaders', 'CSS + 2D')}
    <div class="spec-grid">
      ${spec({ code: 'LD-01', title: 'Segment spinner', cls: '.mo-ld-seg', body: `<div class="mo-ld-seg">${'<i></i>'.repeat(12)}</div><div class="mo-ld-seg" style="--c:var(--c-cobalt-hi);width:36px;height:36px">${'<i></i>'.repeat(12)}</div>` })}
      ${spec({ code: 'LD-02', title: 'Checker spin', cls: '.mo-ld-check', body: `<div class="mo-ld-check">${checker(2, 2, { size: 36 })}</div><div class="mo-ld-check" style="color:var(--c-acid);animation-duration:.6s">${checker(3, 3, { size: 36 })}</div>` })}
      ${spec({ code: 'LD-03', title: 'Pixel snake', cls: '.mo-ld-snake', body: `<div class="mo-ld-snake">${'<i></i>'.repeat(9)}</div><div class="mo-ld-snake" style="--c:var(--c-hazard)">${'<i></i>'.repeat(9)}</div>` })}
      ${spec({ code: 'LD-04', title: 'Glyph cycle', cls: 'stepLoop + text', body: `<span class="t-pixel c-acid" style="font-size:22px" id="ld-glyph">▖</span><span class="t-mono" id="ld-dots" style="font-size:14px">LOADING</span><span class="t-mono c-cobalt" id="ld-bar" style="font-size:14px;color:var(--c-cobalt-hi)">[          ]</span>` })}
      ${spec({ code: 'LD-05', title: 'Count ring', cls: 'data-mark="countring"', body: `<span class="c-bone" data-state="critical" data-mark="countring" data-size="120"></span><span class="c-bone" data-mark="countring" data-size="84" data-max="100" data-label="SYNC" data-fps="16"></span>` })}
      ${spec({ code: 'LD-06', title: 'Plug sequence', cls: 'data-mark="link"', body: `<span class="c-lime" data-mark="link" data-cols="4" data-rows="1" data-size="220" data-fps="10"></span>` })}
      ${spec({ code: 'LD-07', title: 'Scan block', cls: 'data-mark="scanblock"', body: `<span data-mark="scanblock" data-size="240"></span>` })}
      ${spec({ code: 'LD-08', title: 'Chevrons + bars', cls: 'chevrons · bars', body: `<span class="c-acid" data-mark="chevrons" data-count="7" data-size="120"></span><span class="c-bone" data-mark="bars" data-count="9" data-size="72"></span>` })}
    </div>

    ${section('Text wall', 'textWall() · animateTextWall()')}
    <div class="mo-wall" id="mo-wall">${textWall({ word: 'PASSPHRASE_', hot: 'COHESION_', hotFill: 'FAIL_', rows: 5 })}</div>
    <div class="mo-wall-tags t-micro"><span>anRTKL a005 <b class="c-hazard">LATCH</b></span><span>PULL ● KL2 KL4</span><span class="c-hazard" data-mark="chevrons" data-count="5" data-size="70"></span></div>

    ${section('Marquee', '.k-marquee')}
    <div class="mo-marquees">
      <div class="k-band"><div class="k-marquee" style="--dur:14s"><div class="k-marquee__track">${'<span>LINK ESTABLISHED ▚ TRANSFER WINDOW OPEN ▚ </span>'.repeat(6)}</div></div></div>
      <div class="k-band" data-state="caution" style="height:28px;font-size:13px"><div class="k-marquee k-marquee--rev" style="--dur:10s"><div class="k-marquee__track">${'<span>⚠ THERMAL DELTA +0.4K — MONITOR ⚠ CAUTION ⚠ </span>'.repeat(8)}</div></div></div>
      <div class="mo-marq-outline"><div class="k-marquee" style="--dur:30s;--marq-steps:120"><div class="k-marquee__track">${'<span class="t-display t-wide t-outline">Neural transfer ▚ </span>'.repeat(4)}</div></div></div>
      <div class="t-micro" style="border-top:1px solid var(--c-line);border-bottom:1px solid var(--c-line);padding:6px 0"><div class="k-marquee" style="--dur:40s"><div class="k-marquee__track">${'<span>0x3F00 SDR37 2445556 · QR EXC FF · RW KL2 KL4 · 35 K 35 UV · TU XEI 0407 · PK 576 928 · ASSERT · LIMINAL · </span>'.repeat(4)}</div></div></div>
    </div>
  </section>`;

  b.add(hydrate(root));

  // --- transition monitor ---
  const stageEl = $('#mon-stage', root);
  const mon = $('#mon', root);
  const wipeEl = $('#mon-wipe', root);
  const idxEl = $('#mon-idx', root);
  const fxEl = $('#mon-fx', root);
  let idx = 0;
  let busy = false;
  let slideStops: (() => void)[] = [];
  b.add(() => slideStops.forEach((f) => f()));
  b.add(animateTextWall($('#mo-wall .k-textwall', root), ['COHESION_', 'FAILURE_', 'ESTABLISHING_', 'LINK_']));
  const next = () => {
    idx = (idx + 1) % SLIDES.length;
    slideStops.forEach((f) => f());
    stageEl.innerHTML = SLIDES[idx];
    slideStops = $$('[data-mark]', stageEl).map((el) => mountMark(el, el.dataset.mark!, markOptsFrom(el)));
    idxEl.textContent = `FRAME ${String(idx + 1).padStart(2, '0')}/${String(SLIDES.length).padStart(2, '0')}`;
  };
  const run = async (fx: string) => {
    if (busy) return;
    busy = true;
    scramble(fxEl, fx.toUpperCase(), { duration: 0.2 });
    if (fx === 'wipe') await barWipe(wipeEl, next);
    if (fx === 'flash') {
      const p = flashBlocks(mon, { frames: 8, count: 22 });
      setTimeout(next, 180);
      await p;
    }
    if (fx === 'flip') {
      const tl = gsap.timeline();
      ['#2424ff', '#7dff1a', '#000', '#ececec', '#000'].forEach((c, i) => tl.set(mon, { backgroundColor: c }, i * 0.05));
      tl.set(stageEl, { opacity: 0 }, 0);
      tl.call(next, [], 0.15);
      tl.set(stageEl, { opacity: 1 }, 0.26);
      tl.set(mon, { backgroundColor: '' }, 0.26);
      await tl.then();
    }
    if (fx === 'glitch') {
      await glitch(stageEl, { frames: 6, intensity: 40 });
      next();
      await glitch(stageEl, { frames: 4, intensity: 24 });
    }
    if (fx === 'cut') {
      next();
      mon.style.filter = 'invert(1)';
      await new Promise((r) => setTimeout(r, 50));
      mon.style.filter = '';
    }
    busy = false;
  };
  $$('.mo-btn', root).forEach((btn) => b.add(on(btn, 'click', () => run(btn.dataset.fx!))));
  const fxs = ['wipe', 'flash', 'flip', 'glitch', 'cut'];
  let autoT = 0;
  const autoCb = $<HTMLInputElement>('#mon-auto', root);
  b.add(
    on(autoCb, 'change', () => {
      clearInterval(autoT);
      if (autoCb.checked) autoT = window.setInterval(() => run(fxs[(Math.random() * fxs.length) | 0]), 1400);
    }),
  );
  b.add(() => clearInterval(autoT));

  // --- text loaders ---
  const g = $('#ld-glyph', root);
  const d = $('#ld-dots', root);
  const bar = $('#ld-bar', root);
  const seq = '▖▘▝▗';
  b.add(
    stepLoop(
      8,
      (f) => {
        g.textContent = seq[f % 4];
        d.textContent = 'LOADING' + '.'.repeat(f % 4).padEnd(3, ' ');
        const n = f % 11;
        bar.textContent = `[${'█'.repeat(n)}${' '.repeat(10 - n)}]`;
      },
      g,
    ),
  );
  return b.dispose;
}
