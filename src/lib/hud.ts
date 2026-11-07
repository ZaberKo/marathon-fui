/**
 * HUD widgets — canvas / DOM instruments.
 * Each `mountX(el, opts)` returns a cleanup function.
 */
import { crispCanvas, hex, on, pad, rng, stepLoop } from './util';

const COL = {
  void: '#000000',
  cobalt: '#2424ff',
  cobaltLo: '#10127a',
  acid: '#7dff1a',
  lime: '#d4ff00',
  hazard: '#ffe000',
  crimson: '#ff2a17',
  bone: '#ececec',
  mute: '#3a3f6b',
  cyan: '#38f5d4',
};
export { COL as HUD_COLORS };

/* DEFRAG RING — see ./defrag.ts */
export { mountDefragRing, createDefrag } from './defrag';

/* ------------------------------------------------------------------ */
/* ORBIT MAP — CAD-style single-pixel star chart                       */
/* ------------------------------------------------------------------ */
export function mountOrbitMap(canvas: HTMLCanvasElement, { fps = 15, color = COL.acid, label = COL.cobalt, target = 'TCF-IV' } = {}) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const r = rng(11);
  const bodies = [0.18, 0.3, 0.46, 0.62, 0.8, 1.0].map((d, i) => ({
    d,
    a: r() * Math.PI * 2,
    sp: (0.6 / (d * d + 0.2)) * (i % 2 ? 1 : 0.8),
    rad: 2 + r() * 5,
    name: `${String.fromCharCode(65 + i)}-${hex(r() * 4096, 3)}`,
  }));
  const crosses = Array.from({ length: 26 }, () => [r(), r()]);
  const stop = stepLoop(
    fps,
    (f, t) => {
      const { w, h } = size;
      const cx = w * 0.42;
      const cy = h * 0.62;
      const S = Math.max(w, h) * 0.62;
      const tilt = 0.42;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      // scatter crosses
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.6;
      for (const [x, y] of crosses) {
        const px = Math.round(x * w) + 0.5;
        const py = Math.round(y * h) + 0.5;
        ctx.beginPath();
        ctx.moveTo(px - 4, py);
        ctx.lineTo(px + 4, py);
        ctx.moveTo(px, py - 4);
        ctx.lineTo(px, py + 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // star
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      bodies.forEach((b, i) => {
        const rx = b.d * S;
        const ry = rx * tilt;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, -0.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        const a = b.a + t * b.sp * 0.25;
        const c = Math.cos(-0.18);
        const s = Math.sin(-0.18);
        const ex = Math.cos(a) * rx;
        const ey = Math.sin(a) * ry;
        const px = cx + ex * c - ey * s;
        const py = cy + ex * s + ey * c;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, b.rad, 0, Math.PI * 2);
        ctx.fill();
        if (i === 3) {
          // target lock
          ctx.strokeStyle = COL.bone;
          const blink = f % 10 < 7;
          if (blink) {
            ctx.beginPath();
            ctx.ellipse(px, py, b.rad + 12, b.rad + 16, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.strokeStyle = label;
          ctx.beginPath();
          ctx.moveTo(px + b.rad + 14, py);
          ctx.lineTo(px + 60, py - 26);
          ctx.lineTo(px + 150, py - 26);
          ctx.stroke();
          ctx.fillStyle = label;
          ctx.font = '700 11px "IBM Plex Mono", monospace';
          ctx.fillText(`SYSTEM ${target}`, px + 64, py - 32);
          ctx.font = '9px "IBM Plex Mono", monospace';
          ctx.fillText(`N ${pad(44 + (f % 9), 2)}'54'32  E ${pad(70, 2)}'44'${pad(f % 60)}`, px + 64, py - 14);
        } else {
          ctx.fillStyle = COL.mute;
          ctx.font = '9px "IBM Plex Mono", monospace';
          ctx.fillText(b.name, px + b.rad + 4, py + 3);
        }
      });
    },
    canvas,
  );
  return () => {
    stop();
    dispose();
  };
}

/* ------------------------------------------------------------------ */
/* SPECTRUM — stacked pixel-block equalizer                            */
/* ------------------------------------------------------------------ */
export function mountSpectrum(canvas: HTMLCanvasElement, { fps = 12, cols = 32, cell = 6, color = COL.acid, peak = COL.bone } = {}) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const v = Array.from({ length: cols }, () => Math.random());
  const pk = v.slice();
  const stop = stepLoop(
    fps,
    () => {
      const { w, h } = size;
      ctx.clearRect(0, 0, w, h);
      const cw = w / cols;
      const rows = Math.floor(h / cell);
      for (let i = 0; i < cols; i++) {
        v[i] = Math.max(0.04, Math.min(1, v[i] + (Math.random() - 0.5) * 0.35));
        pk[i] = Math.max(pk[i] - 0.03, v[i]);
        const n = Math.round(v[i] * rows);
        ctx.fillStyle = color;
        for (let k = 0; k < n; k++) {
          ctx.globalAlpha = k > rows * 0.8 ? 1 : 0.55 + (k / rows) * 0.45;
          ctx.fillRect(Math.round(i * cw) + 1, h - (k + 1) * cell + 1, Math.max(1, Math.round(cw) - 2), cell - 2);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = peak;
        ctx.fillRect(Math.round(i * cw) + 1, h - Math.round(pk[i] * rows + 1) * cell + 1, Math.max(1, Math.round(cw) - 2), 2);
      }
    },
    canvas,
  );
  return () => {
    stop();
    dispose();
  };
}

/* ------------------------------------------------------------------ */
/* SCOPE — oscilloscope line, 1px, stepped                             */
/* ------------------------------------------------------------------ */
export function mountScope(canvas: HTMLCanvasElement, { fps = 15, color = COL.cyan, grid = COL.cobaltLo } = {}) {
  const { ctx, size, dispose } = crispCanvas(canvas);
  const stop = stepLoop(
    fps,
    (f) => {
      const { w, h } = size;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 24) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, h);
      }
      for (let y = 0; y <= h; y += 24) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(w, Math.round(y) + 0.5);
      }
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath();
      const ph = f * 0.35;
      for (let x = 0; x <= w; x += 3) {
        const u = x / w;
        const y =
          h / 2 +
          Math.sin(u * 18 + ph) * h * 0.18 * Math.sin(u * 3 + ph * 0.3) +
          (Math.random() - 0.5) * h * 0.05 +
          (Math.abs(u - ((f * 0.02) % 1)) < 0.02 ? -h * 0.3 : 0);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, Math.round(y / 3) * 3);
      }
      ctx.stroke();
    },
    canvas,
  );
  return () => {
    stop();
    dispose();
  };
}

/* ------------------------------------------------------------------ */
/* MEMORY GRID — chip-like cells load in sequence                      */
/* ------------------------------------------------------------------ */
export function mountMemoryGrid(el: HTMLElement, { cols = 12, rows = 8, fps = 16 } = {}) {
  el.classList.add('hud-mem');
  el.style.setProperty('--cols', String(cols));
  el.innerHTML = '';
  const cells: HTMLElement[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const c = document.createElement('i');
    el.appendChild(c);
    cells.push(c);
  }
  let idx = 0;
  const stop = stepLoop(
    fps,
    () => {
      for (let k = 0; k < 2; k++) {
        const c = cells[idx % cells.length];
        const roll = Math.random();
        c.className = roll < 0.6 ? 'on' : roll < 0.85 ? 'half' : roll < 0.95 ? 'hot' : '';
        idx++;
      }
      if (idx > cells.length * 1.6) {
        idx = 0;
        cells.forEach((c) => (c.className = ''));
      }
      // cursor cell
      cells.forEach((c) => c.classList.remove('cur'));
      cells[idx % cells.length].classList.add('cur');
    },
    el,
  );
  return stop;
}

/* ------------------------------------------------------------------ */
/* TERMINAL LOG — mono lines, appended in steps                        */
/* ------------------------------------------------------------------ */
const LOG = [
  'assert shell.integrity >= 0.92',
  'mount /neural/subroutine/07',
  'liminal buffer status :: STABLE',
  'calibrate optic.array [L] [R]',
  'sync telemetry uplink 4410',
  'WARN thermal delta +0.4K',
  'load memory.block 0x3F00..0x4FFF',
  'evaluate motor.cortex mapping',
  'handshake LINK-07 :: OK',
  'defrag consciousness.index',
  'verify checksum 9A7E-11C0',
  'ERR packet loss 0.02% — retry',
  'release latch KL2 KL4',
  'stand by for transfer',
];
export function mountTerminal(el: HTMLElement, { fps = 6, max = 12 } = {}) {
  el.classList.add('hud-term');
  let n = 0;
  const stop = stepLoop(
    fps,
    () => {
      if (Math.random() < 0.35) return;
      const line = document.createElement('div');
      const msg = LOG[(Math.random() * LOG.length) | 0];
      const lvl = msg.startsWith('ERR') ? 'err' : msg.startsWith('WARN') ? 'warn' : '';
      line.className = lvl;
      line.innerHTML = `<span>${pad(n++, 4)}</span><span>${hex(Math.random() * 65535)}</span>${msg}`;
      el.appendChild(line);
      while (el.children.length > max) el.firstElementChild!.remove();
    },
    el,
  );
  return stop;
}

/* ------------------------------------------------------------------ */
/* GAUGE — SVG arc with ticks; value jumps in steps                    */
/* ------------------------------------------------------------------ */
export function mountGauge(el: HTMLElement, { label = 'SHELL INTEGRITY', value = 0.72, color = 'var(--accent)', drift = true } = {}) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const arc = 0.75;
  let ticks = '';
  for (let i = 0; i <= 30; i++) {
    const a = (-225 + i * (270 / 30)) * (Math.PI / 180);
    const r1 = i % 5 === 0 ? 33 : 36;
    ticks += `M${(60 + Math.cos(a) * r1).toFixed(2)} ${(60 + Math.sin(a) * r1).toFixed(2)}L${(60 + Math.cos(a) * 38).toFixed(2)} ${(60 + Math.sin(a) * 38).toFixed(2)}`;
  }
  el.classList.add('hud-gauge');
  el.innerHTML = `
    <svg viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--c-line)" stroke-width="7"
        stroke-dasharray="${C * arc} ${C}" transform="rotate(135 60 60)"/>
      <circle class="g-val" cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="7"
        stroke-dasharray="0 ${C}" transform="rotate(135 60 60)"/>
      <path d="${ticks}" stroke="var(--c-mute)" stroke-width="1"/>
    </svg>
    <div class="g-read"><b>000</b><span>${label}</span></div>`;
  const val = el.querySelector<SVGCircleElement>('.g-val')!;
  const num = el.querySelector('b')!;
  let cur = value;
  const set = (v: number) => {
    const q = Math.round(v * 30) / 30; // quantise to tick marks
    val.setAttribute('stroke-dasharray', `${C * arc * q} ${C}`);
    num.textContent = pad(Math.round(v * 100), 3);
  };
  set(cur);
  const stop = drift
    ? stepLoop(
        4,
        () => {
          cur = Math.min(1, Math.max(0.05, cur + (Math.random() - 0.5) * 0.08));
          set(cur);
        },
        el,
      )
    : () => {};
  return stop;
}

/* ------------------------------------------------------------------ */
/* TRACKER — pointer-follow target box with coordinates                */
/* ------------------------------------------------------------------ */
export function mountTracker(el: HTMLElement) {
  el.classList.add('hud-tracker');
  el.innerHTML = `<div class="tk-h"></div><div class="tk-v"></div><div class="tk-box"><span class="tk-xy">X000 Y000</span><span class="tk-st">SEARCHING</span></div>`;
  const hL = el.querySelector<HTMLElement>('.tk-h')!;
  const vL = el.querySelector<HTMLElement>('.tk-v')!;
  const box = el.querySelector<HTMLElement>('.tk-box')!;
  const xy = el.querySelector<HTMLElement>('.tk-xy')!;
  const st = el.querySelector<HTMLElement>('.tk-st')!;
  let tx = 0.5;
  let ty = 0.5;
  let x = 0.5;
  let y = 0.5;
  let lockFrames = 0;
  const off1 = on(el, 'pointermove', (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width;
    ty = (e.clientY - r.top) / r.height;
  });
  const stop = stepLoop(
    20,
    () => {
      // move in discrete jumps toward target (quantised to 8px grid)
      x += (tx - x) * 0.35;
      y += (ty - y) * 0.35;
      const r = el.getBoundingClientRect();
      const px = Math.round((x * r.width) / 8) * 8;
      const py = Math.round((y * r.height) / 8) * 8;
      hL.style.transform = `translateY(${py}px)`;
      vL.style.transform = `translateX(${px}px)`;
      box.style.transform = `translate(${px - 28}px, ${py - 28}px)`;
      xy.textContent = `X${pad(px, 3)} Y${pad(py, 3)}`;
      const close = Math.hypot(tx - x, ty - y) < 0.01;
      lockFrames = close ? lockFrames + 1 : 0;
      const locked = lockFrames > 6;
      el.classList.toggle('is-locked', locked);
      st.textContent = locked ? 'LOCKED' : 'TRACKING';
    },
    el,
  );
  return () => {
    off1();
    stop();
  };
}
