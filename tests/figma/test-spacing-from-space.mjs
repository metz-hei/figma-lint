/** Smoke-test для spacing-from-space (дублирует src/figma/rules/spacing-from-space.ts). */
const SPACE_VARIABLE_PREFIX = /^Space-\d+/;

function isSpacingSpecified(value) {
  return value !== 0;
}

function isSpaceVariableName(name) {
  return SPACE_VARIABLE_PREFIX.test(name);
}

function checkSpacingBinding(fieldLabel, value, boundVariableId, variablesById) {
  if (!isSpacingSpecified(value)) {
    return null;
  }

  if (!boundVariableId) {
    return { ok: false, reason: "no-binding" };
  }

  const variable = variablesById.get(boundVariableId);
  if (!variable) {
    return { ok: false, reason: "missing-variable" };
  }

  if (!isSpaceVariableName(variable.name)) {
    return { ok: false, reason: "wrong-name", name: variable.name };
  }

  return { ok: true };
}

const variables = new Map([
  ["v-space-16", { name: "Space-16" }],
  ["v-space-8", { name: "Space-8" }],
  ["v-space-4", { name: "Space-4" }],
  ["v-color-16", { name: "Color-16" }],
  ["v-lowercase", { name: "space-16" }],
  ["v-slash", { name: "Space/16" }],
]);

const cases = [
  {
    label: "itemSpacing 16 без binding",
    field: "gap",
    value: 16,
    boundVariableId: undefined,
    expectOk: false,
    expectReason: "no-binding",
  },
  {
    label: "bound Space-16",
    field: "gap",
    value: 16,
    boundVariableId: "v-space-16",
    expectOk: true,
  },
  {
    label: "bound Space-4 при value 16",
    field: "gap",
    value: 16,
    boundVariableId: "v-space-4",
    expectOk: true,
  },
  {
    label: "bound Color-16",
    field: "gap",
    value: 16,
    boundVariableId: "v-color-16",
    expectOk: false,
    expectReason: "wrong-name",
  },
  {
    label: "bound space-16 lowercase",
    field: "gap",
    value: 16,
    boundVariableId: "v-lowercase",
    expectOk: false,
    expectReason: "wrong-name",
  },
  {
    label: "bound Space/16",
    field: "gap",
    value: 16,
    boundVariableId: "v-slash",
    expectOk: false,
    expectReason: "wrong-name",
  },
  {
    label: "paddingTop 0 без binding",
    field: "padding top",
    value: 0,
    boundVariableId: undefined,
    expectOk: null,
  },
  {
    label: "paddingTop 0 с binding Color-16",
    field: "padding top",
    value: 0,
    boundVariableId: "v-color-16",
    expectOk: null,
  },
  {
    label: "paddingTop 8 bound Space-8",
    field: "padding top",
    value: 8,
    boundVariableId: "v-space-8",
    expectOk: true,
  },
  {
    label: "counterAxisSpacing при wrap без binding",
    field: "gap между рядами",
    value: 24,
    boundVariableId: undefined,
    expectOk: false,
    expectReason: "no-binding",
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = checkSpacingBinding(
    testCase.field,
    testCase.value,
    testCase.boundVariableId,
    variables,
  );

  if (testCase.expectOk === null) {
    if (result !== null) {
      console.error(`FAIL ${testCase.label}: expected skip, got`, result);
      failed++;
    } else {
      console.log(`ok: ${testCase.label}`);
    }
    continue;
  }

  const ok = result?.ok === true;
  if (ok !== testCase.expectOk) {
    console.error(
      `FAIL ${testCase.label}: expected ok=${testCase.expectOk}, got`,
      result,
    );
    failed++;
    continue;
  }

  if (
    !testCase.expectOk &&
    testCase.expectReason &&
    result?.reason !== testCase.expectReason
  ) {
    console.error(
      `FAIL ${testCase.label}: expected reason=${testCase.expectReason}, got`,
      result,
    );
    failed++;
    continue;
  }

  console.log(`ok: ${testCase.label}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);
