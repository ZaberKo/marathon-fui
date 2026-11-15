/**
 * INITIATING signal tear (TC-01): vertical condensed type beside torn cobalt
 * signal bands, micro rows and a dim data block. The plate is the shared
 * scanBlockFrame(); four raster slices shift at 12 fps and one drops out.
 *
 *   el.innerHTML = initiatingLockup();
 *   const stop = mountInitiatingLoop(el);         // loops while visible
 *
 * Use the full lockup wherever the scan block appears. The plate alone does
 * not carry the composition.
 */
import { SCAN_BLOCK, scanBlockFrame } from './scanBlock';
import { $, $$, stepLoop } from './util';

const INIT_SLICES = [[0, 12], [12, 27], [27, 42], [42, SCAN_BLOCK.height]] as const;
const INIT_SHIFTS = [
  0, 0, 2, 5, -3, 0, 0, 3, 6, 2, -4, -2, 0,
  0, 3, -6, -2, 4, 2, 0, 0, -3, 3, 0, 0, 0,
] as const;
let nextId = 0;

export function initiatingLockup({ word = 'INITIATING', label = 'Initiating, vertical type beside torn cobalt signal bands' } = {}) {
  const id = `init-${++nextId}`;
  const clips = INIT_SLICES.map(([start, end], i) =>
    `<clipPath id="${id}-slice-${i}"><rect x="-9" y="${start}" width="${SCAN_BLOCK.width + 18}" height="${end - start}"/></clipPath>`,
  ).join('');
  const slices = INIT_SLICES.map((_, i) => `<g clip-path="url(#${id}-slice-${i})"><use href="#${id}-ink" data-init-slice/></g>`).join('');
  return `<svg class="k-initiating" viewBox="0 0 620 300" role="img" aria-label="${label}">
      <defs>
        ${clips}
        <g id="${id}-ink">
          <path class="k-initiating__plate" data-init-plate/>
          <path class="k-initiating__signal" data-init-signal/>
        </g>
      </defs>
      <path class="k-initiating__signal" d="M206 33h15v3h-15z M206 45h15v3h-15z M221 39h15v3h-15z M236 33h15v3h-15z M236 45h15v3h-15z M257 31h12v12h-12z M269 43h12v12h-12z"/>
      <text class="k-initiating__data" x="46" y="83">3S K  3S K  3S K</text>
      <text class="k-initiating__data" x="46" y="96">3S UV 3S UV 3S UV</text>
      <path class="k-initiating__dim" d="M46 128h102v2H46z M48 135h68v3H48z M53 145h95v2H53z M46 153h49v4H46z M82 164h66v2H82z M46 172h36v2H46z M86 179h21v3H86z M46 190h102v1H46z"/>
      <text class="k-initiating__data" x="46" y="218">KL2 KL4 · R/W 0X3F</text>
      <text class="k-initiating__title" transform="translate(180 72) rotate(90)" data-init-title>${word}</text>
      <g transform="translate(230 70) scale(2.3)">${slices}</g>
      <text class="k-initiating__data" x="230" y="230">SDR37 2445 · QR EXC FF</text>
    </svg>`;
}

export const INITIATING_DURATION = SCAN_BLOCK.steps / SCAN_BLOCK.fps;

/** paint one frame (0 … SCAN_BLOCK.steps); the last frame is the resting state */
export function initiatingPainter(root: HTMLElement | SVGElement) {
  const plate = $<SVGPathElement>('[data-init-plate]', root as HTMLElement);
  const signal = $<SVGPathElement>('[data-init-signal]', root as HTMLElement);
  const title = $<SVGTextElement>('[data-init-title]', root as HTMLElement);
  const slices = $$<SVGUseElement>('[data-init-slice]', root as HTMLElement);
  let last = -1;
  return (frame: number) => {
    if (frame === last) return;
    last = frame;
    const ink = scanBlockFrame(frame);
    plate.setAttribute('d', ink.plate);
    signal.setAttribute('d', ink.signal);
    const shift = INIT_SHIFTS[frame] ?? 0;
    const offsets = [-shift * 0.5, shift, -shift, shift * 0.5];
    slices.forEach((slice, i) => {
      slice.setAttribute('transform', `translate(${offsets[i]} 0)`);
      slice.setAttribute('opacity', i === 2 && (frame === 8 || frame === 15) ? '0' : '1');
    });
    title.classList.toggle('is-outline', frame === 2 || frame === 3 || frame === 9);
  };
}

/** loop: play the tear, hold the resting frame, repeat */
export function mountInitiatingLoop(el: HTMLElement, { hold = 1.6 } = {}) {
  const paint = initiatingPainter(el);
  const steps = SCAN_BLOCK.steps;
  const cycle = steps + Math.round(hold * SCAN_BLOCK.fps);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paint(11);
    return () => {};
  }
  return stepLoop(SCAN_BLOCK.fps, (f) => {
    const k = f % cycle;
    paint(k < steps ? k : 11);
  }, el);
}
