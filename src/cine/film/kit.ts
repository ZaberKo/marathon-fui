/**
 * Shared helpers for the film's shots: typography plates, stepped type-on
 * and cameras.
 */
import * as THREE from 'three/webgpu';
import type { C2, Frame } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, bitmap, measure, rect, text, type TextOpts } from '../draw';

export const persp = (fov = 30, near = 0.01, far = 400) => new THREE.PerspectiveCamera(fov, 16 / 9, near, far);

export const smooth = (x: number) => x * x * (3 - 2 * x);
export const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** vertical label (rotated 90° cw by default) */
export function vlabel(fg: C2, s: string, x: number, y: number, size: number, color: string, o: Partial<TextOpts> & { rot?: number } = {}) {
  fg.save();
  fg.translate(x, y);
  fg.rotate(o.rot ?? Math.PI / 2);
  text(fg, s, 0, 0, { size, weight: 800, color, tracking: 2, ...o, rot: 0 });
  fg.restore();
}

/** solid bar with knocked-out type; returns width */
export function barLabel(fg: C2, s: string, x: number, y: number, size: number, bar: string, ink: string, padX = 10, stretch: TextOpts['stretch'] = 'normal') {
  fg.save();
  fg.font = `800 ${size}px ${F.sans}`;
  fg.fontStretch = stretch ?? 'normal';
  const w = fg.measureText(s).width;
  fg.restore();
  rect(fg, x, y - size * 0.86, w + padX * 2, size * 1.04, bar);
  text(fg, s, x + padX, y, { size, weight: 800, color: ink, stretch });
  return w + padX * 2;
}

/** stepped type-on: characters appear at `cps`, cursor block while typing */
export function typeOn(fg: C2, s: string, x: number, y: number, t: number, cps: number, o: TextOpts) {
  const n = Math.max(0, Math.min(s.length, Math.floor(t * cps)));
  text(fg, s.slice(0, n), x, y, o);
  if (n < s.length && t > 0) {
    fg.save();
    fg.font = `${o.weight ?? 700} ${o.size}px ${o.family ?? F.sans}`;
    const w = fg.measureText(s.slice(0, n)).width;
    fg.restore();
    if (Math.floor(t * 12) % 2 === 0) rect(fg, x + w + 2, y - o.size * 0.75, o.size * 0.55, o.size * 0.8, o.color ?? C.white);
  }
}

const GLYPH = ['##.#.##', '.#####.', '#.###.#', '.##.##.', '###.###'];
/** compact pixel cluster (a non-letter mark used as a logo stand-in) */
export function pixelCluster(fg: C2, x: number, y: number, px: number, color: string, seed = 2) {
  bitmap(fg, GLYPH.map((r, j) => (hash(seed, j) > 0.5 ? r : r.split('').reverse().join(''))), x, y, px, color);
}

/** project a world point, after making sure the camera matrices are current */
export function px(f: Frame, cam: THREE.Camera, p: THREE.Vector3) {
  cam.updateMatrixWorld();
  return f.gl.project(p, cam);
}

/**
 * One continuous scrolling row of words joined by underscores
 * ("WORD_WORD_WORD_…"), measured exactly so the spacing is even. `seq` is one
 * period of the row; `hi` marks words drawn solid in `hiColor` (the rest use
 * `color`, outlined when `outline`).
 */
export function scrollRow(
  ctx: C2,
  y: number,
  scroll: number,
  seq: string[],
  o: { size: number; weight?: number; stretch?: string; family?: string; color: string; outline?: boolean; hi?: (word: string, i: number) => boolean; hiColor?: string; lw?: number },
) {
  const st = { size: o.size, weight: o.weight ?? 800, stretch: o.stretch as never, family: o.family };
  const ws = seq.map((w) => measure(ctx, `${w}_`, st));
  const P = ws.reduce((a, b) => a + b, 0);
  let x = (((scroll % P) + P) % P) - P;
  let i = 0;
  while (x < 1920 + 10) {
    const k = i % seq.length;
    const w = seq[k];
    if (x + ws[k] > -10) {
      const hot = o.hi?.(w, i) ?? false;
      const color = hot ? o.hiColor ?? o.color : o.color;
      const stroke = !hot && o.outline ? o.lw ?? 2 : 0;
      text(ctx, `${w}_`, x, y, { ...st, color, stroke });
    }
    x += ws[k];
    i++;
  }
}
