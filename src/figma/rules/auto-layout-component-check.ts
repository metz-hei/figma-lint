import type { FigmaRule, FigmaRuleHit } from "../../types";
import { isEffectivelyVisible } from "../../visibility";
import { getScanRoots } from "../scope";

type AutoLayoutComponentHit = FigmaRuleHit & {
  node: SceneNode;
};

const AUTO_LAYOUT_COMPONENT_RULE_ID = "auto-layout-component-check";
const AUTO_LAYOUT_COMPONENT_TITLE =
  "Компонент должен быть собран на Auto Layout";
const FRAME_MESSAGE =
  "Frame → Включите Auto Layout";
const GROUP_MESSAGE =
  "Group → Включите Auto Layout";

function isComponentStructureRoot(node: SceneNode): boolean {
  return node.type === "COMPONENT" || node.type === "COMPONENT_SET";
}

export function collectAutoLayoutComponentNodes(
  roots: readonly SceneNode[] = getScanRoots(),
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
    "Компоненты и варианты должны быть собраны на Auto Layout. Без Group и Frame.",
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

    const addIssue = (problemNode: SceneNode, message: string) => {
      if (problemNodeIds.has(problemNode.id)) {
        return;
      }

      problemNodeIds.add(problemNode.id);
      issues.push(createHit(problemNode, message));
    };

    const walk = (current: SceneNode) => {
      if (checkedNodeIds.has(current.id) || current.visible === false) {
        return;
      }

      checkedNodeIds.add(current.id);

      if (current.type === "GROUP") {
        addIssue(current, GROUP_MESSAGE);
      } else if (current.type === "FRAME" && hasDisabledAutoLayout(current)) {
        addIssue(current, FRAME_MESSAGE);
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
