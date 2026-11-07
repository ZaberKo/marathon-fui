// Edit decision list for the film. The score is Lyria take "acidB" (128 BPM,
// beat grid anchored at 46.016 s, bar = 1.875 s), re-cut on bar lines into the
// film's structure (MUSIC.edit), with a few ducks. Times below are film seconds.
export const MUSIC = {
  file: 'scripts/.cache/music/acidB.mp3',
  gain: 0,
  // [srcStart, srcEnd, gainDb] or ['gap', seconds]
  edit: [
    [4.05, 57.266, 0], // intro → groove → memory → break → drop (runner) → … until the hush
    ['gap', 1.48], // the shot: silence
    [36.641, 46.016, -5], // broken, kick-less bed under death / psyche
    [62.891, 74.141, 0], // printing: mechanical bars ending on hits
    [74.141, 81.641, 0], // stand by (ducked) → sub boom → the world
    [81.641, 96.641, 0], // system, station drop, contour map
    [96.641, 102.266, 0], // the Authority (tension)
    [102.266, 111.641, 0], // error → signal → instance (sparse)
    [111.641, 119.141, 0], // suboptimal (break, build)
    [119.141, 134.141, 0], // defragmentation complete, ORA
    [126.641, 134.141, 0], // contract, transfer (repeat 4 bars) — hard cut on "Initiate"
  ],
  duck: [
    [26.25, 27.15, -30], // cohesion failure dropout
    [76.9, 81.1, -24], // please stand by: the score falls away
  ],
};

export const ANCHORS = {
  boom: 4.0, // first downbeat
  dip: 26.25, // dropout → passphrase / cohesion failure wall
  lift: 40.09, // last bar of the build
  runner: 41.966, // the drop → RUNNER card
  hush: 53.216, // music stops
  impact: 54.7, // the shot lands
  print: 64.07, // printing bars
  printEnd: 74.4, // last printing hit
  silence: 75.32, // stand by
  swell: 81.2, // sub boom → the system
  drop: 87.3, // the station drops runners
  survey: 92.6, // contour map of the drop zone
  hostile: 97.82, // the Authority
  error: 103.445, // alarm
  downbeat: 120.32, // defragmentation complete
  final: 142.82, // "Initiate" — the score cuts
  cut: 142.82,
  end: 147.0,
};

export const CUES = {
  v01: 4.5,
  v02: 12.3,
  v03: 17.2,
  v04: 21.3,
  v05: 23.85,
  v06: 31.8,
  v07: 42.1,
  v08: 45.4,
  v09: 55.4,
  v10: 59.8,
  v11: 64.6,
  v12: 75.8,
  v13: 81.6,
  v14: 87.7,
  v15: 92.9,
  v16: 98.1,
  v17: 103.6,
  v18: 106.9,
  v19: 109.9,
  v20: 113.1,
  v21: 116.9,
  v22: 121.0,
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

/**
 * Designed SFX, synthesised with ffmpeg (no samples). [time, kind, gain dB]
 */
export const SFX = [
  [0.6, 'blip', -24], [1.2, 'blip', -26], [1.5, 'blip', -26], [2.9, 'tick', -22],
  [7.8, 'glitch', -22],
  [11.9, 'servo', -22],
  [16.6, 'blip', -22], [20.8, 'blip', -22],
  [26.2, 'crush', -14],
  [53.2, 'glitch', -18],
  [54.7, 'impact', -8], [54.72, 'shatter', -15],
  [64.2, 'servo', -22],
  [75.6, 'blip', -20],
  [103.45, 'alarm', -18], [104.55, 'alarm', -20], [105.65, 'alarm', -22],
  [108.6, 'crush', -18],
  [120.32, 'glitch', -16],
  [140.85, 'tick', -16], [141.5, 'tick', -16], [142.15, 'tick', -16],
  [141.62, 'flash', -12],
  [142.86, 'whoosh', -10],
  [144.0, 'drone', -20],
];
