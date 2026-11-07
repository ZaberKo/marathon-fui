/**
 * Refined head (SDF) + its internals for the transfer shot:
 *  - sculpted head: cranium, brow ridge, sockets, lids, cheekbones + arches,
 *    nose (bridge, tip, alae, nostrils), lips, chin, mandible, ears, neck, SCM
 *  - eyes: wire eyeballs with iris rings, pupil and lens
 *  - optic nerves (eye → chiasm → tracts → occipital) in their own colour
 *  - internal wiring: orthogonal 3D routes between brain nodes, eyes, ears and
 *    the spine, plus bus bundles and junction nodes
 * Units: metres; eyes face +Z; eye line at y = 0.035.
 */
import * as THREE from 'three/webgpu';
import { meshSDF, toGeometry, type Prim } from './sdf';
import { hash } from '../engine';

export const H2 = { eyeX: 0.032, eyeY: 0.035, eyeZ: 0.077, eyeR: 0.0118, top: 0.163, brain: new THREE.Vector3(0, 0.072, -0.012) };

let geo: THREE.BufferGeometry | null = null;
export function head2Geometry(cell = 0.0019) {
  if (geo) return geo;
  const e = (c: [number, number, number], r: [number, number, number], k = 0.02, sub = false): Prim => ({ t: 'ell', c, r, k, sub });
  const cap = (a: [number, number, number], b: [number, number, number], ra: number, rb: number, k = 0.015, sub = false): Prim => ({ t: 'cone', a, b, ra, rb, k, sub });
  const P: Prim[] = [
    e([0, 0.07, -0.014], [0.074, 0.093, 0.097], 0.03), // cranium
    e([0, 0.088, -0.02], [0.07, 0.07, 0.088], 0.03), // parietal dome
    e([0, 0.05, 0.036], [0.064, 0.072, 0.056], 0.03), // forehead
    cap([-0.044, 0.053, 0.08], [0.044, 0.053, 0.08], 0.011, 0.011, 0.018), // brow ridge
    e([0, -0.008, 0.064], [0.038, 0.042, 0.036], 0.03), // maxilla
    e([-0.05, 0.013, 0.058], [0.022, 0.013, 0.022], 0.02), // cheekbones
    e([0.05, 0.013, 0.058], [0.022, 0.013, 0.022], 0.02),
    cap([-0.052, 0.012, 0.055], [-0.07, 0.008, 0.008], 0.008, 0.007, 0.012), // zygomatic arches
    cap([0.052, 0.012, 0.055], [0.07, 0.008, 0.008], 0.008, 0.007, 0.012),
    e([-0.046, -0.026, 0.034], [0.03, 0.04, 0.04], 0.03), // cheeks / masseter
    e([0.046, -0.026, 0.034], [0.03, 0.04, 0.04], 0.03),
    cap([0, 0.042, 0.087], [0, 0.002, 0.104], 0.0065, 0.0095, 0.01), // nose bridge
    e([0, -0.006, 0.106], [0.0115, 0.0105, 0.0105], 0.008), // tip
    e([-0.0125, -0.009, 0.097], [0.0082, 0.0072, 0.0075], 0.006), // alae
    e([0.0125, -0.009, 0.097], [0.0082, 0.0072, 0.0075], 0.006),
    e([0, -0.032, 0.093], [0.022, 0.0062, 0.009], 0.006), // upper lip
    e([0, -0.044, 0.091], [0.019, 0.0066, 0.009], 0.006), // lower lip
    e([0, -0.071, 0.082], [0.021, 0.017, 0.018], 0.02), // chin
    cap([-0.018, -0.072, 0.07], [-0.058, -0.046, -0.004], 0.014, 0.016, 0.02), // mandible
    cap([0.018, -0.072, 0.07], [0.058, -0.046, -0.004], 0.014, 0.016, 0.02),
    e([-0.032, 0.0445, 0.0855], [0.018, 0.0042, 0.0085], 0.004), // upper lids
    e([0.032, 0.0445, 0.0855], [0.018, 0.0042, 0.0085], 0.004),
    e([-0.032, 0.0255, 0.0845], [0.016, 0.0036, 0.0075], 0.004), // lower lids
    e([0.032, 0.0255, 0.0845], [0.016, 0.0036, 0.0075], 0.004),
    e([-0.077, 0.02, -0.012], [0.009, 0.03, 0.018], 0.008), // ears
    e([0.077, 0.02, -0.012], [0.009, 0.03, 0.018], 0.008),
    e([-0.08, 0.016, -0.008], [0.004, 0.016, 0.009], 0.004, true), // conchae
    e([0.08, 0.016, -0.008], [0.004, 0.016, 0.009], 0.004, true),
    cap([0, -0.06, -0.024], [0, -0.21, -0.03], 0.05, 0.058, 0.03), // neck
    cap([-0.058, -0.03, -0.02], [-0.016, -0.2, 0.034], 0.011, 0.012, 0.012), // SCM
    cap([0.058, -0.03, -0.02], [0.016, -0.2, 0.034], 0.011, 0.012, 0.012),
    // carve: sockets, nostrils, mouth line
    e([-0.032, 0.036, 0.087], [0.019, 0.0125, 0.013], 0.008, true),
    e([0.032, 0.036, 0.087], [0.019, 0.0125, 0.013], 0.008, true),
    e([-0.0068, -0.0135, 0.1025], [0.0038, 0.0022, 0.0042], 0.002, true),
    e([0.0068, -0.0135, 0.1025], [0.0038, 0.0022, 0.0042], 0.002, true),
    { t: 'box', c: [0, -0.0385, 0.0985], h: [0.017, 0.0011, 0.01], k: 0.003, sub: true },
  ];
  geo = toGeometry(meshSDF(P, cell, 0.008));
  return geo;
}

/** wire eyeball: latitude rings + iris rings + pupil + lens, facing +Z */
export function wireEye(color: number, iris: number) {
  const g = new THREE.Group();
  const R = H2.eyeR;
  const mk = (pts: THREE.Vector3[], c: number) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    const r = Math.sin(a) * R;
    const z = Math.cos(a) * R;
    g.add(mk(Array.from({ length: 49 }, (_, k) => new THREE.Vector3(Math.cos((k / 48) * Math.PI * 2) * r, Math.sin((k / 48) * Math.PI * 2) * r, z)), color));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    g.add(mk(Array.from({ length: 49 }, (_, k) => {
      const t = (k / 48) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(t) * Math.cos(a) * R, Math.sin(t) * R, Math.cos(t) * Math.sin(a) * R);
    }), color));
  }
  for (let i = 0; i < 5; i++) {
    const r = R * (0.18 + i * 0.12);
    g.add(mk(Array.from({ length: 41 }, (_, k) => new THREE.Vector3(Math.cos((k / 40) * Math.PI * 2) * r, Math.sin((k / 40) * Math.PI * 2) * r, Math.sqrt(R * R - r * r) + 0.0004)), i === 0 ? 0xffffff : iris));
  }
  // iris spokes
  const sp: number[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const r0 = R * 0.2;
    const r1 = R * 0.66;
    sp.push(Math.cos(a) * r0, Math.sin(a) * r0, Math.sqrt(R * R - r0 * r0) + 0.0004, Math.cos(a) * r1, Math.sin(a) * r1, Math.sqrt(R * R - r1 * r1) + 0.0004);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  g.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: iris, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
  return g;
}

/** a polyline as a tube-ish double line (two offset strands) */
function strand(pts: THREE.Vector3[], off: number) {
  const out: THREE.Vector3[][] = [[], []];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const d = b.clone().sub(a).normalize();
    const n = new THREE.Vector3(0, 1, 0).cross(d).normalize();
    if (n.lengthSq() < 1e-6) n.set(1, 0, 0);
    out[0].push(pts[i].clone().addScaledVector(n, off));
    out[1].push(pts[i].clone().addScaledVector(n, -off));
  }
  return out;
}

const bez = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n = 24) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const it = 1 - t;
    return new THREE.Vector3().addScaledVector(a, it * it * it).addScaledVector(b, 3 * it * it * t).addScaledVector(c, 3 * it * t * t).addScaledVector(d, t * t * t);
  });

/** Optic nerves (one colour) and the internal wiring (another) as line sets. */
export function headWiring(seed = 7) {
  const optic: number[] = [];
  const pushLine = (arr: number[], pts: THREE.Vector3[]) => {
    for (let i = 1; i < pts.length; i++) arr.push(pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, pts[i].x, pts[i].y, pts[i].z);
  };
  const chiasm = new THREE.Vector3(0, 0.03, 0.026);
  for (const s of [-1, 1]) {
    const back = new THREE.Vector3(s * H2.eyeX, H2.eyeY, H2.eyeZ - H2.eyeR);
    const nerve = bez(back, back.clone().add(new THREE.Vector3(-s * 0.004, -0.004, -0.02)), chiasm.clone().add(new THREE.Vector3(s * 0.012, 0, 0.012)), chiasm);
    const tract = bez(chiasm, chiasm.clone().add(new THREE.Vector3(s * 0.02, 0.004, -0.02)), new THREE.Vector3(s * 0.035, 0.035, -0.05), new THREE.Vector3(s * 0.03, 0.05, -0.085));
    for (const st of strand(nerve, 0.0016)) pushLine(optic, st);
    for (const st of strand(tract, 0.0012)) pushLine(optic, st);
    // radiations fanning to the occipital cortex
    for (let k = 0; k < 7; k++) {
      const end = new THREE.Vector3(s * (0.012 + k * 0.007), 0.04 + hash(seed, s, k) * 0.04, -0.09 + hash(seed, s, k, 2) * 0.01);
      pushLine(optic, bez(new THREE.Vector3(s * 0.03, 0.045, -0.06), new THREE.Vector3(s * 0.035, 0.05, -0.07), end.clone().add(new THREE.Vector3(0, 0, 0.01)), end, 10));
    }
  }
  // internal wiring: orthogonal routes between nodes
  const wires: number[] = [];
  const nodes: THREE.Vector3[] = [];
  const brainNode = () => {
    const r = (k: number) => hash(seed, nodes.length, k);
    return new THREE.Vector3((r(1) - 0.5) * 0.09, 0.05 + r(2) * 0.07, -0.07 + r(3) * 0.1);
  };
  for (let i = 0; i < 46; i++) nodes.push(brainNode());
  const anchors = [
    new THREE.Vector3(-H2.eyeX, H2.eyeY + 0.014, H2.eyeZ - 0.014), new THREE.Vector3(H2.eyeX, H2.eyeY + 0.014, H2.eyeZ - 0.014),
    new THREE.Vector3(-0.07, 0.02, -0.012), new THREE.Vector3(0.07, 0.02, -0.012), // ears
    new THREE.Vector3(0, -0.04, -0.03), new THREE.Vector3(0, -0.18, -0.03), // brainstem / spine
    new THREE.Vector3(0, 0.0, 0.07), // nasal
  ];
  const route = (a: THREE.Vector3, b: THREE.Vector3, k: number) => {
    const order = [0, 1, 2].sort((x, y) => hash(seed, k, x) - hash(seed, k, y));
    const pts = [a.clone()];
    const cur = a.clone();
    for (const ax of order) {
      const n = cur.clone();
      if (ax === 0) n.x = b.x;
      else if (ax === 1) n.y = b.y;
      else n.z = b.z;
      pts.push(n);
      cur.copy(n);
    }
    return pts;
  };
  let k = 0;
  for (let i = 0; i < nodes.length; i++) {
    const j = (i * 7 + 3) % nodes.length;
    pushLine(wires, route(nodes[i], nodes[j], k++));
    if (i % 5 === 0) pushLine(wires, route(nodes[i], anchors[i % anchors.length], k++));
  }
  // bus bundles (parallel lines) from the brainstem up the back of the brain
  for (let b = 0; b < 6; b++) {
    const o = (b - 2.5) * 0.003;
    pushLine(wires, [new THREE.Vector3(o, -0.17, -0.03), new THREE.Vector3(o, -0.03, -0.03), new THREE.Vector3(o, 0.02, -0.06 + b * 0.002), new THREE.Vector3(o, 0.09, -0.07)]);
  }
  // junction nodes (small squares)
  const nodeGeo: number[] = [];
  for (const n of nodes) {
    const s = 0.0016;
    pushLine(nodeGeo, [n.clone().add(new THREE.Vector3(-s, -s, 0)), n.clone().add(new THREE.Vector3(s, -s, 0)), n.clone().add(new THREE.Vector3(s, s, 0)), n.clone().add(new THREE.Vector3(-s, s, 0)), n.clone().add(new THREE.Vector3(-s, -s, 0))]);
  }
  const mk = (arr: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return g;
  };
  return { optic: mk(optic), wires: mk(wires), nodes: mk(nodeGeo), nodeList: nodes };
}

/**
 * The visual pathway as many fibres (not a pair of strands): ~70 fibres per
 * eye leave the retina over the back of the globe, gather into the optic
 * nerve (a twisted bundle), half of them cross at the chiasm, run as the
 * optic tracts and fan out as the radiations over the occipital cortex.
 * Plus ciliary nerves wrapping each globe and the six extra-ocular muscles as
 * thin bands. Attributes: color, aD (0 at the retina → 1 at the cortex).
 */
export function opticPathway(seed = 13, perEye = 70) {
  const pos: number[] = [];
  const col: number[] = [];
  const ad: number[] = [];
  const c = new THREE.Color();
  const palette = [0xff8a1a, 0xffa02a, 0xff6a14, 0xffc040, 0xff4a20];
  const push = (pts: THREE.Vector3[], hex: number, d0 = 0, d1 = 1) => {
    c.setHex(hex);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      ad.push(d0 + ((i - 1) / (pts.length - 1)) * (d1 - d0), d0 + (i / (pts.length - 1)) * (d1 - d0));
    }
  };
  const chiasm = new THREE.Vector3(0, 0.03, 0.026);
  const R = H2.eyeR;
  for (const s of [-1, 1]) {
    const E = new THREE.Vector3(s * H2.eyeX, H2.eyeY, H2.eyeZ);
    const exit = E.clone().add(new THREE.Vector3(-s * 0.0022, -0.0005, -R * 1.02));
    // optic nerve centreline: exit → chiasm (bezier), sampled
    const nerve = bez(exit, exit.clone().add(new THREE.Vector3(-s * 0.003, -0.003, -0.018)), chiasm.clone().add(new THREE.Vector3(s * 0.012, 0.0, 0.013)), chiasm.clone().add(new THREE.Vector3(s * 0.0025, 0, 0)), 16);
    for (let f = 0; f < perEye; f++) {
      const r = (k: number) => hash(seed, s, f, k);
      const hex = palette[Math.floor(r(1) * palette.length)];
      // retina start on the back hemisphere
      const th = r(2) * Math.PI * 2;
      const ph = 0.35 + r(3) * 1.0; // angle from the posterior pole
      const dir = new THREE.Vector3(Math.cos(th) * Math.sin(ph), Math.sin(th) * Math.sin(ph), -Math.cos(ph));
      const retina: THREE.Vector3[] = [];
      const pole = new THREE.Vector3(-s * 0.18, -0.04, -1).normalize();
      for (let k = 0; k <= 6; k++) {
        const d = dir.clone().lerp(pole, k / 6).normalize();
        retina.push(E.clone().addScaledVector(d, R * (1.03 + (k / 6) * 0.02)));
      }
      // packed position inside the nerve (rotating slowly = a twisted cable)
      const rr = Math.sqrt(r(4)) * 0.0021;
      const a0 = r(5) * Math.PI * 2;
      const bundle = nerve.map((p, k) => {
        const a = a0 + k * 0.06 * s;
        const tight = 1 - 0.35 * Math.sin((k / (nerve.length - 1)) * Math.PI);
        return p.clone().add(new THREE.Vector3(Math.cos(a) * rr * tight, Math.sin(a) * rr * tight, 0));
      });
      // after the chiasm: nasal fibres cross
      const cross = r(6) < 0.53;
      const ts = cross ? -s : s;
      const lgn = new THREE.Vector3(ts * 0.03, 0.036, -0.03).add(new THREE.Vector3((r(7) - 0.5) * 0.004, (r(8) - 0.5) * 0.004, (r(9) - 0.5) * 0.004));
      const tract = bez(bundle[bundle.length - 1], chiasm.clone().add(new THREE.Vector3(ts * 0.012, 0.002, -0.012)), lgn.clone().add(new THREE.Vector3(0, -0.004, 0.014)), lgn, 10);
      // radiation: fan over the occipital cortex
      const end = new THREE.Vector3(ts * (0.004 + r(10) * 0.044), 0.035 + r(11) * 0.06, -0.088 + r(12) * 0.012);
      const loop = lgn.clone().add(new THREE.Vector3(ts * 0.016, -0.006 + r(13) * 0.01, -0.012));
      const rad = bez(lgn, loop, end.clone().add(new THREE.Vector3(0, 0, 0.026)), end, 12);
      push(retina, hex, 0, 0.1);
      push(bundle, hex, 0.1, 0.4);
      push(tract, hex, 0.4, 0.6);
      push(rad, hex, 0.6, 1);
    }
    // ciliary nerves: meridians from the back of the globe to the equator
    for (let k = 0; k < 12; k++) {
      const th = (k / 12) * Math.PI * 2;
      const arc: THREE.Vector3[] = [];
      for (let q = 0; q <= 8; q++) {
        const ph = 0.25 + (q / 8) * 1.2;
        arc.push(E.clone().add(new THREE.Vector3(Math.cos(th) * Math.sin(ph), Math.sin(th) * Math.sin(ph), -Math.cos(ph)).multiplyScalar(R * 1.06)));
      }
      push(arc, 0xffe060, 0, 0.12);
    }
    // extra-ocular muscles: thin bands from the orbit apex to the globe
    const apex = E.clone().add(new THREE.Vector3(-s * 0.006, -0.002, -0.032));
    for (let m = 0; m < 6; m++) {
      const th = (m / 6) * Math.PI * 2 + 0.3;
      const ins = E.clone().add(new THREE.Vector3(Math.cos(th) * R * 0.95, Math.sin(th) * R * 0.95, R * 0.15));
      for (let l = 0; l < 3; l++) {
        const o = new THREE.Vector3(Math.cos(th + 1.57) * (l - 1) * 0.0012, Math.sin(th + 1.57) * (l - 1) * 0.0012, 0);
        push(bez(apex.clone().add(o), apex.clone().add(o).add(new THREE.Vector3(Math.cos(th) * 0.006, Math.sin(th) * 0.006, 0.01)), ins.clone().add(o).add(new THREE.Vector3(0, 0, -0.012)), ins.clone().add(o), 10), 0xff3a5a, 0.05, 0.12);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aD', new THREE.Float32BufferAttribute(ad, 1));
  return g;
}
