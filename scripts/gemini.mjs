// Minimal Gemini API helper for the offline audio pipeline.
// Reads the key from the project .env (never printed) — GOOGLE_API_KEY / Google_API_KEY / GEMINI_API_KEY.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
function loadKey() {
  const file = path.join(root, '.env');
  const env = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  const key = env.GOOGLE_API_KEY ?? env.Google_API_KEY ?? env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!key) throw new Error('No API key found in .env (GOOGLE_API_KEY / Google_API_KEY / GEMINI_API_KEY)');
  return key;
}
export const KEY = loadKey();
export const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function api(pathname, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/${pathname}`, {
    method,
    headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 2000) }; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 1500)}`);
    err.status = res.status;
    err.json = json;
    throw err;
  }
  return json;
}
