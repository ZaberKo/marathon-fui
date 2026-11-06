import { pageHead, section } from './_ui';
import { checker } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { bag, on, $, $$ } from '../lib/util';
import { mountGL } from './_gl';
import type { SceneHandle } from '../three/scenes';

type Key = 'runner' | 'neural' | 'planet' | 'cad';

const CELLS: { key: Key; code: string; title: string; note: string }[] = [
  { key: 'runner', code: 'GPU-01', title: 'Slice figure', note: 'TSL node material: world-Y fract → step → contour slices; rim from normalView.z. Capsule mannequin, stop-motion run cycle.' },
  { key: 'neural', code: 'GPU-02', title: 'Neural voxels', note: 'InstancedMesh pixel cubes on a folded ellipsoid, nearest-neighbour synapse lines, random firing per step.' },
  { key: 'planet', code: 'GPU-03', title: 'Bar-field horizon', note: 'Extruded columns along sphere normals, heights stepped by noise. Rendered at 1/2 res, nearest upscale.' },
  { key: 'cad', code: 'GPU-04', title: 'CAD bay', note: 'Orthographic iso view, 1px wireframes, corner-tick bounding volumes, stepped selection cycling.' },
];

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('07', 'Spatial<br><span class="t-outline">WebGPU</span>', ['three/webgpu · TSL', 'AUTO-FALLBACK WEBGL2', 'QUANTISED TIME'], 157)}
    <p class="page-lede">3D assets translated into flat drafting language: <b>no PBR, no lights</b>. Contour slices, voxel point clouds,
    bar fields, single-pixel wireframes. Time is quantised (<b>floor(t·fps)/fps</b>) so everything moves like stop-motion.
    Backend: <b id="sp-backend" class="c-acid">—</b></p>

    <div class="sp-toolbar">
      <div><span class="t-micro">FRAME RATE</span><div class="k-seg-ctl" id="sp-fps"><button data-value="6">6</button><button data-value="12" aria-pressed="true">12</button><button data-value="24">24</button><button data-value="60">60</button></div></div>
      <div><span class="t-micro">PIXEL SCALE</span><div class="k-seg-ctl" id="sp-px"><button data-value="1" aria-pressed="true">1×</button><button data-value="2">2×</button><button data-value="3">3×</button><button data-value="4">4×</button></div></div>
      <div style="flex:1;min-width:220px"><label class="k-range"><span class="k-range__label t-micro"><span>SLICE FREQ (GPU-01)</span><span>8–80</span></span><input type="range" min="8" max="80" value="38" id="sp-freq"><output class="k-range__out">038</output></label></div>
      <div style="flex:1;min-width:220px"><label class="k-range"><span class="k-range__label t-micro"><span>SLICE FILL (GPU-01)</span><span>%</span></span><input type="range" min="5" max="95" value="45" id="sp-fill"><output class="k-range__out">045</output></label></div>
      <div><span class="t-micro">SLICE COLOUR</span><div class="k-seg-ctl" id="sp-col"><button data-value="cobalt" aria-pressed="true">Cob</button><button data-value="acid">Acid</button><button data-value="crimson">Red</button><button data-value="bone">Bone</button></div></div>
    </div>

    ${section('Scenes', '4 × WebGPURenderer')}
    <div class="sp-grid">
      ${CELLS.map(
        (c) => `
        <article class="spec sp-cell">
          <div class="spec-head"><span class="code">${c.code}</span><span>${c.title}</span><span class="cls" data-fps="${c.key}">—</span></div>
          <div class="sp-view"><div class="gl-host" data-gl="${c.key}"></div>
            <span class="sp-ck tl">${checker(2, 2, { size: 12 })}</span><span class="sp-ck br">${checker(2, 2, { size: 12, invert: true })}</span>
          </div>
          <div class="spec-foot">${c.note}</div>
        </article>`,
      ).join('')}
    </div>
  </section>`;

  b.add(hydrate(root));

  const handles: Partial<Record<Key, SceneHandle>> = {};
  const factories: Record<Key, (h: HTMLElement) => Promise<SceneHandle>> = {
    runner: async (h) => (await import('../three/scenes')).mountSliceRunner(h, { fps: 12 }),
    neural: async (h) => (await import('../three/scenes')).mountNeuralCloud(h, { fps: 12 }),
    planet: async (h) => (await import('../three/scenes')).mountPixelPlanet(h, { fps: 12, pixel: 2 }),
    cad: async (h) => (await import('../three/scenes')).mountCadBay(h, { fps: 12 }),
  };
  $$('[data-gl]', root).forEach((host) => {
    const key = host.dataset.gl as Key;
    b.add(
      mountGL(host, factories[key], (h) => {
        handles[key] = h;
        $('#sp-backend', root).textContent = h.stage.backend;
        $(`[data-fps="${key}"]`, root).textContent = `${h.stage.backend} · 12FPS`;
      }),
    );
  });

  const COLORS: Record<string, number> = { cobalt: 0x2424ff, acid: 0x7dff1a, crimson: 0xff2a17, bone: 0xececec };
  b.add(
    on($('#sp-fps', root), 'k-change', (e: CustomEvent) => {
      const fps = Number(e.detail);
      (Object.keys(handles) as Key[]).forEach((k) => {
        handles[k]!.stage.setFps(fps);
        $(`[data-fps="${k}"]`, root).textContent = `${handles[k]!.stage.backend} · ${fps}FPS`;
      });
    }),
  );
  b.add(
    on($('#sp-px', root), 'k-change', (e: CustomEvent) => {
      Object.values(handles).forEach((h) => h!.stage.setPixel(Number(e.detail)));
    }),
  );
  b.add(on($('#sp-freq', root), 'input', (e: Event) => handles.runner?.set?.('freq', (e.target as HTMLInputElement).value)));
  b.add(on($('#sp-fill', root), 'input', (e: Event) => handles.runner?.set?.('fill', Number((e.target as HTMLInputElement).value) / 100)));
  b.add(on($('#sp-col', root), 'k-change', (e: CustomEvent) => handles.runner?.set?.('color', COLORS[e.detail])));

  return b.dispose;
}
