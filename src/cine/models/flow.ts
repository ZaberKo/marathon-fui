/**
 * Line material with pulses flowing along an arc-length attribute `aD`
 * (used by the optic pathway in the transfer shot).
 */
import * as THREE from 'three/webgpu';
import { attribute, float, fract, smoothstep, uniform } from 'three/tsl';

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
