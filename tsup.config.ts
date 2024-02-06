// @ts-ignore
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['lib/index.ts'],
  format: ['esm'],
  outDir: 'build',
  dts: true,
  clean: true,
});
