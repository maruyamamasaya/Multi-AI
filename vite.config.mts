import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react()],
  root: 'src/renderer',
  build: {
    emptyOutDir: true,
    outDir: '../../dist-renderer',
  },
  test: {
    environment: 'jsdom',
    exclude: ['dist-electron/**', 'dist-renderer/**', 'node_modules/**'],
    fileParallelism: false,
    maxWorkers: 1,
    pool: 'threads',
    root: '.',
    setupFiles: ['./src/renderer/test/setup.ts'],
  },
});
