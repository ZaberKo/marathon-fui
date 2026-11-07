/**
 * 2D anatomical plate — smooth line work in the manner of a medical plate.
 *
 *  - Silhouette: a smooth-union capsule field, contoured (marching squares)
 *    into a double outline; the interior is a dark tint with a faint
 *    horizontal hatch.
 *  - Nerves (the main subject): many parallel strands per limb in several
 *    colours, narrowing at the joints and fanning into fingers and toes;
 *    intercostals, the vagus, cranial branches, spinal roots and fine twigs
 *    toward the skin.
 *  - Organs: lungs, heart, liver, stomach, kidneys, intestines, bladder as
 *    spline shapes with line hatching.
 *  - Muscles: spline shapes filled with fibre lines along their pull.
 *  - Head: the brain with gyri, the eyes, and the optic pathway in its own
 *    colour (eye → chiasm → tract → radiation).
 * All curves are splines (no ellipse primitives). The static plate is
 * rasterised once per palette and scale; pulses, flashes and the scan band
 * are drawn live on top.
 */
import type { C2 } from './engine';
import { hash } from './engine';
import { POSES, posedJoints } from './models/body';

type P2 = [number, number];
export type Muscle = { name: string; poly: P2[]; group: string; angle: number };
type Strand = { pts: P2[]; ci: number; cum: number[]; pulse: boolean };
type Organ = { name: string; poly: P2[]; angle: number };

export type AnatomyPalette = {
  name: string;
  outline: string;
  inner: string;
  fill: string;
  hatch: string;
  nerves: string[];
  twig: string[];
  spine: string;
  cranial: string;
  vagus: string;
  organ: string;
  organLine: string;
  organEdge: string;
  muscle: string;
  muscleFill: string;
  muscleEdge: string;
  brain: string;
  brainLine: string;
  optic: string;
  eye: string;
  bone: string;
  pulse: string;
};

export const ANAT_BLUE: AnatomyPalette = {
  name: 'blue',
  outline: '#a8c0ff',
  inner: 'rgba(90,120,255,0.55)',
  fill: 'rgba(3,6,36,0.82)',
  hatch: 'rgba(70,100,255,0.13)',
  nerves: ['#38d8ff', '#2a5cff', '#9ae8ff', '#38d8ff', '#6a5cff', '#1a3cff'],
  twig: ['#3ae8a8', '#38d8ff', '#d8ff40', '#6a8aff'],
  spine: '#e8ecff',
  cranial: '#ffb020',
  vagus: '#d8ff40',
  organ: 'rgba(24,42,255,0.9)',
  organLine: 'rgba(120,150,255,0.55)',
  organEdge: '#9ab0ff',
  muscle: '#ff2a48',
  muscleFill: 'rgba(255,30,70,0.16)',
  muscleEdge: '#ff6a80',
  brain: 'rgba(190,30,170,0.78)',
  brainLine: '#ff6ae0',
  optic: '#ff7a1a',
  eye: '#ffffff',
  bone: 'rgba(160,180,255,0.32)',
  pulse: '#ffffff',
};
export const ANAT_LIME: AnatomyPalette = {
  name: 'lime',
  outline: '#d0ffa0',
  inner: 'rgba(150,255,90,0.55)',
  fill: 'rgba(40,150,14,0.62)',
  hatch: 'rgba(0,40,0,0.22)',
  nerves: ['#0c4a10', '#1a3cff', '#d8ff40', '#0c4a10', '#38f5d4', '#003a2a'],
  twig: ['#d8ff40', '#1a3cff', '#38f5d4'],
  spine: '#e8ffe0',
  cranial: '#ffb020',
  vagus: '#38f5d4',
  organ: 'rgba(255,40,90,0.82)',
  organLine: 'rgba(255,170,190,0.5)',
  organEdge: '#ffd0d8',
  muscle: '#ff2a48',
  muscleFill: 'rgba(255,40,70,0.22)',
  muscleEdge: '#ff7a8a',
  brain: 'rgba(255,60,190,0.8)',
  brainLine: '#ffc0f0',
  optic: '#ff7a1a',
  eye: '#ffffff',
  bone: 'rgba(10,60,10,0.45)',
  pulse: '#ffffff',
};

/* ------------------------------------------------------------------ */
/* geometry helpers                                                     */
/* ------------------------------------------------------------------ */
type Cap = { a: P2; b: P2; ra: number; rb: number };
const capD = (c: Cap, x: number, y: number) => {
  const bax = c.b[0] - c.a[0];
  const bay = c.b[1] - c.a[1];
  const pax = x - c.a[0];
  const pay = y - c.a[1];
  const l2 = bax * bax + bay * bay || 1e-9;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / l2));
  return Math.hypot(pax - bax * h, pay - bay * h) - (c.ra + (c.rb - c.ra) * h);
};
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const mul = (a: P2, k: number): P2 => [a[0] * k, a[1] * k];
const mix = (a: P2, b: P2, k = 0.5): P2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const norm = (a: P2): P2 => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const rot = (a: P2, r: number): P2 => [a[0] * Math.cos(r) - a[1] * Math.sin(r), a[0] * Math.sin(r) + a[1] * Math.cos(r)];

/** Catmull-Rom through the points (closed or open), `n` samples per span. */
function spline(pts: P2[], closed: boolean, n = 8): P2[] {
  const out: P2[] = [];
  const m = pts.length;
  const at = (i: number) => (closed ? pts[(i + m) % m] : pts[Math.max(0, Math.min(m - 1, i))]);
  const spans = closed ? m : m - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[m - 1]);
  return out;
}

/** resample a polyline at a fixed arc-length step; returns points + per-point arc length */
function resample(path: P2[], step: number) {
  const pts: P2[] = [path[0]];
  const s: number[] = [0];
  let acc = 0;
  let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = step - carry;
    while (d <= l) {
      pts.push(mix(a, b, d / l));
      s.push(acc + d);
      d += step;
    }
    carry = l - (d - step);
    acc += l;
  }
  const last = path[path.length - 1];
  if (Math.hypot(last[0] - pts[pts.length - 1][0], last[1] - pts[pts.length - 1][1]) > step * 0.3) {
    pts.push(last);
    s.push(acc);
  }
  return { pts, s, len: acc };
}

const cumLen = (pts: P2[]) => {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return c;
};

const inPoly = (p: P2, poly: P2[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

/** a spindle (muscle belly): pointed ends, full in the middle */
function spindle(a: P2, b: P2, w: number, bias = 0.5, n = 14): P2[] {
  const d = sub(b, a);
  const nn = norm([-d[1], d[0]]);
  const left: P2[] = [];
  const right: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // skewed sine profile: belly at `bias`
    const u = t < bias ? (t / bias) * 0.5 : 0.5 + ((t - bias) / (1 - bias)) * 0.5;
    const k = Math.pow(Math.sin(Math.PI * u), 0.75) * w;
    const c = add(a, mul(d, t));
    left.push(add(c, mul(nn, k)));
    right.push(add(c, mul(nn, -k)));
  }
  return [...left, ...right.reverse().slice(1, -1)];
}

/* ------------------------------------------------------------------ */
/* the figure                                                           */
/* ------------------------------------------------------------------ */
export type Figure = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** marching-squares outline segments at iso 0 and inset (metres, flat xy pairs) */
  outline: Float32Array;
  inset: Float32Array;
  /** interior cells as polygons (metres) for the fill mask */
  cells: Float32Array[];
  strands: Strand[];
  twigs: P2[][];
  organs: Organ[];
  intestine: P2[];
  muscles: Muscle[];
  bones: P2[][];
  vertebrae: P2[];
  roots: P2[][];
  cranial: P2[][];
  vagus: P2[][];
  brain: { shell: P2[]; gyri: P2[][]; fissure: P2[]; stem: P2[][] };
  optic: Strand[];
  eyes: P2[];
  J: (n: string) => P2;
  heart: P2;
};

function contour(F: Float32Array, nx: number, ny: number, x0: number, y0: number, h: number, L: number) {
  const out: number[] = [];
  const P = (i: number, j: number) => F[j * nx + i] - L;
  for (let j = 0; j < ny - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const v = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const hits: P2[] = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e];
        const b = v[(e + 1) % 4];
        if (a < 0 !== b < 0) {
          const t = a / (a - b);
          const ca = c[e];
          const cb = c[(e + 1) % 4];
          hits.push([x0 + (ca[0] + (cb[0] - ca[0]) * t) * h, y0 + (ca[1] + (cb[1] - ca[1]) * t) * h]);
        }
      }
      if (hits.length === 2) out.push(hits[0][0], hits[0][1], hits[1][0], hits[1][1]);
      else if (hits.length === 4) out.push(hits[0][0], hits[0][1], hits[1][0], hits[1][1], hits[2][0], hits[2][1], hits[3][0], hits[3][1]);
    }
  return new Float32Array(out);
}

function insideCells(F: Float32Array, nx: number, ny: number, x0: number, y0: number, h: number) {
  const polys: Float32Array[] = [];
  for (let j = 0; j < ny - 1; j++) {
    let run = -1;
    for (let i = 0; i <= nx - 1; i++) {
      const full = i < nx - 1 && F[j * nx + i] < 0 && F[j * nx + i + 1] < 0 && F[(j + 1) * nx + i] < 0 && F[(j + 1) * nx + i + 1] < 0;
      if (full && run < 0) run = i;
      if (!full && run >= 0) {
        const xa = x0 + run * h;
        const xb = x0 + i * h;
        const ya = y0 + j * h;
        const yb = ya + h;
        polys.push(new Float32Array([xa, ya, xb, ya, xb, yb, xa, yb]));
        run = -1;
      }
      if (i < nx - 1 && !full) {
        const v = [F[j * nx + i], F[j * nx + i + 1], F[(j + 1) * nx + i + 1], F[(j + 1) * nx + i]];
        if (v.every((q) => q >= 0)) continue;
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const out: number[] = [];
        for (let e = 0; e < 4; e++) {
          const a = v[e];
          const b = v[(e + 1) % 4];
          if (a < 0) out.push(x0 + c[e][0] * h, y0 + c[e][1] * h);
          if (a < 0 !== b < 0) {
            const t = a / (a - b);
            const ca = c[e];
            const cb = c[(e + 1) % 4];
            out.push(x0 + (ca[0] + (cb[0] - ca[0]) * t) * h, y0 + (ca[1] + (cb[1] - ca[1]) * t) * h);
          }
        }
        if (out.length >= 6) polys.push(new Float32Array(out));
      }
    }
  }
  return polys;
}

let figP: Promise<Figure> | null = null;
export function anatomyFigure() {
  if (!figP) figP = posedJoints(POSES.stand).then(buildFigure);
  return figP;
}

function buildFigure(joints: Map<string, { x: number; y: number }>): Figure {
  const J = (n: string): P2 => {
    const v = joints.get(n)!;
    return [v.x, v.y];
  };
  const cap = (a: P2, b: P2, ra: number, rb: number): Cap => ({ a, b, ra, rb });
  const caps: Cap[] = [
    cap([0, 1.703], [0, 1.65], 0.08, 0.071), // cranium
    cap([0, 1.628], [0, 1.592], 0.062, 0.04), // face / jaw
    cap([0, 1.565], [0, 1.465], 0.044, 0.053), // neck
    cap([-0.04, 1.47], [-0.15, 1.445], 0.034, 0.042), // trapezius slope
    cap([0.04, 1.47], [0.15, 1.445], 0.034, 0.042),
    cap([-0.075, 1.372], [0.075, 1.372], 0.11, 0.11), // chest
    cap([-0.06, 1.28], [0.06, 1.28], 0.104, 0.104), // lower ribs
    cap([-0.04, 1.19], [0.04, 1.19], 0.097, 0.097), // waist
    cap([-0.075, 1.035], [0.075, 1.035], 0.1, 0.1), // pelvis
  ];
  const strands: Strand[] = [];
  const twigs: P2[][] = [];
  const muscles: Muscle[] = [];
  const bones: P2[][] = [];
  const cranial: P2[][] = [];
  const vagus: P2[][] = [];
  const optic: Strand[] = [];
  const pickNerve = (seed: number, i: number) => {
    const r = hash(seed, i, 77);
    // first two colours dominate; the rest are accents
    return r < 0.36 ? 0 : r < 0.62 ? 1 : r < 0.8 ? 2 : r < 0.9 ? 3 : r < 0.96 ? 4 : 5;
  };
  /** many parallel strands along a centreline, with half-widths per vertex, optional fan at the end */
  const bundle = (center: P2[], hw: number[], n: number, seed: number, colors: (i: number) => number, fan?: P2[][], pulseFrac = 0.45) => {
    const sm = spline(center, false, 6);
    const hws = spline(hw.map((w, i) => [i, w] as P2), false, 6).map((q) => q[1]);
    const rs = resample(sm, 0.004);
    // half-width at each resampled point via nearest index of sm
    const cumSm = cumLen(sm);
    const wAt = (s: number) => {
      let k = 0;
      while (k < cumSm.length - 2 && cumSm[k + 1] < s) k++;
      const t = (s - cumSm[k]) / Math.max(1e-9, cumSm[k + 1] - cumSm[k]);
      return hws[k] + (hws[k + 1] - hws[k]) * Math.min(1, Math.max(0, t));
    };
    const N = rs.pts.map((_p, i) => {
      const a = rs.pts[Math.max(0, i - 1)];
      const b = rs.pts[Math.min(rs.pts.length - 1, i + 1)];
      const d = norm(sub(b, a));
      return [-d[1], d[0]] as P2;
    });
    for (let i = 0; i < n; i++) {
      const o = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const base = o * 0.86 + (hash(seed, i, 1) - 0.5) * 0.1;
      const f = 14 + hash(seed, i, 2) * 24;
      const ph = hash(seed, i, 3) * 6.28;
      const amp = 0.06 + hash(seed, i, 4) * 0.08;
      const pts: P2[] = rs.pts.map((p, k) => {
        const w = wAt(rs.s[k]);
        const off = w * (base + amp * Math.sin(rs.s[k] * f + ph));
        return add(p, mul(N[k], off));
      });
      if (fan?.length) {
        const fi = Math.min(fan.length - 1, Math.max(0, Math.floor(((base + 1) / 2) * fan.length)));
        const fr = resample(spline(fan[fi], false, 4), 0.004);
        const start = pts[pts.length - 1];
        const shift = sub(start, fr.pts[0]);
        const loc = (hash(seed, i, 5) - 0.5) * 0.008;
        fr.pts.forEach((q, k) => {
          if (k === 0) return;
          const u = k / (fr.pts.length - 1);
          const bl = Math.min(1, u / 0.45);
          const e = bl * bl * (3 - 2 * bl);
          const a = norm(sub(fr.pts[Math.min(fr.pts.length - 1, k + 1)], fr.pts[k - 1]));
          const tgt = add(q, mul([-a[1], a[0]], loc * (1 - u * 0.8)));
          pts.push(mix(add(q, shift), tgt, e));
        });
      }
      strands.push({ pts, ci: colors(i), cum: cumLen(pts), pulse: hash(seed, i, 6) < pulseFrac });
    }
  };
  /** short branching twigs from a point toward a direction */
  const twig = (p: P2, dir: P2, seed: number, len = 0.03, depth = 0) => {
    const pts: P2[] = [p];
    let d = norm(dir);
    let q = p;
    const steps = 4 + Math.floor(hash(seed, 1) * 4);
    for (let k = 0; k < steps; k++) {
      d = rot(d, (hash(seed, k, 2) - 0.5) * 0.9);
      q = add(q, mul(d, len / steps));
      pts.push(q);
      if (depth < 1 && k === 2 && hash(seed, k, 3) < 0.6) twig(q, rot(d, (hash(seed, 4) < 0.5 ? -1 : 1) * 0.7), seed * 7 + 3, len * 0.55, depth + 1);
    }
    twigs.push(spline(pts, false, 3));
  };

  const heart: P2 = [0.03, 1.3];

  for (const side of ['Left', 'Right'] as const) {
    const sx = side === 'Left' ? 1 : -1;
    const X = (x: number) => sx * x;
    const A = J(`${side}Arm`);
    const Fo = J(`${side}ForeArm`);
    const Hd = J(`${side}Hand`);
    const U = J(`${side}UpLeg`);
    const L = J(`${side}Leg`);
    const Ft = J(`${side}Foot`);
    // ---- limbs (anatomical position: palms forward, thumbs out)
    caps.push(cap([X(0.158), 1.425], [X(0.178), 1.345], 0.05, 0.044)); // deltoid
    caps.push(cap(add(A, [X(0.012), -0.04]), Fo, 0.047, 0.038));
    caps.push(cap(Fo, Hd, 0.04, 0.026));
    const d = norm(sub(Hd, Fo));
    const p: P2 = [-d[1] * sx, d[0] * sx]; // lateral direction across the palm
    const palmEnd = add(Hd, mul(d, 0.082));
    caps.push(cap(add(Hd, mul(d, 0.012)), add(Hd, mul(d, 0.07)), 0.03, 0.033));
    const fingers: P2[][] = [];
    const flen = [0.074, 0.082, 0.078, 0.064];
    for (let k = 0; k < 4; k++) {
      const off = 0.021 - k * 0.0142;
      const base = add(add(Hd, mul(d, 0.075)), mul(p, off));
      const dir = rot(d, sx * (0.1 - k * 0.085));
      const tip = add(base, mul(dir, flen[k]));
      caps.push(cap(base, tip, 0.0092, 0.0075));
      fingers.push([palmEnd, mix(palmEnd, base, 0.6), base, mix(base, tip, 0.5), tip]);
    }
    const tb = add(add(Hd, mul(d, 0.028)), mul(p, 0.026));
    const tdir = norm(add(mul(d, 0.8), mul(p, 0.62)));
    const ttip = add(tb, mul(tdir, 0.062));
    caps.push(cap(tb, ttip, 0.011, 0.0085));
    fingers.unshift([palmEnd, mix(palmEnd, tb, 0.5), tb, mix(tb, ttip, 0.5), ttip]);
    const knee = L;
    caps.push(cap([X(0.095), 0.95], add(knee, [0, 0.05]), 0.088, 0.054));
    caps.push(cap(add(knee, [0, 0.03]), add(knee, [0, -0.045]), 0.05, 0.047));
    caps.push(cap(add(knee, [X(-0.004), -0.08]), add(knee, [X(0.002), -0.24]), 0.056, 0.042)); // calf
    caps.push(cap(add(knee, [0, -0.06]), add(Ft, [0, 0.07]), 0.048, 0.03));
    const toe: P2 = add(Ft, [X(0.014), -0.08]);
    caps.push(cap(Ft, toe, 0.032, 0.036));
    const toes: P2[][] = [];
    for (let k = 0; k < 5; k++) {
      const a = add(Ft, [X(0.002 + k * 0.007), -0.05]);
      toes.push([add(Ft, [X(0.008), -0.02]), a, add(a, [X(0.004 + k * 0.002), -0.03 + k * 0.004])]);
    }

    // ---- nerve bundles
    // brachial plexus → arm → fingers
    bundle(
      [[X(0.012), 1.48], [X(0.06), 1.455], [X(0.118), 1.425], add(A, [X(0.012), -0.04]), mix(A, Fo, 0.55), Fo, mix(Fo, Hd, 0.5), Hd, add(Hd, mul(d, 0.08))],
      [0.006, 0.013, 0.022, 0.028, 0.03, 0.022, 0.024, 0.016, 0.022],
      18, sx > 0 ? 11 : 12, (i) => pickNerve(sx > 0 ? 11 : 12, i), fingers,
    );
    // lumbosacral plexus → leg → toes
    bundle(
      [[X(0.008), 1.13], [X(0.03), 1.06], [X(0.08), 0.97], mix(U, knee, 0.3), mix(U, knee, 0.72), knee, mix(knee, Ft, 0.5), Ft, add(Ft, [X(0.008), -0.02])],
      [0.006, 0.018, 0.038, 0.05, 0.044, 0.03, 0.034, 0.016, 0.022],
      22, sx > 0 ? 21 : 22, (i) => pickNerve(sx > 0 ? 21 : 22, i), toes,
    );
    // femoral / saphenous: a thinner inner bundle down the medial leg
    bundle(
      [[X(0.03), 1.08], [X(0.06), 0.96], mix(U, knee, 0.5), add(knee, [X(-0.03), 0]), add(mix(knee, Ft, 0.5), [X(-0.025), 0]), add(Ft, [X(-0.018), 0.02])],
      [0.004, 0.012, 0.018, 0.012, 0.01, 0.006],
      7, sx > 0 ? 31 : 32, (i) => (i % 2 ? 2 : 4),
    );
    // intercostals: two strands per rib level
    for (let k = 0; k < 10; k++) {
      const y = 1.445 - k * 0.032;
      const out = 0.118 + Math.sin((k / 9) * Math.PI) * 0.03;
      bundle([[X(0.01), y], [X(0.05), y + 0.008], [X(out * 0.8), y - 0.004], [X(out), y - 0.03], [X(out - 0.012), y - 0.06]], [0.002, 0.004, 0.005, 0.005, 0.003], 2, 40 + k * 2 + (sx > 0 ? 0 : 1), (i) => (i ? 2 : 0), undefined, 0.6);
    }
    // cervical plexus fans over the neck and shoulder
    for (let k = 0; k < 5; k++) {
      const y = 1.55 - k * 0.018;
      bundle([[X(0.008), y], [X(0.03), y - 0.006], [X(0.06 + k * 0.016), y - 0.03 - k * 0.006], [X(0.075 + k * 0.022), 1.45 - k * 0.004]], [0.001, 0.002, 0.003, 0.002], 1, 60 + k + (sx > 0 ? 0 : 9), () => 3, undefined, 0.5);
    }
    // twigs from the limbs toward the skin
    const limb = [add(A, [X(0.012), -0.04]), Fo, Hd, [X(0.095), 0.95] as P2, knee, Ft];
    for (let k = 0; k < 26; k++) {
      const seg = k < 12 ? (k < 6 ? 0 : 1) : k < 19 ? 3 : 4;
      const a = limb[seg];
      const b = limb[seg + 1];
      const u = 0.1 + hash(sx, k, 81) * 0.8;
      const c = mix(a, b, u);
      const dd = norm(sub(b, a));
      const nrm: P2 = [-dd[1], dd[0]];
      const s2 = hash(sx, k, 82) < 0.5 ? 1 : -1;
      const w = seg < 3 ? 0.026 : 0.04;
      twig(add(c, mul(nrm, s2 * w * 0.6)), add(mul(nrm, s2), mul(dd, 0.4)), sx * 100 + k, 0.018 + hash(sx, k, 83) * 0.022);
    }
    // torso twigs from the intercostals
    for (let k = 0; k < 14; k++) {
      const y = 1.44 - hash(sx, k, 91) * 0.34;
      twig([X(0.05 + hash(sx, k, 92) * 0.07), y], [X(1), -0.4 - hash(sx, k, 93) * 0.6], sx * 300 + k, 0.016 + hash(sx, k, 94) * 0.018);
    }

    // ---- muscles
    const m = (name: string, group: string, poly: P2[], angle: number) => muscles.push({ name: `${name}.${side[0]}`, group, poly, angle });
    m('PEC', 'chest', spline([[X(0.012), 1.432], [X(0.07), 1.446], [X(0.128), 1.428], [X(0.152), 1.402], [X(0.126), 1.364], [X(0.072), 1.336], [X(0.016), 1.338]], true, 6), sx * -0.25);
    m('DELT', 'shoulder', spline([[X(0.122), 1.466], [X(0.166), 1.458], [X(0.193), 1.41], [X(0.19), 1.35], [X(0.17), 1.322], [X(0.152), 1.385], [X(0.13), 1.44]], true, 6), Math.PI / 2);
    m('TRAP', 'shoulder', spline([[X(0.018), 1.535], [X(0.046), 1.478], [X(0.128), 1.462], [X(0.1), 1.478], [X(0.04), 1.505]], true, 6), sx * 0.3);
    m('SCM', 'neck', spline([[X(0.046), 1.585], [X(0.054), 1.57], [X(0.022), 1.474], [X(0.01), 1.48]], true, 5), 1.2 * sx);
    m('BICEP', 'arm', spindle(add(A, [X(0.006), -0.06]), mix(A, Fo, 0.95), 0.024, 0.55), Math.atan2(Fo[1] - A[1], Fo[0] - A[0]));
    m('FLEX', 'arm', spindle(add(Fo, [0, -0.01]), mix(Fo, Hd, 0.85), 0.021, 0.3), Math.atan2(Hd[1] - Fo[1], Hd[0] - Fo[0]));
    m('OBL', 'core', spline([[X(0.064), 1.295], [X(0.118), 1.272], [X(0.13), 1.19], [X(0.12), 1.11], [X(0.085), 1.06], [X(0.064), 1.12]], true, 6), sx * -0.9);
    for (let k = 0; k < 3; k++) m(`SERR${k}`, 'chest', spindle([X(0.106), 1.326 - k * 0.03], [X(0.152), 1.346 - k * 0.026], 0.008, 0.6, 8), sx * 0.4);
    m('RECF', 'leg', spindle(add(U, [X(0.006), -0.05]), add(knee, [0, 0.07]), 0.034, 0.45), -Math.PI / 2);
    m('VLAT', 'leg', spindle(add(U, [X(0.06), -0.08]), add(knee, [X(0.04), 0.06]), 0.026, 0.45), -Math.PI / 2);
    m('VMED', 'leg', spindle(add(knee, [X(-0.026), 0.2]), add(knee, [X(-0.032), 0.045]), 0.022, 0.7), -Math.PI / 2);
    m('SART', 'leg', spindle(add(U, [X(0.06), -0.01]), add(knee, [X(-0.05), 0.02]), 0.01, 0.5), Math.atan2(knee[1] - U[1], X(-0.11)));
    m('TIB', 'leg', spindle(add(knee, [X(0.018), -0.06]), add(Ft, [X(0.006), 0.07]), 0.016, 0.35), -Math.PI / 2);
    m('GAST', 'leg', spindle(add(knee, [X(-0.04), -0.05]), add(knee, [X(-0.03), -0.25]), 0.02, 0.35), -Math.PI / 2);

    // ---- bones (faint): ribs, clavicle, pelvis wing
    for (let k = 0; k < 10; k++) {
      const y = 1.45 - k * 0.031;
      const out = 0.12 + Math.sin((k / 9) * Math.PI) * 0.028;
      bones.push(spline([[X(0.016), y - 0.004], [X(0.06), y + 0.006], [X(out * 0.85), y - 0.006], [X(out), y - 0.035], [X(out - 0.014), y - 0.07]], false, 5));
    }
    bones.push(spline([[X(0.012), 1.472], [X(0.06), 1.468], [X(0.1), 1.476], [X(0.142), 1.462]], false, 5));
    bones.push(spline([[X(0.03), 1.07], [X(0.1), 1.1], [X(0.15), 1.085], [X(0.14), 1.02], [X(0.08), 0.99], [X(0.03), 0.975]], false, 5));

    // ---- cranial nerves (face) and the vagus
    const ear: P2 = [X(0.068), 1.636];
    for (const [tx, ty] of [[0.046, 1.712], [0.044, 1.676], [0.036, 1.63], [0.024, 1.6], [0.03, 1.574]] as const)
      cranial.push(spline([ear, [X((0.068 + tx) / 2 + 0.006), (1.636 + ty) / 2 + 0.004], [X(tx), ty]], false, 6));
    for (const [tx, ty] of [[0.016, 1.735], [0.02, 1.645], [0.012, 1.585]] as const) cranial.push(spline([[X(0.05), 1.652], [X((0.05 + tx) / 2), (1.652 + ty) / 2 + 0.006], [X(tx), ty]], false, 6));
    vagus.push(spline([[X(0.01), 1.6], [X(0.02), 1.53], [X(0.024), 1.45], [X(0.02), 1.37], [X(0.03), 1.3], [X(0.045), 1.22], [X(0.04), 1.13], [X(0.03), 1.07]], false, 6));
    vagus.push(spline([[X(0.022), 1.4], [X(0.06), 1.385], [X(0.08), 1.36]], false, 5));
    vagus.push(spline([[X(0.03), 1.3], [X(0.07), 1.22], [X(0.09), 1.19]], false, 5));
  }

  // ---- organs
  const organ = (name: string, pts: P2[], angle = 0): Organ => ({ name, poly: spline(pts, true, 8), angle });
  const lungR: P2[] = [[-0.024, 1.43], [-0.058, 1.446], [-0.098, 1.414], [-0.124, 1.34], [-0.13, 1.262], [-0.112, 1.226], [-0.066, 1.238], [-0.034, 1.262], [-0.026, 1.34]];
  const organs: Organ[] = [
    organ('LUNG.R', lungR),
    organ('LUNG.L', [[0.024, 1.43], [0.058, 1.446], [0.098, 1.414], [0.124, 1.34], [0.13, 1.262], [0.112, 1.226], [0.07, 1.236], [0.052, 1.27], [0.064, 1.31], [0.036, 1.342]]),
    organ('HEART', [[0.002, 1.346], [0.034, 1.352], [0.066, 1.326], [0.074, 1.288], [0.054, 1.256], [0.024, 1.262], [-0.012, 1.284], [-0.02, 1.318]]),
    organ('LIVER', [[-0.126, 1.244], [-0.064, 1.256], [0.012, 1.248], [0.05, 1.228], [0.004, 1.206], [-0.06, 1.172], [-0.108, 1.168], [-0.13, 1.198]]),
    organ('STOMACH', [[0.026, 1.236], [0.064, 1.246], [0.1, 1.226], [0.11, 1.19], [0.09, 1.156], [0.052, 1.146], [0.022, 1.16], [0.04, 1.188], [0.03, 1.212]]),
    organ('KIDNEY.L', [[0.058, 1.182], [0.084, 1.188], [0.096, 1.152], [0.086, 1.114], [0.062, 1.116], [0.056, 1.136], [0.066, 1.152]]),
    organ('KIDNEY.R', [[-0.06, 1.168], [-0.086, 1.174], [-0.098, 1.138], [-0.088, 1.1], [-0.064, 1.102], [-0.058, 1.122], [-0.068, 1.138]]),
    organ('BLADDER', [[-0.028, 0.992], [0.028, 0.992], [0.036, 0.968], [0.012, 0.952], [-0.012, 0.952], [-0.036, 0.968]]),
  ];
  // intestine: a winding path inside the abdomen, framed by the colon
  const colon: P2[] = [[-0.1, 1.0], [-0.11, 1.08], [-0.1, 1.14], [0, 1.15], [0.1, 1.14], [0.11, 1.08], [0.1, 1.02], [0.05, 0.995]];
  const intestine: P2[] = [];
  for (let row = 0; row < 7; row++) {
    const y = 1.128 - row * 0.019;
    const xs = [-0.085, 0.085];
    if (row % 2) xs.reverse();
    for (let k = 0; k <= 8; k++) {
      const x = xs[0] + ((xs[1] - xs[0]) * k) / 8;
      intestine.push([x, y + Math.sin(k * 1.7 + row) * 0.004]);
    }
  }
  organs.push({ name: 'COLON', poly: spline(colon, false, 8), angle: 0 });

  // ---- spine
  const vertebrae: P2[] = [];
  const roots: P2[][] = [];
  for (let k = 0; k < 30; k++) {
    const y = 1.56 - k * 0.019;
    vertebrae.push([0, y]);
    for (const sx of [-1, 1]) roots.push(spline([[sx * 0.006, y], [sx * 0.016, y - 0.004], [sx * 0.03, y - 0.014]], false, 4));
  }

  // ---- brain, eyes, optic pathway
  const shellPts: P2[] = [[-0.068, 1.7], [-0.064, 1.736], [-0.044, 1.762], [0, 1.772], [0.044, 1.762], [0.064, 1.736], [0.068, 1.7], [0.066, 1.666], [0.054, 1.648], [0.042, 1.66], [0.028, 1.678], [0.012, 1.682], [0, 1.678], [-0.012, 1.682], [-0.028, 1.678], [-0.042, 1.66], [-0.054, 1.648], [-0.066, 1.666]];
  const shell = spline(shellPts, true, 6);
  const gyri: P2[][] = [];
  for (const sx of [-1, 1])
    for (let g = 0; g < 46; g++) {
      let p: P2 = [sx * (0.006 + hash(sx, g, 1) * 0.058), 1.665 + hash(sx, g, 2) * 0.1];
      if (!inPoly(p, shell)) continue;
      let a = hash(sx, g, 3) * Math.PI * 2;
      let da = (hash(sx, g, 4) - 0.5) * 0.8;
      const path: P2[] = [p];
      const n = 7 + Math.floor(hash(sx, g, 5) * 9);
      for (let k = 0; k < n; k++) {
        da += (hash(sx, g, k, 6) - 0.5) * 0.9;
        da = Math.max(-1.1, Math.min(1.1, da));
        a += da;
        const q: P2 = [p[0] + Math.cos(a) * 0.0042, p[1] + Math.sin(a) * 0.0042];
        if (!inPoly(q, shell) || q[0] * sx < 0.004) break;
        path.push(q);
        p = q;
      }
      if (path.length > 3) gyri.push(spline(path, false, 3));
    }
  const fissure = spline([[0, 1.772], [0.002, 1.74], [-0.001, 1.71], [0, 1.68]], false, 6);
  const stem = [-1, 1].map((sx) => spline([[sx * 0.009, 1.66], [sx * 0.008, 1.62], [sx * 0.006, 1.575]], false, 5));
  const eyes = [J('LeftEye'), J('RightEye')];
  const chiasm: P2 = [0, 1.654];
  for (const [ei, E] of eyes.entries()) {
    const sx = E[0] > 0 ? 1 : -1;
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI / 2 - sx * 0.4 + (k / 11 - 0.5) * 2.0 * -sx;
      const start: P2 = add(E, [Math.cos(a) * 0.0105, Math.sin(a) * 0.0105]);
      const cross = k % 2 === 0; // nasal fibres cross at the chiasm
      const tx = cross ? -sx : sx;
      const lgn: P2 = [tx * (0.034 + (k % 3) * 0.004), 1.672 + (k % 4) * 0.002];
      const end: P2 = [tx * (0.018 + hash(ei, k, 7) * 0.036), 1.732 + hash(ei, k, 8) * 0.026];
      const pts = spline(
        [start, add(mix(start, chiasm, 0.5), [0, -0.004]), add(chiasm, [sx * 0.002 * (k % 3), (k % 4) * 0.0012]), mix(chiasm, lgn, 0.55), lgn, [tx * 0.063, 1.69 + (k % 5) * 0.003], [tx * 0.058, 1.722], end],
        false, 7,
      );
      optic.push({ pts, ci: 0, cum: cumLen(pts), pulse: k % 3 === 0 });
    }
  }

  // ---- field → outline + interior cells
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of caps)
    for (const q of [c.a, c.b]) {
      const r = Math.max(c.ra, c.rb);
      x0 = Math.min(x0, q[0] - r);
      y0 = Math.min(y0, q[1] - r);
      x1 = Math.max(x1, q[0] + r);
      y1 = Math.max(y1, q[1] + r);
    }
  x0 -= 0.03;
  y0 -= 0.03;
  x1 += 0.03;
  y1 += 0.03;
  const h = 0.0028;
  const nx = Math.ceil((x1 - x0) / h) + 1;
  const ny = Math.ceil((y1 - y0) / h) + 1;
  const F = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * h;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * h;
      let d = 1e9;
      for (const c of caps) {
        // cheap reject
        const r = Math.max(c.ra, c.rb) + 0.06;
        if (x < Math.min(c.a[0], c.b[0]) - r || x > Math.max(c.a[0], c.b[0]) + r || y < Math.min(c.a[1], c.b[1]) - r || y > Math.max(c.a[1], c.b[1]) + r) continue;
        d = smin(d, capD(c, x, y), 0.034);
      }
      F[j * nx + i] = d;
    }
  }
  const outline = contour(F, nx, ny, x0, y0, h, 0);
  const inset = contour(F, nx, ny, x0, y0, h, -0.0065);
  const cells = insideCells(F, nx, ny, x0, y0, h);

  // colour assignment happens at raster time (per palette): keep the index
  return { x0, y0, x1, y1, outline, inset, cells, strands, twigs, organs, intestine, muscles, bones, vertebrae, roots, cranial, vagus, brain: { shell, gyri, fissure, stem }, optic, eyes, J, heart };
}

/* ------------------------------------------------------------------ */
/* rendering                                                            */
/* ------------------------------------------------------------------ */
export type Place = { x: number; y: number; s: number; crop?: [number, number, number, number] };
export const toPx = (fig: Figure, pl: Place, p: P2): P2 => {
  const [cx0, , , cy1] = pl.crop ?? [fig.x0, fig.y0, fig.x1, fig.y1];
  return [pl.x + (p[0] - cx0) * pl.s, pl.y + (cy1 - p[1]) * pl.s];
};

const rasterCache = new Map<string, HTMLCanvasElement>();
const keyOf = (pal: AnatomyPalette, s: number, crop?: number[]) => `${pal.name}|${s}|${crop?.join(',') ?? ''}`;

type Map2 = (p: P2) => P2;
const pathOf = (pts: P2[], M: Map2, closed = false) => {
  const p = new Path2D();
  pts.forEach((q, i) => {
    const [x, y] = M(q);
    if (i) p.lineTo(x, y);
    else p.moveTo(x, y);
  });
  if (closed) p.closePath();
  return p;
};
function hatchIn(c: CanvasRenderingContext2D, clip: Path2D, bb: [number, number, number, number], angle: number, gap: number, color: string, lw: number) {
  c.save();
  c.clip(clip);
  c.strokeStyle = color;
  c.lineWidth = lw;
  const cx = (bb[0] + bb[2]) / 2;
  const cy = (bb[1] + bb[3]) / 2;
  const R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 2;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  c.beginPath();
  for (let o = -R; o <= R; o += gap) {
    const px = cx - sa * o;
    const py = cy + ca * o;
    c.moveTo(px - ca * R, py - sa * R);
    c.lineTo(px + ca * R, py + sa * R);
  }
  c.stroke();
  c.restore();
}
const bbox = (pts: P2[], M: Map2): [number, number, number, number] => {
  let a = Infinity;
  let b = Infinity;
  let c = -Infinity;
  let d = -Infinity;
  for (const q of pts) {
    const [x, y] = M(q);
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [a, b, c, d];
};
const strandColor = (pal: AnatomyPalette, s: Strand) => pal.nerves[s.ci % pal.nerves.length];

/** Rasterise the static plate at `s` px/m (optionally cropped to a region in metres). */
export function rasterFigure(fig: Figure, s: number, pal: AnatomyPalette, crop?: [number, number, number, number]) {
  const key = keyOf(pal, s, crop);
  const hit = rasterCache.get(key);
  if (hit) return hit;
  const [cx0, cy0, cx1, cy1] = crop ?? [fig.x0, fig.y0, fig.x1, fig.y1];
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((cx1 - cx0) * s);
  cv.height = Math.ceil((cy1 - cy0) * s);
  const c = cv.getContext('2d')!;
  const M: Map2 = (p) => [(p[0] - cx0) * s, (cy1 - p[1]) * s];
  const lw = (w: number) => w * Math.max(1, Math.sqrt(s / 500));
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // interior mask
  const mask = new Path2D();
  for (const poly of fig.cells) {
    for (let i = 0; i < poly.length; i += 2) {
      const x = (poly[i] - cx0) * s;
      const y = (cy1 - poly[i + 1]) * s;
      if (i) mask.lineTo(x, y);
      else mask.moveTo(x, y);
    }
    mask.closePath();
  }
  c.fillStyle = pal.fill;
  c.fill(mask);
  hatchIn(c, mask, [0, 0, cv.width, cv.height], 0, Math.max(3, s / 160), pal.hatch, 1);
  // bones
  c.strokeStyle = pal.bone;
  c.lineWidth = lw(1);
  for (const b of fig.bones) c.stroke(pathOf(b, M));
  // muscles: translucent body + fibre lines + edge
  for (const mu of fig.muscles) {
    const p = pathOf(mu.poly, M, true);
    c.fillStyle = pal.muscleFill;
    c.fill(p);
    hatchIn(c, p, bbox(mu.poly, M), -mu.angle, Math.max(2.4, s / 260), pal.muscle, lw(0.9));
    c.strokeStyle = pal.muscleEdge;
    c.lineWidth = lw(1);
    c.stroke(p);
  }
  // organs
  for (const o of fig.organs) {
    if (o.name === 'COLON') continue;
    const p = pathOf(o.poly, M, true);
    c.fillStyle = pal.organ;
    c.fill(p);
    hatchIn(c, p, bbox(o.poly, M), o.angle, Math.max(2.6, s / 220), pal.organLine, 1);
    c.strokeStyle = pal.organEdge;
    c.lineWidth = lw(1.2);
    c.stroke(p);
  }
  const colon = fig.organs.find((o) => o.name === 'COLON')!;
  c.strokeStyle = pal.organ;
  c.lineWidth = Math.max(4, s * 0.016);
  c.stroke(pathOf(colon.poly, M));
  c.strokeStyle = pal.organEdge;
  c.lineWidth = lw(1);
  c.stroke(pathOf(colon.poly, M));
  c.strokeStyle = pal.organ;
  c.lineWidth = Math.max(3, s * 0.011);
  c.stroke(pathOf(spline(fig.intestine, false, 4), M));
  c.strokeStyle = pal.organLine;
  c.lineWidth = 1;
  c.stroke(pathOf(spline(fig.intestine, false, 4), M));
  // spine: vertebrae + cord + roots
  c.strokeStyle = pal.spine;
  c.globalAlpha = 0.7;
  c.lineWidth = lw(1);
  for (const v of fig.vertebrae) {
    const [x, y] = M(v);
    const w = 0.009 * s;
    const hh = 0.0062 * s;
    c.beginPath();
    c.roundRect(x - w, y - hh, w * 2, hh * 2, hh * 0.7);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.lineWidth = lw(1.6);
  c.stroke(pathOf([[0, 1.66], [0, 1.0]], M));
  c.lineWidth = lw(0.8);
  for (const r of fig.roots) c.stroke(pathOf(r, M));
  // nerve strands
  c.globalAlpha = 0.9;
  for (const st of fig.strands) {
    c.strokeStyle = strandColor(pal, st);
    c.lineWidth = lw(1);
    c.stroke(pathOf(st.pts, M));
  }
  fig.twigs.forEach((tw, i) => {
    c.strokeStyle = pal.twig[i % pal.twig.length];
    c.lineWidth = lw(0.7);
    c.stroke(pathOf(tw, M));
  });
  c.globalAlpha = 1;
  c.strokeStyle = pal.vagus;
  c.lineWidth = lw(1.3);
  for (const v of fig.vagus) c.stroke(pathOf(v, M));
  c.strokeStyle = pal.cranial;
  c.lineWidth = lw(1);
  for (const v of fig.cranial) c.stroke(pathOf(v, M));
  // brain
  const shell = pathOf(fig.brain.shell, M, true);
  c.fillStyle = pal.brain;
  c.fill(shell);
  c.strokeStyle = pal.brainLine;
  c.lineWidth = lw(1);
  for (const g of fig.brain.gyri) c.stroke(pathOf(g, M));
  c.lineWidth = lw(1.4);
  c.stroke(shell);
  c.stroke(pathOf(fig.brain.fissure, M));
  for (const st of fig.brain.stem) c.stroke(pathOf(st, M));
  // optic pathway
  c.strokeStyle = pal.optic;
  c.lineWidth = lw(1.1);
  for (const o of fig.optic) c.stroke(pathOf(o.pts, M));
  // eyes
  c.strokeStyle = pal.eye;
  for (const e of fig.eyes) {
    const [x, y] = M(e);
    c.lineWidth = lw(1.4);
    c.beginPath();
    c.arc(x, y, 0.0115 * s, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = lw(1);
    c.beginPath();
    c.arc(x, y, 0.005 * s, 0, Math.PI * 2);
    c.stroke();
  }
  // silhouette: outline + inset
  const seg = (arr: Float32Array, color: string, w: number) => {
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath();
    for (let i = 0; i < arr.length; i += 4) {
      c.moveTo((arr[i] - cx0) * s, (cy1 - arr[i + 1]) * s);
      c.lineTo((arr[i + 2] - cx0) * s, (cy1 - arr[i + 3]) * s);
    }
    c.stroke();
  };
  seg(fig.inset, pal.inner, lw(0.8));
  seg(fig.outline, pal.outline, lw(1.5));
  rasterCache.set(key, cv);
  return cv;
}

/** sub-path of a strand between arc lengths a..b */
function subPath(ctx: C2, st: Strand, a: number, b: number, M: Map2) {
  const { pts, cum } = st;
  let started = false;
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] < a) continue;
    if (cum[i - 1] > b) break;
    const p = M(pts[i - 1]);
    const q = M(pts[i]);
    if (!started) {
      ctx.moveTo(p[0], p[1]);
      started = true;
    }
    ctx.lineTo(q[0], q[1]);
  }
}

/** Draw the plate + animated layers (nerve pulses, muscle-group flashes, scan band). */
export function drawFigure(ctx: C2, fig: Figure, pl: Place, pal: AnatomyPalette, t: number, o: { pulse?: number; nerveAlpha?: number; flash?: string[]; scanY?: number } = {}) {
  const cv = rasterFigure(fig, pl.s, pal, pl.crop);
  ctx.drawImage(cv, pl.x, pl.y);
  const M: Map2 = (p) => toPx(fig, pl, p);
  ctx.save();
  ctx.lineCap = 'round';
  if (o.flash?.length) {
    for (const mu of fig.muscles) {
      if (!o.flash.includes(mu.group) && !o.flash.includes(mu.name)) continue;
      const p = pathOf(mu.poly, M, true);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill(p);
      hatchIn(ctx as CanvasRenderingContext2D, p, bbox(mu.poly, M), -mu.angle, Math.max(2.4, pl.s / 260), '#ffffff', 1);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke(p);
    }
  }
  if (o.pulse != null) {
    // signals run out from the spine along every bundle; optic signals run eye → cortex
    ctx.globalAlpha = o.nerveAlpha ?? 0.95;
    ctx.strokeStyle = pal.pulse;
    ctx.lineWidth = Math.max(1.4, pl.s / 430);
    ctx.beginPath();
    fig.strands.forEach((st, i) => {
      if (!st.pulse) return;
      const L = st.cum[st.cum.length - 1];
      const head = ((t * (0.35 + hash(i, 5) * 0.3) + hash(i, 9) + o.pulse!) % 1) * (L + 0.06);
      subPath(ctx, st, head - 0.05, head, M);
    });
    ctx.stroke();
    ctx.strokeStyle = '#ffe0a0';
    ctx.beginPath();
    fig.optic.forEach((st, i) => {
      const L = st.cum[st.cum.length - 1];
      const head = ((t * 0.6 + hash(i, 13)) % 1) * (L + 0.02);
      subPath(ctx, st, head - 0.012, head, M);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (o.scanY != null) {
    // a brighter band: the plate re-drawn additively inside a thin slab
    ctx.save();
    ctx.beginPath();
    ctx.rect(pl.x, o.scanY - 14, cv.width, 28);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.8;
    ctx.drawImage(cv, pl.x, pl.y);
    ctx.restore();
    ctx.fillStyle = pal.pulse;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(pl.x - 30, Math.round(o.scanY), cv.width + 60, 1.5);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
