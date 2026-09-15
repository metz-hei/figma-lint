import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const RULE_ID = "PrimaryButtonDisabledCheck";

const tempDir = mkdtempSync(join(tmpdir(), "figma-lint-primary-button-"));
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

function component(id, children = []) {
  return node({ id, name: id, type: "COMPONENT" }, children);
}

function instance(id, overrides = {}, children = []) {
  return node({ id, name: id, type: "INSTANCE", ...overrides }, children);
}

function frame(id, children = []) {
  return node({ id, name: id, type: "FRAME" }, children);
}

const masterDisabled = node({
  id: "master-primary-button-disabled",
  name: "Primary Button/Disabled",
  type: "COMPONENT",
});

const masterDisabledVariantInstance = instance(
  "instance-with-disabled-variant",
  {
    name: "Button/Primary",
    variantProperties: { State: "Disabled" },
    componentProperties: {},
  },
);

const pageChildren = [
  // Мастер-компонент с Disabled в имени — срабатывать не должен.
  masterDisabled,
  // Мастер-компонент с вложенным GROUP, чьё имя похоже на primary button.
  component("master-with-primary-button-child", [
    node({ id: "primary-button-group", name: "Primary Button Group", type: "GROUP" }),
  ]),
  // Вложенный инстанс «primary button» со State=Disabled — срабатывать должен.
  frame("form-frame", [masterDisabledVariantInstance]),
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

function runLint(roots) {
  return lintAutoLayoutNodes(enabledRuleIds, roots);
}

// 1. Мастер-компонент сам по себе не проверяется, даже если он Disabled.
assert.deepEqual(
  await runLint([masterDisabled]),
  [],
  "мастер-компонент Primary Button/Disabled не должен давать замечание",
);
console.log("ok: мастер-компонент с Disabled в имени не проверяется");

// 2. Вложенный GROUP внутри мастер-компонента тоже не проверяется.
assert.deepEqual(
  await runLint([component("master-with-primary-button-child", [
    node({ id: "primary-button-group", name: "Primary Button Group", type: "GROUP" }),
  ])]),
  [],
  "вложенный GROUP внутри мастер-компонента не должен проверяться",
);
console.log("ok: вложенные узлы мастер-компонента не проверяются");

// 3. Инстанс со State=Disabled внутри формы — замечание есть.
const instanceIssues = await runLint([masterDisabledVariantInstance]);

assert.equal(
  instanceIssues.length,
  1,
  "инстанс primary button со State=Disabled должен дать одно замечание",
);
assert.equal(instanceIssues[0].ruleId, RULE_ID);
assert.equal(instanceIssues[0].nodeId, "instance-with-disabled-variant");
console.log("ok: инстанс primary button со State=Disabled помечается");

// 4. Инстанс-обёртка вокруг мастер-компонента: замечание только на инстансе.
const wrapperIssues = await runLint([frame("form-frame", [masterDisabledVariantInstance])]);

assert.deepEqual(
  wrapperIssues.map((issue) => issue.nodeId),
  ["instance-with-disabled-variant"],
  "через форму замечание приходит только от инстанса",
);
console.log("ok: через форму замечание приходит только от инстанса");

// 5. Мастер и инстанс в одной области — замечание только одно, от инстанса.
const mixedIssues = await runLint([
  component("mixed-master", [masterDisabled]),
  frame("mixed-form", [masterDisabledVariantInstance]),
]);

assert.deepEqual(
  mixedIssues.map((issue) => issue.nodeId),
  ["instance-with-disabled-variant"],
  "среди мастеров и инстансов помечается только инстанс",
);
console.log("ok: мастер-компонент и инстанс — помечается только инстанс");

// 6. Инстанс без Disabled не помечается.
const activeInstance = instance("active-primary-button-instance", {
  name: "Button/Primary",
  variantProperties: { State: "Default" },
  componentProperties: {},
});

assert.deepEqual(
  await runLint([activeInstance]),
  [],
  "активный инстанс primary button не должен помечаться",
);
console.log("ok: активный инстанс primary button не помечается");

// 7. Инстанс внутри формы авторизации — исключение.
const authInstance = instance("auth-primary-button-disabled", {
  name: "Button/Primary/Disabled",
  variantProperties: {},
  componentProperties: {},
});
const authForm = frame("authorization-form", [authInstance]);

assert.deepEqual(
  await runLint([authForm]),
  [],
  "инстанс внутри формы авторизации не должен помечаться",
);
console.log("ok: инстанс внутри формы авторизации не помечается");

console.log("\n7 cases passed");
