import { pageHead, section } from './_ui';
import { checker, pixelIcon } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { adapter } from '../lib/perf';
import { bag, on, stepLoop, $, $$ } from '../lib/util';
import { mountGL } from './_gl';
import type { SceneHandle } from '../three/scenes/index';

export default async function mount(root: HTMLElement) {
  const b = bag();
  const { SCENES } = await import('../three/scenes/index');

  root.innerHTML = `
  <section class="page">
    ${pageHead('07', 'Spatial<br><span class="t-outline">Graphic 3D</span>', ['three/webgpu · TSL', 'CONTOURS · LINES · PIXELS', 'QUANTISED TIME'], 157)}
    <p class="page-lede">3D is never shown "as 3D". Forms are reduced to <b>1px contour lines</b>, <b>ordered-dither dots</b> and <b>wire</b>,
    on black occluders that remove hidden lines. A vector layer of <b>triangles, squares, rings, brackets and connector arcs</b> rides on
    surface vertices. Time is quantised (<b>floor(t·fps)/fps</b>) so everything moves like stop-motion.
    Backend: <b id="sp-backend" class="c-acid">—</b></p>

    <div class="sp-toolbar">
      <div><span class="t-micro">FRAME RATE</span><div class="k-seg-ctl" id="sp-fps"><button data-value="6">6</button><button data-value="12" aria-pressed="true">12</button><button data-value="24">24</button><button data-value="60">60</button></div></div>
      <div><span class="t-micro">PIXEL SCALE</span><div class="k-seg-ctl" id="sp-px"><button data-value="1" aria-pressed="true">1×</button><button data-value="2">2×</button><button data-value="3">3×</button></div></div>
      <div><span class="t-micro">LABELS</span><label class="k-switch"><input type="checkbox" id="sp-labels" checked><span class="k-switch__track"><span>OFF</span><span>ON</span></span></label></div>
      <div class="sp-toolbar__note t-micro">SCENES MOUNT WHEN SCROLLED INTO VIEW · PAUSE OFF-SCREEN · SEE PERF TAG FOR BACKEND / FPS / DRAWS</div>
    </div>

    ${section('Scenes', `${SCENES.length} × WebGPURenderer`)}
    <div class="sp-grid">
      ${SCENES.map(
        (c, i) => `
        <article class="spec sp-cell ${i === 0 || (i === SCENES.length - 1 && i % 2 === 1) ? 'is-wide' : ''}" data-key="${c.key}">
          <div class="spec-head"><span class="code">${c.code}</span><span>${c.title}</span><span class="cls" data-fps>—</span>
            <button class="sp-max" type="button" aria-label="Toggle wide" title="Toggle wide">${pixelIcon('scan', { size: 10 })}</button></div>
          <div class="sp-view"><div class="gl-host" data-gl></div>
            <span class="sp-ck tl">${checker(2, 2, { size: 12 })}</span><span class="sp-ck br">${checker(2, 2, { size: 12, invert: true })}</span>
          </div>
          <div class="spec-foot"><span class="c-bone">${c.asset}</span> — ${c.note}</div>
        </article>`,
      ).join('')}
    </div>
  </section>`;

  b.add(hydrate(root));

  const handles = new Map<string, SceneHandle>();
  const cleanups = new Map<string, () => void>();
  let fps = 12;
  let px = 1;
  let labels = true;

  const mountCell = (cell: HTMLElement) => {
    const key = cell.dataset.key!;
    const def = SCENES.find((s) => s.key === key)!;
    const host = $('[data-gl]', cell);
    cleanups.get(key)?.();
    host.innerHTML = '';
    cleanups.set(
      key,
      mountGL(
        host,
        (h) => def.mount(h, { fps, pixel: px, labels }),
        (h) => {
          handles.set(key, h);
          $('#sp-backend', root).textContent = h.stage.backend;
        },
      ),
    );
  };

  // lazy mount when the card approaches the viewport
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        mountCell(e.target as HTMLElement);
      }),
    { rootMargin: '200px 0px' },
  );
  $$('.sp-cell', root).forEach((c) => io.observe(c));
  b.add(() => {
    io.disconnect();
    cleanups.forEach((fn) => fn());
  });

  // per-card fps readout
  b.add(
    stepLoop(2, () => {
      $$('.sp-cell', root).forEach((cell) => {
        const h = handles.get(cell.dataset.key!);
        $('[data-fps]', cell).textContent = h ? `${h.stage.backend} · ${h.stage.fps}FPS` : 'IDLE';
      });
      if (adapter.backend) $('#sp-backend', root).textContent = `${adapter.backend}${adapter.fallbackReason ? ' (fallback)' : ''}`;
    }),
  );

  $$('.sp-max', root).forEach((btn) =>
    b.add(
      on(btn, 'click', () => {
        const cell = btn.closest('.sp-cell') as HTMLElement;
        cell.classList.toggle('is-wide');
        cell.scrollIntoView({ block: 'nearest' });
      }),
    ),
  );
  b.add(
    on($('#sp-fps', root), 'k-change', (e: CustomEvent) => {
      fps = Number(e.detail);
      handles.forEach((h) => h.stage.setFps(fps));
    }),
  );
  b.add(
    on($('#sp-px', root), 'k-change', (e: CustomEvent) => {
      px = Number(e.detail);
      handles.forEach((h) => h.stage.setPixel(px));
    }),
  );
  b.add(
    on($('#sp-labels', root), 'change', (e: Event) => {
      labels = (e.target as HTMLInputElement).checked;
      root.classList.toggle('sp-nolabels', !labels);
    }),
  );

  return b.dispose;
}
