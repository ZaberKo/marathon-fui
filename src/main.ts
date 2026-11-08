import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fontsource/silkscreen/400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/fx.css';
import './styles/pages.css';

import { ROUTES } from './routes';
import { scramble, sliceGlitchTransition } from './lib/motion';
import { pixelIcon, crosshair } from './lib/glyphs';
import { hex, pad, reducedMotion, stepLoop, type Cleanup } from './lib/util';
import { mountPerfHud } from './lib/perfHud';

const app = document.getElementById('app')!;
const STATES = ['nominal', 'link', 'caution', 'cobalt'] as const;

app.innerHTML = `
<div class="shell">
  <a class="brand" href="#/" aria-label="Home">${pixelIcon('grid', { size: 22 })}</a>
  <header class="topbar">
    <div class="tb-title">RUNTIME//KIT</div>
    <div class="tb-route"><span id="tb-route">SYS.BOOT</span></div>
    <div class="tb-hide-m">BUF <span class="tb-val" id="tb-buf">0000</span></div>
    <div class="tb-spacer"></div>
    <button class="tb-toggle tb-hide-m" id="tb-state" title="Cycle accent state" style="background:none;border:0;border-left:1px solid var(--c-line)">ACCENT <span class="tb-val" id="tb-state-v">NOMINAL</span></button>
    <button class="tb-toggle" id="tb-perf" style="background:none;border:0;border-left:1px solid var(--c-line)">PERF <span class="tb-val">ON</span></button>
    <button class="tb-toggle tb-hide-m" id="tb-ret" aria-pressed="true" style="background:none;border:0;border-left:1px solid var(--c-line)">RETICLE <span class="tb-val">ON</span></button>
    <div>T <span class="tb-val" id="tb-clock">00:00:00</span></div>
  </header>
  <nav class="rail" aria-label="Modules">
    ${ROUTES.map((r) => `<a href="#/${r.id}" data-id="${r.id}"><span class="r-num">${r.num}</span><span class="r-label">${r.label}</span></a>`).join('')}
  </nav>
  <main class="stage" id="stage"></main>
  <footer class="ticker"><div class="k-marquee" style="--dur:60s"><div class="k-marquee__track">${'<span>RUNTIME//KIT — GRAPHIC REALISM COMPONENT LIBRARY ▚ STEPPED READOUTS ▚ CONTINUOUS TRACKS ▚ PURE BLACK NEGATIVE SPACE ▚ COLOUR ENCODES STATE ▚ ASSERT SHELL.INTEGRITY ▚ LIMINAL BUFFER STABLE ▚ </span>'.repeat(4)}</div></div></footer>
</div>
<div class="reticle" aria-hidden="true">${crosshair({ size: 30, gap: 4 })}<span id="ret-xy"></span></div>
`;

const stage = document.getElementById('stage')!;
const rail = app.querySelector<HTMLElement>('.rail')!;
const routeEl = document.getElementById('tb-route')!;
let cleanup: Cleanup | null = null;
let navToken = 0;
let navigation: AbortController | null = null;

function revealCurrentModule() {
  rail.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

async function go() {
  let id = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (id === 'telemetry/dials') {
    id = 'telemetry';
    history.replaceState(history.state, '', '#/telemetry');
  }
  const route = ROUTES.find((r) => r.id === id) ?? ROUTES[0];
  const token = ++navToken;
  navigation?.abort();
  navigation = new AbortController();
  const { signal } = navigation;
  try {
    const mod = await route.load();
    if (token !== navToken) return;
    const swap = async () => {
      if (token !== navToken) return;
      cleanup?.();
      cleanup = null;
      const view = document.createElement('div');
      view.className = 'route-view';
      stage.replaceChildren(view);
      stage.scrollTop = 0;
      rail.querySelectorAll<HTMLAnchorElement>('a').forEach((a) => {
        if (a.dataset.id === route.id) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      revealCurrentModule();
      document.title = `${route.num} ${route.label.toUpperCase()} — RUNTIME//KIT`;
      const readout = `${route.num} / ${route.code}`;
      if (reducedMotion()) routeEl.textContent = readout;
      else void scramble(routeEl, readout, { duration: 0.4, signal });
      const dispose = await mod.default(view);
      // A delayed mount can finish after its own view has been replaced.
      if (view.parentElement === stage) cleanup = dispose;
      else dispose();
    };
    if (!stage.firstElementChild) await swap();
    else await sliceGlitchTransition(stage, swap, signal);
  } catch (error) {
    if (token === navToken) console.error(`[kit] Failed to load ${route.label}`, error);
  }
}
window.addEventListener('hashchange', go);
new ResizeObserver(revealCurrentModule).observe(rail);
document.fonts.ready.then(revealCurrentModule);
go();

/* --- clock / buffer readouts -------------------------------------- */
const clock = document.getElementById('tb-clock')!;
const buf = document.getElementById('tb-buf')!;
stepLoop(2, () => {
  const d = new Date();
  clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  buf.textContent = hex(Math.random() * 65535);
});

/* --- global accent state ------------------------------------------ */
const stateBtn = document.getElementById('tb-state')!;
const stateV = document.getElementById('tb-state-v')!;
let si = 0;
document.documentElement.dataset.state = STATES[si];
stateBtn.addEventListener('click', () => {
  si = (si + 1) % STATES.length;
  document.documentElement.dataset.state = STATES[si];
  scramble(stateV, STATES[si].toUpperCase(), { duration: 0.3 });
});

/* --- reticle cursor ------------------------------------------------ */
const ret = document.querySelector<HTMLElement>('.reticle')!;
const retXY = document.getElementById('ret-xy')!;
const retBtn = document.getElementById('tb-ret')!;
const fine = window.matchMedia('(pointer: fine)').matches;
let retOn = fine;
retBtn.setAttribute('aria-pressed', String(retOn));
retBtn.querySelector('.tb-val')!.textContent = retOn ? 'ON' : 'OFF';
retBtn.addEventListener('click', () => {
  retOn = !retOn;
  retBtn.setAttribute('aria-pressed', String(retOn));
  retBtn.querySelector('.tb-val')!.textContent = retOn ? 'ON' : 'OFF';
  ret.classList.toggle('is-on', retOn);
});
window.addEventListener('pointermove', (e) => {
  if (!retOn) return;
  ret.classList.add('is-on');
  // snap to a 4px grid for a slightly mechanical feel
  const x = Math.round(e.clientX / 4) * 4;
  const y = Math.round(e.clientY / 4) * 4;
  ret.style.transform = `translate(${x}px, ${y}px)`;
  retXY.textContent = `${pad(x, 4)}.${pad(y, 4)}`;
});
document.addEventListener('pointerleave', () => ret.classList.remove('is-on'));

/* --- floating perf HUD -------------------------------------------- */
const perf = mountPerfHud({ defaultOn: !window.matchMedia('(max-width: 760px)').matches });
const perfBtn = document.getElementById('tb-perf')!;
const syncPerf = () => {
  perfBtn.setAttribute('aria-pressed', String(perf.on));
  perfBtn.querySelector('.tb-val')!.textContent = perf.on ? 'ON' : 'OFF';
};
syncPerf();
perfBtn.addEventListener('click', () => {
  perf.toggle();
  syncPerf();
});
