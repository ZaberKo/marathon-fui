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
import { barWipe, scramble } from './lib/motion';
import { pixelIcon, crosshair } from './lib/glyphs';
import { hex, pad, stepLoop, type Cleanup } from './lib/util';
import { mountPerfHud } from './lib/perfHud';
import { mountAmbient } from './lib/ambient';

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
    <button class="tb-toggle tb-hide-m" id="tb-perf" style="background:none;border:0;border-left:1px solid var(--c-line)">PERF <span class="tb-val">ON</span></button>
    <button class="tb-toggle tb-hide-m" id="tb-ret" aria-pressed="true" style="background:none;border:0;border-left:1px solid var(--c-line)">RETICLE <span class="tb-val">ON</span></button>
    <div>T <span class="tb-val" id="tb-clock">00:00:00</span></div>
  </header>
  <nav class="rail" aria-label="Modules">
    ${ROUTES.map((r) => `<a href="#/${r.id}" data-id="${r.id}"><span class="r-num">${r.num}</span><span class="r-label">${r.label}</span></a>`).join('')}
  </nav>
  <canvas class="ambient" aria-hidden="true"></canvas>
  <main class="stage" id="stage"></main>
  <footer class="ticker"><div class="k-marquee" style="--dur:60s"><div class="k-marquee__track">${'<span>RUNTIME//KIT — GRAPHIC REALISM COMPONENT LIBRARY ▚ STEPPED MOTION ONLY ▚ PURE BLACK NEGATIVE SPACE ▚ COLOUR ENCODES STATE ▚ ASSERT SHELL.INTEGRITY ▚ LIMINAL BUFFER STABLE ▚ </span>'.repeat(4)}</div></div></footer>
</div>
<div class="wipe" aria-hidden="true">${'<i></i>'.repeat(9)}</div>
<div class="reticle" aria-hidden="true">${crosshair({ size: 30, gap: 4 })}<span id="ret-xy"></span></div>
`;

const stage = document.getElementById('stage')!;
const wipe = document.querySelector<HTMLElement>('.wipe')!;
const routeEl = document.getElementById('tb-route')!;
let cleanup: Cleanup | null = null;
let navToken = 0;

async function go() {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0];
  const route = ROUTES.find((r) => r.id === id) ?? ROUTES[0];
  const token = ++navToken;
  document.querySelectorAll<HTMLAnchorElement>('.rail a').forEach((a) => {
    if (a.dataset.id === route.id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const modP = route.load();
  const swap = async () => {
    const mod = await modP;
    if (token !== navToken) return;
    cleanup?.();
    cleanup = null;
    stage.innerHTML = '';
    stage.scrollTop = 0;
    document.title = `${route.num} ${route.label.toUpperCase()} — RUNTIME//KIT`;
    cleanup = await mod.default(stage);
  };
  if (cleanup === null && stage.childElementCount === 0) await swap();
  else await barWipe(wipe, swap);
  scramble(routeEl, `${route.num} / ${route.code}`, { duration: 0.4 });
}
window.addEventListener('hashchange', go);
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
const perf = mountPerfHud();
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

/* --- ambient pixel field behind the stage ------------------------- */
mountAmbient(document.querySelector<HTMLCanvasElement>('.ambient')!);
