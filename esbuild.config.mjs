import * as esbuild from "esbuild";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const watch = process.argv.includes("--watch");

mkdirSync("dist", { recursive: true });

let uiHtml = '""';
if (existsSync("dist/index.html")) {
  uiHtml = JSON.stringify(readFileSync("dist/index.html", "utf8"));
} else {
  console.warn(
    "dist/index.html не найден — сначала выполните npm run build:ui",
  );
}

const buildOptions = {
  entryPoints: ["src/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  target: "es2017",
  logLevel: "info",
  define: {
    __html__: uiHtml,
  },
};

const ctx = await esbuild.context(buildOptions);

if (watch) {
  await ctx.watch();
  console.log("Watching main...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
