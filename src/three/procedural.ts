/**
 * Procedural assets: brain, satellite, contour (marching-squares) lines,
 * and shader-drawn planet surfaces.
 */
import * as THREE from 'three/webgpu';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { abs, cos, floor, fract, hash, length, mix, mx_noise_float, sin, step, uv, vec2, vec3 } from 'three/tsl';
import { rng } from '../lib/util';

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Brain                                                               */
/* ------------------------------------------------------------------ */
export function brainGeometry(detail = 56, seed = 3) {
  const noise = new SimplexNoise({ random: rng(seed) });
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    const { x, y, z } = p;
    // gyri / sulci: ridged noise folded twice
    const n1 = 1 - Math.abs(noise.noise3d(x * 3.2, y * 3.2, z * 3.2));
    const n2 = 1 - Math.abs(noise.noise3d(x * 6.5 + 7, y * 6.5, z * 6.5));
    let r = 1 + 0.07 * n1 * n1 + 0.03 * n2 * n2;
    // longitudinal fissure between hemispheres (top only)
    r -= 0.16 * Math.exp(-((x / 0.07) ** 2)) * ss(-0.3, 0.5, y);
    // temporal bulge low on the sides
    r += 0.06 * Math.exp(-(((y + 0.25) / 0.25) ** 2)) * Math.abs(x);
    let px = x * r * 0.74;
    let py = y * r * 0.64;
    const pz = z * r * 0.98;
    // flatten underside
    if (py < -0.3) py = -0.3 + (py + 0.3) * 0.45;
    // frontal lobe slightly narrower
    px *= 1 - 0.12 * ss(0.2, 1, z);
    pos.setXYZ(i, px, py, pz);
  }
  geo.computeVertexNormals();
  return geo;
}

export function cerebellumGeometry(seed = 4) {
  const noise = new SimplexNoise({ random: rng(seed) });
  const geo = new THREE.IcosahedronGeometry(1, 24);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    // fine horizontal folia
    const r = 1 + 0.05 * Math.abs(Math.sin(p.y * 22 + noise.noise3d(p.x * 2, p.y * 2, p.z * 2) * 2));
    pos.setXYZ(i, p.x * r * 0.5, p.y * r * 0.26, p.z * r * 0.3);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/* Satellite — built from boxes / panels / dish, drawn as lines        */
/* ------------------------------------------------------------------ */
export function satellite({ body = 0xececec, panel = 0x2424ff, panelLine = 0x5257ff, accent = 0xffe000 } = {}) {
  const g = new THREE.Group();
  const lm = (c: number) => new THREE.LineBasicMaterial({ color: c });
  const edges = (geo: THREE.BufferGeometry, c: number) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm(c));

  // bus
  const bus = new THREE.BoxGeometry(0.1, 0.1, 0.16);
  g.add(new THREE.Mesh(bus, new THREE.MeshBasicMaterial({ color: 0x000000 })));
  g.add(edges(bus, body));
  // panels (+x / -x) with cell grid
  for (const s of [-1, 1]) {
    const w = 0.34;
    const h = 0.11;
    const pg = new THREE.PlaneGeometry(w, h);
    const fill = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: panel, side: THREE.DoubleSide }));
    fill.rotation.x = -Math.PI / 2;
    fill.position.x = s * (0.05 + 0.03 + w / 2);
    g.add(fill);
    const cells: number[] = [];
    const x0 = s * (0.08);
    const x1 = s * (0.08 + w);
    for (let k = 0; k <= 6; k++) {
      const x = x0 + ((x1 - x0) * k) / 6;
      cells.push(x, 0.001, -h / 2, x, 0.001, h / 2);
    }
    cells.push(x0, 0.001, 0, x1, 0.001, 0, x0, 0.001, -h / 2, x1, 0.001, -h / 2, x0, 0.001, h / 2, x1, 0.001, h / 2);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cells, 3));
    g.add(new THREE.LineSegments(cg, lm(panelLine)));
    // strut
    const st = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(s * 0.05, 0, 0), new THREE.Vector3(x0, 0, 0)]);
    g.add(new THREE.Line(st, lm(body)));
  }
  // dish
  const dish = new THREE.ConeGeometry(0.06, 0.04, 10, 1, true);
  const d = new THREE.LineSegments(new THREE.WireframeGeometry(dish), lm(accent));
  d.rotation.x = Math.PI / 2;
  d.position.z = 0.11;
  g.add(d);
  const mast = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.08), new THREE.Vector3(0, 0, 0.16)]);
  g.add(new THREE.Line(mast, lm(accent)));
  return g;
}

/* ------------------------------------------------------------------ */
/* Marching squares → iso-line segments of a scalar field              */
/* ------------------------------------------------------------------ */
export function isoSegments(
  field: (x: number, y: number) => number,
  { nx, ny, levels, x0 = 0, y0 = 0, x1 = 1, y1 = 1 }: { nx: number; ny: number; levels: number[]; x0?: number; y0?: number; x1?: number; y1?: number },
) {
  const vals = new Float32Array((nx + 1) * (ny + 1));
  const dx = (x1 - x0) / nx;
  const dy = (y1 - y0) / ny;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) vals[j * (nx + 1) + i] = field(x0 + i * dx, y0 + j * dy);
  const out: { level: number; seg: Float32Array }[] = [];
  for (const L of levels) {
    const segs: number[] = [];
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const a = vals[j * (nx + 1) + i];
        const b = vals[j * (nx + 1) + i + 1];
        const c = vals[(j + 1) * (nx + 1) + i + 1];
        const d = vals[(j + 1) * (nx + 1) + i];
        const idx = (a > L ? 1 : 0) | (b > L ? 2 : 0) | (c > L ? 4 : 0) | (d > L ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        const X = x0 + i * dx;
        const Y = y0 + j * dy;
        // edge points: 0 bottom(a-b) 1 right(b-c) 2 top(d-c) 3 left(a-d)
        const e = (k: number): [number, number] => {
          if (k === 0) return [X + dx * ((L - a) / (b - a)), Y];
          if (k === 1) return [X + dx, Y + dy * ((L - b) / (c - b))];
          if (k === 2) return [X + dx * ((L - d) / (c - d)), Y + dy];
          return [X, Y + dy * ((L - a) / (d - a))];
        };
        const pairs: Record<number, number[][]> = {
          1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 2], [0, 1]], 6: [[0, 2]], 7: [[3, 2]],
          8: [[2, 3]], 9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]],
        };
        for (const [p, q] of pairs[idx]) {
          const A = e(p);
          const B = e(q);
          segs.push(A[0], A[1], B[0], B[1]);
        }
      }
    out.push({ level: L, seg: new Float32Array(segs) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Flat planet surfaces                                                  */
/* ------------------------------------------------------------------ */
const inkColor = (hex: number) => {
  const color = new THREE.Color(hex);
  return vec3(color.r, color.g, color.b);
};

/** Draw plates and broken dot rows directly in spherical UV space. */
export function pixelSurfaceMaterial({ cells = [512, 256], repeat = [1, 1], base = 0x1d1dff, dark = 0x0a0a8a, ink = 0x020230, seed = 9 } = {}) {
  const point = fract(uv().mul(vec2(repeat[0], repeat[1]))).mul(vec2(cells[0], cells[1]));
  // Larger grids shrink each mark while keeping roughly the same count per tile.
  const density = Math.min(1, (512 * 256) / (cells[0] * cells[1]));
  const plateGrid = point.div(vec2(24, 10));
  const plateCell = floor(plateGrid);
  const plateKey = plateCell.x.add(plateCell.y.mul(113)).add(seed * 997);
  const platePoint = floor(fract(plateGrid).mul(vec2(24, 10)));
  const plateX = platePoint.x.sub(floor(hash(plateKey.add(51)).mul(5)));
  const plateY = platePoint.y.sub(floor(hash(plateKey.add(167)).mul(4)));
  const plateW = floor(hash(plateKey.add(593)).mul(15)).add(3);
  const plateH = floor(hash(plateKey.add(307)).mul(4)).add(1);
  const plate = step(1 - 0.44 * density, hash(plateKey)).mul(step(0, plateX)).mul(step(plateW, plateX).oneMinus())
    .mul(step(0, plateY)).mul(step(plateH, plateY).oneMinus());

  const dotGrid = point.div(vec2(16, 6));
  const dotCell = floor(dotGrid);
  const dotKey = dotCell.x.add(dotCell.y.mul(193)).add(seed * 241);
  const dotPoint = floor(fract(dotGrid).mul(vec2(16, 6)));
  const dotX = dotPoint.x.sub(floor(hash(dotKey.add(17)).mul(4)));
  const dotY = floor(hash(dotKey.add(171)).mul(6));
  const dotRow = step(1 - 0.35 * density, hash(dotKey)).mul(step(0, dotX)).mul(step(hash(dotKey.add(769)).mul(10).add(3), dotX).oneMinus())
    .mul(step(0.5, abs(dotPoint.y.sub(dotY))).oneMinus()).mul(step(0.5, fract(dotX.mul(0.5))).oneMinus());

  const plateColor = mix(inkColor(dark), inkColor(ink), step(0.64, hash(plateKey.add(47))));
  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = mix(mix(inkColor(base), plateColor, plate), inkColor(ink), dotRow);
  return material;
}

/** Draw four discrete terrain inks with spherical noise, crater rings and specks. */
export function terrainMaterial({ seed = 21 } = {}) {
  const surfaceUv = uv();
  const resolution = vec2(512, 256);
  const cellUv = floor(surfaceUv.mul(resolution)).add(0.5).div(resolution);
  const longitude = cellUv.x.mul(Math.PI * 2);
  const latitude = cellUv.y.oneMinus().mul(Math.PI);
  const surface = vec3(cos(longitude).mul(sin(latitude)), cos(latitude), sin(longitude).mul(sin(latitude)))
    .add(vec3(seed * 0.17, seed * 0.13, seed * 0.29));
  const land = mx_noise_float(surface.mul(1.6), 0.66)
    .add(mx_noise_float(surface.mul(5), 0.28))
    .add(mx_noise_float(surface.mul(13), 0.12));
  const ink = inkColor(0x03063a);
  const shallow = mix(inkColor(0x283aff), inkColor(0x1620ff), step(-0.22, land));
  const deep = mix(shallow, inkColor(0x0a10b0), step(0.12, land));
  const terrain = mix(deep, ink, step(0.34, land));

  const craterGrid = surfaceUv.mul(vec2(42, 21));
  const craterCell = floor(craterGrid);
  const craterKey = craterCell.x.add(craterCell.y.mul(53)).add(seed * 977);
  const craterCenter = vec2(hash(craterKey.add(61)), hash(craterKey.add(239))).mul(0.22).add(0.39);
  const craterRadius = hash(craterKey.add(191)).mul(0.25).add(0.08);
  const craterEdge = abs(length(fract(craterGrid).sub(craterCenter)).sub(craterRadius));
  const crater = step(0.91, hash(craterKey)).mul(step(0.032, craterEdge).oneMinus());

  const speckCell = floor(surfaceUv.mul(vec2(512, 384)));
  const speckKey = speckCell.x.add(speckCell.y.mul(521)).add(seed * 719);
  const speck = step(0.994, hash(speckKey));
  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = mix(terrain, ink, crater.max(speck));
  return material;
}
