/** Smoke-test для spacing-from-space (дублирует src/figma/rules/spacing-from-space.ts). */

const SPACING_FIELDS = [
  "itemSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];

const FIELD_LABELS = {
  itemSpacing: "gap",
  paddingTop: "padding top",
  paddingRight: "padding right",
  paddingBottom: "padding bottom",
  paddingLeft: "padding left",
};

function isSpacingSpecified(value) {
  return value !== 0;
}

function isEffectivelyVisible(node) {
  let current = node;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if ("visible" in current && !current.visible) {
      return false;
    }
    current = current.parent;
  }

  return true;
}

function isAutoLayoutNode(node) {
  return "layoutMode" in node && node.layoutMode !== "NONE";
}

function getBoundVariableId(node, field) {
  return node.boundVariables?.[field]?.id;
}

function checkSpacingBinding(field, value, boundVariableId) {
  if (!isSpacingSpecified(value)) {
    return null;
  }

  if (boundVariableId) {
    return null;
  }

  return {
    field,
    message: "Привяжите токен из группы Space",
    match: `${FIELD_LABELS[field]}: ${value}`,
  };
}

function checkSpacingNode(node) {
  if (!isEffectivelyVisible(node) || !isAutoLayoutNode(node)) {
    return [];
  }

  const issues = [];
  const checkedFields = new Set();

  for (const field of SPACING_FIELDS) {
    if (checkedFields.has(field)) {
      continue;
    }
    checkedFields.add(field);

    const result = checkSpacingBinding(
      field,
      node[field] ?? 0,
      getBoundVariableId(node, field),
    );

    if (result) {
      issues.push(result);
    }
  }

  return issues;
}

const visibleParent = { type: "FRAME", visible: true };
const hiddenParent = { type: "FRAME", visible: false };

const cases = [
  {
    label: "Padding задан через Variable Space -> ошибок нет",
    node: {
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      paddingTop: 12,
      boundVariables: { paddingTop: { id: "v-space-12" } },
    },
    expectedCount: 0,
  },
  {
    label: "Gap задан через Variable Space -> ошибок нет",
    node: {
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      itemSpacing: 24,
      boundVariables: { itemSpacing: { id: "v-space-24" } },
    },
    expectedCount: 0,
  },
  {
    label: "Padding задан локальным числом -> ошибка",
    node: {
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      paddingLeft: 8,
    },
    expectedCount: 1,
    expectFields: ["paddingLeft"],
  },
  {
    label: "Gap задан локальным числом -> ошибка",
    node: {
      type: "FRAME",
      visible: true,
      layoutMode: "HORIZONTAL",
      itemSpacing: 8,
    },
    expectedCount: 1,
    expectFields: ["itemSpacing"],
  },
  {
    label: "Скрытые слои не проверяются",
    node: {
      type: "FRAME",
      visible: false,
      layoutMode: "VERTICAL",
      itemSpacing: 8,
      paddingTop: 8,
    },
    expectedCount: 0,
  },
  {
    label: "Потомки скрытых контейнеров не проверяются",
    node: {
      type: "FRAME",
      visible: true,
      parent: hiddenParent,
      layoutMode: "VERTICAL",
      itemSpacing: 8,
      paddingTop: 8,
    },
    expectedCount: 0,
  },
  {
    label: "Для одного свойства создается только одно замечание",
    node: {
      type: "FRAME",
      visible: true,
      parent: visibleParent,
      layoutMode: "VERTICAL",
      paddingTop: 16,
    },
    expectedCount: 1,
    expectFields: ["paddingTop"],
  },
  {
    label: "Variable с любым числовым значением не дает ошибку",
    node: {
      type: "FRAME",
      visible: true,
      layoutMode: "VERTICAL",
      paddingTop: 99,
      itemSpacing: 7,
      boundVariables: {
        paddingTop: { id: "v-space-12" },
        itemSpacing: { id: "v-space-24" },
      },
    },
    expectedCount: 0,
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = checkSpacingNode(testCase.node);

  if (result.length !== testCase.expectedCount) {
    console.error(
      `FAIL ${testCase.label}: expected ${testCase.expectedCount}, got ${result.length}`,
      result,
    );
    failed++;
    continue;
  }

  if (testCase.expectFields) {
    const fields = result.map((issue) => issue.field);
    if (fields.join(",") !== testCase.expectFields.join(",")) {
      console.error(
        `FAIL ${testCase.label}: expected fields=${testCase.expectFields}, got ${fields}`,
      );
      failed++;
      continue;
    }
  }

  if (
    result.some(
      (issue) => issue.message !== "Привяжите токен из группы Space",
    )
  ) {
    console.error(`FAIL ${testCase.label}: unexpected message`, result);
    failed++;
    continue;
  }

  console.log(`ok: ${testCase.label}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);
