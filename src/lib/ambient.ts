/**
 * Ambient field: a few flat cobalt blocks and rules that cut in and out in
 * steps behind the content. Solid fills only — no dither, dots or grain —
 * snapped to the 8 px grid so they read as layout, not noise.
 * Very low contrast; paused when reduced motion is requested.
 */
import { crispCanvas, rng, stepLoop, reducedMotion } from './util';

export function mountAmbient(canvas: HTMLCanvasElement, { fps = 4, density = 1 } = {}) {
  if (reducedMotion()) return () => {};
  const { ctx, size, dispose } = crispCanvas(canvas, 1);
  const r = rng(77);
  type Blk = { x: number; y: number; w: number; h: number; c: string; life: number };
  let blocks: Blk[] = [];
  // two flat cobalt tones for rules/blocks, one brighter tone for the rare tab
  const RULE = ['#0b0e52', '#080a3c'];
  const SLAB = ['#070936', '#090b44'];
  const TAB = '#1a22c8';
  const G = 8;
  const snap = (v: number) => Math.floor(v / G) * G;
  const spawn = (): Blk => {
    const k = r();
    const x = snap(r() * size.w);
    const y = snap(r() * size.h);
    if (k < 0.62) {
      // hairline rule: long, 1–2 px, the most common element
      return { x, y, w: G * (6 + Math.floor(r() * 30)), h: r() < 0.7 ? 1 : 2, c: RULE[Math.floor(r() * 2)], life: 4 + Math.floor(r() * 16) };
    }
    if (k < 0.93) {
      // flat slab: a solid block of a few grid cells
      return { x, y, w: G * (2 + Math.floor(r() * 8)), h: G * (1 + Math.floor(r() * 4)), c: SLAB[Math.floor(r() * 2)], life: 3 + Math.floor(r() * 12) };
    }
    // tab: a short bright cobalt marker
    return { x, y, w: G * (1 + Math.floor(r() * 3)), h: 4, c: TAB, life: 2 + Math.floor(r() * 5) };
  };
  const stop = stepLoop(fps, () => {
    const target = Math.round(((size.w * size.h) / 34000) * density);
    blocks = blocks.filter((b) => --b.life > 0);
    while (blocks.length < target) blocks.push(spawn());
    ctx.clearRect(0, 0, size.w, size.h);
    for (const b of blocks) {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  });
  return () => {
    stop();
    dispose();
  };
}
