/**
 * 2D drawing kit for the cinema layers (Canvas2D, logical 1920×1080).
 *
 * Palette values were measured from the reference frames (median of
 * saturated pixels per hue band) — the previous kit's colours were close in
 * hue but too dark/desaturated, and it lacked the big flat colour *fields*.
 */
import type { C2 } from './engine';
import { hash } from './engine';

export const C = {
  black: '#000000',
  blue: '#0518fa',
  blueHi: '#2a3cff',
  blueDeep: '#0204b9',
  blueDim: '#0a1286',
  blueNight: '#030a3c',
  green: '#1cb445',
  mint: '#2ee866',
  grass: '#36ca17',
  planet: '#0dbe05',
  planetHi: '#94f63f',
  lime: '#77f600',
  yellow: '#e8d805',
  yellowHi: '#f7e200',
  lemon: '#cde404',
  red: '#f90003',
  orange: '#fc2c00',
  crimson: '#fc0020',
  magenta: '#d80369',
  violet: '#c128cd',
  cyan: '#1bbae9',
  teal: '#22afbd',
  white: '#f2f2f2',
  grey: '#8f96a8',
} as const;

export const F = {
  sans: '"Archivo Variable", Archivo, "Arial Narrow", sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  pixel: 'Silkscreen, monospace',
};

export type Stretch =
  | 'ultra-condensed' | 'extra-condensed' | 'condensed' | 'semi-condensed' | 'normal'
  | 'semi-expanded' | 'expanded' | 'extra-expanded' | 'ultra-expanded';

export type TextOpts = {
  size: number;
  weight?: number;
  stretch?: Stretch;
  family?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** degrees, around (x,y) */
  rot?: number;
  /** outline only, with this line width */
  stroke?: number;
  tracking?: number;
  alpha?: number;
};

export async function loadFonts() {
  const want = [
    `800 100px ${F.sans}`,
    `600 100px ${F.sans}`,
    `400 40px ${F.mono}`,
    `700 40px ${F.mono}`,
    `400 40px ${F.pixel}`,
  ];
  await Promise.all(want.map((f) => document.fonts.load(f).catch(() => null)));
  // also the condensed/expanded faces resolve from the same variable file
  await document.fonts.ready;
}

export function setFont(ctx: C2, o: TextOpts) {
  ctx.font = `${o.weight ?? 700} ${o.size}px ${o.family ?? F.sans}`;
  ctx.fontStretch = o.stretch ?? 'normal';
  ctx.letterSpacing = `${o.tracking ?? 0}px`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
}

export function text(ctx: C2, s: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  setFont(ctx, o);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate((o.rot * Math.PI) / 180);
  if (o.stroke) {
    ctx.strokeStyle = o.color ?? C.white;
    ctx.lineWidth = o.stroke;
    ctx.lineJoin = 'miter';
    ctx.strokeText(s, 0, 0);
  } else {
    ctx.fillStyle = o.color ?? C.white;
    ctx.fillText(s, 0, 0);
  }
  ctx.restore();
}

export function measure(ctx: C2, s: string, o: TextOpts) {
  ctx.save();
  setFont(ctx, o);
  const m = ctx.measureText(s);
  ctx.restore();
  return m.width;
}

/** Text clipped inside a box — used for type that is cut by the frame/panel. */
export function clipped(ctx: C2, x: number, y: number, w: number, h: number, fn: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  fn();
  ctx.restore();
}

export function rect(ctx: C2, x: number, y: number, w: number, h: number, color: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

export function frameRect(ctx: C2, x: number, y: number, w: number, h: number, color: string, lw = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
}

export function line(ctx: C2, x0: number, y0: number, x1: number, y1: number, color: string, lw = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** Diagonal hazard stripes clipped to a rect. angle in degrees. */
export function stripes(ctx: C2, x: number, y: number, w: number, h: number, o: { period: number; duty?: number; angle?: number; color: string; bg?: string; phase?: number }) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (o.bg) {
    ctx.fillStyle = o.bg;
    ctx.fillRect(x, y, w, h);
  }
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(((o.angle ?? 45) * Math.PI) / 180);
  const R = Math.hypot(w, h) / 2 + o.period;
  ctx.fillStyle = o.color;
  const sw = o.period * (o.duty ?? 0.5);
  const ph = ((o.phase ?? 0) % o.period + o.period) % o.period;
  for (let s = -R - ph; s < R; s += o.period) ctx.fillRect(s, -R, sw, 2 * R);
  ctx.restore();
}

/** Horizontal scanline texture (the CRT/LED feel inside flat panels). */
export function scanlines(ctx: C2, x: number, y: number, w: number, h: number, o: { gap?: number; alpha?: number; color?: string } = {}) {
  const gap = o.gap ?? 3;
  ctx.globalAlpha = o.alpha ?? 0.22;
  ctx.fillStyle = o.color ?? '#000';
  for (let yy = y; yy < y + h; yy += gap) ctx.fillRect(x, yy, w, 1);
  ctx.globalAlpha = 1;
}

/** n×m checkerboard; `on` cells drawn in color. */
export function checker(ctx: C2, x: number, y: number, cols: number, rows: number, cell: number, color: string, invert = false, bg?: string) {
  if (bg) rect(ctx, x, y, cols * cell, rows * cell, bg);
  ctx.fillStyle = color;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) if (((i + j) & 1) === (invert ? 1 : 0)) ctx.fillRect(x + i * cell, y + j * cell, cell, cell);
}

/** Bitmap glyph from rows of '#'/'.' */
/** Draw a pixel glyph as individual rectangular cells. */
export function bitmap(ctx: C2, rows: string[], x: number, y: number, px: number, color: string) {
  ctx.fillStyle = color;
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < rows[j].length; i++) if (rows[j][i] !== '.' && rows[j][i] !== ' ') ctx.fillRect(x + i * px, y + j * px, px, px);
}

/** Random bit-pattern glyph (sigil) from a seed. Mirrored = more "designed". */
export function sigil(ctx: C2, seed: number, x: number, y: number, cols: number, rows: number, px: number, color: string, mirror = true) {
  ctx.fillStyle = color;
  const half = mirror ? Math.ceil(cols / 2) : cols;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < half; i++) {
      if (hash(seed, i, j) < 0.5) continue;
      ctx.fillRect(x + i * px, y + j * px, px, px);
      if (mirror) ctx.fillRect(x + (cols - 1 - i) * px, y + j * px, px, px);
    }
}

/** Annular sector, angles in radians (0 = +x, clockwise on screen). */
export function arc(ctx: C2, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, a0, a1, false);
  ctx.arc(cx, cy, r0, a1, a0, true);
  ctx.closePath();
  ctx.fill();
}

export function ring(ctx: C2, cx: number, cy: number, r: number, color: string, lw = 1, a0 = 0, a1 = Math.PI * 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a1);
  ctx.stroke();
}

/** A compact patch of round dots, matching the kit's .k-dots. */
export function kDots(ctx: C2, x: number, y: number, cols: number, rows: number, pitch: number, radius: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = x + col * pitch;
      const cy = y + row * pitch;
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

/** Small "+" crosshair tick (the magenta registration marks). */
export function plus(ctx: C2, x: number, y: number, s: number, color: string, lw = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - s), Math.round(y - lw / 2), s * 2, lw);
  ctx.fillRect(Math.round(x - lw / 2), Math.round(y - s / 2), lw, s);
}

/* ------------------------------------------------------------------ */
/* Glitch blocks: frame-wide datamosh used on cuts                     */
/* ------------------------------------------------------------------ */
export function glitchBlocks(ctx: C2, seed: number, o: { n?: number; colors?: string[]; maxW?: number; maxH?: number; area?: [number, number, number, number]; grid?: number } = {}) {
  const [ax, ay, aw, ah] = o.area ?? [0, 0, 1920, 1080];
  const g = o.grid ?? 8;
  const colors = o.colors ?? [C.blue, C.green, '#000'];
  for (let i = 0; i < (o.n ?? 40); i++) {
    const w = Math.ceil((hash(seed, i, 1) * (o.maxW ?? 360)) / g) * g;
    const h = Math.ceil((hash(seed, i, 2) * (o.maxH ?? 60)) / g) * g;
    const x = ax + Math.floor((hash(seed, i, 3) * aw) / g) * g;
    const y = ay + Math.floor((hash(seed, i, 4) * ah) / g) * g;
    ctx.fillStyle = colors[Math.floor(hash(seed, i, 5) * colors.length)];
    ctx.fillRect(x, y, w, h);
  }
}

/** Repeating micro-copy grid, e.g. "3S K 3S K" rows. */
export function microRows(ctx: C2, x: number, y: number, rows: string[], o: TextOpts & { lh?: number }) {
  rows.forEach((r, i) => text(ctx, r, x, y + i * (o.lh ?? o.size * 1.05), o));
}

/** Equaliser-like dash glyph (stacked horizontal bars). */
export function dashStack(ctx: C2, x: number, y: number, cols: number, rows: number, w: number, h: number, gap: number, color: string, seed = 0, longEvery = 3) {
  ctx.fillStyle = color;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const long = (r + c) % longEvery === 1 || hash(seed, c, r) > 0.8;
      const ww = long ? w * 1.6 : w;
      ctx.fillRect(x + c * (w + gap * 3) - (long ? w * 0.6 : 0), y + r * (h + gap), ww, h);
    }
}

/** Downward/upward triangle. */
export function tri(ctx: C2, x: number, y: number, s: number, color: string, down = false, stroke = 0) {
  ctx.beginPath();
  if (down) {
    ctx.moveTo(x - s / 2, y - s * 0.43);
    ctx.lineTo(x + s / 2, y - s * 0.43);
    ctx.lineTo(x, y + s * 0.43);
  } else {
    ctx.moveTo(x - s / 2, y + s * 0.43);
    ctx.lineTo(x + s / 2, y + s * 0.43);
    ctx.lineTo(x, y - s * 0.43);
  }
  ctx.closePath();
  if (stroke) {
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/** Right-triangle tile pattern (the blue end-card field). */
export function triField(ctx: C2, x: number, y: number, w: number, h: number, cell: number, seed: number, o: { color: string; mark?: string; density?: number; shade?: boolean }) {
  for (let j = 0; j * cell < h; j++)
    for (let i = 0; i * cell < w; i++) {
      const px = x + i * cell;
      const py = y + j * cell;
      if (hash(seed, i, j) < (o.density ?? 0.5)) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + cell, py + cell);
        ctx.lineTo(px, py + cell);
        ctx.closePath();
        if (o.shade) {
          const g = ctx.createLinearGradient(px, py, px + cell, py + cell);
          g.addColorStop(0, '#000');
          g.addColorStop(1, o.color);
          ctx.fillStyle = g;
        } else ctx.fillStyle = o.color;
        ctx.fill();
      } else if (o.mark) {
        ctx.fillStyle = o.mark;
        const cx = px + cell / 2;
        const cy = py + cell / 2;
        ctx.fillRect(cx - 4, cy - 1, 8, 2);
        ctx.fillRect(cx - 1, cy - 4, 2, 8);
      }
    }
}

/** Wrap a stepped "jitter" offset: integer px that changes every 1/fps. */
export const jitter = (T: number, fps: number, amp: number, seed = 0) => Math.round((hash(Math.floor(T * fps), seed) - 0.5) * 2 * amp);
