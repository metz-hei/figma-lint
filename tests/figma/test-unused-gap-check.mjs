/** Smoke-test для UnusedGapCheck (дублирует src/figma/rules/unused-gap-check.ts). */

const UNUSED_GAP_MESSAGE =
  "У контейнера задан gap, но внутри только один элемент. Gap не используется.";

function hasUnusedGap(node) {
  return node.itemSpacing > 0 && node.children.length < 2;
}

function checkUnusedGap(node) {
  if (!hasUnusedGap(node)) {
    return [];
  }

  return [
    {
      severity: "warning",
      message: UNUSED_GAP_MESSAGE,
      match: `gap: ${node.itemSpacing}`,
    },
  ];
}

const cases = [
  {
    label: "gap 16 и один дочерний элемент",
    node: { itemSpacing: 16, children: [{}] },
    expectedCount: 1,
  },
  {
    label: "gap 16 и нет дочерних элементов",
    node: { itemSpacing: 16, children: [] },
    expectedCount: 1,
  },
  {
    label: "gap 16 и два дочерних элемента",
    node: { itemSpacing: 16, children: [{}, {}] },
    expectedCount: 0,
  },
  {
    label: "gap 0 и один дочерний элемент",
    node: { itemSpacing: 0, children: [{}] },
    expectedCount: 0,
  },
  {
    label: "gap -1 и один дочерний элемент",
    node: { itemSpacing: -1, children: [{}] },
    expectedCount: 0,
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
    if (issue.severity !== "warning" || issue.message !== UNUSED_GAP_MESSAGE) {
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
