/**
 * Shared WebGPU stage. Uses three's WebGPURenderer which transparently
 * falls back to a WebGL2 backend when navigator.gpu is unavailable.
 *
 * Rendering is *stepped*: frames are only produced at `fps`, and time
 * passed to update() is quantised — that is what gives the stop-motion,
 * machine-driven feel instead of buttery interpolation.
 */
import * as THREE from 'three/webgpu';

/**
 * Backend preference. `?gl=webgl` forces WebGL2. If a WebGPU device is lost
 * or reports an uncaptured error (broken drivers, headless SwiftShader…),
 * we flip to WebGL2 and broadcast `gpu-fallback` so mounted scenes remount.
 */
let preferWebGL = new URLSearchParams(location.search).get('gl') === 'webgl';
export const GPU_FALLBACK_EVENT = 'gpu-fallback';
export function gpuFallback(reason: string) {
  if (preferWebGL) return;
  preferWebGL = true;
  console.warn(`[stage] WebGPU failed (${reason}) — falling back to WebGL2`);
  window.dispatchEvent(new CustomEvent(GPU_FALLBACK_EVENT));
}

export type StageOpts = {
  fps?: number;
  /** render-resolution divisor; 2 = chunky pixels upscaled with nearest-neighbour */
  pixel?: number;
  camera?: THREE.Camera;
  clear?: number;
};

export type Stage = {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  canvas: HTMLCanvasElement;
  backend: 'WebGPU' | 'WebGL2';
  size: { w: number; h: number };
  setFps(n: number): void;
  setPixel(n: number): void;
  start(update: (t: number, frame: number) => void): void;
  dispose(): void;
};

export async function createStage(host: HTMLElement, opts: StageOpts = {}): Promise<Stage> {
  const canvas = document.createElement('canvas');
  canvas.className = 'gl-canvas';
  host.appendChild(canvas);

  const triedWebGL = preferWebGL;
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, alpha: false, forceWebGL: triedWebGL });
  try {
    await renderer.init();
  } catch (err) {
    // A canvas that already holds a 'webgpu' context can't become WebGL2 —
    // retry on a fresh canvas with the WebGL2 backend.
    canvas.remove();
    if (triedWebGL) throw err;
    gpuFallback(`init: ${(err as Error)?.message ?? err}`);
    return createStage(host, opts);
  }
  renderer.setClearColor(opts.clear ?? 0x000000, 1);
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';

  let disposed = false;
  if (backend === 'WebGPU') {
    // minimal structural typing — avoids depending on @webgpu/types
    const device = (renderer.backend as unknown as { device?: EventTarget & { lost: Promise<{ reason: string; message: string }> } }).device;
    device?.addEventListener('uncapturederror', (e) => gpuFallback(String((e as unknown as { error?: { message?: string } }).error?.message ?? 'uncaptured error')));
    device?.lost.then((info) => {
      if (!disposed) gpuFallback(`device lost: ${info.message || info.reason}`);
    });
  }

  const scene = new THREE.Scene();
  const camera =
    (opts.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera) ??
    new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  let fps = opts.fps ?? 12;
  let pixel = opts.pixel ?? 1;
  const size = { w: 1, h: 1 };

  const resize = () => {
    const r = host.getBoundingClientRect();
    size.w = Math.max(1, Math.floor(r.width));
    size.h = Math.max(1, Math.floor(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr / pixel);
    renderer.setSize(size.w, size.h, false);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    canvas.style.imageRendering = pixel > 1 ? 'pixelated' : 'auto';
    const aspect = size.w / size.h;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).aspect = aspect;
    } else {
      const o = camera as THREE.OrthographicCamera;
      const hh = (o.top - o.bottom) / 2;
      o.left = -hh * aspect;
      o.right = hh * aspect;
    }
    camera.updateProjectionMatrix();
    forceRender = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(host);

  let raf = 0;
  let last = 0;
  let frame = 0;
  let forceRender = true;
  let updateFn: (t: number, frame: number) => void = () => {};
  const t0 = performance.now();

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    const interval = 1000 / fps;
    if (!forceRender && now - last < interval) return;
    forceRender = false;
    last = now;
    const t = Math.floor(((now - t0) / 1000) * fps) / fps; // quantised time
    updateFn(t, frame++);
    renderer.render(scene, camera);
  };

  resize();

  return {
    renderer,
    scene,
    camera,
    canvas,
    backend,
    size,
    setFps(n) {
      fps = n;
    },
    setPixel(n) {
      pixel = n;
      resize();
    },
    start(update) {
      updateFn = update;
      raf = requestAnimationFrame(loop);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** Project a world position to CSS px inside the stage. */
export function toScreen(v: THREE.Vector3, stage: Stage) {
  const p = v.clone().project(stage.camera);
  return { x: (p.x * 0.5 + 0.5) * stage.size.w, y: (-p.y * 0.5 + 0.5) * stage.size.h, behind: p.z > 1 };
}

/** Wireframe box with only corner ticks (CAD-style bounding volume). */
export function cornerBox(size: THREE.Vector3, color: number, tick = 0.18) {
  const { x, y, z } = size.clone().multiplyScalar(0.5);
  const pts: number[] = [];
  const corners = [
    [-x, -y, -z], [x, -y, -z], [-x, y, -z], [x, y, -z],
    [-x, -y, z], [x, -y, z], [-x, y, z], [x, y, z],
  ];
  for (const [cx, cy, cz] of corners) {
    const sx = -Math.sign(cx) * tick;
    const sy = -Math.sign(cy) * tick;
    const sz = -Math.sign(cz) * tick;
    pts.push(cx, cy, cz, cx + sx, cy, cz);
    pts.push(cx, cy, cz, cx, cy + sy, cz);
    pts.push(cx, cy, cz, cx, cy, cz + sz);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color }));
}

/** Full wire box. */
export function wireBox(size: THREE.Vector3, color: number, opacity = 1) {
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}

/** Flat ground grid of 1px lines. */
export function floorGrid(size = 10, div = 20, color = 0x10127a) {
  const g = new THREE.GridHelper(size, div, color, color);
  return g;
}

/** Closed polyline (WebGPURenderer has no LineLoop — repeat first point). */
export function closedLine(points: THREE.Vector3[], material: THREE.LineBasicMaterial) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints([...points, points[0]]), material);
}
