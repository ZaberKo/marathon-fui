// Edit decision list for the film: where each VO line starts (seconds) and the
// music anchors the picture is cut to. Times were laid out against the Lyria
// score (take B) — see scripts/anchors.py for how the anchors were measured.
export const MUSIC = { file: 'scripts/.cache/music/takeB.mp3', gain: 0 };

export const ANCHORS = {
  boom: 4.05, // first sub boom → INITIATING
  arps: 20.0, // brighter arpeggio section
  dip: 29.5, // short dropout → cohesion failure glitch
  lift: 36.85, // lift begins
  runner: 38.45, // strongest onset of the lift → RUNNER card
  hush: 48.5, // the music thins out
  impact: 50.05, // death impact
  print: 60.0, // mechanical section
  printEnd: 72.05, // last printing hit
  silence: 76.07, // total silence until 80.61
  swell: 80.61, // vast swell → system zoom
  hostile: 90.0,
  error: 95.5,
  downbeat: 108.05, // loudest section → defragmentation complete
  riser: 125.25,
  final: 131.05, // last hit → INITIATE
  cut: 133.38, // music gone
  end: 139.0, // film end (black after the transfer; the last line ends ≈137.5)
};

export const CUES = {
  v01: 4.6,
  v02: 11.6,
  v03: 16.2,
  v04: 20.4,
  v05: 25.2,
  v06: 28.9,
  v07: 34.6,
  v08: 38.45,
  v09: 41.6,
  v10: 50.7,
  v11: 55.75,
  v12: 61.0,
  v13: 73.4,
  v14: 81.0,
  v15: 87.2,
  v16: 90.35,
  v17: 95.6,
  v18: 98.85,
  v19: 102.0,
  v20: 104.5,
  v21: 108.8,
  v22: 111.85,
  v23: 114.4,
  v24: 119.9,
  v25: 123.2,
  v26: 125.6,
  v27: 128.65,
  v28: 129.45,
  v29: 130.25,
  v30: 131.05,
  v31: 134.2,
};

/**
 * Designed SFX, synthesised with ffmpeg (no samples). [time, kind, gain dB]
 * Kept sparse: the score already carries the hits.
 */
export const SFX = [
  [0.6, 'blip', -24], [1.2, 'blip', -26], [1.5, 'blip', -26], [2.9, 'tick', -22],
  [7.8, 'glitch', -22],
  [11.4, 'servo', -20],
  [15.8, 'blip', -22], [20.0, 'blip', -22],
  [29.45, 'crush', -16],
  [44.9, 'glitch', -20],
  [50.05, 'shatter', -16],
  [60.2, 'servo', -22],
  [73.0, 'blip', -20],
  [95.5, 'alarm', -18],
  [96.6, 'alarm', -20],
  [97.7, 'alarm', -22],
  [100.6, 'crush', -18],
  [108.05, 'glitch', -18],
  [128.65, 'tick', -16], [129.45, 'tick', -16], [130.25, 'tick', -16],
  [131.05, 'flash', -14],
  [133.6, 'drone', -20],
];
