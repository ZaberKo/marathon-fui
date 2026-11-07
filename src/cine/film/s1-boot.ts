/**
 * 0:00–0:11 — boot, INITIATING, defragmentation ring.
 */
import * as THREE from 'three/webgpu';
import type { Frame, ShotDef } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, checker, dashStack, microRows, plus, rect, scanlines, text } from '../draw';
import { backdrop } from '../backdrop';
import { defragSort } from '../rings';
import { ST } from './times';
import { printFigure } from './figure';
import { canvasPlane, cutGlitch, easeInOutCubic, easeOutExpo, persp, smooth, span, typeOn } from './kit';

const MINT = C.mint;

/* ---------------------------------------------------------------- */
/* INITIATING composition (logical layout at zoom 1)                 */
/* ---------------------------------------------------------------- */
function initiating(f: Frame, slide: number, zoom: number, zx: number, zy: number, t: number) {
  const { fg, bg } = f;
  const set = (ctx: CanvasRenderingContext2D) => ctx.setTransform(zoom, 0, 0, zoom, 960 - zx * zoom + slide * zoom, 540 - zy * zoom);
  set(bg);
  bg.fillStyle = '#000';
  bg.beginPath();
  bg.arc(940, 548, 150, 0, Math.PI * 2);
  bg.fill();
  bg.setTransform(1, 0, 0, 1, 0, 0);
  set(fg);
  const micro = { size: 17, family: F.mono, weight: 400, color: MINT, lh: 20 } as const;
  const rows = ['3S  K   3S  K   3S  K', '3S  UV  3S  UV  3S  UV'];
  microRows(fg, 825, 368, rows, micro);
  microRows(fg, 825, 718, rows, micro);
  microRows(fg, 1255, 718, rows, micro);
  dashStack(fg, 1190, 292, 2, 6, 46, 9, 9, MINT, 4, 3);
  checker(fg, 1362, 297, 2, 2, 46, MINT, true);
  scanlines(fg, 1362, 297, 92, 92, { gap: 3, alpha: 0.35 });
  const outline = t > 0.45 && t < 0.62 && hash(Math.floor(t * 30)) < 0.6;
  fg.save();
  fg.translate(1162, 440);
  fg.rotate(Math.PI / 2);
  const n = Math.min(10, Math.floor(t * 40));
  text(fg, 'INITIATING'.slice(0, n), 0, 0, { size: 96, weight: 800, stretch: 'extra-condensed', color: MINT, stroke: outline ? 2 : 0, tracking: 1 });
  fg.restore();
  rect(fg, 1250, 437, 8, 233, MINT);
  fg.fillStyle = C.blue;
  fg.fillRect(1262, 437, 380, 233);
  [1642, 1660, 1678, 1696, 1714, 1732, 1750].forEach((x, i) => fg.fillRect(x, 470 + i * 9, 18, 200 - i * 9));
  rect(fg, 1262, 468, 380, 3, '#000');
  rect(fg, 1262, 497, 500, 10, '#000');
  rect(fg, 1480, 548, 130, 14, '#000');
  rect(fg, 1262, 690, 470, 10, C.blue);
  rect(fg, 1540 + (Math.floor(t * 6) % 3) * 40, 690, 36, 10, MINT);
  // a marker that sweeps the slab (smooth, not stepped)
  const mx = 1270 + ((t * 420) % 360);
  rect(fg, mx, 437, 8, 60, MINT);
  scanlines(fg, 1262, 437, 500, 263, { gap: 3, alpha: 0.28 });
  fg.setTransform(1, 0, 0, 1, 0, 0);
}

export const s1: ShotDef[] = [
  {
    id: 'S00',
    t0: ST.S00[0],
    t1: ST.S00[1],
    title: 'Boot',
    note: 'Silence and a screen waking up: the block mask fades in, the boot log types, three blips land on the score’s clicks.',
    build: () => ({
      draw(f) {
        const { fg, t } = f;
        f.post.lift = 0.15 + 0.55 * span(t, 0, 3.5);
        f.post.vignette = 0.8;
        const log = [
          [0.3, 'ORA//RUNTIME 7.04 · FACILITY 3'],
          [0.85, '> LINK BUFFER ........... OK'],
          [1.35, '> SHELL BAY 07 .......... ARMED'],
          [1.9, '> PSYCHE CACHE .......... 1 ITEM'],
          [2.5, '> DEFRAG QUEUE .......... READY'],
        ] as const;
        log.forEach(([at, s], i) => typeOn(fg, s, 92, 120 + i * 26, t - at, 60, { size: 16, family: F.mono, weight: 400, color: i === 0 ? MINT : '#5a6aa8' }));
        for (const b of [0.6, 1.2, 1.5]) if (t > b && t < b + 0.12) rect(fg, 957, 537, 6, 6, MINT);
        if (t > 2.9) {
          const w = 1400 * easeOutExpo(span(t, 2.9, 3.4));
          rect(fg, 960 - w / 2, 540, w, 1, '#2a3cff');
        }
        if (t > 3.55 && Math.floor(t * 16) % 2 === 0) text(fg, 'INITIATING', 960, 530, { size: 13, family: F.mono, weight: 700, color: MINT, align: 'center', tracking: 4 });
      },
    }),
  },
  {
    id: 'S01',
    t0: ST.S01[0],
    t1: ST.S01[1],
    title: 'Initiating',
    note: 'The slab slams in on the boom. Green link lines drop from above into the crown of the empty shell — the consciousness connecting — while the body prints in four segments at once, each hanging from its own comb. A camera push isolates the print.',
    build: async (k) => {
      const fig = await printFigure(k, { color: 0x2ee866 });
      return {
        draw(f) {
          const { t } = f;
          backdrop(f.bg, { seed: 11, dx: t * 30, alpha: 0.9 });
          const slide = 420 * (1 - easeOutExpo(clamp01(t / 0.7))) - 30 * t;
          const zk = easeInOutCubic(span(t, 2.4, 2.8));
          const zoom = 1 + 1.25 * zk;
          const zx = 960 + (990 - 960) * zk;
          const zy = 540 + (540 - 540) * zk;
          initiating(f, slide, zoom, zx, zy, t);
          const figX = 960 + (937 + slide - zx) * zoom;
          const figY = 540 + (540 - zy) * zoom;
          fig.draw(f, { x: figX, y: figY, h: 220 * zoom, k: smooth(span(t, 0.35, 3.55)), link: easeOutExpo(span(t, 0.05, 0.55)), t });
          f.fg.setTransform(1, 0, 0, 1, 0, 0);
          cutGlitch(f, t, 0.1, ['#000', C.blue, MINT], 4);
        },
      };
    },
  },
  {
    id: 'S02',
    t0: ST.S02[0],
    t1: ST.S02[1],
    title: 'Defragmentation ring',
    note: 'Memory blocks are lifted out of the ring, travel, and drop back sorted — defragmentation shown literally. The ring is a texture on a plane in 3D so the camera can tilt through it.',
    build: () => {
      const scene = new THREE.Scene();
      const cam = persp(34);
      const ring = canvasPlane(7, 7, 1536);
      scene.add(ring.mesh);
      const outer = canvasPlane(9, 9, 1024, { additive: true });
      outer.mesh.position.z = -0.8;
      scene.add(outer.mesh);
      // outer plate: thin arcs + ticks (static)
      {
        const c = outer.ctx;
        const R = outer.cv.width / 2;
        c.translate(R, R);
        c.strokeStyle = '#1cb445';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(0, 0, R * 0.96, -2.3, -1.5);
        c.stroke();
        c.lineWidth = 1.5;
        for (let i = 0; i < 180; i++) {
          const a = (i / 180) * Math.PI * 2;
          const l = i % 10 === 0 ? 18 : 7;
          c.globalAlpha = 0.6;
          c.beginPath();
          c.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9);
          c.lineTo(Math.cos(a) * (R * 0.9 - l), Math.sin(a) * (R * 0.9 - l));
          c.stroke();
        }
        outer.tex.needsUpdate = true;
      }
      return {
        draw(f) {
          const { t, fg } = f;
          const k = clamp01(t / 3.1);
          const c = ring.ctx;
          const R = ring.cv.width / 2;
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.clearRect(0, 0, ring.cv.width, ring.cv.height);
          defragSort(c, { cx: R, cy: R, scale: R * 0.42, rot: 0, seed: 7, k, colors: [C.blue, C.green], hatch: '#0b5a28', notch: '#000', lift: '#e8ecff' });
          // label strip riding the ring
          c.save();
          c.translate(R, R);
          c.rotate(-0.12);
          c.fillStyle = '#000';
          c.fillRect(R * 0.05, -26, R * 0.95, 34);
          c.font = `800 26px ${F.sans}`;
          c.fillStyle = C.mint;
          c.fillText('DEFRAGMENTATION'.slice(0, Math.floor(span(t, 0.3, 1.2) * 15)), R * 0.42, 0);
          c.font = `700 11px ${F.mono}`;
          c.fillStyle = C.blue;
          c.fillText('108 001  02 01 · SEG 0447', R * 0.42, -40);
          c.restore();
          ring.tex.needsUpdate = true;
          ring.mesh.rotation.z = 0.25 - t * 0.09;
          outer.mesh.rotation.z = t * 0.05;
          const u = easeInOutCubic(clamp01(t / 3.6));
          cam.position.set(2.6 - 2.3 * u, -3.4 + 2.9 * u, 7.4 - 2.1 * u);
          cam.lookAt(0.5 * u, 0, 0);
          f.three = { scene, camera: cam };
          for (const [x, y] of [[260, 176], [1680, 190], [260, 905], [1680, 880]] as const) plus(fg, x, y, 22, C.magenta, 3);
          const pct = Math.floor(k * 100);
          text(fg, `DEFRAG ${String(pct).padStart(3, '0')}%`, 1640, 1000, { size: 16, family: F.mono, weight: 700, color: C.mint, align: 'right' });
          if (t > 2.2) {
            typeOn(fg, 'PROTOCOL', 1080, 900, t - 2.2, 18, { size: 120, weight: 600, family: F.mono, color: C.mint, stroke: 2.5, tracking: 4 });
          }
          cutGlitch(f, t, 0.08, ['#000', C.green, C.blue], 5);
          f.post.lift = 0.8;
        },
      };
    },
  },
];
