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
  AutoLayoutComponentCheck,
  collectAutoLayoutComponentNodes,
} from "./figma/rules/auto-layout-component-check";
import {
  collectRadiusBoundVariableIds,
  collectRadiusNodes,
  radiusTokenCheck,
} from "./figma/rules/radius-token-check";
import {
  collectPrimaryButtonInstances,
  PrimaryButtonDisabledCheck,
} from "./figma/rules/primary-button-disabled-check";
import { ColorTokenCheck } from "./figma/rules/color-token-check";
import { collectNamingNodes, NamingCheck } from "./figma/rules/naming-check";
import { collectSpacingBoundVariableIds } from "./figma/rules/spacing-from-space";
import { collectAutoLayoutNodes } from "./figma/walker";
import { getScanRoots } from "./figma/scope";
import type { LintIssue } from "./types";

export { getFigmaRulesCatalog, lintSceneNodes };

export async function lintAutoLayoutNodes(
  enabledRuleIds?: ReadonlySet<string>,
  roots?: readonly SceneNode[],
): Promise<LintIssue[]> {
  const scanRoots = roots ?? getScanRoots();
  const nodes = collectAutoLayoutNodes(scanRoots);
  const autoLayoutRuleIds = new Set(
    enabledRuleIds ?? getFigmaRulesCatalog().map((rule) => rule.id),
  );
  autoLayoutRuleIds.delete(deprecatedComponentCheck.id);
  autoLayoutRuleIds.delete(radiusTokenCheck.id);
  autoLayoutRuleIds.delete(AutoLayoutComponentCheck.id);
  autoLayoutRuleIds.delete(PrimaryButtonDisabledCheck.id);
  autoLayoutRuleIds.delete(ColorTokenCheck.id);
  autoLayoutRuleIds.delete(NamingCheck.id);
  const boundVariableIds = new Set<string>();

  for (const node of nodes) {
    for (const id of collectSpacingBoundVariableIds(node)) {
      boundVariableIds.add(id);
    }
  }

  const radiusNodes =
    enabledRuleIds === undefined || enabledRuleIds.has(radiusTokenCheck.id)
      ? collectRadiusNodes(scanRoots)
      : [];

  for (const node of radiusNodes) {
    for (const id of collectRadiusBoundVariableIds(node)) {
      boundVariableIds.add(id);
    }
  }

  const context = await createFigmaRuleContext(boundVariableIds);
  const issues = lintSceneNodes(nodes, context, autoLayoutRuleIds);
  const isColorTokenCheckEnabled =
    enabledRuleIds === undefined || enabledRuleIds.has(ColorTokenCheck.id);
  const isAutoLayoutComponentCheckEnabled =
    enabledRuleIds === undefined ||
    enabledRuleIds.has(AutoLayoutComponentCheck.id);

  if (isColorTokenCheckEnabled) {
    issues.push(
      ...lintSceneNodes(
        [...scanRoots],
        context,
        new Set([ColorTokenCheck.id]),
      ),
    );
  }

  if (isAutoLayoutComponentCheckEnabled) {
    const autoLayoutComponentNodes = collectAutoLayoutComponentNodes(scanRoots);
    const autoLayoutComponentIssues = lintSceneNodes(
      autoLayoutComponentNodes,
      context,
      new Set([AutoLayoutComponentCheck.id]),
    );

    issues.push(...autoLayoutComponentIssues);
  }

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
        collectDeprecatedComponentNodes(scanRoots),
        context,
        new Set([deprecatedComponentCheck.id]),
      ),
    );
  }

  if (
    enabledRuleIds === undefined ||
    enabledRuleIds.has(PrimaryButtonDisabledCheck.id)
  ) {
    issues.push(
      ...lintSceneNodes(
        collectPrimaryButtonInstances(scanRoots),
        context,
        new Set([PrimaryButtonDisabledCheck.id]),
      ),
    );
  }

  if (enabledRuleIds === undefined || enabledRuleIds.has(NamingCheck.id)) {
    issues.push(
      ...lintSceneNodes(
        collectNamingNodes(scanRoots),
        context,
        new Set([NamingCheck.id]),
      ),
    );
  }

  return issues;
}
