import gsap from 'gsap';
import { ROUTES } from '../routes';
import { checker, pixelIcon, pixelSigil, barcode, locator } from '../lib/glyphs';
import { mountDefragRing } from '../lib/hud';
import { hydrate } from '../lib/hydrate';
import { flashBlocks, reveal, scramble, typeOut } from '../lib/motion';
import { bag, pad } from '../lib/util';
import { mountGL } from './_gl';

const DESC: Record<string, string> = {
  type: 'Grotesque display, mono micro-copy, pixel face. Rotated, cropped, outlined. Kinetic decode.',
  signal: 'Black field + flat signal colours. Colour is state, not decoration. Theme flips.',
  controls: 'Buttons, switches, sliders, fields, tabs, steppers, progress — all stepped.',
  glyphs: 'Pixel icons, sigils, locators, barcodes, connectors, patterns. SVG generators.',
  telemetry: 'Defrag rings, orbit charts, spectra, gauges, memory grids, logs, trackers.',
  motion: 'Stepped easing, hard cuts, glitch slices, block flashes, wipes, marquees.',
  spatial: 'WebGPU scenes: slice-line figures, neural voxels, bar-field planets, CAD bays.',
  fault: 'Runtime-error state: red inversion, alarm grid, error marquee, recovery.',
  study: 'SHELL 07 — a 2-minute web film built from the kit: score, AI voice, generated 3D, seekable timeline.',
};

export default function mount(root: HTMLElement) {
  const b = bag();
  const micro = Array.from({ length: 6 }, (_, i) => `<span>${pad(35 + i, 2)} K ${pad(35 - i, 2)} UV</span>`).join('');

  root.innerHTML = `
  <section class="page page--boot">
    <div class="boot-hero">
      <div class="boot-left">
        <div class="boot-vert" data-boot="vert">INITIATING</div>
        <div class="boot-micro t-micro">${micro}</div>
        <div class="boot-blocks" data-state="nominal"><span data-mark="scanblock" data-size="104"></span></div>
        <div class="c-acid"><span data-mark="checker" data-cols="3" data-rows="2" data-size="42" data-mode="invert"></span></div>
      </div>

      <div class="boot-stage">
        <div class="gl-host" id="boot-gl"></div>
        <span class="boot-corner tl">${checker(2, 2, { size: 18 })}</span>
        <span class="boot-corner tr">${checker(2, 2, { size: 18, invert: true })}</span>
        <span class="boot-corner bl">${checker(2, 2, { size: 18, invert: true })}</span>
        <span class="boot-corner br">${checker(2, 2, { size: 18 })}</span>
        <div class="boot-stage__hud t-micro">
          <span>SHELL INTEGRITY CHECK</span>
          <span class="c-acid" id="boot-int">000%</span>
        </div>
        <div class="boot-stage__foot t-micro">
          <span>${barcode(12, { size: 90, h: 12 })}</span>
          <span>GPU <b class="c-acid" id="boot-backend">—</b></span>
          <span>STEP 12FPS</span>
        </div>
      </div>

      <div class="boot-right">
        <div class="t-micro">GRAPHIC REALISM / INTERFACE LIBRARY / REV 0.1</div>
        <h1 class="boot-title" data-boot="title">RUNTIME<br><span class="t-outline">//KIT</span></h1>
        <div class="boot-sub">
          <span class="c-acid">${pixelSigil(7, { w: 5, h: 5, size: 26 })}</span>
          <p>A reusable set of FUI elements in a neo-brutalist, machine-vision idiom.
          Swiss grid, flat acid colour, vector tech marks, stepped motion.</p>
        </div>
        <div class="boot-log" id="boot-log"></div>
        <div class="k-meter">
          <div class="k-meter__row"><span>LOADING MEMORY</span><b id="boot-pct">000</b></div>
          <div class="k-progress k-progress--tall" id="boot-bar" style="--p:0%"></div>
        </div>
        <div class="boot-links">
          <span class="c-lime" data-state="cobalt" data-mark="link" data-cols="4" data-rows="1" data-size="200" data-fps="8"></span>
          <span class="c-acid" data-mark="chevrons" data-count="6" data-size="84"></span>
          <span class="c-bone" data-mark="barcode" data-size="150" data-bars="28" data-seed="12"></span>
        </div>
        <div class="boot-ringrow">
          <div class="boot-ring"><canvas id="boot-ring"></canvas><span class="t-pixel">DEFRAG</span></div>
          <div class="boot-ready">
            <span class="k-tag k-tag--dot k-tag--blink" id="boot-status">STAND BY</span>
            <a class="k-btn k-btn--solid k-btn--notch" href="#/controls" data-scramble-hover>
              <span data-label>ENTER LIBRARY</span><span class="k-btn__ico">${pixelIcon('arrow-r', { size: 14 })}</span>
            </a>
            <span class="c-cobalt">${locator({ size: 28 })}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="k-band boot-band k-dotscreen" style="--ds:16px"><div class="k-marquee" style="--dur:24s"><div class="k-marquee__track">${'<span>STAND BY ▚ LINK ESTABLISHED ▚ TRANSFER WINDOW OPEN ▚ </span>'.repeat(6)}</div></div></div>

    <h2 class="section-label">Module index <span class="t-micro">09 DEMO SURFACES / ALL COMPONENTS REUSABLE</span></h2>
    <div class="boot-index">
      ${ROUTES.slice(1)
        .map(
          (r) => `
        <a class="k-cta" href="#/${r.id}">
          <span class="k-cta__code">${r.num} / ${r.code}</span>
          <span class="k-cta__meta">${DESC[r.id] ?? ''}</span>
          <span class="k-cta__label">${r.label}</span>
          <span class="k-cta__arrow">${pixelIcon('chevron-2', { size: 20 })}</span>
        </a>`,
        )
        .join('')}
    </div>
  </section>`;

  b.add(hydrate(root));
  b.add(mountDefragRing(root.querySelector('#boot-ring')!, { rings: 3, inner: 0.42, cell: 8 }));

  // 3D hero
  b.add(
    mountGL(root.querySelector('#boot-gl')!, async (host) => {
      const m = await import('../three/scenes/runner');
      const h = await m.mountRunner(host, { fps: 12 });
      root.querySelector('#boot-backend')!.textContent = h.stage.backend;
      return h;
    }),
  );

  // boot sequence
  const log = root.querySelector<HTMLElement>('#boot-log')!;
  const lines = [
    '> assert shell.integrity',
    '> mount neural.subroutines [07/07]',
    '> liminal buffer status :: STABLE',
    '> evaluate motor.cortex mapping',
    '> handshake LINK-07 :: OK',
  ];
  let alive = true;
  b.add(() => (alive = false));
  const bar = root.querySelector<HTMLElement>('#boot-bar')!;
  const pct = root.querySelector<HTMLElement>('#boot-pct')!;
  const integ = root.querySelector<HTMLElement>('#boot-int')!;
  const status = root.querySelector<HTMLElement>('#boot-status')!;

  (async () => {
    flashBlocks(root.querySelector('.boot-hero')!, { frames: 7, count: 18 });
    reveal(root.querySelector<HTMLElement>('[data-boot="vert"]')!, { from: 'bottom', steps: 8, duration: 0.5 });
    reveal(root.querySelector<HTMLElement>('[data-boot="title"]')!, { from: 'left', steps: 5, duration: 0.4 });
    const o = { p: 0 };
    gsap.to(o, {
      p: 100,
      duration: 3.2,
      ease: 'steps(24)',
      onUpdate: () => {
        bar.style.setProperty('--p', `${o.p}%`);
        pct.textContent = pad(o.p, 3);
        integ.textContent = `${pad(Math.min(97, o.p), 3)}%`;
      },
    });
    for (const l of lines) {
      if (!alive) return;
      const d = document.createElement('div');
      log.appendChild(d);
      await typeOut(d, l, { cps: 60 });
    }
    if (!alive) return;
    status.classList.remove('k-tag--blink');
    status.classList.add('k-tag--solid');
    scramble(status, 'READY', { duration: 0.3 });
  })();

  return b.dispose;
}
