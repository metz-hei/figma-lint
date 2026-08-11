import assert from "node:assert/strict";

import * as esbuild from "esbuild";

const ruleId = "auto-layout-component-check";

function attach(parent, children) {
  parent.children = children;
  for (const child of children) child.parent = parent;
  return parent;
}

const group = {
  id: "group-1",
  name: "Nested Group",
  type: "GROUP",
  visible: true,
};
const component = attach(
  {
    id: "component-1",
    name: "Master Component",
    type: "COMPONENT",
    visible: true,
    layoutMode: "VERTICAL",
  },
  [group],
);
const page = attach(
  {
    id: "page-1",
    name: "Current Page",
    type: "PAGE",
    selection: [group],
  },
  [component],
);

const postedMessages = [];
let resolveLintResult;
const lintResultPromise = new Promise((resolve) => {
  resolveLintResult = resolve;
});

globalThis.figma = {
  currentPage: page,
  showUI() {},
  ui: {
    onmessage: undefined,
    postMessage(message) {
      postedMessages.push(message);
      if (message.type === "lint-result") resolveLintResult(message);
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
figma.ui.onmessage({ type: "lint" });

const lintResult = await lintResultPromise;
const componentIssues = lintResult.issues.filter(
  (issue) => issue.ruleId === ruleId,
);

assert.equal(
  componentIssues.length,
  1,
  "COMPONENT → вложенный GROUP должен дать ровно одно замечание через обработчик кнопки «Проверить»",
);
assert.equal(componentIssues[0].nodeId, group.id);

console.log(
  "ok: кнопка «Проверить» на вложенном GROUP возвращает ровно одно замечание для мастер-компонента",
);
