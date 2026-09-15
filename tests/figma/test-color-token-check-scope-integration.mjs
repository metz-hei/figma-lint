import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const RULE_ID = "ColorTokenCheck";

const tempDir = mkdtempSync(join(tmpdir(), "figma-lint-color-scope-"));
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

function attach(parent, children = []) {
  parent.children = children;
  for (const child of children) {
    child.parent = parent;
  }
  return parent;
}

function node(overrides = {}, children = []) {
  const result = {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    type: overrides.type ?? "FRAME",
    visible: overrides.visible ?? true,
    parent: null,
    ...overrides,
  };

  return children.length > 0 ? attach(result, children) : result;
}

function component(id, layoutMode, children = []) {
  return node({ id, type: "COMPONENT", layoutMode }, children);
}

function frame(id, layoutMode, children = []) {
  return node({ id, type: "FRAME", layoutMode }, children);
}

function group(id, children = []) {
  return node({ id, type: "GROUP" }, children);
}

function rectangle(id, paints) {
  return node({
    id,
    type: "RECTANGLE",
    fills: paints.fills ?? [],
    strokes: paints.strokes ?? [],
  });
}

function solidPaint() {
  return {
    type: "SOLID",
    visible: true,
    color: { r: 0, g: 0, b: 0 },
  };
}

function buildSelectedTree(layoutMode) {
  const rectangleA = rectangle("rectangle-a", {
    fills: [solidPaint()],
  });
  const rectangleB = rectangle("rectangle-b", {
    strokes: [solidPaint()],
  });

  return component("selected-component", layoutMode, [
    frame("container", layoutMode, [
      rectangleA,
      group("group", [
        frame("nested-container", "NONE", [
          rectangleB,
        ]),
      ]),
    ]),
  ]);
}

const siblingComponent = component("sibling-component", "NONE", [
  rectangle("sibling-rectangle", {
    fills: [solidPaint()],
  }),
]);

const page = attach(
  {
    id: "page",
    name: "Page",
    type: "PAGE",
    selection: [],
  },
  [siblingComponent],
);

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

async function lintColorIssues(root) {
  page.children = [root, siblingComponent];
  root.parent = page;
  siblingComponent.parent = page;
  page.selection = [root];

  const issues = await lintAutoLayoutNodes(enabledRuleIds, page.selection);
  await new Promise((resolve) => setTimeout(resolve, 0));

  return issues
    .filter((issue) => issue.ruleId === RULE_ID)
    .map((issue) => ({
      nodeId: issue.nodeId,
      match: issue.match,
    }))
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
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

const noAutoLayoutIssues = await lintColorIssues(buildSelectedTree("NONE"));
const autoLayoutIssues = await lintColorIssues(buildSelectedTree("VERTICAL"));
const expectedIssues = [
  { nodeId: "rectangle-a", match: "fill: #000000" },
  { nodeId: "rectangle-b", match: "Stroke: #000000" },
];

expectIssues(
  "selected COMPONENT без Auto Layout находит Fill и Stroke в descendants",
  noAutoLayoutIssues,
  expectedIssues,
);

expectIssues(
  "selected COMPONENT с Auto Layout даёт тот же ColorTokenCheck result",
  autoLayoutIssues,
  expectedIssues,
);

if (
  noAutoLayoutIssues.some((issue) => issue.nodeId === "sibling-rectangle") ||
  autoLayoutIssues.some((issue) => issue.nodeId === "sibling-rectangle")
) {
  console.error("FAIL sibling component outside selection was scanned");
  process.exit(1);
}

console.log("ok: соседний COMPONENT вне selection не сканируется");
