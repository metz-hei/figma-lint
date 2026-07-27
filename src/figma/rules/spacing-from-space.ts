import type { FigmaRule, FigmaRuleContext, FigmaRuleHit } from "../../types";
import { isEffectivelyVisible } from "../../visibility";

/**
 * Ловит gap и padding без привязки к токену из группы Space.
 */
export const SPACING_FROM_SPACE_TITLE =
  "Отступ вне дизайн-системы";
export const SPACING_FROM_SPACE_DESCRIPTION =
  "Для указания отступов gap или padding используем токены из коллекции Space.";
export const SPACING_FROM_SPACE_SUGGESTION =
  "Привяжите токен из коллекции Space";

type SpacingField =
  | "itemSpacing"
  | "paddingTop"
  | "paddingRight"
  | "paddingBottom"
  | "paddingLeft";

const FIELD_LABELS: Record<SpacingField, string> = {
  itemSpacing: "gap",
  paddingTop: "padding top",
  paddingRight: "padding right",
  paddingBottom: "padding bottom",
  paddingLeft: "padding left",
};

type AutoLayoutNode = SceneNode &
  AutoLayoutMixin &
  Partial<AutoLayoutChildrenMixin> & {
    boundVariables?: {
      itemSpacing?: VariableAlias;
      paddingTop?: VariableAlias;
      paddingRight?: VariableAlias;
      paddingBottom?: VariableAlias;
      paddingLeft?: VariableAlias;
    };
  };

export function isSpacingSpecified(value: number): boolean {
  return value !== 0;
}

export function checkSpacingBinding(
  ruleId: string,
  field: SpacingField,
  value: number,
  boundVariableId: string | undefined,
): FigmaRuleHit | null {
  if (!isSpacingSpecified(value)) {
    return null;
  }

  const fieldLabel = FIELD_LABELS[field];

  if (!boundVariableId) {
    return {
      ruleId,
      message: "",
      match: `${fieldLabel}: ${value}`,
      replacement: SPACING_FROM_SPACE_SUGGESTION,
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
  return [
    "itemSpacing",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ];
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
  name: SPACING_FROM_SPACE_TITLE,
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [SPACING_FROM_SPACE_DESCRIPTION],
  check(node: SceneNode, ctx: FigmaRuleContext) {
    void ctx;

    if (!isEffectivelyVisible(node) || !isAutoLayoutNode(node)) {
      return [];
    }

    const issues: FigmaRuleHit[] = [];
    const ruleId = spacingFromSpaceRule.id;
    const checkedFields = new Set<SpacingField>();

    for (const field of getSpacingFieldsForNode(node)) {
      if (checkedFields.has(field)) {
        continue;
      }
      checkedFields.add(field);

      const value = node[field] ?? 0;
      const boundVariableId = getBoundVariableId(node, field);
      const hit = checkSpacingBinding(
        ruleId,
        field,
        value,
        boundVariableId,
      );

      if (hit) {
        issues.push(hit);
      }
    }

    return issues;
  },
} satisfies FigmaRule;
