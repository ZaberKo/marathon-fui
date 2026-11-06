/**
 * Ambient field: dim cobalt pixel-blocks and data streaks that flicker in
 * steps behind the content (the "machine room" texture of the reference).
 * Very low contrast; paused off-screen / when reduced motion is requested.
 */
import { crispCanvas, rng, stepLoop, reducedMotion } from './util';

export function mountAmbient(canvas: HTMLCanvasElement, { fps = 5, density = 1 } = {}) {
  if (reducedMotion()) return () => {};
  const { ctx, size, dispose } = crispCanvas(canvas, 1);
  const r = rng(77);
  type Blk = { x: number; y: number; w: number; h: number; c: string; life: number };
  let blocks: Blk[] = [];
  const COLS = ['#07083a', '#0a0c4a', '#06072e', '#0d1060'];
  const spawn = (): Blk => {
    const streak = r() < 0.35;
    return {
      x: Math.floor((r() * size.w) / 8) * 8,
      y: Math.floor((r() * size.h) / 4) * 4,
      w: streak ? 40 + Math.floor(r() * 220) : 8 + Math.floor(r() * 6) * 8,
      h: streak ? 2 + Math.floor(r() * 2) * 2 : 8 + Math.floor(r() * 5) * 8,
      c: COLS[Math.floor(r() * COLS.length)],
      life: 2 + Math.floor(r() * 14),
    };
  };
  const stop = stepLoop(fps, () => {
    const target = Math.round(((size.w * size.h) / 22000) * density);
    blocks = blocks.filter((b) => --b.life > 0);
    while (blocks.length < target) blocks.push(spawn());
    ctx.clearRect(0, 0, size.w, size.h);
    for (const b of blocks) {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // dotted texture inside larger blocks
      if (b.h >= 16 && b.w >= 16) {
        ctx.fillStyle = '#000';
        for (let y = b.y + 2; y < b.y + b.h - 1; y += 4) for (let x = b.x + 2; x < b.x + b.w - 1; x += 4) ctx.fillRect(x, y, 1, 1);
      }
    }
  });
  return () => {
    stop();
    dispose();
  };
}
