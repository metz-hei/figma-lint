import { mkdirSync, writeFileSync } from "node:fs";

const manifest = {
  name: "Figma Lint",
  id: "figma-lint-dev",
  api: "1.0.0",
  editorType: ["figma"],
  main: "code.js",
  documentAccess: "dynamic-page",
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Wrote dist/manifest.json");
