import type {
  FigmaRuleContext,
  LintIssue,
  RuleCatalogEntry,
} from "../types";
import { isEffectivelyVisible } from "../visibility";
import { spacingFromSpaceRule } from "./rules/spacing-from-space";

const FIGMA_RULES = [spacingFromSpaceRule];

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

  return nodes.flatMap((node) => {
    if (!isEffectivelyVisible(node)) {
      return [];
    }

    return rules.flatMap((rule) =>
      rule.check(node, context).map((hit) => ({
        ...hit,
        ruleId: rule.id,
        issueKind: "node" as const,
        severity: rule.severity,
        type: rule.type,
        ruleName: rule.name,
        ruleGuide: rule.guide,
        nodeId: node.id,
        nodeName: node.name,
        text: "",
      })),
    );
  });
}
