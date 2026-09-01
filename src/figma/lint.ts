import type {
  FigmaRule,
  FigmaRuleContext,
  LintIssue,
  RuleCatalogEntry,
} from "../types";
import { isEffectivelyVisible } from "../visibility";
import { AutoLayoutComponentCheck } from "./rules/auto-layout-component-check";
import { ColorTokenCheck } from "./rules/color-token-check";
import { deprecatedComponentCheck } from "./rules/deprecated-component-check";
import { radiusTokenCheck } from "./rules/radius-token-check";
import { PrimaryButtonDisabledCheck } from "./rules/primary-button-disabled-check";
import { spacingFromSpaceRule } from "./rules/spacing-from-space";
import { UnusedGapCheck } from "./rules/unused-gap-check";
import { NamingCheck } from "./rules/naming-check";

type FigmaRuleHitWithNode = ReturnType<FigmaRule["check"]>[number] & {
  node?: SceneNode;
};

const FIGMA_RULES: FigmaRule[] = [
  AutoLayoutComponentCheck,
  spacingFromSpaceRule,
  UnusedGapCheck,
  ColorTokenCheck,
  radiusTokenCheck,
  deprecatedComponentCheck,
  PrimaryButtonDisabledCheck,
  NamingCheck,
];

console.log(
  `[AutoLayoutComponentCheck] registered=${FIGMA_RULES.some(
    (rule) => rule.id === AutoLayoutComponentCheck.id,
  )}; rules=${FIGMA_RULES.map((rule) => rule.id).join(",")}`,
);

export function getFigmaRulesCatalog(): RuleCatalogEntry[] {
  return FIGMA_RULES.map(({ id, name, category, guide }) => ({
    id,
    name,
    category,
    guide,
  }));
}

export function lintSceneNodes(
  nodes: SceneNode[],
  context: FigmaRuleContext,
  enabledRuleIds?: ReadonlySet<string>,
): LintIssue[] {
  const rules =
    enabledRuleIds === undefined
      ? FIGMA_RULES
      : FIGMA_RULES.filter((rule) => enabledRuleIds.has(rule.id));

  const issues: LintIssue[] = [];

  for (const node of nodes) {
    if (!isEffectivelyVisible(node)) {
      continue;
    }

    for (const rule of rules) {
      for (const hit of rule.check(node, context)) {
        const { node: hitNode, ...publicHit } = hit as FigmaRuleHitWithNode;
        const issueNode = hitNode ?? node;

        issues.push({
          ...publicHit,
          ruleId: rule.id,
          issueKind: "node" as const,
          severity: rule.severity,
          type: rule.type,
          ruleName: rule.name,
          ruleGuide: rule.guide,
          nodeId: issueNode.id,
          nodeName: issueNode.name,
          text: "",
        });
      }
    }
  }

  return issues;
}
