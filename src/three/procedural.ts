/**
 * Procedural assets: brain, satellite, contour (marching-squares) lines,
 * pixel planet surface texture.
 */
import * as THREE from 'three/webgpu';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
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
/* Pixel planet surface (canvas texture)                                */
/* ------------------------------------------------------------------ */
export function pixelSurfaceTexture({ w = 512, h = 256, base = '#1d1dff', dark = '#0a0a8a', ink = '#020230', seed = 9 } = {}) {
  const r = rng(seed);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // plates
  for (let k = 0; k < 260; k++) {
    g.fillStyle = r() < 0.6 ? dark : ink;
    const pw = 2 + Math.floor(r() * 18);
    const ph = 1 + Math.floor(r() * (r() < 0.2 ? 8 : 3));
    g.fillRect(Math.floor(r() * w), Math.floor(r() * h), pw, ph);
  }
  // dot rows
  g.fillStyle = ink;
  for (let k = 0; k < 900; k++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    const n = 1 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) g.fillRect(x + i * 2, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
