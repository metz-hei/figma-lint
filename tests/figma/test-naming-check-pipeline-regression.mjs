import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = mkdtempSync(join(tmpdir(), "figma-lint-naming-pipeline-"));
const outfile = join(tempDir, "figma-lint.mjs");
await build({
  entryPoints: ["src/figma-lint.ts"], outfile, bundle: true,
  platform: "node", format: "esm", target: "es2017", logLevel: "silent",
});

function variant(id, name, variantProperties) {
  return {
    id, name, type: "COMPONENT", visible: true, children: [], parent: null,
    variantProperties,
    get componentPropertyDefinitions() {
      throw new Error("definitions unavailable for component-set variant");
    },
  };
}

const valid = variant("valid", "💻 Button", { State: "Default" });
const invalid = variant("invalid", "State=Default", { "bad_prop": "very-large" });
const set = {
  id: "set", name: "💻 Button Set", type: "COMPONENT_SET", visible: true,
  children: [valid, invalid], parent: null,
  componentPropertyDefinitions: {
    State: { type: "VARIANT", defaultValue: "Default", variantOptions: ["Default"] },
  },
};
valid.parent = set;
invalid.parent = set;
const page = { id: "page", name: "Page", type: "PAGE", children: [set], selection: [set] };
set.parent = page;

globalThis.figma = {
  currentPage: page,
  variables: {
    getLocalVariablesAsync: async () => [],
    getVariableByIdAsync: async () => null,
    getVariableCollectionByIdAsync: async () => null,
  },
};

const { lintAutoLayoutNodes } = await import(pathToFileURL(outfile).href);
const issues = await lintAutoLayoutNodes(new Set(["naming-check"]), page.selection);

// Имя варианта внутри сета не проверяем (его генерирует Figma), поэтому у
// invalid остаются только нарушения props: «bad_prop» и «very-large».
if (issues.length !== 2 || !issues.every((issue) => issue.nodeId === "invalid")) {
  throw new Error(`FAIL pipeline returned unexpected issues: ${JSON.stringify(issues)}`);
}

console.log("ok: selection → COMPONENT_SET → variants завершается при throwing getter");
console.log("ok: корректный variant завершается без issues, нарушения props возвращают issues");
