import { pageHead, section, spec } from './_ui';
import { checker, pixelIcon, triTile, dotMatrix } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { scramble } from '../lib/motion';
import { bag, on, $$ } from '../lib/util';

const SW = [
  { tok: '--c-void', hex: '#000000', name: 'Void', role: 'Negative space. 70–85% of every frame.', ink: '#ececec' },
  { tok: '--c-cobalt', hex: '#2424FF', name: 'Cobalt', role: 'Structure, frames, idle system. Full-bleed fields.', ink: '#ececec' },
  { tok: '--c-acid', hex: '#7DFF1A', name: 'Acid', role: 'Nominal / OK / active selection.', ink: '#000' },
  { tok: '--c-lime', hex: '#D4FF00', name: 'Link', role: 'Connection, memory, transfer.', ink: '#000' },
  { tok: '--c-hazard', hex: '#FFE000', name: 'Hazard', role: 'Caution, selection boxes, eject.', ink: '#000' },
  { tok: '--c-crimson', hex: '#FF2A17', name: 'Crimson', role: 'Fault. Inverts the whole field.', ink: '#000' },
  { tok: '--c-cyan', hex: '#38F5D4', name: 'Cyan', role: 'Rim light on slice geometry, scopes.', ink: '#000' },
  { tok: '--c-bone', hex: '#ECECEC', name: 'Bone', role: 'Primary type, registration ticks.', ink: '#000' },
];

const STATES = [
  ['nominal', 'NOMINAL', 'All subsystems within tolerance'],
  ['link', 'LINK', 'Uplink established / memory transfer'],
  ['caution', 'CAUTION', 'Thermal delta exceeding band'],
  ['critical', 'CRITICAL', 'Integrity below threshold'],
  ['cobalt', 'STANDBY', 'Idle — awaiting operator'],
];

export default function mount(root: HTMLElement) {
  const b = bag();
  const statePanel = (st: string, label: string, msg: string) => `
    <div class="k-panel sig-state" data-state="${st}">
      <div class="k-panel__head"><span>${label}</span><span>${pixelIcon(st === 'critical' ? 'warn' : st === 'link' ? 'link' : st === 'caution' ? 'warn' : 'check', { size: 14 })}</span></div>
      <div class="k-panel__body">
        <div class="t-micro" style="margin-bottom:10px">${msg}</div>
        <div class="k-progress" style="--p:${st === 'critical' ? 18 : st === 'caution' ? 54 : 86}%"></div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="k-btn k-btn--solid k-btn--sm">Confirm</button>
          <button class="k-btn k-btn--sm">Details</button>
          <span class="k-tag k-tag--dot">${label}</span>
        </div>
      </div>
    </div>`;

  root.innerHTML = `
  <section class="page">
    ${pageHead('02', 'Signal<br><span class="t-outline">Colour</span>', ['FLAT FILLS ONLY', 'NO GRADIENTS · NO GLOW', 'COLOUR = STATE'], 52)}
    <p class="page-lede">Pure black carries the frame. Signal colours are <b>flat, fully saturated, never blended</b> — each one maps to a system state.
    Swap the whole UI by setting <b>data-state</b> on any ancestor: every component reads <b>--accent</b> / <b>--frame</b>. Try the ACCENT toggle in the top bar.</p>

    ${section('Palette', 'CLICK TO COPY HEX')}
    <div class="sig-swatches">
      ${SW.map(
        (s, i) => `
        <button class="sig-sw" style="--sw:${s.hex};--ink:${s.ink}" data-hex="${s.hex}">
          <span class="sig-sw__idx t-pixel">${String(i).padStart(2, '0')}</span>
          <span class="sig-sw__name t-display t-wide">${s.name}</span>
          <span class="sig-sw__hex">${s.hex}</span>
          <span class="sig-sw__tok">${s.tok}</span>
          <span class="sig-sw__role">${s.role}</span>
        </button>`,
      ).join('')}
    </div>

    ${section('Ratio', 'PER FRAME')}
    <div class="sig-ratio">
      <i style="flex:78;background:var(--c-void)"><span>VOID 78</span></i>
      <i style="flex:12;background:var(--c-cobalt)"><span>COBALT 12</span></i>
      <i style="flex:6;background:var(--c-acid);color:#000"><span>ACID 6</span></i>
      <i style="flex:3;background:var(--c-bone);color:#000"><span>3</span></i>
      <i style="flex:1;background:var(--c-crimson)"></i>
    </div>
    <p class="t-micro" style="margin-top:8px">One dominant signal colour per frame + one counterpoint. Red appears only for fault, and when it appears it takes the whole field.</p>

    ${section('State themes', 'data-state="…"')}
    <div class="sig-states">${STATES.map(([a, b2, c]) => statePanel(a, b2, c)).join('')}</div>

    ${section('Field combinations', 'POSTER STUDIES')}
    <div class="spec-grid">
      ${spec({
        code: 'CB-01',
        title: 'Acid on cobalt',
        bodyCls: 'spec-body--flush',
        body: `<div class="sig-poster" style="background:var(--c-cobalt)">
          <span style="color:#fff">${checker(2, 2, { size: 46 })}</span>
          <b class="t-display" style="color:var(--c-acid)">Stand by</b>
          <span style="color:#fff">${checker(2, 2, { size: 46, invert: true })}</span>
        </div>`,
      })}
      ${spec({
        code: 'CB-02',
        title: 'Cobalt on crimson',
        bodyCls: 'spec-body--flush',
        body: `<div class="sig-poster" style="background:var(--c-crimson);flex-direction:column;align-items:flex-start">
          <b class="t-display" style="color:var(--c-cobalt)">Error_err</b>
          <span class="t-micro" style="color:#000">B2EE/S · A 5PN - RR · 0 WWW</span>
        </div>`,
      })}
      ${spec({
        code: 'CB-03',
        title: 'Ink on hazard',
        bodyCls: 'spec-body--flush',
        body: `<div class="sig-poster" style="background:var(--c-hazard);color:#000">
          <span>${pixelIcon('eject', { size: 46 })}</span>
          <b class="t-display t-wide" style="font-size:40px">Eject<br>transf</b>
        </div>`,
      })}
      ${spec({
        code: 'CB-04',
        title: 'Cobalt triangles + alarm',
        bodyCls: 'spec-body--flush',
        body: `<div class="sig-poster" style="background:#000;padding:0;gap:0">
          <span style="color:var(--c-cobalt-lo);flex:1;display:block;line-height:0">${triTile(10, 5, 9, { size: 400, alt: '#000' }).replace('width="400"', 'width="100%"').replace(/height="\d+"/, 'height="100%" preserveAspectRatio="none"')}</span>
          <span style="color:var(--c-crimson);padding:0 18px">${dotMatrix(3, 6, () => true, { size: 30 }).replace(/r="1.3"/g, 'r="1.5"')}</span>
        </div>`,
      })}
    </div>
  </section>`;

  b.add(hydrate(root));
  $$<HTMLButtonElement>('.sig-sw', root).forEach((btn) =>
    b.add(
      on(btn, 'click', async () => {
        const hex = btn.dataset.hex!;
        try {
          await navigator.clipboard.writeText(hex);
        } catch {
          /* clipboard may be unavailable */
        }
        const el = btn.querySelector<HTMLElement>('.sig-sw__hex')!;
        await scramble(el, 'COPIED', { duration: 0.25 });
        setTimeout(() => scramble(el, hex, { duration: 0.25 }), 700);
      }),
    ),
  );
  return b.dispose;
}
