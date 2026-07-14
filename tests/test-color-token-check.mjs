/** Smoke-test для ColorTokenCheck (дублирует src/figma/rules/color-token-check.ts). */

const COLOR_TOKEN_RULE = "ColorTokenCheck";
const COLOR_TOKEN_DESCRIPTION =
  "На слое используется цвет, который не связан с цветовым токеном дизайн-системы.";
const COLOR_TOKEN_SUGGESTION =
  "Используйте соответствующий цветовой токен из дизайн-системы.";

const COLOR_NODE_TYPES = new Set([
  "TEXT",
  "FRAME",
  "RECTANGLE",
  "COMPONENT",
  "INSTANCE",
  "VECTOR",
  "ELLIPSE",
]);

function solidPaint(bound = false, color = { r: 1, g: 0, b: 0 }, opacity) {
  return {
    type: "SOLID",
    visible: true,
    color,
    opacity,
    boundVariables: bound ? { color: { id: "color-token" } } : undefined,
  };
}

function supportsColor(node) {
  return COLOR_NODE_TYPES.has(node.type);
}

function isPaintList(value) {
  return Array.isArray(value);
}

function isVisibleSolidPaint(paint) {
  return paint.type === "SOLID" && paint.visible !== false;
}

function colorChannelToHex(value) {
  const channel = Math.round(Math.max(0, Math.min(1, value)) * 255);
  return channel.toString(16).padStart(2, "0").toUpperCase();
}

function formatSolidPaintColor(paint) {
  const hex = `#${colorChannelToHex(paint.color.r)}${colorChannelToHex(
    paint.color.g,
  )}${colorChannelToHex(paint.color.b)}`;
  const opacity = paint.opacity ?? 1;
  const percent = Math.round(Math.max(0, Math.min(1, opacity)) * 100);

  return percent === 100 ? hex : `${hex} (${percent}%)`;
}

function isPaintBoundToVariable(paint, node, field, index) {
  return Boolean(
    paint.boundVariables?.color ?? node.boundVariables?.[field]?.[index],
  );
}

function findManualSolidPaint(paints, node, field) {
  for (const [index, paint] of paints.entries()) {
    if (
      isVisibleSolidPaint(paint) &&
      !isPaintBoundToVariable(paint, node, field, index)
    ) {
      return paint;
    }
  }

  return null;
}

function hasManualTextRangePaint(node) {
  if (typeof node.getStyledTextSegments !== "function") {
    return !node.boundVariables?.textRangeFills?.length;
  }

  return node
    .getStyledTextSegments(["fills"])
    .map((segment) =>
      isPaintList(segment.fills)
        ? findManualSolidPaint(segment.fills, node, "fills")
        : null,
    )
    .find(Boolean);
}

function findManualPaint(node, field) {
  const paints = node[field];

  if (isPaintList(paints)) {
    return findManualSolidPaint(paints, node, field);
  }

  if (node.type === "TEXT" && field === "fills") {
    return hasManualTextRangePaint(node);
  }

  return null;
}

function checkColorToken(node) {
  if (!supportsColor(node)) {
    return [];
  }

  const matches = [];

  const fill = findManualPaint(node, "fills");
  const stroke = findManualPaint(node, "strokes");

  if (fill) {
    matches.push({ field: "fill", paint: fill });
  }

  if (stroke) {
    matches.push({ field: "stroke", paint: stroke });
  }

  return matches.map(({ field, paint }) => {
    const color = formatSolidPaintColor(paint);

    return {
      ruleId: COLOR_TOKEN_RULE,
      message: "",
      replacement: COLOR_TOKEN_SUGGESTION,
      match: `${field === "fill" ? "Fill" : "Stroke"}: ${color}`,
    };
  });
}

const cases = [
  {
    label: "manual rectangle fill",
    node: {
      id: "1",
      name: "Manual fill",
      type: "RECTANGLE",
      fills: [solidPaint(false, { r: 229 / 255, g: 241 / 255, b: 252 / 255 })],
      strokes: [],
    },
    expectedMatches: ["Fill: #E5F1FC"],
    expectedDisplay:
      "Fill: #E5F1FC → Используйте соответствующий цветовой токен из дизайн-системы.",
  },
  {
    label: "manual rectangle fill with opacity",
    node: {
      id: "1a",
      name: "Manual transparent fill",
      type: "RECTANGLE",
      fills: [
        solidPaint(false, { r: 229 / 255, g: 241 / 255, b: 252 / 255 }, 0.8),
      ],
      strokes: [],
    },
    expectedMatches: ["Fill: #E5F1FC (80%)"],
    expectedDisplay:
      "Fill: #E5F1FC (80%) → Используйте соответствующий цветовой токен из дизайн-системы.",
  },
  {
    label: "variable-bound fill and stroke",
    node: {
      id: "2",
      name: "Tokenized",
      type: "FRAME",
      fills: [solidPaint(true)],
      strokes: [solidPaint(true)],
    },
    expectedMatches: [],
  },
  {
    label: "node-level stroke variable binding",
    node: {
      id: "3",
      name: "Node binding",
      type: "INSTANCE",
      fills: [],
      strokes: [solidPaint()],
      boundVariables: { strokes: [{ id: "stroke-token" }] },
    },
    expectedMatches: [],
  },
  {
    label: "paint style without variable is an error",
    node: {
      id: "4",
      name: "Local style",
      type: "COMPONENT",
      fillStyleId: "S:local-paint",
      fills: [solidPaint()],
      strokes: [],
    },
    expectedMatches: ["Fill: #FF0000"],
  },
  {
    label: "paint style id without variable is an error",
    node: {
      id: "4a",
      name: "Paint style id",
      type: "RECTANGLE",
      fills: [{ ...solidPaint(), styleId: "S:library-paint" }],
      strokes: [],
    },
    expectedMatches: ["Fill: #FF0000"],
  },
  {
    label: "manual text color in styled segment",
    node: {
      id: "5",
      name: "Mixed text",
      type: "TEXT",
      fills: Symbol("mixed"),
      strokes: [],
      getStyledTextSegments() {
        return [{ fills: [solidPaint()] }];
      },
    },
    expectedMatches: ["Fill: #FF0000"],
  },
  {
    label: "unsupported node is skipped",
    node: {
      id: "6",
      name: "Group",
      type: "GROUP",
      fills: [solidPaint()],
      strokes: [solidPaint()],
    },
    expectedMatches: [],
  },
  {
    label: "hidden solid paint is skipped",
    node: {
      id: "7",
      name: "Hidden fill",
      type: "ELLIPSE",
      fills: [{ ...solidPaint(), visible: false }],
      strokes: [],
    },
    expectedMatches: [],
  },
];

let failed = 0;

for (const testCase of cases) {
  const issues = checkColorToken(testCase.node);
  const matches = issues.map((issue) => issue.match);

  if (matches.join(",") !== testCase.expectedMatches.join(",")) {
    console.error(
      `FAIL ${testCase.label}: expected ${testCase.expectedMatches}, got`,
      issues,
    );
    failed++;
    continue;
  }

  for (const issue of issues) {
    if (
      issue.ruleId !== COLOR_TOKEN_RULE ||
      issue.message !== "" ||
      issue.replacement !== COLOR_TOKEN_SUGGESTION
    ) {
      console.error(`FAIL ${testCase.label}: wrong issue shape`, issue);
      failed++;
    }

    const display = `${issue.match} → ${issue.replacement}`;
    if (testCase.expectedDisplay && display !== testCase.expectedDisplay) {
      console.error(
        `FAIL ${testCase.label}: expected display "${testCase.expectedDisplay}", got`,
        display,
      );
      failed++;
    }
  }

  console.log(`ok: ${testCase.label}`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);
