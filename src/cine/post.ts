/**
 * Global screen layers composited by the browser over bg/3D/fg:
 *
 *  - block mask (mix-blend: screen): a uniform mosaic of square cells with
 *    random near-black luminance, two scales (24 px + 6 px), a few cells tinted.
 *    It is what makes the reference's blacks read as a *screen* rather than as
 *    empty space — the "uniform noise mask".
 *  - shade mask (mix-blend: multiply): the same mosaic inverted, very weak, so
 *    flat colour fields get a mottled, printed feel instead of a clean fill.
 *  - grain (overlay): per-pixel noise tile, jittered every frame.
 *  - scanlines (multiply) + vignette (multiply): CSS gradients.
 *
 * Shots tune it per frame through `Frame.post`.
 */
import { hash } from './engine';

export type PostParams = {
  /** 0..1 strength of the dark block mosaic lifting the blacks */
  lift: number;
  /** 0..1 strength of the mottling on bright areas */
  mottle: number;
  /** rgb 0..1 tint of the mosaic */
  tint: [number, number, number];
  /** 0..1 */
  grain: number;
  scan: number;
  vignette: number;
  /** mosaic refresh rate */
  fps: number;
};

export const POST_DEFAULT: PostParams = { lift: 0.75, mottle: 0.45, tint: [0.55, 0.6, 1], grain: 0.5, scan: 0.35, vignette: 0.55, fps: 8 };

const CW = 320;
const CH = 180;

export function createPost(frameEl: HTMLElement) {
  const mk = (cls: string) => {
    const c = document.createElement('canvas');
    c.width = CW;
    c.height = CH;
    c.className = `cine-post ${cls}`;
    frameEl.appendChild(c);
    return c;
  };
  const lift = mk('cine-post--lift');
  const mott = mk('cine-post--mottle');
  const lctx = lift.getContext('2d')!;
  const mctx = mott.getContext('2d')!;
  const lImg = lctx.createImageData(CW, CH);
  const mImg = mctx.createImageData(CW, CH);

  // grain tile
  const g = document.createElement('canvas');
  g.width = 256;
  g.height = 256;
  const gctx = g.getContext('2d')!;
  const gi = gctx.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = Math.floor(hash(i, 7) * 255);
    gi.data[i * 4] = v;
    gi.data[i * 4 + 1] = v;
    gi.data[i * 4 + 2] = v;
    gi.data[i * 4 + 3] = 255;
  }
  gctx.putImageData(gi, 0, 0);
  const grain = document.createElement('div');
  grain.className = 'cine-post cine-post--grain';
  grain.style.backgroundImage = `url(${g.toDataURL()})`;
  frameEl.appendChild(grain);
  const scan = document.createElement('div');
  scan.className = 'cine-post cine-post--scan';
  frameEl.appendChild(scan);
  const vig = document.createElement('div');
  vig.className = 'cine-post cine-post--vignette';
  frameEl.appendChild(vig);

  let lastStep = -1;
  let lastKey = '';
  return {
    update(T: number, p: PostParams) {
      const step = Math.floor(T * p.fps);
      const key = `${step}:${p.lift.toFixed(2)}:${p.mottle.toFixed(2)}:${p.tint.join()}`;
      if (key !== lastKey) {
        lastKey = key;
        const big = Math.floor(step / 3);
        const L = lImg.data;
        const M = mImg.data;
        for (let j = 0; j < CH; j++)
          for (let i = 0; i < CW; i++) {
            const k = (j * CW + i) * 4;
            // 24px blocks (4×4 cells) drift slowly, 6px cells flicker
            const b = hash(i >> 2, j >> 2, big);
            const s = hash(i, j, step);
            const bb = b * b;
            let v = bb * 0.7 + s * s * s * 0.3;
            if (b > 0.985) v += 0.9; // rare bright block
            if (s > 0.9993) v += 2.2; // dust speck
            const tinted = hash(i >> 2, j >> 2, big, 3) > 0.82;
            const a = v * p.lift * 26;
            L[k] = Math.min(255, a * (tinted ? p.tint[0] * 0.6 : p.tint[0]));
            L[k + 1] = Math.min(255, a * (tinted ? p.tint[1] * 0.6 : p.tint[1]));
            L[k + 2] = Math.min(255, a * (tinted ? 1.6 : p.tint[2]));
            L[k + 3] = 255;
            const m = 255 - (bb * 0.75 + s * 0.25) * p.mottle * 34;
            M[k] = m;
            M[k + 1] = m;
            M[k + 2] = m;
            M[k + 3] = 255;
          }
        lctx.putImageData(lImg, 0, 0);
        mctx.putImageData(mImg, 0, 0);
      }
      if (step !== lastStep) lastStep = step;
      grain.style.opacity = String(p.grain * 0.22);
      grain.style.backgroundPosition = `${Math.floor(hash(T * 24, 1) * 256)}px ${Math.floor(hash(T * 24, 2) * 256)}px`;
      scan.style.opacity = String(p.scan * 0.5);
      vig.style.opacity = String(p.vignette);
    },
  };
}
