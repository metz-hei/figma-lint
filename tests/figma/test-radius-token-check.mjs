/** Smoke-test для radius-token-check (дублирует src/figma/rules/radius-token-check.ts). */

const RADIUS_VARIABLE_PREFIX = /^Radius(?:$|[-/\s])/i;
const RADIUS_NODE_TYPES = new Set([
  "RECTANGLE",
  "FRAME",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
]);
const CORNER_FIELDS = [
  "topLeftRadius",
  "topRightRadius",
  "bottomRightRadius",
  "bottomLeftRadius",
];

function isRadiusSpecified(value) {
  return value !== 0;
}

function isRadiusVariableName(name) {
  return RADIUS_VARIABLE_PREFIX.test(name);
}

function checkRadiusBinding(value, boundVariableId, variablesById) {
  if (!isRadiusSpecified(value)) {
    return null;
  }

  if (!boundVariableId) {
    return { ok: false, reason: "no-binding", value };
  }

  const variable = variablesById.get(boundVariableId);
  if (!variable) {
    return { ok: false, reason: "missing-variable", value };
  }

  if (!isRadiusVariableName(variable.name)) {
    return { ok: false, reason: "wrong-name", value, name: variable.name };
  }

  return null;
}

function isRadiusNode(node) {
  return RADIUS_NODE_TYPES.has(node.type) && "cornerRadius" in node;
}

function getRadiusFieldsForNode(node) {
  if (typeof node.cornerRadius === "number") {
    return ["cornerRadius"];
  }

  return CORNER_FIELDS.filter((field) => typeof node[field] === "number");
}

function getBoundVariableId(node, field) {
  const direct = node.boundVariables?.[field]?.id;
  if (direct) {
    return direct;
  }

  // ponytail: на rectangle/frame Figma пишет binding cornerRadius в 4 угла, не в cornerRadius
  if (field !== "cornerRadius") {
    return undefined;
  }

  const ids = CORNER_FIELDS.map((corner) => node.boundVariables?.[corner]?.id);
  const first = ids[0];
  return first && ids.every((id) => id === first) ? first : undefined;
}

function checkRadiusNode(node, variablesById) {
  if (!isRadiusNode(node)) {
    return [];
  }

  const issues = [];

  for (const field of getRadiusFieldsForNode(node)) {
    const value = typeof node[field] === "number" ? node[field] : 0;
    const result = checkRadiusBinding(
      value,
      getBoundVariableId(node, field),
      variablesById,
    );

    if (result) {
      issues.push({ ...result, field });
    }
  }

  return issues;
}

function collectRadiusNodes(children) {
  const nodes = [];

  const walk = (node) => {
    if (!node.visible) {
      return;
    }

    if (isRadiusNode(node)) {
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

const variables = new Map([
  ["v-radius-6", { name: "Radius-6" }],
  ["v-radius-12", { name: "Radius-12" }],
  ["v-radius-slash", { name: "Radius/16" }],
  ["v-color-12", { name: "Color-12" }],
  ["v-space-12", { name: "Space-12" }],
]);

const cases = [
  {
    label: "rectangle 12 без binding",
    node: { type: "RECTANGLE", cornerRadius: 12 },
    expectedCount: 1,
    expectReason: "no-binding",
  },
  {
    label: "frame 12 bound Radius-12",
    node: {
      type: "FRAME",
      cornerRadius: 12,
      boundVariables: { cornerRadius: { id: "v-radius-12" } },
    },
    expectedCount: 0,
  },
  {
    label: "component 16 bound Radius/16",
    node: {
      type: "COMPONENT",
      cornerRadius: 16,
      boundVariables: { cornerRadius: { id: "v-radius-slash" } },
    },
    expectedCount: 0,
  },
  {
    label: "instance 12 bound Color-12",
    node: {
      type: "INSTANCE",
      cornerRadius: 12,
      boundVariables: { cornerRadius: { id: "v-color-12" } },
    },
    expectedCount: 1,
    expectReason: "wrong-name",
  },
  {
    label: "component set 12 broken variable",
    node: {
      type: "COMPONENT_SET",
      cornerRadius: 12,
      boundVariables: { cornerRadius: { id: "missing" } },
    },
    expectedCount: 1,
    expectReason: "missing-variable",
  },
  {
    label: "radius 0 без binding",
    node: { type: "RECTANGLE", cornerRadius: 0 },
    expectedCount: 0,
  },
  {
    label: "text node skipped",
    node: { type: "TEXT", cornerRadius: 12 },
    expectedCount: 0,
  },
  {
    label: "mixed corners: two local, one Radius, zero skipped",
    node: {
      type: "RECTANGLE",
      cornerRadius: Symbol("mixed"),
      topLeftRadius: 12,
      topRightRadius: 16,
      bottomRightRadius: 0,
      bottomLeftRadius: 24,
      boundVariables: {
        topRightRadius: { id: "v-radius-slash" },
      },
    },
    expectedCount: 2,
    expectFields: ["topLeftRadius", "bottomLeftRadius"],
  },
  {
    label: "uniform radius: Figma stores binding on 4 corners",
    node: {
      type: "RECTANGLE",
      cornerRadius: 6,
      topLeftRadius: 6,
      topRightRadius: 6,
      bottomRightRadius: 6,
      bottomLeftRadius: 6,
      boundVariables: {
        topLeftRadius: { id: "v-radius-6" },
        topRightRadius: { id: "v-radius-6" },
        bottomRightRadius: { id: "v-radius-6" },
        bottomLeftRadius: { id: "v-radius-6" },
      },
    },
    expectedCount: 0,
  },
  {
    label: "uniform radius: partial corner bindings still fail",
    node: {
      type: "FRAME",
      cornerRadius: 6,
      boundVariables: {
        topLeftRadius: { id: "v-radius-6" },
        topRightRadius: { id: "v-radius-6" },
      },
    },
    expectedCount: 1,
    expectReason: "no-binding",
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = checkRadiusNode(testCase.node, variables);

  if (result.length !== testCase.expectedCount) {
    console.error(
      `FAIL ${testCase.label}: expected ${testCase.expectedCount}, got ${result.length}`,
      result,
    );
    failed++;
    continue;
  }

  if (
    testCase.expectReason &&
    result.some((issue) => issue.reason !== testCase.expectReason)
  ) {
    console.error(
      `FAIL ${testCase.label}: expected reason=${testCase.expectReason}, got`,
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

  console.log(`ok: ${testCase.label}`);
}

const collected = collectRadiusNodes([
  {
    type: "FRAME",
    visible: true,
    cornerRadius: 8,
    children: [
      { type: "RECTANGLE", visible: true, cornerRadius: 12 },
      { type: "RECTANGLE", visible: false, cornerRadius: 16 },
      {
        type: "FRAME",
        visible: false,
        cornerRadius: 20,
        children: [{ type: "RECTANGLE", visible: true, cornerRadius: 24 }],
      },
    ],
  },
]);

if (collected.length !== 2) {
  console.error(`FAIL collectRadiusNodes: expected 2, got ${collected.length}`);
  failed++;
} else {
  console.log("ok: collectRadiusNodes рекурсивно пропускает скрытые слои");
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length + 1} cases passed`);
