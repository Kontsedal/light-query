import { defineConfig } from "tsup";
import { esbuildPluginFilePathExtensions } from "esbuild-plugin-file-path-extensions";
export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm"],
  outDir: "dist",
  dts: true,
  clean: true,
  minify: true,
  esbuildPlugins: [esbuildPluginFilePathExtensions({ esmExtension: "js" })],
});
