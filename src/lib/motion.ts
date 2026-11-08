/**
 * Stepped motion primitives.
 * Rule of thumb: never use smooth easing for UI state changes —
 * use `steps(n)` or fixed-rate frame updates.
 */
import gsap from 'gsap';
import { pick, rng, stepLoop } from './util';

export const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>[]=+-_';
export const BLOCKS = '█▓▒░▚▞▙▟▛▜';

/** Decode text from noise → final string, character by character. */
export function scramble(
  el: HTMLElement,
  text = el.dataset.text ?? el.textContent ?? '',
  { fps = 30, duration = 0.7, charset = GLYPHS, keepSpaces = true, signal }: { fps?: number; duration?: number; charset?: string; keepSpaces?: boolean; signal?: AbortSignal } = {},
) {
  if (signal?.aborted) return Promise.resolve();
  el.dataset.text = text;
  const total = Math.max(1, Math.round(duration * fps));
  const len = text.length;
  return new Promise<void>((resolve) => {
    const finish = () => {
      el.textContent = text;
      stop();
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const stop = stepLoop(fps, (f) => {
      const progress = f / total;
      let out = '';
      for (let i = 0; i < len; i++) {
        const lockAt = (i / len) * 0.8; // left-to-right lock-in
        if (progress >= lockAt + 0.2 || (keepSpaces && text[i] === ' ')) out += text[i];
        else out += charset[(Math.random() * charset.length) | 0];
      }
      el.textContent = out;
      if (f >= total) finish();
    });
    signal?.addEventListener('abort', finish, { once: true });
  });
}

/** Stepped typewriter with block caret. */
export function typeOut(el: HTMLElement, text: string, { cps = 40, caret = '█' } = {}) {
  return new Promise<void>((resolve) => {
    let i = 0;
    const stop = stepLoop(cps, () => {
      i++;
      el.textContent = text.slice(0, i) + (i < text.length ? caret : '');
      if (i >= text.length) {
        stop();
        resolve();
      }
    });
  });
}

/** Rolling digit counter that jumps in discrete steps. */
export function countTo(el: HTMLElement, to: number, { from = 0, steps = 14, duration = 0.6, pad = 0, fmt }: { from?: number; steps?: number; duration?: number; pad?: number; fmt?: (n: number) => string } = {}) {
  const o = { v: from };
  return gsap.to(o, {
    v: to,
    duration,
    ease: `steps(${steps})`,
    onUpdate: () => {
      el.textContent = fmt ? fmt(o.v) : String(Math.round(o.v)).padStart(pad, '0');
    },
  });
}

/**
 * Horizontal slice glitch: duplicates the element's content into
 * clipped layers and jitters them for a few frames.
 */
export function glitch(el: HTMLElement, { frames = 8, fps = 24, intensity = 18, colors = ['#2424ff', '#ff2a17', '#7dff1a'] } = {}) {
  const host = el;
  const prevPos = getComputedStyle(host).position;
  if (prevPos === 'static') host.style.position = 'relative';
  const layers: HTMLElement[] = [];
  for (let i = 0; i < 3; i++) {
    const l = document.createElement('span');
    l.setAttribute('aria-hidden', 'true');
    l.className = 'fx-glitch-layer';
    l.innerHTML = host.innerHTML;
    l.style.color = colors[i % colors.length];
    host.appendChild(l);
    layers.push(l);
  }
  return new Promise<void>((resolve) => {
    const stop = stepLoop(fps, (f) => {
      layers.forEach((l) => {
        const y0 = Math.random() * 100;
        const y1 = Math.min(100, y0 + 4 + Math.random() * 22);
        l.style.clipPath = `inset(${y0}% 0 ${100 - y1}% 0)`;
        l.style.transform = `translateX(${(Math.random() - 0.5) * intensity * 2}px)`;
        l.style.opacity = Math.random() < 0.15 ? '0' : '1';
      });
      host.style.transform = Math.random() < 0.3 ? `translateX(${(Math.random() - 0.5) * 6}px)` : '';
      if (f >= frames) {
        stop();
        layers.forEach((l) => l.remove());
        host.style.transform = '';
        if (prevPos === 'static') host.style.position = '';
        resolve();
      }
    });
  });
}

/** Flash random solid blocks over a container for a few frames (hard-cut transition). */
export function flashBlocks(container: HTMLElement, { count = 14, frames = 6, fps = 20, colors = ['#2424ff', '#000', '#7dff1a', '#ececec'] } = {}) {
  const layer = document.createElement('div');
  layer.className = 'fx-flash-layer';
  container.appendChild(layer);
  return new Promise<void>((resolve) => {
    const stop = stepLoop(fps, (f) => {
      layer.innerHTML = '';
      const n = Math.round(count * (1 - f / frames));
      for (let i = 0; i < n; i++) {
        const b = document.createElement('i');
        const w = 5 + Math.random() * 45;
        const h = 2 + Math.random() * (Math.random() < 0.3 ? 40 : 10);
        b.style.cssText = `left:${Math.random() * (100 - w)}%;top:${Math.random() * (100 - h)}%;width:${w}%;height:${h}%;background:${pick(colors)}`;
        layer.appendChild(b);
      }
      if (f >= frames) {
        stop();
        layer.remove();
        resolve();
      }
    });
  });
}

/** Stamp: overshoot scale + colour flip in 3 frames. */
export function stamp(el: HTMLElement) {
  return gsap
    .timeline()
    .fromTo(el, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: 'steps(3)' })
    .to(el, { filter: 'invert(1)', duration: 0.06, ease: 'steps(1)', yoyo: true, repeat: 3 });
}

/** Clip-reveal from one edge in hard steps. */
export function reveal(el: HTMLElement | HTMLElement[], { from = 'left', steps = 6, duration = 0.36, stagger = 0.08 } = {}) {
  const map: Record<string, string> = {
    left: 'inset(0 100% 0 0)',
    right: 'inset(0 0 0 100%)',
    top: 'inset(0 0 100% 0)',
    bottom: 'inset(100% 0 0 0)',
  };
  return gsap.fromTo(
    el,
    { clipPath: map[from] },
    { clipPath: 'inset(0 0% 0 0%)', duration, ease: `steps(${steps})`, stagger },
  );
}

/** Page-level wipe built from N bars. `swap` runs while screen is covered. */
export async function barWipe(overlay: HTMLElement, swap: () => void | Promise<void>) {
  const bars = Array.from(overlay.children) as HTMLElement[];
  const order = bars.map((_, i) => i).sort(() => Math.random() - 0.5);
  const tl = gsap.timeline();
  gsap.set(bars, { transformOrigin: 'left', scaleX: 0 });
  order.forEach((idx, i) => {
    tl.to(bars[idx], { scaleX: 1, duration: 0.12, ease: 'steps(3)' }, i * 0.018);
  });
  await tl.then();
  await swap();
  const tl2 = gsap.timeline();
  gsap.set(bars, { transformOrigin: 'right' });
  order.forEach((idx, i) => {
    tl2.to(bars[idx], { scaleX: 0, duration: 0.12, ease: 'steps(3)' }, 0.04 + i * 0.018);
  });
  await tl2.then();
}

type Slice = readonly [top: number, height: number, shift: number];
type SliceFrame = readonly Slice[];
const SLICE_OUT: readonly SliceFrame[] = [
  [[0.21, 0.019, 0.022], [0.53, 0.032, -0.033], [0.79, 0.013, 0.015]],
  [[0.13, 0.043, -0.067], [0.38, 0.029, 0.056], [0.61, 0.085, -0.081], [0.84, 0.019, 0.031]],
  [[0.09, 0.033, 0.061], [0.27, 0.072, -0.085], [0.48, 0.118, 0.116], [0.76, 0.052, -0.066]],
];
const SLICE_IN: readonly SliceFrame[] = [
  [[0.11, 0.062, -0.091], [0.3, 0.075, 0.092], [0.51, 0.103, -0.11], [0.83, 0.04, 0.061]],
  [[0.19, 0.038, 0.052], [0.43, 0.064, -0.068], [0.68, 0.031, 0.052]],
  [[0.34, 0.018, -0.026], [0.7, 0.012, 0.019], [0.91, 0.011, -0.016]],
];
const SVG_NS = 'http://www.w3.org/2000/svg';
let nextSliceId = 0;

/** Displace bands of the live element before and after a cut. */
export async function sliceGlitchTransition(host: HTMLElement, swap: () => void | Promise<void>, signal: AbortSignal) {
  if (signal.aborted) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return swap();

  const svg = document.createElementNS(SVG_NS, 'svg');
  const id = `route-slice-${++nextSliceId}`;
  const indices = [0, 1, 2, 3];
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs><filter id="${id}" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
    ${indices.map((i) => `<feFlood x="0" y="0" width="1" height="0" flood-color="white" result="band${i}"/>`).join('')}
    <feMerge result="bands">${indices.map((i) => `<feMergeNode in="band${i}"/>`).join('')}</feMerge>
    <feComposite in="SourceGraphic" in2="bands" operator="out" result="rest"/>
    ${indices.map((i) => `<feComposite in="SourceGraphic" in2="band${i}" operator="in" result="slice${i}"/>
    <feOffset in="slice${i}" result="shift${i}" dx="0"/>`).join('')}
    <feFlood x="0" y="0" width="0" height="0" flood-color="var(--c-cobalt)" result="signal"/>
    <feMerge><feMergeNode in="rest"/>${indices.map((i) => `<feMergeNode in="shift${i}"/>`).join('')}<feMergeNode in="signal"/></feMerge>
  </filter></defs>`;
  const floods = svg.querySelectorAll('feFlood');
  const offsets = svg.querySelectorAll('feOffset');
  const flash = floods[indices.length];
  const previousFilter = host.style.filter;
  const filter = `url("#${id}")`;

  const render = (slices: SliceFrame) => {
    indices.forEach((i) => {
      const [top, height, shift] = slices[i] ?? [0, 0, 0];
      floods[i].setAttribute('y', String(top));
      floods[i].setAttribute('height', String(height));
      offsets[i].setAttribute('dx', String(shift));
    });
    const [top, height, shift] = slices[1];
    flash.setAttribute('x', String(shift > 0 ? 0 : 1 + shift));
    flash.setAttribute('y', String(top + height * 0.62));
    flash.setAttribute('width', String(Math.abs(shift) * 0.78));
    flash.setAttribute('height', '0.004');
  };
  const clearFilter = () => {
    if (host.style.filter === filter) host.style.filter = previousFilter;
  };
  const reset = () => {
    clearFilter();
    svg.remove();
  };
  const motionChanged = () => { if (motion.matches) reset(); };
  const play = (frames: readonly SliceFrame[]) => new Promise<void>((resolve) => {
    let start: number | undefined;
    let previous = -1;
    let raf = 0;
    const finish = () => {
      cancelAnimationFrame(raf);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const tick = (now: number) => {
      start ??= now;
      const index = Math.floor((now - start) / 36);
      if (!svg.isConnected || index >= frames.length) return finish();
      if (index !== previous) {
        render(frames[index]);
        previous = index;
      }
      raf = requestAnimationFrame(tick);
    };
    signal.addEventListener('abort', finish, { once: true });
    raf = requestAnimationFrame(tick);
  });

  document.body.appendChild(svg);
  host.style.filter = filter;
  signal.addEventListener('abort', reset, { once: true });
  motion.addEventListener('change', motionChanged);
  try {
    await play(SLICE_OUT);
    if (signal.aborted) return;
    // A page may need another import during mount. Keep the filter off while it waits.
    clearFilter();
    await swap();
    if (!signal.aborted && svg.isConnected) {
      render(SLICE_IN[0]);
      host.style.filter = filter;
      await play(SLICE_IN);
    }
  } finally {
    reset();
    signal.removeEventListener('abort', reset);
    motion.removeEventListener('change', motionChanged);
  }
}

/** Random hex-ish readout that keeps flickering (texture layer). */
export function flickerReadout(el: HTMLElement, { fps = 8, len = 6, seed = 1 } = {}) {
  const r = rng(seed);
  return stepLoop(
    fps,
    () => {
      let s = '';
      for (let i = 0; i < len; i++) s += '0123456789ABCDEF'[(r() * 16) | 0];
      el.textContent = s;
    },
    el,
  );
}
