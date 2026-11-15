import { pageHead, section, spec } from './_ui';
import { icon } from '../lib/icons';

import { hydrate } from '../lib/hydrate';
import { notify } from '../lib/toast';
import { bag, on, $, $$ } from '../lib/util';

const ico = (n: string, s = 14) => icon(n, { size: s });
const price = (n: number | string, tc: string, icon = 'disk') => `<span class="mu-price" style="--tc:${tc}">${ico(icon, 11)}${n}</span>`;
const RARITY = ['var(--mu-green)', 'var(--mu-blue)', 'var(--mu-purple)', 'var(--mu-yellow)', 'var(--mu-red)'];
const TILES = [
  ['battery', 0, '×240'], ['target', 1, ''], ['bio', 2, ''], ['scan', 1, '×9'], ['lock', 3, ''], ['power', 2, '×6'],
  ['node', 4, ''], ['grid', 0, '×3'], ['link', 1, ''], ['eye', 3, '×6'], ['unit', 2, ''], ['wave', 0, '×4'],
] as const;
const PACK: Record<number, readonly [string, number, number]> = {
  0: ['battery', 0, 120], 1: ['target', 2, 900], 2: ['scan', 1, 300], 5: ['bio', 3, 2400], 8: ['grid', 0, 80], 9: ['link', 1, 260],
  10: ['eye', 4, 5200], 13: ['power', 2, 610], 16: ['node', 1, 330], 17: ['wave', 0, 90], 21: ['lock', 3, 1800], 24: ['unit', 2, 700],
};
const UNIQUE = [['target', 3, '6.3K', 1], ['scan', 1, '3.9K', 0], ['bio', 3, '5.0K', 1], ['eye', 2, '1.8K', 0], ['node', 4, '4.0K', 0], ['power', 2, '1.8K', 1], ['grid', 0, '200', 0], ['wave', 1, '3.0K', 0]] as const;
const FACTIONS = [['Relay Inc', 'notch'], ['Nucleo', 'slot'], ['Kelvin', 'arrow-r'], ['Vesta', 'cross'], ['Haldane', 'menu'], ['Periapt', 'grid']] as const;
const OFFERS = [['scan', 2, 15], ['scan', 2, 15], ['target', 3, 30], ['bio', 3, 30], ['wave', 4, 50], ['power', 0, 15]] as const;
const KIT = [['battery', 200, 0], ['scan', 30, 0], ['lock', 300, 0], ['node', 'Free', 0], ['plus', 300, 1], ['grid', 45, 1]] as const;
const CONTRACTS = [
  { title: 'Relay breaker', body: 'Run one relay breach.', state: 'claimed', reward: 'node', tags: ['I'] },
  { title: 'Apprentice breaker', body: 'Solve vault 01 or 02 and extract.', state: 'ready', reward: 'bio', tags: ['I'] },
  { title: 'Certified breaker', body: 'Solve vault 03 or 05 and extract.', state: 'ready', reward: 'target', tags: ['II'] },
  { title: 'Master breaker', body: 'Solve vault 07 and extract alive.', state: 'locked', reward: 'lock', tags: ['III'] },
] as const;

export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('03', 'Control<br><span class="t-outline">Surface</span>', ['MENU SLABS · BONE SELECTION', 'CUT STATES, NO FADES', 'KEYBOARD ACCESSIBLE'], 73)}
    <p class="page-lede">The in-game idiom: dark grey slabs with small radii on near-black, a serif for screen titles, a wide heavy
    grotesque on buttons, spaced mono for body copy. Selection inverts to a bone fill; focus is four white corner brackets; rewards
    are claimed on a lime bar. Classes are <b>.mu-*</b> in <b>styles/menu.css</b>.</p>

    ${section('Status bar', 'mu-bar · mu-pill · mu-tab')}
    <div class="mu-screen">
      <div class="mu-bar">
        <span class="mu-pill"><span class="mu-pill__lvl">${ico('eye', 20)}50</span><span class="mu-pill__rank"><i>${ico('plus', 14)}</i><i>${ico('menu', 14)}</i></span></span>
        <span class="mu-coin" style="color:#b03cff">${ico('disk', 16)}<span style="color:var(--mu-bone)">0</span></span>
        <span class="mu-coin" style="color:#2bd96b">${ico('menu', 16)}<span style="color:var(--mu-bone)">70</span></span>
        <span class="mu-coin" style="color:#3a8dff">${ico('node', 16)}<span style="color:var(--mu-bone)" data-coins>24,033</span></span>
        <div class="mu-tabs" role="tablist" aria-label="Screens">
          <span class="mu-shield">L1</span>
          <button class="mu-tab" role="tab" aria-selected="true">Shell select</button>
          <button class="mu-tab" role="tab" aria-selected="false">Vault</button>
          <button class="mu-tab" role="tab" aria-selected="false">Armory</button>
          <span class="mu-shield">R1</span>
        </div>
      </div>
    </div>

    ${section('Menu', 'mu-btn · mu-link · mu-hold')}
    <div class="spec-grid">
      ${spec({
        code: 'MU-01',
        title: 'Shell card',
        cls: '.mu-panel .mu-btn(.is-selected) .mu-link',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen"><div class="mu-panel mu-stack">
          <h3 class="mu-serif">Warden</h3>
          <div class="mu-sub">Perimeter specialist</div>
          ${[['grid', 'Bulwark system'], ['cross', 'Snare line'], ['eye', 'Prey index'], ['target', 'Hold doctrine']].map(([i, l]) => `<div class="mu-ability">${ico(i, 30)}<span>${l}</span></div>`).join('')}
          <button class="mu-btn"><span class="mu-key">▲</span>Abilities guide</button>
          <button class="mu-btn is-selected"><span class="mu-key">■</span>Access relay</button>
          <a class="mu-link" href="#/glyphs"><span class="mu-key mu-key--sq">R3</span>Customize profile<span>${ico('arrow-r', 12)}</span></a>
        </div></div>`,
        foot: 'Hover and keyboard focus take the bone fill in one cut.',
      })}
      ${spec({
        code: 'MU-02',
        title: 'Actions',
        cls: '.mu-btn--sm .mu-btn--lime .mu-hold[data-hold]',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen"><div class="mu-stack">
          <button class="mu-btn mu-btn--lime"><span class="mu-key">✕</span>Convert all</button>
          <button class="mu-btn mu-btn--sm"><span class="mu-key">○</span>Deselect all</button>
          <button class="mu-btn mu-btn--sm" disabled>${ico('lock', 14)}Locked until rank 20</button>
          <button class="mu-btn mu-hold" data-hold="1400"><span class="mu-key">◆</span><span data-label>Hold to purge vault</span></button>
          <div class="mu-bar" style="gap:8px">
            <button class="mu-btn mu-btn--sm" data-toast="nominal" style="width:auto">Sync</button>
            <button class="mu-btn mu-btn--sm" data-toast="link" style="width:auto">Link</button>
            <button class="mu-btn mu-btn--sm" data-toast="caution" style="width:auto">Thermal</button>
            <button class="mu-btn mu-btn--sm" data-toast="critical" style="width:auto">Breach</button>
          </div>
        </div></div>`,
        foot: 'Hold fills in 12 hard steps; release cancels. The small row fires toasts.',
      })}
      ${spec({
        code: 'MU-03',
        title: 'Tooltip',
        cls: '.mu-tip',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen" style="place-items:center;min-height:100%">
          <div class="mu-tip">
            <div class="mu-tip__title">Leech</div>
            <div class="mu-tip__row">${ico('bio', 26)}<span class="mu-body" style="color:var(--mu-bone)">Close-range strikes restore a small amount of shell integrity.</span></div>
            <div class="mu-tip__ok">${ico('check', 14)}Perk unlocked</div>
          </div>
        </div>`,
      })}
    </div>

    ${section('Contracts', 'mu-contract · mu-claim')}
    <div class="mu-screen">
      <div class="mu-head">[Y1] Relay breaker codex</div>
      <div class="mu-stack" id="mu-contracts">
        ${CONTRACTS.map((c, i) => `<div class="mu-contract is-${c.state}" data-contract="${i}">
          <div class="mu-contract__card">
            <div class="mu-contract__title">${c.title}</div>
            <div class="mu-stack" style="gap:4px">
              <span class="mu-body" style="color:var(--mu-bone)">${c.body}</span>
              <button class="mu-claim" ${c.state === 'ready' ? '' : 'disabled'}><span data-claim-label>${c.state === 'claimed' ? 'Claimed' : c.state === 'ready' ? 'Claim reward' : 'Locked'}</span><span class="mu-claim__steps">${'<i></i>'.repeat(6)}</span></button>
            </div>
          </div>
          <div class="mu-contract__reward">${ico(c.reward, 44)}<span class="mu-tags"><span>${c.tags[0]}</span><span>${ico('grid', 10)}</span></span></div>
        </div>`).join('')}
      </div>
    </div>

    ${section('Inventory', 'mu-tile · mu-price · bracket focus')}
    <div class="spec-grid spec-grid--2">
      ${spec({
        code: 'MU-04',
        title: 'Item grid',
        cls: '.mu-grid .mu-tile(.is-selected) .mu-tile__badge',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen"><div class="mu-grid" id="mu-grid" role="listbox" aria-label="Items">
          ${TILES.map(([icon, r, n], i) => `<button class="mu-tile${i === 4 ? ' is-selected' : ''}${i === 11 ? ' is-dim' : ''}" role="option" aria-selected="${i === 4}" style="--tc:${RARITY[r]}">
            <span class="mu-tile__badge">${ico('grid', 12)}</span>${ico(icon, 40)}${n ? `<span class="mu-tile__n">${n}</span>` : ''}</button>`).join('')}
        </div></div>`,
        foot: 'Click or arrow keys move the bracket. Badge colour is rarity.',
      })}
      ${spec({
        code: 'MU-05',
        title: 'Offers + price tags',
        cls: '.mu-price[--tc]',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen mu-stack">
          <div class="mu-head">[T2] Weekly offers</div>
          <div class="mu-bar" style="gap:6px">${price(15, 'var(--mu-purple)')}${price(30, 'var(--mu-yellow)')}${price(50, 'var(--mu-red)')}${price(150, 'var(--mu-green)')}${price(300, 'var(--mu-blue)')}${price('Free', 'var(--mu-green)', 'check')}</div>
          <div class="mu-head" style="margin-top:8px">[T1] Kit upgrades</div>
          <div class="mu-grid" style="grid-template-columns:repeat(4,1fr)">
            ${(['battery', 'target', 'menu', 'plus'] as const).map((n, i) => `<div class="mu-tile${i === 3 ? ' is-dim' : ''}" style="--tc:var(--mu-green)"><span class="mu-price" style="position:absolute;left:0;top:0;--tc:${i === 3 ? '#2e3037' : i % 2 ? '#c9cbd2' : 'var(--mu-green)'}">${ico('disk', 11)}${[200, 30, 300, 500][i]}</span>${ico(n, 40)}</div>`).join('')}
          </div>
        </div>`,
      })}
    </div>

    ${section('Loadout', 'mu-slot · mu-pack · mu-rail · mu-select')}
    <div class="mu-screen mu-load">
      <div class="mu-load__gear">
        ${['Weapon 1', 'Weapon 2'].map((l) => `<div class="mu-stack" style="gap:6px"><div class="mu-head">${l}</div>
          <div class="mu-slot mu-slot--wide"><svg class="mu-slot__cross" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M15 0h2v34h-2zM0 15h34v2H0zM47 30h2v34h-2zM30 47h34v2H30z"/></svg><span class="mu-slot__pen">${ico('arrow-r', 14)}</span></div></div>`).join('')}
        <div class="mu-load__row">
          <div class="mu-stack" style="gap:6px"><div class="mu-head">Equipment</div><div class="mu-slot">${ico('down', 18)}</div></div>
          <div class="mu-slot mu-slot--tall" style="--tc:var(--mu-red)">${ico('unit', 46)}</div>
          <div class="mu-stack" style="gap:6px"><div class="mu-head">Shield</div><div class="mu-slot is-filled" style="--tc:var(--mu-blue)">${ico('slot', 24)}</div></div>
        </div>
        <div class="mu-head">Implants</div>
        <div class="mu-load__row mu-load__row--3">${'<div class="mu-slot">' + ico('plus', 14) + '</div>'}${'<div class="mu-slot">' + ico('plus', 14) + '</div>'}${'<div class="mu-slot">' + ico('plus', 14) + '</div>'}</div>
      </div>
      <div class="mu-load__pack">
        <div class="mu-head" style="display:flex;justify-content:space-between"><span>Backpack</span><span data-pack-count>0/40</span></div>
        <div class="mu-pack" id="mu-pack" aria-label="Backpack">
          ${Array.from({ length: 40 }, (_, i) => {
            const it = PACK[i];
            return it ? `<button class="mu-pack__cell is-item" style="--tc:${RARITY[it[1]]}" data-value="${it[2]}" aria-pressed="false" aria-label="${it[0]}">${ico(it[0], 22)}</button>` : '<span class="mu-pack__cell"></span>';
          }).join('')}
        </div>
      </div>
      <div class="mu-rail" role="toolbar" aria-label="Filters">
        ${['unit', 'grid', 'arrow-r', 'lock', 'battery', 'down', 'menu'].map((n, i) => `<button class="mu-rail__btn" aria-pressed="${i === 1}" aria-label="${n}">${ico(n, 16)}</button>`).join('')}
      </div>
      <div class="mu-panel mu-load__conv">
        <div class="mu-wide-title">Matter converter</div>
        <p class="mu-body">Destroy items here to raise the energy capacity of your relay. Use that energy to tune the tracks of your shells.</p>
        <p class="mu-body">(Some items are incompatible with the converter. The relay apologises for the inconvenience.)</p>
        <button class="mu-link" data-pack-clear><span class="mu-key mu-key--sq" style="background:#3a3dff;color:#fff">○</span>Deselect all</button>
        <button class="mu-link" data-pack-all><span class="mu-key mu-key--sq">△</span>Select all</button>
      </div>
      <div class="mu-select">
        <span><b data-sel-n>0</b> items selected</span>
        <span>${ico('disk', 12)}<b data-sel-v>0</b></span>
        <span class="mu-select__xp">${ico('battery', 14)}<b data-sel-xp>0</b> XP</span>
        <span class="mu-select__lvl">${ico('bio', 12)}<b data-sel-lvl>0</b></span>
      </div>
    </div>

    ${section('Convert', 'mu-level · mu-progress · mu-btn--wide')}
    <div class="spec-grid spec-grid--2">
      ${spec({
        code: 'MU-08',
        title: 'Convert matter',
        cls: '.mu-level .mu-progress[--p] .mu-btn--lime',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen mu-stack mu-conv">
          <h3 class="mu-serif mu-serif--xl">Convert matter</h3>
          <p class="mu-body">Destroy items here to raise the energy capacity of your relay.<br>You can use this energy to tune the tracks of your shells.</p>
          <div class="mu-head" style="margin-top:18px">Current relay level</div>
          <div class="mu-level">
            <div class="mu-level__id"><b>LEVEL <span data-lvl>57</span><sup>↗</sup></b><small><span data-xp>106.3K</span>/111K <em>XP</em></small></div>
            <div class="mu-progress" data-prog style="--p:3;--q:5">${'<i></i>'.repeat(8)}</div>
            <div class="mu-level__chip">${ico('battery', 14)}<span data-chip>7</span></div>
          </div>
          <button class="mu-btn mu-btn--lime mu-btn--wide" data-convert><span class="mu-key" style="background:#000;color:var(--mu-lime)">✕</span><span data-convert-label>Convert items</span></button>
          <a class="mu-link mu-link--dismiss" href="#/controls"><span class="mu-dot"></span>Dismiss</a>
        </div>`,
        foot: 'Convert queues five blocks; each lands on a 120 ms step and the level rolls over when the bar fills.',
      })}
      ${spec({
        code: 'MU-09',
        title: 'Rare tiles',
        cls: '.mu-tile--unique · repeated-word texture',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen mu-stack">
          <div class="mu-head" style="display:flex;justify-content:space-between"><span>Items</span><span>48/512</span></div>
          <div class="mu-grid mu-grid--4">
            ${UNIQUE.map(([n, r, v, u]) => `<button class="mu-tile${u ? ' mu-tile--unique' : ''}" style="--tc:${RARITY[r]}">${u ? `<span class="mu-tile__word" aria-hidden="true">${'UNIQUE '.repeat(18)}</span>` : ''}
              <span class="mu-price" style="position:absolute;left:0;top:0;--tc:${RARITY[r]}">${ico('disk', 10)}${v}</span>${ico(n, 36)}</button>`).join('')}
          </div>
        </div>`,
        foot: 'Unique items carry their class word as a flat repeated texture behind the glyph.',
      })}
    </div>

    ${section('Armory', 'mu-list · mu-timer · tiered offers')}
    <div class="mu-screen mu-armory">
      <aside class="mu-stack" style="gap:4px">
        <div class="mu-head">Factions</div>
        ${FACTIONS.map(([n, i], k) => `<button class="mu-list${k === 2 ? ' is-on' : ''}" aria-pressed="${k === 2}">${ico(i, 14)}<span>${n}</span></button>`).join('')}
        <div class="mu-head" style="margin-top:14px">Events</div>
        <button class="mu-list mu-list--box" aria-pressed="false">${ico('scan', 14)}<span>Vault breaker</span></button>
      </aside>
      <div class="mu-stack">
        <div class="mu-timer">${ico('target', 14)}Armory refresh <b data-refresh>23:20</b></div>
        <div class="mu-head">[T2] Weekly offers</div>
        <div class="mu-grid mu-grid--6">${OFFERS.map(([n, r, v], k) => `<div class="mu-tile${k === 5 ? ' is-dim' : ''}" style="--tc:${RARITY[r]}"><span class="mu-price" style="position:absolute;left:0;top:0;--tc:${RARITY[r]}">${ico('disk', 10)}${v}</span>${ico(n, 30)}</div>`).join('')}</div>
        <div class="mu-head">[T1] Kit upgrades</div>
        <div class="mu-grid mu-grid--6">${KIT.map(([n, v, lock]) => `<div class="mu-tile mu-tile--flat${lock ? ' is-dim' : ''}" style="--tc:${lock ? '#2e3037' : 'var(--mu-green)'}"><span class="mu-price" style="position:absolute;left:0;top:0;--tc:${lock ? '#2e3037' : v === 'Free' ? 'var(--mu-green)' : '#c9cbd2'}">${ico(lock ? 'lock' : 'disk', 10)}${v}</span>${ico(n, 28)}</div>`).join('')}</div>
      </div>
    </div>

    ${section('Stats', 'mu-blocks · mu-meter')}
    <div class="spec-grid spec-grid--2">
      ${spec({
        code: 'MU-06',
        title: 'Track blocks',
        cls: '.mu-blocks[--n] i.is-on',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen mu-stack">
          ${[['Strength', '#e5492d', 13], ['Recharge', '#6f8697', 10], ['Dexterity', '#c9992b', 4], ['Endurance', '#7a62e0', 8]].map(([l, c, n]) => `<div class="mu-meter">
            <div class="mu-meter__row"><span>${String(l).toUpperCase()}</span><b>+${Number(n) * 4}</b></div>
            <div class="mu-blocks" style="--tc:${c}" data-blocks="${n}">${'<i></i>'.repeat(13)}</div></div>`).join('')}
        </div>`,
        foot: 'Use the stepper rows in MU-07 to move a track.',
      })}
      ${spec({
        code: 'MU-07',
        title: 'Settings',
        cls: '.mu-row .mu-seg .mu-check .mu-field .mu-range',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen mu-stack">
          <div class="mu-row"><span>Crosshair</span><span class="mu-seg" role="group" aria-label="Crosshair">${['Dot', 'Cross', 'Off'].map((l, i) => `<button aria-pressed="${i === 0}">${l}</button>`).join('')}</span></div>
          <div class="mu-row"><span>Strength track</span><span class="mu-seg" role="group" aria-label="Strength track"><button data-step="-1" aria-pressed="false">−</button><button aria-pressed="true" data-step-out>13</button><button data-step="1" aria-pressed="false">+</button></span></div>
          <label class="mu-row mu-check"><span>Show item value</span><input type="checkbox" checked><i></i></label>
          <label class="mu-row mu-check"><span>Squad voice</span><input type="checkbox"><i></i></label>
          <label class="mu-field"><span>Callsign</span><input value="RUNNER-07" maxlength="12"></label>
          <label class="mu-field is-error"><span>Access code <em>· checksum mismatch</em></span><input value="00X-17"></label>
          <label class="mu-field"><span>Destination</span><select><option>Periapt IV · ring 7</option><option>Outer relay</option><option>Deep archive</option></select></label>
          <div class="mu-meter mu-range"><div class="mu-meter__row"><span>Signal gain</span><strong data-gain>75<sup>↗</sup></strong></div>
            <div class="mu-meter__bar" style="--p:75%" data-gain-bar></div><input type="range" min="0" max="100" value="75" aria-label="Signal gain"></div>
        </div>`,
      })}
    </div>

    ${section('Calls to action', 'mu-cta · stepped lime block')}
    <div class="spec-grid">
      <a class="mu-cta" href="#/spatial"><small>Open spatial module<br>WebGPU renderer</small><b>Enter<br>shell</b></a>
      <a class="mu-cta" href="#/fault" style="--tc:var(--mu-red)"><small>Inject runtime fault<br>Recoverable</small><b>Trigger<br>fault</b></a>
      <a class="mu-cta" href="#/telemetry" style="--tc:#5a1eff;color:#fff"><small>Board modules<br>Canvas 2D</small><b>Open<br>board</b></a>
    </div>

    ${section('Footer', 'mu-foot · key hints')}
    <div class="mu-screen" style="padding:0">
      <div class="mu-foot">
        <span>Back</span>
        <span>Show item value <span class="mu-key mu-key--sq">${ico('grid', 10)}</span><span class="mu-key mu-key--sq" style="background:var(--mu-lime);color:#000">${ico('check', 10)}</span></span>
        <div class="mu-foot__right">
          <span class="mu-party"><span>${ico('lock', 14)}</span><span class="is-me">${ico('grid', 14)}</span><span>${ico('lock', 14)}</span></span>
          <button class="mu-icon-btn">${ico('unit', 16)}0</button>
          <button class="mu-icon-btn" aria-label="Messages">${ico('menu', 16)}</button>
          <button class="mu-icon-btn" aria-label="Settings">${ico('target', 16)}</button>
          <button class="mu-icon-btn" aria-label="Help">?</button>
          <button class="mu-icon-btn mu-alert" aria-label="Alert">!</button>
        </div>
      </div>
    </div>
  </section>`;

  b.add(hydrate(root));

  // screen tabs
  const tabs = $$<HTMLButtonElement>('.mu-tab', root);
  tabs.forEach((t) => b.add(on(t, 'click', () => tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t))))));

  // segmented groups (not the stepper)
  $$<HTMLElement>('.mu-seg', root).forEach((g) => {
    if (g.querySelector('[data-step]')) return;
    const btns = $$<HTMLButtonElement>('button', g);
    btns.forEach((x) => b.add(on(x, 'click', () => btns.forEach((y) => y.setAttribute('aria-pressed', String(y === x))))));
  });

  // track blocks + stepper
  const paintBlocks = () => $$<HTMLElement>('[data-blocks]', root).forEach((el) => [...el.children].forEach((c, i) => c.classList.toggle('is-on', i < Number(el.dataset.blocks))));
  paintBlocks();
  const out = $('[data-step-out]', root);
  $$<HTMLButtonElement>('[data-step]', root).forEach((btn) =>
    b.add(on(btn, 'click', () => {
      const first = $<HTMLElement>('[data-blocks]', root);
      const n = Math.max(0, Math.min(13, Number(first.dataset.blocks) + Number(btn.dataset.step)));
      first.dataset.blocks = String(n);
      out.textContent = String(n).padStart(2, '0');
      paintBlocks();
    })),
  );

  // gain
  const gain = $<HTMLInputElement>('.mu-range input', root);
  b.add(on(gain, 'input', () => {
    $('[data-gain]', root).innerHTML = `${gain.value}<sup>↗</sup>`;
    $('[data-gain-bar]', root).style.setProperty('--p', `${gain.value}%`);
  }));

  // item grid: click or arrows move the bracket
  const tiles = $$<HTMLButtonElement>('#mu-grid .mu-tile', root);
  const select = (k: number) => tiles.forEach((t, i) => {
    t.classList.toggle('is-selected', i === k);
    t.setAttribute('aria-selected', String(i === k));
    if (i === k) t.focus({ preventScroll: true });
  });
  tiles.forEach((t, i) => {
    b.add(on(t, 'click', () => select(i)));
    b.add(on(t, 'keydown', (e: KeyboardEvent) => {
      const cols = Math.round(t.parentElement!.clientWidth / t.clientWidth) || 6;
      const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (d == null) return;
      e.preventDefault();
      select(Math.max(0, Math.min(tiles.length - 1, i + d)));
    }));
  });

  // contracts: claiming steps the bar in six cuts
  $$<HTMLElement>('[data-contract]', root).forEach((card) => {
    const btn = $<HTMLButtonElement>('.mu-claim', card);
    b.add(on(btn, 'click', () => {
      btn.disabled = true;
      const steps = $$<HTMLElement>('.mu-claim__steps i', card);
      const label = $('[data-claim-label]', card);
      label.textContent = 'Claiming';
      steps.forEach((s, k) => setTimeout(() => s.classList.add('is-on'), 90 * (k + 1)));
      setTimeout(() => {
        card.classList.replace('is-ready', 'is-claimed');
        label.textContent = 'Claimed';
        notify({ title: 'Reward claimed', msg: $('.mu-contract__title', card).textContent ?? '', state: 'link' });
      }, 90 * 7);
    }));
  });

  // loadout: picking backpack items feeds the selection bar
  const cells = $$<HTMLButtonElement>('#mu-pack .is-item', root);
  const paintSel = () => {
    const on = cells.filter((c) => c.getAttribute('aria-pressed') === 'true');
    const v = on.reduce((a, c) => a + Number(c.dataset.value), 0);
    $('[data-sel-n]', root).textContent = String(on.length);
    $('[data-sel-v]', root).textContent = v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
    $('[data-sel-xp]', root).textContent = `${(v * 3.4 / 1000).toFixed(1)}K`;
    $('[data-sel-lvl]', root).textContent = String(Math.floor(v / 1500));
    $('[data-pack-count]', root).textContent = `${cells.length}/40`;
    $('.mu-select', root).classList.toggle('is-live', on.length > 0);
  };
  cells.forEach((c) => b.add(on(c, 'click', () => { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); paintSel(); })));
  b.add(on($('[data-pack-clear]', root), 'click', () => { cells.forEach((c) => c.setAttribute('aria-pressed', 'false')); paintSel(); }));
  b.add(on($('[data-pack-all]', root), 'click', () => { cells.forEach((c) => c.setAttribute('aria-pressed', 'true')); paintSel(); }));
  paintSel();
  const rail = $$<HTMLButtonElement>('.mu-rail__btn', root);
  rail.forEach((x) => b.add(on(x, 'click', () => rail.forEach((y) => y.setAttribute('aria-pressed', String(y === x))))));
  const fac = $$<HTMLButtonElement>('.mu-armory .mu-list', root);
  fac.forEach((x) => b.add(on(x, 'click', () => fac.forEach((y) => { y.classList.toggle('is-on', y === x); y.setAttribute('aria-pressed', String(y === x)); }))));

  // convert: five blocks land on 120 ms steps, the level rolls over at 8
  const prog = $('[data-prog]', root);
  const paintProg = () => {
    const p = Number(prog.style.getPropertyValue('--p'));
    [...prog.children].forEach((c, i) => { c.classList.toggle('is-on', i < p); c.classList.toggle('is-q', i >= p && i < p + 2); });
  };
  paintProg();
  const conv = $<HTMLButtonElement>('[data-convert]', root);
  let busy = false;
  b.add(on(conv, 'click', () => {
    if (busy) return;
    busy = true;
    conv.classList.add('is-busy');
    $('[data-convert-label]', root).textContent = 'Converting';
    let k = 0;
    const tick = window.setInterval(() => {
      let p = Number(prog.style.getPropertyValue('--p')) + 1;
      let lvl = Number($('[data-lvl]', root).textContent);
      if (p > 8) { p = 1; lvl++; $('[data-lvl]', root).textContent = String(lvl); notify({ title: 'Relay level up', msg: `Level ${lvl} · capacity +1`, state: 'nominal' }); }
      prog.style.setProperty('--p', String(p));
      paintProg();
      $('[data-xp]', root).textContent = `${(100 + p * 1.4).toFixed(1)}K`;
      $('[data-chip]', root).textContent = String(Number($('[data-chip]', root).textContent) + 1);
      if (++k >= 5) {
        window.clearInterval(tick);
        busy = false;
        conv.classList.remove('is-busy');
        $('[data-convert-label]', root).textContent = 'Convert items';
      }
    }, 120);
    b.add(() => window.clearInterval(tick));
  }));

  // armory refresh counts down in whole seconds
  const refresh = $('[data-refresh]', root);
  let left = 23 * 60 + 20;
  const clock = window.setInterval(() => {
    left = left > 0 ? left - 1 : 23 * 60 + 20;
    refresh.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  }, 1000);
  b.add(() => window.clearInterval(clock));

  const MSG: Record<string, [string, string]> = {
    nominal: ['Sync complete', 'Neural subroutines 07/07 mounted'],
    link: ['Link established', 'LINK-07 · latency 41ms'],
    caution: ['Thermal delta', '+0.4K above band — monitor'],
    critical: ['Integrity breach', 'Shell below 20% — evacuate'],
  };
  $$('[data-toast]', root).forEach((btn) =>
    b.add(on(btn, 'click', () => {
      const s = btn.dataset.toast!;
      notify({ title: MSG[s][0], msg: MSG[s][1], state: s });
    })),
  );
  return b.dispose;
}
