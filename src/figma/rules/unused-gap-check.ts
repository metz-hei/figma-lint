import type { FigmaRule, FigmaRuleHit } from "../../types";

const UNUSED_GAP_MESSAGE =
  "У контейнера задан gap, но внутри только один элемент. Gap не используется.";

type AutoLayoutNodeWithChildren = SceneNode &
  AutoLayoutMixin &
  ChildrenMixin;

function isAutoLayoutNodeWithChildren(
  node: SceneNode,
): node is AutoLayoutNodeWithChildren {
  return (
    "layoutMode" in node &&
    node.layoutMode !== "NONE" &&
    "children" in node
  );
}

export function hasUnusedGap(node: AutoLayoutNodeWithChildren): boolean {
  return node.itemSpacing > 0 && node.children.length < 2;
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
    if (!isAutoLayoutNodeWithChildren(node) || !hasUnusedGap(node)) {
      return [];
    }

    const hit: FigmaRuleHit = {
      ruleId: UnusedGapCheck.id,
      message: UNUSED_GAP_MESSAGE,
      match: `gap: ${node.itemSpacing}`,
      replacement: "",
      start: 0,
      end: 0,
    };

    return [hit];
  },
} satisfies FigmaRule;
