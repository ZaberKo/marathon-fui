/**
 * Cinema engine — a deterministic, seekable shot timeline.
 *
 * Every frame is a pure function of the global time T: the active shot draws
 * its 2D layers (bg behind 3D, fg above) and may hand back a three scene for
 * the shared renderer. Nothing accumulates state between frames, so the
 * player can scrub, step and capture any frame for comparison.
 *
 * Logical frame: 1920×1080. Canvas2D layers are allocated at that size; the 3D
 * layer renders at `quality × 1920×1080` and is CSS-scaled.
 */
import * as THREE from 'three/webgpu';
import { describeAdapter, gpuFallback, wantsWebGL } from '../three/core';
import { adapter, registerStage } from '../lib/perf';
import type { PostParams } from './post';

export const W = 1920;
export const H = 1080;
/** the reference is 29.97 fps; we sample on the same grid */
export const FPS = 30000 / 1001;

export type C2 = CanvasRenderingContext2D;

export type Three = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** optional post step: draw 2D after the 3D render using projected points */
};

export type Frame = {
  /** global time (s) */
  T: number;
  /** shot-local time (s) */
  t: number;
  dur: number;
  /** normalised progress 0..1 */
  u: number;
  /** global frame index on the 29.97 grid */
  n: number;
  bg: C2;
  fg: C2;
  /** set by a shot to request a 3D render this frame */
  three: Three | null;
  gl: GL;
  /** global screen layers (block mask, grain, scanlines, vignette) — shots may tweak */
  post: PostParams;
};

export type ShotInst = { draw(f: Frame): void; dispose?(): void };

export type ShotDef = {
  id: string;
  t0: number;
  t1: number;
  title: string;
  /** what the reference does here / which kit piece was missing or too simple */
  note?: string;
  build(k: Kit): ShotInst | Promise<ShotInst>;
};

export type Kit = { gl: GL };

/* ------------------------------------------------------------------ */
/* Shared renderer                                                     */
/* ------------------------------------------------------------------ */
export type GL = {
  renderer: THREE.WebGPURenderer;
  canvas: HTMLCanvasElement;
  backend: 'WebGPU' | 'WebGL2';
  quality: number;
  setQuality(q: number): void;
  render(three: Three | null): void;
  /** project a world point to logical frame px */
  project(p: THREE.Vector3, camera: THREE.Camera): { x: number; y: number; z: number };
  dispose(): void;
};

export async function createGL(host: HTMLElement, quality = 1): Promise<GL> {
  const canvas = document.createElement('canvas');
  canvas.className = 'cine-gl';
  host.appendChild(canvas);
  const triedWebGL = wantsWebGL();
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL: triedWebGL });
  try {
    await renderer.init();
  } catch (err) {
    canvas.remove();
    if (triedWebGL) throw err;
    gpuFallback(`init: ${(err as Error)?.message ?? err}`);
    return createGL(host, quality);
  }
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  describeAdapter(renderer, backend);
  const { stats, unregister } = registerStage('CINEMA');
  stats.backend = backend;
  stats.targetFps = Math.round(FPS);

  const setQuality = (q: number) => {
    gl.quality = q;
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(W * q), Math.round(H * q), false);
    stats.w = Math.round(W * q);
    stats.h = Math.round(H * q);
    canvas.style.imageRendering = q < 1 ? 'pixelated' : 'auto';
  };

  let winStart = performance.now();
  let winFrames = 0;
  const v = new THREE.Vector3();
  const gl: GL = {
    renderer,
    canvas,
    backend,
    quality,
    setQuality,
    render(three) {
      canvas.style.visibility = three ? 'visible' : 'hidden';
      if (!three) return;
      const c = three.camera as THREE.PerspectiveCamera;
      if (c.isPerspectiveCamera && c.aspect !== W / H) {
        c.aspect = W / H;
        c.updateProjectionMatrix();
      }
      const c0 = performance.now();
      renderer.render(three.scene, three.camera);
      stats.cpuMs = stats.cpuMs * 0.85 + (performance.now() - c0) * 0.15;
      const info = renderer.info;
      stats.drawCalls = info.render.drawCalls;
      stats.triangles = info.render.triangles;
      stats.lines = info.render.lines;
      stats.points = info.render.points;
      stats.geometries = info.memory.geometries;
      stats.textures = info.memory.textures;
      stats.gpuBytes = (info.memory as { total?: number }).total ?? 0;
      winFrames++;
      const now = performance.now();
      if (now - winStart > 1000) {
        stats.fps = (winFrames * 1000) / (now - winStart);
        winStart = now;
        winFrames = 0;
      }
    },
    project(p, camera) {
      v.copy(p).project(camera);
      return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, z: v.z };
    },
    dispose() {
      unregister();
      renderer.dispose();
      canvas.remove();
    },
  };
  setQuality(quality);
  if (backend === 'WebGPU') {
    const device = (renderer.backend as unknown as { device?: EventTarget & { lost: Promise<{ message: string; reason: string }> } }).device;
    device?.lost.then((i) => {
      adapter.fallbackReason = `device lost: ${i.message || i.reason}`;
    });
  }
  return gl;
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */
export class Timeline {
  readonly defs: ShotDef[];
  readonly duration: number;
  private inst = new Map<string, ShotInst>();
  private building = new Map<string, Promise<ShotInst>>();
  constructor(defs: ShotDef[], duration: number, private kit: Kit) {
    this.defs = [...defs].sort((a, b) => a.t0 - b.t0);
    this.duration = duration;
  }
  at(T: number) {
    let hit: ShotDef | undefined;
    for (const d of this.defs) if (T >= d.t0 && T < d.t1) hit = d; // later defs win (overlays)
    return hit;
  }
  async build(d: ShotDef) {
    const done = this.inst.get(d.id);
    if (done) return done;
    let p = this.building.get(d.id);
    if (!p) {
      p = Promise.resolve(d.build(this.kit)).then((i) => {
        this.inst.set(d.id, i);
        return i;
      });
      this.building.set(d.id, p);
    }
    return p;
  }
  async buildAll(onProgress?: (i: number, n: number, d: ShotDef) => void) {
    let i = 0;
    for (const d of this.defs) {
      onProgress?.(i++, this.defs.length, d);
      try {
        await this.build(d);
      } catch (e) {
        console.error('[cine] build failed', d.id, e);
      }
    }
  }
  get(d: ShotDef) {
    return this.inst.get(d.id);
  }
  dispose() {
    for (const i of this.inst.values()) i.dispose?.();
    this.inst.clear();
  }
}

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
