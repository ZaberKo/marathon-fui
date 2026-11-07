/**
 * Hard-surface kit: floors and sets built from boxes (plates, plinths, grooves,
 * ribs, vents, hazard bands), shaded flat with a world-space key light into
 * 2–3 tones, plus optional edge lines. Review note: "the ground is not a flat
 * background — it is a floor with hard-surface design on it".
 */
import * as THREE from 'three/webgpu';
import { dot, float, length, mix, normalWorld, positionView, positionWorld, smoothstep, step, uniform, vec3 } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from '../engine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;
const v3 = (hex: number) => {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
};

export type Tones = { lit: number; mid?: number; shade: number };
export const KEY = new THREE.Vector3(-0.45, 0.8, 0.4).normalize();

/** Flat world-lit toon: faces facing the key light get `lit`, sides `mid`, away `shade`. */
export const HAZE = { color: uniform(v3(0x060a2a)), near: uniform(1e6), far: uniform(2e6) };

export function toonLit(t: Tones & { haze?: boolean }, light = KEY) {
  const L = uniform(light.clone());
  const lit = uniform(v3(t.lit));
  const mid = uniform(v3(t.mid ?? t.lit));
  const shade = uniform(v3(t.shade));
  const d: N = dot(normalWorld, L);
  let c: N = mix(vec3(shade), vec3(mid), step(float(0.05), d));
  c = mix(c, vec3(lit), step(float(0.6), d));
  if (t.haze) c = mix(c, vec3(HAZE.color), smoothstep(HAZE.near, HAZE.far, length(positionView)));
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = c;
  return { mat: m, lit, mid, shade, light: L };
}

type Item = { key: string; g: THREE.BufferGeometry };

/** Collects boxes per material key and merges them. */
export class Hard {
  items: Item[] = [];
  box(key: string, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.deleteAttribute('uv');
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    this.items.push({ key, g });
    return this;
  }
  /** any geometry, placed by position / euler rotation / scale (consumes `g`) */
  geo(key: string, g: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s)));
    this.items.push({ key, g });
    return this;
  }
  /** a row of thin bars (vents / hazard stripes) along X */
  bars(key: string, n: number, w: number, h: number, d: number, gap: number, x: number, y: number, z: number, ry = 0) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * (w + gap);
      this.box(key, w, h, d, x + o * c, y, z - o * s, ry);
    }
    return this;
  }
  build(mats: Record<string, THREE.Material>, edges?: Record<string, number>, edgeAngle = 25) {
    const group = new THREE.Group();
    const keys = [...new Set(this.items.map((i) => i.key))];
    for (const k of keys) {
      const geos = this.items.filter((i) => i.key === k).map((i) => i.g.index ? i.g.toNonIndexed() : i.g);
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeVertexNormals();
      const mesh = new THREE.Mesh(merged, mats[k]);
      mesh.name = k;
      group.add(mesh);
      if (edges?.[k] != null) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(merged, edgeAngle), new THREE.LineBasicMaterial({ color: edges[k], transparent: true, opacity: 0.9 }));
        e.name = `${k}:edges`;
        group.add(e);
      }
    }
    return group;
  }
}

/**
 * Deck plating: a field of plates separated by grooves, some raised, some
 * recessed, with hazard bands and vent ribs. Size w×d centred on origin, top at y=0.
 */
export function deck(h: Hard, o: { w: number; d: number; tile: number; seed: number; plate?: string; groove?: string; raised?: string; band?: string; bandColorKey?: string }) {
  const plate = o.plate ?? 'plate';
  const groove = o.groove ?? 'groove';
  const raised = o.raised ?? plate;
  h.box(groove, o.w, 0.2, o.d, 0, -0.14, 0);
  const nx = Math.floor(o.w / o.tile);
  const nz = Math.floor(o.d / o.tile);
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      const r = (q: number) => hash(o.seed, i, k, q);
      const x = -o.w / 2 + (i + 0.5) * o.tile;
      const z = -o.d / 2 + (k + 0.5) * o.tile;
      const g = o.tile * 0.06;
      const kind = r(1);
      if (kind < 0.06) continue; // open pit
      // merge some plates into larger slabs
      const big = r(2) > 0.86 && i % 2 === 0 && k % 2 === 0 && i < nx - 1 && k < nz - 1;
      if (big) {
        h.box(raised, o.tile * 2 - g, 0.06 + r(3) * 0.12, o.tile * 2 - g, x + o.tile / 2, 0.02, z + o.tile / 2);
        continue;
      }
      const top = kind > 0.9 ? 0.05 : kind < 0.12 ? -0.05 : 0;
      h.box(plate, o.tile - g, 0.1, o.tile - g, x, top - 0.05, z);
      if (kind > 0.93) h.bars(groove, 5, o.tile * 0.08, 0.02, o.tile * 0.6, o.tile * 0.06, x, top + 0.005, z);
    }
}

/**
 * Two tone-sets split by a moving plane (z < sweep → B): a scan that re-colours
 * the set as it passes (e.g. yellow deck → cobalt deck).
 */
export function toonSweep(a: Tones, b: Tones, light = KEY) {
  const L = uniform(light.clone());
  const sweep = uniform(-1e3);
  const d: N = dot(normalWorld, L);
  const tone = (t: Tones): N => {
    let c: N = mix(vec3(v3(t.shade)), vec3(v3(t.mid ?? t.lit)), step(float(0.05), d));
    c = mix(c, vec3(v3(t.lit)), step(float(0.6), d));
    return c;
  };
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = mix(tone(a), tone(b), step(positionWorld.z, sweep));
  return { mat: m, sweep };
}
