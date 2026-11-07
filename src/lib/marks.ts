/**
 * Animated vector marks — live SVG instruments updated by stepLoop.
 *
 *   mountMark(el, 'checker', { cols: 3, mode: 'noise' })
 *   <span data-mark="reticle" data-size="96"></span>   (auto via hydrate)
 *
 * Every mark: stepped frames only, currentColor + --accent, crispEdges,
 * pauses off-screen, returns a cleanup.
 */
import { mountDefragRing } from './defrag';
import { pixelSigil, blockText } from './glyphs';
import { pad, rng, stepLoop } from './util';

const NS = 'http://www.w3.org/2000/svg';
type Attrs = Record<string, string | number>;
const S = (tag: string, a: Attrs = {}, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, String(a[k]));
  parent?.appendChild(e);
  return e;
};
const svgRoot = (el: HTMLElement, vw: number, vh: number, size: number, crisp = true) => {
  el.innerHTML = '';
  el.classList.add('mk');
  const s = S('svg', {
    viewBox: `0 0 ${vw} ${vh}`,
    width: size,
    height: Math.round((size * vh) / vw),
    'shape-rendering': crisp ? 'crispEdges' : 'geometricPrecision',
    'aria-hidden': 'true',
  });
  el.appendChild(s);
  return s as SVGSVGElement;
};
const ACC = 'var(--accent)';

export type MarkOpts = Record<string, string | number | undefined>;
type MarkFn = (el: HTMLElement, o: MarkOpts) => () => void;

/* ------------------------------------------------------------------ */
const checker: MarkFn = (el, o) => {
  const cols = Number(o.cols ?? 2);
  const rows = Number(o.rows ?? 2);
  const mode = String(o.mode ?? 'invert');
  const s = svgRoot(el, cols, rows, Number(o.size ?? cols * 22));
  const g = S('g', {}, s);
  const cells: SVGElement[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push(S('rect', { x, y, width: 1, height: 1, fill: 'currentColor' }, g));
  const r = rng(cols * 31 + rows);
  let shift = 0;
  return stepLoop(Number(o.fps ?? 6), (f) => {
    cells.forEach((c, i) => {
      const x = i % cols;
      const y = Math.floor(i / cols);
      let on = (x + y + shift) % 2 === 0;
      if (mode === 'noise') on = r() < 0.5;
      if (mode === 'invert' && f % 8 === 7) on = r() < 0.5; // noise frame between flips
      c.setAttribute('opacity', on ? '1' : '0');
    });
    if (mode === 'invert' && f % 8 === 0) shift++;
    if (mode === 'shift') shift++;
    if (mode === 'rotate') g.setAttribute('transform', `rotate(${(f % 4) * 90} ${cols / 2} ${rows / 2})`);
  }, el);
};

/* ------------------------------------------------------------------ */
const locator: MarkFn = (el, o) => {
  const s = svgRoot(el, 11, 11, Number(o.size ?? 64));
  S('path', { d: 'M2 2h7v7H2zM3 3v5h5V3z', 'fill-rule': 'evenodd', fill: 'currentColor' }, s);
  const core = S('rect', { fill: 'currentColor' }, s);
  const ticks = S('path', { fill: 'none', stroke: ACC, 'stroke-width': 0.5 }, s);
  const seq = [3, 3, 1, 1, 2, 3, 3, 0];
  return stepLoop(Number(o.fps ?? 6), (f) => {
    const k = seq[f % seq.length];
    core.setAttribute('x', String(5.5 - k / 2));
    core.setAttribute('y', String(5.5 - k / 2));
    core.setAttribute('width', String(k));
    core.setAttribute('height', String(k));
    const e = [0.25, 0.75, 1.25, 0.75][Math.floor(f / 2) % 4];
    const L = 1.4;
    ticks.setAttribute(
      'd',
      `M${e} ${e + L}V${e}H${e + L}M${11 - e - L} ${e}H${11 - e}V${e + L}M${11 - e} ${11 - e - L}V${11 - e}H${11 - e - L}M${e + L} ${11 - e}H${e}V${11 - e - L}`,
    );
  }, el);
};

/* ------------------------------------------------------------------ */
const crosshair: MarkFn = (el, o) => {
  const s = svgRoot(el, 33, 33, Number(o.size ?? 64));
  const arms = S('path', { stroke: 'currentColor', 'stroke-width': 1, fill: 'none' }, s);
  const dot = S('rect', { x: 15.5, y: 15.5, width: 2, height: 2, fill: ACC }, s);
  const gaps = [3, 5, 8, 11, 8, 5, 3, 3, 3];
  return stepLoop(Number(o.fps ?? 8), (f) => {
    const g = gaps[f % gaps.length];
    const c = 16.5;
    arms.setAttribute('d', `M${c} 1V${c - g}M${c} ${c + g}V32M1 ${c}H${c - g}M${c + g} ${c}H32`);
    arms.setAttribute('stroke', g === 3 ? ACC : 'currentColor');
    dot.setAttribute('opacity', f % 2 ? '1' : '0');
  }, el);
};

/* ------------------------------------------------------------------ */
const reticle: MarkFn = (el, o) => {
  const s = svgRoot(el, 64, 64, Number(o.size ?? 96), false);
  S('circle', { cx: 32, cy: 32, r: 29, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.75 }, s);
  const outer = S('g', {}, s);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r1 = i % 9 === 0 ? 22 : 26;
    S('line', { x1: 32 + Math.cos(a) * r1, y1: 32 + Math.sin(a) * r1, x2: 32 + Math.cos(a) * 29, y2: 32 + Math.sin(a) * 29, stroke: 'currentColor', 'stroke-width': i % 9 === 0 ? 1.5 : 0.6 }, outer);
  }
  const inner = S('g', {}, s);
  S('path', { d: 'M32 14A18 18 0 0 1 50 32', fill: 'none', stroke: ACC, 'stroke-width': 2.5 }, inner);
  S('path', { d: 'M32 50A18 18 0 0 1 14 32', fill: 'none', stroke: ACC, 'stroke-width': 2.5 }, inner);
  S('circle', { cx: 32, cy: 32, r: 1.6, fill: 'currentColor' }, s);
  return stepLoop(Number(o.fps ?? 8), (f) => {
    outer.setAttribute('transform', `rotate(${(f % 36) * 10} 32 32)`);
    inner.setAttribute('transform', `rotate(${-(Math.floor(f / 2) % 8) * 45} 32 32)`);
  }, el);
};

/* ------------------------------------------------------------------ */
const target: MarkFn = (el, o) => {
  const w = 120;
  const h = 72;
  const s = svgRoot(el, w, h, Number(o.size ?? 180));
  const br = S('path', { fill: 'none', 'stroke-width': 2 }, s);
  const fill = S('rect', { fill: ACC, opacity: 0 }, s);
  const t1 = S('text', { x: 4, y: h - 3, 'font-size': 6, fill: 'currentColor', 'font-family': 'IBM Plex Mono, monospace' }, s);
  const t2 = S('text', { x: w - 4, y: h - 3, 'font-size': 6, 'text-anchor': 'end', fill: ACC, 'font-family': 'Silkscreen, monospace' }, s);
  const insets = [26, 20, 14, 9, 6, 6, 6, 6, 6, 6, 26];
  return stepLoop(Number(o.fps ?? 8), (f) => {
    const k = f % insets.length;
    const i = insets[k];
    const L = 8;
    const x0 = i;
    const y0 = i * 0.6;
    const x1 = w - i;
    const y1 = h - i * 0.6;
    br.setAttribute('d', `M${x0} ${y0 + L}V${y0}H${x0 + L}M${x1 - L} ${y0}H${x1}V${y0 + L}M${x1} ${y1 - L}V${y1}H${x1 - L}M${x0 + L} ${y1}H${x0}V${y1 - L}`);
    const locked = k >= 4 && k < 10;
    br.setAttribute('stroke', locked ? ACC : 'currentColor');
    fill.setAttribute('x', String(x0 + 4));
    fill.setAttribute('y', String(y0 + 4));
    fill.setAttribute('width', String(Math.max(0, x1 - x0 - 8)));
    fill.setAttribute('height', String(Math.max(0, y1 - y0 - 8)));
    fill.setAttribute('opacity', locked && k % 2 === 0 ? '0.18' : '0');
    t1.textContent = `X${pad(240 + ((f * 37) % 90), 3)} Y${pad(120 + ((f * 13) % 40), 3)}`;
    t2.textContent = locked ? 'LOCKED' : 'SEARCH';
  }, el);
};

/* ------------------------------------------------------------------ */
const barcode: MarkFn = (el, o) => {
  const n = Number(o.bars ?? 44);
  const r = rng(Number(o.seed ?? 3));
  const widths = Array.from({ length: n }, () => 1 + Math.floor(r() * 3));
  const W = widths.reduce((a, b) => a + b, 0);
  const H = 24;
  const s = svgRoot(el, W, H + 7, Number(o.size ?? 220));
  const g = S('g', {}, s);
  const scan = S('rect', { y: 0, width: 1, height: H, fill: ACC }, s);
  const label = S('text', { x: 0, y: H + 6.5, 'font-size': 5.5, fill: 'currentColor', 'font-family': 'IBM Plex Mono, monospace', 'letter-spacing': 0.5 }, s);
  const draw = () => {
    g.innerHTML = '';
    let x = 0;
    widths.forEach((w, i) => {
      if (i % 2 === 0) S('rect', { x, y: 0, width: w, height: H, fill: 'currentColor' }, g);
      x += w;
    });
  };
  draw();
  let sx = 0;
  return stepLoop(Number(o.fps ?? 12), (f) => {
    sx = (sx + 3) % (W + 20);
    scan.setAttribute('x', String(sx));
    // bars under the scan line mutate
    let x = 0;
    widths.forEach((w, i) => {
      if (Math.abs(x - sx) < 3 && r() < 0.6) widths[i] = 1 + Math.floor(r() * 3);
      x += w;
    });
    if (f % 2 === 0) draw();
    label.textContent = `SDR37 ${pad(2445556 + (f % 997), 7)} · QR EXC FF`;
  }, el);
};

/* ------------------------------------------------------------------ */
/* LINK — plug grid; plugs slide into sockets one by one               */
const link: MarkFn = (el, o) => {
  const cols = Number(o.cols ?? 3);
  const rows = Number(o.rows ?? 2);
  const cw = 34;
  const ch = 20;
  const s = svgRoot(el, cols * cw + 4, rows * ch + 2, Number(o.size ?? 220));
  const cells = [] as { plug: SVGElement; sock: SVGElement; fill: SVGElement; x: number; y: number }[];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = 2 + i * cw;
      const y = 2 + j * ch;
      const sock = S('path', { d: `M${x + 18} ${y}h12v14h-12v-4h8v-6h-8z`, fill: 'currentColor' }, s);
      const fill = S('rect', { x: x + 18, y, width: 12, height: 14, fill: ACC, opacity: 0 }, s);
      const plug = S('path', { fill: 'currentColor' }, s);
      cells.push({ plug, sock, fill, x, y });
    }
  const tag = S('text', { x: cols * cw, y: rows * ch, 'font-size': 6, 'text-anchor': 'end', fill: ACC, 'font-family': 'Silkscreen, monospace' }, s);
  const per = 4;
  return stepLoop(Number(o.fps ?? 8), (f) => {
    const total = cells.length * per + 10;
    const k = f % total;
    cells.forEach((c, i) => {
      const local = k - i * per;
      const stepIn = Math.max(0, Math.min(3, local)); // 0..3
      const dx = [0, 3, 6, 8][stepIn];
      // plug body 10x10 + prong 6x4
      c.plug.setAttribute('d', `M${c.x + dx} ${c.y + 2}h10v10h-10zM${c.x + dx + 10} ${c.y + 5}h6v4h-6z`);
      const linked = local >= 3;
      c.fill.setAttribute('opacity', linked && k < total - 2 ? (local === 3 ? '1' : '0.35') : '0');
    });
    const done = Math.min(cells.length, Math.floor(k / per));
    tag.textContent = k >= cells.length * per ? (f % 2 ? 'LINK OK' : '') : `LINK ${done}/${cells.length}`;
  }, el);
};

/* ------------------------------------------------------------------ */
const segring: MarkFn = (el, o) => {
  // canvas defrag disc (lib/defrag.ts); colours follow currentColor / --accent
  const size = Number(o.size ?? 120);
  el.innerHTML = '';
  const cv = document.createElement('canvas');
  cv.style.cssText = `width:${size}px;height:${size}px;display:block`;
  el.appendChild(cv);
  const cs = getComputedStyle(el);
  const accent = cs.getPropertyValue('--accent').trim() || '#7dff1a';
  const small = size < 110;
  return mountDefragRing(cv, {
    rings: Number(o.rings ?? (small ? 2 : 3)),
    inner: small ? 0.42 : 0.38,
    cell: small ? 7 : 8,
    seed: Number(o.seed ?? 5),
    fps: Number(o.fps ?? 10),
    scale: !small,
    on: accent,
    data: cs.color,
    dim: '#0c0e3a',
    hi: '#ececec',
    line: '#3a3f6b',
  });
};

/* ------------------------------------------------------------------ */
const dots: MarkFn = (el, o) => {
  const cols = Number(o.cols ?? 12);
  const rows = Number(o.rows ?? 5);
  const mode = String(o.mode ?? 'wave');
  const s = svgRoot(el, cols * 4, rows * 4, Number(o.size ?? cols * 10), false);
  const d: SVGElement[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) d.push(S('circle', { cx: x * 4 + 2, cy: y * 4 + 2, r: 1.3, fill: 'currentColor' }, s));
  const r = rng(7);
  return stepLoop(Number(o.fps ?? 10), (f) => {
    d.forEach((c, i) => {
      const x = i % cols;
      const y = Math.floor(i / cols);
      let v = 0;
      if (mode === 'wave') v = Math.sin(x * 0.7 - f * 0.6 + y * 0.4) > 0.2 ? 1 : 0.15;
      else if (mode === 'scan') v = x === f % cols ? 1 : Math.abs(x - (f % cols)) === 1 ? 0.45 : 0.12;
      else if (mode === 'alarm') v = (f + Math.floor(i / 2)) % 2 ? 1 : 0.15;
      else v = r() < 0.4 ? 1 : 0.12;
      c.setAttribute('opacity', String(v));
      c.setAttribute('fill', v === 1 && mode === 'scan' && x === f % cols ? ACC : 'currentColor');
    });
  }, el);
};

/* ------------------------------------------------------------------ */
const tri: MarkFn = (el, o) => {
  const cols = Number(o.cols ?? 10);
  const rows = Number(o.rows ?? 4);
  const s = svgRoot(el, cols * 10, rows * 10, Number(o.size ?? cols * 22), false);
  const r = rng(Number(o.seed ?? 2));
  const shapes = ['M0 0h10L0 10z', 'M10 0v10H0z', 'M0 0h10v10z', 'M0 0v10h10z'];
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const p = S('path', { d: shapes[Math.floor(r() * 4)], fill: 'currentColor' }, s);
    p.setAttribute('transform', `translate(${(i % cols) * 10} ${Math.floor(i / cols) * 10})`);
    return p;
  });
  let hot = 0;
  return stepLoop(Number(o.fps ?? 6), () => {
    for (let k = 0; k < Math.ceil(cells.length * 0.08); k++) cells[Math.floor(r() * cells.length)].setAttribute('d', shapes[Math.floor(r() * 4)]);
    cells[hot].setAttribute('fill', 'currentColor');
    hot = Math.floor(r() * cells.length);
    cells[hot].setAttribute('fill', ACC);
  }, el);
};

/* ------------------------------------------------------------------ */
const sigil: MarkFn = (el, o) => {
  let seed = Number(o.seed ?? 11);
  const size = Number(o.size ?? 56);
  const w = Number(o.w ?? 7);
  const h = Number(o.h ?? 5);
  el.classList.add('mk');
  return stepLoop(Number(o.fps ?? 8), (f) => {
    const phase = f % 16;
    if (phase === 0) seed++;
    // frames 0-2 = noise, then resolve
    const sd = phase < 3 ? seed * 1000 + f : seed;
    el.innerHTML = pixelSigil(sd, { w, h, size, density: phase < 3 ? 0.5 : 0.55, sym: phase >= 3 });
  }, el);
};

/* ------------------------------------------------------------------ */
const blocktextMark: MarkFn = (el, o) => {
  const text = String(o.text ?? 'LINK 07');
  const size = Number(o.size ?? 240);
  el.classList.add('mk');
  el.innerHTML = blockText(text, { size });
  const svg = el.querySelector('svg')!;
  const rects = Array.from(svg.querySelectorAll('rect'));
  const vb = svg.viewBox.baseVal;
  const r = rng(9);
  return stepLoop(Number(o.fps ?? 12), (f) => {
    const cycle = f % 40;
    const sweep = (cycle / 14) * vb.width; // resolve left → right
    rects.forEach((rc) => {
      const x = Number(rc.getAttribute('x'));
      if (cycle >= 34) rc.setAttribute('opacity', r() < 0.5 ? '1' : '0'); // glitch-out
      else rc.setAttribute('opacity', x < sweep ? '1' : r() < 0.25 ? '1' : '0');
    });
  }, el);
};

/* ------------------------------------------------------------------ */
/* SCANBLOCK — the "INITIATING" composition                             */
const scanblock: MarkFn = (el, o) => {
  const W = 160;
  const H = 60;
  const s = svgRoot(el, W, H, Number(o.size ?? 320));
  S('path', { d: `M0 2H118v4h6v4h6v6h8v6h8v6H138v4h-8v6h-6v6H118v6H0z`, fill: 'var(--c-cobalt)' }, s);
  S('rect', { x: 0, y: 12, width: 100, height: 3, fill: '#000', opacity: 0.35 }, s);
  S('rect', { x: 0, y: 30, width: 70, height: 2, fill: '#000', opacity: 0.35 }, s);
  S('rect', { x: 0, y: 53, width: W, height: 2, fill: 'var(--c-cobalt)' }, s);
  const bar = S('rect', { y: 2, width: 3, height: 48, fill: ACC }, s);
  const prog = S('rect', { y: 52, width: 10, height: 4, fill: ACC }, s);
  const px = S('g', { fill: 'var(--c-cobalt)' }, s);
  const r = rng(4);
  return stepLoop(Number(o.fps ?? 12), (f) => {
    bar.setAttribute('x', String(((f * 7) % 130) + 2));
    prog.setAttribute('x', String((Math.floor(f / 3) * 10) % (W - 10)));
    px.innerHTML = '';
    for (let k = 0; k < 10; k++) S('rect', { x: 120 + Math.floor(r() * 38), y: 8 + Math.floor(r() * 40), width: 2 + Math.floor(r() * 4), height: 2, opacity: r() < 0.5 ? 1 : 0.5 }, px);
  }, el);
};

/* ------------------------------------------------------------------ */
/* COUNTRING — arc grows in steps while the number counts; fills & glitches */
const countring: MarkFn = (el, o) => {
  const s = svgRoot(el, 100, 100, Number(o.size ?? 140), false);
  const R = 40;
  const C = 2 * Math.PI * R;
  S('circle', { cx: 50, cy: 50, r: R - 6, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.5, opacity: 0.6 }, s);
  const arc = S('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: ACC, 'stroke-width': 4, transform: 'rotate(-90 50 50)', 'stroke-dasharray': `0 ${C}` }, s);
  const full = S('circle', { cx: 50, cy: 50, r: 30, fill: 'none', stroke: ACC, 'stroke-width': 14, opacity: 0 }, s);
  const num = S('text', { x: 54, y: 56, 'font-size': 20, 'font-weight': 800, fill: ACC, 'text-anchor': 'middle', 'font-family': 'Archivo Variable, sans-serif', 'font-stretch': '62%' }, s);
  const lbl = S('text', { x: 50, y: 66, 'font-size': 5, fill: 'currentColor', 'text-anchor': 'middle', 'font-family': 'Silkscreen, monospace' }, s);
  lbl.textContent = String(o.label ?? 'BUFFER');
  const max = Number(o.max ?? 268);
  const r = rng(3);
  return stepLoop(Number(o.fps ?? 10), (f) => {
    const k = f % 48;
    const p = Math.min(1, k / 36);
    const q = Math.floor(p * 16) / 16; // arc in 16 steps
    arc.setAttribute('stroke-dasharray', `${C * q * 0.82} ${C}`);
    num.textContent = String(Math.round(p * max));
    const end = k >= 37;
    full.setAttribute('opacity', end ? (k % 2 ? '1' : '0.6') : '0');
    full.setAttribute('stroke-dasharray', end ? `${2 + r() * 8} ${1 + r() * 4}` : '0');
  }, el);
};

/* ------------------------------------------------------------------ */
const chevrons: MarkFn = (el, o) => {
  const n = Number(o.count ?? 5);
  const s = svgRoot(el, n * 7, 8, Number(o.size ?? n * 16));
  const cs = Array.from({ length: n }, (_, i) =>
    S('path', { d: `M${i * 7} 0h2l3 4-3 4h-2l3-4z`, fill: 'currentColor' }, s),
  );
  return stepLoop(Number(o.fps ?? 10), (f) => {
    cs.forEach((c, i) => {
      const k = (f - i + n * 10) % (n + 3);
      c.setAttribute('fill', k === 0 ? ACC : 'currentColor');
      c.setAttribute('opacity', k <= 1 ? '1' : k <= 3 ? '0.5' : '0.18');
    });
  }, el);
};

/* ------------------------------------------------------------------ */
const bars: MarkFn = (el, o) => {
  const n = Number(o.count ?? 7);
  const s = svgRoot(el, n * 4, 16, Number(o.size ?? n * 8));
  const bs = Array.from({ length: n }, (_, i) => S('rect', { x: i * 4, width: 3, fill: 'currentColor' }, s));
  const v = bs.map(() => Math.random());
  return stepLoop(Number(o.fps ?? 8), () => {
    bs.forEach((b, i) => {
      v[i] = Math.max(0.1, Math.min(1, v[i] + (Math.random() - 0.5) * 0.6));
      const h = Math.max(1, Math.round(v[i] * 4)) * 4;
      b.setAttribute('y', String(16 - h));
      b.setAttribute('height', String(h));
      b.setAttribute('fill', h === 16 ? ACC : 'currentColor');
    });
  }, el);
};

/* ------------------------------------------------------------------ */
const connector: MarkFn = (el, o) => {
  const pins = Number(o.pins ?? 4);
  const w = 12 + pins * 6;
  const s = svgRoot(el, w, 34, Number(o.size ?? w * 2));
  const ps = Array.from({ length: pins }, (_, i) => S('rect', { x: 6 + i * 6, y: 0, width: 2, height: 6, fill: 'currentColor' }, s));
  S('rect', { x: 2, y: 6, width: w - 4, height: 12, fill: 'currentColor' }, s);
  const slot = S('rect', { x: 5, y: 9, width: w - 10, height: 2, fill: '#000' }, s);
  S('rect', { x: w / 2 - 4, y: 18, width: 8, height: 4, fill: 'currentColor' }, s);
  const cable = S('rect', { x: w / 2 - 2, y: 22, width: 4, height: 10, fill: 'currentColor' }, s);
  return stepLoop(Number(o.fps ?? 8), (f) => {
    ps.forEach((p, i) => p.setAttribute('fill', (f + i) % pins === 0 ? ACC : 'currentColor'));
    slot.setAttribute('fill', f % 4 === 0 ? 'var(--accent)' : '#000');
    cable.setAttribute('height', String(6 + (f % 3) * 2));
  }, el);
};

const MARKS: Record<string, MarkFn> = {
  checker, locator, crosshair, reticle, target, barcode, link, segring, dots, tri, sigil,
  blocktext: blocktextMark, scanblock, countring, chevrons, bars, connector,
};
export const markNames = Object.keys(MARKS);

export function mountMark(el: HTMLElement, kind: string, opts: MarkOpts = {}) {
  const fn = MARKS[kind];
  if (!fn) return () => {};
  return fn(el, opts);
}

/** Read data-* on el (except data-mark) into opts. */
export function markOptsFrom(el: HTMLElement): MarkOpts {
  const o: MarkOpts = {};
  for (const [k, v] of Object.entries(el.dataset)) if (k !== 'mark' && v != null) o[k] = isNaN(Number(v)) ? v : Number(v);
  return o;
}
