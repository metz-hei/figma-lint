import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const RULE_ID = "ColorTokenCheck";

const tempDir = mkdtempSync(join(tmpdir(), "figma-lint-color-dedupe-"));
const outfile = join(tempDir, "figma-lint.mjs");

await build({
  entryPoints: ["src/figma-lint.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2017",
  logLevel: "silent",
});

function solidPaint(bound = false) {
  return {
    type: "SOLID",
    visible: true,
    color: { r: 0, g: 0, b: 0 },
    boundVariables: bound ? { color: { id: "color-token" } } : undefined,
  };
}

function rectangle(id, fills, strokes) {
  return {
    id,
    name: id,
    type: "RECTANGLE",
    visible: true,
    parent: page,
    fills,
    strokes,
  };
}

const page = {
  id: "page",
  name: "Page",
  type: "PAGE",
  selection: [],
  children: [],
};

globalThis.figma = {
  currentPage: page,
  variables: {
    async getLocalVariablesAsync() {
      return [];
    },
    async getVariableByIdAsync() {
      return null;
    },
    async getVariableCollectionByIdAsync() {
      return null;
    },
  },
};

const { lintAutoLayoutNodes } = await import(pathToFileURL(outfile).href);
const enabledRuleIds = new Set([RULE_ID]);

async function lintColorIssues(roots) {
  page.children = Array.from(new Set(roots));
  page.selection = roots;

  const issues = await lintAutoLayoutNodes(enabledRuleIds, roots);
  await new Promise((resolve) => setTimeout(resolve, 0));

  return issues
    .filter((issue) => issue.ruleId === RULE_ID)
    .map((issue) => ({
      nodeId: issue.nodeId,
      match: issue.match,
    }))
    .sort((a, b) => a.match.localeCompare(b.match));
}

function expectIssues(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    console.error(`FAIL ${label}: expected ${expectedJson}, got ${actualJson}`);
    process.exit(1);
  }

  console.log(`ok: ${label}`);
}

const manualFillAndStroke = rectangle(
  "manual-fill-and-stroke",
  [solidPaint()],
  [solidPaint()],
);
expectIssues(
  "manual Fill и manual Stroke на одном RECTANGLE дают два замечания",
  await lintColorIssues([manualFillAndStroke]),
  [
    { nodeId: "manual-fill-and-stroke", match: "fill: #000000" },
    { nodeId: "manual-fill-and-stroke", match: "Stroke: #000000" },
  ],
);

const manualFillTokenStroke = rectangle(
  "manual-fill-token-stroke",
  [solidPaint()],
  [solidPaint(true)],
);
expectIssues(
  "manual Fill и token Stroke дают одно Fill замечание",
  await lintColorIssues([manualFillTokenStroke]),
  [{ nodeId: "manual-fill-token-stroke", match: "fill: #000000" }],
);

const tokenFillManualStroke = rectangle(
  "token-fill-manual-stroke",
  [solidPaint(true)],
  [solidPaint()],
);
expectIssues(
  "token Fill и manual Stroke дают одно Stroke замечание",
  await lintColorIssues([tokenFillManualStroke]),
  [{ nodeId: "token-fill-manual-stroke", match: "Stroke: #000000" }],
);

const tokenFillAndStroke = rectangle(
  "token-fill-and-stroke",
  [solidPaint(true)],
  [solidPaint(true)],
);
expectIssues(
  "token Fill и token Stroke не дают замечаний",
  await lintColorIssues([tokenFillAndStroke]),
  [],
);

const duplicatedRoot = rectangle("duplicated-root", [solidPaint()], []);
expectIssues(
  "настоящее дублирование одного ColorTokenCheck issue удаляется",
  await lintColorIssues([duplicatedRoot, duplicatedRoot]),
  [{ nodeId: "duplicated-root", match: "fill: #000000" }],
);
