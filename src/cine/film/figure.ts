/**
 * Shared 3D helpers for shots: a pixel-mapped orthographic camera and the
 * opening's printed figure (consciousness link + segmented parallel print).
 */
import * as THREE from 'three/webgpu';
import { abs, float, fract, mix, positionWorld, smoothstep, step, uniform, vec3 } from 'three/tsl';
import type { Frame, Kit } from '../engine';
import { H, W, clamp01, hash } from '../engine';
import { makeBody, POSES } from '../models/body';
import { skinnedPositions } from '../models/slices';
import { contourMaterial } from '../../three/materials';

/**
 * Orthographic camera such that world point `anchor` lands on frame px (x, y)
 * and 1 world unit = `s` px. Camera looks down -Z (or along `dir`).
 */
export function pxOrtho(cam: THREE.OrthographicCamera, x: number, y: number, s: number, anchor = new THREE.Vector3()) {
  cam.left = -x / s;
  cam.right = (W - x) / s;
  cam.top = y / s;
  cam.bottom = -(H - y) / s;
  cam.position.set(anchor.x, anchor.y, anchor.z + 10);
  cam.near = 0.01;
  cam.far = 40;
  cam.updateProjectionMatrix();
}

/**
 * The empty shell in the opening: green link lines come down from above into
 * the head (the consciousness connecting), and the body is printed in four
 * segments at once — each segment hangs from its own print comb, threads run
 * from the comb to the moving front, the strands of the body appear behind it.
 */
export async function printFigure(_k: Kit, o: { color: number; segs?: number }) {
  const NSEG = o.segs ?? 4;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 40);
  const kU = uniform(0);
  const topU = uniform(1.8);
  const segU = uniform(0.45);
  const c = contourMaterial({ line: o.color, body: 0x000000, freq: 46, width: 0.9, axis: 'theta', line2: o.color, axis2: 'y', freq2: 70, width2: 0.5, rim: o.color, rimWidth: 0.5 });
  c.u.lineMix.value = 1;
  const fr = fract(topU.sub(positionWorld.y).div(segU));
  c.mat.opacityNode = step(fr, kU);
  c.mat.alphaTest = 0.5;
  const band = float(1).sub(smoothstep(float(0.0), float(0.03), abs(fr.sub(kU))));
  c.mat.colorNode = mix(c.mat.colorNode as never, vec3(0.85, 1, 0.9), band);
  const body = await makeBody('slim', c.mat);
  body.pose(POSES.stand);
  body.root.rotation.y = 0;
  scene.add(body.root);
  scene.updateMatrixWorld(true);
  // body extents per segment (for the combs)
  const wp = skinnedPositions(body.mesh);
  let ymax = -Infinity;
  let ymin = Infinity;
  for (let i = 1; i < wp.length; i += 3) {
    ymax = Math.max(ymax, wp[i]);
    ymin = Math.min(ymin, wp[i]);
  }
  ymax += 0.01;
  const seg = (ymax - ymin) / NSEG;
  topU.value = ymax;
  segU.value = seg;
  const half: number[] = Array(NSEG).fill(0.05);
  for (let i = 0; i < wp.length; i += 3) {
    const si = Math.min(NSEG - 1, Math.floor((ymax - wp[i + 1]) / seg));
    half[si] = Math.max(half[si], Math.abs(wp[i]));
  }
  const hex = `#${o.color.toString(16).padStart(6, '0')}`;
  return {
    body,
    seg,
    top: ymax,
    /** k: print progress 0..1 (all segments together), link: 0..1 lines grown from above */
    draw(f: Frame, p: { x: number; y: number; h: number; k: number; link: number; t: number }) {
      const s = p.h / 1.8;
      pxOrtho(cam, p.x, p.y, s, new THREE.Vector3(0, 0.9, 0));
      kU.value = p.k >= 1 ? 1.01 : p.k;
      f.three = { scene, camera: cam };
      const fg = f.fg;
      const X = (x: number) => p.x + x * s;
      const Y = (y: number) => p.y - (y - 0.9) * s;
      const lw = Math.max(1, p.h / 260);
      fg.save();
      fg.strokeStyle = hex;
      fg.fillStyle = hex;
      // consciousness link: lines from above into the crown
      if (p.link > 0) {
        const head = Y(ymax);
        const y0 = -20;
        const yEnd = y0 + (head - 6 - y0) * p.link;
        for (let i = 0; i < 7; i++) {
          const xi = X((i - 3) * 0.022);
          const xTop = X((i - 3) * 0.14);
          fg.lineWidth = i === 3 ? lw * 1.6 : lw;
          fg.globalAlpha = 0.9;
          fg.beginPath();
          // straight drop from the top with a kink into the crown
          const ky = y0 + (head - 6 - y0) * 0.72;
          fg.moveTo(xTop, y0);
          if (yEnd < ky) fg.lineTo(xTop, yEnd);
          else {
            fg.lineTo(xTop, ky);
            const kk = clamp01((yEnd - ky) / (head - 6 - ky));
            fg.lineTo(xTop + (xi - xTop) * kk, ky + (head - 6 - ky) * kk);
          }
          fg.stroke();
          // pulses travelling down once connected
          if (p.link >= 1) {
            const ph = (p.t * 1.6 + hash(i, 3)) % 1;
            const py = y0 + (ky - y0) * ph;
            fg.globalAlpha = 1;
            fg.fillStyle = '#e8ffe8';
            fg.fillRect(xTop - lw * 1.5, py, lw * 3, Math.max(4, p.h / 40));
            fg.fillStyle = hex;
          }
        }
        if (p.link >= 1) {
          fg.globalAlpha = 1;
          fg.fillRect(X(-0.08), Y(ymax) - 8 - lw, X(0.08) - X(-0.08), lw * 2);
        }
        fg.globalAlpha = 1;
      }
      // print combs + threads to the moving front
      for (let i = 0; i < NSEG; i++) {
        const yTop = ymax - i * seg;
        const hw = half[i] + 0.035;
        const appear = clamp01((p.t - 0.1 - i * 0.06) / 0.2);
        if (appear <= 0) continue;
        const bw = hw * appear;
        fg.lineWidth = lw * 1.4;
        fg.beginPath();
        fg.moveTo(X(-bw), Y(yTop));
        fg.lineTo(X(bw), Y(yTop));
        // side rails down to the next comb
        fg.moveTo(X(-bw), Y(yTop));
        fg.lineTo(X(-bw), Y(yTop - seg * 0.92));
        fg.moveTo(X(bw), Y(yTop));
        fg.lineTo(X(bw), Y(yTop - seg * 0.92));
        fg.stroke();
        // comb teeth
        const nT = 14;
        fg.lineWidth = lw;
        fg.beginPath();
        for (let j = 0; j < nT; j++) {
          const x = -bw + ((j + 0.5) / nT) * bw * 2;
          fg.moveTo(X(x), Y(yTop));
          fg.lineTo(X(x), Y(yTop) + Math.max(3, p.h / 70));
        }
        fg.stroke();
        // threads from the inner teeth to the front, while printing
        if (p.k > 0 && p.k < 1) {
          const yf = yTop - p.k * seg;
          fg.globalAlpha = 0.75;
          fg.lineWidth = lw * 0.8;
          fg.beginPath();
          for (let j = 3; j < nT - 3; j++) {
            const x = -bw + ((j + 0.5) / nT) * bw * 2;
            const xb = x * 0.55 + Math.sin(j * 1.7 + i) * 0.01;
            fg.moveTo(X(x), Y(yTop) + 3);
            fg.lineTo(X(xb), Y(yf));
          }
          fg.stroke();
          fg.globalAlpha = 1;
          // head of each segment's front
          fg.fillStyle = '#e8ffe8';
          fg.fillRect(X(-hw * 0.6), Y(yf) - lw / 2, X(hw * 0.6) - X(-hw * 0.6), lw);
          fg.fillStyle = hex;
          fg.font = `700 ${Math.max(9, Math.round(p.h / 34))}px "IBM Plex Mono", monospace`;
          fg.fillText(`S${i + 1} ${String(Math.floor(p.k * 100)).padStart(2, '0')}`, X(hw) + 6, Y(yTop) + Math.max(9, p.h / 34));
        }
      }
      // base plate under the feet
      fg.lineWidth = lw * 1.4;
      fg.beginPath();
      fg.moveTo(X(-0.26), Y(ymin - 0.02));
      fg.lineTo(X(0.26), Y(ymin - 0.02));
      fg.stroke();
      fg.restore();
    },
  };
}
