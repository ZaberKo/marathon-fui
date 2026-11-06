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
  { fps = 30, duration = 0.7, charset = GLYPHS, keepSpaces = true } = {},
) {
  el.dataset.text = text;
  const total = Math.max(1, Math.round(duration * fps));
  const len = text.length;
  return new Promise<void>((resolve) => {
    const stop = stepLoop(fps, (f) => {
      const progress = f / total;
      let out = '';
      for (let i = 0; i < len; i++) {
        const lockAt = (i / len) * 0.8; // left-to-right lock-in
        if (progress >= lockAt + 0.2 || (keepSpaces && text[i] === ' ')) out += text[i];
        else out += charset[(Math.random() * charset.length) | 0];
      }
      el.textContent = out;
      if (f >= total) {
        el.textContent = text;
        stop();
        resolve();
      }
    });
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
