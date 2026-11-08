import { defineConfig } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtimeAssets = ['favicon.svg', 'anim/rig.glb', 'anim/CREDITS.md', 'audio/film.mp3'];

export default defineConfig({
  plugins: [{
    name: 'runtime-public-assets',
    apply: 'build',
    async generateBundle() {
      for (const fileName of runtimeAssets) {
        const source = await readFile(resolve(import.meta.dirname, 'public', fileName));
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  }],
  build: {
    copyPublicDir: false,
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        cinema: resolve(import.meta.dirname, 'cinema.html'),
      },
    },
  },
  server: { host: true },
});
