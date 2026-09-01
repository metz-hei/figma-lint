import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = mkdtempSync(join(tmpdir(), "figma-lint-naming-"));
const outfile = join(tempDir, "rule.mjs");
await build({
  entryPoints: ["src/figma/rules/naming-check.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2017",
  logLevel: "silent",
});

const { NamingCheck, collectNamingNodes } = await import(pathToFileURL(outfile));

function component(id, name, definitions = {}, variants = null) {
  return {
    id, name, type: "COMPONENT", visible: true, children: [], parent: null,
    componentPropertyDefinitions: definitions,
    variantProperties: variants,
  };
}

function componentSet(id, name, definitions, children) {
  const node = {
    id, name, type: "COMPONENT_SET", visible: true, children,
    componentPropertyDefinitions: definitions, parent: null,
  };
  for (const child of children) child.parent = node;
  return node;
}

function assert(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`ok: ${label}`);
}

const valid = component("valid", "🍎🤖 Date Picker", {
  "Icon Position#12:3": { type: "TEXT", defaultValue: "Very Large" },
  Size: { type: "VARIANT", defaultValue: "Large", variantOptions: ["Small", "Large"] },
  "Is Visible#1:2": { type: "BOOLEAN", defaultValue: true },
  "Icon Swap#1:3": { type: "INSTANCE_SWAP", defaultValue: "1:55" },
});
assert("корректный компонент проходит", NamingCheck.check(valid, {}).length === 0);

for (const name of [
  "💻 Button Primary",
  "💻 Button Primary 💙",
  "💻 Button Primary 🧡",
  "🍎 🤖 Button Primary",
  "🍎 🤖 Button Primary 💙",
  "🍎 🤖 Button Primary 🧡",
]) {
  assert(`разрешённое имя компонента: ${name}`, NamingCheck.check(component(name, name), {}).length === 0);
}

for (const name of [
  "💙 💻 Button Primary",
  "💻 💙 Button Primary",
  "💻 Button 💙 Primary",
  "💻 Button 🧡 Primary",
  "💻 Button Primary ❤️",
  "💻 Button Primary 💙 🧡",
  "💻 Button Primary 💙 Test",
  "💻 Button Primary 1 💙",
]) {
  assert(`запрещённое имя компонента: ${name}`, NamingCheck.check(component(name, name), {}).length > 0);
}

const emojiProps = component("emoji-props", "💻 Button", {
  "Size 💙#1:2": { type: "TEXT", defaultValue: "Large 🧡" },
});
assert(
  "финальные emoji запрещены в prop name и value",
  NamingCheck.check(emojiProps, {}).length === 2,
);

const unsupported = {
  id: "frame", name: "Frame", type: "FRAME", visible: true, children: [],
  get componentPropertyDefinitions() {
    throw new Error("getter must not be read");
  },
};
assert(
  "node без componentPropertyDefinitions не падает",
  NamingCheck.check(unsupported, {}).length === 0,
);

for (const name of ["Button", "🍎 Button", "🤖 Button", "🤖🍎 Button", "💻Button"] ) {
  assert(`неверный platform prefix: ${name}`, NamingCheck.check(component(name, name), {}).length > 0);
}
assert("цифры и punctuation запрещены", NamingCheck.check(component("bad", "💻 Button 2"), {}).length > 0);
assert("кириллица запрещена", NamingCheck.check(component("ru", "💻 Кнопка"), {}).length > 0);

const badProps = component("props", "💻 Button", {
  "icon position#1:2": { type: "TEXT", defaultValue: "Very Large Size" },
  "Overlong Property#2:3": { type: "TEXT", defaultValue: "Extraordinary Large" },
  State: { type: "VARIANT", defaultValue: "Default", variantOptions: ["default", "Hover-State"] },
});
const propIssues = NamingCheck.check(badProps, {});
assert("API suffix не проверяется как спецсимвол", !propIssues.some((x) => x.match.includes("#")));
assert(
  `ошибки prop names и values находятся (${propIssues.length})`,
  propIssues.length === 6,
);

const child = component("child", "💻 Button", {}, { "icon position": "very large size" });
const set = componentSet("set", "💻 Button Set", {}, [child]);
const collected = collectNamingNodes([set]);
assert("COMPONENT_SET включает себя и дочерние COMPONENT", collected.map((x) => x.id).join(",") === "set,child");
assert("variantProperties дочернего COMPONENT проверяются", NamingCheck.check(child, {}).length === 2);
assert("выбранный COMPONENT не захватывает соседей", collectNamingNodes([child]).map((x) => x.id).join(",") === "child");

const throwingVariant = component("throwing", "💻 Button", undefined, {
  State: "Default",
});
Object.defineProperty(throwingVariant, "componentPropertyDefinitions", {
  get() { throw new Error("definitions unavailable for variant"); },
});
componentSet("throwing-set", "💻 Button Set", {}, [throwingVariant]);
assert(
  "variant с недоступным getter продолжает проверять variantProperties",
  NamingCheck.check(throwingVariant, {}).length === 0,
);
