import type { FigmaRule, FigmaRuleContext, FigmaRuleHit } from "../../types";

const RADIUS_TOKEN_MESSAGE = (value: number) =>
  `На слое используется локальный радиус ${value}px, который не связан с токеном Radius дизайн-системы.`;

const RADIUS_VARIABLE_PREFIX = /^Radius(?:$|[-/\s])/i;

type RadiusField =
  | "cornerRadius"
  | "topLeftRadius"
  | "topRightRadius"
  | "bottomRightRadius"
  | "bottomLeftRadius";

type RadiusNode = SceneNode & {
  cornerRadius: number | PluginAPI["mixed"];
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  boundVariables?: Partial<Record<RadiusField, VariableAlias>>;
};

const RADIUS_NODE_TYPES = new Set<SceneNode["type"]>([
  "RECTANGLE",
  "FRAME",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
]);

const CORNER_FIELDS: RadiusField[] = [
  "topLeftRadius",
  "topRightRadius",
  "bottomRightRadius",
  "bottomLeftRadius",
];

function isRadiusNode(node: SceneNode): node is RadiusNode {
  return RADIUS_NODE_TYPES.has(node.type) && "cornerRadius" in node;
}

export function isRadiusSpecified(value: number): boolean {
  return value !== 0;
}

export function isRadiusVariableName(name: string): boolean {
  return RADIUS_VARIABLE_PREFIX.test(name);
}

export function checkRadiusBinding(
  ruleId: string,
  value: number,
  boundVariableId: string | undefined,
  variablesById: ReadonlyMap<string, { name: string }>,
): FigmaRuleHit | null {
  if (!isRadiusSpecified(value)) {
    return null;
  }

  const hit: FigmaRuleHit = {
    ruleId,
    message: RADIUS_TOKEN_MESSAGE(value),
    match: `corner radius: ${value}`,
    replacement: "",
    start: 0,
    end: 0,
  };

  if (!boundVariableId) {
    return hit;
  }

  const variable = variablesById.get(boundVariableId);
  if (!variable || !isRadiusVariableName(variable.name)) {
    return hit;
  }

  return null;
}

function getBoundVariableId(
  node: RadiusNode,
  field: RadiusField,
): string | undefined {
  return node.boundVariables?.[field]?.id;
}

function getRadiusFieldsForNode(node: RadiusNode): RadiusField[] {
  if (typeof node.cornerRadius === "number") {
    return ["cornerRadius"];
  }

  return CORNER_FIELDS.filter((field) => typeof node[field] === "number");
}

function getRadiusValue(node: RadiusNode, field: RadiusField): number {
  const value = node[field];
  return typeof value === "number" ? value : 0;
}

export function collectRadiusBoundVariableIds(node: SceneNode): string[] {
  if (!isRadiusNode(node)) {
    return [];
  }

  const ids: string[] = [];

  for (const field of getRadiusFieldsForNode(node)) {
    const id = getBoundVariableId(node, field);
    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

export function collectRadiusNodes(): SceneNode[] {
  const nodes: SceneNode[] = [];

  const walk = (node: SceneNode) => {
    if (!node.visible) {
      return;
    }

    if (isRadiusNode(node)) {
      nodes.push(node);
    }

    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const child of figma.currentPage.children) {
    walk(child);
  }

  return nodes;
}

export const radiusTokenCheck = {
  id: "radius-token-check",
  name: "Радиус вне дизайн-системы",
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [
    "Все радиусы скругления должны быть связаны с токенами из коллекции Radius.",
  ],
  check(node: SceneNode, ctx: FigmaRuleContext) {
    if (!isRadiusNode(node)) {
      return [];
    }

    const issues: FigmaRuleHit[] = [];
    const ruleId = radiusTokenCheck.id;

    for (const field of getRadiusFieldsForNode(node)) {
      const value = getRadiusValue(node, field);
      const hit = checkRadiusBinding(
        ruleId,
        value,
        getBoundVariableId(node, field),
        ctx.variablesById,
      );

      if (hit) {
        issues.push(hit);
      }
    }

    return issues;
  },
} satisfies FigmaRule;
