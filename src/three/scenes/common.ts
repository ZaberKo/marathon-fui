import { createStage, type Stage, type StageOpts } from '../core';

export const PAL = {
  cobalt: 0x2424ff,
  cobaltHi: 0x5257ff,
  cobaltLo: 0x10127a,
  cobaltDeep: 0x06073a,
  acid: 0x7dff1a,
  lime: 0xd4ff00,
  hazard: 0xffe000,
  crimson: 0xff2a17,
  bone: 0xececec,
  cyan: 0x38f5d4,
  orange: 0xff7a1a,
  magenta: 0xff2d8a,
};

export type SceneHandle = {
  stage: Stage;
  dispose(): void;
  set?(key: string, value: unknown): void;
};

export type SceneOpts = { fps?: number; pixel?: number; labels?: boolean; signal?: AbortSignal };

type SceneContent = Partial<Pick<SceneHandle, 'dispose' | 'set'>>;

/** Release the stage if a scene fails before it can return its handle. */
export async function mountStage(
  host: HTMLElement,
  opts: StageOpts,
  setup: (stage: Stage) => SceneContent | Promise<SceneContent>,
): Promise<SceneHandle> {
  const { signal } = opts;
  const stage = await createStage(host, opts);
  const onAbort = () => stage.dispose();
  try {
    signal?.throwIfAborted();
    signal?.addEventListener('abort', onAbort, { once: true });
    const content = await setup(stage);
    if (signal?.aborted) {
      content.dispose?.();
      signal.throwIfAborted();
    }
    let disposed = false;
    return {
      stage,
      set: content.set && ((key, value) => {
        if (!disposed) content.set?.(key, value);
      }),
      dispose() {
        if (disposed) return;
        disposed = true;
        try {
          content.dispose?.();
        } finally {
          stage.dispose();
        }
      },
    };
  } catch (error) {
    stage.dispose();
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}
