import * as THREE from 'three/webgpu';
import { attribute, exp, float, fract, max, mix, sin, smoothstep, step, uniform } from 'three/tsl';
import { hash } from '../engine';
import { brainGeometry } from './anatomy';
import { sliceAxis } from './slices';

/** Projection fibres rise from the base and fan through the actual brain cross-sections. */
export function ascendingBundles(timeOf: (rank: number, readiness: boolean) => number) {
  const guide = brainGeometry(28, 8);
  const levels = 52;
  const directions = 96;
  const tau = Math.PI * 2;
  guide.computeBoundingBox();
  const { min, max } = guide.boundingBox!;
  const vertices = guide.getAttribute('position').array as Float32Array;
  const sections = Array.from({ length: levels }, (_, level) => {
    const y = THREE.MathUtils.lerp(min.y + 0.018, max.y - 0.036, level / (levels - 1));
    return { y, edges: sliceAxis(vertices, guide.index?.array ?? null, 1, y) };
  });
  guide.dispose();
  const envelopes = [-1, 1].map((side) => sections.map(({ y, edges }) => {
    // At the crown the fissure can split a section, so use a separate origin in each lobe.
    let inner = Infinity;
    let outer = 0;
    for (let i = 0; i < edges.length; i += 6) {
      const z = edges[i + 2];
      const nextZ = edges[i + 5];
      if ((z < 0) === (nextZ < 0)) continue;
      const x = side * THREE.MathUtils.lerp(edges[i], edges[i + 3], z / (z - nextZ));
      if (x <= 0) continue;
      inner = Math.min(inner, x);
      outer = Math.max(outer, x);
    }
    const x = side * (inner < outer ? (inner + outer) * 0.5 : outer * 0.48);
    const radii = Array.from({ length: directions }, (_, direction) => {
      const angle = direction * tau / directions;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      // Stop at the medial plane or the first mesh boundary, whichever is nearer.
      let radius = dx * x < 0 ? -x / dx : Infinity;
      for (let i = 0; i < edges.length; i += 6) {
        const ax = edges[i] - x;
        const az = edges[i + 2];
        const ex = edges[i + 3] - edges[i];
        const ez = edges[i + 5] - az;
        const determinant = dx * ez - dz * ex;
        if (Math.abs(determinant) < 1e-8) continue;
        const alongEdge = (ax * dz - az * dx) / determinant;
        const distance = (ax * ez - az * ex) / determinant;
        if (alongEdge >= 0 && alongEdge <= 1 && distance > 0) radius = Math.min(radius, distance);
      }
      return Number.isFinite(radius) ? radius : 0;
    });
    return { x, y, radii };
  }));

  const positions: number[] = [];
  const colors: number[] = [];
  const activation: number[] = [];
  const phases: number[] = [];
  const distances: number[] = [];
  const lime = new THREE.Color(0x65f012);
  const green = new THREE.Color(0x297b12);
  const gold = new THREE.Color(0xe6ac35);
  const blue = new THREE.Color(0x231bb4);
  const red = new THREE.Color(0xff172e);
  let routes = 0;
  const push = (points: THREE.Vector3[], start: number, color: THREE.Color, phase: number) => {
    let distance = 0;
    for (let index = 1; index < points.length; index++) {
      const from = points[index - 1];
      const to = points[index];
      const next = distance + from.distanceTo(to);
      positions.push(from.x, from.y, from.z, to.x, to.y, to.z);
      // Fibres overlap most tightly at the roots. Lower their individual intensity there.
      const a = 0.17 + 0.83 * THREE.MathUtils.smoothstep(from.y, min.y, min.y + 0.30);
      const b = 0.17 + 0.83 * THREE.MathUtils.smoothstep(to.y, min.y, min.y + 0.30);
      colors.push(color.r * a, color.g * a, color.b * a, color.r * b, color.g * b, color.b * b);
      activation.push(start + distance * 0.62, start + next * 0.62);
      phases.push(phase, phase);
      distances.push(distance, next);
      distance = next;
    }
    routes++;
  };
  envelopes.forEach((sections, side) => {
    for (let bundle = 0; bundle < 42; bundle++) {
      const random = (...key: number[]) => hash(67, side, bundle, ...key);
      const medial = bundle % 4 === 1;
      const inward = side === 0 ? 0 : Math.PI;
      const root = inward + (random(1) - 0.5) * 1.35;
      const target = inward + (random(2) - 0.5) * (medial ? 1.85 : tau);
      const curl = (random(3) - 0.5) * (medial ? 0.75 : 1.3);
      const reach = medial ? 0.88 + random(4) * 0.09 : 0.57 + random(4) * 0.35;
      const bundleRank = random(5) * (bundle < 9 ? 0.18 : 1);
      const bundleColor = bundle % 10 === 0 ? gold : bundle % 4 === 0 ? blue : bundle % 3 === 0 ? lime : green;
      const rootDepth = 0.57 + random(14) * 0.33;
      for (let fibre = 0; fibre < 14; fibre++) {
        const first = Math.floor(random(fibre, 7) * 5);
        // Stagger sibling endpoints between sampled sections.
        const last = THREE.MathUtils.lerp(20, levels - 1, Math.sqrt(random(fibre, 8)));
        const finalSection = Math.ceil(last);
        const spread = (random(fibre, 9) - 0.5) * 0.42;
        const depth = (random(fibre, 10) - 0.5) * 0.17;
        const readiness = random(fibre, 15) < 0.16;
        const rank = readiness ? random(fibre, 16) : bundleRank;
        const points: THREE.Vector3[] = [];
        for (let level = first; level <= finalSection; level++) {
          const { x, y, radii } = sections[level];
          const height = level / (levels - 1);
          const fan = THREE.MathUtils.smoothstep(height, 0.05, 0.72);
          const angle = THREE.MathUtils.lerp(root, target, fan) + Math.sin(height * Math.PI) * curl + (0.15 + 0.85 * fan) * spread
            + (random(fibre, level, 11) - 0.5) * 0.09 * fan;
          const bin = THREE.MathUtils.euclideanModulo(angle / tau, 1) * directions;
          const lower = Math.floor(bin);
          const edge = THREE.MathUtils.lerp(radii[lower], radii[(lower + 1) % directions], bin - lower);
          const radius = edge * THREE.MathUtils.lerp(rootDepth + depth * 0.35, Math.min(0.985, reach + depth), fan);
          const point = new THREE.Vector3(x + Math.cos(angle) * radius, y, Math.sin(angle) * radius);
          if (level > last) point.lerp(points[points.length - 1], level - last);
          points.push(point);
        }
        push(points, timeOf(rank, readiness) + random(fibre, 12) * 0.25, readiness ? red : bundleColor, random(fibre, 13));
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aT', new THREE.Float32BufferAttribute(activation, 1));
  geometry.setAttribute('aS', new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aD', new THREE.Float32BufferAttribute(distances, 1));
  return { geometry, routes };
}

/** Additive material: dim until a fibre's activation, a flash, then signals flowing along it. */
export function connectomeMaterial(o: { dim?: number; speed?: number; base?: number; flash?: number; pulse?: number } = {}) {
  const time = uniform(0);
  const gain = uniform(1);
  const aT = attribute('aT', 'float');
  const aS = attribute('aS', 'float');
  const aD = attribute('aD', 'float');
  const base = attribute('color', 'vec3');
  const since = time.sub(aT);
  const on = step(float(0), since);
  const flash = exp(max(since, float(0)).mul(-5)).mul(o.flash ?? 2);
  const travel = smoothstep(float(0.72), float(1), fract(aD.mul(5).sub(time.mul(o.speed ?? 1.3)).add(aS))).mul(o.pulse ?? 1.4);
  const breathe = sin(time.mul(3).add(aS.mul(30))).mul(0.08).add(o.base ?? 0.32);
  const b = mix(float(o.dim ?? 0.07), breathe.add(flash).add(travel), on);
  const mat = new THREE.LineBasicNodeMaterial();
  mat.colorNode = base.mul(b).mul(gain);
  mat.transparent = true;
  mat.blending = THREE.AdditiveBlending;
  mat.depthWrite = false;
  return { mat, time, gain };
}
