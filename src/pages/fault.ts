import gsap from 'gsap';
import { pageHead, section, spec } from './_ui';
import { bitmap, pixelIcon } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { notify } from '../lib/toast';
import { bag, on, pad, stepLoop, $, $$ } from '../lib/util';

const FAULT_WORDS = ['WARNING_', 'COGNITION_', 'RUNTIME_', 'ERROR_'];
const faultMark = bitmap(['.###.', '##.##', '#.#.#', '##.##', '.###.'], { size: 40 });

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('08', 'Runtime<br><span class="t-outline">Fault</span>', ['CRITICAL STATE', 'FULL-FIELD INVERSION', 'RECOVERABLE'], 178)}
    <p class="page-lede">The fault cuts to <b>solid crimson</b>. A single black band carries the changing warning in cobalt and hazard yellow.
    Set <b>data-state="fault"</b> on the surface to apply the inverted palette.</p>

    <div class="flt-trigger">
      <div class="t-micro">COGNITION RUNTIME / 0x0000003F</div>
      <button class="k-btn k-btn--danger k-btn--lg k-hold" data-hold="900" id="flt-go">${pixelIcon('warn', { size: 16 })}<span data-label>Hold to inject fault</span></button>
      <button class="k-btn k-btn--sm" id="flt-quick">Trigger instantly</button>
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
        code: 'ALR-03',
        title: 'Confirm modal',
        cls: '.k-modal',
        body: `<button class="k-btn k-btn--danger" id="flt-modal-open">Open modal</button>`,
        foot: 'Stepped scale-in. Press Esc to close.',
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

  <div class="flt-overlay" id="flt" data-state="fault" role="region" aria-label="Runtime fault" hidden>
    <div class="flt-register" aria-hidden="true">${faultMark}${faultMark}</div>
    <div class="flt-band" aria-hidden="true">
      <div class="flt-band__ink t-pixel">Runtime_Error</div>
      <div class="k-marquee flt-marq" style="--dur:8s;--marq-steps:128">
        <div class="k-marquee__track">${'<span class="t-display" data-fault-word></span>'.repeat(2)}</div>
      </div>
    </div>
    <div class="flt-foot">
      <div class="flt-code t-mono">
        <b>EXCEPTION 0x0000003F</b>
        <span class="flt-count">AUTO-RECOVER IN <b id="flt-n">10</b></span>
      </div>
      <button class="k-btn k-btn--lg flt-ack" id="flt-ack">${pixelIcon('check', { size: 14 })} Acknowledge</button>
    </div>
  </div>`;

  b.add(hydrate(root));

  const overlay = $('#flt', root);
  const nEl = $('#flt-n', root);
  const marquee = $('.flt-marq', overlay);
  const words = $$('[data-fault-word]', marquee);
  const acknowledge = $('#flt-ack', overlay);
  let countStop: (() => void) | null = null;
  let returnFocus: HTMLElement | null = null;

  const paintFault = (elapsed: number) => {
    const phase = Math.min(FAULT_WORDS.length - 1, Math.floor(elapsed / 0.9));
    const word = FAULT_WORDS[phase].repeat(6);
    marquee.classList.toggle('is-cobalt', phase % 2 === 1);
    for (const span of words) if (span.textContent !== word) span.textContent = word;
    const count = pad(Math.max(0, Math.ceil(10 - elapsed)));
    if (nEl.textContent !== count) nEl.textContent = count;
  };

  const trigger = () => {
    if (!overlay.hidden) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const started = performance.now() / 1000;
    paintFault(0);
    overlay.hidden = false;
    acknowledge.focus();
    countStop = stepLoop(12, (_, now) => {
      const elapsed = now - started;
      paintFault(elapsed);
      if (elapsed >= 10) recover();
    });
  };
  const recover = () => {
    if (overlay.hidden) return;
    countStop?.();
    countStop = null;
    overlay.hidden = true;
    returnFocus?.focus();
    notify({ title: 'System restored', msg: 'Fault acknowledged · integrity 97%', state: 'nominal' });
  };

  const go = $('#flt-go', root);
  // Fire when the hold completes (class is-done added by hydrate)
  const mo = new MutationObserver(() => {
    if (go.classList.contains('is-done')) trigger();
  });
  mo.observe(go, { attributes: true, attributeFilter: ['class'] });
  b.add(() => mo.disconnect());
  b.add(on($('#flt-quick', root), 'click', trigger));
  b.add(on(acknowledge, 'click', recover));
  b.add(on(window, 'keydown', (e: KeyboardEvent) => e.key === 'Escape' && (overlay.hidden ? closeModal() : recover())));
  b.add(() => countStop?.());

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
