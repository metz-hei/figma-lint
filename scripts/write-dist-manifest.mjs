import { mkdirSync, writeFileSync } from "node:fs";

const manifest = {
  name: "Figma Lint",
  id: "figma-lint-dev",
  api: "1.0.0",
  editorType: ["figma"],
  main: "code.js",
  documentAccess: "dynamic-page",
  networkAccess: {
    allowedDomains: ["https://speller.yandex.net"],
    reasoning:
      "Проверка орфографии через API Яндекс.Спеллера (ru/en).",
  },
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Wrote dist/manifest.json");
