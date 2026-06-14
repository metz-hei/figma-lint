import { createFigmaRuleContext } from "./figma/context";
import {
  getFigmaRulesCatalog,
  lintSceneNodes,
} from "./figma/lint";
import { collectSpacingBoundVariableIds } from "./figma/rules/spacing-from-space";
import { collectAutoLayoutNodes } from "./figma/walker";
import type { LintIssue } from "./types";

export { getFigmaRulesCatalog, lintSceneNodes };

export async function lintAutoLayoutNodes(
  enabledRuleIds?: ReadonlySet<string>,
): Promise<LintIssue[]> {
  const nodes = collectAutoLayoutNodes();
  const boundVariableIds = new Set<string>();

  for (const node of nodes) {
    for (const id of collectSpacingBoundVariableIds(node)) {
      boundVariableIds.add(id);
    }
  }

  const context = await createFigmaRuleContext(boundVariableIds);
  return lintSceneNodes(nodes, context, enabledRuleIds);
}
