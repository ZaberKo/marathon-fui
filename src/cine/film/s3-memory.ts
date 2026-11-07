/**
 * 0:25–0:38 — memory: the module is a 3D *line drawing* (hidden lines removed
 * by black occluders); the loaded state is FLAT 2D lemon fills laid over the
 * projected cell tops — the reference's mix of 3D structure + 2D signal.
 * Fragment 411 fails cohesion (passphrase wall) and is skipped. Then the psyche
 * loads into the buffer as a dense tangle of many kinds of lines in a brain.
 */
import * as THREE from 'three/webgpu';
import type { Frame, ShotDef } from '../engine';
import { clamp01, hash } from '../engine';
import { C, F, checker, line, microRows, rect, ring, text } from '../draw';
import { backdrop, PAL_BLUE } from '../backdrop';
import { brainGeometry } from '../models/anatomy';
import { brainCircuits, circuitMaterial } from '../models/circuits';
import { contourMaterial } from '../../three/materials';
import { ANCHORS } from './cues';
import { cutGlitch, easeInOutCubic, easeOutExpo, persp, smooth, span, vlabel } from './kit';

type P2 = [number, number];
type Cell = {
  c: THREE.Vector3;
  top: THREE.Vector3[];
  details: THREE.Vector3[][];
  pads: THREE.Vector3[][];
  col: number;
  big: boolean;
};

const occ = new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const LINE_A = new THREE.LineBasicMaterial({ color: 0x1fc8e8 });
const LINE_B = new THREE.LineBasicMaterial({ color: 0x1590b0 });

/** extrude a closed 2D outline (x, z) between y0 and y0 + h: black occluder + line edges */
function extrude(g: THREE.Group, poly: P2[], y0: number, h: number, mat = LINE_A, solid = true) {
  const pos: number[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[(i + 1) % n];
    pos.push(ax, y0 + h, az, bx, y0 + h, bz); // top
    pos.push(ax, y0, az, bx, y0, bz); // bottom
    pos.push(ax, y0, az, ax, y0 + h, az); // vertical
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.LineSegments(lg, mat));
  if (solid) {
    const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
    const eg = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    eg.rotateX(-Math.PI / 2);
    eg.translate(0, y0, 0);
    g.add(new THREE.Mesh(eg, occ));
  }
}
const rectP = (cx: number, cz: number, w: number, d: number): P2[] => [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
/** chip-package outline: notched sides (an I/H profile) */
function notched(cx: number, cz: number, w: number, d: number, vertical: boolean): P2[] {
  const n = (vertical ? d : w) * 0.22;
  const k = (vertical ? w : d) * 0.09;
  if (vertical)
    return [
      [cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz - d / 2 + n], [cx + w / 2 - k, cz - d / 2 + n], [cx + w / 2 - k, cz + d / 2 - n], [cx + w / 2, cz + d / 2 - n],
      [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2], [cx - w / 2, cz + d / 2 - n], [cx - w / 2 + k, cz + d / 2 - n], [cx - w / 2 + k, cz - d / 2 + n], [cx - w / 2, cz - d / 2 + n],
    ];
  return [
    [cx - w / 2, cz - d / 2], [cx - w / 2 + n, cz - d / 2], [cx - w / 2 + n, cz - d / 2 + k], [cx + w / 2 - n, cz - d / 2 + k], [cx + w / 2 - n, cz - d / 2], [cx + w / 2, cz - d / 2],
    [cx + w / 2, cz + d / 2], [cx + w / 2 - n, cz + d / 2], [cx + w / 2 - n, cz + d / 2 - k], [cx - w / 2 + n, cz + d / 2 - k], [cx - w / 2 + n, cz + d / 2], [cx - w / 2, cz + d / 2],
  ];
}
const chamfer = (cx: number, cz: number, w: number, d: number, c: number): P2[] => [
  [cx - w / 2 + c, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2], [cx - w / 2, cz - d / 2 + c],
];

/** The memory module: 8 × 6 slots of mixed chip cells, two 2×2 dies, edge pins. */
function buildModule(g: THREE.Group) {
  const COLS = 8;
  const ROWS = 6;
  const P = 1.16;
  const x0 = -((COLS - 1) * P) / 2;
  const z0 = -((ROWS - 1) * P) / 2;
  const cells: Cell[] = [];
  const used = new Set<string>();
  const bigs: [number, number][] = [[0, 0], [3, 2]];
  for (const [c, r] of bigs) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) used.add(`${c + a},${r + b}`);
  // board: two outline loops + a recessed floor, edge pins, margin traces
  const bw = COLS * P + 0.7;
  const bd = ROWS * P + 0.7;
  extrude(g, rectP(0, 0, bw, bd), -0.22, 0.2, LINE_B);
  extrude(g, rectP(0, 0, bw - 0.24, bd - 0.24), -0.02, 0.0, LINE_B, false);
  for (let i = 0; i < 22; i++) {
    const z = z0 - 0.3 + i * ((bd - 0.6) / 21);
    if (i === 7 || i === 15) continue;
    extrude(g, rectP(-bw / 2 - 0.2, z, 0.4, 0.12), -0.12, 0.06, LINE_A);
  }
  const tr: number[] = [];
  for (let i = 0; i < 26; i++) {
    const x = x0 - 0.2 + i * ((COLS * P) / 25);
    tr.push(x, 0.0, -bd / 2 + 0.06, x, 0.0, -bd / 2 + 0.2 + hash(i, 3) * 0.12);
    tr.push(x, 0.0, bd / 2 - 0.06, x, 0.0, bd / 2 - 0.2 - hash(i, 4) * 0.12);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tr, 3));
  g.add(new THREE.LineSegments(tg, LINE_B));

  const addCell = (col: number, row: number, span: number) => {
    const cx = x0 + col * P + ((span - 1) * P) / 2;
    const cz = z0 + row * P + ((span - 1) * P) / 2;
    const w = span * P - 0.16;
    const d = span * P - 0.16;
    const r = (k: number) => hash(col, row, k);
    const h = span > 1 ? 0.34 : 0.16 + r(1) * 0.14;
    const kind = span > 1 ? 9 : Math.floor(r(2) * 5);
    let outline: P2[];
    if (kind === 0 || kind === 1) outline = notched(cx, cz, w, d, kind === 0);
    else if (kind === 2) outline = chamfer(cx, cz, w, d, 0.18);
    else outline = rectP(cx, cz, w, d);
    extrude(g, outline, 0, h);
    const top = h;
    const details: P2[][] = [];
    const pads: P2[][] = [];
    const boss = (poly: P2[], hh: number, mat = LINE_B) => {
      extrude(g, poly, top, hh, mat);
      details.push(poly);
    };
    if (kind === 9) {
      // a die: double frame, raised core, contact columns
      boss(rectP(cx - 0.12, cz, w * 0.62, d * 0.62), 0.05);
      boss(rectP(cx - 0.12, cz, w * 0.4, d * 0.4), 0.12, LINE_A);
      for (let k = 0; k < 7; k++) {
        const p = rectP(cx + w * 0.38, cz - d * 0.36 + k * (d * 0.72) / 6, 0.12, 0.07);
        extrude(g, p, top, 0.03, LINE_B);
        pads.push(p);
      }
      for (let k = 0; k < 6; k++) {
        const p = rectP(cx - w * 0.3 + k * 0.16, cz + d * 0.42, 0.09, 0.07);
        extrude(g, p, top, 0.03, LINE_B);
        pads.push(p);
      }
    } else {
      const v = r(3);
      if (v < 0.45) {
        boss(rectP(cx, cz - 0.06, w * 0.58, d * 0.5), 0.04);
        details.push(rectP(cx, cz - 0.06, w * 0.32, d * 0.26));
      } else if (v < 0.7) {
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) boss(rectP(cx + a * w * 0.2, cz + b * d * 0.18 - 0.05, w * 0.3, d * 0.26), 0.04);
      } else {
        for (let k = 0; k < 3; k++) boss(rectP(cx - w * 0.22 + k * w * 0.22, cz - 0.05, w * 0.12, d * 0.5), 0.05);
      }
      // two rows of contacts along the lower edge
      for (let rr = 0; rr < 2; rr++)
        for (let k = 0; k < 4; k++) {
          const p = rectP(cx - w * 0.3 + k * w * 0.2, cz + d * 0.3 + rr * 0.07, w * 0.14, 0.04);
          extrude(g, p, top, 0.02, LINE_B);
          pads.push(p);
        }
    }
    const V = (q: P2, y: number) => new THREE.Vector3(q[0], y, q[1]);
    cells.push({
      c: new THREE.Vector3(cx, top, cz),
      top: outline.map((q) => V(q, top)),
      details: details.map((poly) => poly.map((q) => V(q, top + 0.001))),
      pads: pads.map((poly) => poly.map((q) => V(q, top + 0.001))),
      col: col + (span - 1) * 0.5,
      big: span > 1,
    });
  };
  for (const [c, r] of bigs) addCell(c, r, 2);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!used.has(`${c},${r}`)) addCell(c, r, 1);
  return { cells, bw, bd };
}

export const s3: ShotDef[] = [
  {
    id: 'S06',
    t0: 24.6,
    t1: 34.4,
    title: 'Loading memory packages',
    note: 'Seen from almost straight above, the memory module is a chip array of mixed cells — notched packages, chamfered cells, two dies, bosses, contact rows, edge pins — drawn in 3D lines with hidden lines removed. Loaded cells become flat lemon graphics laid over their projected tops (with their details cut out in black), column by column under a write head. One fragment fails cohesion: the passphrase wall flashes, it is marked and skipped.',
    build: () => {
      const scene = new THREE.Scene();
      const cam = persp(28, 0.1, 100);
      const g = new THREE.Group();
      scene.add(g);
      const { cells, bd } = buildModule(g);
      // fragment 411 = a single cell in the middle of the field
      const FAIL = cells.findIndex((c) => !c.big && Math.abs(c.col - 5) < 0.1 && c.c.z > -0.5 && c.c.z < 0.7);
      const order = cells.map((_, i) => i).sort((a, b) => cells[a].col - cells[b].col || cells[a].c.z - cells[b].c.z);
      const landAt = (i: number) => 1.0 + cells[i].col * 0.92 + (cells[i].c.z + bd / 2) * 0.05 + hash(i, 4) * 0.12;
      const head = new THREE.Mesh(new THREE.PlaneGeometry(0.035, bd + 0.6), new THREE.MeshBasicMaterial({ color: 0xe8ff40, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      head.rotation.x = -Math.PI / 2;
      head.position.y = 0.62;
      scene.add(head);
      const Pj = (v: THREE.Vector3, f: Frame) => f.gl.project(v, cam);
      const poly = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], fill?: string, stroke?: string, lw = 2) => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      };
      void order;
      return {
        draw(f) {
          const { bg, fg, t } = f;
          const failT = ANCHORS.dip - f.T + t;
          if (t > failT - 0.05 && t < failT + 0.85) {
            const tq = t - failT;
            const fs = 168;
            [250, 390, 530, 670, 810].forEach((y, i) => {
              const dir = i % 2 ? 1 : -1;
              const ofs = ((tq * 260 * dir) % 900) - 900;
              if (i === 2) {
                for (let k = 0; k < 6; k++) text(fg, 'FAIL_', ofs * 0.5 + k * 440 - 200, y, { size: fs, weight: 700, color: '#2a7a20', stroke: 2, stretch: 'condensed' });
                const w = tq < 0.4 ? 'COHESION' : 'FAILURE';
                const x = tq < 0.4 ? 360 : 1010;
                rect(fg, x - 10, y - 128, w.length * 84 + 20, 148, '#000');
                text(fg, w, x, y, { size: fs, weight: 800, color: C.yellowHi, stretch: 'condensed' });
              } else for (let k = 0; k < 4; k++) text(fg, 'PASSPHRASE_', ofs + k * 940, y, { size: fs, weight: 700, color: '#2a7a20', stroke: 2, stretch: 'condensed' });
            });
            for (const y of [80, 930]) {
              rect(fg, 590, y - 14, 46, 26, C.yellowHi);
              text(fg, 'F411', 594, y + 4, { size: 13, weight: 800, color: '#000' });
              microRows(fg, 650, y - 2, ['LNKTL  ■■  LATCH', 'PULL ●  KL2 KL4'], { size: 15, family: F.mono, weight: 700, color: C.yellowHi, lh: 17 });
            }
            cutGlitch(f, tq, 0.12, ['#000', C.yellowHi, '#2a7a20'], 9);
            f.post.tint = [0.6, 1, 0.4];
            return;
          }
          backdrop(bg, { seed: 61, dx: t * 26, alpha: 0.85, pal: PAL_BLUE });
          // near top-down: a slow drift and a slight turn, never lower than ~70°
          const u = easeInOutCubic(clamp01(t / 9.8));
          const yaw = -0.1 + u * 0.16;
          const R = 4.4 - u * 1.0;
          cam.position.set(-0.5 + u * 0.7 + Math.sin(yaw) * R, 19.5 - u * 2.2, Math.cos(yaw) * R);
          cam.up.set(0, 1, 0);
          cam.lookAt(-0.3 + u * 0.5, 0, 0.35);
          cam.updateMatrixWorld();
          f.three = { scene, camera: cam };
          // write head sweeps across the columns
          const colNow = (t - 1.0) / 0.92;
          head.position.x = -4.1 + clamp01(colNow / 8) * 9.3;
          head.visible = colNow > -0.5 && colNow < 8.2;
          // flat 2D signal layer over the projected cell tops
          let done = 0;
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const la = landAt(i);
            const fail = i === FAIL;
            if (t < la) continue;
            if (fail) {
              if (t < failT) {
                const fl = Math.floor(t * 12) % 2;
                poly(fg, cell.top.map((p) => Pj(p, f)), fl ? C.red : undefined, C.red, 2);
                continue;
              }
              poly(fg, cell.top.map((p) => Pj(p, f)), C.red);
              for (const d of cell.details) poly(fg, d.map((p) => Pj(p, f)), undefined, '#000', 2);
              const c = Pj(cell.c, f);
              line(fg, c.x - 22, c.y - 14, c.x + 22, c.y + 14, '#000', 4);
              line(fg, c.x + 22, c.y - 14, c.x - 22, c.y + 14, '#000', 4);
              line(fg, c.x + 30, c.y - 20, c.x + 120, c.y - 110, C.red, 1.5);
              rect(fg, c.x + 120, c.y - 128, 190, 24, C.red);
              text(fg, 'F411 · SKIPPED', c.x + 128, c.y - 110, { size: 15, family: F.mono, weight: 700, color: '#000' });
              continue;
            }
            done++;
            const age = t - la;
            const flash = age < 0.07 || (age < 0.2 && Math.floor(age * 30) % 2 === 0);
            poly(fg, cell.top.map((p) => Pj(p, f)), flash ? '#ffffff' : C.lemon);
            for (const d of cell.details) poly(fg, d.map((p) => Pj(p, f)), undefined, '#000', cell.big ? 3 : 2);
            for (const pd of cell.pads) poly(fg, pd.map((p) => Pj(p, f)), '#000');
          }
          vlabel(fg, 'LOADING', 1790, 140, 34, C.lemon);
          vlabel(fg, 'MEMORY', 1756, 140, 34, C.lemon);
          text(fg, `PKG ${String(done).padStart(2, '0')}/${cells.length - 1}`, 1560, 1010, { size: 18, family: F.mono, weight: 700, color: C.lemon });
          fg.save();
          fg.translate(1660, 860);
          fg.rotate(Math.PI / 4 + Math.floor(t * 3) * (Math.PI / 2));
          checker(fg, -40, -40, 4, 4, 20, C.lemon);
          fg.restore();
          text(fg, '←', 1560, 560, { size: 56, weight: 400, color: '#2a3cff' });
          microRows(fg, 1580, 640, ['SDR37  2445', 'Mq EXC  FF'], { size: 18, family: F.mono, weight: 700, color: C.lemon, lh: 21 });
          microRows(fg, 96, 120, ['0e00ET C2092EE/005.S', 'BANK 03 · 46 CELLS'], { size: 15, family: F.mono, weight: 700, color: '#1fc8e8', lh: 19 });
          cutGlitch(f, t, 0.1, ['#000', C.lemon, C.blue], 10);
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S07',
    t0: 34.4,
    t1: ANCHORS.runner,
    title: 'Liminal buffer 26%',
    note: 'The psyche streams into the buffer: inside a faint brain shell, thousands of short circuits — dendrites, orthogonal traces with vias, loops, dotted chains, synaptic bursts — fire in waves from the brain stem forward; each flashes, then keeps pulsing outward along its branches. On the lift a second wave fires.',
    build: () => {
      const scene = new THREE.Scene();
      const cam = persp(30);
      const LIFT = ANCHORS.lift - 34.4;
      const timeOf = (r: number) => {
        if (r < 0.5) return 0.1 + 2.25 * (r / 0.5);
        if (r < 0.74) return LIFT + ((r - 0.5) / 0.24) * 0.9;
        return Infinity;
      };
      const seedP = new THREE.Vector3(0, -0.35, -0.45);
      const NC = 3800;
      const cg = brainCircuits({ n: NC, seed: 5, order: (q) => q.distanceTo(seedP) / 2, timeOf });
      const cm = circuitMaterial({ dim: 0.09 });
      const circuits = new THREE.LineSegments(cg, cm.mat);
      const shellM = contourMaterial({ line: 0x2a3cff, body: 0x000008, freq: 26, width: 1.0, axis: 'x', space: 'local', rim: 0x6a7aff, rimWidth: 0.5, opacity: 0.5 });
      shellM.mat.depthWrite = false;
      const shell = new THREE.Mesh(brainGeometry(40, 8), shellM.mat);
      shell.scale.setScalar(1.02);
      const gr = new THREE.Group();
      gr.add(shell, circuits);
      scene.add(gr);
      return {
        draw(f) {
          const { bg, fg, t, T } = f;
          backdrop(bg, { seed: 71, dx: t * 18, alpha: 0.5, pal: PAL_BLUE });
          const pct = Math.min(26, Math.floor(easeOutExpo(span(t, 0.2, 2.6)) * 26));
          cm.time.value = t;
          gr.rotation.set(0.25, -0.6 + t * 0.3, 0);
          const punch = easeInOutCubic(span(T, ANCHORS.lift, ANCHORS.lift + 0.5));
          cam.position.set(0, 0.15, 3.7 - punch * 0.75);
          cam.lookAt(0, 0.02, 0);
          f.three = { scene, camera: cam };
          const R = 400 + punch * 240;
          ring(fg, 960, 540, R, C.red, 2);
          fg.save();
          fg.setLineDash([4, 3]);
          ring(fg, 960, 540, R + 34, C.red, 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
          fg.restore();
          vlabel(fg, String(pct).padStart(2, '0'), 960 + R * 0.66, 380, 150, C.red, { weight: 600, stretch: 'semi-expanded' });
          vlabel(fg, 'LIMINAL BUFFER', 960 + R * 0.66 - 30, 380, 22, C.red, { weight: 800 });
          text(fg, '%', 960 + R * 0.66 + 30, 690, { size: 40, weight: 800, color: C.red });
          const active = Math.floor(NC * Math.min(0.74, t < LIFT ? 0.5 * clamp01((t - 0.1) / 2.25) : 0.5 + 0.24 * clamp01((t - LIFT) / 0.9)));
          microRows(fg, 160, 160, ['PSYCHE STREAM', `CIRCUITS ${String(active).padStart(4, '0')}/${NC}`, 'DEN · TRC · LOOP · CHN · SYN'], { size: 16, family: F.mono, weight: 700, color: '#ff6a6a', lh: 20 });
          cutGlitch(f, t, 0.1, ['#000', C.red], 11);
          f.post.tint = [1, 0.55, 0.6];
          void smooth;
        },
      };
    },
  },
];
