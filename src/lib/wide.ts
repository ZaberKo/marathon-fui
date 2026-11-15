/**
 * Wide fields — full-width animated poster strips for the motion page.
 * Each is `mountX(canvas) → cleanup`, painted on a 12 fps step loop that
 * pauses off-screen. Flat inks only; every change is a cut.
 *
 *   WF-01 transfer   violet dash-row field eating in, lime stepped text block, marquee band
 *   WF-02 swarm      cobalt triangle field with an acid sweep, alarm dots, tick rows
 *   WF-03 sector     big-cell block type crawling across lime, hazard block, checkers, barcode
 *   WF-04 defrag     block map consolidating to lime, capsule percentage
 */
import { blockTextRows } from './glyphs';
import { paintCapsules } from './dotType';
import { crispCanvas, stepLoop } from './util';

const INK = {
  black: '#000',
  violet: '#5a1eff',
  lime: '#c6ff00',
  acid: '#7dff1a',
  cobalt: '#2424ff',
  crimson: '#ff2a17',
  bone: '#ececec',
  grey: '#6d7078',
  hazard: '#ffe000',
};

const hash = (a: number, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

function wide(canvas: HTMLCanvasElement, paint: (ctx: CanvasRenderingContext2D, w: number, h: number, f: number) => void, fps = 12) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const stop = stepLoop(fps, (f) => {
    ctx.clearRect(0, 0, size.w, size.h);
    paint(ctx, size.w, size.h, f);
  }, canvas);
  return () => {
    stop();
    dispose();
  };
}

const mono = (px: number, weight = 500) => `${weight} ${px}px "IBM Plex Mono", monospace`;
const display = (px: number) => `800 ${px}px "Archivo Variable", "Archivo", sans-serif`;

/** stepped polygon: a block whose right edge drops in stairs, one per text line */
function steppedBlock(ctx: CanvasRenderingContext2D, x: number, y: number, widths: number[], lh: number, ink: string) {
  ctx.fillStyle = ink;
  widths.forEach((w, i) => ctx.fillRect(x, y + i * lh, w, lh + 0.5));
}

/* ------------------------------------------------------------------ */
/* WF-01 Transfer window                                               */
/* ------------------------------------------------------------------ */
export function mountTransferField(canvas: HTMLCanvasElement) {
  const LINES = [['TRANSFER', 'WINDOW', 'OPEN'], ['TRANSFER', 'WINDOW', 'CLOSING'], ['LINK', 'HELD', 'STAND BY']];
  return wide(canvas, (ctx, w, h, f) => {
    ctx.fillStyle = INK.black;
    ctx.fillRect(0, 0, w, h);
    const band = Math.round(h * 0.075);
    const field = h - band;

    // violet dash rows: 6 px rows, dashes merge into blobs; the ragged edge eats left
    const cell = 6;
    const cycle = f % 96;
    const reach = 0.26 + 0.34 * Math.min(1, cycle / 60);
    for (let y = 0, row = 0; y < field - cell; y += cell, row++) {
      const edge = w * (1 - reach) + 40 * Math.sin(row * 0.37 + Math.floor(f / 4) * 0.5) + 30 * hash(row, Math.floor(f / 6));
      let run = 0;
      for (let x = Math.floor(edge / cell) * cell; x < w; x += cell) {
        const cx = x / cell;
        const blob = Math.sin(cx * 0.09 + row * 0.21 + f * 0.05) + Math.sin(cx * 0.031 - row * 0.13);
        const lit = blob > -0.55 && hash(cx, row, Math.floor(f / 3) % 4) > 0.18;
        if (lit) run++;
        if ((!lit || x + cell >= w) && run) {
          ctx.fillStyle = INK.violet;
          ctx.fillRect(x - run * cell, y + 1, run * cell - 2, cell - 3);
          run = 0;
        }
      }
    }

    // lime stepped text block; lines land one per 4 frames, then hold
    const set = LINES[Math.floor(f / 96) % LINES.length];
    const fs = Math.round(h * 0.13);
    const lh = Math.round(fs * 1.02);
    const shown = Math.min(set.length, Math.floor(cycle / 4));
    ctx.font = display(fs);
    const widths = set.slice(0, shown).map((t) => ctx.measureText(t).width + fs * 0.6);
    const top = Math.round(field * 0.5 - (lh * set.length) / 2);
    const x0 = Math.round(w * 0.04);
    steppedBlock(ctx, x0, top, widths.map((v, i) => v + (set.length - i) * fs * 0.4), lh, INK.lime);
    ctx.fillStyle = INK.black;
    ctx.textBaseline = 'middle';
    set.slice(0, shown).forEach((t, i) => ctx.fillText(t, x0 + fs * 0.25, top + i * lh + lh * 0.54));

    // micro code over the field
    ctx.font = mono(10);
    ctx.fillStyle = INK.lime;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`0.55  V8  ${String(cycle).padStart(2, '0')}`, x0, 18);
    ctx.fillText('RELAY TRANSFER // SECTOR 07', w - 190, 18);

    // marquee band, two-px steps
    ctx.fillStyle = INK.lime;
    ctx.fillRect(0, field, w, band);
    ctx.fillStyle = INK.black;
    ctx.font = display(Math.round(band * 0.56));
    ctx.textBaseline = 'middle';
    const msg = 'THANK YOU FOR HOLDING!   ';
    const mw = ctx.measureText(msg).width + band;
    const off = -((f * 4) % mw);
    for (let x = off; x < w; x += mw) {
      ctx.beginPath();
      ctx.arc(x + band * 0.4, field + band / 2, band * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(msg, x + band * 0.85, field + band / 2 + 1);
    }
  });
}

/* ------------------------------------------------------------------ */
/* WF-02 Swarm sweep                                                   */
/* ------------------------------------------------------------------ */
export function mountSwarmField(canvas: HTMLCanvasElement) {
  return wide(canvas, (ctx, w, h, f) => {
    ctx.fillStyle = INK.cobalt;
    ctx.fillRect(0, 0, w, h);
    const s = Math.max(22, Math.round(h / 9));
    const cols = Math.ceil(w / s);
    const rows = Math.ceil(h / s);
    const sweep = (f * 1.5) % (cols + 16) - 8;
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const k = hash(c, r);
        if (k < 0.18) continue;
        const d = sweep - c - (r % 3);
        // behind the sweep, cells stay acid for 3 columns then drop back to black in one cut
        const hot = d >= 0 && d < 3;
        const x = c * s;
        const y = r * s;
        ctx.fillStyle = hot ? INK.acid : k > 0.93 ? INK.bone : INK.black;
        ctx.beginPath();
        const o = Math.floor(k * 4 + (hot ? 1 : 0)) % 4;
        const pts = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
        pts.splice(o, 1);
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.fill();
      }
    }
    // tick rows top and bottom
    ctx.fillStyle = INK.bone;
    for (const y of [4, h - s + 6]) {
      for (let x = 8, i = 0; x < w; x += 7, i++) {
        if (hash(i, y, Math.floor(f / 6)) < 0.25) continue;
        ctx.fillRect(x, y, 2, i % 5 === 0 ? s - 12 : (s - 12) * 0.5);
      }
    }
    // alarm dots, right
    const ax = w - s * 2.6;
    for (let i = 0; i < 18; i++) {
      const on = (Math.floor(f / 3) + i) % 6 < 3;
      ctx.fillStyle = on ? INK.crimson : '#000';
      ctx.beginPath();
      ctx.arc(ax + (i % 3) * s * 0.6, h * 0.24 + Math.floor(i / 3) * s * 0.6, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // lockup bottom-left
    const fs = Math.round(h * 0.17);
    ctx.fillStyle = '#000';
    ctx.font = display(fs);
    const word = f % 48 < 36 ? 'SWARM SIGNAL' : 'HOLD';
    const tw = ctx.measureText(word).width;
    ctx.fillRect(s, h - s - fs * 1.15, tw + fs * 0.5, fs * 1.15);
    ctx.fillStyle = INK.bone;
    ctx.textBaseline = 'middle';
    ctx.fillText(word, s + fs * 0.25, h - s - fs * 0.55);
    ctx.font = mono(10);
    ctx.fillStyle = INK.bone;
    ctx.fillText(`SWEEP ${String(Math.max(0, Math.floor(sweep))).padStart(3, '0')}/${cols}  ·  ECH`, s, s + 12);
  });
}

/* ------------------------------------------------------------------ */
/* WF-03 Sector lock                                                   */
/* ------------------------------------------------------------------ */
export function mountSectorField(canvas: HTMLCanvasElement) {
  const rows = blockTextRows('SECTOR 07 LOCKED  ', 1);
  const len = rows[0].length;
  return wide(canvas, (ctx, w, h, f) => {
    ctx.fillStyle = INK.lime;
    ctx.fillRect(0, 0, w, h);
    const cell = Math.round(h / 9);
    const top = Math.round((h - cell * 5) / 2);
    const shift = Math.floor(f / 2) % len;
    const cols = Math.ceil(w / cell) + 1;
    ctx.fillStyle = INK.black;
    for (let y = 0; y < 5; y++) {
      for (let c = 0; c < cols; c++) {
        if (rows[y][(c + shift) % len] !== '#') continue;
        // a few cells drop out per step
        if (hash(c + shift, y, f) < 0.04) continue;
        ctx.fillRect(c * cell, top + y * cell, cell - 2, cell - 2);
      }
    }
    // crosses field, upper band
    for (let x = 10, i = 0; x < w * 0.55; x += 18, i++) {
      for (let y = 10; y < top - 12; y += 18) {
        if (hash(i, y, Math.floor(f / 4)) < 0.3) continue;
        ctx.fillRect(x - 4, y, 9, 1.6);
        ctx.fillRect(x - 0.8, y - 4, 1.6, 9);
      }
    }
    // hazard block, lower right, stripes advance two px per step
    const hx = w * 0.62;
    const hy = top + cell * 5 + 10;
    const hw = w * 0.24;
    const hh = h - hy - 10;
    ctx.save();
    ctx.beginPath();
    ctx.rect(hx, hy, hw, hh);
    ctx.clip();
    for (let x = hx - hh + ((f * 2) % 16); x < hx + hw; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, hy + hh);
      ctx.lineTo(x + 8, hy + hh);
      ctx.lineTo(x + 8 + hh, hy);
      ctx.lineTo(x + hh, hy);
      ctx.fill();
    }
    ctx.restore();
    // checker flags flip a quarter turn every 6 frames
    const q = Math.floor(f / 6) % 4;
    const fc = Math.round(cell * 0.42);
    for (const [fx, fy] of [[w - fc * 2 - 14, 12], [w - fc * 2 - 14, h - fc * 2 - 12]]) {
      for (let i = 0; i < 4; i++) {
        if ((i + q) % 2) continue;
        ctx.fillRect(fx + (i % 2) * fc, fy + Math.floor(i / 2) * fc, fc, fc);
      }
    }
    // barcode, lower left, re-rolls every other frame
    let bx = 12;
    const by = h - 30;
    for (let i = 0; i < 46; i++) {
      const bw = 1 + Math.floor(hash(i, Math.floor(f / 2)) * 4);
      if (hash(i, 7, Math.floor(f / 2)) > 0.35) ctx.fillRect(bx, by, bw, 20);
      bx += bw + 2;
    }
    ctx.font = mono(10, 700);
    ctx.fillText(`LOCK ${String(f % 100).padStart(2, '0')} · ECH · 0x3F`, bx + 12, h - 16);
  });
}

/* ------------------------------------------------------------------ */
/* WF-04 Defrag index                                                  */
/* ------------------------------------------------------------------ */
export function mountDefragField(canvas: HTMLCanvasElement) {
  const PAL = [INK.bone, INK.grey, '#3a3d44', INK.violet, '#1c4d14'];
  return wide(canvas, (ctx, w, h, f) => {
    ctx.fillStyle = INK.black;
    ctx.fillRect(0, 0, w, h);
    const pad = 16;
    const capH = Math.round(h * 0.26);
    const cell = Math.max(8, Math.round(h / 26));
    const cols = Math.floor((w - pad * 2) / (cell + 2));
    const rows = Math.floor((h - capH - pad * 3) / (cell + 2));
    const total = cols * rows;
    const cycle = f % 180;
    const done = Math.min(total, Math.floor((cycle / 150) * total));
    for (let i = 0; i < total; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const k = hash(c, r);
      let ink: string | null;
      if (i < done) ink = INK.lime;
      else if (i === done) ink = f % 2 ? INK.bone : INK.crimson;
      else ink = k < 0.22 ? null : PAL[Math.floor(hash(c, r, 3) * PAL.length)];
      if (!ink) continue;
      ctx.fillStyle = ink;
      ctx.fillRect(pad + c * (cell + 2), pad + r * (cell + 2), cell, cell);
    }
    // capsule readout
    const pct = Math.round((done / total) * 100);
    const px = Math.max(5, Math.round(capH / 9));
    paintCapsules(ctx, `DEFRAG ${String(pct).padStart(3, '0')}%`, pad, h - pad - px * 7, px, cycle >= 150 ? INK.lime : INK.bone);
    ctx.font = mono(10);
    ctx.fillStyle = INK.grey;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`BLOCKS ${String(done).padStart(4, '0')}/${total}  ·  CORE-86`, w - 220, h - pad);
  });
}
