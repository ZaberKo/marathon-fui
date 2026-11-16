import { icon } from '../lib/icons';
import { pageHead, section } from './_ui';
import { hydrate } from '../lib/hydrate';
import { scramble } from '../lib/motion';
import { bag, on, $$ } from '../lib/util';

const SW = [
  { tok: '--c-void', hex: '#000000', name: 'Void', role: 'Negative space between signal beats.', ink: '#ececec' },
  { tok: '--c-cobalt', hex: '#2424FF', name: 'Cobalt', role: 'Structure, frames, idle system. Full-bleed fields.', ink: '#ececec' },
  { tok: '--c-acid', hex: '#7DFF1A', name: 'Acid', role: 'Nominal / OK / active selection.', ink: '#000' },
  { tok: '--c-lime', hex: '#D4FF00', name: 'Link', role: 'Connection, memory, transfer.', ink: '#000' },
  { tok: '--c-hazard', hex: '#FFE000', name: 'Hazard', role: 'Caution, selection boxes, eject.', ink: '#000' },
  { tok: '--c-crimson', hex: '#FF2A17', name: 'Crimson', role: 'Fault. Inverts the whole field.', ink: '#000' },
  { tok: '--c-cyan', hex: '#38F5D4', name: 'Cyan', role: 'Rim light on slice geometry, scopes.', ink: '#000' },
  { tok: '--c-bone', hex: '#ECECEC', name: 'Bone', role: 'Primary type, registration ticks.', ink: '#000' },
];

const STATES = [
  ['nominal', 'NOMINAL', 'All subsystems within tolerance', 'check'],
  ['link', 'LINK', 'Uplink established / memory transfer', 'link'],
  ['caution', 'CAUTION', 'Thermal delta exceeding band', 'warn'],
  ['critical', 'CRITICAL', 'Integrity below threshold', 'warn'],
  ['cobalt', 'STAND BY', 'Awaiting operator', 'power'],
];

export default function mount(root: HTMLElement) {
  const b = bag();

  root.innerHTML = `
  <section class="page">
    ${pageHead('02', 'Signal<br><span class="t-outline">Colour</span>', ['FLAT FILLS ONLY', 'NO GRADIENTS · NO GLOW', 'COLOUR = STATE'], 52)}
    <p class="page-lede">Pure black carries the frame. Signal colours are <b>flat, fully saturated, never blended</b> — each one maps to a system state.
    A tonal ramp is only allowed as a dither of solid cells. Hold and fault frames cut to one full field of colour.
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

    ${section('State themes', 'data-state="…"')}
    <div class="sig-states">${STATES.map(([state, label, message, ico]) => `
      <div class="sig-state" data-state="${state}">
        <div class="k-band"><span>${label}</span>${icon(ico, { size: 16 })}</div>
        <p class="t-micro">${message}</p>
      </div>`).join('')}</div>

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
