/**
 * Floating, draggable performance tag.
 * Collapsed: one line (backend · page fps · render fps).
 * Expanded: frame-time graph, adapter, heap, per-stage render stats.
 * Position + state persist in localStorage.
 */
import { adapter, fmtBytes, fmtK, listStages, pageMeter, startPageMeter } from './perf';
import { stepLoop } from './util';

const KEY = 'rk-perf-hud';
type Saved = { x: number; y: number; open: boolean; on: boolean };

/** `reserveBottom`: keep the window clear of a bottom bar (px); `key`: separate saved position */
export function mountPerfHud(o: { reserveBottom?: number; key?: string; dock?: 'top' | 'bottom'; defaultOn?: boolean } = {}) {
  startPageMeter();
  const skey = o.key ?? KEY;
  const saved: Saved = { x: -1, y: -1, open: false, on: o.defaultOn ?? true, ...JSON.parse(localStorage.getItem(skey) ?? '{}') };
  const save = () => localStorage.setItem(skey, JSON.stringify(saved));

  const el = document.createElement('div');
  el.className = 'perf';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <div class="perf__bar" title="Drag to move">
      <span class="perf__grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      <b class="perf__be" data-k="be">NO GPU</b>
      <span class="perf__v"><i data-k="fps">--</i><small>FPS</small></span>
      <span class="perf__v perf__v--r"><i data-k="rfps">--</i><small>RDR</small></span>
      <button class="perf__tog" type="button" aria-label="Toggle details" aria-expanded="false">+</button>
    </div>
    <div class="perf__body">
      <div class="perf__graph"><canvas></canvas><span data-k="worst"></span></div>
      <dl class="perf__grid">
        <dt>Backend</dt><dd data-k="backend">—</dd>
        <dt>Adapter</dt><dd data-k="adapter">—</dd>
        <dt>Frame</dt><dd data-k="frame">—</dd>
        <dt>JS heap</dt><dd data-k="heap">—</dd>
        <dt>Stages</dt><dd data-k="stages">—</dd>
        <dt>Render</dt><dd data-k="render">—</dd>
        <dt>Draws</dt><dd data-k="draws">—</dd>
        <dt>Prims</dt><dd data-k="prims">—</dd>
        <dt>GPU mem</dt><dd data-k="mem">—</dd>
        <dt>Pixels</dt><dd data-k="px">—</dd>
      </dl>
      <div class="perf__stages" data-k="list"></div>
    </div>`;
  document.body.appendChild(el);

  const $k = (k: string) => el.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const bar = el.querySelector<HTMLElement>('.perf__bar')!;
  const tog = el.querySelector<HTMLButtonElement>('.perf__tog')!;
  const canvas = el.querySelector<HTMLCanvasElement>('.perf__graph canvas')!;
  const ctx = canvas.getContext('2d')!;

  /* --- placement / drag --------------------------------------------- */
  const place = () => {
    const r = el.getBoundingClientRect();
    const maxX = window.innerWidth - r.width - 4;
    const maxY = window.innerHeight - r.height - 4 - (o.reserveBottom ?? 0);
    if (saved.x < 0) {
      // default dock: bottom-left, just inside the stage (clear of toasts, bottom-right)
      saved.x = window.innerWidth > 760 ? 92 : 8;
      saved.y = o.dock === 'top' ? 12 : window.innerHeight - r.height - 44;
    }
    saved.x = Math.max(4, Math.min(maxX, saved.x));
    saved.y = Math.max(4, Math.min(maxY, saved.y));
    el.style.transform = `translate(${saved.x}px, ${saved.y}px)`;
  };
  const setOpen = (open: boolean) => {
    saved.open = open;
    el.classList.toggle('is-open', open);
    tog.textContent = open ? '−' : '+';
    tog.setAttribute('aria-expanded', String(open));
    requestAnimationFrame(place);
  };
  setOpen(saved.open);
  setVisible(saved.on);

  let drag: { dx: number; dy: number } | null = null;
  bar.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    drag = { dx: e.clientX - saved.x, dy: e.clientY - saved.y };
    bar.setPointerCapture(e.pointerId);
    el.classList.add('is-drag');
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    // snap to a 4px grid — mechanical, not fluid
    saved.x = Math.round((e.clientX - drag.dx) / 4) * 4;
    saved.y = Math.round((e.clientY - drag.dy) / 4) * 4;
    place();
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    el.classList.remove('is-drag');
    save();
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', () => {
    setOpen(!saved.open);
    save();
  });
  tog.addEventListener('click', () => {
    setOpen(!saved.open);
    save();
  });
  window.addEventListener('resize', place);

  /* --- update loop (4 Hz, stepped) ----------------------------------- */
  const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  stepLoop(4, () => {
    if (!saved.on) return;
    const st = listStages();
    const vis = st.filter((s) => s.visible);
    const be = adapter.backend || (st[0]?.backend !== '—' ? st[0]?.backend : '') || '';
    const beEl = $k('be');
    beEl.textContent = be ? be.toUpperCase() : 'NO 3D';
    // dim the backend tag when no 3D stage is mounted on the current page
    beEl.dataset.be = be && st.length ? be : 'none';
    $k('fps').textContent = pageMeter.fps ? pageMeter.fps.toFixed(0) : '--';
    const rf = vis.length ? vis.reduce((a, s) => a + s.fps, 0) / vis.length : 0;
    const tf = vis.length ? vis.reduce((a, s) => a + s.targetFps, 0) / vis.length : 0;
    $k('rfps').textContent = vis.length ? `${rf.toFixed(0)}/${tf.toFixed(0)}` : '--';

    if (!saved.open) return;
    $k('backend').textContent = be ? `${be}${adapter.fallbackReason ? ' (fallback)' : ''}` : 'none mounted';
    $k('backend').title = adapter.fallbackReason;
    $k('adapter').textContent = adapter.name || '—';
    $k('frame').textContent = `${pageMeter.fps.toFixed(1)} fps · ${pageMeter.frameMs.toFixed(1)} ms`;
    $k('worst').textContent = `MAX ${pageMeter.worstMs.toFixed(1)}MS`;
    $k('heap').textContent = heap ? fmtBytes(heap.usedJSHeapSize) : 'n/a';
    $k('stages').textContent = `${vis.length} visible / ${st.length} mounted`;
    const cpu = vis.reduce((a, s) => a + s.cpuMs, 0);
    $k('render').textContent = vis.length ? `${rf.toFixed(1)} / ${tf.toFixed(0)} fps · cpu ${cpu.toFixed(2)} ms` : '—';
    $k('draws').textContent = String(vis.reduce((a, s) => a + s.drawCalls, 0));
    $k('prims').textContent = `${fmtK(vis.reduce((a, s) => a + s.triangles, 0))} tri · ${fmtK(vis.reduce((a, s) => a + s.lines, 0))} ln`;
    $k('mem').textContent = `${fmtBytes(st.reduce((a, s) => a + s.gpuBytes, 0))} · ${st.reduce((a, s) => a + s.geometries, 0)} geo · ${st.reduce((a, s) => a + s.textures, 0)} tex`;
    $k('px').textContent = fmtK(vis.reduce((a, s) => a + s.w * s.h, 0));
    $k('list').innerHTML = st
      .map(
        (s) => `<div class="${s.visible ? '' : 'is-off'}"><b>${s.label}</b><span>${s.fps.toFixed(0)}/${s.targetFps}</span><span>${s.cpuMs.toFixed(2)}ms</span><span>${s.drawCalls}dc</span><span>${s.w}×${s.h}</span></div>`,
      )
      .join('');
    drawGraph();
  });

  function drawGraph() {
    const w = (canvas.width = canvas.clientWidth);
    const h = (canvas.height = canvas.clientHeight);
    ctx.clearRect(0, 0, w, h);
    const hist = pageMeter.history;
    const bw = w / hist.length;
    const scale = h / 50; // 50ms = full height
    ctx.fillStyle = '#1a1e5c';
    ctx.fillRect(0, h - Math.round(16.7 * scale), w, 1);
    ctx.fillRect(0, h - Math.round(33.3 * scale), w, 1);
    hist.forEach((ms, i) => {
      const bh = Math.max(1, Math.min(h, Math.round(ms * scale)));
      ctx.fillStyle = ms > 33.4 ? '#ff2a17' : ms > 17.5 ? '#ffe000' : '#7dff1a';
      ctx.fillRect(Math.floor(i * bw), h - bh, Math.max(1, Math.floor(bw) - 1), bh);
    });
  }

  function setVisible(on: boolean) {
    saved.on = on;
    el.hidden = !on;
    if (on) requestAnimationFrame(place);
  }

  return {
    get on() {
      return saved.on;
    },
    toggle() {
      setVisible(!saved.on);
      save();
      return saved.on;
    },
  };
}
