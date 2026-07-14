import * as esbuild from "esbuild";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const watch = process.argv.includes("--watch");
const rootDir = import.meta.dirname;

mkdirSync("dist", { recursive: true });

let uiHtml = '""';
if (existsSync("dist/index.html")) {
  uiHtml = JSON.stringify(readFileSync("dist/index.html", "utf8"));
} else {
  console.warn(
    "dist/index.html не найден — сначала выполните npm run build:ui",
  );
}

const spellTxtDir = join(rootDir, "src/spell");

function getSpellTxtFiles() {
  return readdirSync(spellTxtDir)
    .filter((name) => name.endsWith(".txt"))
    .map((name) => join(spellTxtDir, name));
}

const spellTxtFiles = getSpellTxtFiles();

/** ponytail: явный watch для словарей — в watch-режиме .txt иногда не триггерит rebuild */
const spellTxtPlugin = {
  name: "spell-txt",
  setup(build) {
    build.onLoad({ filter: /\/spell\/[^/]+\.txt$/ }, (args) => ({
      contents: readFileSync(args.path, "utf8"),
      loader: "text",
      watchFiles: spellTxtFiles,
    }));
  },
};

const buildOptions = {
  entryPoints: ["src/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  target: "es2017",
  logLevel: "info",
  plugins: [spellTxtPlugin],
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
