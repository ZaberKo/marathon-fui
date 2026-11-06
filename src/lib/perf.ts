/**
 * Performance registry — deliberately free of any three.js import so the
 * floating HUD can live in the main bundle while 3D stays lazy-loaded.
 *
 *  - pageMeter: rAF-based page FPS + frame-time history
 *  - registerStage(): each 3D stage pushes its render stats here
 *  - adapter: GPU adapter description (filled in by the first stage)
 */

export type StageStats = {
  id: number;
  label: string;
  backend: 'WebGPU' | 'WebGL2' | '—';
  targetFps: number;
  /** measured renders per second */
  fps: number;
  /** CPU ms for update + render submit (EMA) */
  cpuMs: number;
  drawCalls: number;
  triangles: number;
  lines: number;
  points: number;
  geometries: number;
  textures: number;
  gpuBytes: number;
  w: number;
  h: number;
  dpr: number;
  visible: boolean;
};

const stages = new Set<StageStats>();
let nextId = 1;

export function registerStage(label: string): { stats: StageStats; unregister: () => void } {
  const stats: StageStats = {
    id: nextId++,
    label,
    backend: '—',
    targetFps: 0,
    fps: 0,
    cpuMs: 0,
    drawCalls: 0,
    triangles: 0,
    lines: 0,
    points: 0,
    geometries: 0,
    textures: 0,
    gpuBytes: 0,
    w: 0,
    h: 0,
    dpr: 1,
    visible: true,
  };
  stages.add(stats);
  return { stats, unregister: () => stages.delete(stats) };
}

export const listStages = () => Array.from(stages);

/** GPU adapter description, set once by the 3D layer. */
export const adapter = { name: '', backend: '' as '' | 'WebGPU' | 'WebGL2', fallbackReason: '' };

/* ------------------------------------------------------------------ */
/* Page frame meter                                                    */
/* ------------------------------------------------------------------ */
export const pageMeter = {
  fps: 0,
  frameMs: 0,
  worstMs: 0,
  /** last N frame times (ms) */
  history: [] as number[],
};

let meterOn = false;
export function startPageMeter(historyLen = 90) {
  if (meterOn) return;
  meterOn = true;
  let last = performance.now();
  let acc = 0;
  let frames = 0;
  let worst = 0;
  const tick = (now: number) => {
    const dt = now - last;
    last = now;
    pageMeter.history.push(dt);
    if (pageMeter.history.length > historyLen) pageMeter.history.shift();
    acc += dt;
    frames++;
    worst = Math.max(worst, dt);
    if (acc >= 500) {
      pageMeter.fps = (frames * 1000) / acc;
      pageMeter.frameMs = acc / frames;
      pageMeter.worstMs = worst;
      acc = 0;
      frames = 0;
      worst = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export const fmtBytes = (b: number) =>
  b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)}MB` : b >= 1024 ? `${(b / 1024).toFixed(0)}KB` : `${b}B`;
export const fmtK = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));
