/**
 * 0:00–0:11 — boot, INITIATING, defragmentation ring.
 */
import type { Frame, ShotDef } from '../engine';
import { FPS, q } from '../engine';
import { C, F, checker, dashStack, kDots, line, microRows, rect, text } from '../draw';
import { SCAN_BLOCK, scanBlockFrame } from '../../lib/scanBlock';
import { backdrop } from '../backdrop';
import { protocolDial, protocolFlash } from '../rings';
import { ST } from './times';
import { printFigure } from './figure';
import { easeInOutCubic, easeOutExpo, smooth, span, typeOn } from './kit';

const MINT = C.mint;

function shellLink(f: Frame, x: number, y: number, progress: number) {
  const { fg, t } = f;
  const left = 176;
  const yy = y + 114;
  const to = Math.max(left + 285, x - 54);
  const sweep = left + (to - left) * progress;
  const locked = progress >= 1;
  kDots(fg, left, yy - 122, 5, 2, 16, 2.7, C.blueHi);
  text(fg, 'PSYCHE LINK', left, yy - 50, { size: 40, weight: 800, color: MINT, stretch: 'condensed' });
  text(fg, 'CACHE 0447 / SHELL 07', left, yy - 21, { size: 16, family: F.mono, color: MINT });
  line(fg, left, yy, to, yy, C.blueDim, 2);
  line(fg, left, yy, sweep, yy, MINT, 2);
  fg.fillStyle = MINT;
  fg.fillRect(sweep - 5, yy - 4, 10, 8);
  if (locked) line(fg, to, yy, x - 34, yy - 20, MINT, 2);
  text(fg, locked ? 'LOCKED · DEFRAG QUEUED' : 'ACQUIRING SHELL', left, yy + 30, {
    size: 15, family: F.mono, color: locked ? C.white : MINT, alpha: !locked && Math.floor(t * 12) % 4 === 0 ? 0.5 : 1,
  });
}

/* ---------------------------------------------------------------- */
/* INITIATING composition (logical layout at zoom 1)                 */
/* ---------------------------------------------------------------- */
function initiating(f: Frame, slide: number, zoom: number, zx: number, zy: number, t: number) {
  const { fg } = f;
  const frame = Math.floor(t * SCAN_BLOCK.fps);
  fg.save();
  fg.setTransform(zoom, 0, 0, zoom, 960 - zx * zoom + slide * zoom, 540 - zy * zoom);
  const micro = { size: 17, family: F.mono, weight: 400, color: MINT, lh: 20 } as const;
  const rows = ['3S  K   3S  K   3S  K', '3S  UV  3S  UV  3S  UV'];
  microRows(fg, 825, 368, rows, micro);
  microRows(fg, 825, 718, rows, micro);
  microRows(fg, 1255, 718, rows, micro);
  dashStack(fg, 1190, 292, 2, 6, 46, 9, 9, MINT, 4, 3);
  checker(fg, 1362, 297, 2, 2, 46, MINT, true);
  const phase = frame % SCAN_BLOCK.steps;
  const outline = phase === 2 || phase === 3 || phase === 9;
  fg.save();
  fg.translate(1162, 440);
  fg.rotate(Math.PI / 2);
  text(fg, 'INITIATING', 0, 0, { size: 96, weight: 800, stretch: 'extra-condensed', color: MINT, stroke: outline ? 2 : 0, tracking: 1 });
  fg.restore();

  const { plate, signal } = scanBlockFrame(frame);
  fg.translate(1250, 432);
  fg.scale(4, 4);
  fg.fillStyle = C.blue;
  fg.fill(new Path2D(plate));
  fg.fillStyle = MINT;
  fg.fill(new Path2D(signal));
  fg.restore();
}

export const s1: ShotDef[] = [
  {
    id: 'S00',
    t0: ST.S00[0],
    t1: ST.S00[1],
    title: 'Boot',
    note: 'The runtime posts its checks into black and arms the defragmentation queue.',
    build: () => ({
      draw(f) {
        const { fg, t } = f;
        const log = [
          [0.3, 'ORA//RUNTIME 7.04 · FACILITY 3'],
          [0.85, '> LINK BUFFER ........... OK'],
          [1.35, '> SHELL BAY 07 .......... ARMED'],
          [1.9, '> PSYCHE CACHE .......... 1 ITEM'],
          [2.5, '> DEFRAG QUEUE .......... READY'],
        ] as const;
        log.forEach(([at, s], i) => typeOn(fg, s, 92, 120 + i * 26, t - at, 60, { size: 16, family: F.mono, weight: 400, color: i === 0 ? MINT : '#5a6aa8' }));
        for (const b of [0.6, 1.2, 1.5]) if (t > b && t < b + 0.12) rect(fg, 957, 537, 6, 6, MINT);
      },
    }),
  },
  {
    id: 'S01',
    t0: ST.S01[0],
    t1: ST.S01[1],
    title: 'Initiating',
    note: 'The cached psyche acquires the Shell 07 link. Its wire preview resolves beside the initiating bands before the defragmentation ring takes over.',
    build: async (k) => {
      const fig = await printFigure(k, { color: 0x2ee866 });
      return {
        draw(f) {
          const { t } = f;
          const lock = smooth(span(t, 0.04, 0.72));
          backdrop(f.bg, { seed: 11, dx: q(t, 12) * 30, alpha: 0.46, rect: [1050, 106, 870, 774] });
          const slide = 400 * (1 - easeOutExpo(span(t, 0.16, 0.74))) - 30 * t;
          const zk = easeInOutCubic(span(t, 2.4, 2.8));
          const zoom = 1 + 1.25 * zk;
          const zx = 960 + 30 * zk;
          const figX = 960 + (858 - zx) * zoom;
          const figY = 540;
          if (t >= 0.16) initiating(f, slide, zoom, zx, figY, t - 0.16);
          fig.draw(f, { x: figX, y: figY, h: 246 * zoom, k: smooth(span(t, 0.1, 1.55)), link: lock, t });
          if (t < 2.55) {
            f.fg.save();
            f.fg.globalAlpha = 1 - span(t, 2.14, 2.55);
            shellLink(f, figX, figY, lock);
            f.fg.restore();
          }
          if (f.dur - t <= 1 / FPS) protocolFlash(f.fg);
        },
      };
    },
  },
  {
    id: 'S02',
    t0: ST.S02[0],
    t1: ST.S02[1],
    title: 'Defragmentation ring',
    note: 'A single-frame metal wheel gives way to three concentric tracks. Their cobalt and green plates seat separately as the register swings into place. Open protocol lettering flashes solid, then overflows the frame.',
    build: () => ({ draw: (f) => protocolDial(f.fg, f.t, f.dur) }),
  },
];
