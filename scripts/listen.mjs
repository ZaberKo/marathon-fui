// Use a multimodal Gemini model as "ears": send audio files + a question, print the answer.
import fs from 'node:fs';
import { api } from './gemini.mjs';
const args = process.argv.slice(2);
const qi = args.indexOf('--');
const files = qi >= 0 ? args.slice(0, qi) : args.slice(0, -1);
const question = qi >= 0 ? args.slice(qi + 1).join(' ') : args.at(-1);
const model = process.env.EAR ?? 'gemini-3.8-flash';
const parts = [];
for (const f of files) {
  const mime = f.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
  parts.push({ text: `File: ${f.split('/').pop()}` });
  parts.push({ inlineData: { mimeType: mime, data: fs.readFileSync(f).toString('base64') } });
}
parts.push({ text: question });
const r = await api(`models/${model}:generateContent`, { method: 'POST', body: { contents: [{ parts }], generationConfig: { temperature: 0.2 } } });
console.log(r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('\n'));
