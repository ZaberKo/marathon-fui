import gsap from 'gsap';
import { pageHead, section, spec } from './_ui';
import { pixelIcon } from '../lib/glyphs';
import { animateTextWall, textWall } from '../lib/compose';
import { mountDefragRing, mountTerminal } from '../lib/hud';
import { hydrate } from '../lib/hydrate';
import { flashBlocks, glitch } from '../lib/motion';
import { notify } from '../lib/toast';
import { bag, on, pad, stepLoop, $, $$ } from '../lib/util';

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('08', 'Runtime<br><span class="t-outline">Fault</span>', ['CRITICAL STATE', 'FULL-FIELD INVERSION', 'RECOVERABLE'], 178)}
    <p class="page-lede">When the system fails, colour logic flips: the black field becomes <b>crimson</b>, type becomes <b>ink and cobalt</b>,
    marquees run, alarm grids blink. The fault surface is just <b>data-state="fault"</b> on a container — every component re-themes itself.</p>

    <div class="flt-monitor">
      <div class="k-panel" data-state="cobalt">
        <div class="k-panel__head"><span>System monitor</span><span class="t-pixel" style="font-size:8px;font-weight:400">MON-01</span></div>
        <div class="k-panel__body flt-mon-body">
          <div class="flt-ring"><canvas id="flt-ring"></canvas></div>
          <div id="flt-log" style="min-width:0"></div>
        </div>
      </div>
      <div class="flt-trigger">
        <div class="t-micro">INJECT A SIMULATED RUNTIME EXCEPTION</div>
        <button class="k-btn k-btn--danger k-btn--lg k-hold" data-hold="900" id="flt-go" style="width:100%">${pixelIcon('warn', { size: 16 })}<span data-label>Hold to inject fault</span></button>
        <button class="k-btn k-btn--sm" id="flt-quick">Or trigger instantly</button>
      </div>
    </div>

    ${section('Alerts', '.k-alert · .k-modal')}
    <div class="spec-grid">
      ${spec({
        code: 'ALR-01',
        title: 'Inline alerts',
        cls: '.k-alert[data-state]',
        bodyCls: 'spec-body--col',
        body: `
          <div class="k-alert" data-state="nominal"><span>${pixelIcon('check', { size: 14 })}</span><div><b>Sync complete</b><p>Neural subroutines 07/07 mounted.</p></div></div>
          <div class="k-alert" data-state="caution"><span>${pixelIcon('warn', { size: 14 })}</span><div><b>Thermal delta</b><p>+0.4K above band. Monitor core temp.</p></div></div>
          <div class="k-alert" data-state="critical"><span>${pixelIcon('cross', { size: 14 })}</span><div><b>Packet loss</b><p>Uplink unstable — 12% dropped.</p></div></div>`,
      })}
      ${spec({
        code: 'ALR-02',
        title: 'Caution banner',
        cls: '.k-hazard + .k-band',
        bodyCls: 'spec-body--col',
        body: `
          <div class="k-hazard k-hazard--anim" style="height:10px"></div>
          <div class="k-band" data-state="caution" style="height:auto;padding:10px 12px;font-size:18px;justify-content:space-between"><span>Restricted zone</span>${pixelIcon('warn', { size: 22 })}</div>
          <div class="k-hazard k-hazard--anim" style="height:10px"></div>
          <div class="t-micro">EXPOSURE LIMIT 00:04:12 · SHELL DEGRADATION 0.3%/S</div>`,
      })}
      ${spec({
        code: 'ALR-03',
        title: 'Confirm modal',
        cls: '.k-modal',
        body: `<button class="k-btn k-btn--danger" id="flt-modal-open">Open modal</button>`,
        foot: 'Stepped scale-in, backdrop scanlines, ESC to close.',
      })}
    </div>
  </section>

  <div class="k-modal" id="flt-modal" hidden>
    <div class="k-modal__card" data-state="critical" role="dialog" aria-modal="true" aria-labelledby="flt-modal-t">
      <div class="k-panel__head"><span id="flt-modal-t">Confirm purge</span><span>${pixelIcon('warn', { size: 12 })}</span></div>
      <div class="k-modal__body">
        <b class="t-display t-wide">Erase memory block 0x3F?</b>
        <p class="t-micro">THIS ACTION CANNOT BE REVERSED. ALL ENGRAMS IN SECTOR 7 WILL BE DEFRAGMENTED.</p>
        <div class="k-modal__actions"><button class="k-btn" data-close>Cancel</button><button class="k-btn k-btn--solid" data-close data-confirm>Purge</button></div>
      </div>
    </div>
  </div>

  <div class="flt-overlay" id="flt" data-state="fault" hidden>
    <div class="flt-bgword t-display">Fault</div>
    <div class="flt-marq flt-marq--a"><div class="k-marquee" style="--dur:9s;--marq-steps:90"><div class="k-marquee__track">${'<span class="t-display">Error_error_</span>'.repeat(6)}</div></div></div>
    <div class="flt-wall">${textWall({ word: 'RUNTIME_', hot: 'WARNING_', hotFill: 'WARN_', rows: 3, hotRow: 1, dur: 10 })}</div>
    <div class="flt-grid">
      <div class="flt-tri"><span data-mark="tri" data-cols="14" data-rows="10" data-size="640" data-seed="13" data-fps="5"></span></div>
      <div class="flt-alarm"><span data-mark="dots" data-cols="3" data-rows="6" data-size="54" data-mode="alarm" data-fps="4"></span></div>
      <div class="flt-code t-mono">
        <b class="t-display t-wide">Runtime error</b>
        <div>EXCEPTION 0x0000003F</div>
        <div>AT liminal.buffer.flush (core:07:441)</div>
        <div>AT neural.transfer.commit (link:12:09)</div>
        <div>SHELL INTEGRITY … <span class="fx-blink-fast">012%</span></div>
        <div class="flt-count">AUTO-RECOVER IN <b id="flt-n">10</b></div>
      </div>
    </div>
    <div class="flt-foot">
      <div class="k-hazard k-hazard--anim" style="--h-a:#000;--h-b:var(--c-crimson);height:14px;flex:1"></div>
      <button class="k-btn k-btn--lg flt-ack" id="flt-ack">${pixelIcon('check', { size: 14 })} Acknowledge</button>
    </div>
  </div>`;

  b.add(hydrate(root));
  b.add(mountDefragRing($('#flt-ring', root), { rings: 3, segs: 30 }));
  b.add(mountTerminal($('#flt-log', root), { max: 9 }));
  b.add(animateTextWall($('.flt-wall .k-textwall', root), ['WARNING_', 'RUNTIME_', 'FAULT_'], 1800));

  const overlay = $('#flt', root);
  const nEl = $('#flt-n', root);
  let countStop: (() => void) | null = null;
  let active = false;

  const trigger = async () => {
    if (active) return;
    active = true;
    const tl = gsap.timeline();
    ['#ececec', '#000', '#ff2a17', '#000'].forEach((c, i) => tl.set(document.body, { backgroundColor: c }, i * 0.05));
    await tl.then();
    overlay.hidden = false;
    flashBlocks(overlay, { colors: ['#000', '#2424ff', '#ececec'], frames: 6, count: 20 });
    glitch($('.flt-code b', overlay), { frames: 10, colors: ['#2424ff', '#000', '#ececec'] });
    let n = 10;
    nEl.textContent = pad(n);
    countStop = stepLoop(1, (f) => {
      if (f === 0) return;
      n--;
      nEl.textContent = pad(n);
      if (n <= 0) recover();
    });
  };
  const recover = async () => {
    if (!active) return;
    countStop?.();
    countStop = null;
    await flashBlocks(overlay, { colors: ['#000', '#2424ff', '#7dff1a'], frames: 5, count: 24 });
    overlay.hidden = true;
    document.body.style.backgroundColor = '';
    active = false;
    notify({ title: 'System restored', msg: 'Fault acknowledged · integrity 97%', state: 'nominal' });
  };

  const go = $('#flt-go', root);
  // Fire when the hold completes (class is-done added by hydrate)
  const mo = new MutationObserver(() => {
    if (go.classList.contains('is-done')) setTimeout(trigger, 250);
  });
  mo.observe(go, { attributes: true, attributeFilter: ['class'] });
  b.add(() => mo.disconnect());
  b.add(on($('#flt-quick', root), 'click', trigger));
  b.add(on($('#flt-ack', root), 'click', recover));
  b.add(on(window, 'keydown', (e: KeyboardEvent) => e.key === 'Escape' && (active ? recover() : closeModal())));
  b.add(() => {
    countStop?.();
    document.body.style.backgroundColor = '';
  });

  // modal
  const modal = $('#flt-modal', root);
  const card = $('.k-modal__card', modal);
  const openModal = () => {
    modal.hidden = false;
    gsap.fromTo(card, { scaleY: 0.02, scaleX: 0.4 }, { scaleY: 1, scaleX: 1, duration: 0.2, ease: 'steps(4)' });
    modal.querySelector<HTMLButtonElement>('[data-close]')!.focus();
  };
  const closeModal = () => {
    if (modal.hidden) return;
    gsap.to(card, { scaleY: 0.02, duration: 0.12, ease: 'steps(3)', onComplete: () => (modal.hidden = true) });
  };
  b.add(on($('#flt-modal-open', root), 'click', openModal));
  $$('[data-close]', modal).forEach((btn) =>
    b.add(
      on(btn, 'click', () => {
        if (btn.hasAttribute('data-confirm')) notify({ title: 'Purge complete', msg: 'Block 0x3F erased', state: 'critical' });
        closeModal();
      }),
    ),
  );
  b.add(on(modal, 'click', (e: Event) => e.target === modal && closeModal()));
  return b.dispose;
}
