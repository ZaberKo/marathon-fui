/**
 * TSL materials for graphic realism.
 *
 * contourMaterial(): the body is (near) black, the form is described only by
 * thin iso-lines — topographic contours of a coordinate (world Y by default).
 * Optional extras:
 *   - a second contour family on another axis/colour (wire-grid look)
 *   - silhouette rim line
 *   - ordered (Bayer 4×4) screen-space dither on the body ("dot cloud")
 *   - a bright scan band that sweeps along the contour axis
 *
 * All colours/frequencies are uniforms, so they can be changed live.
 */
import * as THREE from 'three/webgpu';
import {
  abs, atan, float, floor, fract, fwidth, max, min, mix, normalView, positionLocal, positionWorld,
  screenCoordinate, smoothstep, step, uniform, vec3,
} from 'three/tsl';

// TSL node typings are very strict about swizzle/vector kinds; nodes here are
// composed dynamically (axis chosen at runtime), so we keep them loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

type Axis = 'x' | 'y' | 'z' | 'theta';

export type ContourOpts = {
  line?: number;
  body?: number;
  freq?: number;
  /** line width in screen px (approx.) */
  width?: number;
  axis?: Axis;
  space?: 'world' | 'local';
  line2?: number | null;
  freq2?: number;
  axis2?: Axis;
  width2?: number;
  rim?: number | null;
  rimWidth?: number;
  dither?: number | null;
  ditherGain?: number;
  /** pixel size of the dither cell */
  ditherScale?: number;
  scan?: number | null;
  scanWidth?: number;
  opacity?: number;
};

const v3 = (hex: number) => {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
};

/** thin anti-aliased line at every integer of v */
const iso = (v: N, widthPx: N) => {
  const f: N = fract(v);
  const d: N = min(f, float(1).sub(f));
  const fw: N = max(fwidth(v).mul(widthPx), float(1e-5));
  return float(1).sub(smoothstep(float(0), fw, d));
};

/** Bayer 4×4 threshold from pixel coords */
const bayer2 = (a: N) => {
  const b: N = floor(a);
  return fract(b.x.mul(0.5).add(b.y.mul(b.y).mul(0.75)));
};
const bayer4 = (a: N) => bayer2(a.mul(0.5)).mul(0.25).add(bayer2(a));

export function contourMaterial(o: ContourOpts = {}) {
  const u = {
    line: uniform(v3(o.line ?? 0xececec)),
    body: uniform(v3(o.body ?? 0x000000)),
    freq: uniform(o.freq ?? 30),
    width: uniform(o.width ?? 1),
    offset: uniform(0),
    line2: uniform(v3(o.line2 ?? 0x2424ff)),
    freq2: uniform(o.freq2 ?? 20),
    width2: uniform(o.width2 ?? 1),
    offset2: uniform(0),
    rim: uniform(v3(o.rim ?? 0x2424ff)),
    rimWidth: uniform(o.rimWidth ?? 0.22),
    dither: uniform(v3(o.dither ?? 0x10127a)),
    ditherGain: uniform(o.ditherGain ?? 0.9),
    scan: uniform(v3(o.scan ?? 0x7dff1a)),
    scanY: uniform(-999),
    scanWidth: uniform(o.scanWidth ?? 0.012),
    lineMix: uniform(1),
  };
  const P: N = o.space === 'local' ? positionLocal : positionWorld;
  // 'theta' = angle around the Y axis (−1…1), giving meridian lines — with 'y' a lat/long grid
  const axisOf = (a: Axis | undefined): N => (a === 'theta' ? atan(P.x, P.z).div(Math.PI) : P[a ?? 'y']);

  let col: N = vec3(u.body);

  if (o.dither != null) {
    const facing: N = abs(normalView.z).mul(u.ditherGain);
    const cell: N = screenCoordinate.xy.div(o.ditherScale ?? 2);
    const dot: N = step(bayer4(cell), facing.mul(facing));
    col = mix(col, vec3(u.dither), dot);
  }

  const l1: N = iso(axisOf(o.axis).mul(u.freq).add(u.offset), u.width).mul(u.lineMix);
  col = mix(col, vec3(u.line), l1);

  if (o.line2 != null) {
    const l2: N = iso(axisOf(o.axis2 ?? 'x').mul(u.freq2).add(u.offset2), u.width2);
    col = mix(col, vec3(u.line2), l2);
  }

  if (o.rim != null) {
    const r: N = float(1).sub(smoothstep(float(0), u.rimWidth, abs(normalView.z)));
    col = mix(col, vec3(u.rim), r);
  }

  if (o.scan != null) {
    const s: N = float(1).sub(smoothstep(float(0), u.scanWidth, abs(axisOf(o.axis).sub(u.scanY))));
    col = mix(col, vec3(u.scan), s);
  }

  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = col;
  if (o.opacity != null && o.opacity < 1) {
    mat.transparent = true;
    mat.opacity = o.opacity;
  }

  const setColor = (key: 'line' | 'body' | 'line2' | 'rim' | 'dither' | 'scan', hex: number) => u[key].value.copy(v3(hex));
  return { mat, u, setColor };
}

/** Flat colour that writes depth — hides lines behind a form (hidden-line removal). */
export function occluder(color = 0x000000) {
  return new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
}
