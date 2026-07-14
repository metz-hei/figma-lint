/** Smoke-test для deprecated-component-check (дублирует src/figma/rules/deprecated-component-check.ts). */

const DEPRECATED_COMPONENT_MESSAGE =
  "Используется компонент, помеченный как устаревший или запрещённый для использования.";

const DEPRECATED_COMPONENT_NAME_PATTERN =
  /(?:don['’]?t\s+use|не\s+использовать)/iu;

function isComponentLikeNode(node) {
  return node.type === "COMPONENT" || node.type === "INSTANCE";
}

function hasDeprecatedComponentName(name) {
  return DEPRECATED_COMPONENT_NAME_PATTERN.test(name);
}

function checkDeprecatedComponent(node) {
  if (!isComponentLikeNode(node) || !hasDeprecatedComponentName(node.name)) {
    return [];
  }

  return [
    {
      severity: "error",
      message: DEPRECATED_COMPONENT_MESSAGE,
      match: node.name,
    },
  ];
}

function collectDeprecatedComponentNodes(children) {
  const nodes = [];

  const walk = (node) => {
    if (!node.visible) {
      return;
    }

    if (isComponentLikeNode(node)) {
      nodes.push(node);
    }

    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const child of children) {
    walk(child);
  }

  return nodes;
}

const cases = [
  {
    label: "don't use lowercase",
    node: { type: "COMPONENT", name: "don't use" },
    expectedCount: 1,
  },
  {
    label: "DON'T USE uppercase",
    node: { type: "COMPONENT", name: "DON'T USE" },
    expectedCount: 1,
  },
  {
    label: "dont use without apostrophe",
    node: { type: "INSTANCE", name: "dont use" },
    expectedCount: 1,
  },
  {
    label: "extra symbols before phrase",
    node: { type: "INSTANCE", name: "🚫 Don't use" },
    expectedCount: 1,
  },
  {
    label: "extra symbols around phrase",
    node: { type: "COMPONENT", name: "[Don't use]" },
    expectedCount: 1,
  },
  {
    label: "russian lowercase with punctuation",
    node: { type: "COMPONENT", name: "Не использовать!!!" },
    expectedCount: 1,
  },
  {
    label: "russian uppercase with suffix",
    node: { type: "INSTANCE", name: "🔴 НЕ ИСПОЛЬЗОВАТЬ (старое)" },
    expectedCount: 1,
  },
  {
    label: "phrase inside longer name",
    node: { type: "COMPONENT", name: "component - don't use" },
    expectedCount: 1,
  },
  {
    label: "regular component",
    node: { type: "COMPONENT", name: "Primary button" },
    expectedCount: 0,
  },
  {
    label: "text node with matching name is skipped",
    node: { type: "TEXT", name: "don't use" },
    expectedCount: 0,
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = checkDeprecatedComponent(testCase.node);

  if (result.length !== testCase.expectedCount) {
    console.error(
      `FAIL ${testCase.label}: expected ${testCase.expectedCount}, got ${result.length}`,
    );
    failed++;
    continue;
  }

  if (result.length > 0) {
    const issue = result[0];
    if (
      issue.severity !== "error" ||
      issue.message !== DEPRECATED_COMPONENT_MESSAGE ||
      issue.match !== testCase.node.name
    ) {
      console.error(`FAIL ${testCase.label}: wrong issue`, issue);
      failed++;
      continue;
    }
  }

  console.log(`ok: ${testCase.label}`);
}

const nestedTree = [
  {
    type: "FRAME",
    name: "Frame",
    visible: true,
    children: [
      {
        type: "COMPONENT",
        name: "Parent",
        visible: true,
        children: [
          {
            type: "INSTANCE",
            name: "Nested don't use",
            visible: true,
          },
        ],
      },
      {
        type: "COMPONENT",
        name: "Hidden don't use",
        visible: false,
      },
    ],
  },
];

const collected = collectDeprecatedComponentNodes(nestedTree);
const collectedNames = collected.map((node) => node.name);

if (collectedNames.join(",") !== "Parent,Nested don't use") {
  console.error("FAIL recursive collection: got", collectedNames);
  failed++;
} else {
  console.log("ok: recursive visible component and instance collection");
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length + 1} cases passed`);
