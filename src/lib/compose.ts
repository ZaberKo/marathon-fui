/**
 * Composite blocks built from primitives (HTML string builders + behaviour).
 */
import { scramble } from './motion';
import { stepLoop } from './util';

/**
 * Text wall: stacked rows of repeated outline words scrolling in alternate
 * directions; one solid "hot" row carries the message.
 *   textWall({ word: 'PASSPHRASE_', hot: 'COHESION_FAIL_', rows: 5 })
 */
export function textWall({ word = 'PASSPHRASE_', hot = 'COHESION_', hotFill = 'FAIL_', rows = 5, hotRow = 2, dur = 18 } = {}) {
  const row = (i: number) => {
    const isHot = i === hotRow;
    const unit = isHot
      ? `<span><em>${hotFill}</em><em>${hotFill}</em><b data-hot>${hot}</b><em>${hotFill}</em></span>`
      : `<span>${word.repeat(3)}</span>`;
    return `<div class="k-textwall__row ${isHot ? 'is-hot' : ''}"><div class="k-marquee ${i % 2 ? 'k-marquee--rev' : ''}" style="--dur:${dur + i * 3}s;--marq-steps:${(dur + i * 3) * 8}"><div class="k-marquee__track">${unit.repeat(6)}</div></div></div>`;
  };
  return `<div class="k-textwall" aria-hidden="true">${Array.from({ length: rows }, (_, i) => row(i)).join('')}</div>`;
}

/** Periodically re-decode the hot word(s) of a text wall between variants. */
export function animateTextWall(wall: HTMLElement, variants: string[], everyMs = 2400) {
  let k = 0;
  const hots = Array.from(wall.querySelectorAll<HTMLElement>('[data-hot]'));
  return stepLoop(1000 / everyMs, () => {
    k = (k + 1) % variants.length;
    hots.forEach((h) => scramble(h, variants[k], { duration: 0.35 }));
  }, wall);
}
