/**
 * Extra node materials for the cinema study (beyond contourMaterial):
 * x-ray fresnel, two-tone flat shading, halftone dots and tri-shard fills.
 */
import * as THREE from 'three/webgpu';
import { abs, dot, float, floor, fract, length, mix, normalView, normalWorld, pow, screenCoordinate, sin, smoothstep, step, uniform, vec2, vec3 } from 'three/tsl';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;
const v3 = (hex: number) => {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
};

/** Additive fresnel glow: inner colour in the middle, rim colour at grazing angles. */
export function xray(o: { inner: number; rim: number; power?: number; gain?: number; additive?: boolean }) {
  const inner = uniform(v3(o.inner));
  const rim = uniform(v3(o.rim));
  const gain = uniform(o.gain ?? 1);
  const f: N = pow(float(1).sub(abs(normalView.z)), float(o.power ?? 2));
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  m.blending = o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending;
  m.colorNode = mix(vec3(inner), vec3(rim), f).mul(gain);
  return { mat: m, inner, rim, gain };
}

/** Two-tone flat shading by facing ratio, with a hard step (cel look). */
export function toon(o: { lit: number; shade: number; edge?: number; threshold?: number; edgeWidth?: number }) {
  const lit = uniform(v3(o.lit));
  const shade = uniform(v3(o.shade));
  const edge = uniform(v3(o.edge ?? 0x000000));
  const facing: N = abs(normalView.z);
  let col: N = mix(vec3(shade), vec3(lit), step(float(o.threshold ?? 0.55), facing));
  col = mix(vec3(edge), col, smoothstep(float(0.0), float(o.edgeWidth ?? 0.22), facing));
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = col;
  return { mat: m, lit, shade, edge };
}

/** Screen-space halftone dots: dot radius follows facing ratio. */
export function screenDots(o: { color: number; cell?: number; gain?: number; bg?: number }) {
  const col = uniform(v3(o.color));
  const gain = uniform(o.gain ?? 1);
  const cell = o.cell ?? 6;
  const p: N = screenCoordinate.xy.div(cell);
  const d: N = length(fract(p).sub(0.5));
  const facing: N = abs(normalView.z);
  const r: N = facing.mul(0.55).mul(gain);
  const dot: N = float(1).sub(step(r, d));
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = mix(vec3(v3(o.bg ?? 0)), vec3(col), dot);
  return { mat: m, col, gain };
}

/** Square pixel cells in screen space, lit cells only where facing > threshold. */
export function screenPixels(o: { color: number; cell?: number; bg?: number; thresh?: number }) {
  const col = uniform(v3(o.color));
  const cell = o.cell ?? 8;
  const p: N = screenCoordinate.xy.div(cell);
  const f: N = fract(p);
  const gap: N = step(float(0.18), f.x).mul(step(float(0.18), f.y));
  const facing: N = abs(normalView.z);
  const on: N = step(float(o.thresh ?? 0.35), facing).mul(gap);
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = mix(vec3(v3(o.bg ?? 0)), vec3(col), on);
  return { mat: m, col };
}

export const basic = (color: number, o: { opacity?: number; additive?: boolean; side?: THREE.Side; depthTest?: boolean } = {}) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: (o.opacity ?? 1) < 1 || !!o.additive,
    opacity: o.opacity ?? 1,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !(o.additive || (o.opacity ?? 1) < 1),
    depthTest: o.depthTest ?? true,
    side: o.side ?? THREE.FrontSide,
  });

export const lineMat = (color: number, opacity = 1, depthTest = true) =>
  new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthTest, depthWrite: false });

export { vec2 };

/**
 * World-lit toon with horizontal glitch bands: on random screen rows (changing
 * `rate` times a second) the surface flips to one of two glitch colours. The
 * glitch lives *on the body*, not as stickers floating in front of it.
 */
export function glitchToon(o: { lit: number; mid?: number; shade: number; g0: number; g1: number; amount?: number; band?: number; rate?: number }) {
  const L = vec3(-0.45, 0.8, 0.4).normalize();
  const time = uniform(0);
  const amount = uniform(o.amount ?? 0.08);
  const d: N = dot(normalWorld, L);
  let base: N = mix(vec3(v3(o.shade)), vec3(v3(o.mid ?? o.lit)), step(float(0.05), d));
  base = mix(base, vec3(v3(o.lit)), step(float(0.6), d));
  const band: N = floor(screenCoordinate.y.div(o.band ?? 9));
  const st: N = floor(time.mul(o.rate ?? 14));
  const h1: N = fract(sin(band.mul(12.9898).add(st.mul(78.233))).mul(43758.5453));
  const h2: N = fract(sin(band.mul(4.123).add(st.mul(1.731))).mul(9631.31));
  const on: N = step(float(1).sub(amount), h1);
  const g: N = mix(vec3(v3(o.g0)), vec3(v3(o.g1)), step(float(0.5), h2));
  const m = new THREE.MeshBasicNodeMaterial();
  m.colorNode = mix(base, g, on);
  return { mat: m, time, amount };
}
