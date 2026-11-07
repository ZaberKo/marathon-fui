/**
 * Uniform voxel bodies.
 *
 * Review note: cubes on a body must be *evenly* distributed, derived from the
 * mesh — not random samples. The bind-pose surface is bucketed into a regular
 * grid; each occupied cell keeps the vertex closest to its centre, so voxels
 * are one per cell and follow the skeleton through that vertex.
 *
 * Rendered as wireframe cubes (12 edges each, per-vertex colour) in a single
 * dynamic LineSegments, so thousands stay cheap.
 */
import * as THREE from 'three/webgpu';
import type { Body } from './body';
import { hash } from '../engine';

export type VoxelSet = { cell: number; verts: Int32Array; count: number };

export function voxelize(body: Body, cell: number): VoxelSet {
  const pos = body.mesh.geometry.getAttribute('position');
  const best = new Map<string, { d: number; i: number }>();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const cz = Math.floor(z / cell);
    const key = `${cx},${cy},${cz}`;
    const d = (x - (cx + 0.5) * cell) ** 2 + (y - (cy + 0.5) * cell) ** 2 + (z - (cz + 0.5) * cell) ** 2;
    const b = best.get(key);
    if (!b || d < b.d) best.set(key, { d, i });
  }
  const verts = Int32Array.from([...best.values()].map((b) => b.i));
  return { cell, verts, count: verts.length };
}

const CORNERS = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

/** A pool of wireframe cubes with per-cube position, rotation, size and colour. */
export class WireCubes {
  readonly lines: THREE.LineSegments;
  private pos: Float32Array;
  private col: Float32Array;
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  constructor(readonly max: number, opacity = 1) {
    this.pos = new Float32Array(max * 24 * 3);
    this.col = new Float32Array(max * 24 * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: opacity < 1, opacity }));
    this.lines.frustumCulled = false;
  }
  set(i: number, p: THREE.Vector3, half: number, color: THREE.Color, rot?: THREE.Quaternion) {
    const o = i * 72;
    for (let e = 0; e < 12; e++)
      for (let k = 0; k < 2; k++) {
        const c = CORNERS[EDGES[e][k]];
        this.v.set(c[0] * half, c[1] * half, c[2] * half);
        if (rot) this.v.applyQuaternion(rot);
        const j = o + (e * 2 + k) * 3;
        this.pos[j] = p.x + this.v.x;
        this.pos[j + 1] = p.y + this.v.y;
        this.pos[j + 2] = p.z + this.v.z;
        this.col[j] = color.r;
        this.col[j + 1] = color.g;
        this.col[j + 2] = color.b;
      }
  }
  hide(i: number) {
    this.pos.fill(0, i * 72, i * 72 + 72);
  }
  commit(n = this.max) {
    const g = this.lines.geometry;
    g.setDrawRange(0, n * 24);
    (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
  rotation(axis: THREE.Vector3, angle: number) {
    return this.q.setFromAxisAngle(axis, angle);
  }
}

/** World positions of the voxel anchors for the body's current pose. */
export function voxelPositions(body: Body, vs: VoxelSet, out: THREE.Vector3[]) {
  body.root.updateMatrixWorld(true);
  const m = body.mesh.matrixWorld;
  for (let k = 0; k < vs.count; k++) {
    const v = out[k] ?? (out[k] = new THREE.Vector3());
    body.mesh.getVertexPosition(vs.verts[k], v);
    v.applyMatrix4(m);
  }
  return out;
}

/**
 * Burst + gravity + one bounce + slide, analytic in time since the burst.
 * Returns position and spin for cube k (deterministic).
 */
export function burst(p0: THREE.Vector3, k: number, t: number, o: { from: THREE.Vector3; ground: number; half: number; power?: number; seed?: number }, out: THREE.Vector3) {
  const G = 9.8;
  const r = (q: number) => hash(o.seed ?? 5, k, q);
  const dir = new THREE.Vector3().subVectors(p0, o.from);
  const d = dir.length();
  dir.normalize();
  const pw = (o.power ?? 1) * (0.5 + 1.6 * Math.exp(-d * 2.2)) * (0.7 + r(1) * 0.6);
  const vx = dir.x * pw + (r(2) - 0.5) * 0.5;
  const vz = dir.z * pw + (r(3) - 0.5) * 0.5;
  const vy = Math.max(0, dir.y) * pw * 0.6 + 0.4 + r(4) * 1.1;
  const rest = o.ground + o.half;
  const h0 = Math.max(0, p0.y - rest);
  const t1 = (vy + Math.sqrt(vy * vy + 2 * G * h0)) / G;
  let x = p0.x;
  let y = p0.y;
  let z = p0.z;
  let spin = 0;
  if (t <= t1) {
    x += vx * t;
    z += vz * t;
    y += vy * t - 0.5 * G * t * t;
    spin = (6 + r(5) * 10) * t;
  } else {
    x += vx * t1;
    z += vz * t1;
    const vb = -(vy - G * t1) * 0.25;
    const t2 = (2 * vb) / G;
    const tb = t - t1;
    const sp = Math.hypot(vx, vz) * 0.45;
    if (tb <= t2) {
      x += vx * 0.45 * tb;
      z += vz * 0.45 * tb;
      y = rest + vb * tb - 0.5 * G * tb * tb;
    } else {
      const mu = 3.5;
      const ts = Math.min(tb - t2, sp / mu);
      const dist = sp * t2 + sp * ts - 0.5 * mu * ts * ts;
      if (sp > 1e-4) {
        x += (vx / Math.hypot(vx, vz)) * dist;
        z += (vz / Math.hypot(vx, vz)) * dist;
      }
      y = rest;
    }
    spin = (6 + r(5) * 10) * t1 + (tb < t2 ? tb * 4 : t2 * 4);
  }
  out.set(x, y, z);
  return { spin, axisSeed: r(6), settled: t > t1 + 0.3 };
}
