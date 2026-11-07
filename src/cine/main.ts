/**
 * SHELL 07 — web film player.
 *
 * The soundtrack (score + support-AI voice + SFX, mixed offline) is the master
 * clock: picture time = audio time. Every frame is a pure function of time, so
 * seeking, pausing and scrubbing are exact.
 *
 * Keys: Space play/pause · ←/→ 1 s (Shift: 1 frame) · C captions EN/中文/off
 *       M mute · F fullscreen · Q 3D quality · Home restart
 * URL:  ?t=12.3 (start paused there) · ?capture (bare 1920×1080 frame, no audio) · ?perf (perf tag)
 */
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fontsource/silkscreen/400.css';
import '../styles/tokens.css';
import './cinema.css';
import { H, Timeline, W, createGL, type Frame } from './engine';
import { loadFonts } from './draw';
import { createPost, POST_DEFAULT } from './post';
import { SHOTS } from './film';
import { AUDIO_SRC, DURATION, LINES } from './film/cues';
import { mountPerfHud } from '../lib/perfHud';
import { startPageMeter } from '../lib/perf';

const params = new URLSearchParams(location.search);
const capture = params.has('capture');

const root = document.getElementById('cine')!;
root.innerHTML = `
  <div class="cine-stage">
    <div class="cine-frame" id="frame">
      <canvas class="cine-bg" width="${W}" height="${H}"></canvas>
      <div class="cine-glhost"></div>
      <canvas class="cine-fg" width="${W}" height="${H}"></canvas>
      <div class="cine-cap" id="cap" hidden><b>ORA//</b><span></span></div>
      <div class="cine-gate" id="gate">
        <div class="cine-gate__in">
          <div class="cine-gate__code">RUNTIME//KIT · FILM 01 · ${Math.floor(DURATION / 60)}:${String(Math.round(DURATION % 60)).padStart(2, '0')}</div>
          <div class="cine-gate__title">SHELL<span>07</span></div>
          <div class="cine-gate__msg" id="gate-msg">BUILDING SHOTS</div>
          <i class="cine-gate__bar"><i id="gate-bar"></i></i>
          <button class="cine-gate__go" id="gate-go" disabled>INITIATE ▸</button>
          <div class="cine-gate__hint">SOUND ON · SPACE PLAY · C CAPTIONS · F FULLSCREEN</div>
        </div>
      </div>
    </div>
  </div>
  <div class="cine-ui">
    <div class="cine-scrub" id="scrub"><div class="cine-ticks" id="ticks"></div><i id="head"></i></div>
    <div class="cine-bar">
      <button id="b-play" title="Space">PLAY</button>
      <span class="cine-time" id="time">00:00.00</span>
      <span class="cine-shot" id="shot">—</span>
      <span class="cine-sp"></span>
      <button id="b-cap" title="C">CC EN</button>
      <button id="b-mute" title="M">SOUND ON</button>
      <button id="b-q" title="Q">3D 1.0</button>
      <button id="b-fs" title="F">FULL</button>
      <a href="./#/study" class="cine-back">KIT ↗</a>
    </div>
  </div>`;

if (capture) document.body.classList.add('is-capture');

const frameEl = root.querySelector<HTMLElement>('#frame')!;
const bg = root.querySelector<HTMLCanvasElement>('.cine-bg')!.getContext('2d', { alpha: false })!;
const fg = root.querySelector<HTMLCanvasElement>('.cine-fg')!.getContext('2d')!;
const glHost = root.querySelector<HTMLElement>('.cine-glhost')!;
const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
const ui = {
  play: $<HTMLButtonElement>('#b-play'),
  cap: $<HTMLButtonElement>('#b-cap'),
  mute: $<HTMLButtonElement>('#b-mute'),
  q: $<HTMLButtonElement>('#b-q'),
  fs: $<HTMLButtonElement>('#b-fs'),
  time: $('#time'),
  shot: $('#shot'),
  scrub: $('#scrub'),
  ticks: $('#ticks'),
  head: $('#head'),
  capEl: $('#cap'),
  capText: $('#cap span'),
  gate: $('#gate'),
  gateMsg: $('#gate-msg'),
  gateBar: $('#gate-bar'),
  gateGo: $<HTMLButtonElement>('#gate-go'),
};

const fit = () => {
  const full = !!document.fullscreenElement || capture;
  const barH = full ? 0 : 64;
  const s = capture ? 1 : Math.min(innerWidth / W, (innerHeight - barH) / H);
  frameEl.style.width = `${W * s}px`;
  frameEl.style.height = `${H * s}px`;
  frameEl.style.setProperty('--s', String(s));
};
addEventListener('resize', fit);
document.addEventListener('fullscreenchange', fit);
fit();

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  return `${String(m).padStart(2, '0')}:${(t - m * 60).toFixed(2).padStart(5, '0')}`;
};

/* ------------------------------------------------------------------ */
/* Audio clock                                                         */
/* ------------------------------------------------------------------ */
const actx = capture ? null : new AudioContext({ latencyHint: 'playback' });
const gain = actx?.createGain();
if (actx && gain) gain.connect(actx.destination);
let buffer: AudioBuffer | null = null;
const audioReady = actx
  ? fetch(`${import.meta.env.BASE_URL}${AUDIO_SRC}`)
      .then((r) => r.arrayBuffer())
      .then((b) => actx.decodeAudioData(b))
      .then((b) => (buffer = b))
      .catch((e) => console.warn('[cine] audio unavailable', e))
  : Promise.resolve(null);

let T = Number(params.get('t') ?? 0);
let playing = false;
let src: AudioBufferSourceNode | null = null;
let ctxStart = 0;
let offset = 0;
let wallStart = 0;
const clock = () => {
  if (!playing) return T;
  if (actx && src) return offset + Math.max(0, actx.currentTime - ctxStart - (actx.outputLatency || 0));
  return offset + (performance.now() - wallStart) / 1000;
};

(async () => {
  await loadFonts();
  const gl = await createGL(glHost, Number(params.get('q') ?? 1));
  const post = createPost(frameEl);
  // dev aid: ?only=S13,S24 builds just those shots (faster captures)
  const only = params.get('only')?.split(',');
  const tl = new Timeline(only ? SHOTS.filter((s) => only.includes(s.id)) : SHOTS, DURATION, { gl });
  if (!capture && params.has('perf')) {
    mountPerfHud();
    startPageMeter();
  }
  ui.ticks.innerHTML = tl.defs
    .map((d) => `<span style="left:${(d.t0 / DURATION) * 100}%;width:${((d.t1 - d.t0) / DURATION) * 100}%" title="${d.id} — ${d.title}"></span>`)
    .join('');

  await tl.buildAll((i, n, d) => {
    ui.gateMsg.textContent = `BUILDING ${String(i + 1).padStart(2, '0')}/${n} · ${d.title.toUpperCase()}`;
    ui.gateBar.style.width = `${((i + 1) / n) * 80}%`;
  });

  const frame: Frame = { T: 0, t: 0, dur: 1, u: 0, n: 0, bg, fg, three: null, gl, post: { ...POST_DEFAULT } };
  let lastShot = '';
  let capMode = 1; // 0 off, 1 EN, 2 ZH
  let lastCap = '';

  const renderAt = (time: number) => {
    const d = tl.at(time);
    bg.setTransform(1, 0, 0, 1, 0, 0);
    bg.globalAlpha = 1;
    bg.globalCompositeOperation = 'source-over';
    bg.filter = 'none';
    bg.fillStyle = '#000';
    bg.fillRect(0, 0, W, H);
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.globalAlpha = 1;
    fg.globalCompositeOperation = 'source-over';
    fg.filter = 'none';
    fg.clearRect(0, 0, W, H);
    frame.three = null;
    frame.T = time;
    frame.n = Math.floor(time * 30);
    Object.assign(frame.post, POST_DEFAULT);
    frame.post.tint = [...POST_DEFAULT.tint];
    if (d) {
      frame.t = time - d.t0;
      frame.dur = d.t1 - d.t0;
      frame.u = frame.t / frame.dur;
      try {
        tl.get(d)?.draw(frame);
      } catch (e) {
        console.error('[cine] draw', d.id, e);
      }
      if (d.id !== lastShot) {
        lastShot = d.id;
        ui.shot.textContent = `${d.id} · ${d.title}`;
      }
    }
    gl.render(frame.three);
    post.update(time, frame.post);
    // captions
    const line = LINES.find((l) => time >= l.t && time < l.t + l.d + 0.25);
    const cap = capMode && line ? (capMode === 1 ? line.en : line.zh) : '';
    if (cap !== lastCap) {
      lastCap = cap;
      ui.capEl.hidden = !cap;
      ui.capText.textContent = cap;
    }
    ui.time.textContent = `${fmt(time)} / ${fmt(DURATION)}`;
    ui.head.style.left = `${(time / DURATION) * 100}%`;
  };

  // warm-up: compile every shot's pipelines before playback
  ui.gateMsg.textContent = 'COMPILING SHADERS';
  for (const [i, d] of tl.defs.entries()) {
    renderAt(d.t0 + Math.min(0.3, (d.t1 - d.t0) / 2));
    ui.gateBar.style.width = `${80 + ((i + 1) / tl.defs.length) * 20}%`;
    await new Promise((r) => requestAnimationFrame(r));
  }
  await audioReady;

  const startAudio = () => {
    if (!actx || !buffer || !gain) {
      wallStart = performance.now();
      return;
    }
    src = actx.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    ctxStart = actx.currentTime + 0.06;
    src.start(ctxStart, Math.min(offset, buffer.duration - 0.01));
  };
  const stopAudio = () => {
    try {
      src?.stop();
    } catch {
      /* already stopped */
    }
    src?.disconnect();
    src = null;
  };
  const setPlaying = (p: boolean) => {
    if (p === playing) return;
    if (p) {
      if (T >= DURATION - 0.05) T = 0;
      offset = T;
      playing = true;
      actx?.resume();
      startAudio();
    } else {
      T = clock();
      playing = false;
      stopAudio();
    }
    ui.play.textContent = playing ? 'PAUSE' : 'PLAY';
    document.body.classList.toggle('is-playing', playing);
  };
  const seek = (t: number) => {
    const was = playing;
    if (was) setPlaying(false);
    T = Math.max(0, Math.min(DURATION - 0.01, t));
    renderAt(T);
    if (was) setPlaying(true);
  };

  const loop = () => {
    requestAnimationFrame(loop);
    if (!playing) return;
    const t = clock();
    if (t >= DURATION) {
      setPlaying(false);
      T = DURATION - 0.01;
      renderAt(T);
      return;
    }
    renderAt(t);
  };
  requestAnimationFrame(loop);
  renderAt(T);

  // gate
  ui.gateMsg.textContent = buffer || capture ? 'READY' : 'READY · AUDIO UNAVAILABLE';
  ui.gateBar.style.width = '100%';
  ui.gateGo.disabled = false;
  const openGate = () => {
    ui.gate.classList.add('is-open');
    setPlaying(true);
  };
  ui.gateGo.onclick = openGate;
  if (capture || params.has('t')) ui.gate.classList.add('is-open');

  // controls
  ui.play.onclick = () => (ui.gate.classList.contains('is-open') ? setPlaying(!playing) : openGate());
  ui.cap.onclick = () => {
    capMode = (capMode + 1) % 3;
    ui.cap.textContent = ['CC OFF', 'CC EN', 'CC 中文'][capMode];
    lastCap = '#';
    renderAt(clock());
  };
  ui.mute.onclick = () => {
    if (!gain) return;
    gain.gain.value = gain.gain.value > 0 ? 0 : 1;
    ui.mute.textContent = gain.gain.value > 0 ? 'SOUND ON' : 'MUTED';
  };
  ui.q.onclick = () => {
    const q = gl.quality === 1 ? 0.75 : gl.quality === 0.75 ? 0.5 : 1;
    gl.setQuality(q);
    ui.q.textContent = `3D ${q.toFixed(q < 1 ? 2 : 1)}`;
    renderAt(clock());
  };
  ui.fs.onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  const scrubTo = (e: PointerEvent) => {
    const r = ui.scrub.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * DURATION);
  };
  ui.scrub.addEventListener('pointerdown', (e) => {
    ui.gate.classList.add('is-open');
    ui.scrub.setPointerCapture(e.pointerId);
    const was = playing;
    setPlaying(false);
    scrubTo(e);
    const mv = (ev: PointerEvent) => scrubTo(ev);
    ui.scrub.addEventListener('pointermove', mv);
    ui.scrub.addEventListener(
      'pointerup',
      () => {
        ui.scrub.removeEventListener('pointermove', mv);
        if (was) setPlaying(true);
      },
      { once: true },
    );
  });
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      ui.play.click();
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.code === 'ArrowRight' ? 1 : -1;
      seek(clock() + dir * (e.shiftKey ? 1 / 30 : 1));
    } else if (e.code === 'KeyC') ui.cap.click();
    else if (e.code === 'KeyM') ui.mute.click();
    else if (e.code === 'KeyF') ui.fs.click();
    else if (e.code === 'KeyQ') ui.q.click();
    else if (e.code === 'Home') seek(0);
  });
  // auto-hide controls while playing
  let idle = 0;
  addEventListener('pointermove', () => {
    document.body.classList.remove('is-idle');
    clearTimeout(idle);
    idle = window.setTimeout(() => playing && document.body.classList.add('is-idle'), 2200);
  });

  (window as unknown as { __cine: unknown }).__cine = {
    duration: DURATION,
    shots: tl.defs.map((d) => ({ id: d.id, t0: d.t0, t1: d.t1, title: d.title })),
    seek: async (t: number) => {
      setPlaying(false);
      seek(t);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return gl.backend;
    },
  };
  document.body.dataset.ready = '1';
})().catch((e) => {
  console.error(e);
  ui.gateMsg.textContent = `RENDERER FAULT · ${String((e as Error)?.message ?? e)}`;
});
