/**
 * Shared helpers for the film's shots: typography plates, stepped type-on,
 * cut glitches, 2.5D canvas planes, cameras.
 */
import * as THREE from 'three/webgpu';
import type { C2, Frame } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, bitmap, rect, text, type TextOpts } from '../draw';

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

/**
 * Cut glitch: for `dur` seconds after a cut, horizontal bands of the frame are
 * replaced by blocks of the given colours (drawn over everything).
 */
export function cutGlitch(f: Frame, t: number, dur = 0.12, colors: string[] = ['#000', C.blue, '#0a1060'], seed = 1) {
  if (t < 0 || t > dur) return;
  const n = Math.floor((1 - t / dur) * 26) + 6;
  const step = Math.floor(t * 60);
  for (let i = 0; i < n; i++) {
    const h = 4 + Math.floor(hash(seed, step, i, 1) * 60);
    const y = Math.floor(hash(seed, step, i, 2) * 1080 / 4) * 4;
    const x = Math.floor(hash(seed, step, i, 3) * 1920 * 0.8);
    const w = 120 + hash(seed, step, i, 4) * 1200;
    rect(f.fg, x, y, w, h, colors[Math.floor(hash(seed, step, i, 5) * colors.length)]);
  }
}

/** A canvas-backed plane for 2.5D graphics (redraw each frame, flag needsUpdate). */
export function canvasPlane(w: number, h: number, size: number, o: { transparent?: boolean; side?: THREE.Side; additive?: boolean } = {}) {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = Math.round((size * h) / w);
  const ctx = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: o.transparent ?? true, side: o.side ?? THREE.DoubleSide, depthWrite: !(o.transparent ?? true) });
  if (o.additive) mat.blending = THREE.AdditiveBlending;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return { mesh, ctx, cv, tex, mat, px: cv.width / w };
}

/** project a world point, after making sure the camera matrices are current */
export function px(f: Frame, cam: THREE.Camera, p: THREE.Vector3) {
  cam.updateMatrixWorld();
  return f.gl.project(p, cam);
}
