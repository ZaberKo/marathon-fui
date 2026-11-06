import { pageHead, section, spec } from './_ui';
import { pixelIcon } from '../lib/glyphs';
import { hydrate } from '../lib/hydrate';
import { notify } from '../lib/toast';
import { bag, on, $$ } from '../lib/util';

const ico = (n: string, s = 14) => `<span class="k-btn__ico">${pixelIcon(n, { size: s })}</span>`;

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('03', 'Control<br><span class="t-outline">Surface</span>', ['HOVER / ACTIVE / FOCUS / DISABLED', 'ALL TRANSITIONS STEPPED', 'KEYBOARD ACCESSIBLE'], 73)}
    <p class="page-lede">Square corners, 1px frames, uppercase wide grotesque. Hover states <b>fill in 4 hard steps</b>, never fade.
    Each card lists the class names to copy. Behaviours (scramble, hold, loading) are opt-in via data-attributes and <b>hydrate(root)</b>.</p>

    ${section('Buttons', 'k-btn')}
    <div class="spec-grid">
      ${spec({
        code: 'BTN-01',
        title: 'Base / variants',
        cls: '.k-btn .k-btn--solid|cobalt|hazard|danger',
        body: `
          <button class="k-btn">Default</button>
          <button class="k-btn k-btn--solid">Confirm</button>
          <button class="k-btn k-btn--cobalt">Deploy</button>
          <button class="k-btn k-btn--hazard"><span>Eject</span></button>
          <button class="k-btn k-btn--danger">Abort</button>
          <button class="k-btn" disabled>Locked</button>`,
      })}
      ${spec({
        code: 'BTN-02',
        title: 'Sizes + icons',
        cls: '.k-btn--sm|lg .k-btn--icon',
        body: `
          <button class="k-btn k-btn--sm">${ico('plus', 10)}Add</button>
          <button class="k-btn">${ico('scan')}Scan</button>
          <button class="k-btn k-btn--lg k-btn--solid">Initiate ${ico('arrow-r', 16)}</button>
          <button class="k-btn k-btn--icon" aria-label="menu">${ico('menu')}</button>
          <button class="k-btn k-btn--icon k-btn--cobalt" aria-label="power">${ico('power')}</button>
          <button class="k-btn k-btn--icon k-btn--sm" aria-label="close">${ico('cross', 10)}</button>`,
      })}
      ${spec({
        code: 'BTN-03',
        title: 'Shapes',
        cls: '.k-btn--notch|bracket|pixel|ghost',
        body: `
          <button class="k-btn k-btn--solid k-btn--notch">Notched</button>
          <button class="k-btn k-btn--bracket">Bracket</button>
          <button class="k-btn k-btn--pixel">Pixel</button>
          <button class="k-btn k-btn--ghost">Ghost link</button>`,
      })}
      ${spec({
        code: 'BTN-04',
        title: 'Coded / split',
        cls: '.k-btn--split .k-btn__code',
        body: `
          <button class="k-btn k-btn--split"><span>Transfer</span><span class="k-btn__cell">${ico('chevron', 12)}</span></button>
          <button class="k-btn k-btn--split k-btn--cobalt"><span>Memory</span><span class="k-btn__cell k-btn__code">0x3F</span></button>
          <button class="k-btn"><span class="k-btn__code">A-01</span>Latch<span class="k-btn__code">KL2</span></button>`,
      })}
      ${spec({
        code: 'BTN-05',
        title: 'Behaviours',
        cls: 'data-scramble-hover · data-glitch-hover · data-load-demo',
        body: `
          <button class="k-btn" data-scramble-hover><span data-label>Decode on hover</span></button>
          <button class="k-btn k-btn--cobalt" data-glitch-hover>Glitch on hover</button>
          <button class="k-btn k-btn--solid" data-load-demo style="min-width:150px">Click → load</button>`,
      })}
      ${spec({
        code: 'BTN-06',
        title: 'Hold to confirm',
        cls: '.k-hold[data-hold=1400]',
        body: `
          <button class="k-btn k-btn--danger k-btn--lg k-hold" data-hold="1400" style="min-width:260px">${ico('warn', 16)}<span data-label>Hold to purge</span></button>`,
        foot: 'Progress quantised to 12 steps. Release cancels. Space/Enter supported.',
      })}
    </div>

    ${section('Call to action', 'k-cta')}
    <div class="spec-grid">
      <a class="k-cta" href="#/spatial">
        <span class="k-cta__code">CTA-01 / GPU</span>
        <span class="k-cta__meta">Open spatial module<br>WebGPU renderer<br>7 scenes</span>
        <span class="k-cta__label">Enter shell</span>
        <span class="k-cta__arrow">${pixelIcon('arrow-r', { size: 22 })}</span>
      </a>
      <a class="k-cta" href="#/fault" data-state="critical">
        <span class="k-cta__code">CTA-02 / ERR</span>
        <span class="k-cta__meta">Inject runtime fault<br>Red inversion<br>Recoverable</span>
        <span class="k-cta__label">Trigger fault</span>
        <span class="k-cta__arrow">${pixelIcon('warn', { size: 22 })}</span>
      </a>
      <a class="k-cta" href="#/telemetry" data-state="link">
        <span class="k-cta__code">CTA-03 / LINK</span>
        <span class="k-cta__meta">Telemetry instruments<br>Canvas 2D<br>12 FPS</span>
        <span class="k-cta__label">Uplink</span>
        <span class="k-cta__arrow">${pixelIcon('link', { size: 22 })}</span>
      </a>
    </div>

    ${section('Selection', 'switch · check · radio · segmented · tabs')}
    <div class="spec-grid">
      ${spec({
        code: 'SEL-01',
        title: 'Switch',
        cls: '.k-switch',
        bodyCls: 'spec-body--col',
        body: ['Auto-latch', 'Neural sync', 'Telemetry uplink']
          .map((l, i) => `<label class="k-switch"><input type="checkbox" ${i !== 1 ? 'checked' : ''}><span class="k-switch__track"><span>OFF</span><span>ON</span></span>${l}</label>`)
          .join(''),
      })}
      ${spec({
        code: 'SEL-02',
        title: 'Checkbox / radio',
        cls: '.k-check .k-check--x .k-radio',
        bodyCls: 'spec-body--col',
        body: `
          <label class="k-check"><input type="checkbox" checked><i></i>Optic array [L]</label>
          <label class="k-check"><input type="checkbox"><i></i>Optic array [R]</label>
          <label class="k-check k-check--x"><input type="checkbox" checked><i></i>Purge cache</label>
          <div style="height:6px"></div>
          <label class="k-radio"><input type="radio" name="r1" checked><i></i>Shell A</label>
          <label class="k-radio"><input type="radio" name="r1"><i></i>Shell B</label>`,
      })}
      ${spec({
        code: 'SEL-03',
        title: 'Segmented + stepper',
        cls: '.k-seg-ctl .k-stepper',
        bodyCls: 'spec-body--col',
        body: `
          <div class="t-micro">FRAME RATE</div>
          <div class="k-seg-ctl"><button>6</button><button aria-pressed="true">12</button><button>24</button><button>60</button></div>
          <div class="t-micro" style="margin-top:8px">MODE</div>
          <div class="k-seg-ctl"><button aria-pressed="true">Scan</button><button>Map</button><button>Link</button></div>
          <div class="t-micro" style="margin-top:8px">SQUAD</div>
          <div class="k-stepper"><button aria-label="decrease">-</button><output>03</output><button aria-label="increase">+</button></div>`,
      })}
      ${spec({
        code: 'SEL-04',
        title: 'Tabs',
        cls: '.k-tabs + .k-tabpanel',
        bodyCls: 'spec-body--col',
        body: `
          <div class="k-tabs" role="tablist">
            <button role="tab" aria-selected="true" data-panel="Shell integrity 97%. Neural subroutines mounted. Awaiting operator."><span>01</span>Status</button>
            <button role="tab" aria-selected="false" data-panel="Loadout: 2 primary, 1 auxiliary. Weight 31.4 KG. Thermal OK."><span>02</span>Loadout</button>
            <button role="tab" aria-selected="false" data-panel="Uplink LINK-07 nominal. Packet loss 0.02%. Latency 41 MS."><span>03</span>Network</button>
          </div>
          <div class="k-tabpanel">Shell integrity 97%. Neural subroutines mounted. Awaiting operator.</div>`,
      })}
    </div>

    ${section('Input', 'field · select · range')}
    <div class="spec-grid">
      ${spec({
        code: 'INP-01',
        title: 'Text field',
        cls: '.k-field',
        bodyCls: 'spec-body--col',
        body: `
          <label class="k-field"><span class="k-field__label">Callsign <em>REQ</em></span>
            <span class="k-field__box"><span class="k-field__prefix">&gt;</span><input placeholder="ENTER CALLSIGN" value="RUNNER-07"></span>
            <span class="k-field__hint">A–Z, 0–9, max 12</span></label>
          <label class="k-field is-error"><span class="k-field__label">Access code <em>ERR</em></span>
            <span class="k-field__box"><span class="k-field__prefix">#</span><input value="00X-17"></span>
            <span class="k-field__hint">Checksum mismatch — retry</span></label>`,
      })}
      ${spec({
        code: 'INP-02',
        title: 'Select',
        cls: '.k-field select',
        bodyCls: 'spec-body--col',
        body: `
          <label class="k-field"><span class="k-field__label">Destination <em>03</em></span>
            <span class="k-field__box"><select><option>Vesta ring (7)</option><option>Outer relay</option><option>Deep archive</option></select></span></label>
          <label class="k-field"><span class="k-field__label">Shell class</span>
            <span class="k-field__box"><select><option>Recon</option><option>Assault</option><option>Support</option></select></span></label>`,
      })}
      ${spec({
        code: 'INP-03',
        title: 'Range',
        cls: '.k-range',
        bodyCls: 'spec-body--col',
        body: ['Thermal limit', 'Signal gain', 'Buffer depth']
          .map((l, i) => `<label class="k-range"><span class="k-range__label t-micro"><span>${l}</span><span>0–100</span></span><input type="range" min="0" max="100" value="${[62, 28, 84][i]}"><output class="k-range__out">000</output></label>`)
          .join(''),
      })}
    </div>

    ${section('Feedback', 'progress · tag · key · toast')}
    <div class="spec-grid">
      ${spec({
        code: 'FB-01',
        title: 'Progress',
        cls: '.k-progress[style=--p:N%]',
        bodyCls: 'spec-body--col',
        body: `
          <div class="k-meter"><div class="k-meter__row"><span>Loading memory</span><b>072</b></div><div class="k-progress" style="--p:72%"></div></div>
          <div class="k-meter" data-state="caution"><div class="k-meter__row"><span>Thermal</span><b>046</b></div><div class="k-progress k-progress--tall" style="--p:46%"></div></div>
          <div class="k-meter"><div class="k-meter__row"><span>Sync</span><b>—</b></div><div class="k-progress k-progress--indet"></div></div>
          <div class="k-meter" data-state="critical"><div class="k-meter__row"><span>Integrity</span><b>012</b></div><div class="k-progress k-progress--thin" style="--p:12%"></div></div>`,
      })}
      ${spec({
        code: 'FB-02',
        title: 'Tags / keys',
        cls: '.k-tag(--solid|--dot|--blink) .k-key',
        body: `
          <span class="k-tag">Idle</span>
          <span class="k-tag k-tag--solid">Online</span>
          <span class="k-tag k-tag--dot k-tag--blink">Rec</span>
          <span class="k-tag" data-state="caution">Thermal</span>
          <span class="k-tag k-tag--solid" data-state="critical">Fault</span>
          <span class="k-tag" data-state="cobalt" style="color:var(--c-cobalt-hi)">KL2 KL4</span>
          <div style="flex-basis:100%"></div>
          <span class="k-key">Q</span><span class="k-key">E</span><span class="k-key">Shift</span><span class="k-key">Esc</span>
          <span class="t-micro">HOLD <span class="k-key">F</span> TO INTERACT</span>`,
      })}
      ${spec({
        code: 'FB-03',
        title: 'Toast',
        cls: "notify({ title, msg, state })",
        body: `
          <button class="k-btn k-btn--sm" data-toast="nominal">Nominal</button>
          <button class="k-btn k-btn--sm" data-toast="link">Link</button>
          <button class="k-btn k-btn--sm" data-toast="caution">Caution</button>
          <button class="k-btn k-btn--sm k-btn--danger" data-toast="critical">Critical</button>`,
        foot: 'Bottom-right stack. Stepped clip-in / clip-out, lifetime bar.',
      })}
    </div>
  </section>`;

  b.add(hydrate(root));
  const MSG: Record<string, [string, string]> = {
    nominal: ['Sync complete', 'Neural subroutines 07/07 mounted'],
    link: ['Link established', 'LINK-07 · latency 41ms'],
    caution: ['Thermal delta', '+0.4K above band — monitor'],
    critical: ['Integrity breach', 'Shell below 20% — evacuate'],
  };
  $$('[data-toast]', root).forEach((btn) =>
    b.add(
      on(btn, 'click', () => {
        const s = btn.dataset.toast!;
        notify({ title: MSG[s][0], msg: MSG[s][1], state: s });
      }),
    ),
  );
  return b.dispose;
}
