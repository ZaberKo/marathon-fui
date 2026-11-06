/**
 * Declarative behaviours — add data-attributes / classes in markup,
 * call `hydrate(root)` once, get a cleanup back.
 *
 *  data-scramble-hover     decode label on hover (targets [data-label] child or self)
 *  data-scramble-in        decode once when scrolled into view
 *  data-glitch-hover       slice-glitch on hover
 *  data-hold="1200"        press-and-hold to confirm (.k-hold)
 *  data-load-demo          click toggles .is-loading for 1.6s
 *  .k-range input          syncs --val + <output>
 *  .k-tabs                 tablist switching
 *  .k-seg-ctl              single-select segmented control
 *  .k-stepper              +/- numeric
 *  data-mark="checker"     animated vector mark (see lib/marks.ts)
 *  ENTER selector          stepped block-wipe entrance on scroll-in
 */
import { glitch, reveal, scramble } from './motion';
import { markOptsFrom, mountMark } from './marks';
import { $$, bag, on, reducedMotion } from './util';

/** Elements that get the stepped block-wipe entrance when scrolled in. */
const ENTER = '.spec, .k-panel, .k-cta, .sig-sw, .gly-icon, .mo-monitor, .flt-trigger, .sp-toolbar, .ts-row';

export function hydrate(root: HTMLElement) {
  const b = bag();

  $$('[data-mark]', root).forEach((el) => b.add(mountMark(el, el.dataset.mark!, markOptsFrom(el))));

  // page head choreography: title lines clip in, meta decodes
  const title = root.querySelector<HTMLElement>('.page-title');
  if (title && !reducedMotion()) {
    reveal(title, { from: 'left', steps: 6, duration: 0.42 });
    $$('.page-meta .t-micro', root).forEach((m, i) => setTimeout(() => scramble(m, m.textContent ?? '', { duration: 0.5 }), 120 + i * 90));
  }

  // stepped block-wipe entrances
  if (!reducedMotion()) {
    let batch = 0;
    let batchT = 0;
    const enterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          enterIO.unobserve(e.target);
          const el = e.target as HTMLElement;
          // stagger elements that enter together
          clearTimeout(batchT);
          batchT = window.setTimeout(() => (batch = 0), 120);
          el.style.setProperty('--enter-d', `${Math.min(batch++, 8) * 0.06}s`);
          el.classList.add('fx-in');
        });
      },
      { rootMargin: '0px 0px -40px 0px' },
    );
    $$(ENTER, root).forEach((el) => {
      el.classList.add('fx-enter');
      enterIO.observe(el);
    });
    b.add(() => enterIO.disconnect());
  }

  $$('[data-scramble-hover]', root).forEach((el) => {
    const target = el.querySelector<HTMLElement>('[data-label]') ?? el;
    const text = target.textContent ?? '';
    let busy = false;
    b.add(
      on(el, 'pointerenter', async () => {
        if (busy) return;
        busy = true;
        await scramble(target, text, { duration: 0.35, fps: 30 });
        busy = false;
      }),
    );
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target as HTMLElement;
      scramble(el, el.dataset.text ?? el.textContent ?? '', { duration: Number(el.dataset.scrambleIn) || 0.8 });
    });
  });
  $$('[data-scramble-in]', root).forEach((el) => {
    el.dataset.text = el.textContent ?? '';
    io.observe(el);
  });
  b.add(() => io.disconnect());

  $$('[data-glitch-hover]', root).forEach((el) => {
    let busy = false;
    b.add(
      on(el, 'pointerenter', async () => {
        if (busy) return;
        busy = true;
        await glitch(el, { frames: 7 });
        busy = false;
      }),
    );
  });

  $$('[data-hold]', root).forEach((el) => {
    const ms = Number(el.dataset.hold) || 1200;
    const label = el.querySelector<HTMLElement>('[data-label]');
    const idle = label?.textContent ?? '';
    let t0 = 0;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      // quantise progress to 12 steps
      el.style.setProperty('--p', String(Math.floor(p * 12) / 12));
      if (p >= 1) {
        el.classList.remove('is-armed');
        el.classList.add('is-done');
        if (label) label.textContent = 'CONFIRMED';
        setTimeout(() => {
          el.classList.remove('is-done');
          el.style.setProperty('--p', '0');
          if (label) label.textContent = idle;
        }, 1600);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const start = (e: Event) => {
      e.preventDefault();
      if (el.classList.contains('is-done')) return;
      t0 = performance.now();
      el.classList.add('is-armed');
      if (label) label.textContent = 'HOLDING…';
      raf = requestAnimationFrame(tick);
    };
    const cancel = () => {
      if (el.classList.contains('is-done')) return;
      cancelAnimationFrame(raf);
      el.classList.remove('is-armed');
      el.style.setProperty('--p', '0');
      if (label) label.textContent = idle;
    };
    b.add(on(el, 'pointerdown', start));
    b.add(on(el, 'pointerup', cancel));
    b.add(on(el, 'pointerleave', cancel));
    b.add(on(el, 'keydown', (e: KeyboardEvent) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && start(e)));
    b.add(on(el, 'keyup', cancel));
    b.add(() => cancelAnimationFrame(raf));
  });

  $$('[data-load-demo]', root).forEach((el) => {
    b.add(
      on(el, 'click', () => {
        el.classList.add('is-loading');
        setTimeout(() => el.classList.remove('is-loading'), 1600);
      }),
    );
  });

  $$<HTMLInputElement>('.k-range input[type=range]', root).forEach((input) => {
    const out = input.closest('.k-range')?.querySelector('output');
    const sync = () => {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const p = ((Number(input.value) - min) / (max - min)) * 100;
      input.style.setProperty('--val', `${p}%`);
      if (out) out.textContent = String(input.value).padStart(3, '0');
    };
    sync();
    b.add(on(input, 'input', sync));
  });

  $$('.k-tabs', root).forEach((tabs) => {
    const btns = $$<HTMLButtonElement>('button', tabs);
    const panel = tabs.nextElementSibling as HTMLElement | null;
    btns.forEach((btn) =>
      b.add(
        on(btn, 'click', () => {
          btns.forEach((x) => x.setAttribute('aria-selected', String(x === btn)));
          if (panel && btn.dataset.panel) {
            panel.textContent = btn.dataset.panel;
            scramble(panel, btn.dataset.panel, { duration: 0.4 });
          }
        }),
      ),
    );
  });

  $$('.k-seg-ctl', root).forEach((grp) => {
    const btns = $$<HTMLButtonElement>('button', grp);
    btns.forEach((btn) =>
      b.add(
        on(btn, 'click', () => {
          btns.forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
          grp.dispatchEvent(new CustomEvent('k-change', { detail: btn.dataset.value ?? btn.textContent, bubbles: true }));
        }),
      ),
    );
  });

  $$('.k-stepper', root).forEach((st) => {
    const out = st.querySelector('output')!;
    let v = Number(out.textContent) || 0;
    const [minus, plus] = $$<HTMLButtonElement>('button', st);
    const set = (n: number) => {
      v = Math.max(0, Math.min(99, n));
      out.textContent = String(v).padStart(2, '0');
    };
    b.add(on(minus, 'click', () => set(v - 1)));
    b.add(on(plus, 'click', () => set(v + 1)));
  });

  return b.dispose;
}
