// @ts-ignore
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  dts: true,
  clean: true,
  minify: true,
});
