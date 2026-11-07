/**
 * A flat floor carrying large painted graphics in the Marathon manner: giant
 * stencil numerals, hazard bands, barcode rows, a calibration ring, grid,
 * registration marks and small labels. Two palettes share one layout so a scan
 * can re-colour the floor as it passes (yellow → cobalt).
 */
import * as THREE from 'three/webgpu';
import { float, length, mix, positionWorld, smoothstep, step, texture, uniform, uv, vec2 } from 'three/tsl';
import { hash } from '../engine';
import { F } from '../draw';

export type FloorPal = { base: string; ink1: string; ink2: string; ink3: string; grid: string };
export const FLOOR_YELLOW: FloorPal = { base: '#f2df10', ink1: '#1428ff', ink2: '#000000', ink3: '#ffffff', grid: 'rgba(0,0,0,0.22)' };
export const FLOOR_BLUE: FloorPal = { base: '#1a2cff', ink1: '#0a1290', ink2: '#000000', ink3: '#f2df10', grid: 'rgba(0,0,0,0.3)' };

/** paint the layout; `px` = canvas pixels per metre, origin at the canvas centre */
export function paintFloor(cv: HTMLCanvasElement, pal: FloorPal, seed = 7) {
  const c = cv.getContext('2d')!;
  const S = cv.width;
  const m = S / 4; // 4 m square
  const r = (...k: number[]) => hash(seed, ...k);
  c.fillStyle = pal.base;
  c.fillRect(0, 0, S, S);
  // big ink fields
  c.fillStyle = pal.ink1;
  c.fillRect(0, S * 0.66, S, S * 0.09);
  c.fillRect(S * 0.08, 0, S * 0.07, S * 0.66);
  // giant stencil numerals
  c.save();
  c.translate(S * 0.62, S * 0.42);
  c.rotate(-0.22);
  c.font = `800 ${Math.round(m * 1.9)}px ${F.sans}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = pal.ink1;
  c.fillText('07', 0, 0);
  // stencil bridges
  c.fillStyle = pal.base;
  c.fillRect(-m * 0.95, -m * 0.04, m * 1.9, m * 0.07);
  c.restore();
  c.save();
  c.translate(S * 0.22, S * 0.22);
  c.rotate(0.1);
  c.font = `800 ${Math.round(m * 1.2)}px ${F.sans}`;
  c.fillStyle = pal.ink1;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('R', 0, 0);
  c.restore();
  // hazard bands
  const hazard = (x: number, y: number, w: number, h: number, ang: number) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    c.fillStyle = pal.ink2;
    for (let k = -h; k < w + h; k += m * 0.12) {
      c.beginPath();
      c.moveTo(k, 0);
      c.lineTo(k + m * 0.06, 0);
      c.lineTo(k + m * 0.06 - h, h);
      c.lineTo(k - h, h);
      c.fill();
    }
    c.restore();
  };
  hazard(S * 0.0, S * 0.58, S, m * 0.16, 0);
  hazard(S * 0.74, S * 0.0, m * 0.2, S * 0.58, 0);
  hazard(S * 0.18, S * 0.86, m * 1.6, m * 0.12, -0.05);
  // barcode rows (rows of bars of random lengths)
  const rows = (x: number, y: number, w: number, n: number, rh: number, k0: number) => {
    c.fillStyle = pal.ink2;
    for (let i = 0; i < n; i++) {
      let xx = x;
      let j = 0;
      while (xx < x + w) {
        const bw = (0.05 + r(k0, i, j, 1) * 0.3) * m;
        if (r(k0, i, j, 2) > 0.3) c.fillRect(xx, y + i * rh * 1.6, Math.min(bw, x + w - xx), rh);
        xx += bw + m * 0.03;
        j++;
      }
    }
  };
  rows(S * 0.3, S * 0.77, S * 0.6, 8, m * 0.05, 1);
  rows(S * 0.2, S * 0.05, S * 0.5, 5, m * 0.04, 2);
  // dense bands behind the test position (what the camera sees past the hand)
  rows(S * 0.18, S * 0.3, S * 0.26, 10, m * 0.028, 3);
  rows(S * 0.56, S * 0.24, S * 0.3, 6, m * 0.035, 4);
  hazard(S * 0.3, S * 0.18, m * 1.2, m * 0.09, 0.0);
  hazard(S * 0.47, S * 0.36, m * 0.09, m * 0.5, 0.0);
  c.fillStyle = pal.ink2;
  for (let i = 0; i < 9; i++) c.fillRect(S * 0.36 + i * m * 0.07, S * 0.4, m * 0.035, m * 0.22);
  c.fillStyle = pal.ink3;
  c.font = `800 ${Math.round(m * 0.34)}px ${F.sans}`;
  c.fillText('EVAL 2', S * 0.56, S * 0.33);
  // fine grid
  c.strokeStyle = pal.grid;
  c.lineWidth = 2;
  c.beginPath();
  for (let x = 0; x <= S; x += m / 8) {
    c.moveTo(x, 0);
    c.lineTo(x, S);
    c.moveTo(0, x);
    c.lineTo(S, x);
  }
  c.stroke();
  // calibration ring under the test position (canvas centre)
  c.strokeStyle = pal.ink2;
  c.lineWidth = m * 0.022;
  c.beginPath();
  c.arc(S / 2, S / 2, m * 0.62, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = m * 0.008;
  c.beginPath();
  c.arc(S / 2, S / 2, m * 0.5, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const l = i % 6 === 0 ? 0.1 : 0.045;
    c.beginPath();
    c.moveTo(S / 2 + Math.cos(a) * m * 0.66, S / 2 + Math.sin(a) * m * 0.66);
    c.lineTo(S / 2 + Math.cos(a) * m * (0.66 + l), S / 2 + Math.sin(a) * m * (0.66 + l));
    c.stroke();
  }
  // registration marks and labels
  c.fillStyle = pal.ink2;
  for (let i = 0; i < 14; i++) {
    const x = r(i, 5) * S;
    const y = r(i, 6) * S;
    c.fillRect(x - m * 0.06, y - m * 0.006, m * 0.12, m * 0.012);
    c.fillRect(x - m * 0.006, y - m * 0.06, m * 0.012, m * 0.12);
  }
  c.font = `700 ${Math.round(m * 0.07)}px ${F.mono}`;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  const labels = ['SHELL BAY 07', 'EVAL ZONE · R-ARM', 'LOAD ≤ 220 KG', 'KEEP CLEAR', 'CAL 0.25 MM', 'ORA//RT 7.04'];
  labels.forEach((t, i) => {
    c.fillStyle = i % 2 ? pal.ink2 : pal.ink3;
    c.save();
    c.translate(r(i, 7) * S * 0.8 + S * 0.05, r(i, 8) * S * 0.9 + S * 0.05);
    c.rotate(i % 3 === 0 ? -Math.PI / 2 : 0);
    c.fillText(t, 0, 0);
    c.restore();
  });
  // checker blocks
  for (let i = 0; i < 4; i++) {
    const x = r(i, 9) * S * 0.9;
    const y = r(i, 10) * S * 0.9;
    const q = m * 0.08;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if ((a + b) % 2 === 0) c.fillRect(x + a * q, y + b * q, q, q);
  }
  // white arrows toward the ring
  c.fillStyle = pal.ink3;
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate(S * 0.5 + (i - 1) * m * 0.3, S * 0.5 + m * 0.95);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(m * 0.1, m * 0.12);
    c.lineTo(m * 0.05, m * 0.12);
    c.lineTo(0, m * 0.06);
    c.lineTo(-m * 0.05, m * 0.12);
    c.lineTo(-m * 0.1, m * 0.12);
    c.closePath();
    c.fill();
    c.restore();
  }
}

/** A 4 m flat floor (centre at origin, y = 0) re-coloured A → B where world x < sweep. */
export function graphicFloor(o: { size?: number; res?: number; seed?: number; a?: FloorPal; b?: FloorPal } = {}) {
  const size = o.size ?? 4;
  const res = o.res ?? 2048;
  const mk = (pal: FloorPal) => {
    const cv = document.createElement('canvas');
    cv.width = res;
    cv.height = res;
    paintFloor(cv, pal, o.seed ?? 7);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const ta = mk(o.a ?? FLOOR_YELLOW);
  const tb = mk(o.b ?? FLOOR_BLUE);
  const sweep = uniform(-1e3);
  const m = new THREE.MeshBasicNodeMaterial();
  const u = uv();
  const ca = texture(ta, u);
  const cb = texture(tb, u);
  const fade = float(1).sub(smoothstep(float(size * 0.18), float(size * 0.55), length(vec2(positionWorld.x, positionWorld.z))).mul(0.55));
  m.colorNode = mix(ca, cb, step(positionWorld.x, sweep)).rgb.mul(fade);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, sweep };
}
