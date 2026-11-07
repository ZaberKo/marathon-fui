import { api } from './gemini.mjs';
const filter = new RegExp(process.argv[2] ?? 'lyria|tts|music|audio', 'i');
let token = '';
const out = [];
do {
  const r = await api(`models?pageSize=200${token ? `&pageToken=${token}` : ''}`);
  for (const m of r.models ?? []) if (filter.test(m.name) || filter.test(m.displayName ?? '')) out.push(`${m.name}  [${(m.supportedGenerationMethods ?? []).join(',')}]  in:${m.inputTokenLimit ?? '-'} out:${m.outputTokenLimit ?? '-'}  ${m.displayName ?? ''}`);
  token = r.nextPageToken ?? '';
} while (token);
console.log(out.join('\n') || '(no match)');
