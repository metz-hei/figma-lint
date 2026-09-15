import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const RULE_ID = "auto-layout-component-check";

const tempDir = mkdtempSync(join(tmpdir(), "figma-lint-autolayout-scope-"));
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

function node(overrides = {}, children = []) {
  const result = {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    type: overrides.type ?? "FRAME",
    visible: overrides.visible ?? true,
    layoutMode: overrides.layoutMode ?? "VERTICAL",
    children,
    parent: null,
    ...overrides,
  };

  if (children.length > 0) {
    result.children = children;
    for (const child of children) {
      child.parent = result;
    }
  }

  return result;
}

function group(id, children = []) {
  return node({ id, name: id, type: "GROUP" }, children);
}

function frame(id, children = []) {
  return node({ id, name: id, type: "FRAME", layoutMode: "VERTICAL" }, children);
}

function plainFrame(id, children = []) {
  return node({ id, name: id, type: "FRAME", layoutMode: "NONE" }, children);
}

function component(id, children = []) {
  return node({ id, name: id, type: "COMPONENT", layoutMode: "VERTICAL" }, children);
}

function componentSet(id, children = []) {
  return node({
    id,
    name: id,
    type: "COMPONENT_SET",
    layoutMode: "VERTICAL",
  }, children);
}

function instance(id, children = []) {
  return node({ id, name: id, type: "INSTANCE", layoutMode: "VERTICAL" }, children);
}

const componentAFrame = frame("component-a-frame", [
  group("component-a-frame-group"),
]);
const componentAGroup = group("component-a-group", [
  plainFrame("component-a-group-plain-frame"),
]);
const componentADeepGroup = group("component-a-deep-group");
const componentADeepPlainFrame = plainFrame("component-a-deep-frame");
const componentADeepTree = frame("component-a-level-1", [
  frame("component-a-level-2", [
    frame("component-a-level-3", [
      componentADeepGroup,
      componentADeepPlainFrame,
    ]),
  ]),
]);
const componentAPlainBranch = frame("component-a-plain-branch", [
  plainFrame("component-a-plain-frame"),
]);
const componentA = component("component-a", [
  componentAGroup,
  componentAFrame,
  componentADeepTree,
  componentAPlainBranch,
]);

const componentBGroup = group("component-b-group");
const componentB = component("component-b", [componentBGroup]);

const instanceBridgeDeepGroup = group("instance-bridge-deep-group", [
  plainFrame("instance-bridge-deep-frame"),
]);
const instanceBridgeComponent = component("instance-bridge-component", [
  instance("instance-bridge-instance", [
    frame("instance-bridge-frame", [
      instanceBridgeDeepGroup,
    ]),
  ]),
]);
const instanceBridgeSibling = component("instance-bridge-sibling", [
  group("instance-bridge-sibling-group"),
]);

const componentSetVariant = component("component-set-variant", [
  group("component-set-group"),
]);
const variants = componentSet("component-set", [componentSetVariant]);

const pageChildren = [
  componentA,
  componentB,
  variants,
  instanceBridgeComponent,
  instanceBridgeSibling,
];
const page = {
  id: "page",
  name: "Page",
  type: "PAGE",
  children: pageChildren,
  selection: [],
};

for (const child of pageChildren) {
  child.parent = page;
}

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

async function lintNodeIds(roots) {
  const issues = await lintAutoLayoutNodes(enabledRuleIds, roots);
  return issues.map((issue) => issue.nodeId).sort();
}

function expectIds(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected.sort());

  if (actualJson !== expectedJson) {
    console.error(`FAIL ${label}: expected ${expectedJson}, got ${actualJson}`);
    process.exit(1);
  }

  console.log(`ok: ${label}`);
}

expectIds(
  "selection = [COMPONENT] проходит через INSTANCE до глубоких GROUP и FRAME",
  await lintNodeIds([instanceBridgeComponent]),
  ["instance-bridge-deep-frame", "instance-bridge-deep-group"],
);

expectIds(
  "selection = [COMPONENT] через INSTANCE не проверяет соседний COMPONENT",
  await lintNodeIds([instanceBridgeComponent]),
  ["instance-bridge-deep-frame", "instance-bridge-deep-group"],
);

expectIds(
  "selection = [COMPONENT, COMPONENT] через INSTANCE проверяет только выбранные roots",
  await lintNodeIds([instanceBridgeComponent, instanceBridgeSibling]),
  [
    "instance-bridge-deep-frame",
    "instance-bridge-deep-group",
    "instance-bridge-sibling-group",
  ],
);

expectIds(
  "selection = [COMPONENT] находит GROUP внутри Auto Layout FRAME",
  await lintNodeIds([
    component("isolated-component-with-group", [
      frame("isolated-component-with-group-frame", [
        group("isolated-component-group"),
      ]),
    ]),
  ]),
  ["isolated-component-group"],
);

expectIds(
  "selection = [COMPONENT] находит FRAME без Auto Layout внутри Auto Layout FRAME",
  await lintNodeIds([
    component("isolated-component-with-frame", [
      frame("isolated-component-with-frame-frame", [
        plainFrame("isolated-component-plain-frame"),
      ]),
    ]),
  ]),
  ["isolated-component-plain-frame"],
);

expectIds(
  "selection = [COMPONENT] находит нарушение на глубине 4 уровней",
  await lintNodeIds([
    component("isolated-component-deep", [
      frame("isolated-level-1", [
        frame("isolated-level-2", [
          frame("isolated-level-3", [
            group("isolated-level-4-group"),
          ]),
        ]),
      ]),
    ]),
  ]),
  ["isolated-level-4-group"],
);

expectIds(
  "selection = [COMPONENT A] проверяет только COMPONENT A",
  await lintNodeIds([componentA]),
  [
    "component-a-deep-frame",
    "component-a-deep-group",
    "component-a-frame-group",
    "component-a-group",
    "component-a-group-plain-frame",
    "component-a-plain-frame",
  ],
);

expectIds(
  "selection = [COMPONENT B] проверяет только COMPONENT B",
  await lintNodeIds([componentB]),
  ["component-b-group"],
);

expectIds(
  "selection = [FRAME внутри COMPONENT A] не поднимается к COMPONENT A",
  await lintNodeIds([componentAFrame]),
  ["component-a-frame-group"],
);

expectIds(
  "selection = [FRAME внутри COMPONENT A] проверяет весь subtree FRAME",
  await lintNodeIds([componentADeepTree]),
  ["component-a-deep-frame", "component-a-deep-group"],
);

expectIds(
  "selection = [GROUP внутри COMPONENT A] не поднимается к COMPONENT A",
  await lintNodeIds([componentAGroup]),
  ["component-a-group", "component-a-group-plain-frame"],
);

expectIds(
  "selection = [COMPONENT A, COMPONENT B] проверяет оба выделенных scope",
  await lintNodeIds([componentA, componentB]),
  [
    "component-a-deep-frame",
    "component-a-deep-group",
    "component-a-frame-group",
    "component-a-group",
    "component-a-group-plain-frame",
    "component-a-plain-frame",
    "component-b-group",
  ],
);

expectIds(
  "selection пустой сохраняет page-wide проверку currentPage",
  await lintNodeIds(pageChildren),
  [
    "component-a-frame-group",
    "component-a-group",
    "component-a-group-plain-frame",
    "component-a-deep-frame",
    "component-a-deep-group",
    "component-a-plain-frame",
    "component-b-group",
    "component-set-group",
    "instance-bridge-deep-frame",
    "instance-bridge-deep-group",
    "instance-bridge-sibling-group",
  ],
);
