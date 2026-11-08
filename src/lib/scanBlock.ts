export const SCAN_BLOCK = { width: 162, height: 60, fps: 12, steps: 26 } as const;

const CELL = 3;
const COLS = SCAN_BLOCK.width / CELL;
const ROWS = SCAN_BLOCK.height / CELL;
const SEAM = [0, 0, 2, 3, 4, 4, 5, 5, 5, 5, 4, 4, 3, 2, 2, 3, 4, 4];
const GAPS = [[7, -1], [8, 0], [10, -1], [12, -3], [13, -2], [14, -1]] as const;
const frames: { plate: string; signal: string }[] = [];

/** Step horizontal bands across a shared seam, leaving transparent cells at the break. */
export function scanBlockFrame(frame: number) {
  const step = Math.max(0, Math.floor(frame)) % SCAN_BLOCK.steps;
  if (frames[step]) return frames[step];

  const drop = step < 2 ? step : step === 17 ? 3 : 2;
  const sweep = 2 + (step * 2) % (COLS - 2);
  const tick = Math.floor(step / 3) * 6 % (COLS - 4);
  const paths = { plate: '', signal: '' };

  for (let row = 0; row < ROWS; row++) {
    const seam = 31 + (SEAM[row] ?? 0);
    const missing = GAPS.find(([y]) => y === row)?.[1];
    const punctures = drop > 0 && row === 8 + drop;
    const inkAt = (col: number): keyof typeof paths | undefined => {
      if (col === COLS) return;
      if (row === ROWS - 1) return col >= tick && col < tick + 4 ? 'signal' : 'plate';
      const right = col >= seam;
      const sourceRow = row - (right ? drop : 0);
      if (sourceRow < 1 || sourceRow > 15) return;
      if (right && sourceRow < 6) return;
      if ((sourceRow === 3 || sourceRow === 5) && col < seam - 4) return;
      if (drop && missing !== undefined && col === seam + missing) return;
      if (punctures && right && col % 2 === 0) return;
      if ((row === 8 && col >= 15 && col < 24) || (row === 15 && col >= 43 && col < 48)) return;
      return col === sweep || (right && col === sweep + 1) ? 'signal' : 'plate';
    };
    let start = 0;
    let ink = inkAt(0);
    for (let col = 1; col <= COLS; col++) {
      const next = inkAt(col);
      if (next === ink) continue;
      if (ink) {
        const width = (col - start) * CELL;
        paths[ink] += `M${start * CELL} ${row * CELL}h${width}v${CELL}h-${width}z`;
      }
      start = col;
      ink = next;
    }
    if (inkAt(0) === 'plate' && row < ROWS - 1) {
      paths.signal += `M0 ${row * CELL}h1.5v${CELL}H0z`;
    }
  }
  frames[step] = paths;
  return paths;
}
