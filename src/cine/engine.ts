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
import type { LayerFrame } from '../graphics/frame';
import type { GL } from '../three/frame-renderer';

export { FPS, H, W, clamp01, easeIn, easeInOut, easeOut, hash, lerp, q, ramp } from '../graphics/frame';
export type { C2 } from '../graphics/frame';

export type Frame = LayerFrame & {
  /** Global time in seconds. */
  T: number;
  dur: number;
  /** Normalised progress from 0 to 1. */
  u: number;
  /** Global frame index on the 29.97 grid. */
  n: number;
  gl: GL;
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
