/** Small shared utilities: seeded RNG, stepped loop, crisp canvas. */

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const pick = <T>(arr: readonly T[], r = Math.random) => arr[Math.floor(r() * arr.length)];
export const pad = (n: number, len = 2, ch = '0') => String(Math.floor(n)).padStart(len, ch);
export const hex = (n: number, len = 4) => Math.floor(n).toString(16).toUpperCase().padStart(len, '0');

export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fixed-rate loop — the core of "stepped" animation.
 * The callback only fires at `fps`, so motion reads as discrete frames.
 * Pauses automatically while the element is off-screen.
 */
export function stepLoop(
  fps: number,
  cb: (frame: number, t: number) => void,
  watch?: Element,
) {
  let raf = 0;
  let last = 0;
  let frame = 0;
  let visible = true;
  const interval = 1000 / fps;
  const io = watch
    ? new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    : null;
  if (watch && io) io.observe(watch);
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (!visible) return;
    if (now - last < interval) return;
    last = now - ((now - last) % interval);
    cb(frame++, now / 1000);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    io?.disconnect();
  };
}

/** Make a canvas match its CSS box at device pixel ratio. Returns 2D ctx + size getter. */
export function crispCanvas(canvas: HTMLCanvasElement, maxDpr = 2) {
  const ctx = canvas.getContext('2d')!;
  const size = { w: 0, h: 0, dpr: 1 };
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    size.w = Math.max(1, Math.round(r.width));
    size.h = Math.max(1, Math.round(r.height));
    size.dpr = dpr;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  return { ctx, size, dispose: () => ro.disconnect() };
}

/** Read a CSS custom property colour from :root (or an element). */
export function cssVar(name: string, el: Element = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export type Cleanup = () => void;
export function bag() {
  const fns: Cleanup[] = [];
  return {
    add<T extends Cleanup | void | undefined>(fn: T) {
      if (fn) fns.push(fn as Cleanup);
      return fn;
    },
    dispose() {
      while (fns.length) {
        try {
          fns.pop()!();
        } catch (e) {
          console.warn(e);
        }
      }
    },
  };
}

export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget,
  type: K | string,
  fn: (e: any) => void,
  opts?: AddEventListenerOptions,
) {
  el.addEventListener(type, fn, opts);
  return () => el.removeEventListener(type, fn, opts);
}

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll(sel)) as T[];
