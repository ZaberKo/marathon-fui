/**
 * Layered "screen wall" backdrop — replaces the old random-rectangle field.
 *
 * Three depths, each a pre-rendered canvas of UI panels (micro-copy rows, bar
 * spectra, dot grids, memory maps, waveforms) with frames and header strips:
 *   far  — half resolution, blurred, dim       (parallax 0.3)
 *   mid  — half resolution, slight blur         (parallax 0.6)
 *   near — sparse crisp details drawn per frame (parallax 1.0)
 * The block mask from post.ts sits over everything and unifies the texture.
 */
import type { C2 } from './engine';
import { hash } from './engine';
import { F } from './draw';

export type Palette = { ink: string; dim: string; hi: string; accent: string };
export const PAL_BLUE: Palette = { ink: '#0c1a8a', dim: '#071060', hi: '#2a40ff', accent: '#5a72ff' };
export const PAL_GREEN: Palette = { ink: '#0e4a10', dim: '#082a0a', hi: '#2fd62a', accent: '#8aff5a' };
export const PAL_RED: Palette = { ink: '#5a0610', dim: '#2a0308', hi: '#ff2a3a', accent: '#ff7a5a' };

type PanelKind = 'rows' | 'bars' | 'grid' | 'map' | 'wave' | 'blocks';

function panel(ctx: C2, x: number, y: number, w: number, h: number, kind: PanelKind, seed: number, pal: Palette) {
  const r = (k: number) => hash(seed, k);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // frame + header strip
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = pal.ink;
  ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = pal.hi;
  ctx.font = `700 7px ${F.mono}`;
  ctx.fillText(`${['MEM', 'SYS', 'CRT', 'NRV', 'BUF', 'LNK'][Math.floor(r(1) * 6)]}.${Math.floor(r(2) * 900 + 100)}`, x + 3, y + 7);
  const cx = x + 4;
  const cy = y + 14;
  const cw = w - 8;
  const ch = h - 18;
  switch (kind) {
    case 'rows': {
      ctx.font = `400 7px ${F.mono}`;
      for (let i = 0; i * 9 < ch; i++) {
        const hot = r(10 + i) > 0.86;
        ctx.fillStyle = hot ? pal.hi : pal.ink;
        if (hot) ctx.fillRect(cx, cy + i * 9 - 1, cw * (0.3 + r(40 + i) * 0.5), 8);
        ctx.fillStyle = hot ? '#000' : pal.accent;
        let s = '';
        for (let k = 0; k < cw / 6; k++) s += r(i * 97 + k) > 0.3 ? '0123456789ABCDEF'[Math.floor(r(i * 31 + k) * 16)] : ' ';
        ctx.globalAlpha = hot ? 1 : 0.55;
        ctx.fillText(s, cx, cy + i * 9 + 6);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'bars': {
      const n = Math.floor(cw / 5);
      for (let i = 0; i < n; i++) {
        const hh = ch * (0.15 + 0.85 * r(i + 3) ** 2);
        ctx.fillStyle = r(i + 50) > 0.9 ? pal.hi : pal.ink;
        ctx.fillRect(cx + i * 5, cy + ch - hh, 3, hh);
      }
      break;
    }
    case 'grid': {
      ctx.fillStyle = pal.ink;
      for (let yy = 0; yy < ch; yy += 6) for (let xx = 0; xx < cw; xx += 6) ctx.fillRect(cx + xx, cy + yy, 1, 1);
      ctx.strokeStyle = pal.hi;
      ctx.globalAlpha = 0.6;
      const px = cx + cw * r(5);
      const py = cy + ch * r(6);
      ctx.beginPath();
      ctx.moveTo(px - 10, py);
      ctx.lineTo(px + 10, py);
      ctx.moveTo(px, py - 10);
      ctx.lineTo(px, py + 10);
      ctx.stroke();
      ctx.strokeRect(px - 5, py - 5, 10, 10);
      ctx.globalAlpha = 1;
      break;
    }
    case 'map': {
      const cell = 4;
      for (let yy = 0; yy < ch; yy += cell)
        for (let xx = 0; xx < cw; xx += cell) {
          const v = hash(seed, Math.floor(xx / 16), Math.floor(yy / 16)) * 0.6 + hash(seed, xx, yy) * 0.4;
          if (v > 0.55) {
            ctx.fillStyle = v > 0.9 ? pal.hi : pal.ink;
            ctx.fillRect(cx + xx, cy + yy, cell - 1, cell - 1);
          }
        }
      break;
    }
    case 'wave': {
      ctx.strokeStyle = pal.accent;
      ctx.globalAlpha = 0.7;
      for (let l = 0; l < 3; l++) {
        ctx.beginPath();
        for (let xx = 0; xx <= cw; xx += 2) {
          const yy = ch * (0.3 + l * 0.2) + Math.sin(xx * (0.05 + l * 0.03) + r(l) * 6) * ch * 0.08 * (1 + r(l + 9));
          if (xx === 0) ctx.moveTo(cx + xx, cy + yy);
          else ctx.lineTo(cx + xx, cy + yy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'blocks': {
      let yy = 0;
      while (yy < ch) {
        const bh = 4 + Math.floor(r(yy) * 14);
        let xx = 0;
        while (xx < cw) {
          const bw = 6 + Math.floor(r(xx * 7 + yy) * 40);
          if (r(xx + yy * 3) > 0.35) {
            ctx.fillStyle = r(xx * 3 + yy) > 0.92 ? pal.hi : pal.ink;
            ctx.fillRect(cx + xx, cy + yy, bw - 2, bh - 2);
          }
          xx += bw;
        }
        yy += bh;
      }
      // scanlines inside
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      for (let k = 0; k < ch; k += 2) ctx.fillRect(cx, cy + k, cw, 1);
      break;
    }
  }
  ctx.restore();
}

const layerCache = new Map<string, HTMLCanvasElement>();

/** Pre-render a backdrop layer (half resolution; drawn ×2). */
function layer(seed: number, depth: 'far' | 'mid', pal: Palette) {
  const key = `${seed}:${depth}:${pal.ink}`;
  const hit = layerCache.get(key);
  if (hit) return hit;
  const W = 1200;
  const H = 700;
  const raw = document.createElement('canvas');
  raw.width = W;
  raw.height = H;
  const ctx = raw.getContext('2d')!;
  const kinds: PanelKind[] = ['rows', 'bars', 'grid', 'map', 'wave', 'blocks'];
  const n = depth === 'far' ? 26 : 16;
  for (let i = 0; i < n; i++) {
    const r = (k: number) => hash(seed, i, depth === 'far' ? 1 : 2, k);
    const w = depth === 'far' ? 90 + r(1) * 220 : 70 + r(1) * 170;
    const h = depth === 'far' ? 50 + r(2) * 160 : 40 + r(2) * 120;
    const x = Math.floor(r(3) * (W - w) / 4) * 4;
    const y = Math.floor(r(4) * (H - h) / 4) * 4;
    panel(ctx, x, y, w, h, kinds[Math.floor(r(5) * kinds.length)], seed * 100 + i, pal);
  }
  // long hairline rails
  ctx.fillStyle = pal.ink;
  for (let i = 0; i < 18; i++) ctx.fillRect(0, Math.floor(hash(seed, i, 77) * H), W * (0.3 + hash(seed, i, 78) * 0.7), 1);
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const o = out.getContext('2d')!;
  o.filter = depth === 'far' ? 'blur(2.2px)' : 'blur(0.6px)';
  o.globalAlpha = depth === 'far' ? 0.55 : 0.85;
  o.drawImage(raw, 0, 0);
  layerCache.set(key, out);
  return out;
}

export type BackdropOpts = {
  seed?: number;
  pal?: Palette;
  /** camera drift in px (applied with parallax per layer) */
  dx?: number;
  dy?: number;
  alpha?: number;
  /** restrict to a rect */
  rect?: [number, number, number, number];
  near?: boolean;
  T?: number;
};

export function backdrop(ctx: C2, o: BackdropOpts = {}) {
  const seed = o.seed ?? 1;
  const pal = o.pal ?? PAL_BLUE;
  const [rx, ry, rw, rh] = o.rect ?? [0, 0, 1920, 1080];
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  const draw = (c: HTMLCanvasElement, par: number, a: number) => {
    ctx.globalAlpha = (o.alpha ?? 1) * a;
    const W = c.width * 2;
    const H = c.height * 2;
    const ox = ((((o.dx ?? 0) * par) % W) + W) % W;
    const oy = ((((o.dy ?? 0) * par) % H) + H) % H;
    for (let y = -oy; y < 1080; y += H) for (let x = -ox; x < 1920; x += W) ctx.drawImage(c, x, y, W, H);
  };
  draw(layer(seed, 'far', pal), 0.3, 0.7);
  draw(layer(seed + 1, 'mid', pal), 0.6, 0.8);
  ctx.globalAlpha = 1;
  if (o.near) {
    // sparse crisp near details: corner brackets + tiny codes that tick
    const T = o.T ?? 0;
    ctx.font = `700 9px ${F.mono}`;
    for (let i = 0; i < 10; i++) {
      const x = ((hash(seed, i, 5) * 1920 - (o.dx ?? 0)) % 1920 + 1920) % 1920;
      const y = hash(seed, i, 6) * 1080;
      ctx.fillStyle = pal.accent;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, y, 6, 1);
      ctx.fillRect(x, y, 1, 6);
      ctx.fillText(`${Math.floor(hash(seed, i, Math.floor(T * 4)) * 9000 + 1000)}`, x + 8, y + 8);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
