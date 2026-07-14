import type {
  FigmaRule,
  FigmaRuleContext,
  LintIssue,
  RuleCatalogEntry,
} from "../types";
import { isEffectivelyVisible } from "../visibility";
import { ColorTokenCheck } from "./rules/color-token-check";
import { deprecatedComponentCheck } from "./rules/deprecated-component-check";
import { radiusTokenCheck } from "./rules/radius-token-check";
import { spacingFromSpaceRule } from "./rules/spacing-from-space";
import { UnusedGapCheck } from "./rules/unused-gap-check";

type FigmaRuleHitWithNode = ReturnType<FigmaRule["check"]>[number] & {
  node?: SceneNode;
};

const FIGMA_RULES: FigmaRule[] = [
  spacingFromSpaceRule,
  UnusedGapCheck,
  ColorTokenCheck,
  radiusTokenCheck,
  deprecatedComponentCheck,
];

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
