import gsap from 'gsap';
import { pageHead, section, spec } from './_ui';
import { dotMatrix, triTile } from '../lib/glyphs';
import { icon } from '../lib/icons';
import { capsuleText } from '../lib/dotType';
import { standbyLockup, mountStandby } from '../lib/standby';
import { faultOverlayHTML, faultPosterHTML, mountFaultLoop, mountFaultOverlay } from '../lib/faultPoster';
import { mountDashField, mountSwarm } from '../lib/board';
import { hydrate } from '../lib/hydrate';
import { markOptsFrom, mountMark } from '../lib/marks';
import { animateTextWall, textWall } from '../lib/compose';
import { barWipe, glitch, scramble, waitForTimeline } from '../lib/motion';
import { mountDefragField, mountSectorField, mountSwarmField, mountTransferField } from '../lib/wide';
import { bag, on, $, $$ } from '../lib/util';

// slides carry live marks (data-mark) that are mounted when the slide is shown
const SLIDES = [
  `<div class="mo-slide" style="background:var(--c-cobalt)">${standbyLockup({ size: 22 })}</div>`,
  `<div class="mo-slide" style="background:#000">
     <span class="c-acid">${capsuleText('LINK OK', { size: 420 })}</span>
     <span class="t-micro c-acid" style="align-self:flex-end">NEURAL SUBROUTINE<br>07/07 MOUNTED</span>
   </div>`,
  `<div class="mo-slide mo-slide--poster" style="background:#000">${faultPosterHTML({ embed: true })}</div>`,
];

export default function mount(root: HTMLElement) {
  const b = bag();
  const lifecycle = new AbortController();
  const { signal } = lifecycle;
  root.innerHTML = `
  <section class="page">
    ${pageHead('06', 'Full<br><span class="t-outline">Fields</span>', ['POSTERS · HOLD FRAMES', 'FAULT STATE', 'STEPPED · NO FADES'], 136)}
    <p class="page-lede">Between beats the frame floods: one solid field, one lockup, the furniture around it. These are the hold frames,
    the fault poster and the wide strips, plus the cuts between them. Fields switch on discrete frames and never fade; a state is
    either drawn or not.</p>

    ${section('Posters', 'FULL-FIELD COMPOSITIONS')}
    <div class="spec-grid spec-grid--2 fd-grid">
      ${spec({
        code: 'FD-01',
        title: 'Stand by · acid on cobalt',
        cls: 'standbyLockup()',
        bodyCls: 'spec-body--flush',
        body: `<div class="sig-poster fd-poster" style="background:var(--c-cobalt)">${standbyLockup({ size: 9, seed: 11 })}</div>`,
      })}
      ${spec({
        code: 'FD-02',
        title: 'Runtime error',
        cls: 'faultPosterHTML() · mountFaultOverlay()',
        bodyCls: 'spec-body--flush',
        body: `<div class="fd-fault"><div class="fd-fault__view">${faultPosterHTML({ embed: true })}</div>
          <div class="fd-fault__ctl">
            <button class="k-btn k-btn--danger k-hold" data-hold="900" data-fault-go>${icon('warn', { size: 14 })}<span data-label>Hold to inject fault</span></button>
            <button class="k-btn k-btn--sm" data-fault-now>Full screen now</button>
          </div></div>`,
        foot: 'The same poster runs full screen for ten seconds with a recovery count; Acknowledge or Esc recovers.',
      })}
      ${spec({
        code: 'FD-03',
        title: 'Ink on hazard',
        bodyCls: 'spec-body--flush',
        body: `<div class="sig-poster fd-poster" style="background:var(--c-hazard);color:var(--c-void)">
          <span>${icon('eject', { size: 64 })}</span>
          <b class="t-display t-wide" style="font-size:clamp(34px,4vw,56px)">Eject<br>transf</b>
        </div>`,
      })}
      ${spec({
        code: 'FD-04',
        title: 'Cobalt triangles + alarm',
        bodyCls: 'spec-body--flush',
        body: `<div class="sig-poster fd-poster" style="background:#000;padding:0;gap:0">
          <span style="color:var(--c-cobalt-lo);flex:1;display:block;line-height:0;align-self:stretch">${triTile(10, 5, 9, { size: 400, alt: '#000' }).replace('width="400"', 'width="100%"').replace(/height="\d+"/, 'height="100%" preserveAspectRatio="none"')}</span>
          <span style="color:var(--c-crimson);padding:0 22px">${dotMatrix(3, 6, () => true, { size: 36 }).replace(/r="1.3"/g, 'r="1.5"')}</span>
        </div>`,
      })}
      ${spec({ code: 'FD-05', title: 'Swarm', cls: 'mountSwarm()', bodyCls: 'spec-body--flush tel-poster', body: '<canvas data-poster="swarm"></canvas>', foot: 'Outline triangles with solid red leads, crosses and coded tags; cells drop out per step.' })}
      ${spec({ code: 'FD-06', title: 'Dash field', cls: 'mountDashField()', bodyCls: 'spec-body--flush tel-poster', body: '<canvas data-poster="dash"></canvas>', foot: 'A checker body with a moving edge; loose dash rows feed it from the left.' })}
    </div>

    ${section('Wide fields', 'lib/wide.ts · FULL-WIDTH POSTER STRIPS · 12 FPS')}
    <div class="mo-wides">
      ${spec({ code: 'WF-01', title: 'Transfer window', cls: 'mountTransferField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide" data-wide="transfer"></canvas>', foot: 'Dash rows merge into violet blobs and eat in from the right; the stepped block lands one line per four frames.' })}
      ${spec({ code: 'WF-02', title: 'Swarm sweep', cls: 'mountSwarmField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide" data-wide="swarm"></canvas>', foot: 'Triangles turn a quarter and go acid as the sweep passes, then drop back in one cut.' })}
      ${spec({ code: 'WF-03', title: 'Sector lock', cls: 'mountSectorField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide" data-wide="sector"></canvas>', foot: 'Block type crawls one cell per two frames over cross marks, hazard stripes, checker flags and a re-rolling barcode.' })}
      ${spec({ code: 'WF-04', title: 'Defrag index', cls: 'mountDefragField()', bodyCls: 'spec-body--flush', body: '<canvas class="mo-wide mo-wide--tall" data-wide="defrag"></canvas>', foot: 'Fragments consolidate to lime behind a flashing head; the capsule counter turns lime at 100%.' })}
    </div>

    ${section('Transitions', 'CLICK TO CUT TO NEXT FRAME')}
    <div class="mo-monitor-wrap">
      <div class="mo-monitor" id="mon">
        <div class="mo-stage" id="mon-stage"></div>
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
  </section>
  ${faultOverlayHTML()}`;

  b.add(hydrate(root));
  b.add(mountFaultLoop($('.fd-fault', root)));
  b.add(mountSwarm($<HTMLCanvasElement>('[data-poster="swarm"]', root)));
  b.add(mountDashField($<HTMLCanvasElement>('[data-poster="dash"]', root)));
  const fault = mountFaultOverlay($('.flt-overlay', root));
  b.add(fault.dispose);
  b.add(on($('[data-fault-go]', root), 'holddone', fault.trigger));
  b.add(on($('[data-fault-now]', root), 'click', fault.trigger));
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
  const slide = bag();
  b.add(slide.dispose);
  b.add(animateTextWall($('#mo-wall .k-textwall', root), ['COHESION_', 'FAILURE_', 'ESTABLISHING_', 'LINK_']));
  const paintSlide = () => {
    if (signal.aborted) return;
    slide.dispose();
    stageEl.innerHTML = SLIDES[idx];
    $$('[data-mark]', stageEl).forEach((el) => slide.add(mountMark(el, el.dataset.mark!, markOptsFrom(el))));
    $$('.k-standby', stageEl).forEach((el) => slide.add(mountStandby(el)));
    if (stageEl.querySelector('.flt-poster')) slide.add(mountFaultLoop(stageEl));
    idxEl.textContent = `FRAME ${String(idx + 1).padStart(2, '0')}/${String(SLIDES.length).padStart(2, '0')}`;
  };
  paintSlide();
  const next = () => {
    idx = (idx + 1) % SLIDES.length;
    paintSlide();
  };
  let cutTimer = 0;
  const run = async (fx: string) => {
    if (busy || signal.aborted) return;
    busy = true;
    scramble(fxEl, fx.toUpperCase(), { duration: 0.2, signal });
    if (fx === 'wipe') await barWipe(wipeEl, next, signal);
    if (fx === 'flip') {
      const tl = gsap.timeline();
      ['#2424ff', '#7dff1a', '#000', '#ececec', '#000'].forEach((c, i) => tl.set(mon, { backgroundColor: c }, i * 0.05));
      tl.set(stageEl, { opacity: 0 }, 0);
      tl.call(next, [], 0.15);
      tl.set(stageEl, { opacity: 1 }, 0.26);
      tl.set(mon, { backgroundColor: '' }, 0.26);
      await waitForTimeline(tl, signal);
    }
    if (fx === 'glitch') {
      await glitch(stageEl, { frames: 6, intensity: 40, signal });
      if (signal.aborted) return;
      next();
      await glitch(stageEl, { frames: 4, intensity: 24, signal });
    }
    if (fx === 'cut') {
      next();
      mon.style.filter = 'invert(1)';
      cutTimer = window.setTimeout(() => {
        mon.style.filter = '';
        busy = false;
      }, 50);
      return;
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
  b.add(() => {
    lifecycle.abort();
    clearTimeout(cutTimer);
  });

  return b.dispose;
}
