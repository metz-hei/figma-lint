import { readFileSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const { version } = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  base: "./",
  root: path.resolve(__dirname, "src/ui"),
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/ui"),
      "@shared": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    target: "es2017",
    rollupOptions: {
      input: path.resolve(__dirname, "src/ui/index.html"),
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
