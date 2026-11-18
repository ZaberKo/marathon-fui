import { loadFonts } from '../graphics/draw';
import { H, W, type C2 } from '../graphics/frame';
import { ASSERT_DURATION, assertionDial, protocolDial } from '../graphics/rings';
import { BUFFER_LOAD_DURATION, BUFFER_LOCK_DURATION, bufferTracks } from '../graphics/buffer-tracks';
import { completionDial } from '../graphics/completion-dial';
import type { GL } from '../three/frame-renderer';
import { $, $$, bag, on } from '../lib/util';
import { section, spec } from './_ui';

type Dial = {
  code: string;
  title: string;
  shots: string;
  api: string;
  duration: number;
  still: number;
  note: string;
  paint: 'buffer' | ((ctx: C2, elapsed: number) => void);
};

// The kit holds the camera still: axis, radius and framing stay put; motion lives in the wheel.
const KIT = { fixed: true } as const;
// Preview timings are authored here so edits to the film do not retime the demos.
const BUFFER_PREVIEW = { ...KIT, countAt: 1.17 };
const protocolDuration = 6;
const returnAt = BUFFER_LOAD_DURATION + BUFFER_LOCK_DURATION;
const bufferReturnDuration = 3.8199;
const completionDuration = 6.08;
const DIAL_GROUPS: readonly (readonly Dial[])[] = [
  [{ code: 'RD-01', title: 'Defrag protocol', shots: 'S02', api: 'protocolDial()', duration: protocolDuration, still: 4.1,
    note: 'Three metal rings counter-rotate as their read heads sweep. The plates expand along the same axis and lock into cobalt and green tracks.',
    paint: (ctx, elapsed) => protocolDial(ctx, elapsed, protocolDuration, { ringIntro: true, fixed: true }) }],
  [{ code: 'RD-02', title: 'Liminal buffer', shots: 'S06 · S21', api: 'createBufferDial(KIT)', duration: returnAt + bufferReturnDuration, still: 5.5,
    note: 'Load to 26%, seat the red lock and yellow insert, then return at 100% and break the tracks apart.',
    paint: 'buffer' }],
  [
    { code: 'RD-03', title: 'Subject assertion', shots: 'S07', api: "assertionDial('subject')", duration: ASSERT_DURATION.subject, still: 1.18,
      note: 'A red plate and a cobalt scan move against each other behind the ASSERT register.',
      paint: (ctx, elapsed) => assertionDial(ctx, 'subject', elapsed, KIT) },
    { code: 'RD-04', title: 'Loss register', shots: 'S10', api: "assertionDial('loss')", duration: ASSERT_DURATION.loss, still: 1.28,
      note: 'A cropped wheel turns against a vertical diagnostic feed. The film lifts the pair out; the kit holds frame.',
      paint: (ctx, elapsed) => assertionDial(ctx, 'loss', elapsed, KIT) },
    { code: 'RD-05', title: 'Print queues', shots: 'S12', api: "assertionDial('print')", duration: ASSERT_DURATION.print, still: 1.35,
      note: 'The hold and print registers drive two cropped wheels in opposite directions.',
      paint: (ctx, elapsed) => assertionDial(ctx, 'print', elapsed, KIT) },
  ],
  [{ code: 'RD-06', title: 'Completion relay', shots: 'S21', api: 'completionDial()', duration: completionDuration, still: 2.8,
    note: 'The lime relay sheds its teeth while the radial print grows under the flying chips. The print merges to bone, then flips to the ORA ring in whole wedges.',
    paint: (ctx, elapsed) => completionDial(ctx, elapsed, completionDuration, KIT) }],
];

function mountDial(card: HTMLElement, group: readonly Dial[], fonts: Promise<void>) {
  const b = bag();
  const player = $('[data-dial]', card);
  const view = $('.tel-dial__view', player);
  const ink = $<HTMLCanvasElement>('.tel-dial__ink', player).getContext('2d')!;
  const toggle = $<HTMLButtonElement>('[data-dial-play]', player);
  const replay = $<HTMLButtonElement>('[data-dial-replay]', player);
  const slider = $<HTMLInputElement>('[data-dial-seek]', player);
  const readout = $('[data-dial-time]', player);
  const modes = $$<HTMLButtonElement>('[data-dial-mode]', player);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [ink];
  let dial = group[0];
  let playing = !motion.matches;
  let elapsed = playing ? 0 : dial.still;
  let visible = false;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let gl: GL | null = null;
  let loadPortrait: (() => Promise<void>) | undefined;
  let drawBuffer: ((time: number) => void) | undefined;

  if (dial.paint === 'buffer') {
    const bg = $<HTMLCanvasElement>('.tel-dial__field', view).getContext('2d')!;
    const host = $('.tel-dial__portrait', view);
    layers.unshift(bg);
    let tracks = bufferTracks(BUFFER_PREVIEW);
    loadPortrait = async () => {
      loadPortrait = undefined;
      try {
        const [{ createBufferDial }, { createGL }] = await Promise.all([
          import('../three/buffer-portrait'),
          import('../three/frame-renderer'),
        ]);
        if (disposed) return;
        const [model, renderer] = await Promise.allSettled([
          createBufferDial(BUFFER_PREVIEW),
          createGL(host, quality(), 'BUFFER DIAL'),
        ]);
        const portrait = model.status === 'fulfilled' ? model.value : null;
        const device = renderer.status === 'fulfilled' ? renderer.value : null;
        if (disposed || !portrait || !device) {
          portrait?.dispose();
          device?.dispose();
          return;
        }
        tracks = portrait;
        gl = device;
        b.add(() => portrait.dispose());
        b.add(() => device.dispose());
        fit();
      } catch (error) {
        if (!disposed) console.warn('[data] Buffer portrait unavailable', error);
      }
    };
    drawBuffer = (t) => {
      const frame = { bg, fg: ink, t, three: null };
      if (t < BUFFER_LOAD_DURATION) tracks.load(frame);
      else if (t < returnAt) tracks.lock(frame, t - BUFFER_LOAD_DURATION);
      else tracks.resume(frame, t - returnAt, bufferReturnDuration);
      gl?.render(frame.three);
    };
  }

  function paintFrame() {
    for (const ctx of layers) {
      ctx.setTransform(ctx.canvas.width / W, 0, 0, ctx.canvas.height / H, 0, 0);
      ctx.clearRect(0, 0, W, H);
    }
    const time = Math.min(elapsed, dial.duration - 0.001);
    if (dial.paint === 'buffer') drawBuffer?.(time);
    else dial.paint(ink, time);
    slider.value = String(elapsed);
    readout.textContent = `${elapsed.toFixed(1)} / ${dial.duration.toFixed(1)} S`;
  }

  function quality() {
    return Math.min(0.8, ink.canvas.width / W);
  }

  function fit() {
    const width = Math.max(1, Math.round(view.clientWidth * Math.min(devicePixelRatio, 2)));
    const height = Math.max(1, Math.round(width * H / W));
    for (const { canvas } of layers) {
      if (canvas.width === width && canvas.height === height) continue;
      canvas.width = width;
      canvas.height = height;
    }
    if (gl && gl.quality !== quality()) gl.setQuality(quality());
    paintFrame();
  }

  const tick = (now: number) => {
    if (!last) last = now;
    const dt = now - last;
    if (dt >= 32) {
      last = now;
      elapsed = (elapsed + dt / 1000) % dial.duration;
      paintFrame();
    }
    raf = requestAnimationFrame(tick);
  };

  function syncClock() {
    if (playing && visible && !document.hidden) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
    toggle.textContent = playing ? 'Pause' : 'Play';
  }

  if (modes.length) {
    const transport = $('.tel-dial__transport', player);
    const api = $('.spec-head .cls', card);
    const note = $('.spec-foot', card);
    modes.forEach((button, index) => b.add(on(button, 'click', () => {
      const next = group[index];
      if (dial === next) return;
      dial = next;
      elapsed = motion.matches && !playing ? dial.still : 0;
      last = 0;
      modes.forEach((mode) => mode.setAttribute('aria-pressed', String(mode === button)));
      api.textContent = dial.api;
      note.textContent = dial.note;
      transport.setAttribute('aria-label', `${dial.title} playback`);
      slider.setAttribute('aria-label', `${dial.title} time in seconds`);
      slider.max = String(dial.duration);
      paintFrame();
    })));
  }

  b.add(on(toggle, 'click', () => {
    if (!playing && elapsed >= dial.duration) elapsed = 0;
    playing = !playing;
    syncClock();
  }));
  b.add(on(replay, 'click', () => {
    elapsed = 0;
    playing = true;
    paintFrame();
    syncClock();
  }));
  b.add(on(slider, 'input', () => {
    elapsed = slider.valueAsNumber;
    playing = false;
    paintFrame();
    syncClock();
  }));
  b.add(on(motion, 'change', () => {
    if (!motion.matches) return;
    elapsed = dial.still;
    playing = false;
    paintFrame();
    syncClock();
  }));
  b.add(on(document, 'visibilitychange', syncClock));
  const visibility = new IntersectionObserver(([entry]) => {
    if (disposed) return;
    visible = entry.isIntersecting;
    if (visible) void loadPortrait?.();
    syncClock();
  });
  visibility.observe(view);
  const resize = new ResizeObserver(fit);
  resize.observe(view);
  fit();
  syncClock();
  void fonts.then(() => { if (!disposed) paintFrame(); });
  b.add(() => {
    disposed = true;
    cancelAnimationFrame(raf);
    visibility.disconnect();
    resize.disconnect();
  });
  return b.dispose;
}

export function radialSequences() {
  return `
    ${section('Radial sequences', 'PLAY · REPLAY · SCRUB')}
    <div class="spec-grid tel-gallery">
      ${DIAL_GROUPS.map((group) => {
        const dial = group[0];
        const grouped = group.length > 1;
        return spec({
          code: grouped ? 'RD-03–05' : `${dial.code} · ${dial.shots}`,
          title: grouped ? 'Assertion registers' : dial.title,
          cls: dial.api,
          bodyCls: 'spec-body--flush',
          body: `<div class="tel-dial" data-dial>
            ${grouped ? `<div class="k-seg-ctl tel-dial__modes" role="group" aria-label="Assertion sequence">
              ${group.map((mode, i) => `<button type="button" data-dial-mode aria-pressed="${i === 0}">
                <span>${mode.code} · ${mode.shots}</span><span>${mode.title}</span>
              </button>`).join('')}
            </div>` : ''}
            <div class="tel-dial__view" aria-hidden="true">
              ${dial.paint === 'buffer' ? '<canvas class="tel-dial__field"></canvas><div class="tel-dial__portrait"></div>' : ''}
              <canvas class="tel-dial__ink"></canvas>
            </div>
            <div class="tel-dial__transport" role="group" aria-label="${dial.title} playback">
              <button type="button" class="k-btn k-btn--sm" data-dial-play>Play</button>
              <button type="button" class="k-btn k-btn--sm" data-dial-replay>Replay</button>
              <input type="range" aria-label="${dial.title} time in seconds" min="0" max="${dial.duration}" step="0.033" value="0" data-dial-seek>
              <span class="t-micro" data-dial-time aria-hidden="true"></span>
            </div>
          </div>`,
          foot: dial.note,
        });
      }).join('')}
    </div>`;
}

export function mountRadialSequences(root: HTMLElement) {
  const b = bag();
  const fonts = loadFonts();
  $$('.tel-gallery .spec', root).forEach((card, i) => b.add(mountDial(card, DIAL_GROUPS[i], fonts)));
  return b.dispose;
}
