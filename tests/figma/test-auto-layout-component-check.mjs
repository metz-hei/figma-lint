/** Smoke-test для AutoLayoutComponentCheck (дублирует src/figma/rules/auto-layout-component-check.ts). */

const RULE_ID = "auto-layout-component-check";
const FRAME_MESSAGE =
  "Frame без Auto Layout → Включите Auto Layout для этого слоя.";
const GROUP_MESSAGE =
  "Group → Замените Group на Auto Layout.";

function isComponentStructureRoot(node) {
  return node.type === "COMPONENT" || node.type === "COMPONENT_SET";
}

function hasComponentStructureAncestor(node) {
  let current = node.parent;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (
      current.type === "COMPONENT" ||
      current.type === "COMPONENT_SET"
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function hasDisabledAutoLayout(node) {
  return "layoutMode" in node && node.layoutMode === "NONE";
}

function collectAutoLayoutComponentNodes(roots) {
  const nodes = [];

  const walk = (node) => {
    if (node.visible === false || node.type === "INSTANCE") {
      return;
    }

    if (isComponentStructureRoot(node)) {
      nodes.push(node);
      return;
    }

    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const root of roots) {
    walk(root);
  }

  return nodes;
}

function createHit(node, message) {
  return {
    ruleId: RULE_ID,
    node,
    message: `${node.name}\n${message}`,
    match: node.name,
  };
}

function checkAutoLayoutComponent(node) {
  if (
    !isComponentStructureRoot(node) ||
    node.visible === false ||
    hasComponentStructureAncestor(node)
  ) {
    return [];
  }

  const issues = [];
  const checkedNodeIds = new Set();
  const problemNodeIds = new Set();

  const addIssue = (problemNode, message) => {
    if (problemNodeIds.has(problemNode.id)) {
      return;
    }

    problemNodeIds.add(problemNode.id);
    issues.push(createHit(problemNode, message));
  };

  const walk = (current) => {
    if (
      checkedNodeIds.has(current.id) ||
      current.visible === false ||
      current.type === "INSTANCE"
    ) {
      return;
    }

    checkedNodeIds.add(current.id);

    if (current.type === "GROUP") {
      addIssue(current, GROUP_MESSAGE);
    } else if (current.type === "FRAME" && hasDisabledAutoLayout(current)) {
      addIssue(current, FRAME_MESSAGE);
    }

    if ("children" in current) {
      for (const child of current.children) {
        walk(child);
      }
    }
  };

  walk(node);

  return issues;
}

function node(overrides = {}) {
  return {
    id: overrides.id ?? `node-${Math.random()}`,
    name: overrides.name ?? "Layer",
    type: "FRAME",
    visible: true,
    layoutMode: "VERTICAL",
    children: [],
    ...overrides,
  };
}

function attach(parent, children) {
  parent.children = children;

  for (const child of children) {
    child.parent = parent;
  }

  return parent;
}

function component(overrides = {}, children = []) {
  return attach(
    node({
      id: "component",
      name: "Component",
      type: "COMPONENT",
      visible: true,
      layoutMode: "VERTICAL",
      ...overrides,
    }),
    children,
  );
}

function componentSet(overrides = {}, children = []) {
  return attach(
    node({
      id: "component-set",
      name: "Component Set",
      type: "COMPONENT_SET",
      visible: true,
      layoutMode: "VERTICAL",
      ...overrides,
    }),
    children,
  );
}

const duplicateProblem = node({
  id: "duplicate-frame",
  name: "Duplicate Frame",
  type: "FRAME",
  layoutMode: "NONE",
});

const cases = [
  {
    label: "COMPONENT, полностью собранный на Auto Layout — ошибок нет",
    root: component({ id: "case-1" }, [
      node({ id: "case-1-frame", layoutMode: "HORIZONTAL" }),
    ]),
    expected: [],
  },
  {
    label: "COMPONENT с FRAME, у которого layoutMode === NONE — одна ошибка",
    root: component({ id: "case-2" }, [
      node({ id: "case-2-frame", name: "Plain Frame", layoutMode: "NONE" }),
    ]),
    expected: [
      { nodeId: "case-2-frame", message: `Plain Frame\n${FRAME_MESSAGE}` },
    ],
  },
  {
    label: "COMPONENT с GROUP — одна ошибка",
    root: component({ id: "case-3" }, [
      node({ id: "case-3-group", name: "Group", type: "GROUP" }),
    ]),
    expected: [{ nodeId: "case-3-group", message: `Group\n${GROUP_MESSAGE}` }],
  },
  {
    label: "Вложенный FRAME с Auto Layout — ошибок нет",
    root: component({ id: "case-4" }, [
      attach(node({ id: "case-4-wrap", layoutMode: "VERTICAL" }), [
        node({ id: "case-4-frame", layoutMode: "HORIZONTAL" }),
      ]),
    ]),
    expected: [],
  },
  {
    label: "Вложенный COMPONENT с обычным FRAME — ошибка на конкретном FRAME",
    root: component({ id: "case-5" }, [
      component({ id: "case-5-component" }, [
        node({ id: "case-5-frame", name: "Nested Plain", layoutMode: "NONE" }),
      ]),
    ]),
    expected: [
      { nodeId: "case-5-frame", message: `Nested Plain\n${FRAME_MESSAGE}` },
    ],
  },
  {
    label: "Скрытый FRAME без Auto Layout — ошибок нет",
    root: component({ id: "case-6" }, [
      node({ id: "case-6-frame", visible: false, layoutMode: "NONE" }),
    ]),
    expected: [],
  },
  {
    label: "Потомки скрытого контейнера не проверяются",
    root: component({ id: "case-7" }, [
      attach(node({ id: "case-7-hidden", visible: false }), [
        node({ id: "case-7-frame", layoutMode: "NONE" }),
      ]),
    ]),
    expected: [],
  },
  {
    label: "Один проблемный node.id не создаёт несколько замечаний",
    root: component({ id: "case-8" }, [duplicateProblem, duplicateProblem]),
    expected: [
      {
        nodeId: "duplicate-frame",
        message: `Duplicate Frame\n${FRAME_MESSAGE}`,
      },
    ],
  },
  {
    label: "INSTANCE и его содержимое не проверяются",
    root: component({ id: "case-9" }, [
      attach(
        node({ id: "case-9-instance", type: "INSTANCE", layoutMode: "NONE" }),
        [node({ id: "case-9-frame", layoutMode: "NONE" })],
      ),
    ]),
    expected: [],
  },
  {
    label: "COMPONENT_SET с вариантами проверяется",
    root: componentSet(
      { id: "case-10-set" },
      [
        component({ id: "case-10-variant", name: "Variant" }, [
          node({
            id: "case-10-frame",
            name: "Variant Plain",
            layoutMode: "NONE",
          }),
        ]),
      ],
    ),
    expected: [
      { nodeId: "case-10-frame", message: `Variant Plain\n${FRAME_MESSAGE}` },
    ],
  },
  {
    label: "Несколько разных проблемных слоёв создают отдельные замечания",
    root: component({ id: "case-11" }, [
      node({ id: "case-11-frame-a", name: "Plain A", layoutMode: "NONE" }),
      node({ id: "case-11-group", name: "Group B", type: "GROUP" }),
      node({ id: "case-11-frame-b", name: "Plain C", layoutMode: "NONE" }),
    ]),
    expected: [
      { nodeId: "case-11-frame-a", message: `Plain A\n${FRAME_MESSAGE}` },
      { nodeId: "case-11-group", message: `Group B\n${GROUP_MESSAGE}` },
      { nodeId: "case-11-frame-b", message: `Plain C\n${FRAME_MESSAGE}` },
    ],
  },
  {
    label: "Дочерние нарушения внутри Frame без Auto Layout тоже проверяются",
    root: component({ id: "case-12" }, [
      attach(
        node({ id: "case-12-frame", name: "Plain Parent", layoutMode: "NONE" }),
        [node({ id: "case-12-group", name: "Nested Group", type: "GROUP" })],
      ),
    ]),
    expected: [
      { nodeId: "case-12-frame", message: `Plain Parent\n${FRAME_MESSAGE}` },
      { nodeId: "case-12-group", message: `Nested Group\n${GROUP_MESSAGE}` },
    ],
  },
];

const collected = collectAutoLayoutComponentNodes([
  attach(node({ id: "collector-root", type: "FRAME" }), [
    component({ id: "collector-component" }),
    attach(node({ id: "collector-instance", type: "INSTANCE" }), [
      component({ id: "collector-instance-component" }),
    ]),
  ]),
]);

if (collected.map((item) => item.id).join(",") !== "collector-component") {
  console.error(
    `FAIL collectAutoLayoutComponentNodes: expected collector-component, got ${collected.map((item) => item.id)}`,
  );
  process.exit(1);
}

console.log("ok: collectAutoLayoutComponentNodes использует переданные roots");

let failed = 0;

for (const testCase of cases) {
  const result = checkAutoLayoutComponent(testCase.root);

  if (result.length !== testCase.expected.length) {
    console.error(
      `FAIL ${testCase.label}: expected ${testCase.expected.length}, got ${result.length}`,
      result,
    );
    failed++;
    continue;
  }

  const simplified = result.map((issue) => ({
    nodeId: issue.node.id,
    message: issue.message,
  }));

  if (JSON.stringify(simplified) !== JSON.stringify(testCase.expected)) {
    console.error(
      `FAIL ${testCase.label}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(simplified)}`,
    );
    failed++;
    continue;
  }

  if (result.some((issue) => issue.message.includes("/"))) {
    console.error(`FAIL ${testCase.label}: message contains a path`, result);
    failed++;
    continue;
  }

  console.log(`ok: ${testCase.label}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);
