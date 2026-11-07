/**
 * DEFRAG RING — a disc that actually defragments.
 *
 * Each band is a run of equal-length cells (≈ the same arc length at every
 * radius, so bands stay in register). A read head sweeps clockwise; behind it
 * the band is SORTED (system → hot → data, packed, no gaps), ahead of it the
 * band is still FRAGMENTED, and every step one fragment is lifted from the far
 * side and written at the head (a hairline shows the move). When the sweep
 * completes the disc holds, then scatters into a new layout.
 *
 * Drawn in flat colour only: solid cell fills with 1–2 px cuts, stepped radial
 * offsets on some cells, rectangular notches, a hairline radial hatch that
 * marks the unsorted span, and a fine outer scale. Nothing glides.
 */
import { crispCanvas, rng, stepLoop } from './util';

export type DefragColors = {
  /** hot fragments + the sorted rail */
  on: string;
  /** ordinary data fragments */
  data: string;
  /** empty slots */
  dim: string;
  /** system blocks, head, scale */
  hi: string;
  /** hairlines */
  line: string;
};

export type DefragOpts = {
  rings?: number;
  /** inner radius of the bands as a fraction of the outer radius */
  inner?: number;
  fps?: number;
  seed?: number;
  /** target cell length in px (sets the segment count per band) */
  cell?: number;
  /** drive progress from outside (0..1); otherwise the ring loops on its own */
  progress?: () => number;
  /** called with the current progress each step */
  onProgress?: (p: number) => void;
  /** draw the outer scale + labels */
  scale?: boolean;
} & Partial<DefragColors>;

const DEF: DefragColors = { on: '#7dff1a', data: '#2424ff', dim: '#0c0e44', hi: '#ececec', line: '#3a3f6b' };
const TAU = Math.PI * 2;

type Band = { n: number; frag: number[]; sorted: number[]; step: Float32Array; lag: number };

/** 0 empty · 1 data · 2 hot · 3 system */
function scatter(n: number, r: () => number) {
  const a: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = r();
    a.push(k < 0.24 ? 0 : k < 0.74 ? 1 : k < 0.93 ? 2 : 3);
  }
  // fragments come in short runs, like files split across a disk
  for (let i = 1; i < n; i++) if (r() < 0.35) a[i] = a[i - 1];
  return a;
}
const ORDER = [3, 2, 1, 0];
const sortCells = (a: number[]) => ORDER.flatMap((t) => a.filter((v) => v === t));

/** state of a band at sort progress m (cells written so far) */
function bandAt(b: Band, m: number) {
  const out = new Array<number>(b.n).fill(0);
  const used = [0, 0, 0, 0];
  for (let i = 0; i < m; i++) {
    out[i] = b.sorted[i];
    used[b.sorted[i]]++;
  }
  // the tail keeps its fragments minus the ones already moved (taken from the far end);
  // cells of a type that already sat inside [0, m) count as moved too
  const before = [0, 0, 0, 0];
  for (let i = 0; i < m; i++) before[b.frag[i]]++;
  const take = used.map((u, t) => (t ? u - before[t] : 0));
  for (let i = b.n - 1; i >= m; i--) {
    const t = b.frag[i];
    if (take[t] > 0) {
      take[t]--;
      continue;
    }
    out[i] = t;
  }
  return out;
}

export function createDefrag(o: DefragOpts = {}) {
  const rings = o.rings ?? 4;
  const inner = o.inner ?? 0.36;
  const cellPx = o.cell ?? 9;
  const col: DefragColors = { ...DEF, ...Object.fromEntries(Object.entries(o).filter(([k, v]) => k in DEF && v)) } as DefragColors;
  let r = rng(o.seed ?? 4);
  let bands: Band[] = [];
  let builtFor = 0;
  let cycle = 0;

  const geom = (R: number) => {
    const r0 = R * inner;
    const r1 = R * (o.scale === false ? 0.98 : 0.86);
    const gap = Math.max(2, R * 0.022);
    const bw = (r1 - r0 - gap * (rings - 1)) / rings;
    return { r0, r1, gap, bw };
  };

  const build = (R: number) => {
    const { r0, gap, bw } = geom(R);
    bands = Array.from({ length: rings }, (_, i) => {
      const rm = r0 + i * (bw + gap) + bw / 2;
      const n = Math.max(12, Math.round((TAU * rm) / cellPx / 2) * 2);
      const frag = scatter(n, r);
      const step = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const h = r();
        // stepped radial offsets: 0 full · 1 short outer · 2 short inner
        step[k] = h < 0.14 ? 1 : h < 0.22 ? 2 : 0;
      }
      return { n, frag, sorted: sortCells(frag), step, lag: i * 0.07 };
    });
    builtFor = R;
  };

  /** draw one frame; f = frame counter at `fps` */
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, f: number, fps: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 2;
    if (R < 8) return 0;
    if (Math.abs(R - builtFor) > 1 || !bands.length) build(R);
    const { r0, gap, bw } = geom(R);

    // progress: sweep (≈ 1 cell per step on the outer band), hold, rescatter
    const sweepF = Math.max(48, bands[bands.length - 1].n);
    const holdF = Math.round(fps * 1.4);
    const total = sweepF + holdF;
    const lf = f % total;
    const c = Math.floor(f / total);
    if (c !== cycle && !o.progress) {
      cycle = c;
      r = rng((o.seed ?? 4) + c * 97);
      build(R);
    }
    const P = o.progress ? Math.min(1, Math.max(0, o.progress())) : Math.min(1, lf / sweepF);
    const holding = !o.progress && lf >= sweepF;
    const flash = holding && Math.floor((lf - sweepF) / 2) % 2 === 0 && lf - sweepF < 6;

    ctx.clearRect(0, 0, w, h);
    const A0 = -Math.PI / 2; // 12 o'clock

    // --- bands
    let moveFrom = -1;
    let moveBand = -1;
    bands.forEach((b, bi) => {
      const p = Math.min(1, Math.max(0, (P - b.lag) / (1 - b.lag)));
      const m = Math.floor(p * b.n);
      const cells = bandAt(b, m);
      const ra = r0 + bi * (bw + gap);
      const rb = ra + bw;
      const da = TAU / b.n;
      const cut = Math.max(1.2, R * 0.012) / ((ra + rb) / 2); // constant px cut between cells
      // source of the fragment being moved this step (outer band only)
      if (bi === bands.length - 1 && m < b.n && p > 0) {
        const t = b.sorted[m];
        for (let i = b.n - 1; i > m; i--) if (cells[i] === t && t) { moveFrom = i; moveBand = bi; break; }
      }
      for (let i = 0; i < b.n; i++) {
        const t = cells[i];
        const a0 = A0 + i * da + cut / 2;
        const a1 = A0 + (i + 1) * da - cut / 2;
        let ri = ra;
        let ro = rb;
        if (b.step[i] === 1) ro = rb - bw * 0.32;
        else if (b.step[i] === 2) ri = ra + bw * 0.32;
        let fill: string;
        if (flash) fill = t ? col.hi : col.dim;
        else if (t === 0) fill = col.dim;
        else if (t === 3) fill = col.hi;
        else if (t === 2) fill = col.on;
        else fill = col.data;
        if (i === m && !holding && p < 1) fill = col.hi; // write head cell
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(cx, cy, ro, a0, a1);
        ctx.arc(cx, cy, ri, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
      // sorted rail: a 2px arc just inside the band over the sorted span
      if (m > 0) {
        ctx.strokeStyle = col.on;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ra - gap * 0.5, A0, A0 + m * da);
        ctx.stroke();
      }
    });

    // --- notches: rectangular cuts across the outer bands at fixed angles
    const outerR = r0 + rings * (bw + gap) - gap;
    for (const a of [0.125, 0.455, 0.79]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(A0 + a * TAU);
      ctx.fillStyle = '#000';
      ctx.fillRect(outerR - bw * 1.6, -Math.max(2, R * 0.018), bw * 1.7, Math.max(4, R * 0.036));
      ctx.fillStyle = col.hi;
      ctx.fillRect(outerR - bw * 1.2, -1, bw * 0.9, 2);
      ctx.restore();
    }

    // --- hatch: hairline radial ticks over the unsorted span, inside the bands
    const hr0 = r0 - gap * 2.6;
    const hr1 = r0 - gap * 1.3;
    const head = A0 + P * TAU;
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const hn = Math.round((TAU * hr1) / 4);
    for (let i = 0; i < hn; i++) {
      const a = A0 + (i / hn) * TAU;
      if (a < head) continue;
      ctx.moveTo(cx + Math.cos(a) * hr0, cy + Math.sin(a) * hr0);
      ctx.lineTo(cx + Math.cos(a) * hr1, cy + Math.sin(a) * hr1);
    }
    ctx.stroke();
    // inner hairline + quadrant ticks
    const ir = hr0 - gap * 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, ir, 0, TAU);
    for (let q = 0; q < 4; q++) {
      const a = (q / 4) * TAU;
      ctx.moveTo(cx + Math.cos(a) * (ir - gap * 1.6), cy + Math.sin(a) * (ir - gap * 1.6));
      ctx.lineTo(cx + Math.cos(a) * ir, cy + Math.sin(a) * ir);
    }
    ctx.stroke();

    // --- move connector: a hairline chord from the lifted fragment to the head
    if (moveFrom >= 0 && !holding) {
      const b = bands[moveBand];
      const da = TAU / b.n;
      const rr = r0 + moveBand * (bw + gap) - gap * 0.5;
      const a1 = A0 + (moveFrom + 0.5) * da;
      ctx.strokeStyle = col.hi;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * (rr + bw + gap), cy + Math.sin(a1) * (rr + bw + gap));
      ctx.lineTo(cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr);
      ctx.lineTo(cx + Math.cos(head) * rr, cy + Math.sin(head) * rr);
      ctx.stroke();
      // source cell outline
      ctx.beginPath();
      ctx.arc(cx, cy, rr + bw + gap * 0.5, a1 - da * 0.5, a1 + da * 0.5);
      ctx.arc(cx, cy, rr + gap * 0.5, a1 + da * 0.5, a1 - da * 0.5, true);
      ctx.closePath();
      ctx.stroke();
    }

    // --- outer scale + head
    if (o.scale !== false) {
      const sr = R * 0.905;
      ctx.strokeStyle = col.line;
      ctx.beginPath();
      for (let q = 0; q < 4; q++) ctx.arc(cx, cy, sr, A0 + q * (TAU / 4) + 0.06, A0 + (q + 1) * (TAU / 4) - 0.06);
      ctx.stroke();
      ctx.beginPath();
      for (let d = 0; d < 360; d += 3) {
        const a = A0 + (d / 360) * TAU;
        const len = d % 30 === 0 ? R * 0.05 : R * 0.022;
        if (d % 90 === 0) continue;
        ctx.moveTo(cx + Math.cos(a) * sr, cy + Math.sin(a) * sr);
        ctx.lineTo(cx + Math.cos(a) * (sr + len), cy + Math.sin(a) * (sr + len));
      }
      ctx.stroke();
      // cardinal tabs
      ctx.fillStyle = col.hi;
      for (let q = 0; q < 4; q++) {
        const a = A0 + (q / 4) * TAU;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * (sr + R * 0.035), cy + Math.sin(a) * (sr + R * 0.035));
        ctx.rotate(a);
        ctx.fillRect(-R * 0.035, -1, R * 0.07, 2);
        ctx.restore();
      }
      // head: radial hairline through the bands + a solid triangle outside the scale
      ctx.strokeStyle = col.hi;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(head) * (r0 - gap * 2.8), cy + Math.sin(head) * (r0 - gap * 2.8));
      ctx.lineTo(cx + Math.cos(head) * sr, cy + Math.sin(head) * sr);
      ctx.stroke();
      const tr = R * 0.97;
      const ts = Math.max(3, R * 0.04);
      ctx.fillStyle = holding ? col.on : col.hi;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(head) * (tr - ts), cy + Math.sin(head) * (tr - ts));
      ctx.lineTo(cx + Math.cos(head + ts / tr) * tr, cy + Math.sin(head + ts / tr) * tr);
      ctx.lineTo(cx + Math.cos(head - ts / tr) * tr, cy + Math.sin(head - ts / tr) * tr);
      ctx.closePath();
      ctx.fill();
    }
    return P;
  };
  return { draw, colors: col };
}

/** Canvas widget: fills its CSS box. */
export function mountDefragRing(canvas: HTMLCanvasElement, o: DefragOpts = {}) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const fps = o.fps ?? 12;
  const ring = createDefrag(o);
  const stop = stepLoop(
    fps,
    (f) => {
      const p = ring.draw(ctx, size.w, size.h, f, fps);
      o.onProgress?.(p);
    },
    canvas,
  );
  return () => {
    stop();
    dispose();
  };
}
