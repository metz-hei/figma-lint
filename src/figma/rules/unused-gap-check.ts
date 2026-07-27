import type { FigmaRule, FigmaRuleHit } from "../../types";

export const UNUSED_GAP_TITLE = "Gap используется только между элементами";
export const UNUSED_GAP_DESCRIPTION =
  "Gap нужен только когда внутри Auto Layout два или больше элементов.";
export const UNUSED_GAP_SUGGESTION =
  "Уберите gap";

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
  // ponytail: скрытые дети тоже считаем — gap часто оставлен под них
  if ("layoutPositioning" in node && node.layoutPositioning === "ABSOLUTE") {
    return false;
  }

  return true;
}

export function countAutoLayoutChildren(
  node: EditableAutoLayoutContainer,
): number {
  return node.children.filter(participatesInAutoLayout).length;
}

export function hasUnusedGap(node: EditableAutoLayoutContainer): boolean {
  return node.itemSpacing > 0 && countAutoLayoutChildren(node) < 2;
}

export const UnusedGapCheck = {
  id: "unused-gap-check",
  name: UNUSED_GAP_TITLE,
  severity: "warning" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [UNUSED_GAP_DESCRIPTION],
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
      message: "",
      match: `gap: ${node.itemSpacing}`,
      replacement: UNUSED_GAP_SUGGESTION,
      start: 0,
      end: 0,
    };

    return [hit];
  },
} satisfies FigmaRule;
