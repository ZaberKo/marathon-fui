/** Lazy, cancel-safe mounting of a 3D scene into a host element. */
import type { SceneHandle } from '../three/scenes/index';

const FALLBACK_EVENT = 'gpu-fallback'; // mirrors GPU_FALLBACK_EVENT in three/core (kept local so this stays lazy)

export function mountGL(host: HTMLElement, factory: (host: HTMLElement, signal: AbortSignal) => Promise<SceneHandle>, onReady?: (h: SceneHandle) => void) {
  let disposed = false;
  let attempt: AbortController | null = null;
  let fallback = false;
  let handle: SceneHandle | null = null;
  let splash: HTMLElement | null = null;
  let retries = 0;
  let retry = 0;
  const start = async () => {
    if (disposed) return;
    attempt = new AbortController();
    splash?.remove();
    const boot = document.createElement('div');
    splash = boot;
    boot.className = 'gl-fallback';
    boot.style.color = 'var(--c-mute)';
    boot.innerHTML = '<span class="fx-blink">INIT RENDERER…</span>';
    host.appendChild(boot);
    try {
      const mounted = await factory(host, attempt.signal);
      attempt = null;
      boot.remove();
      splash = null;
      if (disposed) return mounted.dispose();
      if (fallback && mounted.stage.backend === 'WebGPU') {
        mounted.dispose();
        void start();
        return;
      }
      handle = mounted;
      onReady?.(mounted);
    } catch (error) {
      attempt = null;
      if (disposed) return;
      handle?.dispose();
      handle = null;
      // The GPU process may still be resetting after a device loss.
      if (retries++ < 3) {
        boot.remove();
        retry = window.setTimeout(start, 400 * retries);
        return;
      }
      console.error(error);
      boot.innerHTML = '<span>RENDERER FAULT</span><span class="t-micro"></span>';
      boot.lastElementChild!.textContent = String((error as Error)?.message ?? error).slice(0, 80);
      boot.style.color = '';
      if (!boot.isConnected) host.appendChild(boot);
      splash = boot;
    }
  };

  const onFallback = () => {
    if (disposed) return;
    fallback = true;
    retries = 0;
    clearTimeout(retry);
    if (attempt) return;
    handle?.dispose();
    handle = null;
    void start();
  };
  window.addEventListener(FALLBACK_EVENT, onFallback);
  void start();

  return () => {
    disposed = true;
    window.removeEventListener(FALLBACK_EVENT, onFallback);
    attempt?.abort();
    clearTimeout(retry);
    splash?.remove();
    splash = null;
    handle?.dispose();
    handle = null;
  };
}
