import assert from "node:assert/strict";

import * as esbuild from "esbuild";

const ruleId = "spacing-from-space";

function attach(parent, children = []) {
  parent.children = children;
  for (const child of children) child.parent = parent;
  return parent;
}

function node(overrides = {}, children = []) {
  const result = {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    type: overrides.type ?? "FRAME",
    visible: overrides.visible ?? true,
    parent: null,
    layoutMode: overrides.layoutMode ?? "NONE",
    ...overrides,
  };

  return children.length > 0 ? attach(result, children) : result;
}

function component(id, children = []) {
  return node({ id, type: "COMPONENT", layoutMode: "VERTICAL" }, children);
}

function frame(id, overrides = {}, children = []) {
  return node({ id, type: "FRAME", layoutMode: "VERTICAL", ...overrides }, children);
}

function group(id, children = []) {
  return node({ id, type: "GROUP", layoutMode: "NONE" }, children);
}

function spacingFrame(id, overrides = {}) {
  return frame(id, { paddingTop: 8, ...overrides });
}

const componentADeepViolation = spacingFrame("component-a-deep-spacing");
const componentAFrame = frame("component-a-frame", {}, [
  frame("component-a-middle-frame", {}, [
    componentADeepViolation,
  ]),
]);
const componentAOtherViolation = spacingFrame("component-a-other-spacing");
const componentAOutsideSelectedViolation = spacingFrame(
  "component-a-outside-selected-spacing",
);
const componentASelectedChildViolation = spacingFrame(
  "component-a-selected-child-spacing",
);
const componentASelectedFrame = frame(
  "component-a-selected-frame",
  { itemSpacing: 12 },
  [
    group("component-a-selected-group", [
      componentASelectedChildViolation,
    ]),
  ],
);
const componentA = component("component-a", [
  componentAFrame,
  componentAOtherViolation,
  componentAOutsideSelectedViolation,
  componentASelectedFrame,
]);

const componentBViolation = spacingFrame("component-b-spacing");
const componentB = component("component-b", [componentBViolation]);

const page = attach(
  {
    id: "page",
    name: "Page",
    type: "PAGE",
    selection: [componentA],
  },
  [componentA, componentB],
);

const postedMessages = [];
let pendingLintResolve;

globalThis.figma = {
  currentPage: page,
  showUI() {},
  ui: {
    onmessage: undefined,
    postMessage(message) {
      postedMessages.push(message);
      if (message.type === "lint-result" && pendingLintResolve) {
        const resolve = pendingLintResolve;
        pendingLintResolve = undefined;
        resolve(message);
      }
    },
  },
  clientStorage: {
    async getAsync() {
      return { enabledRuleIds: [ruleId] };
    },
    async setAsync() {},
  },
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
  notify() {},
  closePlugin() {},
};

const build = await esbuild.build({
  entryPoints: [new URL("../../src/code.ts", import.meta.url).pathname],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  define: { __html__: '""' },
});
const source = build.outputFiles[0].text;
await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

while (!postedMessages.some((message) => message.type === "init")) {
  await new Promise((resolve) => setImmediate(resolve));
}

assert.equal(typeof figma.ui.onmessage, "function");

async function runLintForSelection(selection) {
  page.selection = selection;

  const lintResultPromise = new Promise((resolve) => {
    pendingLintResolve = resolve;
  });

  figma.ui.onmessage({ type: "lint" });
  const result = await lintResultPromise;

  return result.issues
    .filter((issue) => issue.ruleId === ruleId)
    .map((issue) => issue.nodeId)
    .sort();
}

assert.deepEqual(
  await runLintForSelection([componentA]),
  [
    "component-a-deep-spacing",
    "component-a-other-spacing",
    "component-a-outside-selected-spacing",
    "component-a-selected-child-spacing",
    "component-a-selected-frame",
  ].sort(),
  "selection = COMPONENT A должен проверять только COMPONENT A и весь его subtree",
);

console.log(
  "ok: selection = COMPONENT A находит глубокие нарушения и не сканирует COMPONENT B",
);

assert.deepEqual(
  await runLintForSelection([componentASelectedFrame]),
  [
    "component-a-selected-child-spacing",
    "component-a-selected-frame",
  ].sort(),
  "selection = вложенный FRAME должен проверять только этот FRAME и descendants",
);

console.log(
  "ok: selection = вложенный FRAME не поднимается к COMPONENT A и не сканирует COMPONENT B",
);
