import { crispCanvas, rng } from './util';

/** Corrupted 5 × 7 glyphs with gaps between runs and a scatter of low pixels. */
export function createGlyphNoise(canvas: HTMLCanvasElement, seed: number) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const random = rng(seed);
  const roll = () => ({ on: random() > 0.28, bits: Array.from({ length: 35 }, () => random() < 0.48) });
  let slots: ReturnType<typeof roll>[] = [];

  const draw = (frame: number) => {
    const { w, h } = size;
    const pixel = Math.max(1, Math.round(h / 9));
    const stride = pixel * 6;
    const count = Math.floor(w / stride);
    if (slots.length !== count) slots = Array.from({ length: count }, roll);
    for (let k = 0; count > 0 && k < 3; k++) slots[Math.floor(random() * count)] = roll();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(canvas).color;
    slots.forEach((slot, i) => {
      if (!slot.on || (i + Math.floor(frame / 6)) % 9 === 0) return;
      slot.bits.forEach((on, bit) => {
        if (on) ctx.fillRect(i * stride + (bit % 5) * pixel, Math.floor(bit / 5) * pixel, pixel, pixel);
      });
    });
    for (let x = 0; x < w; x += pixel) {
      if (random() < 0.12) ctx.fillRect(x, 8 * pixel, pixel, pixel);
    }
  };
  return { draw, dispose };
}
