/**
 * 0:25–0:38 — memory: the module is a 3D *line drawing* (hidden lines removed
 * by black occluders); the loaded state is FLAT 2D lemon fills laid over the
 * projected cell tops — the reference's mix of 3D structure + 2D signal.
 * Fragment 411 fails cohesion (passphrase wall) and is skipped. Then the psyche
 * loads into the buffer as ascending nerve bundles.
 */
import * as THREE from 'three/webgpu';
import type { Frame, ShotDef } from '../engine';
import { clamp01, hash, q } from '../engine';
import { C, F, checker, line, microRows, rect, text } from '../draw';
import { backdrop, PAL_BLUE } from '../backdrop';
import { ascendingBundles, connectomeMaterial } from '../models/connectome';
import { BUFFER_LOAD_DURATION, BUFFER_LOCK_DURATION, createBufferDial } from './buffer-dial';
import { ANCHORS, cue } from './cues';
import { ST } from './times';
import { easeInOutCubic, persp, scrollRow, span, vlabel } from './kit';

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
/**
 * A memory cell is a STACK of thin layers: every layer boundary is drawn, and
 * alternate layers step in slightly, so the cell reads as many plates laid on
 * top of each other (one occluder for the whole stack).
 */
function stack(g: THREE.Group, poly: P2[], y0: number, h: number, layers: number) {
  const cx = poly.reduce((a, q) => a + q[0], 0) / poly.length;
  const cz = poly.reduce((a, q) => a + q[1], 0) / poly.length;
  const inset = (k: number): P2[] => poly.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
  const pos: number[] = [];
  const lh = h / layers;
  for (let i = 0; i < layers; i++) {
    const p = inset(i % 2 ? 0.965 : 1);
    const ya = y0 + i * lh;
    const yb = ya + lh * 0.82; // a thin gap between plates
    const n = p.length;
    for (let k = 0; k < n; k++) {
      const [ax, az] = p[k];
      const [bx, bz] = p[(k + 1) % n];
      pos.push(ax, yb, az, bx, yb, bz, ax, ya, az, bx, ya, bz);
      pos.push(ax, ya, az, ax, yb, az);
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.LineSegments(lg, LINE_A));
  const shape = new THREE.Shape(inset(0.96).map(([x, z]) => new THREE.Vector2(x, -z)));
  const eg = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  eg.rotateX(-Math.PI / 2);
  eg.translate(0, y0, 0);
  g.add(new THREE.Mesh(eg, occ));
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
    const layers = span > 1 ? 12 : 6 + Math.floor(r(1) * 4);
    const h = layers * 0.085;
    const kind = span > 1 ? 9 : Math.floor(r(2) * 5);
    let outline: P2[];
    if (kind === 0 || kind === 1) outline = notched(cx, cz, w, d, kind === 0);
    else if (kind === 2) outline = chamfer(cx, cz, w, d, 0.18);
    else outline = rectP(cx, cz, w, d);
    stack(g, outline, 0, h, layers);
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
    id: 'S05',
    t0: ST.S05[0],
    t1: ST.S05[1],
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
      const landAt = (i: number) => 1.0 + cells[i].col * 0.92 + (cells[i].c.z + bd / 2) * 0.05 + hash(i, 4) * 0.12;
      const failT = cue('v05') - ST.S05[0];
      const skippedAt = failT + 4.65;
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
      return {
        draw(f) {
          const { bg, fg, t } = f;
          if (t >= failT && t < failT + 4.12) {
            const tq = t - failT;
            // Alternate the passphrase rows and carry the diagnostic inline in the middle row.
            const word = tq < 2.46 ? 'FRAGMENT 411' : tq < 3.08 ? 'COHESION' : 'FAILURE';
            [262, 400, 538, 676, 814].forEach((y, i) => {
              const dir = i % 2 ? 1 : -1;
              const sc = -180 + tq * 240 * dir + i * 137;
              if (i === 2)
                scrollRow(fg, y, -80 + tq * 160, ['FAIL', 'FAIL', word, 'FAIL', 'FAIL', 'FAIL', 'FAIL'], { size: 150, weight: 800, stretch: 'condensed', color: '#2a7a20', outline: true, hi: (w) => w === word, hiColor: C.yellowHi });
              else scrollRow(fg, y, sc, ['PASSPHRASE'], { size: 150, weight: 800, stretch: 'condensed', color: '#2a7a20', outline: true });
            });
            for (const y of [80, 930]) {
              rect(fg, 590, y - 14, 46, 26, C.yellowHi);
              text(fg, 'F411', 594, y + 4, { size: 13, weight: 800, color: '#000' });
              microRows(fg, 650, y - 2, ['LNKTL  ■■  LATCH', 'PULL ●  KL2 KL4'], { size: 15, family: F.mono, weight: 700, color: C.yellowHi, lh: 17 });
            }
            return;
          }
          backdrop(bg, { seed: 61, dx: t * 26, alpha: 0.75, pal: PAL_BLUE, rect: [1430, 0, 490, 1080] });
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
              text(fg, t >= skippedAt ? 'F411 · SKIPPED' : 'F411 · FAILED', c.x + 128, c.y - 110, { size: 15, family: F.mono, weight: 700, color: '#000' });
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
        },
      };
    },
  },
  /* ---------------------------------------------------------------- */
  {
    id: 'S06',
    t0: ST.S06[0],
    t1: ST.S06[1],
    title: 'Liminal buffer 26%',
    note: 'The buffer holds at the spoken 26 percent while the scan completes. The hemispheres activate, then the red lock wheel and yellow insert confirm readiness.',
    build: async () => {
      const buffer = await createBufferDial();
      const scene = new THREE.Scene();
      const cam = persp(30);
      const lift = Math.min(ANCHORS.lift, ST.S06[1] - BUFFER_LOCK_DURATION - 0.45);
      const LIFT = lift - ST.S06[0];
      const timeOf = (rank: number, readiness: boolean) => {
        if (readiness) return 1.9 + rank * 1.7;
        if (rank < 0.78) return 0.16 + rank * 7.5;
        return LIFT + (rank - 0.78) * 2.6;
      };
      const net = ascendingBundles(timeOf);
      const cm = connectomeMaterial({ dim: 0.004, base: 0.46, flash: 0.25, pulse: 0.25 });
      const fibres = new THREE.LineSegments(net.geometry, cm.mat);
      scene.add(fibres);
      return {
        draw(f) {
          const { fg, t, T } = f;
          if (t < BUFFER_LOAD_DURATION) {
            buffer.load(f);
            return;
          }
          const lockStart = f.dur - BUFFER_LOCK_DURATION;
          if (t >= lockStart) {
            buffer.lock(f, t - lockStart);
            return;
          }
          cm.time.value = q(t, 24);
          fibres.rotation.set(0.06, -0.24 + q(t, 12) * 0.044, 0);
          const punch = easeInOutCubic(span(T, lift, lift + 0.45));
          cam.position.set(0, 0.16, 2.3 - punch * 0.25);
          cam.lookAt(0.04, 0.10, 0);
          f.three = { scene, camera: cam };
          vlabel(fg, 'NEURAL', 118, 710, 66, C.red, { rot: -Math.PI / 2 });
          vlabel(fg, 'CIRCUIT ACTIVATION', 148, 708, 22, C.red, { rot: -Math.PI / 2 });
          checker(fg, 174, 730, 2, 2, 16, C.red);
          text(fg, '26%', 1800, 525, { size: 84, weight: 800, color: C.red, align: 'right' });
          text(fg, 'LIMINAL BUFFER', 1800, 556, { size: 19, weight: 700, family: F.mono, color: C.red, align: 'right' });
          microRows(fg, 140, 940, ['PSYCHE STREAM', `FIBRES ${net.routes}`, 'ASCENDING NERVE BUNDLES'], { size: 16, family: F.mono, weight: 700, color: '#ff6a6a', lh: 20 });
        },
        dispose() {
          buffer.dispose();
          net.geometry.dispose();
          cm.mat.dispose();
        },
      };
    },
  },
];
