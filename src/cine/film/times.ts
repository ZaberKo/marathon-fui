/**
 * Shot boundaries (film seconds), cut to the score's bar lines and the VO.
 * Every shot file reads its t0/t1 from here so the edit lives in one place.
 */
import { ANCHORS } from './cues';

export const ST = {
  S00: [0, ANCHORS.boom],
  S01: [ANCHORS.boom, 8.0],
  S02: [8.0, 12.0],
  S03: [12.0, 16.8],
  S04: [16.8, 20.8],
  S05: [20.8, 31.4],
  S06: [31.4, ANCHORS.runner],
  S07: [ANCHORS.runner, 45.2],
  S08: [45.2, 48.6],
  S09: [48.6, ANCHORS.hush],
  S10: [ANCHORS.hush, 59.5],
  S11: [59.5, ANCHORS.print],
  S12: [ANCHORS.print, ANCHORS.silence],
  S13: [ANCHORS.silence, ANCHORS.swell],
  S14: [ANCHORS.swell, ANCHORS.survey],
  S15: [ANCHORS.survey, ANCHORS.hostile],
  S16: [ANCHORS.hostile, ANCHORS.error],
  S17: [ANCHORS.error, 106.8],
  S18: [106.8, 109.75],
  S19: [109.75, 112.8],
  S20: [112.8, 116.4],
  S21: [116.4, 126.4],
  S22: [126.4, 132.0],
  S23: [132.0, 137.2],
  S24: [137.2, ANCHORS.final],
  S25: [ANCHORS.final, ANCHORS.end],
} as const;
