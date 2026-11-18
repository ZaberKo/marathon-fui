import { ROUTES } from '../routes';
import { icon } from '../lib/icons';
import { checker, emblem, barcode, locator } from '../lib/glyphs';
import { initiatingLockup } from '../lib/initiating';
import { hydrate } from '../lib/hydrate';
import { countTo, reveal, scramble, typeOut } from '../lib/motion';
import { bag, pad } from '../lib/util';
import { mountGL } from './_gl';

const DESC: Record<string, string> = {
  type: 'Wide grotesque cropped by the frame, mono micro-copy as texture, capsule dot readouts, the INITIATING tear, the ORA build.',
  colour: 'Black field, flat inks, colour as state. Gradients only as dither.',
  marks: 'Vectorheart icons and emblems, live marks, register patterns. Solid geometry, no small bitmaps.',
  interface: 'A playable in-game menu built from the marks: shell select, vault, armory, relay tracks, contracts; then the components.',
  data: 'The film dials on a fixed camera, and the board: pixel map with live times, capsule countdown, terminal, factions.',
  fields: 'Full-field posters, the runtime-error state, wide animated strips, transitions and marquees.',
  spatial: 'WebGPU scenes drafted as contours, dither and wire: slice-line figures, voxels, bar-field planets.',
  study: 'SHELL 07 — the study in a browser film with a score, synthetic narration and a seekable timeline.',
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
        <div class="t-micro">GRAPHIC REALISM / 2D ART STUDY / REV 0.3</div>
        <h1 class="boot-title" data-boot="title">MARATHON<br><span class="t-outline">//ART</span></h1>
        <div class="boot-sub">
          <span class="c-acid">${emblem(7, { size: 26 })}</span>
          <p>A study of the graphic-realism 2D idiom: Vectorheart marks on a Swiss grid,
          flat high-contrast inks on black. No chrome, no gloss, no gradients. Readouts step; tracks travel.</p>
        </div>
        <div class="boot-log" id="boot-log"></div>
        <div class="boot-links">
          <span class="c-lime" data-state="cobalt" data-mark="link" data-cols="4" data-rows="1" data-size="200" data-fps="8"></span>
          <span class="c-acid" data-mark="chevrons" data-count="6" data-size="84"></span>
          <span class="c-bone" data-mark="barcode" data-size="150" data-bars="28" data-seed="12"></span>
        </div>
        <div class="boot-ringrow">
          <div class="boot-init" data-initiating>${initiatingLockup()}</div>
          <div class="boot-ready">
            <span class="k-tag k-tag--dot k-tag--blink" id="boot-status">STAND BY</span>
            <a class="k-btn k-btn--solid k-btn--notch" href="#/type" data-scramble-hover>
              <span data-label>ENTER LIBRARY</span><span class="k-btn__ico">${icon('arrow-r', { size: 14 })}</span>
            </a>
            <span class="c-cobalt">${locator({ size: 28 })}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="k-band boot-band"><div class="k-marquee" style="--dur:24s"><div class="k-marquee__track">${'<span>STAND BY ▚ LINK ESTABLISHED ▚ TRANSFER WINDOW OPEN ▚ </span>'.repeat(6)}</div></div></div>

    <h2 class="section-label">Module index <span class="t-micro">09 DEMO SURFACES / ALL COMPONENTS REUSABLE</span></h2>
    <div class="boot-index">
      ${ROUTES.slice(1)
        .map(
          (r) => `
        <a class="k-cta" href="#/${r.id}">
          <span class="k-cta__code">${r.num} / ${r.code}</span>
          <span class="k-cta__meta">${DESC[r.id] ?? ''}</span>
          <span class="k-cta__label">${r.label}</span>
          <span class="k-cta__arrow">${icon('chevron-2', { size: 20 })}</span>
        </a>`,
        )
        .join('')}
    </div>
  </section>`;

  b.add(hydrate(root));

  // 3D hero
  b.add(
    mountGL(root.querySelector('#boot-gl')!, async (host, signal) => {
      const m = await import('../three/scenes/runner');
      return m.mountRunner(host, { fps: 12, signal });
    }, (h) => {
      root.querySelector('#boot-backend')!.textContent = h.stage.backend;
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
  const integ = root.querySelector<HTMLElement>('#boot-int')!;
  const status = root.querySelector<HTMLElement>('#boot-status')!;
  const integrity = countTo(integ, 97, { steps: 24, duration: 3.2, fmt: (value) => `${pad(value, 3)}%` });
  b.add(() => integrity.kill());

  (async () => {
    reveal(root.querySelector<HTMLElement>('[data-boot="vert"]')!, { from: 'bottom', steps: 8, duration: 0.5 });
    reveal(root.querySelector<HTMLElement>('[data-boot="title"]')!, { from: 'left', steps: 5, duration: 0.4 });
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
