import type { C2 } from '../engine';
import { F, checker, clipped, kDots, line, microRows, ring, stripes, text } from '../draw';

const glyphs = {
  '3': { width: 72, path: new Path2D('M4 15 19 0H56L70 14V37L59 49 72 61V84L56 100H18L3 85V72H21V79L27 84H47L53 78V64L47 58H27V42H47L52 36V22L46 16H28L22 22V28H4Z') },
  '2': { width: 72, path: new Path2D('M3 15 18 0H56L70 14V36L59 49 22 77V83H72V100H3V73L14 59 51 31V22L45 16H27L21 22V29H3Z') },
  '1': { width: 64, path: new Path2D('M3 19 22 0H43V83H64V100H3V83H24V22L14 30H3Z') },
  INIT: { width: 266, path: new Path2D('M0 0H48V16H33V84H48V100H0V84H15V16H0Z M62 0H80L111 58V0H130V100H112L81 42V100H62Z M145 0H193V16H178V84H193V100H145V84H160V16H145Z M204 0H266V16H244V100H226V16H204Z') },
} as const;

export type OpticGlyph = keyof typeof glyphs;

/** Chamfered, open letterforms with a short displaced echo on the cue. */
export function opticGlyph(ctx: C2, glyph: OpticGlyph, x: number, y: number, height: number, elapsed: number) {
  const { path, width } = glyphs[glyph];
  const scale = height / 100;
  const draw = (dx: number, dy: number, color: string, lw: number) => {
    ctx.save();
    ctx.translate(x - width * scale / 2 + dx, y - height / 2 + dy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'miter';
    ctx.stroke(path);
    ctx.restore();
  };
  draw(0, 0, '#070d3e', 9);
  draw(0, 0, '#f0f5ff', 4);
  if (elapsed < 0.14) {
    const dx = height * (Math.floor(elapsed * 30) % 2 ? 0.10 : -0.085);
    clipped(ctx, x - width * scale, y - height * 0.25, width * scale * 2, height * 0.24, () => draw(dx, -1, '#a6b7ff', 3));
  }
}

/** Registration lines and edge marks for the optic transfer overlay. */
export function transferMarks(ctx: C2, alpha = 1) {
  const rail = '#131c79';
  const ink = '#2839bd';
  const marker = '#9e9c35';
  ctx.save();
  ctx.globalAlpha *= alpha;
  line(ctx, 0, 307, 1920, 426, rail, 1);
  line(ctx, 0, 419, 1920, 308, rail, 1);
  line(ctx, 0, 594, 1920, 594, rail, 1.5);
  line(ctx, 0, 604, 1920, 605, rail);
  line(ctx, 0, 814, 1920, 881, rail);
  line(ctx, 0, 903, 1920, 813, rail);
  stripes(ctx, 284, 181, 122, 38, { period: 23, color: ink });
  microRows(ctx, 284, 245, ['PSYCHE 0447', 'EXC  FF / 07'], { size: 18, family: F.mono, color: ink, lh: 23 });
  kDots(ctx, 1484, 328, 3, 4, 26, 5, ink);
  text(ctx, 'OPTIC BUS', 1456, 320, { size: 22, family: F.mono, rot: 90, color: ink });
  checker(ctx, 1244, 861, 3, 2, 12, ink, true);
  microRows(ctx, 1292, 872, ['023', '820', '320'], { size: 12, family: F.mono, color: ink, lh: 14 });
  ring(ctx, 1304, 925, 13, ink, 2);
  ring(ctx, 1304, 925, 8, ink);
  ctx.strokeStyle = marker;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const [x, y] of [[606, 326], [580, 354], [643, 405], [1301, 326], [1336, 357], [646, 754], [702, 813], [1214, 893]]) {
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x, y + 7);
    ctx.lineTo(x - 7, y);
    ctx.closePath();
  }
  ctx.moveTo(960, 886);
  ctx.lineTo(975, 911);
  ctx.lineTo(945, 911);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
