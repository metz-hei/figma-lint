import type { FigmaRule, FigmaRuleHit } from "../../types";
import { isEffectivelyVisible } from "../../visibility";

type AutoLayoutComponentHit = FigmaRuleHit & {
  node: SceneNode;
};

const AUTO_LAYOUT_COMPONENT_RULE_ID = "auto-layout-component-check";
const AUTO_LAYOUT_COMPONENT_TITLE =
  "Компонент собран не полностью на Auto Layout";
const FRAME_MESSAGE =
  "Frame без Auto Layout → Включите Auto Layout для этого слоя.";
const GROUP_MESSAGE =
  "Group → Замените Group на Auto Layout.";

function isComponentStructureRoot(node: SceneNode): boolean {
  return node.type === "COMPONENT" || node.type === "COMPONENT_SET";
}

export function collectAutoLayoutComponentNodes(
  roots: readonly SceneNode[] = figma.currentPage.children,
): SceneNode[] {
  const nodes: SceneNode[] = [];
  const isPageWideScan = roots === figma.currentPage.children;
  const collectedNodeIds = new Set<string>();

  const addNode = (node: SceneNode) => {
    if (collectedNodeIds.has(node.id)) {
      return;
    }

    collectedNodeIds.add(node.id);
    nodes.push(node);
  };

  const walk = (node: SceneNode) => {
    if (node.visible === false || node.type === "INSTANCE") {
      return;
    }

    if (!isPageWideScan) {
      addNode(node);
      return;
    }

    if (isComponentStructureRoot(node)) {
      addNode(node);
      return;
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

function hasDisabledAutoLayout(node: SceneNode): boolean {
  return "layoutMode" in node && node.layoutMode === "NONE";
}

function createHit(node: SceneNode, message: string): AutoLayoutComponentHit {
  return {
    ruleId: AUTO_LAYOUT_COMPONENT_RULE_ID,
    node,
    message: `${node.name}\n${message}`,
    match: node.name,
    replacement: "",
    start: 0,
    end: 0,
  };
}

export const AutoLayoutComponentCheck = {
  id: AUTO_LAYOUT_COMPONENT_RULE_ID,
  name: AUTO_LAYOUT_COMPONENT_TITLE,
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [
    "Компоненты и варианты должны быть полностью собраны на Auto Layout без Group и обычных Frame.",
  ],
  check(node: SceneNode) {
    if (
      (node.type !== "FRAME" &&
        node.type !== "GROUP" &&
        !isComponentStructureRoot(node)) ||
      !isEffectivelyVisible(node) ||
      node.type === "INSTANCE"
    ) {
      return [];
    }

    const issues: AutoLayoutComponentHit[] = [];
    const checkedNodeIds = new Set<string>();
    const problemNodeIds = new Set<string>();

    console.log(
      `[AutoLayoutComponentCheck] check root type=${node.type}; name=${node.name}; id=${node.id}; layoutMode=${"layoutMode" in node ? node.layoutMode : "n/a"}`,
    );

    const addIssue = (problemNode: SceneNode, message: string) => {
      if (problemNodeIds.has(problemNode.id)) {
        console.log(
          `[AutoLayoutComponentCheck] duplicate issue skipped type=${problemNode.type}; name=${problemNode.name}; id=${problemNode.id}`,
        );
        return;
      }

      problemNodeIds.add(problemNode.id);
      issues.push(createHit(problemNode, message));
    };

    const walk = (current: SceneNode) => {
      const layoutMode = "layoutMode" in current ? current.layoutMode : "n/a";

      if (checkedNodeIds.has(current.id)) {
        console.log(
          `[AutoLayoutComponentCheck] visit skipped duplicate type=${current.type}; name=${current.name}; id=${current.id}; layoutMode=${layoutMode}`,
        );
        return;
      }

      if (current.visible === false) {
        console.log(
          `[AutoLayoutComponentCheck] visit skipped hidden type=${current.type}; name=${current.name}; id=${current.id}; layoutMode=${layoutMode}`,
        );
        return;
      }

      checkedNodeIds.add(current.id);

      if (current.type === "GROUP") {
        console.log(
          `[AutoLayoutComponentCheck] visit violation=GROUP type=${current.type}; name=${current.name}; id=${current.id}; layoutMode=${layoutMode}`,
        );
        addIssue(current, GROUP_MESSAGE);
      } else if (current.type === "FRAME" && hasDisabledAutoLayout(current)) {
        console.log(
          `[AutoLayoutComponentCheck] visit violation=FRAME_NONE type=${current.type}; name=${current.name}; id=${current.id}; layoutMode=${layoutMode}`,
        );
        addIssue(current, FRAME_MESSAGE);
      } else {
        console.log(
          `[AutoLayoutComponentCheck] visit ok type=${current.type}; name=${current.name}; id=${current.id}; layoutMode=${layoutMode}`,
        );
      }

      if ("children" in current) {
        for (const child of current.children) {
          walk(child);
        }
      }
    };

    walk(node);

    return issues;
  },
} satisfies FigmaRule;
