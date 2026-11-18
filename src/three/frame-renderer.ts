import * as THREE from 'three/webgpu';
import { FPS, H, W, type SceneLayer } from '../graphics/frame';
import { adapter, registerStage } from '../lib/perf';
import { describeAdapter, gpuFallback, wantsWebGL } from './core';

export type GL = {
  renderer: THREE.WebGPURenderer;
  canvas: HTMLCanvasElement;
  backend: 'WebGPU' | 'WebGL2';
  quality: number;
  setQuality(q: number): void;
  render(three: SceneLayer | null): void;
  /** project a world point to logical frame px */
  project(p: THREE.Vector3, camera: THREE.Camera): { x: number; y: number; z: number };
  dispose(): void;
};

export async function createGL(host: HTMLElement, quality = 1, label = 'CINEMA'): Promise<GL> {
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
    return createGL(host, quality, label);
  }
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  describeAdapter(renderer, backend);
  const { stats, unregister } = registerStage(label);
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
      if (three.render) three.render();
      else renderer.render(three.scene, three.camera);
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
