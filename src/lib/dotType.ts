/**
 * Capsule dot-matrix type: a 5 × 7 bitmap font where each horizontal run of
 * lit pixels is drawn as one pill and a single pixel as a round dot. This is
 * the rounded LED lettering on the reference lockups, not a square pixel face.
 *
 *   el.innerHTML = capsuleText('T-04:32', { size: 160 });   // SVG string
 *   paintCapsules(ctx, 'LAUNCH', x, y, px, ink);             // canvas
 */

/* prettier-ignore */
const FONT: Record<string, string> = {
  '0': '.###.#...##..###.#.###..##...#.###.', '1': '..#...##....#....#....#....#...###.',
  '2': '.###.#...#....#...#...#...#...#####', '3': '####.....#....#.###.....#....#####.',
  '4': '...#...##..#.#.#..#.#####...#....#.', '5': '######....####.....#....##...#.###.',
  '6': '..##..#...#....####.#...##...#.###.', '7': '#####....#...#...#...#....#....#...',
  '8': '.###.#...##...#.###.#...##...#.###.', '9': '.###.#...##...#.####....#...#..##..',
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.',
  C: '.###.#...##....#....#....#...#.###.', D: '####.#...##...##...##...##...#####.',
  E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#',
  I: '.###...#....#....#....#....#...###.', J: '..###...#....#....#....##..#..##...',
  K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...##...###..##.#.##..###...##...#',
  O: '.###.#...##...##...##...##...#.###.', P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.', V: '#...##...##...##...##...#.#.#...#..',
  W: '#...##...##...##.#.##.#.##.#.#.#.#.', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
  ':': '.......#....#.........#....#.......', '-': '................###................',
  '/': '....#....#...#...#...#...#....#....', '.': '..........................##...##..',
  '_': '..............................#####', ' ': '...................................',
  '+': '.......#....#..#####..#....#.......', '%': '##..###..#...#...#...#...#..###..##',
  '#': '.#.#..#.#.#####.#.#.#####.#.#..#.#.',
};

const glyph = (ch: string) => (FONT[ch] ?? FONT[' ']).padEnd(35, '.');

/** pills for one text line: [x, y, w] in pixel units (h = 1) */
export function capsuleRuns(text: string, tracking = 1) {
  const runs: [number, number, number][] = [];
  [...text.toUpperCase()].forEach((ch, i) => {
    const g = glyph(ch);
    const ox = i * (5 + tracking);
    for (let y = 0; y < 7; y++) {
      let x = 0;
      while (x < 5) {
        if (g[y * 5 + x] !== '#') {
          x++;
          continue;
        }
        const start = x;
        while (x < 5 && g[y * 5 + x] === '#') x++;
        runs.push([ox + start, y, x - start]);
      }
    }
  });
  return runs;
}

export const capsuleWidth = (text: string, tracking = 1) => Math.max(0, text.length * (5 + tracking) - tracking);

/** SVG string; `size` is the rendered width in px */
export function capsuleText(text: string, { size, tracking = 1, cls = '' }: { size?: number; tracking?: number; cls?: string } = {}) {
  const w = capsuleWidth(text, tracking);
  const pills = capsuleRuns(text, tracking)
    .map(([x, y, n]) => `<rect x="${x + 0.1}" y="${y + 0.1}" width="${n - 0.2}" height="0.8" rx="0.4"/>`)
    .join('');
  return `<svg class="k-capsule ${cls}" viewBox="0 0 ${w} 7" width="${size ?? w * 6}" fill="currentColor" aria-label="${text}" role="img">${pills}</svg>`;
}

/** canvas painter; (x, y) is the top-left, px the pixel pitch */
export function paintCapsules(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, ink: string, tracking = 1) {
  ctx.fillStyle = ink;
  ctx.beginPath();
  for (const [rx, ry, n] of capsuleRuns(text, tracking)) {
    ctx.roundRect(x + (rx + 0.1) * px, y + (ry + 0.1) * px, (n - 0.2) * px, 0.8 * px, 0.4 * px);
  }
  ctx.fill();
}
