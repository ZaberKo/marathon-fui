/**
 * Evaluation: vital signs (anatomy plate), recognition response (lime plate).
 */
import type { ShotDef } from '../engine';
import { hash } from '../engine';
import { C, F, checker, dashStack, line, microRows, rect, ring, scanlines, text } from '../draw';
import { backdrop, PAL_BLUE, PAL_GREEN } from '../backdrop';
import { ANAT_BLUE, ANAT_LIME, anatomyFigure, drawFigure, rasterFigure, toPx, type Place } from '../anatomy2d';
import { cutGlitch, easeInOutCubic, span } from './kit';
import { ST } from './times';

export const s2: ShotDef[] = [
  /* ---------------------------------------------------------------- */
  /* ---------------------------------------------------------------- */
  {
    id: 'S03',
    t0: ST.S03[0],
    t1: ST.S03[1],
    title: 'Vital signs',
    note: 'An anatomical plate in smooth 2D line work: nerve bundles of many strands in several colours (fanning into fingers and toes), muscles filled with fibre lines, hatched organs, the brain and the optic pathway. Signals run out along the nerves, muscle groups light in sequence, a scan band travels down, a heart trace runs beside it.',
    build: async () => {
      const fig = await anatomyFigure();
      const s = 500;
      rasterFigure(fig, s, ANAT_BLUE);
      const pl: Place = { x: 960 + fig.x0 * s, y: 60, s };
      const tags: [string, number, string][] = [
        ['PEC.L', 1, 'MUSC'], ['DELT.R', -1, 'MUSC'], ['BICEP.L', 1, 'MUSC'], ['OBL.R', -1, 'CORE'], ['VLAT.L', 1, 'MUSC'], ['TIB.R', -1, 'MUSC'],
      ];
      return {
        draw(f) {
          const { bg, fg, t } = f;
          backdrop(bg, { seed: 41, dx: t * 20, alpha: 0.8, pal: PAL_BLUE });
          ring(bg, 960, 640, 470, C.blue, 34);
          ring(bg, 960, 640, 430, '#0a1490', 2);
          const groups = ['chest', 'shoulder', 'arm', 'core', 'leg'];
          const gi = Math.floor((t - 0.5) / 0.55);
          const flash = gi >= 0 && gi < groups.length ? [groups[gi]] : [];
          drawFigure(fg, fig, pl, ANAT_BLUE, t, { pulse: 0, flash, scanY: 60 + span(t, 0.3, 3.8) * 940 });
          // heart pulse
          const beat = Math.max(0, 1 - ((t * 1.05) % 1) * 4);
          const hp = toPx(fig, pl, fig.heart);
          ring(fg, hp[0], hp[1], 16 + beat * 12, C.red, 2);
          // tags with leaders
          tags.forEach(([name, side, kind], i) => {
            if (t < 0.4 + i * 0.25) return;
            const mu = fig.muscles.find((m) => m.name === name);
            if (!mu) return;
            const c: [number, number] = [mu.poly.reduce((a, q) => a + q[0], 0) / mu.poly.length, mu.poly.reduce((a, q) => a + q[1], 0) / mu.poly.length];
            const p = toPx(fig, pl, c);
            const lx = side > 0 ? 1290 : 520;
            const ly = 230 + i * 120;
            line(fg, p[0], p[1], lx + (side > 0 ? 0 : 150), ly, '#b4c2ff', 1);
            rect(fg, p[0] - 3, p[1] - 3, 6, 6, C.white);
            const val = 90 + Math.floor(hash(i, Math.floor(t * 6)) * 9);
            rect(fg, lx, ly - 15, 150, 21, '#b4c2ff');
            text(fg, `${name} ${kind}`, lx + 5, ly, { size: 13, family: F.mono, weight: 700, color: '#000' });
            text(fg, `${val}%`, lx + 154, ly, { size: 13, family: F.mono, weight: 700, color: '#b4c2ff' });
          });
          // ECG
          const ex = 1480;
          const ey = 820;
          rect(fg, ex, ey - 70, 330, 140, 'rgba(0,4,40,0.7)');
          fg.strokeStyle = C.red;
          fg.lineWidth = 2;
          fg.beginPath();
          for (let x = 0; x <= 320; x += 2) {
            const ph = ((x / 320) * 2.6 + t * 1.05) % 1;
            const y = ph > 0.42 && ph < 0.47 ? -50 : ph > 0.47 && ph < 0.5 ? 26 : ph > 0.6 && ph < 0.7 ? -10 * Math.sin((ph - 0.6) * 31) : 0;
            if (x === 0) fg.moveTo(ex + 5 + x, ey + y);
            else fg.lineTo(ex + 5 + x, ey + y);
          }
          fg.stroke();
          text(fg, 'BPM 058  ·  SPO2 97  ·  NRV 4.4M/S', ex, ey + 92, { size: 13, family: F.mono, weight: 700, color: '#b4c2ff' });
          text(fg, 'VITAL SIGNS', ex, ey - 82, { size: 22, weight: 800, color: C.white, stretch: 'semi-expanded' });
          cutGlitch(f, t, 0.1, ['#000', C.blue], 7);
          f.post.lift = 0.85;
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S04',
    t0: ST.S04[0],
    t1: ST.S04[1],
    title: 'Recognition response',
    note: 'Same plate, lime skin, close: the eyes track a stimulus with a measured lag; the vertical RESPONSE label resolves into an OK plate. Framed by the boot slab pieces — the kit is one system across shots.',
    build: async () => {
      const fig = await anatomyFigure();
      const crop: [number, number, number, number] = [-0.38, 0.98, 0.38, 1.86];
      const s = 1120;
      rasterFigure(fig, s, ANAT_LIME, crop);
      const pl: Place = { x: 470, y: 60, s, crop };
      return {
        draw(f) {
          const { bg, fg, t } = f;
          backdrop(bg, { seed: 51, dx: t * 24, alpha: 0.7, pal: PAL_GREEN });
          ring(bg, 900, 700, 560, C.blue, 30, Math.PI * 0.55, Math.PI * 1.55);
          drawFigure(fg, fig, pl, ANAT_LIME, t, { pulse: 0.3, nerveAlpha: 0.8 });
          // eye tracking: a stimulus sweeps, the optic rings follow with lag
          const stim = 960 + Math.sin(t * 2.6) * 220 * (t < 3.0 ? 1 : 0.2);
          const stimY = 250 + Math.cos(t * 1.7) * 30;
          const lag = Math.sin((t - 0.21) * 2.6) * 220 * (t < 3.0 ? 1 : 0.2);
          rect(fg, stim - 6, stimY - 6, 12, 12, C.white);
          line(fg, stim, stimY - 20, stim, stimY + 20, C.white, 1);
          for (const n of ['LeftEye', 'RightEye']) {
            const e = toPx(fig, pl, fig.J(n));
            const off = (lag / 220) * 6;
            ring(fg, e[0] + off, e[1], 9, C.white, 2);
            ring(fg, e[0] + off, e[1], 18, '#2a40ff', 1.5);
            line(fg, e[0] + off, e[1], stim, stimY, 'rgba(255,255,255,0.35)', 1);
          }
          text(fg, `RT ${String(180 + Math.floor(hash(Math.floor(t * 5)) * 60)).padStart(3, '0')} MS`, stim + 16, stimY - 12, { size: 13, family: F.mono, weight: 700, color: C.white });
          // right column: boot slab pieces
          dashStack(fg, 1190, 60, 2, 5, 40, 8, 8, C.mint, 7, 3);
          checker(fg, 1360, 70, 2, 2, 30, C.mint, true);
          dashStack(fg, 1190, 900, 2, 5, 40, 8, 8, C.mint, 8, 3);
          checker(fg, 1360, 910, 2, 2, 30, C.mint, true);
          rect(fg, 1428, 0, 10, 1080, C.blue);
          rect(fg, 1448, 0, 220, 1080, C.blue);
          [1668, 1700, 1732].forEach((x, i) => {
            for (let k = 0; k < 14; k++) if (hash(i, k) > 0.45 + i * 0.12) rect(fg, x, k * 78, 32, 40 + hash(k, i) * 38, C.blue);
          });
          scanlines(fg, 1428, 0, 400, 1080, { gap: 3, alpha: 0.3 });
          const ok = t > 3.25;
          fg.save();
          fg.translate(1290, 300);
          fg.rotate(Math.PI / 2);
          if (ok) {
            rect(fg, -10, -96, 170, 110, C.mint);
            text(fg, 'OK', 12, 0, { size: 100, weight: 800, color: '#000', stretch: 'expanded' });
          } else text(fg, 'RESPONSE', 0, 0, { size: 60, weight: 800, color: C.mint, stretch: 'semi-expanded', tracking: 4 });
          fg.restore();
          microRows(fg, 1080, 590, ['QR  EXC  FF ■', 'SDR17  2445566'], { size: 12, family: F.mono, weight: 700, color: C.white, lh: 14 });
          cutGlitch(f, t, 0.1, ['#000', C.lime, C.blue], 8);
          f.post.tint = [0.5, 1, 0.5];
          f.post.lift = 0.7;
          void easeInOutCubic;
        },
      };
    },
  },
];
