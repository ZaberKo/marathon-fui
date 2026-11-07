/**
 * 1:35–1:48 — the error: cognition runtime error; the previous shell's signal
 * is still on the surface; two instances exist; proceed anyway.
 */
import * as THREE from 'three/webgpu';
import type { C2, ShotDef } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, frameRect, line, microRows, rect, ring, stripes, text, tri } from '../draw';
import { makeBody, type Body } from '../models/body';
import { contourMaterial } from '../../three/materials';
import { ST } from './times';
import { cutGlitch, easeInOutCubic, easeOutExpo, persp, pixelCluster, px, scrollRow, smooth, span, vlabel } from './kit';

const ORANGE = '#fc2c00';

function pixCross(fg: C2, x: number, y: number, u: number) {
  const m = ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'];
  m.forEach((r, j) => r.split('').forEach((c, i) => c === '#' && rect(fg, x + i * u, y + j * u, u, u, '#000')));
  rect(fg, x + u * 1.5, y + u * 1.5, u * 2, u * 2, ORANGE);
}

export const s8: ShotDef[] = [
  {
    id: 'S17',
    t0: ST.S17[0],
    t1: ST.S17[1],
    title: 'Cognition runtime error',
    note: 'Fault = the whole frame floods orange-red. One continuous row on a black band — WARNING_WARNING_… → COGNITION_ → RUNTIME_ → ERROR_, evenly spaced by underscores — giant pixel-font letters are cropped behind it; pixel crosses mark the corners.',
    build: () => ({
      draw(f) {
        const { bg, fg, t } = f;
        rect(bg, 0, 0, 1920, 1080, ORANGE);
        for (let y = 20; y < 1080; y += 60) for (let x = 30; x < 1920; x += 90) rect(bg, x, y, 10, 2, '#e02800');
        const words = [
          [0.0, 'WARNING_', C.yellowHi],
          [0.95, 'COGNITION_', '#1428ff'],
          [1.75, 'RUNTIME_', C.yellowHi],
          [2.35, 'ERROR_', '#1428ff'],
        ] as const;
        const cur = [...words].reverse().find((w) => t >= w[0])!;
        const zoom = 1 + easeInOutCubic(span(t, 2.35, 3.1)) * 0.9;
        fg.save();
        fg.translate(960, 540);
        fg.scale(zoom, zoom);
        fg.translate(-960, -540);
        fg.save();
        fg.beginPath();
        fg.rect(-400, 380, 2720, 330);
        fg.clip();
        text(fg, cur[1] === 'ERROR_' ? 'ERROR' : 'WARNING', -200 - t * 60, 900, { size: 620, family: F.pixel, weight: 400, color: '#000' });
        fg.restore();
        rect(fg, -400, 470, 2720, 140, '#000');
        scrollRow(fg, 590, -t * 300 - 140, [cur[1].replace('_', '')], { size: 120, weight: 800, stretch: 'semi-condensed', color: cur[2] });
        fg.restore();
        pixCross(fg, 120, 170, 30);
        pixCross(fg, 1610, 170, 30);
        pixCross(fg, 120, 760, 30);
        pixCross(fg, 1610, 760, 30);
        ring(fg, 1340, 700, 18, '#000', 5);
        text(fg, '8E S8', 1370, 730, { size: 52, weight: 500, color: '#000' });
        text(fg, 'COG.RT 0x0411', 1320, 790, { size: 30, family: F.mono, weight: 700, color: '#000' });
        stripes(fg, 1680, 0, 240, 120, { period: 30, color: '#000', angle: -45 });
        for (const w of words) if (Math.abs(t - w[0]) < 0.06) cutGlitch(f, t - w[0], 0.06, ['#000', C.yellowHi, '#1428ff'], 21);
        cutGlitch(f, t, 0.12, ['#000', C.yellowHi], 22);
        f.post.lift = 0.3;
        f.post.mottle = 1;
        f.post.tint = [1, 0.4, 0.3];
      },
    }),
  },
  {
    id: 'S18',
    t0: ST.S18[0],
    t1: ST.S18[1],
    title: 'Shell 06 signal',
    note: 'Back to the planet map: a ping rises from the ruins — the dead shell is still transmitting. The map pushes in on the source.',
    build: () => ({
      draw(f) {
        const { fg, t } = f;
        const z = 1 + easeInOutCubic(span(t, 0.6, 3.4)) * 1.8;
        const sx = 1210;
        const sy = 520;
        fg.save();
        fg.translate(960, 540);
        fg.scale(z, z);
        fg.translate(-sx + (sx - 960) * (1 - (z - 1) / 1.8), -sy + (sy - 540) * (1 - (z - 1) / 1.8));
        const pxs = 26;
        for (let y = -200; y < 1300; y += pxs)
          for (let x = -300; x < 2200; x += pxs) {
            const nx = (x - 880) / 760;
            const ny = (y - 520) / 460;
            const v = 1 - Math.hypot(nx, ny) + (hash(Math.floor(x / 52), Math.floor(y / 52)) - 0.5) * 0.5 + (hash(x, y) - 0.5) * 0.15;
            if (v > 0.12 && hash(x, y, 7) > 0.05) rect(fg, x, y, pxs, pxs, '#0c1cf0');
            else if (v > 0.05 && hash(x, y) > 0.7) rect(fg, x, y, pxs, pxs, '#000');
          }
        // ruins site + ping
        for (let i = 0; i < 18; i++) rect(fg, sx - 90 + hash(i, 1) * 180, sy - 60 + hash(i, 2) * 120, 8 + hash(i, 3) * 20, 8 + hash(i, 4) * 20, '#1a2a8a');
        for (let k = 0; k < 3; k++) {
          const r = ((t * 120 + k * 80) % 240) + 10;
          ring(fg, sx, sy, r, `rgba(255,30,40,${1 - r / 250})`, 3);
        }
        rect(fg, sx - 6, sy - 6, 12, 12, C.red);
        fg.restore();
        line(fg, 0, 52, 1920, 52, '#2fd62a', 3);
        text(fg, 'PERIAPT IV · SURFACE SCAN', 96, 110, { size: 22, weight: 800, color: C.white, stretch: 'semi-expanded' });
        if (t > 0.3) {
          const x = 1360;
          frameRect(fg, x, 160, 440, 180, C.red, 2);
          rect(fg, x, 160, 440, 30, C.red);
          text(fg, 'SIGNAL DETECTED', x + 10, 182, { size: 18, weight: 800, color: '#000' });
          microRows(fg, x + 12, 222, ['SOURCE ....... SHELL 06', 'STATUS ....... ACTIVE', 'LAST PSYCHE .. EJECTED', 'OWNER ........ UNKNOWN'], { size: 15, family: F.mono, weight: 700, color: C.red, lh: 21 });
          fg.strokeStyle = C.red;
          fg.lineWidth = 2;
          fg.beginPath();
          for (let x2 = 0; x2 <= 420; x2 += 3) {
            const y = 372 + Math.sin(x2 * 0.15 + t * 14) * 14 * hash(Math.floor(x2 / 9), Math.floor(t * 8));
            if (x2 === 0) fg.moveTo(x + 10 + x2, y);
            else fg.lineTo(x + 10 + x2, y);
          }
          fg.stroke();
        }
        cutGlitch(f, t, 0.12, ['#000', C.red, C.blue], 23);
        f.post.tint = [0.6, 0.6, 1];
      },
    }),
  },
  {
    id: 'S19',
    t0: ST.S19[0],
    t1: ST.S19[1],
    title: 'Instance count: two',
    note: 'Split frame: the new shell (white on cobalt) and the old one (red on black), the same body twice. They turn to face each other across the seam.',
    build: async () => {
      const scene = new THREE.Scene();
      const cam = persp(28);
      const a: Body = await makeBody('runner', contourMaterial({ line: 0xd0dcff, body: 0x0716f8, freq: 32, width: 0.9, rim: 0xffffff, rimWidth: 0.25 }).mat);
      const b: Body = await makeBody('runner', contourMaterial({ line: 0xff2a3a, body: 0x050002, freq: 32, width: 0.9, rim: 0xff4a5a, rimWidth: 0.25 }).mat);
      a.root.position.set(-0.75, 0, 0);
      b.root.position.set(0.75, 0, 0);
      scene.add(a.root, b.root);
      return {
        draw(f) {
          const { bg, fg, t } = f;
          const seam = 960 + Math.sin(t * 9) * 6 * (hash(Math.floor(t * 12)) > 0.7 ? 1 : 0);
          rect(bg, 0, 0, seam, 1080, '#0716f8');
          rect(bg, seam, 0, 1920 - seam, 1080, '#050002');
          a.clip('idle', t + 0.2);
          b.clip('idle', t + 1.4);
          const k = smooth(span(t, 0.4, 1.4));
          a.root.rotation.y = 0.15 + k * 0.9;
          b.root.rotation.y = -0.15 - k * 0.9;
          a.blendPose({ Head: [0, 30, 0] }, k);
          b.blendPose({ Head: [0, -30, 0] }, k);
          cam.position.set(0, 1.2, 4.6 - t * 0.15);
          cam.lookAt(0, 1.05, 0);
          f.three = { scene, camera: cam };
          text(fg, 'SHELL 07', 140, 140, { size: 44, weight: 800, color: C.white, stretch: 'semi-expanded' });
          text(fg, 'PSYCHE 0447 · ONLINE', 140, 172, { size: 15, family: F.mono, weight: 700, color: C.white });
          text(fg, 'SHELL 06', 1780, 140, { size: 44, weight: 800, color: C.red, stretch: 'semi-expanded', align: 'right' });
          text(fg, 'PSYCHE ???? · ACTIVE', 1780, 172, { size: 15, family: F.mono, weight: 700, color: C.red, align: 'right' });
          const n = t < 0.9 ? '01' : '02';
          rect(fg, 760, 860, 400, 120, '#000');
          text(fg, 'INSTANCE COUNT', 780, 900, { size: 20, family: F.mono, weight: 700, color: C.white });
          text(fg, n, 1140, 968, { size: 96, weight: 800, color: n === '02' ? C.red : C.white, align: 'right' });
          if (Math.abs(t - 0.9) < 0.08) cutGlitch(f, t - 0.9 + 0.08, 0.16, [C.red, '#000', C.white], 24);
          cutGlitch(f, t, 0.1, ['#000', C.red, C.blue], 25);
        },
      };
    },
  },
  {
    id: 'S20',
    t0: ST.S20[0],
    t1: ST.S20[1],
    title: 'Suboptimal durability',
    note: 'Restraint after the alarm: a near-empty black frame where durability sliders drop to compromised values and debris drifts. The AI decides to proceed anyway.',
    build: () => ({
      draw(f) {
        const { fg, t } = f;
        const B = '#1a2cf0';
        for (let i = 0; i < 26; i++) {
          const x = 1100 + hash(i, 1) * 700 + t * 20 * (hash(i, 3) - 0.5);
          const y = 100 + hash(i, 2) * 900 + t * 14;
          fg.save();
          fg.translate(x, y);
          fg.rotate(hash(i, 4) * 6 + t * (hash(i, 5) - 0.5));
          fg.fillStyle = hash(i, 6) > 0.5 ? B : '#0a1490';
          fg.beginPath();
          fg.moveTo(0, 0);
          fg.lineTo(30 + hash(i, 7) * 70, 8);
          fg.lineTo(10, 20 + hash(i, 8) * 40);
          fg.fill();
          fg.restore();
        }
        text(fg, 'SUB_OPTIMAL', 200, 300, { size: 92, weight: 600, color: B, stretch: 'semi-condensed' });
        text(fg, 'DURABILITY SETTINGS', 204, 340, { size: 20, weight: 800, color: B });
        const rows: [string, number][] = [['ARMOUR', 0.62], ['MYOMER', 0.71], ['OPTICS', 0.88], ['COGNITION', 0.54], ['PAIN DAMPING', 0.4]];
        rows.forEach(([name, target], i) => {
          const y = 430 + i * 92;
          const k = easeOutExpo(span(t, 0.5 + i * 0.25, 1.4 + i * 0.25));
          const v = 1 - (1 - target) * k;
          text(fg, name, 204, y, { size: 18, family: F.mono, weight: 700, color: '#6a7aff' });
          rect(fg, 204, y + 12, 700, 14, '#060c40');
          rect(fg, 204, y + 12, 700 * v, 14, v < 0.6 ? C.red : B);
          for (let q = 0; q < 20; q++) rect(fg, 204 + q * 35, y + 12, 1, 14, '#000');
          text(fg, `${String(Math.round(v * 100)).padStart(3, '0')}%`, 924, y + 26, { size: 18, family: F.mono, weight: 700, color: v < 0.6 ? C.red : '#6a7aff' });
        });
        pixelCluster(fg, 1640, 160, 14, B, 31);
        if (t > 2.6) for (let i = 0; i < 14; i++) tri(fg, 150 + i * 120 + (i % 2) * 40, 980 - (i % 3) * 30, 22, '#2a8a10');
        vlabel(fg, 'PROCEED', 1840, 640, 40, '#2ee866', { weight: 800 });
        cutGlitch(f, t, 0.1, ['#000', B], 26);
        f.post.lift = 0.6;
        void clamp01;
        void px;
      },
    }),
  },
];
