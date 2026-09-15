import type { FigmaRule, FigmaRuleHit } from "../../types";

export const COLOR_TOKEN_RULE = "ColorTokenCheck";
export const COLOR_TOKEN_TITLE = "Цвет вне дизайн-системы";
export const COLOR_TOKEN_DESCRIPTION =
  "Цвет слоя не связан с дизайн-системой. Подключите соответствующий токен из дизайн-системы.";
export const COLOR_TOKEN_SUGGESTION =
  "Подключите токен";

type PaintField = "fills" | "strokes";

type NodeWithPaints = SceneNode & {
  fills?: ReadonlyArray<Paint> | typeof figma.mixed;
  strokes?: ReadonlyArray<Paint>;
  boundVariables?: {
    fills?: VariableAlias[];
    strokes?: VariableAlias[];
    textRangeFills?: VariableAlias[];
  };
};

type TextNodeWithSegments = TextNode & {
  getStyledTextSegments?: (
    fields: ["fills"],
  ) => Array<{
    fills: ReadonlyArray<Paint> | typeof figma.mixed;
  }>;
};

type ColorTokenHit = FigmaRuleHit & {
  node: SceneNode;
  paintField: PaintField;
};

const checkedNodeIds = new Set<string>();
let clearCheckedNodeIdsScheduled = false;

function scheduleCheckedNodeIdsClear(): void {
  if (clearCheckedNodeIdsScheduled) {
    return;
  }

  clearCheckedNodeIdsScheduled = true;
  setTimeout(() => {
    checkedNodeIds.clear();
    clearCheckedNodeIdsScheduled = false;
  }, 0);
}

function hasPaints(node: SceneNode): node is NodeWithPaints {
  return "fills" in node || "strokes" in node;
}

function isPaintList(value: unknown): value is ReadonlyArray<Paint> {
  return Array.isArray(value);
}

function isVisibleSolidPaint(paint: Paint): paint is SolidPaint {
  return paint.type === "SOLID" && paint.visible !== false;
}

function colorChannelToHex(value: number): string {
  const channel = Math.round(Math.max(0, Math.min(1, value)) * 255);
  return channel.toString(16).padStart(2, "0").toUpperCase();
}

function formatSolidPaintColor(paint: SolidPaint): string {
  const hex = `#${colorChannelToHex(paint.color.r)}${colorChannelToHex(
    paint.color.g,
  )}${colorChannelToHex(paint.color.b)}`;
  const opacity = paint.opacity ?? 1;
  const percent = Math.round(Math.max(0, Math.min(1, opacity)) * 100);

  return percent === 100 ? hex : `${hex} (${percent}%)`;
}

function getNodePath(node: SceneNode): string {
  const names: string[] = [];
  let current: BaseNode | null = node;

  while (current && current.type !== "DOCUMENT" && current.type !== "PAGE") {
    if ("name" in current && current.name) {
      names.unshift(current.name);
    }
    current = current.parent;
  }

  return names.join("\n→ ");
}

function isPaintBoundToVariable(
  paint: SolidPaint,
  node: NodeWithPaints,
  field: PaintField,
  index: number,
): boolean {
  return Boolean(
    paint.boundVariables?.color ?? node.boundVariables?.[field]?.[index],
  );
}

export function hasManualSolidPaint(
  paints: ReadonlyArray<Paint>,
  node: NodeWithPaints,
  field: PaintField,
): boolean {
  return findManualSolidPaint(paints, node, field) !== null;
}

function findManualSolidPaint(
  paints: ReadonlyArray<Paint>,
  node: NodeWithPaints,
  field: PaintField,
): SolidPaint | null {
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

function findManualTextRangePaint(node: TextNodeWithSegments): SolidPaint | null {
  if (typeof node.getStyledTextSegments !== "function") {
    return null;
  }

  for (const segment of node.getStyledTextSegments(["fills"])) {
    if (!isPaintList(segment.fills)) {
      continue;
    }

    const paint = findManualSolidPaint(segment.fills, node, "fills");
    if (paint) {
      return paint;
    }
  }

  return null;
}

function findManualPaint(node: NodeWithPaints, field: PaintField): SolidPaint | null {
  const paints = node[field];

  if (isPaintList(paints)) {
    return findManualSolidPaint(paints, node, field);
  }

  if (node.type === "TEXT" && field === "fills") {
    return findManualTextRangePaint(node as TextNodeWithSegments);
  }

  return null;
}

function createColorTokenHit(
  node: SceneNode,
  field: PaintField,
  paint: SolidPaint,
): ColorTokenHit {
  const color = formatSolidPaintColor(paint);

  const hit = {
    node,
    ruleId: COLOR_TOKEN_RULE,
    message: "",
    match: `${field === "fills" ? "fill" : "Stroke"}: ${color}`,
    replacement: COLOR_TOKEN_SUGGESTION,
    start: 0,
    end: 0,
  };

  Object.defineProperty(hit, "paintField", {
    value: field,
  });

  return hit as ColorTokenHit;
}

function getIssueKey(issue: ColorTokenHit): string {
  return [
    issue.ruleId,
    issue.node.id,
    getNodePath(issue.node),
    issue.paintField,
  ].join("::");
}

function dedupeColorIssues(issues: ColorTokenHit[]): ColorTokenHit[] {
  const seen = new Set<string>();
  const deduped: ColorTokenHit[] = [];

  for (const issue of issues) {
    const key = getIssueKey(issue);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(issue);
  }

  return deduped;
}

function checkNodeColors(node: SceneNode): ColorTokenHit[] {
  if (!hasPaints(node)) {
    return [];
  }

  const issues: ColorTokenHit[] = [];
  const manualFill = findManualPaint(node, "fills");
  const manualStroke = findManualPaint(node, "strokes");

  if (manualFill) {
    issues.push(createColorTokenHit(node, "fills", manualFill));
  }

  if (manualStroke) {
    issues.push(createColorTokenHit(node, "strokes", manualStroke));
  }

  return issues;
}

function collectColorIssues(node: SceneNode): ColorTokenHit[] {
  if (checkedNodeIds.has(node.id)) {
    return [];
  }

  checkedNodeIds.add(node.id);

  if (!node.visible) {
    return [];
  }

  const issues = checkNodeColors(node);

  if ("children" in node) {
    for (const child of node.children) {
      issues.push(...collectColorIssues(child));
    }
  }

  return issues;
}

export const ColorTokenCheck = {
  id: COLOR_TOKEN_RULE,
  name: COLOR_TOKEN_TITLE,
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [COLOR_TOKEN_DESCRIPTION],
  check(node: SceneNode) {
    scheduleCheckedNodeIdsClear();

    return dedupeColorIssues(collectColorIssues(node));
  },
} satisfies FigmaRule;
