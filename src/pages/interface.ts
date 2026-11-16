import { pageHead, section, spec } from './_ui';
import { icon } from '../lib/icons';
import { emblem } from '../lib/glyphs';
import { CRADLE_BLOCKS, CRADLE_STATS, cradleHTML, mountCradle } from '../lib/board';
import { hydrate } from '../lib/hydrate';
import { notify } from '../lib/toast';
import { bag, on, $, $$ } from '../lib/util';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */
const ico = (n: string, s = 14) => icon(n, { size: s });
const RARITY = ['#2bd96b', '#3a8dff', '#b03cff', '#ffd400', '#ff3b3b'];
const RARITY_NAME = ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'];
const fmt = (n: number) => n.toLocaleString('en-US');

const SHELLS = [
  { name: 'Warden', role: 'Perimeter specialist', ink: '#c6ff00', seed: 3, abilities: [['grid', 'Bulwark system', 'Drops a two-panel wall that takes the first 120 damage.'], ['cross', 'Snare line', 'A tripwire that roots the first runner to cross it.'], ['eye', 'Prey index', 'Marks every runner inside 30 m for four seconds.'], ['target', 'Hold doctrine', 'Standing still slowly restores shell integrity.']] },
  { name: 'Lancer', role: 'Breach assault', ink: '#ff3b3b', seed: 11, abilities: [['arrow-r', 'Slip charge', 'A short dash that ignores the first hit.'], ['power', 'Overvolt', 'Next three shots stagger.'], ['scan', 'Breach scan', 'Reveals doors and caches through walls.'], ['bio', 'Second wind', 'Below 20% integrity, regain a block once.']] },
  { name: 'Veil', role: 'Recon operative', ink: '#3a8dff', seed: 19, abilities: [['eye', 'Ghost step', 'Footsteps go silent for six seconds.'], ['wave', 'Echo ping', 'A pulse that outlines movement.'], ['node', 'Relay hop', 'Swap places with a placed beacon.'], ['lock', 'Quiet lock', 'Opens locked caches without noise.']] },
  { name: 'Rook', role: 'Fortification', ink: '#ffd400', seed: 27, abilities: [['slot', 'Anchor', 'Cannot be moved while braced.'], ['battery', 'Capacitor', 'Shield recharges twice as fast.'], ['grid', 'Bastion', 'Deploys cover for the whole crew.'], ['plus', 'Field mend', 'Heals the nearest ally once per life.']] },
  { name: 'Moth', role: 'Support medic', ink: '#2fe0a8', seed: 35, abilities: [['plus', 'Swarm mend', 'Restores integrity to allies in range.'], ['link', 'Tether', 'Shares damage with a linked ally.'], ['bio', 'Revive', 'Brings back a downed runner at 40%.'], ['wave', 'Calm field', 'Slows enemies inside the field.']] },
  { name: 'Ferry', role: 'Logistics', ink: '#b03cff', seed: 43, abilities: [['down', 'Drop cache', 'Calls a small supply drop.'], ['unit', 'Carry', 'Backpack holds eight more items.'], ['notch', 'Fast trade', 'Converts matter on the move.'], ['arrow-r', 'Exfil line', 'Marks the nearest exit for the crew.']] },
  { name: 'Scald', role: 'Area denial', ink: '#ff7a1a', seed: 51, abilities: [['warn', 'Burn line', 'A strip of fire that lasts five seconds.'], ['target', 'Ignite', 'Sets the target alight.'], ['power', 'Flashover', 'Detonates every burning surface.'], ['cross', 'Heat sink', 'Immune to fire for a short time.']] },
  { name: 'Tally', role: 'Signal hacker', ink: '#ececec', seed: 59, abilities: [['scan', 'Spoof', 'Turns an enemy turret for ten seconds.'], ['node', 'Mesh', 'Links nearby terminals.'], ['eye', 'Overwatch', 'Sees through the nearest camera.'], ['link', 'Ghost key', 'Copies the last keycard used nearby.']] },
] as const;

const PACK = [
  ['battery', 0, 120], ['target', 2, 900], ['scan', 1, 300], ['bio', 3, 2400], ['grid', 0, 80], ['link', 1, 260],
  ['eye', 4, 5200], ['power', 2, 610], ['node', 1, 330], ['wave', 0, 90], ['lock', 3, 1800], ['unit', 2, 700],
  ['plus', 0, 60], ['slot', 1, 410],
] as const;
const PACK_AT = [0, 1, 2, 5, 8, 9, 10, 13, 16, 17, 21, 24, 30, 33];

const FACTIONS = [['All', 'grid'], ['Relay Inc', 'notch'], ['Nucleo', 'slot'], ['Kelvin', 'arrow-r'], ['Vesta', 'cross'], ['Haldane', 'menu']] as const;
const OFFERS = [
  { n: 'Breach scope', i: 'scan', r: 2, p: 150, f: 1 }, { n: 'Signal lens', i: 'target', r: 3, p: 300, f: 2 },
  { n: 'Med patch', i: 'bio', r: 0, p: 30, f: 5 }, { n: 'Wave relay', i: 'wave', r: 4, p: 500, f: 3 },
  { n: 'Cell pack', i: 'battery', r: 1, p: 45, f: 1 }, { n: 'Lock jack', i: 'lock', r: 3, p: 260, f: 4 },
  { n: 'Node key', i: 'node', r: 2, p: 120, f: 2 }, { n: 'Power core', i: 'power', r: 4, p: 640, f: 3 },
  { n: 'Field kit', i: 'plus', r: 0, p: 'Free', f: 5 }, { n: 'Grid map', i: 'grid', r: 1, p: 60, f: 4 },
  { n: 'Eye tap', i: 'eye', r: 2, p: 180, f: 1 }, { n: 'Link spool', i: 'link', r: 0, p: 25, f: 5 },
] as const;


const CONTRACTS = [
  { title: 'Relay breaker', body: 'Run one relay breach.', state: 'claimed', reward: 'node', tier: 'I', pay: 40 },
  { title: 'Apprentice breaker', body: 'Solve vault 01 or 02 and extract.', state: 'ready', reward: 'bio', tier: 'I', pay: 80 },
  { title: 'Certified breaker', body: 'Solve vault 03 or 05 and extract.', state: 'ready', reward: 'target', tier: 'II', pay: 160 },
  { title: 'Master breaker', body: 'Solve vault 07 and extract alive.', state: 'locked', reward: 'lock', tier: 'III', pay: 400 },
] as const;

const SCREENS = ['shell', 'vault', 'armory', 'relay', 'contracts'] as const;
type Screen = (typeof SCREENS)[number];
const HINTS: Record<Screen, string[][]> = {
  shell: [['↑↓←→', 'Select shell'], ['Enter', 'Access relay'], ['Q / E', 'Screens']],
  vault: [['Click', 'Select item'], ['Hold', 'Convert selected'], ['Q / E', 'Screens']],
  armory: [['Click', 'Preview'], ['Hold', 'Purchase'], ['Q / E', 'Screens']],
  relay: [['+ / −', 'Move energy'], ['Hover', 'Track perk'], ['Q / E', 'Screens']],
  contracts: [['Click', 'Claim reward'], ['Q / E', 'Screens']],
};

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */
const shellScreen = () => `
  <section class="ma-screen ma-select" data-screen="shell">
    <div class="ma-col">
      <div class="mu-head">Shells</div>
      <div class="ma-shells" role="listbox" aria-label="Shells">
        ${SHELLS.map((s, i) => `<button class="ma-shell${i === 0 ? ' is-selected' : ''}" role="option" aria-selected="${i === 0}" data-shell="${i}" style="--tc:${s.ink}">${emblem(s.seed, { size: 54 })}</button>`).join('')}
      </div>
    </div>
    <div class="ma-stage" data-shell-stage>
      <span class="ma-stage__id">ID-P · <b data-shell-code>WD-03</b></span>
      <div class="ma-stage__mark" data-shell-mark></div>
      <span class="ma-stage__name" data-shell-big></span>
      <span class="ma-stage__x" aria-hidden="true">${ico('plus', 18)}</span>
    </div>
    <div class="mu-panel ma-card">
      <h3 class="mu-serif" data-shell-name></h3>
      <div class="mu-sub" data-shell-role></div>
      <div class="ma-abilities" data-shell-abilities></div>
      <div class="mu-tip ma-tip" data-shell-tip hidden><div class="mu-tip__title"></div><div class="mu-tip__row"><span></span><span class="mu-body"></span></div></div>
      <div class="mu-stack" style="gap:8px;margin-top:auto">
        <button class="mu-btn mu-btn--sm" data-act="guide"><span class="mu-key">▲</span>Abilities guide</button>
        <button class="mu-btn mu-btn--sm is-selected" data-act="access"><span class="mu-key">■</span>Access relay</button>
        <button class="mu-link" data-act="profile"><span class="mu-key mu-key--sq">R3</span>Customize profile<span style="margin-left:auto">${ico('arrow-r', 12)}</span></button>
      </div>
    </div>
  </section>`;

const vaultScreen = () => `
  <section class="ma-screen ma-vault" data-screen="vault" hidden>
    <div class="ma-col ma-gear">
      ${['Weapon 1', 'Weapon 2'].map((l) => `<div class="mu-head">${l}</div>
        <div class="mu-slot mu-slot--wide"><svg class="mu-slot__cross" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M15 0h2v34h-2zM0 15h34v2H0zM47 30h2v34h-2zM30 47h34v2H30z"/></svg><span class="mu-slot__pen">${ico('arrow-r', 14)}</span></div>`).join('')}
      <div class="ma-gear__row">
        <div><div class="mu-head">Equipment</div><div class="mu-slot">${ico('down', 18)}</div></div>
        <div class="mu-slot mu-slot--tall" style="--tc:var(--mu-red)">${ico('unit', 44)}</div>
        <div><div class="mu-head">Shield</div><div class="mu-slot is-filled" style="--tc:var(--mu-blue)">${ico('slot', 22)}</div></div>
      </div>
      <div class="mu-head">Implants</div>
      <div class="ma-gear__row ma-gear__row--3">${`<div class="mu-slot">${ico('plus', 14)}</div>`.repeat(3)}</div>
    </div>
    <div class="ma-col">
      <div class="mu-head ma-split"><span>Backpack</span><span data-pack-count></span></div>
      <div class="ma-pack" data-pack>
        ${Array.from({ length: 40 }, (_, i) => {
          const k = PACK_AT.indexOf(i);
          if (k < 0) return '<span class="ma-cell"></span>';
          const [n, r, v] = PACK[k];
          return `<button class="ma-cell is-item" style="--tc:${RARITY[r]}" data-value="${v}" aria-pressed="false" aria-label="${n}">${ico(n, 24)}</button>`;
        }).join('')}
      </div>
    </div>
    <div class="mu-rail" role="toolbar" aria-label="Filters">
      ${['unit', 'grid', 'arrow-r', 'lock', 'battery', 'down', 'menu'].map((n, i) => `<button class="mu-rail__btn" aria-pressed="${i === 1}" aria-label="${n}">${ico(n, 16)}</button>`).join('')}
    </div>
    <div class="mu-panel ma-conv">
      <div class="mu-wide-title">Matter converter</div>
      <p class="mu-body">Destroy items here to raise the energy capacity of your relay. Energy tunes the tracks of your shells.</p>
      <p class="mu-body">(Some items are incompatible with the converter. The relay apologises for the inconvenience.)</p>
      <button class="mu-link" data-pack-all><span class="mu-key mu-key--sq">△</span>Select all</button>
      <button class="mu-link" data-pack-clear><span class="mu-key mu-key--sq" style="background:#3a3dff;color:#fff">○</span>Deselect all</button>
      <button class="mu-btn mu-btn--sm mu-btn--lime mu-hold ma-convert" data-hold="900" disabled><span class="mu-key" style="background:#000;color:var(--mu-lime)">✕</span><span data-label>Hold to convert</span></button>
    </div>
    <div class="mu-select">
      <span><b data-sel-n>0</b> items selected</span>
      <span>${ico('disk', 12)}<b data-sel-v>0</b></span>
      <span class="mu-select__xp">${ico('battery', 14)}<b data-sel-xp>0</b> energy</span>
    </div>
  </section>`;

const armoryScreen = () => `
  <section class="ma-screen ma-armory" data-screen="armory" hidden>
    <aside class="ma-col" style="gap:4px">
      <div class="mu-head">Factions</div>
      ${FACTIONS.map(([n, i], k) => `<button class="mu-list${k === 0 ? ' is-on' : ''}" aria-pressed="${k === 0}" data-faction="${k}">${ico(i, 14)}<span>${n}</span></button>`).join('')}
      <div class="mu-head" style="margin-top:14px">Events</div>
      <button class="mu-list mu-list--box" aria-pressed="false">${ico('scan', 14)}<span>Vault breaker</span></button>
    </aside>
    <div class="ma-col">
      <div class="mu-timer">${ico('target', 14)}Armory refresh <b data-refresh>23:20</b></div>
      <div class="mu-head">[T2] Weekly offers</div>
      <div class="ma-offers" data-offers>
        ${OFFERS.map((o, k) => `<button class="mu-tile ma-offer" style="--tc:${RARITY[o.r]}" data-offer="${k}" data-f="${o.f}"><span class="mu-price" style="position:absolute;left:0;top:0;--tc:${RARITY[o.r]}">${ico(o.p === 'Free' ? 'check' : 'disk', 10)}${o.p}</span>${ico(o.i, 34)}<span class="ma-owned">${ico('check', 10)} Owned</span></button>`).join('')}
      </div>
    </div>
    <div class="mu-panel ma-preview" data-preview>
      <div class="ma-preview__art" data-pv-art></div>
      <span class="mu-price" data-pv-tag></span>
      <h3 class="mu-wide-title" data-pv-name></h3>
      <p class="mu-body" data-pv-body></p>
      <button class="mu-btn mu-btn--sm mu-hold" data-hold="900" data-buy><span class="mu-key">■</span><span data-label>Hold to purchase</span></button>
    </div>
  </section>`;

const relayScreen = () => `
  <section class="ma-screen ma-relay" data-screen="relay" hidden>
    <div class="ma-col" data-cradle>${cradleHTML({ controls: true, bare: true })}</div>
    <div class="mu-panel ma-perk" data-perk>
      <div class="mu-head">Track perks</div>
      <div class="mu-tip__title" data-perk-name></div>
      <p class="mu-body" data-perk-body></p>
      <div class="mu-tip__ok" data-perk-state></div>
      <div class="ma-perk__nodes" data-perk-nodes></div>
      <p class="mu-body ma-perk__hint">Energy comes from converting items in the vault and from contract rewards.</p>
    </div>
  </section>`;

const contractsScreen = () => `
  <section class="ma-screen ma-contracts" data-screen="contracts" hidden>
    <div class="ma-col">
    <div class="mu-head">[Y1] Relay breaker codex</div>
    <div class="ma-contracts__list">
      ${CONTRACTS.map((c, i) => `<div class="mu-contract is-${c.state}" data-contract="${i}" data-pay="${c.pay}">
        <div class="mu-contract__card">
          <div class="mu-contract__title">${c.title}</div>
          <div class="mu-stack" style="gap:6px">
            <span class="mu-body" style="color:var(--mu-bone)">${c.body}</span>
            <button class="mu-claim" ${c.state === 'ready' ? '' : 'disabled'}><span data-claim-label>${c.state === 'claimed' ? 'Claimed' : c.state === 'ready' ? `Claim ${c.pay} credits` : 'Locked'}</span><span class="mu-claim__steps">${'<i></i>'.repeat(6)}</span></button>
          </div>
        </div>
        <div class="mu-contract__reward">${ico(c.reward, 40)}<span class="mu-tags"><span>${c.tier}</span><span>${ico('grid', 10)}</span></span></div>
      </div>`).join('')}
    </div>
    </div>
    <div class="mu-panel ma-codex">
      <h3 class="mu-serif">Codex</h3>
      <p class="mu-body">Claim every breaker contract this cycle to unlock the codex mark.</p>
      <div class="mu-head ma-split"><span>Progress</span><span><b data-codex-n>1</b>/4</span></div>
      <div class="ma-codex__blocks" data-codex>${'<i></i>'.repeat(4)}</div>
      <div class="ma-codex__mark" data-codex-mark>${emblem(77, { size: 150 })}</div>
      <div class="mu-tip__ok ma-codex__state" data-codex-state>${ico('lock', 14)}Locked · 3 left</div>
    </div>
  </section>`;

const app = () => `
  <div class="ma-frame" data-app-frame>
    <div class="ma-app mu-screen" tabindex="0" aria-label="Menu prototype. Q and E switch screens." data-app>
      <header class="ma-bar">
        <span class="mu-pill"><span class="mu-pill__lvl">${ico('eye', 18)}<span data-bar-lvl>50</span></span><span class="mu-pill__rank"><i>${ico('plus', 12)}</i><i>${ico('menu', 12)}</i></span></span>
        <span class="mu-coin" style="color:#b03cff">${ico('disk', 16)}<span style="color:var(--mu-bone)" data-energy>0</span></span>
        <span class="mu-coin" style="color:#3a8dff">${ico('node', 16)}<span style="color:var(--mu-bone)" data-coins>2,400</span></span>
        <div class="mu-tabs" role="tablist" aria-label="Screens">
          <span class="mu-shield">Q</span>
          ${SCREENS.map((s, i) => `<button class="mu-tab" role="tab" aria-selected="${i === 0}" data-tab="${s}">${s === 'shell' ? 'Shell select' : s}</button>`).join('')}
          <span class="mu-shield">E</span>
        </div>
      </header>
      <div class="ma-body">${shellScreen()}${vaultScreen()}${armoryScreen()}${relayScreen()}${contractsScreen()}</div>
      <footer class="mu-foot ma-foot">
        <span class="ma-hints" data-hints></span>
        <div class="mu-foot__right">
          <span class="mu-party"><span>${ico('lock', 14)}</span><span class="is-me">${ico('grid', 14)}</span><span>${ico('lock', 14)}</span></span>
          <button class="mu-icon-btn" aria-label="Messages" data-ping="Messages">${ico('menu', 16)}</button>
          <button class="mu-icon-btn" aria-label="Settings" data-ping="Settings">${ico('target', 16)}</button>
          <button class="mu-icon-btn mu-alert" aria-label="Alert" data-ping="Alert">!</button>
        </div>
      </footer>
    </div>
  </div>`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function mount(root: HTMLElement) {
  const b = bag();
  root.innerHTML = `
  <section class="page">
    ${pageHead('04', 'Inter<br><span class="t-outline">face</span>', ['IN-GAME MENU IDIOM', 'BONE SELECTION · BRACKET FOCUS', 'CUT STATES, NO FADES'], 73)}
    <p class="page-lede">Menus follow the in-game screens: dark grey slabs with small radii on near-black, a serif for screen titles,
    a wide heavy grotesque on buttons, spaced mono for body copy. Selection inverts to a bone fill; focus is four white corner
    brackets; rewards land on a lime bar. Classes are <b>.mu-*</b> in <b>styles/menu.css</b>.</p>

    ${section('Menu prototype', 'IF-01 · CLICK OR FOCUS, THEN Q / E')}
    ${app()}

    ${section('Components', '.mu-btn · .mu-hold · .mu-row · .k-alert · .k-modal')}
    <div class="spec-grid spec-grid--2 if-grid">
      ${spec({
        code: 'IF-02',
        title: 'Buttons',
        cls: '.mu-btn(.is-selected|--lime|--danger|--sm) · .mu-hold[data-hold]',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen if-buttons">
          <button class="mu-btn"><span class="mu-key">▲</span>Abilities guide</button>
          <button class="mu-btn is-selected"><span class="mu-key">■</span>Access relay</button>
          <button class="mu-btn mu-btn--lime"><span class="mu-key" style="background:#000;color:var(--mu-lime)">✕</span>Convert items</button>
          <button class="mu-btn mu-hold" data-hold="1400"><span class="mu-key">◆</span><span data-label>Hold to purge vault</span></button>
          <div class="if-row">
            <button class="mu-btn mu-btn--sm">Small</button>
            <button class="mu-btn mu-btn--sm mu-btn--danger">Danger</button>
            <button class="mu-btn mu-btn--sm" disabled>${ico('lock', 14)}Locked</button>
          </div>
        </div>`,
        foot: 'Hover and focus take the bone fill in one cut. The hold fills in 12 steps; release cancels.',
      })}
      ${spec({
        code: 'IF-03',
        title: 'Settings',
        cls: '.mu-row .mu-seg .mu-check .mu-field .mu-range',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen mu-stack">
          <div class="mu-row"><span>Crosshair</span><span class="mu-seg" role="group" aria-label="Crosshair">${['Dot', 'Cross', 'Off'].map((l, i) => `<button aria-pressed="${i === 0}">${l}</button>`).join('')}</span></div>
          <label class="mu-row mu-check"><span>Show item value</span><input type="checkbox" checked><i></i></label>
          <label class="mu-row mu-check"><span>Squad voice</span><input type="checkbox"><i></i></label>
          <label class="mu-field"><span>Callsign</span><input value="RUNNER-07" maxlength="12"></label>
          <label class="mu-field is-error"><span>Access code <em>· checksum mismatch</em></span><input value="00X-17"></label>
          <div class="mu-meter mu-range"><div class="mu-meter__row"><span>Signal gain</span><strong data-gain>75<sup>↗</sup></strong></div>
            <div class="mu-meter__bar" style="--p:75%" data-gain-bar></div><input type="range" min="0" max="100" value="75" aria-label="Signal gain"></div>
        </div>`,
      })}
      ${spec({
        code: 'IF-04',
        title: 'Alerts and toasts',
        cls: '.k-alert[data-state] · notify()',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen mu-stack">
          <div class="k-alert" data-state="nominal"><span>${ico('check', 14)}</span><div><b>Sync complete</b><p>Neural subroutines 07/07 mounted.</p></div></div>
          <div class="k-alert" data-state="caution"><span>${ico('warn', 14)}</span><div><b>Thermal delta</b><p>+0.4K above band. Monitor core temp.</p></div></div>
          <div class="k-alert" data-state="critical"><span>${ico('cross', 14)}</span><div><b>Packet loss</b><p>Uplink unstable — 12% dropped.</p></div></div>
          <div class="if-row">${['nominal', 'link', 'caution', 'critical'].map((s) => `<button class="mu-btn mu-btn--sm" data-toast="${s}">${s}</button>`).join('')}</div>
        </div>`,
        foot: 'The row fires toasts in each state.',
      })}
      ${spec({
        code: 'IF-05',
        title: 'Confirm modal',
        cls: '.k-modal',
        bodyCls: 'spec-body--flush',
        body: `<div class="mu-screen if-modal-demo">
          <p class="mu-body">A slab on a solid black field. Stepped scale-in; Esc closes.</p>
          <button class="mu-btn mu-btn--sm mu-btn--danger" data-modal-open style="width:auto"><span class="mu-key">✕</span>Purge block 0x3F</button>
        </div>`,
      })}
    </div>
  </section>

  <div class="k-modal" data-modal hidden>
    <div class="k-modal__card" role="dialog" aria-modal="true" aria-labelledby="if-modal-t">
      <h3 class="mu-serif" id="if-modal-t">Purge block 0x3F</h3>
      <p class="mu-body">This cannot be reversed. Every engram in sector 7 is defragmented and the block returns to the pool.</p>
      <div class="mu-stack" style="gap:8px">
        <button class="mu-btn mu-btn--sm" data-close><span class="mu-key">○</span>Cancel</button>
        <button class="mu-btn mu-btn--sm mu-btn--danger" data-close data-confirm><span class="mu-key">✕</span>Purge block</button>
      </div>
    </div>
  </div>`;

  b.add(hydrate(root));

  /* ---------- frame scaling: the app is drawn at 1280 × 720 ---------- */
  const frame = $('[data-app-frame]', root);
  const appEl = $('[data-app]', root);
  const ro = new ResizeObserver(() => frame.style.setProperty('--k', String(frame.clientWidth / 1280)));
  ro.observe(frame);
  b.add(() => ro.disconnect());

  /* ---------- shared state ---------- */
  const state = { coins: 2400, energy: 0, pool: 3, xp: 5482, level: 50 };
  const paintBar = () => {
    $('[data-coins]', appEl).textContent = fmt(state.coins);
    $('[data-energy]', appEl).textContent = fmt(state.energy);
    $('[data-pool]', appEl).textContent = String(state.pool);
    $('[data-lvl]', appEl).textContent = String(state.level);
    $('[data-bar-lvl]', appEl).textContent = String(state.level);
    $('[data-xp]', appEl).textContent = fmt(state.xp);
    const p = Math.floor((state.xp % 11000) / 11000 * 8);
    $$('[data-prog] i', appEl).forEach((c, i) => { c.classList.toggle('is-on', i < p); c.classList.toggle('is-q', i >= p && i < p + Math.min(2, state.pool)); });
  };
  const gainXp = (n: number) => {
    state.xp += n;
    while (state.xp >= 11000) {
      state.xp -= 11000;
      state.level++;
      state.pool++;
      notify({ title: 'Relay level up', msg: `Level ${state.level} · +1 energy`, state: 'nominal' });
    }
  };

  /* ---------- screens ---------- */
  let screen: Screen = 'shell';
  const hints = $('[data-hints]', appEl);
  const show = (s: Screen) => {
    screen = s;
    $$<HTMLElement>('[data-screen]', appEl).forEach((el) => (el.hidden = el.dataset.screen !== s));
    $$<HTMLButtonElement>('[data-tab]', appEl).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === s)));
    hints.innerHTML = `<span>Back</span>${HINTS[s].map(([k, l]) => `<span><span class="mu-key mu-key--sq">${k}</span>${l}</span>`).join('')}`;
  };
  $$<HTMLButtonElement>('[data-tab]', appEl).forEach((t) => b.add(on(t, 'click', () => show(t.dataset.tab as Screen))));
  b.add(on(appEl, 'keydown', (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'q' || k === 'e') {
      const i = SCREENS.indexOf(screen) + (k === 'e' ? 1 : -1);
      show(SCREENS[(i + SCREENS.length) % SCREENS.length]);
      e.preventDefault();
      return;
    }
    if (screen === 'shell') shellKeys(e);
  }));
  $$<HTMLButtonElement>('[data-ping]', appEl).forEach((x) => b.add(on(x, 'click', () => notify({ title: x.dataset.ping!, msg: 'Nothing new on this channel.', state: 'link' }))));

  /* ---------- shell select ---------- */
  const shellTiles = $$<HTMLButtonElement>('[data-shell]', appEl);
  let shellIndex = 0;
  const tip = $('[data-shell-tip]', appEl);
  const pickShell = (i: number) => {
    shellIndex = i;
    const s = SHELLS[i];
    shellTiles.forEach((t, k) => { t.classList.toggle('is-selected', k === i); t.setAttribute('aria-selected', String(k === i)); });
    const stage = $('[data-shell-stage]', appEl);
    stage.style.setProperty('--tc', s.ink);
    $('[data-shell-mark]', appEl).innerHTML = emblem(s.seed, { size: 300 });
    $('[data-shell-big]', appEl).textContent = s.name;
    $('[data-shell-code]', appEl).textContent = `${s.name.slice(0, 2).toUpperCase()}-${String(s.seed).padStart(2, '0')}`;
    $('[data-shell-name]', appEl).textContent = s.name;
    $('[data-shell-role]', appEl).textContent = s.role;
    $('[data-shell-abilities]', appEl).innerHTML = s.abilities.map(([n, l], k) => `<button class="mu-ability" data-ability="${k}">${ico(n, 26)}<span>${l}</span></button>`).join('');
    tip.hidden = true;
    $$<HTMLButtonElement>('[data-ability]', appEl).forEach((a) => {
      const [n, l, d] = s.abilities[Number(a.dataset.ability)];
      const open = () => {
        tip.hidden = false;
        $('.mu-tip__title', tip).textContent = l;
        const row = $('.mu-tip__row', tip);
        row.children[0].innerHTML = ico(n, 22);
        row.children[1].textContent = d;
      };
      a.addEventListener('mouseenter', open);
      a.addEventListener('focus', open);
      a.addEventListener('mouseleave', () => (tip.hidden = true));
      a.addEventListener('blur', () => (tip.hidden = true));
    });
  };
  shellTiles.forEach((t, i) => b.add(on(t, 'click', () => pickShell(i))));
  const shellKeys = (e: KeyboardEvent) => {
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[e.key];
    if (d != null) {
      e.preventDefault();
      pickShell((shellIndex + d + SHELLS.length) % SHELLS.length);
      shellTiles[shellIndex].focus({ preventScroll: true });
    } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement && !e.target.dataset.shell)) {
      notify({ title: 'Relay access', msg: `${SHELLS[shellIndex].name} · shell printed`, state: 'nominal' });
    }
  };
  $$<HTMLButtonElement>('[data-act]', appEl).forEach((x) => b.add(on(x, 'click', () => {
    const s = SHELLS[shellIndex];
    if (x.dataset.act === 'access') notify({ title: 'Relay access', msg: `${s.name} · shell printed`, state: 'nominal' });
    else if (x.dataset.act === 'guide') notify({ title: `${s.name} guide`, msg: s.abilities.map((a) => a[1]).join(' · '), state: 'link' });
    else notify({ title: 'Profile', msg: 'Emblem and callsign unlocked at level 10', state: 'link' });
  })));
  pickShell(0);

  /* ---------- vault ---------- */
  const cells = () => $$<HTMLButtonElement>('[data-pack] .is-item', appEl);
  const convert = $<HTMLButtonElement>('.ma-convert', appEl);
  const paintSel = () => {
    const all = cells();
    const sel = all.filter((c) => c.getAttribute('aria-pressed') === 'true');
    const v = sel.reduce((a, c) => a + Number(c.dataset.value), 0);
    $('[data-sel-n]', appEl).textContent = String(sel.length);
    $('[data-sel-v]', appEl).textContent = v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v);
    $('[data-sel-xp]', appEl).textContent = fmt(Math.round(v * 1.6));
    $('[data-pack-count]', appEl).textContent = `${all.length}/40`;
    $('.mu-select', appEl).classList.toggle('is-live', sel.length > 0);
    convert.disabled = sel.length === 0;
  };
  b.add(on($('[data-pack]', appEl), 'click', (e: Event) => {
    const c = (e.target as HTMLElement).closest<HTMLButtonElement>('.is-item');
    if (!c) return;
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    paintSel();
  }));
  b.add(on($('[data-pack-all]', appEl), 'click', () => { cells().forEach((c) => c.setAttribute('aria-pressed', 'true')); paintSel(); }));
  b.add(on($('[data-pack-clear]', appEl), 'click', () => { cells().forEach((c) => c.setAttribute('aria-pressed', 'false')); paintSel(); }));
  b.add(on(convert, 'holddone', () => {
    const sel = cells().filter((c) => c.getAttribute('aria-pressed') === 'true');
    const v = sel.reduce((a, c) => a + Number(c.dataset.value), 0);
    // items drop out of the grid one per step
    sel.forEach((c, k) => setTimeout(() => { c.outerHTML = '<span class="ma-cell"></span>'; if (k === sel.length - 1) paintSel(); }, 70 * (k + 1)));
    state.energy += Math.round(v * 1.6);
    gainXp(Math.round(v * 1.6));
    paintBar();
    notify({ title: 'Matter converted', msg: `${sel.length} items · +${fmt(Math.round(v * 1.6))} energy`, state: 'nominal' });
  }));
  const rail = $$<HTMLButtonElement>('.mu-rail__btn', appEl);
  rail.forEach((x) => b.add(on(x, 'click', () => rail.forEach((y) => y.setAttribute('aria-pressed', String(y === x))))));
  paintSel();

  /* ---------- armory ---------- */
  const offers = $$<HTMLButtonElement>('[data-offer]', appEl);
  const owned = new Set<number>();
  let offerIndex = 0;
  const pv = (sel: string) => $(sel, appEl);
  const preview = (k: number) => {
    offerIndex = k;
    const o = OFFERS[k];
    offers.forEach((t, i) => t.classList.toggle('is-selected', i === k));
    pv('[data-pv-art]').innerHTML = ico(o.i, 120);
    pv('[data-pv-art]').style.setProperty('--tc', RARITY[o.r]);
    const tag = pv('[data-pv-tag]');
    tag.style.setProperty('--tc', RARITY[o.r]);
    tag.innerHTML = `${ico(o.p === 'Free' ? 'check' : 'disk', 10)}${o.p} · ${RARITY_NAME[o.r]}`;
    pv('[data-pv-name]').textContent = o.n;
    pv('[data-pv-body]').textContent = `${FACTIONS[o.f][0]} issue. ${owned.has(k) ? 'Already in your vault.' : 'Purchased items go straight to the vault.'}`;
    const buy = pv('[data-buy]') as HTMLButtonElement;
    buy.disabled = owned.has(k) || (o.p !== 'Free' && state.coins < Number(o.p));
  };
  offers.forEach((t, k) => b.add(on(t, 'click', () => preview(k))));
  b.add(on(pv('[data-buy]'), 'holddone', () => {
    const o = OFFERS[offerIndex];
    if (owned.has(offerIndex)) return;
    if (o.p !== 'Free') state.coins -= Number(o.p);
    owned.add(offerIndex);
    offers[offerIndex].classList.add('is-owned');
    paintBar();
    preview(offerIndex);
    notify({ title: 'Purchased', msg: `${o.n} · sent to vault`, state: 'link' });
  }));
  const fac = $$<HTMLButtonElement>('[data-faction]', appEl);
  fac.forEach((x) => b.add(on(x, 'click', () => {
    const f = Number(x.dataset.faction);
    fac.forEach((y) => { y.classList.toggle('is-on', y === x); y.setAttribute('aria-pressed', String(y === x)); });
    offers.forEach((t) => (t.hidden = f !== 0 && Number(t.dataset.f) !== f));
  })));
  preview(0);
  const refresh = $('[data-refresh]', appEl);
  let left = 23 * 60 + 20;
  const clock = window.setInterval(() => {
    left = left > 0 ? left - 1 : 23 * 60 + 20;
    refresh.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  }, 1000);
  b.add(() => window.clearInterval(clock));

  /* ---------- relay tracks (the board's cradle, driven by the menu) ---------- */
  const PERKS = [
    ['Leech', 'Close-range strikes restore a small amount of shell integrity.'],
    ['Quick cells', 'Abilities recharge 8% faster.'],
    ['Light step', 'Sprinting makes less noise.'],
    ['Iron lung', 'Stamina drains 12% slower.'],
    ['Field medic', 'Revives take half the time.'],
  ];
  const values = CRADLE_STATS.map((t) => t.value as number);
  const cradle = mountCradle($('[data-cradle] .k-cradle', appEl), { auto: false, values });
  b.add(cradle);
  const perk = (k: number) => {
    const t = CRADLE_STATS[k];
    const n = values[k];
    const panel = $('[data-perk]', appEl);
    panel.style.setProperty('--tc', t.ink);
    $('[data-perk-name]', panel).textContent = PERKS[k][0];
    $('[data-perk-body]', panel).textContent = PERKS[k][1];
    const open = n >= t.nodes[0];
    const st = $('[data-perk-state]', panel);
    st.innerHTML = open ? `${ico('check', 14)}Perk unlocked` : `${ico('lock', 14)}Unlocks at ${t.nodes[0]} blocks`;
    st.classList.toggle('is-locked', !open);
    $('[data-perk-nodes]', panel).innerHTML = t.nodes.map((x) => `<span class="${n >= x ? 'is-on' : ''}">${x}</span>`).join('');
  };
  $$<HTMLElement>('.k-stat', appEl).forEach((row) => {
    const k = Number(row.dataset.stat);
    b.add(on(row, 'mouseenter', () => perk(k)));
    b.add(on(row, 'focusin', () => perk(k)));
    $$<HTMLButtonElement>('[data-step]', row).forEach((btn) => b.add(on(btn, 'click', () => {
      const d = Number(btn.dataset.step);
      const n = values[k];
      if (d > 0 && (state.pool <= 0 || n >= CRADLE_BLOCKS)) {
        notify({ title: n >= CRADLE_BLOCKS ? 'Track full' : 'No energy', msg: n >= CRADLE_BLOCKS ? 'This track has every block.' : 'Convert items in the vault to raise capacity.', state: 'caution' });
        return;
      }
      if (d < 0 && n <= 0) return;
      values[k] = n + d;
      state.pool -= d;
      if (d > 0) cradle.flash(k);
      if (d > 0 && (CRADLE_STATS[k].nodes as readonly number[]).includes(n + 1)) notify({ title: `${PERKS[k][0]} · node ${n + 1}`, msg: 'Track node reached', state: 'nominal' });
      paintBar();
      perk(k);
    })));
  });
  perk(0);

  /* ---------- contracts ---------- */
  function paintCodex() {
    const n = $$('[data-contract].is-claimed', appEl).length;
    $('[data-codex-n]', appEl).textContent = String(n);
    $$('[data-codex] i', appEl).forEach((c, i) => c.classList.toggle('is-on', i < n));
    // the master contract opens once the three before it are claimed
    const master = $('[data-contract="3"]', appEl);
    if (n >= 3 && master.classList.contains('is-locked')) {
      master.classList.replace('is-locked', 'is-ready');
      const btn = $<HTMLButtonElement>('.mu-claim', master);
      btn.disabled = false;
      $('[data-claim-label]', master).textContent = `Claim ${master.dataset.pay} credits`;
      notify({ title: 'Contract open', msg: 'Master breaker is available', state: 'caution' });
    }
    const done = n >= 4;
    $('[data-codex-mark]', appEl).classList.toggle('is-on', done);
    $('[data-codex-state]', appEl).innerHTML = done ? `${ico('check', 14)}Codex mark unlocked` : `${ico('lock', 14)}Locked · ${4 - n} left`;
  }
  $$<HTMLElement>('[data-contract]', appEl).forEach((card) => {
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
        state.coins += Number(card.dataset.pay);
        gainXp(900);
        paintBar();
        paintCodex();
        notify({ title: 'Reward claimed', msg: `${$('.mu-contract__title', card).textContent} · +${card.dataset.pay} credits`, state: 'link' });
      }, 90 * 7);
    }));
  });

  show('shell');
  paintBar();
  paintCodex();

  /* ---------- components ---------- */
  $$<HTMLElement>('.if-grid .mu-seg', root).forEach((g) => {
    const btns = $$<HTMLButtonElement>('button', g);
    btns.forEach((x) => b.add(on(x, 'click', () => btns.forEach((y) => y.setAttribute('aria-pressed', String(y === x))))));
  });
  const gain = $<HTMLInputElement>('.mu-range input', root);
  b.add(on(gain, 'input', () => {
    $('[data-gain]', root).innerHTML = `${gain.value}<sup>↗</sup>`;
    $('[data-gain-bar]', root).style.setProperty('--p', `${gain.value}%`);
  }));
  const MSG: Record<string, [string, string]> = {
    nominal: ['Sync complete', 'Neural subroutines 07/07 mounted'],
    link: ['Link established', 'LINK-07 · latency 41ms'],
    caution: ['Thermal delta', '+0.4K above band — monitor'],
    critical: ['Integrity breach', 'Shell below 20% — evacuate'],
  };
  $$('[data-toast]', root).forEach((btn) => b.add(on(btn, 'click', () => notify({ title: MSG[btn.dataset.toast!][0], msg: MSG[btn.dataset.toast!][1], state: btn.dataset.toast! }))));

  // modal
  const modal = $('[data-modal]', root);
  const card = $('.k-modal__card', modal);
  const openModal = () => {
    modal.hidden = false;
    card.animate([{ transform: 'scaleY(0.02)' }, { transform: 'scaleY(1)' }], { duration: 200, easing: 'steps(4)' });
    $<HTMLButtonElement>('[data-close]', modal).focus();
  };
  const closeModal = () => { modal.hidden = true; };
  b.add(on($('[data-modal-open]', root), 'click', openModal));
  $$('[data-close]', modal).forEach((x) => b.add(on(x, 'click', () => {
    if (x.hasAttribute('data-confirm')) notify({ title: 'Purge complete', msg: 'Block 0x3F erased', state: 'critical' });
    closeModal();
  })));
  b.add(on(window, 'keydown', (e: KeyboardEvent) => e.key === 'Escape' && closeModal()));
  b.add(on(modal, 'click', (e: Event) => e.target === modal && closeModal()));
  return b.dispose;
}
