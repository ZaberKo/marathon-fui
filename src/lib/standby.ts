/**
 * STAND BY lockup — the full hold-frame composition, not just the word:
 *   corner ECH tags · 2×2 checker flags left/right · pixel sigil + white bar ·
 *   two lines of micro code (anRTKL a006 LATCH / PULL ● KL2 KL4) · LINK plug pill ·
 *   the word (cuts to PLEASE and back) · a row of green garbled pixel noise ·
 *   a hazard-stripe block · tick rows with corrupted micro text above and below.
 *
 *   el.innerHTML = standbyLockup({ size: 14 });  const stop = mountStandby(el);
 *
 * All dimensions are in em, so `size` (px) scales the whole lockup.
 * Set the lockup on a solid cobalt field.
 */
import { checker, pixelSigil } from './glyphs';
import { createGlyphNoise } from './glyphNoise';
import { crispCanvas, rng, stepLoop } from './util';

export function standbyLockup(o: { size?: number; word?: string; seed?: number } = {}) {
  const seed = o.seed ?? 7;
  const ech = (pos: string) => `<span class="sb-ech sb-ech--${pos}">ECH</span>`;
  return `<div class="k-standby" style="--sb:${o.size ?? 14}px">
    <div class="sb-flag">${ech('t')}<span class="sb-chk">${checker(2, 2, { size: 64 })}</span>${ech('b')}</div>
    <div class="sb-core">
      <canvas class="sb-ticks" data-seed="${seed}"></canvas>
      <div class="sb-row">
        <div class="sb-mark"><span class="sb-sigil">${pixelSigil(seed * 3 + 1, { w: 6, h: 8, density: 0.55, sym: false, size: 64 })}</span><i class="sb-bar"></i></div>
        <div class="sb-main">
          <div class="sb-micro">
            <span>anRTKL</span><span class="sb-sm">a006</span><b>LATCH</b><span class="sb-link">LINK<i></i></span><span class="sb-inf"><i></i><i></i></span>
            <span>PULL</span><span class="sb-dot"></span><b>KL2 KL4</b>
          </div>
          <b class="sb-word">${o.word ?? 'Stand by'}</b>
          <div class="sb-foot"><canvas class="sb-garble" data-seed="${seed + 1}"></canvas><i class="sb-haz"></i></div>
        </div>
      </div>
      <canvas class="sb-ticks" data-seed="${seed + 2}"></canvas>
    </div>
    <div class="sb-flag">${ech('t')}<span class="sb-chk">${checker(2, 2, { size: 64 })}</span>${ech('b')}</div>
  </div>`;
}

/** tick row: sparse vertical ticks on the left, corrupted micro text on the right */
function ticks(canvas: HTMLCanvasElement, seed: number) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const r0 = rng(seed);
  const tickX = Array.from({ length: 6 }, (_, i) => i * 0.045 + (r0() - 0.5) * 0.01);
  const words = Array.from({ length: 5 }, () => 3 + Math.floor(r0() * 6));
  const draw = (f: number) => {
    const { w, h } = size;
    const r = rng(seed + Math.floor(f / 3));
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(canvas).color;
    tickX.forEach((x, i) => {
      if ((f + i) % 11 === 0) return;
      ctx.fillRect(Math.round(x * w), 1, 1, h - 2);
    });
    // micro "words" of 1-2 px pixel noise
    let x = Math.round(w * 0.42);
    const px = Math.max(1, Math.round(h / 6));
    words.forEach((len) => {
      for (let c = 0; c < len; c++) {
        for (let b = 0; b < 12; b++) if (r() < 0.5) ctx.fillRect(x + (b % 3) * px, 1 + Math.floor(b / 3) * px, px, px);
        x += px * 4;
      }
      x += px * 5;
    });
  };
  return { draw, dispose };
}

export function mountStandby(el: HTMLElement, { fps = 12, words = ['Stand by', 'Please'] } = {}) {
  const word = el.querySelector<HTMLElement>('.sb-word');
  const parts = [
    ...[...el.querySelectorAll<HTMLCanvasElement>('canvas.sb-garble')].map((c) => createGlyphNoise(c, Number(c.dataset.seed))),
    ...[...el.querySelectorAll<HTMLCanvasElement>('canvas.sb-ticks')].map((c) => ticks(c, Number(c.dataset.seed))),
  ];
  const dot = el.querySelector<HTMLElement>('.sb-dot');
  const stop = stepLoop(
    fps,
    (f) => {
      parts.forEach((p) => p.draw(f));
      // the word holds, then hard-cuts to the alternate for ~0.7 s
      if (word) {
        const cyc = f % Math.round(fps * 4);
        const alt = cyc >= Math.round(fps * 3.3);
        const w = alt ? words[1] : words[0];
        if (word.textContent !== w) word.textContent = w;
      }
      dot?.classList.toggle('is-off', f % 8 < 2);
    },
    el,
  );
  return () => {
    stop();
    parts.forEach((p) => p.dispose());
  };
}
