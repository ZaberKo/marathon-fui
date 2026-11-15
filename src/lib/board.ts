/**
 * BOARD: dashboard modules in the 2D idiom of the reference sheets.
 * Flat inks on black, Swiss hairline grids, lime label tabs, stepped text
 * blocks, square pixel cells, capsule dot type. Nothing is blurred or graded;
 * all motion is stepped.
 *
 *   mountLaunchMap(canvas)       pixel world map, live local times, the moving date line
 *   cradleHTML() + mountCradle   stat rows: braided lines, segmented blocks, node tiles
 *   mountSwarm(canvas)           triangle swarm poster with a stepped lime block
 *   mountDashField(canvas)       violet dash-row field poster with a stepped lime block
 *   factionHTML() + mountFaction lime hairline grid, tabs, marks, standing bars
 *   countdownHTML() + mountCountdown  capsule dot countdown lockup
 *   relayTermHTML() + mountRelayTerm  green terminal with typed boot lines and ASCII field
 */
import { capsuleText, paintCapsules } from './dotType';
import { icon } from './icons';
import { checker, emblem } from './glyphs';
import { loadLandMask } from './landMask';
import { $, $$, bag, crispCanvas, pad, rng, stepLoop } from './util';

const SANS = '"Archivo Variable", Archivo, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const INK = {
  lime: '#c6ff00',
  violet: '#5a1eff',
  violetHi: '#7a4dff',
  red: '#ff1f1f',
  magenta: '#ff2d8a',
  bone: '#ececec',
  grid: '#1a1d3a',
};

function hash(a: number, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** the lime stepped text block: a union of offset rectangles (fractions of w, h) */
function steppedBlock(ctx: CanvasRenderingContext2D, rects: readonly (readonly [number, number, number, number])[], w: number, h: number, ink = INK.lime) {
  ctx.fillStyle = ink;
  for (const [x0, y0, x1, y1] of rects) ctx.fillRect(Math.round(x0 * w), Math.round(y0 * h), Math.round((x1 - x0) * w), Math.round((y1 - y0) * h));
}

function marqueeBand(ctx: CanvasRenderingContext2D, text: string, y: number, w: number, h: number, f: number) {
  ctx.fillStyle = INK.lime;
  ctx.fillRect(0, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, w, h);
  ctx.clip();
  ctx.font = `600 ${Math.round(h * 0.56)}px ${MONO}`;
  ctx.textBaseline = 'middle';
  const unit = ctx.measureText(text).width + h * 1.6;
  const shift = (f * 6) % unit;
  for (let x = -shift; x < w; x += unit) {
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + h * 0.4, y + h / 2, h * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(text, x + h * 0.85, y + h / 2 + 1);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* LAUNCH MAP                                                           */

const CITIES = [
  { name: 'VANCOUVER', tz: 'America/Vancouver', lat: 49.3, lon: -123.1, dx: -1, dy: -1 },
  { name: 'SAO PAULO', tz: 'America/Sao_Paulo', lat: -23.5, lon: -46.6, dx: 1, dy: 1 },
  { name: 'REYKJAVIK', tz: 'Atlantic/Reykjavik', lat: 64.1, lon: -21.9, dx: 1, dy: -1 },
  { name: 'LAGOS', tz: 'Africa/Lagos', lat: 6.5, lon: 3.4, dx: -1, dy: 1 },
  { name: 'MUMBAI', tz: 'Asia/Kolkata', lat: 19.1, lon: 72.9, dx: 1, dy: 1 },
  { name: 'SHANGHAI', tz: 'Asia/Shanghai', lat: 31.2, lon: 121.5, dx: 1, dy: -1 },
  { name: 'AUCKLAND', tz: 'Pacific/Auckland', lat: -36.8, lon: 174.8, dx: -1, dy: 1 },
] as const;

const fmt = (tz: string) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true, month: 'short', day: '2-digit' });

export function mountLaunchMap(canvas: HTMLCanvasElement, { fps = 8 } = {}) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const formats = CITIES.map((c) => fmt(c.tz));
  let mask: ((lat: number, lon: number) => boolean) | null = null;
  let cells: Uint8Array | null = null;
  let key = '';
  void loadLandMask().then((m) => (mask = m));
  const LAT0 = 76;
  const LAT1 = -58;

  const stop = stepLoop(fps, (f) => {
    const { w, h } = size;
    const head = Math.round(h * 0.15);
    const cell = Math.max(6, Math.floor(w / 104));
    const cols = Math.floor(w / cell);
    const top = head + cell;
    const rows = Math.floor((h - top - cell * 2) / cell);
    const ox = Math.floor((w - cols * cell) / 2);
    if (mask && key !== `${cols}x${rows}`) {
      key = `${cols}x${rows}`;
      cells = new Uint8Array(cols * rows);
      for (let j = 0; j < rows; j++) {
        const lat = Math.round((LAT0 - ((j + 0.5) * (LAT0 - LAT1)) / rows) * 10) / 10 + 0.013;
        for (let i = 0; i < cols; i++) cells[j * cols + i] = mask(lat, -180 + ((i + 0.5) * 360) / cols) ? 1 : 0;
      }
    }
    const xOf = (lon: number) => ox + Math.floor(((lon + 180) / 360) * cols) * cell;
    const yOf = (lat: number) => top + Math.floor(((LAT0 - lat) / (LAT0 - LAT1)) * rows) * cell;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    // background dot grid
    ctx.fillStyle = INK.grid;
    for (let y = top; y < h; y += cell * 3) for (let x = ox; x < w; x += cell * 3) ctx.fillRect(x, y, 2, 2);

    // land cells: a stepped column sweep, then held
    const sweep = Math.min(cols, (f % (fps * 24)) * 3);
    if (cells) {
      ctx.fillStyle = INK.violet;
      const g = Math.max(1, Math.round(cell * 0.18));
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < Math.min(cols, sweep); i++) {
          if (cells[j * cols + i]) ctx.fillRect(ox + i * cell, top + j * cell, cell - g, cell - g);
        }
      }
      if (sweep < cols) {
        ctx.fillStyle = INK.lime;
        ctx.fillRect(ox + sweep * cell, top, 2, rows * cell);
      }
    }

    // header band
    ctx.fillStyle = INK.lime;
    ctx.fillRect(0, 0, w, head);
    ctx.fillStyle = '#000';
    ctx.font = `800 ${Math.round(head * 0.52)}px ${SANS}`;
    ctx.fontStretch = 'expanded';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('LOCAL_TIMES', Math.round(w * 0.03), Math.round(head * 0.8));
    ctx.fontStretch = 'normal';
    const tag = 'ACROSS ALL SECTORS';
    ctx.font = `600 ${Math.max(9, Math.round(head * 0.17))}px ${MONO}`;
    const tw = ctx.measureText(tag).width + 12;
    const tx = Math.round(w * 0.5);
    ctx.fillRect(tx, Math.round(head * 0.18), tw, Math.round(head * 0.26));
    ctx.fillStyle = INK.lime;
    ctx.fillText(tag, tx + 6, Math.round(head * 0.38));
    ctx.fillStyle = '#000';
    ctx.fillText('(ICAR · ORA · RELAY)', tx + tw + 8, Math.round(head * 0.38));
    for (let i = 0; i < 18; i++) ctx.fillRect(w - 20 - i * 9, Math.round(head * 0.2), 2, i % 4 === 0 ? 10 : 6);

    // date line: where local midnight is right now
    const now = new Date();
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
    const lonMid = ((((24 - utcH) * 15 + 180) % 360) + 360) % 360 - 180;
    const dlx = xOf(lonMid);
    const band = Math.max(10, cell * 1.5);
    ctx.fillStyle = INK.magenta;
    ctx.fillRect(dlx, top, band, rows * cell);
    ctx.save();
    ctx.translate(dlx + band * 0.22, top + 4);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#000';
    ctx.font = `600 ${Math.round(band * 0.62)}px ${MONO}`;
    ctx.fillText('DATE LINE · '.repeat(20), (f * 2) % 90 - 90, 0);
    ctx.restore();
    const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit' });
    const today = dayFmt.format(now).toUpperCase();
    const tomorrow = dayFmt.format(new Date(now.getTime() + 864e5)).toUpperCase();
    ctx.font = `800 ${Math.max(12, Math.round(cell * 2.4))}px ${SANS}`;
    ctx.fontStretch = 'expanded';
    ctx.fillStyle = INK.magenta;
    const yLbl = top + rows * cell * 0.72;
    const tw2 = ctx.measureText(today).width;
    if (dlx + band + cell + tw2 < w - cell) {
      ctx.textAlign = 'right';
      ctx.fillText(tomorrow, dlx - cell, yLbl);
      ctx.textAlign = 'left';
      ctx.fillText(today, dlx + band + cell, yLbl);
    } else {
      // too close to the right edge: stack both dates on the left of the band
      ctx.textAlign = 'right';
      ctx.fillText(today, dlx - cell, yLbl - cell * 3);
      ctx.fillText(tomorrow, dlx - cell, yLbl);
    }
    ctx.textAlign = 'left';
    ctx.fontStretch = 'normal';

    // cities: marker, tab, capsule time, date
    const px = Math.max(2, Math.round(cell * 0.3));
    CITIES.forEach((c, k) => {
      const appear = Math.floor((f % (fps * 24)) / 3) - k * 2;
      if (appear < 0) return;
      const x = xOf(c.lon);
      const y = yOf(c.lat);
      ctx.fillStyle = INK.lime;
      ctx.fillRect(x, y, cell, cell);
      ctx.fillStyle = INK.magenta;
      ctx.beginPath();
      ctx.moveTo(x + cell / 2, y + 2);
      ctx.lineTo(x + cell - 2, y + cell / 2);
      ctx.lineTo(x + cell / 2, y + cell - 2);
      ctx.lineTo(x + 2, y + cell / 2);
      ctx.fill();
      const parts = Object.fromEntries(formats[k].formatToParts(now).map((p) => [p.type, p.value]));
      const time = `${parts.hour}:${parts.minute}`;
      const tabH = Math.round(cell * 1.7);
      ctx.font = `600 ${Math.round(tabH * 0.62)}px ${MONO}`;
      const nameW = ctx.measureText(c.name).width + 10;
      const timeW = (5 * 6 - 1) * px + 6;
      const bw = Math.max(nameW, timeW + px * 8);
      const blockH = tabH + px * 14;
      const bx = Math.max(cell, Math.min(w - bw - cell, c.dx > 0 ? x + cell * 2 : x - cell - bw));
      const by = Math.max(head + cell, Math.min(h - blockH - cell, c.dy > 0 ? y + cell * 2 : y - cell - blockH));
      ctx.fillStyle = INK.lime;
      ctx.fillRect(bx, by, bw, tabH);
      ctx.fillStyle = '#000';
      ctx.fillText(typedName(c.name, appear), bx + 5, by + tabH * 0.78);
      if (appear > 3) {
        paintCapsules(ctx, time, bx, by + tabH + px * 1.5, px, INK.lime);
        ctx.fillStyle = INK.lime;
        ctx.font = `700 ${Math.round(px * 2.6)}px ${SANS}`;
        ctx.fillText((parts.dayPeriod ?? '').toUpperCase(), bx + timeW, by + tabH + px * 4);
        ctx.font = `800 ${Math.round(px * 3)}px ${SANS}`;
        ctx.fontStretch = 'expanded';
        ctx.fillText(`${parts.month} ${parts.day}`.toUpperCase(), bx, by + tabH + px * 13);
        ctx.fontStretch = 'normal';
      }
    });

    // terminal micro copy and status, bottom left
    ctx.fillStyle = INK.lime;
    ctx.font = `500 ${Math.max(8, Math.round(cell * 0.95))}px ${MONO}`;
    const lines = ['[WAKE]', 'SENSORY RELAY INTERFACE INITIALIZING', '  CORE 1 ... OK   CORE 2 ... OK', `  CORE 3 ... ${f % 16 < 8 ? 'OK' : '..'}`, 'DEGAUSSING MEMORIES : 48%'];
    lines.forEach((l, i) => ctx.fillText(l, ox + cell, h - cell * (lines.length - i + 0.4) * 1.25));
  }, canvas);
  return () => {
    stop();
    dispose();
  };
}
const typedName = (s: string, n: number) => s.slice(0, Math.max(0, n * 3));

/* ------------------------------------------------------------------ */
/* CRADLE STAT ROWS                                                     */

const STATS = [
  { name: 'STRENGTH', ink: '#e5492d', dark: '#7a2416', icons: ['bio', 'target'], plus: 55, nodes: [5, 10], value: 13 },
  { name: 'RECHARGE', ink: '#6f8697', dark: '#39454e', icons: ['power', 'scan'], plus: 40, nodes: [3, 9], value: 10 },
  { name: 'DEXTERITY', ink: '#c9992b', dark: '#5f4a16', icons: ['chevron-2', 'grid'], plus: 20, nodes: [4], value: 4 },
  { name: 'ENDURANCE', ink: '#7a62e0', dark: '#3a2f6e', icons: ['battery', 'plus'], plus: 35, nodes: [6, 11], value: 8 },
  { name: 'SUPPORT', ink: '#3cc17b', dark: '#1d5e3c', icons: ['link', 'unit'], plus: 15, nodes: [2], value: 3 },
] as const;
const BLOCKS = 13;

export function cradleHTML() {
  return `<div class="k-cradle">
    <div class="k-cradle__head">
      <div>
        <h3 class="k-cradle__title">The Relay</h3>
        <p class="k-cradle__lede">Route energy into colony tracks to tune each shell. Contracts and converted matter raise the cap.</p>
      </div>
      <div class="k-level">
        <div><b>LEVEL 50</b><span>5482/11K <small>XP</small></span></div>
        <i class="k-level__bar"></i><i class="k-level__haz"></i>
        <span class="k-level__tile">${icon('battery', { size: 16 })}<b data-cradle-pool>0</b></span>
      </div>
    </div>
    ${STATS.map((s, r) => `<div class="k-stat" style="--stat:${s.ink};--stat-dark:${s.dark}" data-stat="${r}">
      <div class="k-stat__label"><span>${s.name}</span><small>${s.icons.map((n) => icon(n, { size: 14 })).join('')}<i></i><b>+${s.plus}</b></small></div>
      <div class="k-stat__track">
        <canvas></canvas>
        <div class="k-stat__nodes">${s.nodes.map((n) => `<span class="k-stat__node" style="--at:${n}" data-node="${n}">${icon(s.icons[n % 2], { size: 16 })}</span>`).join('')}</div>
        <div class="k-stat__blocks">${Array.from({ length: BLOCKS }, (_, i) => `<i data-b="${i}"></i>`).join('')}</div>
      </div>
    </div>`).join('')}
  </div>`;
}

export function mountCradle(root: HTMLElement, { fps = 10 } = {}) {
  const b = bag();
  const values: number[] = STATS.map((s) => s.value);
  const rows = $$<HTMLElement>('.k-stat', root);
  const pool = $('[data-cradle-pool]', root);
  const views = rows.map((row) => ({ row, cv: crispCanvas($<HTMLCanvasElement>('canvas', row)), blocks: $$<HTMLElement>('[data-b]', row), nodes: $$<HTMLElement>('[data-node]', row) }));
  views.forEach((v) => b.add(v.cv.dispose));
  let flash = -1;
  let flashRow = -1;

  b.add(stepLoop(fps, (f) => {
    // every 1.2 s one track takes or loses a block
    if (f % Math.round(fps * 1.2) === 0) {
      const r = Math.floor(hash(f, 3) * STATS.length);
      const up = values[r] < BLOCKS && (hash(f, 5) > 0.3 || values[r] < 3);
      values[r] = Math.max(1, Math.min(BLOCKS, values[r] + (up ? 1 : -1)));
      flashRow = r;
      flash = f;
      pool.textContent = String(Math.max(0, 40 - values.reduce((a, n) => a + n, 0)));
    }
    views.forEach((v, r) => {
      const s = STATS[r];
      const n = values[r];
      v.blocks.forEach((el, i) => {
        el.className = i < n ? (r === flashRow && i === n - 1 && f - flash < 3 ? 'is-new' : 'is-on') : '';
      });
      v.nodes.forEach((el) => el.classList.toggle('is-on', Number(el.dataset.node) < n));
      // braided lines up to the fill edge
      const { ctx, size } = v.cv;
      const { w, h } = size;
      ctx.clearRect(0, 0, w, h);
      const end = (n / BLOCKS) * w;
      const strands = 8;
      for (let k = 0; k < strands; k++) {
        ctx.strokeStyle = k % 3 === 0 ? s.dark : s.ink;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (let x = 0; x <= end; x += 4) {
          const kink = s.nodes.reduce((a, node) => a + Math.exp(-(((x - (node / BLOCKS) * w) / (w * 0.05)) ** 2)), 0);
          const amp = h * 0.32 * (1 - Math.min(0.85, kink));
          const y = h / 2 + amp * Math.sin(x * 0.018 + k * 0.8 + Math.floor(f / 2) * 0.12) * Math.cos(x * 0.004 + k);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });
  }, root));
  return b.dispose;
}

/* ------------------------------------------------------------------ */
/* POSTER: TRIANGLE SWARM                                               */

export function mountSwarm(canvas: HTMLCanvasElement, { fps = 6, title = ['SWARM', 'SIGNAL', 'OPEN'], kicker = ['SECTOR 07 RELAY', 'TECHNICAL WINDOW'], tag = ['ROUTE', 'NOW'], band = 'NOV 22, 10 AM PT - NOV 28, 10 AM PT' } = {}) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const r = rng(17);
  // five arms leaving a body; each arm is a polyline with a radius
  const arms = Array.from({ length: 6 }, (_, k) => {
    const a0 = -2.6 + k * 0.95 + r() * 0.3;
    const pts: [number, number][] = [];
    let x = 0.66;
    let y = 0.3;
    let a = a0;
    for (let i = 0; i < 9; i++) {
      pts.push([x, y]);
      a += (r() - 0.5) * 0.7;
      x += Math.cos(a) * 0.06;
      y += Math.sin(a) * 0.08 + 0.03;
    }
    return pts;
  });
  const near = (x: number, y: number) => {
    let best = 9;
    for (const arm of arms) {
      arm.forEach(([ax, ay], i) => {
        const rad = 0.09 * (1 - i / 11);
        best = Math.min(best, Math.hypot(x - ax, (y - ay) * 0.7) / rad);
      });
    }
    return best;
  };
  const stop = stepLoop(fps, (f) => {
    const { w, h } = size;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const bandH = Math.round(h * 0.06);
    const s = Math.max(9, Math.round(w / 64));
    const step = Math.floor(f / 1);
    for (let gy = 0; gy < h - bandH; gy += s) {
      for (let gx = Math.round(w * 0.3); gx < w; gx += s) {
        const d = near(gx / w, gy / h);
        if (d > 1) continue;
        const key = hash(gx, gy);
        if (hash(gx, gy, step) < 0.07) continue; // stepped dropout
        const jx = (hash(gx, gy, 2) - 0.5) * s * 0.6;
        const jy = (hash(gx, gy, 3) - 0.5) * s * 0.6;
        const size = s * (0.7 + key * 0.5);
        const filled = key > 0.86 && d < 0.8;
        tri(ctx, gx + jx, gy + jy, filled ? size * 1.8 : size, filled ? INK.red : INK.violetHi, filled);
        if (!filled && key < 0.25) tri(ctx, gx + jx + s * 0.25, gy + jy + s * 0.2, size * 0.9, INK.violet, false);
      }
    }
    // white crosses and coded labels
    ctx.font = `500 ${Math.max(8, Math.round(s * 0.9))}px ${MONO}`;
    for (let i = 0; i < 16; i++) {
      const arm = arms[i % arms.length];
      const [ax, ay] = arm[1 + (i % 7)];
      const x = Math.round(ax * w + (hash(i, 7) - 0.5) * s * 4);
      const y = Math.round(ay * h + (hash(i, 8) - 0.5) * s * 3);
      if (y > h - bandH * 1.5) continue;
      ctx.fillStyle = INK.bone;
      if (i % 2 === 0) {
        ctx.fillRect(x - s * 0.45, y - 1, s * 0.9, 3);
        ctx.fillRect(x - 1, y - s * 0.45, 3, s * 0.9);
      } else if ((f + i) % 9 !== 0) {
        ctx.fillRect(x, y - s * 0.35, s * 0.4, s * 0.4);
        ctx.fillText(`${pad(Math.floor(hash(i, 1) * 900), 2)}-${pad(Math.floor(hash(i, 2) * 900), 3)}`, x + s * 0.6, y);
      }
    }
    // stepped lime block with type
    steppedBlock(ctx, [[0, 0.36, 0.3, 0.7], [0.27, 0.31, 0.37, 0.46], [0.3, 0.45, 0.52, 0.59], [0.08, 0.69, 0.3, 0.75]], w, h);
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';
    const ks = Math.round(h * 0.034);
    ctx.font = `500 ${ks}px ${MONO}`;
    kicker.forEach((l, i) => ctx.fillText(l, w * 0.035, h * 0.41 + i * ks * 1.05));
    tag.forEach((l, i) => ctx.fillText(l, w * 0.275, h * 0.41 + i * ks * 1.05));
    const ts = Math.round(h * 0.075);
    ctx.font = `900 ${ts}px ${SANS}`;
    ctx.fontStretch = 'expanded';
    title.forEach((l, i) => ctx.fillText(l, w * 0.035, h * 0.52 + i * ts * 0.92));
    ctx.fontStretch = 'normal';
    marqueeBand(ctx, band, h - bandH, w, bandH, f);
  }, canvas);
  return () => {
    stop();
    dispose();
  };
}

function tri(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ink: string, fill: boolean) {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y - s * 0.5);
  ctx.lineTo(x + s * 0.55, y);
  ctx.lineTo(x - s * 0.45, y + s * 0.5);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = ink;
    ctx.fill();
  } else {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/* POSTER: DASH FIELD                                                   */

export function mountDashField(canvas: HTMLCanvasElement, { fps = 6, title = ['TRANSFER', 'WINDOW', 'CONCLUDED'], band = 'THANK YOU FOR HOLDING THE LINK' } = {}) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const stop = stepLoop(fps, (f) => {
    const { w, h } = size;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const bandH = Math.round(h * 0.06);
    const row = Math.max(4, Math.round(h / 72));
    const unit = row * 2;
    // a dense checker body built from wave bands, with sparse dash rows feeding it from the left
    for (let y = 0, j = 0; y < h - bandH; y += row, j++) {
      const wave = Math.sin(j * 0.21 + f * 0.05) * 0.06 + Math.sin(j * 0.07) * 0.08;
      const edge = 0.56 + wave;
      for (let x = Math.round(w * 0.36), i = 0; x < w; x += unit, i++) {
        const u = x / w;
        const inBody = u > edge;
        const hole = Math.sin(j * 0.33 + i * 0.25) + Math.sin(i * 0.11 - j * 0.09 + f * 0.04) > 1.2;
        ctx.fillStyle = INK.violet;
        if (inBody && !hole) {
          if ((i + j) % 2 === 0) ctx.fillRect(x, y, unit, row - 1);
          else if (hash(i, j, Math.floor(f / 2)) > 0.6) ctx.fillRect(x, y, unit * 2, row - 1);
        } else if (!inBody && hash(i, j) > 0.86 && hash(j, 4) > 0.35) {
          const len = unit * (1 + Math.floor(hash(i, j, 1) * 4));
          ctx.fillRect(x - ((f * unit) % (unit * 6)), y + row * 0.3, len, Math.max(2, row * 0.45));
          ctx.fillRect(x + len - ((f * unit) % (unit * 6)), y + row * 0.15, unit * 0.6, row * 0.7);
        }
      }
    }
    steppedBlock(ctx, [[0, 0.38, 0.46, 0.7], [0.16, 0.28, 0.46, 0.39], [0.44, 0.51, 0.62, 0.62], [0, 0.69, 0.23, 0.84]], w, h);
    ctx.fillStyle = '#000';
    const ts = Math.round(h * 0.07);
    ctx.font = `900 ${ts}px ${SANS}`;
    ctx.fontStretch = 'expanded';
    title.forEach((l, i) => ctx.fillText(l, w * 0.035, h * 0.46 + i * ts * 0.92));
    ctx.fontStretch = 'normal';
    marqueeBand(ctx, band, h - bandH, w, bandH, f);
  }, canvas);
  return () => {
    stop();
    dispose();
  };
}

/* ------------------------------------------------------------------ */
/* FACTION GRID                                                         */

const FACTIONS = ['ICAR', 'ORA', 'KELVIN', 'VESTA', 'HALDANE', 'PERIAPT'];

export function factionHTML() {
  return `<div class="k-faction">
    <div class="k-faction__top t-micro"><span>0.55</span><span>V0</span><span>1</span><span>4</span></div>
    <h3 class="k-faction__title"><span>Faction</span><span>Standing</span></h3>
    <div class="k-faction__grid">
      ${FACTIONS.map((n, i) => `<div class="k-faction__cell">
        <span class="k-faction__tab">${n}</span>
        <i class="k-faction__x"></i>
        <span class="k-faction__mark">${emblem(41 + i * 7, { size: 64 })}</span>
        <span class="k-faction__bar" data-faction="${i}">${'<i></i>'.repeat(10)}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

export function mountFaction(root: HTMLElement, { fps = 4 } = {}) {
  const bars = $$<HTMLElement>('[data-faction]', root);
  const rank = bars.map((_, i) => 2 + Math.floor(hash(i, 9) * 6));
  return stepLoop(fps, (f) => {
    if (f % 6 === 0) {
      const i = f / 6 % bars.length;
      rank[i] = (rank[i] % 10) + 1;
    }
    bars.forEach((bar, i) => [...bar.children].forEach((c, k) => c.classList.toggle('is-on', k < rank[i])));
    root.style.setProperty('--x-shift', `${(f % 8) * 2}px`);
  }, root);
}

/* ------------------------------------------------------------------ */
/* COUNTDOWN LOCKUP                                                     */

export function countdownHTML() {
  return `<div class="k-count">
    <span class="k-count__mark"><svg viewBox="0 0 40 40" width="44"><path d="M20 2 38 20 20 38 2 20Z" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg><b>OUT 07</b></span>
    <span class="k-count__code" data-count-code>${capsuleText('LINK', { size: 110 })}${capsuleText('WINDOW', { size: 110 })}${capsuleText('00-0000', { size: 110 })}</span>
    <span class="k-count__ck">${checker(5, 5, { size: 66 })}</span>
    <span class="k-count__main" data-count-main>${capsuleText('T-00:00:00', { size: 520 })}${capsuleText('UNTIL CLOSE /', { size: 520 })}</span>
  </div>`;
}

export function mountCountdown(root: HTMLElement) {
  const main = $('[data-count-main]', root);
  const code = $('[data-count-code]', root);
  return stepLoop(2, (f) => {
    // count to the top of the next hour, live
    const now = new Date();
    const left = 3600 - (now.getMinutes() * 60 + now.getSeconds());
    const t = `T-00:${pad(Math.floor(left / 60), 2)}:${pad(left % 60, 2)}`;
    main.innerHTML = capsuleText(t, { size: 520 }) + capsuleText(f % 4 < 3 ? 'UNTIL CLOSE /' : 'UNTIL CLOSE  ', { size: 520 });
    code.innerHTML = capsuleText('LINK', { size: 110 }) + capsuleText('WINDOW', { size: 110 }) + capsuleText(`${pad(now.getUTCHours(), 2)}-${pad(left, 4)}`, { size: 110 });
  }, root);
}

/* ------------------------------------------------------------------ */
/* RELAY TERMINAL                                                       */

const BOOT = [
  'BOOTING UP SYSTEM...',
  'LOADING KERNEL MODULES...',
  'INITIALIZING RELAY COMPONENTS...',
  'CHECKING SHELL INTEGRITY... [OK]',
  'MOUNTING MEMORY VOLUMES... [OK]',
  'STARTING TRANSFER SERVICES...',
  'NETWORK CONFIGURATION... [OK]',
  'SECURITY PROTOCOLS ENABLED.',
  'SYSTEM READY FOR OPERATION.',
];

export function relayTermHTML() {
  return `<div class="k-relay">
    <div class="k-relay__top"><span>Opening Connection to Relay 0.4.5-46</span><span>6142.a5.09.1307</span></div>
    <div class="k-relay__body">
      <div class="k-relay__icons">${['grid', 'scan', 'node', 'unit'].map((n) => icon(n, { size: 34 })).join('')}</div>
      <pre class="k-relay__log" data-relay-log></pre>
      <pre class="k-relay__ascii" data-relay-ascii aria-hidden="true"></pre>
    </div>
    <div class="k-relay__title"><b>R.E.L.A.Y</b><span>${icon('arrow-r', { size: 26 })}<b>PHASE 2</b></span></div>
    <div class="k-relay__foot"><span>${emblem(5, { size: 18 })} ICAR Systems</span><span>ORA.qterm/ICAR Relay Inc.<br>&lt;931.461.60231.14.vt920&gt;</span></div>
  </div>`;
}

export function mountRelayTerm(root: HTMLElement, { fps = 12 } = {}) {
  const log = $('[data-relay-log]', root);
  const ascii = $('[data-relay-ascii]', root);
  const COLS = 34;
  const ROWS = 16;
  const DENSE = 'MWNQ@#';
  const LIGHT = '`-}=3ahDi|s.,!*z';
  const shape = (x: number, y: number) => {
    const dx = (x - COLS * 0.55) / (COLS * 0.42);
    const dy = (y - ROWS * 0.48) / (ROWS * 0.5);
    const d = Math.hypot(dx, dy);
    return d > 0.55 && d < 1.0 ? 2 : d <= 0.55 && Math.abs(dy) < 0.12 ? 1 : 0;
  };
  return stepLoop(fps, (f) => {
    const total = BOOT.join('\n').length + 40;
    const n = (f * 3) % (total + 60);
    log.textContent = `[SYSTEM INITIALIZATION]\n--------------------------\n${BOOT.join('\n').slice(0, n)}${f % 6 < 3 ? '█' : ' '}`;
    let out = '';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const s = shape(x, y);
        const k = hash(x, y, Math.floor(f / 3));
        out += s === 2 ? DENSE[Math.floor(k * DENSE.length)] : s === 1 ? LIGHT[Math.floor(k * LIGHT.length)] : k > 0.985 ? LIGHT[Math.floor(k * 1000) % LIGHT.length] : ' ';
      }
      out += '\n';
    }
    ascii.textContent = out;
  }, root);
}
