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
  collectPrimaryButtonNodes,
  PrimaryButtonDisabledCheck,
} from "./figma/rules/primary-button-disabled-check";
import { ColorTokenCheck } from "./figma/rules/color-token-check";
import {
  collectNamingNodes,
  NamingCheck,
} from "./figma/rules/naming-check";
import { collectSpacingBoundVariableIds } from "./figma/rules/spacing-from-space";
import { collectAutoLayoutNodes } from "./figma/walker";
import type { LintIssue } from "./types";

export { getFigmaRulesCatalog, lintSceneNodes };

function collectAutoLayoutComponentDiagnostics(nodes: readonly SceneNode[]) {
  const checkedNodeIds = new Set<string>();
  const diagnostics = {
    sceneNodes: nodes.length,
    components: 0,
    componentSets: 0,
    frames: 0,
    groups: 0,
  };

  const walk = (node: SceneNode) => {
    if (
      checkedNodeIds.has(node.id) ||
      node.visible === false
    ) {
      return;
    }

    checkedNodeIds.add(node.id);

    if (node.type === "COMPONENT") {
      diagnostics.components++;
    } else if (node.type === "COMPONENT_SET") {
      diagnostics.componentSets++;
    } else if (node.type === "FRAME") {
      diagnostics.frames++;
    } else if (node.type === "GROUP") {
      diagnostics.groups++;
    }

    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const node of nodes) {
    walk(node);
  }

  return diagnostics;
}

function getCurrentPageScanRoots(): readonly SceneNode[] {
  const selection = figma.currentPage.selection;
  return selection.length > 0 ? selection : figma.currentPage.children;
}

export async function lintAutoLayoutNodes(
  enabledRuleIds?: ReadonlySet<string>,
  roots?: readonly SceneNode[],
): Promise<LintIssue[]> {
  const scanRoots = roots ?? getCurrentPageScanRoots();
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

  if (enabledRuleIds === undefined || enabledRuleIds.has(NamingCheck.id)) {
    issues.push(
      ...lintSceneNodes(
        collectNamingNodes(scanRoots),
        context,
        new Set([NamingCheck.id]),
      ),
    );
  }

  console.log(
    `[AutoLayoutComponentCheck] enabled=${isAutoLayoutComponentCheckEnabled}`,
  );

  if (isAutoLayoutComponentCheckEnabled) {
    const autoLayoutComponentNodes = collectAutoLayoutComponentNodes(scanRoots);
    const diagnostics = collectAutoLayoutComponentDiagnostics(
      autoLayoutComponentNodes,
    );

    console.log(
      `[AutoLayoutComponentCheck] invoked=true; sceneNodes=${diagnostics.sceneNodes}; COMPONENT=${diagnostics.components}; COMPONENT_SET=${diagnostics.componentSets}; FRAME=${diagnostics.frames}; GROUP=${diagnostics.groups}`,
    );

    const autoLayoutComponentIssues = lintSceneNodes(
      autoLayoutComponentNodes,
      context,
      new Set([AutoLayoutComponentCheck.id]),
    );

    console.log(
      `[AutoLayoutComponentCheck] issues=${autoLayoutComponentIssues.length}`,
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
        collectPrimaryButtonNodes(scanRoots),
        context,
        new Set([PrimaryButtonDisabledCheck.id]),
      ),
    );
  }

  return issues;
}
