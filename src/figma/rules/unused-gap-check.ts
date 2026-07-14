import type { FigmaRule, FigmaRuleHit } from "../../types";

type EditableAutoLayoutContainer = SceneNode &
  AutoLayoutMixin &
  ChildrenMixin;

function isEditableContainer(node: SceneNode): node is EditableAutoLayoutContainer {
  return (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET"
  );
}

function isAutoLayoutContainer(
  node: SceneNode,
): node is EditableAutoLayoutContainer {
  return (
    isEditableContainer(node) &&
    "layoutMode" in node &&
    node.layoutMode !== "NONE" &&
    "children" in node
  );
}

function hasHiddenAncestor(node: SceneNode): boolean {
  let current = node.parent;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if ("visible" in current && current.visible === false) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isInsideInstance(node: SceneNode): boolean {
  let current = node.parent;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (current.type === "INSTANCE") {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function participatesInAutoLayout(node: SceneNode): boolean {
  if (node.visible === false) {
    return false;
  }

  if ("layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE") {
    return false;
  }

  return true;
}

export function countVisibleAutoLayoutChildren(
  node: EditableAutoLayoutContainer,
): number {
  return node.children.filter(participatesInAutoLayout).length;
}

export function hasUnusedGap(node: EditableAutoLayoutContainer): boolean {
  return node.itemSpacing > 0 && countVisibleAutoLayoutChildren(node) < 2;
}

export const UnusedGapCheck = {
  id: "unused-gap-check",
  name: "Gap используется только между элементами",
  severity: "warning" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [
    "Gap нужен только когда внутри Auto Layout два или больше элементов.",
  ],
  check(node: SceneNode) {
    if (
      !isAutoLayoutContainer(node) ||
      node.visible === false ||
      hasHiddenAncestor(node) ||
      isInsideInstance(node) ||
      !hasUnusedGap(node)
    ) {
      return [];
    }

    const hit: FigmaRuleHit = {
      ruleId: UnusedGapCheck.id,
      message: `Gap: ${node.itemSpacing}px → Уберите gap или добавьте второй элемент в Auto Layout.`,
      match: `gap: ${node.itemSpacing}`,
      replacement: "",
      start: 0,
      end: 0,
    };

    return [hit];
  },
} satisfies FigmaRule;
