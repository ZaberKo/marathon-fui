/**
 * Defragmentation rings — the reference's signature graphic.
 *
 * What the old kit got wrong: its defrag ring was a thin, small canvas widget
 * of evenly spaced dashes. The reference ring is *architectural*: frame-filling
 * (often cropped), 2–3 thick bands of flat colour, segments with stepped radial
 * offsets, rectangular notches, dark hatch zones of hairline radial ticks, and
 * blocks that re-sort themselves in steps (defragmenting).
 */
import type { C2 } from './engine';
import { hash } from './engine';
import { arc } from './draw';

export type RingBand = { r0: number; r1: number; fill?: number; gapEvery?: number };

export type DefragOpts = {
  cx: number;
  cy: number;
  /** px per unit radius (unit radius = inner band start ≈ 1) */
  scale: number;
  rot: number;
  seed: number;
  /** 0..1 defragmentation progress: blocks migrate and consolidate */
  k: number;
  colors: [string, string];
  /** probability of the second colour */
  mix?: number;
  bands?: RingBand[];
  hatch?: string;
  notch?: string;
};

const DEFAULT_BANDS: RingBand[] = [
  { r0: 1.0, r1: 1.36 },
  { r0: 1.36, r1: 1.72 },
  { r0: 1.78, r1: 2.12, fill: 0.55 },
];

type Seg = { a0: number; a1: number; c: number; dr0: number; dr1: number; notch: number; hatch: boolean; sub: number };

const segCache = new Map<string, Seg[][]>();
function segments(seed: number, bands: RingBand[], mix: number) {
  const key = `${seed}:${bands.length}:${mix}`;
  const hit = segCache.get(key);
  if (hit) return hit;
  const out: Seg[][] = [];
  bands.forEach((b, bi) => {
    const segs: Seg[] = [];
    let a = hash(seed, bi) * Math.PI * 2;
    const end = a + Math.PI * 2;
    let i = 0;
    while (a < end - 0.02) {
      const r = (k: number) => hash(seed, bi, i, k);
      const len = Math.min(end - a, 0.06 + r(1) * r(1) * 0.9);
      const empty = r(2) > (b.fill ?? 0.9);
      if (!empty)
        segs.push({
          a0: a,
          a1: a + len,
          c: r(3) < mix ? 1 : 0,
          dr0: r(4) < 0.3 ? Math.floor(r(5) * 3) * 0.035 : 0,
          dr1: r(6) < 0.4 ? -Math.floor(r(7) * 3) * 0.04 : r(6) > 0.85 ? 0.08 : 0,
          notch: r(8) < 0.35 ? 1 + Math.floor(r(9) * 3) : 0,
          hatch: r(10) < 0.18,
          sub: r(11) < 0.3 ? 0.3 + r(12) * 0.4 : 0,
        });
      a += len + (r(13) < 0.5 ? 0.004 : 0.012 + r(14) * 0.03);
      i++;
    }
    out.push(segs);
  });
  segCache.set(key, out);
  return out;
}

export function defragRing(ctx: C2, o: DefragOpts) {
  const bands = o.bands ?? DEFAULT_BANDS;
  const all = segments(o.seed, bands, o.mix ?? 0.3);
  const S = o.scale;
  const step = Math.floor(o.k * 12);
  ctx.save();
  ctx.translate(o.cx, o.cy);
  ctx.rotate(o.rot);
  all.forEach((segs, bi) => {
    const b = bands[bi];
    segs.forEach((s, si) => {
      // defragmentation: colour flips and slips sideways in steps
      const flip = hash(o.seed, bi, si, step) < 0.12 * (1 - o.k);
      const slip = (hash(o.seed, bi, si, step, 3) - 0.5) * 0.08 * (1 - o.k);
      const col = o.colors[(s.c ^ (flip ? 1 : 0)) as 0 | 1];
      const a0 = s.a0 + slip;
      const a1 = s.a1 + slip;
      const r0 = (b.r0 + s.dr0) * S;
      const r1 = (b.r1 + s.dr1) * S;
      arc(ctx, 0, 0, r0, r1, a0, a1, col);
      if (s.sub) {
        // stepped extension: a narrower arc sticking out past the band
        const am = a0 + (a1 - a0) * s.sub;
        arc(ctx, 0, 0, r1, r1 + 0.06 * S, a0, am, col);
      }
      if (s.hatch && o.hatch) {
        ctx.strokeStyle = o.hatch;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const n = Math.floor((a1 - a0) * S * 0.6);
        for (let k = 0; k < n; k++) {
          const a = a0 + ((a1 - a0) * k) / n;
          const rr = r1 - (0.06 + hash(bi, si, k) * 0.12) * S;
          ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        }
        ctx.stroke();
      }
      if (s.notch && o.notch) {
        ctx.fillStyle = o.notch;
        for (let k = 0; k < s.notch; k++) {
          const a = a0 + (a1 - a0) * hash(o.seed, bi, si, k, 5);
          const rr = r0 + (r1 - r0) * (0.2 + 0.6 * hash(o.seed, bi, si, k, 6));
          ctx.save();
          ctx.rotate(a);
          ctx.fillRect(rr, -0.012 * S, 0.05 * S + hash(bi, si, k) * 0.06 * S, 0.02 * S);
          ctx.restore();
        }
      }
    });
  });
  ctx.restore();
}

/**
 * Radial-streak ring (the end-of-sequence "DEFRAG" ring): hundreds of thin
 * radial bars of varying length in white/grey/lime, collapsing to a solid ring.
 */
export function streakRing(ctx: C2, cx: number, cy: number, r0: number, r1: number, seed: number, k: number, o: { colors?: string[]; n?: number; rot?: number } = {}) {
  const colors = o.colors ?? ['#e8e8e8', '#9a9a9a', '#5d5d5d', '#77f600', '#c8c8c8'];
  const n = o.n ?? 360;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.rot ?? 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const h = hash(seed, i);
    if (h < 0.25 * (1 - k)) continue;
    const w = ((Math.PI * 2) / n) * (1 + Math.floor(hash(seed, i, 1) * 3));
    const rr0 = r0 + (r1 - r0) * hash(seed, i, 2) * 0.5 * (1 - k);
    const rr1 = r1 - (r1 - r0) * hash(seed, i, 3) * 0.6 * (1 - k);
    const c = k > 0.95 ? colors[3] : colors[Math.floor(hash(seed, i, 4) * colors.length)];
    arc(ctx, 0, 0, rr0, rr1, a, a + w, c);
  }
  ctx.restore();
}

/** Thin segmented progress ring (the BUFFER %). */
export function progressRing(ctx: C2, cx: number, cy: number, r: number, k: number, color: string, lw = 6, start = -Math.PI / 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, start + Math.PI * 2 * k);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* Sorting defragmentation (blocks are lifted, travel, drop in place)  */
/* ------------------------------------------------------------------ */
type SortSeg = { len: number; c: 0 | 1; a0: number; a1: number; s: number; dr0: number; dr1: number; notch: number; hatch: boolean };
const sortCache = new Map<string, SortSeg[][]>();

function sortSegments(seed: number, bands: RingBand[]) {
  const key = `${seed}:${bands.length}`;
  const hit = sortCache.get(key);
  if (hit) return hit;
  const out = bands.map((b, bi) => {
    const r = (i: number, k: number) => hash(seed, bi, i, k);
    const segs: SortSeg[] = [];
    let total = 0;
    let i = 0;
    const fill = (b.fill ?? 0.82) * Math.PI * 2;
    while (total < fill) {
      const len = Math.min(fill - total, 0.05 + r(i, 1) * r(i, 1) * 0.55);
      segs.push({ len, c: r(i, 2) < 0.38 ? 1 : 0, a0: 0, a1: 0, s: 0, dr0: r(i, 4) < 0.3 ? Math.floor(r(i, 5) * 3) * 0.035 : 0, dr1: r(i, 6) < 0.4 ? -Math.floor(r(i, 7) * 3) * 0.04 : 0, notch: r(i, 8) < 0.35 ? 1 + Math.floor(r(i, 9) * 3) : 0, hatch: r(i, 10) < 0.2 });
      total += len;
      i++;
    }
    // fragmented start: shuffled order with random gaps
    const order = segs.map((_, k) => k).sort((a, b) => r(a, 20) - r(b, 20));
    const slack = Math.PI * 2 - total;
    let a = r(0, 30) * Math.PI * 2;
    for (const k of order) {
      segs[k].a0 = a;
      a += segs[k].len + (slack / segs.length) * (0.2 + r(k, 31) * 1.6);
    }
    // sorted end: colour 1 run, then colour 0 run, tight
    let e = -Math.PI / 2;
    for (const c of [1, 0] as const)
      for (const sg of segs.filter((x) => x.c === c)) {
        sg.a1 = e;
        e += sg.len + 0.004;
      }
    // move schedule
    const moves = segs.map((_, k) => k).sort((p, q) => r(p, 40) - r(q, 40));
    moves.forEach((k, n) => (segs[k].s = (n / segs.length) * 0.78));
    return segs;
  });
  sortCache.set(key, out);
  return out;
}

export function defragSort(ctx: C2, o: { cx: number; cy: number; scale: number; rot: number; seed: number; k: number; colors: [string, string]; bands?: RingBand[]; hatch?: string; notch?: string; lift?: string }) {
  const bands = o.bands ?? DEFAULT_BANDS;
  const all = sortSegments(o.seed, bands);
  const S = o.scale;
  ctx.save();
  ctx.translate(o.cx, o.cy);
  ctx.rotate(o.rot);
  all.forEach((segs, bi) => {
    const b = bands[bi];
    for (const sg of segs) {
      const local = Math.min(1, Math.max(0, (o.k - sg.s) / 0.2));
      const e = local < 0.5 ? 4 * local ** 3 : 1 - Math.pow(-2 * local + 2, 3) / 2;
      // shortest way round
      let d = sg.a1 - sg.a0;
      d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      const a0 = sg.a0 + d * e;
      const lift = Math.sin(local * Math.PI) * 0.16;
      const moving = local > 0 && local < 1;
      const col = moving && o.lift ? o.lift : o.colors[sg.c];
      const r0 = (b.r0 + sg.dr0 + lift) * S;
      const r1 = (b.r1 + sg.dr1 + lift) * S;
      arc(ctx, 0, 0, r0, r1, a0, a0 + sg.len, col);
      if (sg.hatch && o.hatch && !moving) {
        ctx.strokeStyle = o.hatch;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const n = Math.floor(sg.len * S * 0.5);
        for (let q = 0; q < n; q++) {
          const a = a0 + (sg.len * q) / n;
          const rr = r1 - (0.06 + hash(bi, q, sg.s) * 0.12) * S;
          ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        }
        ctx.stroke();
      }
      if (sg.notch && o.notch) {
        ctx.fillStyle = o.notch;
        for (let q = 0; q < sg.notch; q++) {
          const a = a0 + sg.len * hash(o.seed, bi, q, sg.len);
          const rr = r0 + (r1 - r0) * (0.25 + 0.5 * hash(o.seed, bi, q, 6, sg.len));
          ctx.save();
          ctx.rotate(a);
          ctx.fillRect(rr, -0.01 * S, 0.06 * S, 0.02 * S);
          ctx.restore();
        }
      }
    }
  });
  ctx.restore();
}
