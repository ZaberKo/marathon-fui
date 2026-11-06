/**
 * Stepped toast notifications.
 *   notify({ title, msg, state: 'nominal' | 'caution' | 'critical' | 'cobalt', ttl })
 */
import gsap from 'gsap';
import { hex } from './util';

let host: HTMLElement | null = null;

export function notify({ title = 'SIGNAL', msg = '', state = 'nominal', ttl = 3600 }: { title?: string; msg?: string; state?: string; ttl?: number } = {}) {
  if (!host) {
    host = document.createElement('div');
    host.className = 'k-toasts';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'k-toast';
  el.dataset.state = state;
  el.style.setProperty('--ttl', `${ttl}ms`);
  el.innerHTML = `
    <div class="k-toast__code">${hex(Math.random() * 65535)}</div>
    <div class="k-toast__body"><b>${title}</b><span>${msg}</span></div>
    <button class="k-toast__x" aria-label="Dismiss">×</button>
    <i class="k-toast__life"></i>`;
  host.prepend(el);
  gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.24, ease: 'steps(6)' });
  const kill = () => {
    gsap.to(el, { clipPath: 'inset(0 0 0 100%)', duration: 0.18, ease: 'steps(4)', onComplete: () => el.remove() });
  };
  const t = setTimeout(kill, ttl);
  el.querySelector('button')!.addEventListener('click', () => {
    clearTimeout(t);
    kill();
  });
  return kill;
}
