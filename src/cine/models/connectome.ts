/**
 * Brain tractography: fibres traced as smooth bundles THROUGH the inside of
 * the brain, the way diffusion imaging draws them — the corpus callosum
 * arching across the midline, the projection fans rising from the brain stem
 * to the cortex, long association arcs front↔back (arcuate / superior and
 * inferior longitudinal), and short U-fibres just under the cortex. Colour
 * follows orientation (left–right magenta, front–back lime, up–down cyan).
 * Every fibre has an activation time and an arc-length coordinate so the
 * material can light the network as it comes online and keep signals flowing.
 * Units: the brainGeometry frame (x ±0.74, y −0.3…0.64, z ±0.95).
 */
import * as THREE from 'three/webgpu';
import { attribute, exp, float, fract, max, mix, sin, smoothstep, step, uniform } from 'three/tsl';
import { hash } from '../engine';

const MAG = new THREE.Color(0xff3ac8);
const LIM = new THREE.Color(0x9dff3a);
const CYA = new THREE.Color(0x38c0ff);

/** a point on the inner cortical shell at angles (lon around y, lat) and depth k (1 = surface) */
const shell = (lon: number, lat: number, k: number) => {
  const p = new THREE.Vector3(Math.cos(lat) * Math.sin(lon) * 0.66, Math.sin(lat) * 0.56, Math.cos(lat) * Math.cos(lon) * 0.88).multiplyScalar(k);
  if (p.y < -0.26) p.y = -0.26 + (p.y + 0.26) * 0.3;
  return p;
};

export function connectome(o: { seed?: number; scale?: number; timeOf: (rank: number) => number; origin?: THREE.Vector3 }) {
  const seed = o.seed ?? 7;
  const dens = o.scale ?? 1;
  const r = (...k: number[]) => hash(seed, ...k);
  type Fibre = { P: THREE.Vector3[]; sys: number };
  const fibres: Fibre[] = [];
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // corpus callosum: U-arcs across the midline, fanning up into both hemispheres
  for (let i = 0; i < 230 * dens; i++) {
    const z = -0.62 + r(i, 1) * 1.2;
    const yc = 0.1 + 0.06 * Math.cos((z / 0.62) * 1.4) + (r(i, 2) - 0.5) * 0.03;
    const lA = -0.55 - r(i, 3) * 0.6;
    const lB = 0.55 + r(i, 4) * 0.6;
    const A = shell(lA * (r(i, 5) < 0.5 ? 1 : 0.6), 0.35 + r(i, 6) * 0.8, 0.9);
    const B = shell(lB * (r(i, 7) < 0.5 ? 1 : 0.6), 0.35 + r(i, 8) * 0.8, 0.9);
    A.z = z + (r(i, 9) - 0.5) * 0.25;
    B.z = z + (r(i, 10) - 0.5) * 0.25;
    fibres.push({ P: [A, V(-0.2, yc + 0.02, z), V(0.2, yc + 0.02, z), B], sys: 1 });
  }
  // projection fans: brain stem → internal capsule → cortex
  for (let i = 0; i < 260 * dens; i++) {
    const sx = r(i, 21) < 0.5 ? -1 : 1;
    const end = shell(sx * (0.2 + r(i, 22) * 1.2), 0.15 + r(i, 23) * 1.2, 0.9);
    end.z = -0.7 + r(i, 24) * 1.3;
    const base = V(sx * 0.03, -0.3, -0.18 + (r(i, 25) - 0.5) * 0.06);
    const cap = V(sx * (0.12 + r(i, 26) * 0.05), -0.02, -0.05 + end.z * 0.18);
    fibres.push({ P: [base, cap, V(cap.x + (end.x - cap.x) * 0.35, 0.22, cap.z + (end.z - cap.z) * 0.5), end], sys: 0 });
  }
  // association arcs (front ↔ back), upper (arcuate / SLF) and lower (ILF / IFOF)
  for (let i = 0; i < 200 * dens; i++) {
    const sx = r(i, 31) < 0.5 ? -1 : 1;
    const up = r(i, 32) < 0.62;
    const x = sx * (0.3 + r(i, 33) * 0.2);
    if (up) {
      const front = V(x, 0.12 + r(i, 34) * 0.2, 0.62 + r(i, 35) * 0.15);
      const back = V(x * 1.05, -0.12 + r(i, 36) * 0.18, -0.55 - r(i, 37) * 0.2);
      fibres.push({ P: [front, V(x, 0.42, 0.25), V(x * 1.05, 0.4, -0.38), back], sys: 2 });
    } else {
      const front = V(x * 0.9, -0.12 + r(i, 34) * 0.1, 0.5 + r(i, 35) * 0.2);
      const back = V(x, -0.02 + r(i, 36) * 0.12, -0.72 - r(i, 37) * 0.12);
      fibres.push({ P: [front, V(x * 1.1, -0.2, 0.12), V(x * 1.05, -0.12, -0.35), back], sys: 2 });
    }
  }
  // U-fibres: short arcs just under the cortex
  for (let i = 0; i < 360 * dens; i++) {
    const lon = (r(i, 41) - 0.5) * Math.PI * 2;
    const lat = -0.2 + r(i, 42) * 1.45;
    const da = 0.12 + r(i, 43) * 0.2;
    const dir = r(i, 44) * Math.PI * 2;
    const A = shell(lon, lat, 0.93);
    const B = shell(lon + Math.cos(dir) * da, lat + Math.sin(dir) * da, 0.93);
    if (Math.sign(A.x) !== Math.sign(B.x)) continue;
    const m1 = shell(lon + Math.cos(dir) * da * 0.3, lat + Math.sin(dir) * da * 0.3, 0.8);
    const m2 = shell(lon + Math.cos(dir) * da * 0.7, lat + Math.sin(dir) * da * 0.7, 0.8);
    fibres.push({ P: [A, m1, m2, B], sys: 3 });
  }
  // activation order: from the brain stem outward, by system
  const origin = o.origin ?? V(0, -0.3, -0.15);
  const sysDelay = [0, 0.18, 0.3, 0.45];
  const keyed = fibres.map((f, i) => ({ i, k: f.P[0].distanceTo(origin) * 0.4 + sysDelay[f.sys] + r(i, 51) * 0.3 }));
  keyed.sort((a, b) => a.k - b.k);
  const rank = new Float32Array(fibres.length);
  keyed.forEach((e, j) => (rank[e.i] = j / (fibres.length - 1)));

  const pos: number[] = [];
  const col: number[] = [];
  const aT: number[] = [];
  const aS: number[] = [];
  const aD: number[] = [];
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  fibres.forEach((f, i) => {
    const [A, B, C2, D] = f.P;
    const bez = (t: number, out: THREE.Vector3) => {
      const it = 1 - t;
      return out.set(0, 0, 0).addScaledVector(A, it * it * it).addScaledVector(B, 3 * it * it * t).addScaledVector(C2, 3 * it * t * t).addScaledVector(D, t * t * t);
    };
    const T0 = o.timeOf(rank[i]);
    const len = A.distanceTo(B) + B.distanceTo(C2) + C2.distanceTo(D);
    const n = Math.max(10, Math.round(len * 30));
    const ph = r(i, 61);
    bez(0, p);
    for (let k = 1; k <= n; k++) {
      bez(k / n, q);
      // orientation colour of this piece
      const dx = Math.abs(q.x - p.x);
      const dy = Math.abs(q.y - p.y);
      const dz = Math.abs(q.z - p.z);
      const s = dx + dy + dz + 1e-6;
      c.setRGB(0, 0, 0).add(MAG.clone().multiplyScalar(dx / s)).add(CYA.clone().multiplyScalar(dy / s)).add(LIM.clone().multiplyScalar(dz / s));
      pos.push(p.x, p.y, p.z, q.x, q.y, q.z);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      const da = ((k - 1) / n) * len;
      const db = (k / n) * len;
      aT.push(Number.isFinite(T0) ? T0 + da * 0.8 : 1e5, Number.isFinite(T0) ? T0 + db * 0.8 : 1e5);
      aS.push(ph, ph);
      aD.push(da, db);
      p.copy(q);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setAttribute('aD', new THREE.Float32BufferAttribute(aD, 1));
  return { fibres: g, count: { fibres: fibres.length } };
}

/** Additive material: dim until a fibre's activation, a flash, then signals flowing along it. */
export function connectomeMaterial(o: { dim?: number; speed?: number; base?: number } = {}) {
  const time = uniform(0);
  const gain = uniform(1);
  const aT = attribute('aT', 'float');
  const aS = attribute('aS', 'float');
  const aD = attribute('aD', 'float');
  const base = attribute('color', 'vec3');
  const since = time.sub(aT);
  const on = step(float(0), since);
  const flash = exp(max(since, float(0)).mul(-5)).mul(2.0);
  const travel = smoothstep(float(0.72), float(1), fract(aD.mul(5).sub(time.mul(o.speed ?? 1.3)).add(aS))).mul(1.4);
  const breathe = sin(time.mul(3).add(aS.mul(30))).mul(0.08).add(o.base ?? 0.32);
  const b = mix(float(o.dim ?? 0.07), breathe.add(flash).add(travel), on);
  const mat = new THREE.LineBasicNodeMaterial();
  mat.colorNode = base.mul(b).mul(gain);
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  return { mat, time, gain };
}
