/**
 * Self-built anatomy helpers: the neutral SDF head used by the scene library
 * (headscan / assets) and the procedural brain re-export.
 */
import * as THREE from 'three/webgpu';
import { meshSDF, toGeometry, type Prim } from './sdf';
import { brainGeometry } from '../../three/procedural';

/* ------------------------------------------------------------------ */
/* Head (SDF) — neutral, roughly 0.24 m tall, eyes on +Z               */
/* ------------------------------------------------------------------ */
let headGeo: THREE.BufferGeometry | null = null;
export const HEAD = { eyeY: 0.035, eyeX: 0.032, eyeZ: 0.083, top: 0.16, chin: -0.115 };

export function headGeometry(cell = 0.0032) {
  if (headGeo) return headGeo;
  const qx = (deg: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler((deg * Math.PI) / 180, 0, 0));
  const P: Prim[] = [
    { t: 'ell', c: [0, 0.068, -0.012], r: [0.076, 0.094, 0.098], k: 0.03 }, // cranium
    { t: 'ell', c: [0, 0.05, 0.035], r: [0.066, 0.075, 0.06], k: 0.03 }, // forehead
    { t: 'ell', c: [0, -0.04, 0.035], r: [0.058, 0.06, 0.055], k: 0.04 }, // midface
    { t: 'ell', c: [0, -0.085, 0.045], r: [0.04, 0.03, 0.035], k: 0.035 }, // chin
    { t: 'cone', a: [-0.05, -0.04, 0.0], b: [-0.02, -0.095, 0.05], ra: 0.022, rb: 0.016, k: 0.03 }, // jaw L
    { t: 'cone', a: [0.05, -0.04, 0.0], b: [0.02, -0.095, 0.05], ra: 0.022, rb: 0.016, k: 0.03 }, // jaw R
    { t: 'ell', c: [-0.045, -0.01, 0.05], r: [0.02, 0.016, 0.02], k: 0.02 }, // cheekbones
    { t: 'ell', c: [0.045, -0.01, 0.05], r: [0.02, 0.016, 0.02], k: 0.02 },
    { t: 'cone', a: [0, 0.03, 0.082], b: [0, -0.02, 0.1], ra: 0.008, rb: 0.012, k: 0.012 }, // nose bridge
    { t: 'ell', c: [0, -0.025, 0.098], r: [0.016, 0.012, 0.012], k: 0.01 }, // nose tip
    { t: 'ell', c: [0, -0.056, 0.08], r: [0.024, 0.008, 0.01], k: 0.008 }, // lips
    { t: 'ell', c: [0, -0.067, 0.078], r: [0.02, 0.007, 0.009], k: 0.008 },
    { t: 'cone', a: [-0.03, 0.05, 0.075], b: [0.03, 0.05, 0.075], ra: 0.011, rb: 0.011, k: 0.02 }, // brow
    { t: 'ell', c: [-0.077, -0.005, -0.005], r: [0.01, 0.028, 0.017], k: 0.01 }, // ears
    { t: 'ell', c: [0.077, -0.005, -0.005], r: [0.01, 0.028, 0.017], k: 0.01 },
    { t: 'cone', a: [0, -0.06, -0.025], b: [0, -0.2, -0.03], ra: 0.048, rb: 0.055, k: 0.03 }, // neck
    // eye sockets
    { t: 'ell', c: [-HEAD.eyeX, HEAD.eyeY, 0.088], r: [0.019, 0.012, 0.014], k: 0.012, sub: true },
    { t: 'ell', c: [HEAD.eyeX, HEAD.eyeY, 0.088], r: [0.019, 0.012, 0.014], k: 0.012, sub: true },
    { t: 'box', c: [0, -0.06, 0.09], h: [0.018, 0.0015, 0.02], k: 0.004, sub: true, rot: qx(0) }, // mouth line
  ];
  headGeo = toGeometry(meshSDF(P, cell, 0.01));
  return headGeo;
}

export { brainGeometry };
