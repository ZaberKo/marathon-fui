import type { C2 } from './engine';
import { H, W, hash } from './engine';
import { clipped, kDots } from './draw';
import registrationTile from '../styles/registration-screen.svg?raw';

type Palette = { plate: string; edge: string; dots: string };
export const PAL_BLUE: Palette = { plate: '#070e55', edge: '#0a147a', dots: '#192bb2' };
export const PAL_GREEN: Palette = { plate: '#072909', edge: '#103b16', dots: '#23722a' };

const tile = new DOMParser().parseFromString(registrationTile, 'image/svg+xml');
const tileWidth = Number(tile.documentElement.getAttribute('width'));
const tileInk = [...tile.querySelectorAll('path')].map((element) => ({
  path: new Path2D(element.getAttribute('d')!),
  opacity: Number(element.getAttribute('opacity') ?? 1),
}));

function registration(left: number, top: number, right: number, bottom: number, size: number, ink: string) {
  const open = new Path2D();
  open.rect(left, top, right - left, bottom - top);
  const red = parseInt(ink.slice(1, 3), 16);
  const green = parseInt(ink.slice(3, 5), 16);
  const blue = parseInt(ink.slice(5, 7), 16);
  const scale = size / tileWidth;
  const tones = tileInk.map(({ path, opacity }) => {
    const run = new Path2D();
    for (let y = top; y < bottom; y += size) {
      for (let x = left; x < right; x += size) run.addPath(path, new DOMMatrix([scale, 0, 0, scale, x, y]));
    }
    open.addPath(run);
    const light = 1 - opacity;
    return { path: run, color: `rgb(${red * light} ${green * light} ${blue * light})`, opacity };
  });
  return (ctx: C2) => {
    ctx.fillStyle = ink;
    ctx.fill(open, 'evenodd');
    for (const { path, color, opacity } of tones) {
      if (opacity === 1) continue;
      ctx.fillStyle = color;
      ctx.fill(path);
    }
  };
}

const fields = new Map<string, (ctx: C2) => void>();

function vectorField(seed: number, pal: Palette, w: number, h: number) {
  const key = `${seed}:${pal.plate}:${pal.edge}:${pal.dots}:${w}:${h}`;
  const cached = fields.get(key);
  if (cached) return cached;
  // Screen only the interrupted ink plates. The field between them stays clear.
  const plates = [[0, .04, .13, .72, .19], [1, .35, .48, .64, .13], [2, .08, .79, .77, .065]].map(([i, x, y, width, height]) => {
    const cell = Math.max(4, Math.round(Math.min(w, h) / 55));
    const rows = Math.max(3, Math.round(height * h / cell));
    const left = Math.round(x * w + hash(seed, i, 1) * w * 0.08);
    const top = Math.round(y * h + (hash(seed, i, 2) - 0.5) * h * 0.12);
    const length = Math.round(width * w);
    const seam = Math.round(length * (0.35 + 0.39 * hash(seed, i, 3)) / cell) * cell;
    const direction = hash(seed, i, 4) < 0.5 ? -1 : 1;
    const plate = new Path2D();
    for (let row = 0; row < rows; row++) {
      const offset = direction * Math.min(4, Math.floor(row / (i + 1))) * cell;
      const yy = top + row * cell;
      if ((row + i) % 6 !== 4) plate.rect(left, yy, Math.max(cell, seam + offset), cell);
      if (row >= (i === 2 ? 0 : 2) && (row + i) % 5 !== 2) plate.rect(left + Math.max(cell, seam + offset) + cell, yy, length - seam, cell);
    }
    const screen = registration(left, top, w, top + rows * cell, cell * 3, pal.plate);
    const pitch = Math.max(8, cell * 2);
    return (ctx: C2) => {
      ctx.save();
      ctx.clip(plate);
      screen(ctx);
      ctx.restore();
      ctx.fillStyle = pal.edge;
      ctx.fillRect(left, top - cell, Math.round(seam * 0.77), 1);
      ctx.fillRect(left + seam, top + rows * cell + cell, Math.round((length - seam) * 0.7), 2);
      if (i < 2) kDots(ctx, left + seam - pitch * 2, top + rows * cell + pitch, 4 + i, 2 + i, pitch, pitch * 0.14, pal.dots);
    };
  });
  const paint = (ctx: C2) => clipped(ctx, 0, 0, w, h, () => plates.forEach((plate) => plate(ctx)));
  fields.set(key, paint);
  return paint;
}

type BackdropOpts = {
  seed?: number;
  pal?: Palette;
  dx?: number;
  alpha?: number;
  rect?: [number, number, number, number];
};

/** Registered colour plates, dot clusters and an occasional horizontal slice shift. */
export function backdrop(ctx: C2, o: BackdropOpts = {}) {
  const seed = o.seed ?? 1;
  const [x, y, w, h] = o.rect ?? [0, 0, W, H];
  const field = vectorField(seed, o.pal ?? PAL_BLUE, w, h);
  const drift = Math.round(o.dx ?? 0);
  const frame = Math.floor(drift / 4);
  const drawBand = (top: number, height: number, shift = 0) => {
    if (height <= 0) return;
    const offset = ((drift + shift) % w + w) % w;
    clipped(ctx, x, y + top, w, height, () => {
      ctx.translate(x - offset, y);
      field(ctx);
      if (offset) {
        ctx.translate(w, 0);
        field(ctx);
      }
    });
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha *= o.alpha ?? 1;
  if ((frame + seed) % 19 < 2) {
    const top = Math.floor(h * (0.24 + hash(seed, Math.floor(frame / 19)) * 0.46));
    const height = Math.max(3, Math.round(h * 0.034));
    drawBand(0, top);
    drawBand(top, height, Math.round(w * 0.12));
    drawBand(top + height, h - top - height);
  } else {
    drawBand(0, h);
  }
  ctx.restore();
}
