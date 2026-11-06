/**
 * Vector glyph generators — return SVG markup strings.
 * Everything is drawn on integer grids with shape-rendering="crispEdges"
 * so it stays sharp at any scale.
 */
import { rng } from './util';

type Opts = { size?: number; color?: string; cls?: string };

const svg = (w: number, h: number, body: string, o: Opts & { vw?: number; vh?: number } = {}) => {
  const size = o.size ?? 24;
  const ar = h / w;
  return `<svg class="${o.cls ?? ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.vw ?? w} ${o.vh ?? h}" width="${size}" height="${Math.round(size * ar)}" fill="${o.color ?? 'currentColor'}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
};

/* ------------------------------------------------------------------ */
/* Pixel icons — bitmaps                                               */
/* ------------------------------------------------------------------ */

const B: Record<string, string[]> = {
  'arrow-r': ['...##...', '....##..', '.....##.', '########', '########', '.....##.', '....##..', '...##...'],
  chevron: ['##......', '.##.....', '..##....', '...##...', '...##...', '..##....', '.##.....', '##......'],
  'chevron-2': ['##..##..', '.##..##.', '..##..##', '...##..#', '...##..#', '..##..##', '.##..##.', '##..##..'],
  check: ['........', '.......#', '......##', '#....##.', '##..##..', '.####...', '..##....', '........'],
  cross: ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'],
  warn: ['....#....', '...#.#...', '...#.#...', '..#.#.#..', '..#.#.#..', '.#..#..#.', '.#.....#.', '#...#...#', '#########'],
  target: ['...#...', '.#####.', '.#...#.', '###.###', '.#...#.', '.#####.', '...#...'],
  power: ['...#...', '.#.#.#.', '#..#..#', '#..#..#', '#.....#', '.#...#.', '..###..'],
  lock: ['..###..', '.#...#.', '.#...#.', '#######', '###.###', '###.###', '#######'],
  link: ['..#...#..', '..#...#..', '.#######.', '.#######.', '.##...##.', '..#####..', '....#....', '....#....', '....#....'],
  signal: ['......#', '......#', '....#.#', '....#.#', '..#.#.#', '..#.#.#', '#.#.#.#'],
  battery: ['########.', '#.#.#..##', '#.#.#..##', '#.#.#..##', '########.'],
  disk: ['#######.', '#.###.##', '#.###..#', '#......#', '#.####.#', '#.####.#', '########'],
  eye: ['..#####..', '.#.....#.', '#..###..#', '#..###..#', '.#.....#.', '..#####..'],
  node: ['##...##', '##...##', '..#.#..', '...#...', '...#...', '..###..', '..###..'],
  down: ['...#...', '...#...', '...#...', '#..#..#', '.#.#.#.', '..###..', '...#...', '#######'],
  menu: ['#######', '.......', '#######', '.......', '#######'],
  grid: ['##.##.##', '##.##.##', '........', '##.##.##', '##.##.##', '........', '##.##.##', '##.##.##'],
  unit: ['..###..', '..###..', '...#...', '#######', '..###..', '..#.#..', '.##.##.'],
  bio: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  wave: ['...#.....', '...#..#..', '.#.#..#.#', '.#.#.##.#', '##.###.##', '.#.#.##.#', '.#.#..#.#', '...#..#..', '...#.....'],
  plus: ['..##..', '..##..', '######', '######', '..##..', '..##..'],
  eject: ['...#...', '..###..', '.#####.', '#######', '.......', '#######'],
  scan: ['##...##', '#.....#', '.......', '#######', '.......', '#.....#', '##...##'],
};

export const pixelIconNames = Object.keys(B);

const mirror = (rows: string[]) => rows.map((r) => r.split('').reverse().join(''));

export function pixelIcon(name: string, o: Opts & { flip?: boolean } = {}) {
  let rows = B[name] ?? B.cross;
  if (o.flip) rows = mirror(rows);
  return bitmap(rows, o);
}

/** Render any '#'/'.' bitmap as merged-run SVG rects. */
export function bitmap(rows: string[], o: Opts = {}) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  let body = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] === '#') {
        let x2 = x;
        while (row[x2] === '#') x2++;
        body += `<rect x="${x}" y="${y}" width="${x2 - x}" height="1"/>`;
        x = x2;
      } else x++;
    }
  });
  return svg(w, h, body, { size: o.size ?? w * 3, ...o });
}

/**
 * Symmetric random pixel cluster — the chunky "glitch glyph" that sits
 * beside headings. Same seed → same glyph.
 */
export function pixelSigil(seed: number, o: Opts & { w?: number; h?: number; density?: number; sym?: boolean } = {}) {
  const r = rng(seed);
  const w = o.w ?? 5;
  const h = o.h ?? 5;
  const half = o.sym === false ? w : Math.ceil(w / 2);
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let left = '';
    for (let x = 0; x < half; x++) left += r() < (o.density ?? 0.55) ? '#' : '.';
    const right = o.sym === false ? '' : left.slice(0, w - half).split('').reverse().join('');
    rows.push(left + right);
  }
  return bitmap(rows, { size: o.size ?? w * 4, color: o.color, cls: o.cls });
}

/* ------------------------------------------------------------------ */
/* Vector marks                                                        */
/* ------------------------------------------------------------------ */

/** Checkerboard block (the 2×2 / 3×3 locator flags). */
export function checker(cols = 2, rows = 2, o: Opts & { invert?: boolean } = {}) {
  let body = '';
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if ((x + y + (o.invert ? 1 : 0)) % 2 === 0) body += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return svg(cols, rows, body, { size: o.size ?? cols * 10, ...o });
}

/** QR-style finder / locator square. */
export function locator(o: Opts = {}) {
  const body = `<path fill-rule="evenodd" d="M0 0h7v7H0zM1 1v5h5V1z"/><rect x="2" y="2" width="3" height="3"/>`;
  return svg(7, 7, body, { size: o.size ?? 28, ...o });
}

/** Thin crosshair with centre gap. */
export function crosshair(o: Opts & { gap?: number } = {}) {
  const s = 32;
  const g = o.gap ?? 5;
  const c = s / 2;
  const body = `<g stroke="${o.color ?? 'currentColor'}" stroke-width="1" fill="none" shape-rendering="crispEdges">
    <path d="M${c} 0V${c - g}M${c} ${c + g}V${s}M0 ${c}H${c - g}M${c + g} ${c}H${s}"/></g>`;
  return svg(s, s, body, { size: o.size ?? 32, ...o, color: 'none' });
}

/** Ring reticle with tick marks. */
export function reticle(o: Opts & { ticks?: number } = {}) {
  const s = 64;
  const c = 32;
  const ticks = o.ticks ?? 24;
  let t = '';
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const r1 = i % 6 === 0 ? 22 : 26;
    t += `M${(c + Math.cos(a) * r1).toFixed(2)} ${(c + Math.sin(a) * r1).toFixed(2)}L${(c + Math.cos(a) * 29).toFixed(2)} ${(c + Math.sin(a) * 29).toFixed(2)}`;
  }
  const body = `<g stroke="${o.color ?? 'currentColor'}" fill="none" stroke-width="1">
    <circle cx="${c}" cy="${c}" r="29"/><path d="${t}"/><circle cx="${c}" cy="${c}" r="2" fill="${o.color ?? 'currentColor'}"/>
    <path d="M${c} 10V18M${c} 46V54M10 ${c}H18M46 ${c}H54"/></g>`;
  return svg(s, s, body, { size: o.size ?? 64, ...o, color: 'none' });
}

/** Registration mark (print). */
export function registration(o: Opts = {}) {
  const body = `<g stroke="${o.color ?? 'currentColor'}" fill="none" stroke-width="1"><circle cx="12" cy="12" r="6.5"/><path d="M12 0V24M0 12H24"/></g>`;
  return svg(24, 24, body, { size: o.size ?? 24, ...o, color: 'none' });
}

/** Pseudo barcode — deterministic per seed. */
export function barcode(seed = 7, o: Opts & { bars?: number; h?: number } = {}) {
  const r = rng(seed);
  const n = o.bars ?? 42;
  let x = 0;
  let body = '';
  for (let i = 0; i < n; i++) {
    const w = 1 + Math.floor(r() * 3);
    if (i % 2 === 0) body += `<rect x="${x}" y="0" width="${w}" height="${o.h ?? 20}"/>`;
    x += w;
  }
  return svg(x, o.h ?? 20, body, { size: o.size ?? x * 2, ...o });
}

/** Dot matrix grid — `fill(x,y)` decides each dot. */
export function dotMatrix(cols: number, rows: number, fill: (x: number, y: number) => boolean = () => true, o: Opts = {}) {
  let body = '';
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (fill(x, y)) body += `<circle cx="${x * 4 + 2}" cy="${y * 4 + 2}" r="1.3"/>`;
  return svg(cols * 4, rows * 4, body, { size: o.size ?? cols * 8, ...o }).replace('shape-rendering="crispEdges"', '');
}

/** Corner brackets frame (draw around something). */
export function brackets(w = 120, h = 80, len = 10, o: Opts = {}) {
  const d = `M0 ${len}V0H${len}M${w - len} 0H${w}V${len}M${w} ${h - len}V${h}H${w - len}M${len} ${h}H0V${h - len}`;
  const body = `<path d="${d}" stroke="${o.color ?? 'currentColor'}" fill="none" stroke-width="2"/>`;
  return svg(w, h, body, { size: o.size ?? w, ...o, color: 'none' });
}

/** Industrial connector diagram (plug with pins + cable). */
export function connector(o: Opts & { pins?: number } = {}) {
  const pins = o.pins ?? 4;
  let p = '';
  for (let i = 0; i < pins; i++) p += `<rect x="${6 + i * 6}" y="0" width="2" height="6"/>`;
  const w = 12 + pins * 6;
  const body = `${p}<rect x="2" y="6" width="${w - 4}" height="12"/><rect x="5" y="9" width="${w - 10}" height="2" fill="#000"/><rect x="${w / 2 - 4}" y="18" width="8" height="4"/><rect x="${w / 2 - 2}" y="22" width="4" height="10"/>`;
  return svg(w, 32, body, { size: o.size ?? w * 1.5, ...o });
}

/** Ring of segments — static defrag disc. */
export function segRing(seed = 3, o: Opts & { rings?: number; segs?: number } = {}) {
  const r = rng(seed);
  const rings = o.rings ?? 4;
  const segs = o.segs ?? 36;
  let body = '';
  for (let k = 0; k < rings; k++) {
    const r0 = 20 + k * 7;
    const r1 = r0 + 5;
    for (let i = 0; i < segs; i++) {
      if (r() < 0.4) continue;
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 0.8) / segs) * Math.PI * 2;
      const pt = (rad: number, a: number) => `${(50 + Math.cos(a) * rad).toFixed(2)} ${(50 + Math.sin(a) * rad).toFixed(2)}`;
      body += `<path d="M${pt(r0, a0)}L${pt(r1, a0)}A${r1} ${r1} 0 0 1 ${pt(r1, a1)}L${pt(r0, a1)}A${r0} ${r0} 0 0 0 ${pt(r0, a0)}Z" opacity="${r() < 0.3 ? 0.35 : 1}"/>`;
    }
  }
  return svg(100, 100, body, { size: o.size ?? 100, ...o }).replace('shape-rendering="crispEdges"', '');
}

/** Triangle tiling (the "fault" pattern). */
export function triTile(cols = 8, rows = 4, seed = 2, o: Opts & { alt?: string } = {}) {
  const r = rng(seed);
  let body = '';
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const v = r();
      const X = x * 10;
      const Y = y * 10;
      if (v < 0.25) body += `<path d="M${X} ${Y}h10L${X} ${Y + 10}z"/>`;
      else if (v < 0.5) body += `<path d="M${X + 10} ${Y}v10H${X}z"/>`;
      else if (v < 0.75) body += `<path d="M${X} ${Y}h10v10z"/>`;
      else body += `<path d="M${X} ${Y}v10h10z" fill="${o.alt ?? 'currentColor'}"/>`;
    }
  return svg(cols * 10, rows * 10, body, { size: o.size ?? cols * 20, ...o }).replace('shape-rendering="crispEdges"', '');
}

/** Pixel-block wordmark: render text as giant pixel blocks via a mini 3×5 font. */
const F35: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '0': '111101101101111', '1': '010110010010111',
  '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110',
  '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  '/': '001001010100100', '-': '000000111000000', '.': '000000000000010', ' ': '000000000000000',
  _: '000000000000111', ':': '000010000010000',
};
export function blockText(text: string, o: Opts & { gap?: number } = {}) {
  const gap = o.gap ?? 1;
  const chars = text.toUpperCase().split('');
  const rows = ['', '', '', '', ''];
  chars.forEach((ch, i) => {
    const g = F35[ch] ?? F35[' '];
    for (let y = 0; y < 5; y++) {
      rows[y] += g.slice(y * 3, y * 3 + 3).replace(/1/g, '#').replace(/0/g, '.');
      if (i < chars.length - 1) rows[y] += '.'.repeat(gap);
    }
  });
  return bitmap(rows, { size: o.size ?? rows[0].length * 6, ...o });
}
