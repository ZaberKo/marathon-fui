import gsap from 'gsap';
import { pageHead, section, spec } from './_ui';
import { checker } from '../lib/glyphs';
import { initiatingLockup } from '../lib/initiating';
import { standbyLockup, mountStandby } from '../lib/standby';
import { faultPosterHTML, mountFaultLoop } from '../lib/faultPoster';
import { hydrate } from '../lib/hydrate';
import { markOptsFrom, mountMark } from '../lib/marks';
import { animateTextWall, textWall } from '../lib/compose';
import { barWipe, glitch, scramble } from '../lib/motion';
import { mountDefragField, mountSectorField, mountSwarmField, mountTransferField } from '../lib/wide';
import { bag, on, $, $$ } from '../lib/util';

// slides carry live marks (data-mark) that are mounted when the slide is shown
const SLIDES = [
  `<div class="mo-slide" style="background:var(--c-cobalt)">${standbyLockup({ size: 22 })}</div>`,
  `<div class="mo-slide" style="background:#000">
     <span style="color:var(--c-acid)" data-mark="blocktext" data-text="OK" data-size="200"></span>
     <span class="t-micro c-acid" style="align-self:flex-end">NEURAL SUBROUTINE<br>07/07 MOUNTED</span>
   </div>`,
  `<div class="mo-slide mo-slide--poster" style="background:#000">${faultPosterHTML({ embed: true })}</div>`,
];

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('06', 'Stepped<br><span class="t-outline">Motion</span>', ['STEPPED READOUTS', 'CONTINUOUS TRACKS', 'HARD CUTS · SOLID FIELDS'], 136)}
    <p class="page-lede">Two clocks. Letterforms, counters, masks and fields switch on discrete frames; radial tracks travel continuously
    between those beats. Nothing fades — a state is either drawn or not. The <a class="c-acid" href="#/telemetry">film dials</a> run both clocks
    in one composition; the wide fields below run them as full-width posters.</p>

    ${section('Easing', 'SAME DURATION · DIFFERENT TIMING')}
    <div class="mo-lanes">
      <div class="mo-lane" style="--tf:linear"><span class="t-micro">LINEAR · TRACK TRAVEL</span><div><i></i></div></div>
      <div class="mo-lane" style="--tf:steps(4,end)"><span class="t-micro">STEPS(4) · PLATE SWITCH</span><div><i></i></div></div>
      <div class="mo-lane" style="--tf:steps(12,end)"><span class="t-micro">STEPS(12) · GLYPH LOCK</span><div><i></i></div></div>
    </div>

    ${section('Transitions', 'CLICK TO CUT TO NEXT FRAME')}
    <div class="mo-monitor-wrap">
      <div class="mo-monitor" id="mon">
        <div class="mo-stage" id="mon-stage">${SLIDES[0]}</div>
        <div class="mo-wipe" id="mon-wipe">${'<i></i>'.repeat(7)}</div>
        <div class="mo-mon-hud t-micro"><span id="mon-idx">FRAME 01/${String(SLIDES.length).padStart(2, '0')}</span><span id="mon-fx">—</span></div>
      </div>
      <div class="mo-ctrls">
        ${[
          ['wipe', 'Bar wipe', 'barWipe(overlay, swap)'],
          ['flip', 'Colour flip', 'steps(1) bg flips'],
          ['glitch', 'Slice glitch', 'glitch(el)'],
          ['cut', 'Hard cut', 'swap + 1-frame invert'],
        ]
          .map(([k, l, c]) => `<button class="k-btn mo-btn" data-fx="${k}"><span>${l}</span><span class="k-btn__code">${c}</span></button>`)
          .join('')}
        <label class="k-switch" style="margin-top:8px"><input type="checkbox" id="mon-auto"><span class="k-switch__track"><span>OFF</span><span>ON</span></span>Auto-cycle</label>
      </div>
    </div>

    ${section('Wide fields', 'lib/wide.ts · FULL-WIDTH POSTER STRIPS · 12 FPS')}
    <div class="mo-wides">
      ${spec({ code: 'WF-01', title: 'Transfer window', cls: 'mountTransferField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide" data-wide="transfer"></canvas>', foot: 'Dash rows merge into violet blobs and eat in from the right; the stepped block lands one line per four frames.' })}
      ${spec({ code: 'WF-02', title: 'Swarm sweep', cls: 'mountSwarmField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide" data-wide="swarm"></canvas>', foot: 'Triangles turn a quarter and go acid as the sweep passes, then drop back in one cut.' })}
      ${spec({ code: 'WF-03', title: 'Sector lock', cls: 'mountSectorField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide" data-wide="sector"></canvas>', foot: 'Block type crawls one cell per two frames over cross marks, hazard stripes, checker flags and a re-rolling barcode.' })}
      ${spec({ code: 'WF-04', title: 'Defrag index', cls: 'mountDefragField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide mo-wide--tall" data-wide="defrag"></canvas>', foot: 'Fragments consolidate to lime behind a flashing head; the capsule counter turns lime at 100%.' })}
    </div>

    ${section('Signal noise', 'STAND BY · PIXEL GLYPH CORRUPTION')}
    ${spec({
      code: 'NO-01',
      title: 'Glyph noise',
      cls: 'data-mark="glyphnoise"',
      bodyCls: 'spec-body--flush',
      body: `<div class="mo-noise">
        <div class="mo-noise__row"><span class="t-micro">DATA STRIP</span><span data-mark="glyphnoise" data-size="480" data-height="36" data-seed="8" data-fps="12"></span></div>
        <div class="mo-noise__row"><span class="t-micro">MICRO STRIP</span><span data-mark="glyphnoise" data-size="360" data-height="18" data-seed="12" data-fps="8"></span></div>
      </div>`,
      foot: 'Same renderer as Stand By. A few glyphs change per step, with blank runs and stray pixels between them.',
    })}

    ${section('Signal marks', 'INDEX · LINK · SCAN')}
    <div class="spec-grid">
      ${spec({ code: 'MK-01', title: 'Checker index', cls: 'steps(4)', body: `<div class="mo-check-index">${checker(2, 2, { size: 64 })}</div>`, foot: 'The memory shot uses quarter-turns to advance the index.' })}
      ${spec({ code: 'MK-02', title: 'Plug sequence', cls: 'data-mark="link"', body: `<span class="c-lime" data-mark="link" data-cols="4" data-rows="1" data-size="220" data-fps="10"></span>` })}
      ${spec({ code: 'MK-03', title: 'Initiating signal tear', cls: 'initiatingLockup()', bodyCls: 'spec-body--flush', body: `<div class="gly-initiating" data-initiating>${initiatingLockup()}</div>`, foot: 'The TC-01 lockup: the torn plates only read with the vertical type and micro rows beside them.' })}
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
  const WIDE = { transfer: mountTransferField, swarm: mountSwarmField, sector: mountSectorField, defrag: mountDefragField } as const;
  $$<HTMLCanvasElement>('[data-wide]', root).forEach((c) => b.add(WIDE[c.dataset.wide as keyof typeof WIDE](c)));

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
    slideStops = [
      ...$$('[data-mark]', stageEl).map((el) => mountMark(el, el.dataset.mark!, markOptsFrom(el))),
      ...$$('.k-standby', stageEl).map((el) => mountStandby(el)),
      ...(stageEl.querySelector('.flt-poster') ? [mountFaultLoop(stageEl)] : []),
    ];
    idxEl.textContent = `FRAME ${String(idx + 1).padStart(2, '0')}/${String(SLIDES.length).padStart(2, '0')}`;
  };
  const run = async (fx: string) => {
    if (busy) return;
    busy = true;
    scramble(fxEl, fx.toUpperCase(), { duration: 0.2 });
    if (fx === 'wipe') await barWipe(wipeEl, next);
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
  const fxs = ['wipe', 'flip', 'glitch', 'cut'];
  let autoT = 0;
  const autoCb = $<HTMLInputElement>('#mon-auto', root);
  b.add(
    on(autoCb, 'change', () => {
      clearInterval(autoT);
      if (autoCb.checked) autoT = window.setInterval(() => run(fxs[(Math.random() * fxs.length) | 0]), 1400);
    }),
  );
  b.add(() => clearInterval(autoT));

  return b.dispose;
}
