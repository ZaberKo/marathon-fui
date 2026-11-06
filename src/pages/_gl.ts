/** Lazy, cancel-safe mounting of a 3D scene into a host element. */
import type { SceneHandle } from '../three/scenes/index';

const FALLBACK_EVENT = 'gpu-fallback'; // mirrors GPU_FALLBACK_EVENT in three/core (kept local so this stays lazy)

export function mountGL(host: HTMLElement, factory: (host: HTMLElement) => Promise<SceneHandle>, onReady?: (h: SceneHandle) => void) {
  let disposed = false;
  let handle: SceneHandle | null = null;
  let gen = 0;

  let retries = 0;
  const start = () => {
    const my = ++gen;
    const boot = document.createElement('div');
    boot.className = 'gl-fallback';
    boot.style.color = 'var(--c-mute)';
    boot.innerHTML = '<span class="fx-blink">INIT RENDERER…</span>';
    host.appendChild(boot);
    factory(host)
      .then((h) => {
        boot.remove();
        if (disposed || my !== gen) return h.dispose();
        handle = h;
        onReady?.(h);
      })
      .catch((err) => {
        if (disposed || my !== gen) return boot.remove();
        // GPU process may be mid-reset right after a WebGPU device loss — retry briefly
        if (retries++ < 3) {
          boot.remove();
          setTimeout(() => !disposed && my === gen && start(), 400 * retries);
          return;
        }
        console.error(err);
        boot.innerHTML = `<span>RENDERER FAULT</span><span class="t-micro">${String(err?.message ?? err).slice(0, 80)}</span>`;
        boot.style.color = '';
      });
  };

  const onFallback = () => {
    if (disposed) return;
    handle?.dispose();
    handle = null;
    start();
  };
  window.addEventListener(FALLBACK_EVENT, onFallback);
  start();

  return () => {
    disposed = true;
    window.removeEventListener(FALLBACK_EVENT, onFallback);
    handle?.dispose();
  };
}
