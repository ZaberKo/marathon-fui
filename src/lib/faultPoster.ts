/**
 * Runtime-fault poster: the furniture around the warning band.
 *
 *   FLT_MARK      checker-H register mark (SVG string, black on the field)
 *   cluster       right-hand diagnostic cluster: micro codes, hazard stripes,
 *                 target circles, dot grid, boxed glyphs
 *   faultPosterHTML({ embed })   the whole poster (field, marks, band, cluster, strip)
 *   mountFaultPoster(root) → { paint(elapsed), dispose }   drive it from your clock
 *   mountFaultLoop(root) → cleanup                         self-running 10 s loop for embeds
 *
 * The canvas layer carries the dashed hairline rows, the paired-dot grid and
 * the pixel dropout that eats the field. Everything steps at the caller's
 * frame rate; nothing fades.
 */
import { crispCanvas, stepLoop } from './util';

const WORDS = ['WARNING_', 'COGNITION_', 'RUNTIME_', 'ERROR_'];
let uid = 0;

const hash = (a: number, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/* ------------------------------------------------------------------ */
/* Register mark                                                       */
/* ------------------------------------------------------------------ */
// 5 × 5 module grid: bars top and bottom, a rounded checker body, an
// open vertical slot that cuts through both bars.
export const FLT_MARK = `<svg class="flt-mark" viewBox="0 0 300 300" aria-hidden="true">
  <path fill="currentColor" d="M0 0H300V60H0ZM0 240H300V300H0ZM0 120H60V180H0ZM240 120H300V180H240Z
    M60 120A60 60 0 0 1 120 60H180A60 60 0 0 1 240 120V180A60 60 0 0 1 180 240H120A60 60 0 0 1 60 180Z"/>
  <path fill="var(--flt-field)" d="M60 120H120V180H60ZM180 120H240V180H180ZM120 30H180V270H120Z"/>
</svg>`;

/* ------------------------------------------------------------------ */
/* Diagnostic cluster                                                  */
/* ------------------------------------------------------------------ */
const mono = (x: number, y: number, s: number, t: string, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${s}" ${extra}>${t}</text>`;

const cluster = (id: string) => `<svg class="flt-cluster" viewBox="0 0 520 640" aria-hidden="true">
  <defs>
    <pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect class="flt-haz" width="8" height="16" fill="#000"/>
    </pattern>
  </defs>
  <g fill="#000" font-family="var(--f-mono)">
    ${mono(26, 34, 15, '92EE/S')}
    <rect x="26" y="40" width="36" height="2"/>
    <text x="22" y="86" font-size="44" font-family="var(--f-display)">0</text>
    <path d="M52 64H70V58H84V64H96V76H84V82H70V76H52Z"/><rect x="96" y="52" width="12" height="12"/><rect x="108" y="64" width="12" height="18"/>
    ${mono(34, 114, 17, 'A 5PN -')}
    ${mono(72, 140, 17, 'RR')}
    <rect x="128" y="22" width="36" height="104" fill="url(#${id})"/>
    <rect x="18" y="150" width="110" height="26" fill="url(#${id})"/>
    <path d="M164 34H226V250H272V330H204V218H164Z"/>
    <g class="flt-blink" data-b="3">${mono(240, 48, 11, 'DME&#174;')}<rect x="240" y="54" width="44" height="1.5"/>
      ${mono(240, 76, 11, '92EE/S')}<rect x="240" y="82" width="44" height="1.5"/>${mono(240, 104, 11, '/005.S')}</g>
    <path d="M240 118V146H262V118H256V140H246V118Z"/>
    <g font-size="16" data-num>${mono(326, 72, 16, '023')}${mono(326, 92, 16, '820')}${mono(326, 112, 16, '320')}</g>
    <path d="M296 18H342V40H360V60H342V52H306V64H296Z"/>
    ${mono(380, 38, 11, 'R<tspan font-size="7" dy="-5">w</tspan>')}<rect x="398" y="30" width="12" height="6"/>${mono(414, 38, 11, 'R<tspan font-size="7" dy="-5">l</tspan>')}
    <g class="flt-dots">${Array.from({ length: 12 }, (_, i) => `<circle cx="${396 + (i % 3) * 18}" cy="${62 + Math.floor(i / 3) * 20}" r="${i % 4 === 1 ? 3 : 4}"/>`).join('')}</g>
    <g transform="translate(462 22) rotate(90)">${mono(0, 0, 16, 'QR&#8195;EXC&#8195;F')}${mono(0, 22, 16, 'SDR37&#8195;2445')}</g>
    <g fill="var(--c-crimson)">
      <path d="M8 232H122V258H96V300H70V258H8Z"/>
      <path d="M300 214H420V242H392V262H354V242H300ZM364 300H440V330H364Z"/>
      ${mono(334, 286, 30, 'A2', 'font-family="var(--f-display)"')}
      <rect x="230" y="396" width="56" height="5"/>
    </g>
    <circle cx="40" cy="404" r="11"/><rect x="62" y="392" width="12" height="24" rx="6"/>
    <circle cx="44" cy="460" r="19" fill="none" stroke="#000" stroke-width="4"/><circle cx="44" cy="460" r="9"/>
    <circle cx="44" cy="530" r="19" fill="none" stroke="#000" stroke-width="3"/><rect x="63" y="528" width="44" height="3"/>
    <path d="M196 418A44 44 0 1 0 196 506" fill="none" stroke="#000" stroke-width="20"/>
    <rect x="132" y="396" width="34" height="20"/>
    <g class="flt-blink" data-b="5"><text x="216" y="484" font-size="56" font-family="var(--f-display)" transform="translate(432 0) scale(-1 1)" text-anchor="start">E</text>
    <text x="252" y="484" font-size="56" font-family="var(--f-display)">E</text></g>
    <text x="300" y="484" font-size="64" font-family="var(--f-display)">S8</text>
    <rect x="236" y="496" width="160" height="8"/>
    <path d="M136 566V540A16 16 0 0 1 152 524H172V538H156A6 6 0 0 0 150 544V566Z"/>
    <text x="180" y="566" font-size="58" font-family="var(--f-display)">M</text>
    <rect x="252" y="540" width="16" height="4"/><rect x="276" y="530" width="26" height="22"/><rect x="302" y="538" width="90" height="12"/>
    ${mono(352, 526, 13, '3&#8194;8')}
    <g fill="none" stroke="#000" stroke-width="2.5"><rect x="404" y="508" width="34" height="34" rx="6"/><path d="M421 508V542M404 525H438"/></g>
    <rect x="452" y="508" width="36" height="36" rx="6"/>
    <text x="470" y="536" font-size="26" font-family="var(--f-display)" text-anchor="middle" fill="var(--c-crimson)">B</text>
    <g class="flt-blink" data-b="7"><rect x="456" y="458" width="2.5" height="28"/><rect x="443" y="471" width="28" height="2.5"/><circle cx="457" cy="472" r="6"/></g>
    <g class="flt-blink" data-b="4"><rect x="388" y="406" width="58" height="46" fill="none" stroke="#000" stroke-width="2"/>${mono(396, 432, 13, 'Vl&#110;')}<rect x="436" y="414" width="4" height="10"/></g>
    <g transform="translate(372 452) rotate(-90)">${mono(0, 0, 12, '25')}</g>
    <g class="flt-ticks">${Array.from({ length: 6 }, (_, i) => `<rect x="${330 + i * 7}" y="${414 + (i % 2) * 4}" width="2" height="${18 - (i % 3) * 4}"/>`).join('')}</g>
  </g>
</svg>`;

/* ------------------------------------------------------------------ */
/* Live layer                                                          */
/* ------------------------------------------------------------------ */
export function faultPosterHTML({ embed = false } = {}) {
  const id = `flt-haz-${uid++}`;
  const mark = (x: number, y: number) => FLT_MARK.replace('<svg', `<svg style="--x:${x}%;--y:${y}%"`);
  return `<div class="flt-poster${embed ? ' flt-poster--embed' : ''}" aria-hidden="true">
    <canvas class="flt-pix"></canvas>
    ${mark(7, 16)}${mark(7, 72)}${mark(83, 16)}${mark(83, 72)}
    <div class="flt-band">
      <div class="flt-band__ink t-display t-wide">WARNING</div>
      <div class="k-marquee flt-marq" style="--dur:8s;--marq-steps:128">
        <div class="k-marquee__track">${'<span class="t-display" data-fault-word></span>'.repeat(2)}</div>
      </div>
    </div>
    ${cluster(id)}
    <div class="flt-strip"><i></i><b class="t-mono">DME<sup>S8</sup> VTX MM4T 0x3F</b></div>
  </div>`;
}

/** A self-running poster for embeds: 10 s cycle, paused off-screen. */
export function mountFaultLoop(root: HTMLElement) {
  const poster = mountFaultPoster(root);
  const stop = stepLoop(12, (f) => poster.paint((f / 12) % 10), root.querySelector('.flt-poster') ?? root);
  return () => {
    stop();
    poster.dispose();
  };
}

export function mountFaultPoster(root: HTMLElement) {
  const overlay = root;
  const poster = overlay.querySelector<HTMLElement>('.flt-poster')!;
  const marquee = overlay.querySelector<HTMLElement>('.flt-marq')!;
  const words = [...marquee.querySelectorAll<HTMLElement>('[data-fault-word]')];
  const canvas = overlay.querySelector<HTMLCanvasElement>('.flt-pix')!;
  const band = overlay.querySelector<HTMLElement>('.flt-band')!;
  const blinks = [...overlay.querySelectorAll<SVGGElement>('.flt-blink')];
  const nums = [...overlay.querySelectorAll<SVGTextElement>('[data-num] text')];
  const haz = overlay.querySelector<SVGPatternElement>('.flt-cluster pattern')!;
  const { ctx, size, dispose } = crispCanvas(canvas, 1);

  /** elapsed in seconds; words cycle every 0.9 s and ERROR pushes in on 2-frame steps */
  const paint = (elapsed: number) => {
    const phase = Math.floor(elapsed / 0.9) % WORDS.length;
    const zoom = phase === 3 ? Math.min(1, Math.floor((elapsed % 0.9) * 6) / 3) : 0;
    const word = WORDS[phase].repeat(6);
    marquee.classList.toggle('is-cobalt', phase % 2 === 1);
    for (const span of words) if (span.textContent !== word) span.textContent = word;
    const f = Math.floor(elapsed * 12);
    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);
    const bandBox = band.getBoundingClientRect();
    const box = canvas.getBoundingClientRect();
    const b0 = bandBox.top - box.top;
    const b1 = bandBox.bottom - box.top;

    // dashed hairline rows; every fourth row is a paired-dot row instead
    ctx.fillStyle = '#000';
    const rowGap = Math.max(48, Math.round(h / 9));
    for (let r = 0, y = Math.round(rowGap * 0.6); y < h; y += rowGap, r++) {
      if (y > b0 - 6 && y < b1 + 6) continue;
      for (let x = 24 + (r % 2) * 50, i = 0; x < w; x += 100 + (hash(i, r) > 0.7 ? 60 : 0), i++) {
        if (r % 4 === 3) {
          ctx.fillRect(x, y - 3, 2, 2); ctx.fillRect(x + 4, y - 3, 2, 2);
          ctx.fillRect(x, y + 1, 2, 2); ctx.fillRect(x + 4, y + 1, 2, 2);
        } else if (hash(i, r, 9) > 0.12) {
          ctx.fillRect(x, y, 10, 2);
        }
      }
    }

    // pixel dropout: sparse from the start, eating in after 6 s and on ERROR
    const cell = Math.max(10, Math.round(w / 96));
    const density = 0.006 + 0.13 * Math.min(1, Math.max(0, (elapsed - 6) / 4)) ** 2 + 0.05 * zoom;
    const seed = Math.floor(f / 3);
    for (let y = 0; y < h; y += cell) {
      const inBand = y + cell > b0 && y < b1;
      for (let x = 0; x < w; x += cell) {
        const ci = x / cell;
        const cj = y / cell;
        // clustered: a coarse noise field gates the fine one
        const patch = hash(Math.floor(ci / 5), Math.floor(cj / 4), seed);
        if (hash(ci, cj, seed) * (0.4 + patch) * (inBand ? 2.5 : 1) >= density) continue;
        ctx.fillStyle = inBand ? '#ff2a17' : '#000';
        ctx.fillRect(x, y, cell, cell);
      }
    }

    // cluster flicker and counting digits
    for (const g of blinks) g.style.visibility = hash(f, +(g.dataset.b ?? 1)) > 0.82 ? 'hidden' : '';
    if (f % 2 === 0) for (const [i, t] of nums.entries()) t.textContent = String(Math.floor(hash(f, i) * 1000)).padStart(3, '0');
    haz.setAttribute('patternTransform', `rotate(45) translate(${(f % 4) * 4} 0)`);
    poster.style.setProperty('--zoom', String(1 + 0.16 * zoom));
    poster.style.setProperty('--strip', `${-(f % 8) * 5}px`);
  };

  return { paint, dispose };
}
