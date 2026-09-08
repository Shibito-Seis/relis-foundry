import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/relis.ts",
      formats: ["es"],
      fileName: () => "relis.mjs",
    },
    minify: false,
    outDir: "scripts",
    sourcemap: true,
    target: "es2022",
  },
});
