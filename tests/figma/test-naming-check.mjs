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
  "🍎 Button Primary",
  "🤖 Button Primary",
  "🍎 Button Primary 💙",
  "🤖 Button Primary 🧡",
  "🍎🤖 Button Primary",
  "🍎🤖 Button Primary 💙",
  "🍎🤖 Button Primary 🧡",
]) {
  assert(`разрешённое имя компонента: ${name}`, NamingCheck.check(component(name, name), {}).length === 0);
}

assert(
  "строгая пара для Apple/Android обязательна без пробела",
  NamingCheck.check(component("bad-prefix", "🍎 🤖 Button Primary"), {}).length > 0,
);

// Пара иконок есть, но разделена пробелом — это отдельная формулировка,
// а не порядок иконок.
for (const name of ["🍎 🤖 Button Primary", "🤖 🍎 Button Primary"]) {
  const issues = NamingCheck.check(component(name, name), {});
  assert(
    `пробел между иконками мобильной платформы: ${name}`,
    issues.length === 1 &&
      issues[0].message.includes("без пробела между иконками"),
  );
}

// Одиночная 🍎/🤖 — допустимая маркировка, а не ошибка.
for (const name of ["🍎 Button Primary", "🤖 Button Primary"]) {
  assert(
    `одиночная иконка мобильной платформы допустима: ${name}`,
    NamingCheck.check(component(name, name), {}).length === 0,
  );
}

// Обратный порядок без пробела — ошибка порядка иконок.
for (const name of ["🤖🍎 Button Primary", "🤖🍎 Button Primary 💙"]) {
  const issues = NamingCheck.check(component(name, name), {});
  assert(
    `неверный порядок иконок мобильной платформы: ${name}`,
    issues.length === 1 && issues[0].message.includes("пишутся в порядке"),
  );
}

// Марка бизнеса вплотную к платформе — это позиция, а не пропущенный пробел.
for (const name of ["💻💙 Input Account", "💻🧡 Input Account", "🍎🤖💙 Input Account"]) {
  const issues = NamingCheck.check(component(name, name), {});
  assert(
    `марка бизнеса вплотную к платформе: ${name}`,
    issues.length === 1 &&
      issues[0].message.includes("ставится в конце названия") &&
      !issues[0].message.includes("разделены пробелом"),
  );
}

assert(
  "COMPONENT_SET проверяется по имени",
  NamingCheck.check(componentSet("set", "🍎🤖 Button Set", {}, []), {}).length === 0,
);
assert(
  "неправильное имя COMPONENT_SET тоже считается ошибкой",
  NamingCheck.check(componentSet("bad-set", "Button Set", {}, []), {}).length > 0,
);

for (const [name, expected] of [
  ["💙 💻 Button Primary", "начинаться с маркировки платформы"],
  ["💻 💙 Button Primary", "ставится в конце названия"],
  ["💻 Button 💙 Primary", "ставится в конце названия"],
  ["💻 Button Primary💙", "отбивается от названия компонента пробелом"],
  ["💻 Button Primary🧡", "отбивается от названия компонента пробелом"],
  ["💻 Button 🧡 Primary", "ставится в конце названия"],
  ["💻 Button Primary ❤️", "латиницей в стиле Title Case"],
  ["💻 Button Primary 💙 🧡", "Компонент для обоих бизнесов не маркируется"],
  ["💻 Button 🧡 💙", "Компонент для обоих бизнесов не маркируется"],
  ["💻 Button Primary 💙 Test", "ставится в конце названия"],
  ["💻 Button Primary 1 💙", "латиницей в стиле Title Case"],
]) {
  const issues = NamingCheck.check(component(name, name), {});
  assert(
    `запрещённое имя компонента: ${name}`,
    issues.length === 1 && issues[0].message.includes(expected),
  );
}

// Маркировка обоих бизнесов запрещена в любом виде — и вплотную, и через пробел.
for (const name of ["💻 Button 💙🧡", "💻 Button 🧡💙", "💻 Button 💙 🧡", "💻 Button 🧡 💙"]) {
  const issues = NamingCheck.check(component(name, name), {});
  assert(
    `компонент для обоих бизнесов запрещён: ${name}`,
    issues.length === 1 &&
      issues[0].message.includes("Компонент для обоих бизнесов не маркируется"),
  );
}

// Нарушение позиции марки не скрывает проблему самого названия.
const suffixAndNameProblems = NamingCheck.check(
  component("suffix-and-name", "💻 Button 2 💙 Primary"),
  {},
);
assert(
  "нарушение позиции марки не скрывает проблему названия",
  suffixAndNameProblems.length === 1 &&
    suffixAndNameProblems[0].message.includes("ставится в конце названия") &&
    suffixAndNameProblems[0].message.includes("латиницей в стиле Title Case"),
);

// Дефис и подчёркивание — не разделители слов, только пробел.
for (const name of ["💻 Button-Primary", "💻 Button_Primary"]) {
  const issues = NamingCheck.check(component(name, name), {});
  assert(
    `разделитель вместо пробела: ${name}`,
    issues.length === 1 &&
      issues[0].message.includes("Слова в названии компонента разделяются пробелами"),
  );
}

// Точки и круглые скобки в названии компонента допустимы.
assert(
  "точки и круглые скобки в названии допустимы",
  NamingCheck.check(component("dots", "💻 Button (Primary)"), {}).length === 0,
);

const suffixInProps = component("suffix-in-props", "💻 Button Primary 💙", {
  Size: { type: "TEXT", defaultValue: "Large 💙" },
});
assert(
  "суффикс допустим только в названии компонента, не в props",
  NamingCheck.check(suffixInProps, {}).length === 1,
);

// Имя без самого названия — это проблема формата, а не позиции марки.
const onlySuffix = NamingCheck.check(component("only-suffix", "💻 💙"), {});
assert(
  "имя из одной марки даёт замечание про формат названия",
  onlySuffix.length === 1 && onlySuffix[0].message.includes("латиницей в стиле Title Case"),
);

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

for (const name of ["Button", "Container Box", "🍎Button", "🍎🤖Button", "💻Button"] ) {
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
  propIssues.length === 3,
);
assert(
  "для имени prop и значения prop используются разные ошибки",
  propIssues.some((issue) => issue.message.includes("Название пропсов набирается")) &&
    propIssues.some((issue) => issue.message.includes("Значение пропсов набирается")),
);
assert(
  "сообщение не дублирует проверяемое значение",
  propIssues.every((issue) => !issue.message.includes("«") && !issue.message.includes(issue.match)),
);

const child = component("child", "💻 Button", {}, { "icon position": "very large size" });
const set = componentSet("set", "💻 Button Set", {}, [child]);
const collected = collectNamingNodes([set]);
assert("COMPONENT_SET включён в выборку, а дочерние variant не собираются", collected.map((x) => x.id).join(",") === "set");
const standalone = component("standalone", "💻 Button", {});
assert("standalone COMPONENT сохраняется в выборке", collectNamingNodes([standalone]).map((x) => x.id).join(",") === "standalone");

// Варианты внутри COMPONENT_SET не проверяются вообще: ни имя, ни props.
const okVariant = component("ok-variant", "State=Default, Size=Large", undefined, {
  State: "Default",
  Size: "Large",
});
componentSet("ok-set", "💻 Button Set", {}, [okVariant]);
assert(
  "вариант внутри сета игнорируется целиком",
  NamingCheck.check(okVariant, {}).length === 0,
);

const badVariant = component("bad-variant", "State=Default, Size=Large", undefined, {
  State: "default",
  Size: "very large size",
});
componentSet("bad-set", "💻 Button Set", {}, [badVariant]);
assert(
  "вариант внутри сета не проверяется даже при плохих props",
  NamingCheck.check(badVariant, {}).length === 0,
);

// Компонент внутри обычного Frame — не вариант, имя проверяем.
const looseComponent = component("loose", "Button", {});
looseComponent.parent = { id: "frame", name: "Frame", type: "FRAME" };
assert(
  "COMPONENT вне сета по-прежнему требует префикс",
  NamingCheck.check(looseComponent, {}).length > 0,
);

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
