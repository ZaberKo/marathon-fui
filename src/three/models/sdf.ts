/**
 * Signed-distance modelling + naive Surface Nets meshing.
 *
 * All 3D models in the cinema study are built here from primitives (no
 * downloaded meshes): bodies, heads, hands, organs, ships. Primitives carry a
 * bone tag so the same evaluation also yields smooth skin weights.
 */
import * as THREE from 'three/webgpu';

export type V3 = [number, number, number];

export type Prim =
  | { t: 'cone'; a: V3; b: V3; ra: number; rb: number; k?: number; bone?: number; sub?: boolean }
  | { t: 'ell'; c: V3; r: V3; rot?: THREE.Quaternion; k?: number; bone?: number; sub?: boolean }
  | { t: 'box'; c: V3; h: V3; round?: number; rot?: THREE.Quaternion; k?: number; bone?: number; sub?: boolean }
  | { t: 'torus'; c: V3; R: number; r: number; rot?: THREE.Quaternion; k?: number; bone?: number; sub?: boolean };

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

function local(p: { c: V3; rot?: THREE.Quaternion }, x: number, y: number, z: number) {
  _v.set(x - p.c[0], y - p.c[1], z - p.c[2]);
  if (p.rot) _v.applyQuaternion(_q.copy(p.rot).invert());
  return _v;
}

export function primDist(p: Prim, x: number, y: number, z: number): number {
  switch (p.t) {
    case 'cone': {
      // round cone (capsule with two radii) — iq
      const bax = p.b[0] - p.a[0], bay = p.b[1] - p.a[1], baz = p.b[2] - p.a[2];
      const pax = x - p.a[0], pay = y - p.a[1], paz = z - p.a[2];
      const l2 = bax * bax + bay * bay + baz * baz;
      const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / l2));
      const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) - (p.ra + (p.rb - p.ra) * h);
    }
    case 'ell': {
      const l = local(p, x, y, z);
      const k0 = Math.hypot(l.x / p.r[0], l.y / p.r[1], l.z / p.r[2]);
      const k1 = Math.hypot(l.x / (p.r[0] * p.r[0]), l.y / (p.r[1] * p.r[1]), l.z / (p.r[2] * p.r[2]));
      return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(...p.r);
    }
    case 'box': {
      const l = local(p, x, y, z);
      const r = p.round ?? 0;
      const qx = Math.abs(l.x) - p.h[0] + r, qy = Math.abs(l.y) - p.h[1] + r, qz = Math.abs(l.z) - p.h[2] + r;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
    }
    case 'torus': {
      const l = local(p, x, y, z);
      const qx = Math.hypot(l.x, l.z) - p.R;
      return Math.hypot(qx, l.y) - p.r;
    }
  }
}

function primAABB(p: Prim, pad: number): [number, number, number, number, number, number] {
  switch (p.t) {
    case 'cone': {
      const r = Math.max(p.ra, p.rb) + pad;
      return [Math.min(p.a[0], p.b[0]) - r, Math.min(p.a[1], p.b[1]) - r, Math.min(p.a[2], p.b[2]) - r, Math.max(p.a[0], p.b[0]) + r, Math.max(p.a[1], p.b[1]) + r, Math.max(p.a[2], p.b[2]) + r];
    }
    case 'ell': {
      const r = Math.max(...p.r) + pad;
      return [p.c[0] - r, p.c[1] - r, p.c[2] - r, p.c[0] + r, p.c[1] + r, p.c[2] + r];
    }
    case 'box': {
      const r = Math.hypot(...p.h) + pad;
      return [p.c[0] - r, p.c[1] - r, p.c[2] - r, p.c[0] + r, p.c[1] + r, p.c[2] + r];
    }
    case 'torus': {
      const r = p.R + p.r + pad;
      return [p.c[0] - r, p.c[1] - r, p.c[2] - r, p.c[0] + r, p.c[1] + r, p.c[2] + r];
    }
  }
}

/** polynomial smooth min / max */
export const smin = (a: number, b: number, k: number) => {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

/** Evaluate a primitive list (unions, then subtractions) at a point. */
export function evalPrims(prims: Prim[], x: number, y: number, z: number) {
  let d = 1e9;
  for (const p of prims) if (!p.sub) d = smin(d, primDist(p, x, y, z), p.k ?? 0);
  for (const p of prims) if (p.sub) d = smax(d, -primDist(p, x, y, z), p.k ?? 0);
  return d;
}

export type Mesh = { positions: Float32Array; indices: Uint32Array };

/**
 * Sample the SDF on a grid (with per-bucket primitive culling) and mesh the
 * zero set with naive Surface Nets.
 */
export function meshSDF(prims: Prim[], cell: number, pad = 0.02): Mesh {
  // bounds
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const boxes = prims.map((p) => primAABB(p, (p.k ?? 0) + cell * 2));
  boxes.forEach((b, i) => {
    if (prims[i].sub) return;
    for (let a = 0; a < 3; a++) {
      bb[a] = Math.min(bb[a], b[a]);
      bb[a + 3] = Math.max(bb[a + 3], b[a + 3]);
    }
  });
  const x0 = bb[0] - pad, y0 = bb[1] - pad, z0 = bb[2] - pad;
  const nx = Math.ceil((bb[3] - bb[0] + 2 * pad) / cell) + 1;
  const ny = Math.ceil((bb[4] - bb[1] + 2 * pad) / cell) + 1;
  const nz = Math.ceil((bb[5] - bb[2] + 2 * pad) / cell) + 1;
  const field = new Float32Array(nx * ny * nz);
  const B = 8;
  const bx = Math.ceil(nx / B), by = Math.ceil(ny / B), bz = Math.ceil(nz / B);
  for (let kb = 0; kb < bz; kb++)
    for (let jb = 0; jb < by; jb++)
      for (let ib = 0; ib < bx; ib++) {
        const lo = [x0 + ib * B * cell, y0 + jb * B * cell, z0 + kb * B * cell];
        const hi = [lo[0] + B * cell, lo[1] + B * cell, lo[2] + B * cell];
        const list: Prim[] = [];
        prims.forEach((p, pi) => {
          const b = boxes[pi];
          if (b[0] <= hi[0] && b[3] >= lo[0] && b[1] <= hi[1] && b[4] >= lo[1] && b[2] <= hi[2] && b[5] >= lo[2]) list.push(p);
        });
        const hasUnion = list.some((p) => !p.sub);
        for (let k = kb * B; k < Math.min(nz, (kb + 1) * B); k++)
          for (let j = jb * B; j < Math.min(ny, (jb + 1) * B); j++)
            for (let i = ib * B; i < Math.min(nx, (ib + 1) * B); i++) {
              const idx = i + nx * (j + ny * k);
              field[idx] = hasUnion ? evalPrims(list, x0 + i * cell, y0 + j * cell, z0 + k * cell) : 1;
            }
      }

  // surface nets
  const cellIndex = new Int32Array(nx * ny * nz).fill(-1);
  const pos: number[] = [];
  const corner = new Float32Array(8);
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const off = (c: number) => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const [ox, oy, oz] = off(c);
          const v = field[i + ox + nx * (j + oy + ny * (k + oz))];
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of EDGES) {
          const va = corner[a], vb = corner[b];
          if (va < 0 === vb < 0) continue;
          const tt = va / (va - vb);
          const A = off(a), Bc = off(b);
          sx += A[0] + (Bc[0] - A[0]) * tt;
          sy += A[1] + (Bc[1] - A[1]) * tt;
          sz += A[2] + (Bc[2] - A[2]) * tt;
          n++;
        }
        cellIndex[i + nx * (j + ny * k)] = pos.length / 3;
        pos.push(x0 + (i + sx / n) * cell, y0 + (j + sy / n) * cell, z0 + (k + sz / n) * cell);
      }
  const idx: number[] = [];
  const ci = (i: number, j: number, k: number) => cellIndex[i + nx * (j + ny * k)];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, d, c, a, c, b);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = field[i + nx * (j + ny * k)] < 0;
        // edge along +x
        if (i < nx - 1 && v0 !== field[i + 1 + nx * (j + ny * k)] < 0)
          quad(ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k), !v0);
        // edge along +y
        if (j < ny - 1 && v0 !== field[i + nx * (j + 1 + ny * k)] < 0)
          quad(ci(i - 1, j, k - 1), ci(i - 1, j, k), ci(i, j, k), ci(i, j, k - 1), !v0);
        // edge along +z
        if (k < nz - 1 && v0 !== field[i + nx * (j + ny * (k + 1))] < 0)
          quad(ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k), !v0);
      }
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
}

export function toGeometry(m: Mesh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
  g.setIndex(new THREE.BufferAttribute(m.indices, 1));
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/**
 * Skin weights from primitive proximity: each primitive belongs to a bone;
 * weight ∝ exp(-(d_i - d_min)/σ). Top-4 bones, normalised.
 */
export function skinFromPrims(g: THREE.BufferGeometry, prims: Prim[], sigma = 0.018) {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const n = p.count;
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  const boneW = new Map<number, number>();
  const tagged = prims.filter((q) => q.bone != null && !q.sub);
  for (let v = 0; v < n; v++) {
    const x = p.getX(v), y = p.getY(v), z = p.getZ(v);
    let dmin = Infinity;
    const ds = tagged.map((q) => {
      const d = primDist(q, x, y, z);
      if (d < dmin) dmin = d;
      return d;
    });
    boneW.clear();
    ds.forEach((d, i) => {
      const w = Math.exp(-(d - dmin) / sigma);
      if (w < 1e-3) return;
      const b = tagged[i].bone!;
      boneW.set(b, (boneW.get(b) ?? 0) + w);
    });
    const top = [...boneW.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = top.reduce((s, e) => s + e[1], 0) || 1;
    top.forEach(([b, w], k) => {
      si[v * 4 + k] = b;
      sw[v * 4 + k] = w / tot;
    });
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}
