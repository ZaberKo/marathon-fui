import type { ShotDef } from '../engine';
import { s1 } from './s1-boot';
import { s2 } from './s2-eval';
import { s3 } from './s3-memory';
import { s4 } from './s4-runner';
import { s5 } from './s5-death';
import { s6 } from './s6-print';
import { s7 } from './s7-world';
import { s8 } from './s8-error';
import { s9 } from './s9-end';

export const SHOTS: ShotDef[] = [...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9];
