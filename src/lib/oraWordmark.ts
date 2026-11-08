import { clamp } from './util';

export const ORA_INK = '#77f600';
export const ORA_BUILD_DURATION = 2.435;

const TAU = Math.PI * 2;

function phase(t: number, start: number, end: number) {
  const p = clamp((t - start) / (end - start));
  return p * p * (3 - 2 * p);
}

/** Elapsed seconds from the start of the ORA introduction. */
export function oraBuildAt(t: number) {
  return [phase(t, 0.13, 1.63), phase(t, 1.0, ORA_BUILD_DURATION)] as const;
}

/** The footprint grows with the strokes so the ring can keep the mark centered. */
export function oraWordmarkLayout(radius: number, rProgress: number, aProgress: number) {
  const stroke = radius * 0.49;
  const stemWidth = phase(rProgress, 0, 0.24);
  const shoulder = phase(rProgress, 0.54, 1) * Math.PI * 0.5;
  const rStart = 2 * radius + stroke * 0.45 * stemWidth;
  const rEnd = rStart + stroke * stemWidth + radius * 0.65 * (1 - Math.cos(shoulder));
  const bowlRadius = radius * phase(aProgress, 0, 0.58);
  const aCenter = rEnd + 1.21 * bowlRadius;
  return { stroke, stemWidth, shoulder, rStart, aCenter, bowlRadius, width: aCenter + bowlRadius };
}

function strokeArc(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, start: number, end: number) {
  ctx.beginPath();
  ctx.arc(x, y, radius, start, end);
  ctx.stroke();
}

export function paintOraRing(
  ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  { inner = radius * 0.51, opacity = 1 } = {},
) {
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.fillStyle = ORA_INK;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.arc(x, y, inner, TAU, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0a2a00';
  ctx.lineWidth = 2;
  strokeArc(ctx, x, y, radius * 0.3825, 0, TAU);
  ctx.restore();
}

export function paintOraLetters(
  ctx: CanvasRenderingContext2D, x: number, y: number, radius: number,
  rProgress: number, aProgress: number, layout: ReturnType<typeof oraWordmarkLayout>, opacity = 1,
) {
  const { stroke, stemWidth, shoulder, rStart, aCenter, bowlRadius } = layout;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.fillStyle = ORA_INK;
  ctx.strokeStyle = ORA_INK;
  ctx.lineCap = 'round';
  if (rProgress > 0) {
    const sx = x + rStart;
    const height = radius * 1.105 * phase(rProgress, 0, 0.54);
    ctx.fillRect(sx, y + radius - height, stroke * stemWidth, height);
    if (shoulder > 0) {
      ctx.lineWidth = stroke;
      strokeArc(ctx, sx + stroke * 0.5 + radius * 0.65, y - radius * 0.105, radius * 0.65, Math.PI, Math.PI + shoulder);
    }
  }
  if (aProgress > 0) {
    const bowl = phase(aProgress, 0, 0.72);
    const stem = phase(aProgress, 0.58, 1);
    ctx.lineWidth = bowlRadius * 0.49;
    strokeArc(ctx, x + aCenter, y, bowlRadius * 0.755, -Math.PI / 2, -Math.PI / 2 + TAU * bowl);
    ctx.fillRect(x + aCenter + bowlRadius * 0.51, y - bowlRadius * 0.2, bowlRadius * 0.49, bowlRadius * 1.2 * stem);
  }
  ctx.restore();
}
