import type { Stage } from '../core';

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

export type SceneOpts = { fps?: number; pixel?: number; labels?: boolean };
