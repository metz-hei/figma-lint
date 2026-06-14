import type { FigmaRule, FigmaRuleContext, FigmaRuleHit } from "../types";

/**
 * Ловит gap и padding без токена из группы Space: «gap: 16» вместо «Space-4», «padding top: 8» без variable и т.п.
 */
export const SPACE_VARIABLE_PREFIX = /^Space-\d+/;

type SpacingField =
  | "itemSpacing"
  | "counterAxisSpacing"
  | "gridRowGap"
  | "gridColumnGap"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft";

const FIELD_LABELS: Record<SpacingField, string> = {
  itemSpacing: "gap",
  counterAxisSpacing: "gap между рядами",
  gridRowGap: "gap между рядами",
  gridColumnGap: "gap между колонками",
  paddingTop: "padding top",
  paddingRight: "padding right",
  paddingBottom: "padding bottom",
  paddingLeft: "padding left",
};

type AutoLayoutNode = SceneNode &
  AutoLayoutMixin & {
    boundVariables?: {
      itemSpacing?: VariableAlias;
      counterAxisSpacing?: VariableAlias;
      gridRowGap?: VariableAlias;
      gridColumnGap?: VariableAlias;
      paddingTop?: VariableAlias;
      paddingRight?: VariableAlias;
      paddingBottom?: VariableAlias;
      paddingLeft?: VariableAlias;
    };
  };

export function isSpacingSpecified(value: number): boolean {
  return value !== 0;
}

export function isSpaceVariableName(name: string): boolean {
  return SPACE_VARIABLE_PREFIX.test(name);
}

export function checkSpacingBinding(
  ruleId: string,
  field: SpacingField,
  value: number,
  boundVariableId: string | undefined,
  variablesById: ReadonlyMap<string, { name: string }>,
): FigmaRuleHit | null {
  if (!isSpacingSpecified(value)) {
    return null;
  }

  const fieldLabel = FIELD_LABELS[field];

  if (!boundVariableId) {
    return {
      ruleId,
      message: "Привяжите токен из группы Space",
      match: `${fieldLabel}: ${value}`,
      replacement: "",
      start: 0,
      end: 0,
    };
  }

  const variable = variablesById.get(boundVariableId);
  if (!variable) {
    return {
      ruleId,
      message: "Variable не найдена",
      match: `${fieldLabel}: ${value}`,
      replacement: "",
      start: 0,
      end: 0,
    };
  }

  if (!isSpaceVariableName(variable.name)) {
    return {
      ruleId,
      message: `Привязана «${variable.name}»`,
      match: `${fieldLabel}: ${value}`,
      replacement: "",
      start: 0,
      end: 0,
    };
  }

  return null;
}

function isAutoLayoutNode(node: SceneNode): node is AutoLayoutNode {
  return "layoutMode" in node && node.layoutMode !== "NONE";
}

function getBoundVariableId(
  node: AutoLayoutNode,
  field: SpacingField,
): string | undefined {
  return node.boundVariables?.[field]?.id;
}

export function getSpacingFieldsForNode(node: AutoLayoutNode): SpacingField[] {
  const fields: SpacingField[] = [
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ];

  if (node.layoutMode === "GRID") {
    fields.unshift("gridRowGap", "gridColumnGap");
    return fields;
  }

  fields.unshift("itemSpacing");

  if (node.layoutWrap === "WRAP") {
    fields.push("counterAxisSpacing");
  }

  return fields;
}

export function collectSpacingBoundVariableIds(node: SceneNode): string[] {
  if (!isAutoLayoutNode(node)) {
    return [];
  }

  const ids: string[] = [];

  for (const field of getSpacingFieldsForNode(node)) {
    const id = getBoundVariableId(node, field);
    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

export const spacingFromSpaceRule = {
  id: "spacing-from-space",
  name: "Отступы задаются через группу токенов Space",
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [
    "Для указания отступов gap или padding используем токены из группы Space",
  ],
  check(node: SceneNode, ctx: FigmaRuleContext) {
    if (!isAutoLayoutNode(node)) {
      return [];
    }

    const issues: FigmaRuleHit[] = [];
    const ruleId = spacingFromSpaceRule.id;

    for (const field of getSpacingFieldsForNode(node)) {
      const value = node[field];
      const boundVariableId = getBoundVariableId(node, field);
      const hit = checkSpacingBinding(
        ruleId,
        field,
        value,
        boundVariableId,
        ctx.variablesById,
      );

      if (hit) {
        issues.push(hit);
      }
    }

    return issues;
  },
} satisfies FigmaRule;
