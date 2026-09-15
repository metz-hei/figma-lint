import type { FigmaRule, FigmaRuleContext, FigmaRuleHit } from "../../types";
import { getScanRoots } from "../scope";

export const RADIUS_TOKEN_TITLE = "Радиус вне дизайн-системы";
export const RADIUS_TOKEN_DESCRIPTION =
  "Все радиусы задаются токенами из коллекции Radius.";
export const RADIUS_TOKEN_SUGGESTION =
  "Привяжите токен из коллекции Radius";

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
    message: "",
    match: `Radius: ${value}`,
    replacement: RADIUS_TOKEN_SUGGESTION,
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

export function collectRadiusNodes(
  roots: readonly SceneNode[] = getScanRoots(),
): SceneNode[] {
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

  for (const root of roots) {
    walk(root);
  }

  return nodes;
}

export const radiusTokenCheck = {
  id: "radius-token-check",
  name: RADIUS_TOKEN_TITLE,
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [RADIUS_TOKEN_DESCRIPTION],
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
