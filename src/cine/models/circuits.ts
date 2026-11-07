/**
 * Dense brain circuits: thousands of SHORT local circuits hugging the cortex
 * (no long curves) — branching dendrites, orthogonal traces ending in vias,
 * small loops, dotted chains and synaptic bursts, each kind in its own colour.
 * Every circuit has an activation time; a node material lights it with a flash,
 * then keeps it alive with pulses running out along its branches. Inactive
 * circuits stay dimly visible and spark at random.
 */
import * as THREE from 'three/webgpu';
import { attribute, exp, float, floor, fract, max, mix, sin, smoothstep, step, uniform } from 'three/tsl';
import { hash } from '../engine';
import { brainGeometry } from '../../three/procedural';

export const CIRCUIT_COLORS = {
  dendrite: [0x5cff3a, 0x9dff3a, 0x3ad04a],
  trace: [0x38e8ff, 0x2aa8ff],
  loop: [0xff40c0],
  chain: [0xf0e040],
  burst: [0xe8ecff],
  red: [0xff3a5a],
};

/**
 * @param order (p) → 0..1 rank key used for the activation order (smaller fires first)
 * @param timeOf rank 0..1 → activation time (s); return Infinity to never fire
 */
export function brainCircuits(o: { n?: number; seed?: number; order?: (p: THREE.Vector3) => number; timeOf: (rank: number) => number }) {
  const N = o.n ?? 1800;
  const seed = o.seed ?? 5;
  const src = brainGeometry(30, 8);
  const sp = src.getAttribute('position');
  const sn = src.getAttribute('normal');
  const pos: number[] = [];
  const col: number[] = [];
  const aT: number[] = [];
  const aS: number[] = [];
  const aD: number[] = [];
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const t1 = new THREE.Vector3();
  const t2 = new THREE.Vector3();
  type Circ = { segs: number[]; dist: number[]; color: number; center: THREE.Vector3; s: number };
  const circs: Circ[] = [];
  const order = o.order ?? ((q: THREE.Vector3) => q.length());
  for (let i = 0; i < N; i++) {
    const r = (k: number) => hash(seed, i, k);
    const vi = Math.floor(r(1) * sp.count);
    nrm.fromBufferAttribute(sn, vi).normalize();
    p.fromBufferAttribute(sp, vi).addScaledVector(nrm, -(0.01 + r(2) * r(2) * 0.16));
    t1.set(0, 1, 0).cross(nrm);
    if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0).cross(nrm);
    t1.normalize();
    t2.copy(nrm).cross(t1).normalize();
    const segs: number[] = [];
    const dist: number[] = [];
    const at = (u: number, v: number, w = 0) => new THREE.Vector3().copy(p).addScaledVector(t1, u).addScaledVector(t2, v).addScaledVector(nrm, w);
    const seg = (a: THREE.Vector3, b: THREE.Vector3, da: number, db: number) => {
      segs.push(a.x, a.y, a.z, b.x, b.y, b.z);
      dist.push(da, db);
    };
    const kr = r(3);
    let color: number;
    if (kr < 0.32) {
      // dendrite: 3–5 wandering branches, some forking
      const pal = r(4) < 0.12 ? CIRCUIT_COLORS.red : CIRCUIT_COLORS.dendrite;
      color = pal[Math.floor(r(5) * pal.length)];
      const nb = 3 + Math.floor(r(6) * 2);
      for (let b = 0; b < nb; b++) {
        let a = (b / nb) * Math.PI * 2 + r(10 + b) * 0.8;
        let u = 0;
        let v = 0;
        let d = 0;
        const steps = 2 + Math.floor(r(20 + b) * 3);
        const L = 0.006 + r(30 + b) * 0.007;
        for (let k = 0; k < steps; k++) {
          a += (hash(seed, i, b, k) - 0.5) * 1.1;
          const nu = u + Math.cos(a) * L;
          const nv = v + Math.sin(a) * L;
          seg(at(u, v), at(nu, nv), d, d + L);
          if (k === 1 && hash(seed, i, b, 99) < 0.3) {
            const fa = a + (hash(seed, i, b, 98) < 0.5 ? 0.9 : -0.9);
            seg(at(nu, nv), at(nu + Math.cos(fa) * L * 0.9, nv + Math.sin(fa) * L * 0.9), d + L, d + L * 1.9);
          }
          u = nu;
          v = nv;
          d += L;
        }
      }
    } else if (kr < 0.67) {
      // trace: orthogonal route with 45° chamfers, ending in a via
      color = CIRCUIT_COLORS.trace[Math.floor(r(5) * 2)];
      let u = 0;
      let v = 0;
      let d = 0;
      let horiz = r(6) < 0.5;
      const steps = 2 + Math.floor(r(7) * 3);
      for (let k = 0; k < steps; k++) {
        const L = (0.008 + hash(seed, i, k, 1) * 0.014) * (hash(seed, i, k, 2) < 0.5 ? -1 : 1);
        const ch = Math.abs(L) * 0.25;
        const nu = horiz ? u + L : u + (hash(seed, i, k, 3) < 0.5 ? ch : -ch);
        const nv = horiz ? v + (hash(seed, i, k, 3) < 0.5 ? ch : -ch) : v + L;
        seg(at(u, v), at(nu, nv), d, d + Math.abs(L));
        u = nu;
        v = nv;
        d += Math.abs(L);
        horiz = !horiz;
      }
      const s = 0.0028;
      seg(at(u - s, v - s), at(u + s, v - s), d, d);
      seg(at(u + s, v - s), at(u + s, v + s), d, d);
      seg(at(u + s, v + s), at(u - s, v + s), d, d);
      seg(at(u - s, v + s), at(u - s, v - s), d, d);
    } else if (kr < 0.79) {
      // loop: small polygon with a tail
      color = CIRCUIT_COLORS.loop[0];
      const R = 0.005 + r(6) * 0.007;
      const m = 6 + Math.floor(r(7) * 3);
      for (let k = 0; k < m; k++) {
        const a0 = (k / m) * Math.PI * 2;
        const a1 = ((k + 1) / m) * Math.PI * 2;
        seg(at(Math.cos(a0) * R, Math.sin(a0) * R), at(Math.cos(a1) * R, Math.sin(a1) * R), (k / m) * R * 6, ((k + 1) / m) * R * 6);
      }
      const ta = r(8) * Math.PI * 2;
      seg(at(Math.cos(ta) * R, Math.sin(ta) * R), at(Math.cos(ta) * R * 2.4, Math.sin(ta) * R * 2.4), 0, R * 1.4);
    } else if (kr < 0.9) {
      // chain: dotted ticks along a gentle arc
      color = CIRCUIT_COLORS.chain[0];
      let a = r(6) * Math.PI * 2;
      let u = 0;
      let v = 0;
      const m = 5 + Math.floor(r(7) * 4);
      for (let k = 0; k < m; k++) {
        a += (hash(seed, i, k, 4) - 0.5) * 0.5;
        const nu = u + Math.cos(a) * 0.004;
        const nv = v + Math.sin(a) * 0.004;
        seg(at(u, v), at(nu, nv), k * 0.007, k * 0.007 + 0.004);
        u = nu + Math.cos(a) * 0.003;
        v = nv + Math.sin(a) * 0.003;
      }
    } else {
      // burst: radial spokes (a synapse firing)
      color = CIRCUIT_COLORS.burst[0];
      const m = 6 + Math.floor(r(6) * 4);
      for (let k = 0; k < m; k++) {
        const a = (k / m) * Math.PI * 2 + r(7);
        const L = 0.006 + hash(seed, i, k, 5) * 0.009;
        seg(at(Math.cos(a) * 0.002, Math.sin(a) * 0.002), at(Math.cos(a) * L, Math.sin(a) * L, (hash(seed, i, k, 6) - 0.5) * 0.01), 0, L);
      }
    }
    circs.push({ segs, dist, color, center: p.clone(), s: r(9) });
  }
  // activation ranks
  const keys = circs.map((ci, i) => ({ i, k: order(ci.center) + hash(seed, i, 77) * 0.22 }));
  keys.sort((a, b) => a.k - b.k);
  const rank = new Float32Array(circs.length);
  keys.forEach((e, j) => (rank[e.i] = j / (circs.length - 1)));
  circs.forEach((ci, i) => {
    const T0 = o.timeOf(rank[i]);
    c.setHex(ci.color);
    for (let k = 0; k < ci.segs.length; k += 3) {
      pos.push(ci.segs[k], ci.segs[k + 1], ci.segs[k + 2]);
      col.push(c.r, c.g, c.b);
      const d = ci.dist[k / 3];
      aT.push(Number.isFinite(T0) ? T0 + d * 6 : 1e5); // propagation outward from the soma
      aS.push(ci.s);
      aD.push(d);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setAttribute('aD', new THREE.Float32BufferAttribute(aD, 1));
  src.dispose();
  return g;
}

/** Additive line material that lights circuits by their activation time. */
export function circuitMaterial(o: { dim?: number; opacity?: number } = {}) {
  const time = uniform(0);
  const gain = uniform(o.opacity ?? 1);
  const aT = attribute('aT', 'float');
  const aS = attribute('aS', 'float');
  const aD = attribute('aD', 'float');
  const base = attribute('color', 'vec3');
  const since = time.sub(aT);
  const on = step(float(0), since);
  const flash = exp(max(since, float(0)).mul(-6)).mul(2.4);
  const steady = sin(time.mul(5).add(aS.mul(40))).mul(0.12).add(0.8);
  const travel = smoothstep(float(0.8), float(1), fract(aD.mul(30).sub(time.mul(2.4)).add(aS))).mul(1.1);
  const spark = step(float(0.993), fract(sin(aS.mul(91.7).add(floor(time.mul(14)))).mul(43758.5))).mul(1.2);
  const dim = float(o.dim ?? 0.14);
  const b = mix(dim.add(spark), steady.add(flash).add(travel), on);
  const mat = new THREE.LineBasicNodeMaterial();
  mat.colorNode = base.mul(b).mul(gain);
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  return { mat, time, gain };
}

/** Additive line material with pulses flowing along an `aD` (0..1) attribute. */
export function flowMaterial(o: { base?: number; speed?: number; freq?: number } = {}) {
  const time = uniform(0);
  const gain = uniform(1);
  const aD = attribute('aD', 'float');
  const base = attribute('color', 'vec3');
  const travel = smoothstep(float(0.78), float(1), fract(aD.mul(o.freq ?? 7).sub(time.mul(o.speed ?? 1.4)))).mul(1.6);
  const mat = new THREE.LineBasicNodeMaterial();
  mat.colorNode = base.mul(travel.add(o.base ?? 0.6)).mul(gain);
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  return { mat, time, gain };
}
