/** Smoke-test для UnusedGapCheck (дублирует src/figma/rules/unused-gap-check.ts). */

function isEditableContainer(node) {
  return (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET"
  );
}

function isAutoLayoutContainer(node) {
  return isEditableContainer(node) && node.layoutMode !== "NONE" && node.children;
}

function hasHiddenAncestor(node) {
  let current = node.parent;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (current.visible === false) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isInsideInstance(node) {
  let current = node.parent;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (current.type === "INSTANCE") {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function participatesInAutoLayout(node) {
  if (node.visible === false) {
    return false;
  }

  if (node.layoutPositioning === "ABSOLUTE") {
    return false;
  }

  return true;
}

function countVisibleAutoLayoutChildren(node) {
  return node.children.filter(participatesInAutoLayout).length;
}

function hasUnusedGap(node) {
  return node.itemSpacing > 0 && countVisibleAutoLayoutChildren(node) < 2;
}

function checkUnusedGap(node) {
  if (
    !isAutoLayoutContainer(node) ||
    node.visible === false ||
    hasHiddenAncestor(node) ||
    isInsideInstance(node) ||
    !hasUnusedGap(node)
  ) {
    return [];
  }

  return [
    {
      severity: "warning",
      message: `Gap: ${node.itemSpacing}px → Уберите gap или добавьте второй элемент в Auto Layout.`,
      match: `gap: ${node.itemSpacing}`,
    },
  ];
}

function child(overrides = {}) {
  return {
    type: "FRAME",
    visible: true,
    layoutPositioning: "AUTO",
    ...overrides,
  };
}

function container(overrides = {}) {
  const node = {
    id: "node-1",
    type: "FRAME",
    visible: true,
    layoutMode: "HORIZONTAL",
    itemSpacing: 16,
    children: [child()],
    parent: { type: "PAGE" },
    ...overrides,
  };

  for (const nested of node.children) {
    nested.parent = node;
  }

  return node;
}

const instance = {
  id: "instance-1",
  type: "INSTANCE",
  visible: true,
  layoutMode: "HORIZONTAL",
  itemSpacing: 16,
  children: [child()],
  parent: { type: "PAGE" },
};

const insideInstance = container({
  id: "inside-instance",
  parent: instance,
});

const cases = [
  {
    label: "FRAME с одним видимым элементом и gap > 0 — ошибка",
    node: container(),
    expectedCount: 1,
  },
  {
    label: "FRAME с двумя видимыми элементами — ошибки нет",
    node: container({ children: [child(), child()] }),
    expectedCount: 0,
  },
  {
    label: "FRAME с одним видимым и одним скрытым элементом — ошибка",
    node: container({ children: [child(), child({ visible: false })] }),
    expectedCount: 1,
  },
  {
    label: "FRAME с одним обычным и одним absolute-элементом — ошибка",
    node: container({
      children: [child(), child({ layoutPositioning: "ABSOLUTE" })],
    }),
    expectedCount: 1,
  },
  {
    label: "INSTANCE с одним элементом и gap > 0 — ошибки нет",
    node: instance,
    expectedCount: 0,
  },
  {
    label: "Вложенные слои внутри INSTANCE — не проверяются",
    node: insideInstance,
    expectedCount: 0,
  },
  {
    label: "Один контейнер не создаёт дубли замечаний",
    node: container({ id: "same-node" }),
    expectedCount: 1,
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = checkUnusedGap(testCase.node);

  if (result.length !== testCase.expectedCount) {
    console.error(
      `FAIL ${testCase.label}: expected ${testCase.expectedCount}, got ${result.length}`,
    );
    failed++;
    continue;
  }

  if (result.length > 0) {
    const issue = result[0];
    const expectedMessage =
      "Gap: 16px → Уберите gap или добавьте второй элемент в Auto Layout.";

    if (issue.severity !== "warning" || issue.message !== expectedMessage) {
      console.error(`FAIL ${testCase.label}: wrong issue`, issue);
      failed++;
      continue;
    }
  }

  console.log(`ok: ${testCase.label}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);
