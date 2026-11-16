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

const ease = (t: number, a: number, b: number) => {
  const p = clamp((t - a) / (b - a));
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
};

/**
 * Kit build of the wordmark on a fixed frame: the letters are laid out at
 * their final size and never re-centre. The ring travels once to its seat;
 * the R stem rises as a capsule whose round top becomes the start of the
 * shoulder, and the A bowl's stroke grows from zero before it sweeps, so no
 * shape appears in one jump. Ends on the same frame as the film's build.
 * `w`, `h` are the drawing size in CSS px.
 */
export function paintOraKit(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const s = Math.min(w / 640, h / 264);
  const R = 87 * s;
  const L = oraWordmarkLayout(R, 1, 1);
  const x = (w - L.width) / 2;
  const y = h / 2;
  const seat = ease(t, 0.05, 0.75);
  // The R is one stroke: the stem rises, then the same pen turns into the
  // shoulder. A single ease over the whole path keeps the speed continuous
  // through the corner instead of stopping between two separate moves.
  const stemRun = R * 1.105 + L.stroke / 2;
  const arcRun = R * 0.65 * (Math.PI / 2);
  const pen = ease(t, 0.28, 1.4) * (stemRun + arcRun);
  const rise = Math.min(1, pen / stemRun);
  const shoulder = Math.max(0, pen - stemRun) / (R * 0.65);
  const bowlIn = ease(t, 1.1, 1.36);
  const bowl = ease(t, 1.16, 2.0);
  const aStem = ease(t, 1.78, ORA_BUILD_DURATION);

  // ring: from the canvas centre at its RD-06 size to its seat in the mark
  const r = R * (1.2 - 0.2 * seat);
  paintOraRing(ctx, w / 2 + (x + R - w / 2) * seat, y, r);

  ctx.save();
  ctx.fillStyle = ORA_INK;
  ctx.strokeStyle = ORA_INK;
  const stroke = L.stroke;
  const sx = x + L.rStart;
  const top = y - R * 0.105;
  if (rise > 0) {
    // capsule stem rises out of the baseline: full shape, clipped at the foot
    const capY = y + R + stroke / 2 - (y + R + stroke / 2 - top) * rise;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx - 1, 0, stroke + 2, y + R);
    ctx.clip();
    ctx.fillRect(sx, capY, stroke, y + R - capY + 1);
    ctx.beginPath();
    ctx.arc(sx + stroke / 2, capY, stroke / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (shoulder > 0) {
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    strokeArc(ctx, sx + stroke * 0.5 + R * 0.65, top, R * 0.65, Math.PI, Math.PI + shoulder);
  }
  if (bowlIn > 0) {
    const cx = x + L.aCenter;
    ctx.lineWidth = R * 0.49 * bowlIn;
    ctx.lineCap = 'round';
    strokeArc(ctx, cx, y, R * 0.755, -Math.PI / 2, -Math.PI / 2 + Math.max(0.0001, Math.PI * 2 * bowl));
    if (aStem > 0) ctx.fillRect(cx + R * 0.51, y - R * 0.2, R * 0.49, R * 1.2 * aStem);
  }
  ctx.restore();
}
