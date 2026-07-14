import { createFigmaRuleContext } from "./figma/context";
import {
  getFigmaRulesCatalog,
  lintSceneNodes,
} from "./figma/lint";
import {
  collectDeprecatedComponentNodes,
  deprecatedComponentCheck,
} from "./figma/rules/deprecated-component-check";
import {
  collectRadiusBoundVariableIds,
  collectRadiusNodes,
  radiusTokenCheck,
} from "./figma/rules/radius-token-check";
import { collectSpacingBoundVariableIds } from "./figma/rules/spacing-from-space";
import { collectAutoLayoutNodes } from "./figma/walker";
import type { LintIssue } from "./types";

export { getFigmaRulesCatalog, lintSceneNodes };

export async function lintAutoLayoutNodes(
  enabledRuleIds?: ReadonlySet<string>,
): Promise<LintIssue[]> {
  const nodes = collectAutoLayoutNodes();
  const autoLayoutRuleIds = new Set(
    enabledRuleIds ?? getFigmaRulesCatalog().map((rule) => rule.id),
  );
  autoLayoutRuleIds.delete(deprecatedComponentCheck.id);
  autoLayoutRuleIds.delete(radiusTokenCheck.id);
  const boundVariableIds = new Set<string>();

  for (const node of nodes) {
    for (const id of collectSpacingBoundVariableIds(node)) {
      boundVariableIds.add(id);
    }
  }

  const radiusNodes =
    enabledRuleIds === undefined || enabledRuleIds.has(radiusTokenCheck.id)
      ? collectRadiusNodes()
      : [];

  for (const node of radiusNodes) {
    for (const id of collectRadiusBoundVariableIds(node)) {
      boundVariableIds.add(id);
    }
  }

  const context = await createFigmaRuleContext(boundVariableIds);
  const issues = lintSceneNodes(nodes, context, autoLayoutRuleIds);

  if (radiusNodes.length > 0) {
    issues.push(
      ...lintSceneNodes(radiusNodes, context, new Set([radiusTokenCheck.id])),
    );
  }

  if (
    enabledRuleIds === undefined ||
    enabledRuleIds.has(deprecatedComponentCheck.id)
  ) {
    issues.push(
      ...lintSceneNodes(
        collectDeprecatedComponentNodes(),
        context,
        new Set([deprecatedComponentCheck.id]),
      ),
    );
  }

  return issues;
}
