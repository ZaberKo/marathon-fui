/**
 * Shared stage: three's WebGPURenderer (auto WebGL2 fallback) + stepped time
 * + perf registration.
 *
 * Rendering is *stepped*: frames are only produced at `fps`, and the time
 * handed to update() is quantised — the stop-motion, machine-driven feel.
 *
 * Resolution policy: by default we render at 1 CSS px per pixel (not device
 * pixels) and upscale with nearest-neighbour. 1px lines stay crisp and read
 * as "plotter" strokes even on HiDPI screens. `pixel` divides further.
 */
import * as THREE from 'three/webgpu';
import { adapter, registerStage } from '../lib/perf';

/* ------------------------------------------------------------------ */
/* Backend preference + fallback                                       */
/* ------------------------------------------------------------------ */
let preferWebGL = new URLSearchParams(location.search).get('gl') === 'webgl';
export const GPU_FALLBACK_EVENT = 'gpu-fallback';
export const wantsWebGL = () => preferWebGL;
export function gpuFallback(reason: string) {
  if (preferWebGL) return;
  preferWebGL = true;
  adapter.fallbackReason = reason;
  adapter.name = '';
  console.warn(`[stage] WebGPU failed (${reason}) — falling back to WebGL2`);
  window.dispatchEvent(new CustomEvent(GPU_FALLBACK_EVENT));
}

export async function describeAdapter(renderer: THREE.WebGPURenderer, backend: 'WebGPU' | 'WebGL2') {
  adapter.backend = backend;
  if (adapter.name) return;
  try {
    if (backend === 'WebGPU') {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ info?: Record<string, string> } | null> } }).gpu;
      const a = await gpu?.requestAdapter();
      const i = a?.info ?? {};
      adapter.name = [i.vendor, i.architecture, i.description].filter(Boolean).join(' · ') || 'webgpu adapter';
    } else {
      const gl = (renderer.backend as unknown as { gl?: WebGL2RenderingContext }).gl;
      const ext = gl?.getExtension('WEBGL_debug_renderer_info');
      adapter.name = (ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : gl?.getParameter(gl.RENDERER)) || 'webgl2';
    }
  } catch {
    adapter.name = backend.toLowerCase();
  }
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */
export type StageOpts = {
  label?: string;
  fps?: number;
  /** extra resolution divisor; 2 = chunky pixels */
  pixel?: number;
  /** render at device pixel ratio instead of 1 CSS px */
  hiDpi?: boolean;
  camera?: THREE.Camera;
  clear?: number;
};

export type Stage = {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  canvas: HTMLCanvasElement;
  host: HTMLElement;
  backend: 'WebGPU' | 'WebGL2';
  size: { w: number; h: number };
  fps: number;
  setFps(n: number): void;
  setPixel(n: number): void;
  start(update: (t: number, frame: number, dt: number) => void): void;
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
  describeAdapter(renderer, backend);

  let disposed = false;
  if (backend === 'WebGPU') {
    // minimal structural typing — avoids depending on @webgpu/types
    const device = (renderer.backend as unknown as { device?: EventTarget & { lost: Promise<{ reason: string; message: string }> } }).device;
    device?.addEventListener('uncapturederror', (e) => gpuFallback(String((e as unknown as { error?: { message?: string } }).error?.message ?? 'uncaptured error')));
    device?.lost.then((info) => {
      if (!disposed) gpuFallback(`device lost: ${info.message || info.reason}`);
    });
  }

  const { stats, unregister } = registerStage(opts.label ?? 'STAGE');
  stats.backend = backend;

  const scene = new THREE.Scene();
  const camera = (opts.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera) ?? new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  let fps = opts.fps ?? 12;
  let pixel = opts.pixel ?? 1;
  const size = { w: 1, h: 1 };
  stats.targetFps = fps;

  const resize = () => {
    const r = host.getBoundingClientRect();
    size.w = Math.max(1, Math.floor(r.width));
    size.h = Math.max(1, Math.floor(r.height));
    const base = opts.hiDpi ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const pr = base / pixel;
    renderer.setPixelRatio(pr);
    renderer.setSize(size.w, size.h, false);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    canvas.style.imageRendering = pr < (window.devicePixelRatio || 1) ? 'pixelated' : 'auto';
    stats.w = Math.round(size.w * pr);
    stats.h = Math.round(size.h * pr);
    stats.dpr = pr;
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
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    stats.visible = visible;
    if (!visible) stats.fps = 0;
  });
  io.observe(host);

  let raf = 0;
  let last = 0;
  let frame = 0;
  let forceRender = true;
  let updateFn: (t: number, frame: number, dt: number) => void = () => {};
  const t0 = performance.now();
  // fps measurement window
  let winStart = performance.now();
  let winFrames = 0;
  let lastT = 0;

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!visible) return;
    const interval = 1000 / fps;
    if (!forceRender && now - last < interval * 0.92) return;
    forceRender = false;
    last = now;
    const t = Math.floor(((now - t0) / 1000) * fps) / fps; // quantised time
    const dt = Math.max(0, t - lastT);
    lastT = t;
    const c0 = performance.now();
    updateFn(t, frame++, dt);
    renderer.render(scene, camera);
    const cpu = performance.now() - c0;
    stats.cpuMs = stats.cpuMs * 0.85 + cpu * 0.15;
    const info = renderer.info;
    stats.drawCalls = info.render.drawCalls;
    stats.triangles = info.render.triangles;
    stats.lines = info.render.lines;
    stats.points = info.render.points;
    stats.geometries = info.memory.geometries;
    stats.textures = info.memory.textures;
    stats.gpuBytes = (info.memory as { total?: number }).total ?? 0;
    winFrames++;
    if (now - winStart >= 1000) {
      stats.fps = (winFrames * 1000) / (now - winStart);
      winStart = now;
      winFrames = 0;
    }
  };

  resize();

  const stage: Stage = {
    renderer,
    scene,
    camera,
    canvas,
    host,
    backend,
    size,
    get fps() {
      return fps;
    },
    setFps(n) {
      fps = n;
      stats.targetFps = n;
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
      unregister();
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
  return stage;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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
  return new THREE.GridHelper(size, div, color, color);
}

/** Closed polyline (WebGPURenderer has no LineLoop — repeat first point). */
export function closedLine(points: THREE.Vector3[], material: THREE.LineBasicMaterial) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints([...points, points[0]]), material);
}

/** Circle in the XZ plane (or any plane via rotation afterwards). */
export function ringLine(radius: number, color: number, segs = 96, y = 0) {
  const pts = Array.from({ length: segs }, (_, i) => {
    const a = (i / segs) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius);
  });
  return closedLine(pts, new THREE.LineBasicMaterial({ color }));
}

/** DOM label that follows a 3D point. */
export function makeTag(host: HTMLElement, html: string, cls = '') {
  const el = document.createElement('div');
  el.className = `gl-tag ${cls}`;
  el.innerHTML = html;
  host.appendChild(el);
  return {
    el,
    at(stage: Stage, p: THREE.Vector3, dx = 0, dy = 0) {
      const s = toScreen(p, stage);
      el.style.visibility = s.behind ? 'hidden' : 'visible';
      el.style.transform = `translate(${Math.round(s.x + dx)}px, ${Math.round(s.y + dy)}px)`;
    },
    remove: () => el.remove(),
  };
}
