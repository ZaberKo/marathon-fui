export const ANCHORS = {
  boom: 4.0,
  dip: 26.25, // fragment 411 fails
  buffer: 31.75,
  lift: 40.09,
  runner: 41.966,
  hush: 53.216, // field assertion
  impact: 56.06,
  print: 64.07,
  printEnd: 74.4,
  silence: 75.32,
  swell: 81.2,
  drop: 87.3,
  survey: 92.6,
  hostile: 97.82,
  error: 103.445,
  downbeat: 120.32,
  final: 142.82,
  cut: 142.82,
  end: 147.0,
};

// Score envelopes are in film seconds. The impact dip is a short accent.
export const MUSIC = {
  file: 'scripts/.cache/music/shell-07.mp3',
  gain: -2,
  // Align the take's first strong downbeat and natural ending to the picture.
  offset: 2.192,
  tempo: 0.9833,
  // [start, end, gainDb, rampSeconds]
  duck: [
    [ANCHORS.dip, ANCHORS.dip + 0.9, -12, 0.08], // cohesion failure
    [ANCHORS.buffer, ANCHORS.lift, -5, 0.5], // reserve headroom for circuit activation
    [48.6, ANCHORS.hush - 0.12, 4, 0.32], // carry the shell lease into the assertion
    [ANCHORS.hush, ANCHORS.impact, -5, 0.16], // keep the score audible beneath ASSERT
    [ANCHORS.impact - 0.10, ANCHORS.impact + 0.08, -9, 0.06],
    [ANCHORS.impact + 0.08, 63.55, -4, 0.28], // death and psyche ejection
    [75.32, 80.95, -26, 0.26], // stand by
    [103.445, 106.8, -4, 0.12], // separate warning and alarm
    [109.75, 119.8, -5, 0.5], // two instances and recovery
    [137.2, 142.82, -13, 0.5], // countdown
  ],
};

export const CUES = {
  v01: 4.5,
  v02: 12.3,
  v03: 17.2,
  v04: 21.3,
  v05: ANCHORS.dip,
  v06: 31.8,
  v07: 42.1,
  v08: 45.4,
  v08b: 48.78,
  v09: 53.32,
  v10: 59.8,
  v11: 64.32,
  v12: 75.8,
  v13: 81.6,
  v14: 87.7,
  v15: 92.9,
  v16: 98.1,
  v17: 103.6,
  v18: 106.9,
  v19: 109.9,
  v20: 113.1,
  v21: 118.52,
  v22: 122.95,
  v23: 126.7,
  v24: 132.3,
  v25: 135.2,
  v26: 137.6,
  v27: 140.85,
  v28: 141.5,
  v29: 142.15,
  v30: 142.82,
  v31: 145.0,
};

// The comma pause in the existing take is the split between S08 and S09.
export const VOICE_SPLITS = {
  v08: [
    { id: 'v08', end: 1.82, en: 'A consciousness without a body.', zh: '一个没有身体的意识。' },
    { id: 'v08b', start: 1.87, en: 'Renting a printed shell.', zh: '租用着一具打印出来的躯壳。' },
  ],
};

/**
 * Designed SFX, synthesised with ffmpeg (no samples). [time, kind, gain dB]
 */
export const SFX = [
  [0.6, 'blip', -24], [1.2, 'blip', -26], [1.5, 'blip', -26], [2.9, 'tick', -22],
  [7.8, 'glitch', -22],
  [11.9, 'servo', -22],
  [16.6, 'blip', -22], [20.8, 'blip', -22],
  [ANCHORS.dip - 0.05, 'crush', -17],
  [53.2, 'glitch', -18],
  [ANCHORS.impact, 'impact', -8], [ANCHORS.impact + 0.02, 'shatter', -15],
  [64.2, 'blip', -22], [66.3, 'servo', -22],
  [75.6, 'blip', -20],
  [103.45, 'alarm', -18], [104.55, 'alarm', -20], [105.65, 'alarm', -22],
  [108.6, 'crush', -18],
  [120.32, 'glitch', -16],
  [140.85, 'tick', -16], [141.5, 'tick', -16], [142.15, 'tick', -16],
  [141.62, 'flash', -12],
  [142.86, 'whoosh', -10],
  [144.0, 'drone', -20],
];
