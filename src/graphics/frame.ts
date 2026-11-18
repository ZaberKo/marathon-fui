import type * as THREE from 'three/webgpu';

export const W = 1920;
export const H = 1080;
/** Reference frame grid shared by the player and the dial previews. */
export const FPS = 30000 / 1001;

export type C2 = CanvasRenderingContext2D;

export type SceneLayer = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** Optional pipeline that renders this layer to the shared canvas. */
  render?: () => void;
};

export type LayerFrame = {
  bg: C2;
  fg: C2;
  t: number;
  three: SceneLayer | null;
};

/** quantise time to a step rate (stop-motion) */
export const q = (t: number, fps: number) => Math.floor(t * fps + 1e-6) / fps;
/** stepped 0..1 ramp between a and b at fps */
export const ramp = (t: number, a: number, b: number, fps = 30) => {
  const v = (q(t, fps) - a) / (b - a);
  return v < 0 ? 0 : v > 1 ? 1 : v;
};
/** deterministic hash → 0..1 */
export const hash = (...n: number[]) => {
  let h = 2166136261;
  for (const x of n) {
    h ^= Math.floor(x * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const easeOut = (x: number) => 1 - (1 - x) * (1 - x) * (1 - x);
export const easeIn = (x: number) => x * x * x;
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
