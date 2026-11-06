/** Markup helpers shared by demo pages. */
import { pixelSigil } from '../lib/glyphs';

export function pageHead(num: string, title: string, meta: string[], seed = 1) {
  return `
  <header class="page-head">
    <div class="page-index">${num} //</div>
    <h1 class="page-title">${title}</h1>
    <div class="page-meta">
      <div style="justify-self:end;color:var(--accent)">${pixelSigil(seed, { w: 7, h: 5, size: 42 })}</div>
      ${meta.map((m) => `<div class="t-micro">${m}</div>`).join('')}
    </div>
  </header>`;
}

export function section(label: string, micro = '') {
  return `<h2 class="section-label">${label}${micro ? `<span class="t-micro">${micro}</span>` : ''}</h2>`;
}

export function spec(o: { code: string; cls?: string; body: string; foot?: string; bodyCls?: string; style?: string; title?: string }) {
  return `
  <article class="spec" ${o.style ? `style="${o.style}"` : ''}>
    <div class="spec-head"><span class="code">${o.code}</span>${o.title ? `<span>${o.title}</span>` : ''}${o.cls ? `<span class="cls">${o.cls}</span>` : ''}</div>
    <div class="spec-body ${o.bodyCls ?? ''}">${o.body}</div>
    ${o.foot ? `<div class="spec-foot">${o.foot}</div>` : ''}
  </article>`;
}
