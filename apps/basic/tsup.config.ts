import { defineConfig } from "tsup";

export default defineConfig((_options) => {
  return {
    entry: ["./src/index.ts"],
    splitting: true,
    sourcemap: false,
    clean: true,
    dts: false,
    minify: false,
  };
});
