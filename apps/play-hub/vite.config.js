import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  // URL thực tế:
  // http://localhost/MyWebsite/ttgo/play-hub/
  base: '/MyWebsite/ttgo/play-hub/',

  build: {
    // apps/play-hub -> ../../play-hub
    outDir: path.resolve(__dirname, '../../play-hub'),
    emptyOutDir: true,
  },
});