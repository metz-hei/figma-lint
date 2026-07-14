import type { FigmaRule, FigmaRuleHit } from "../../types";

const DEPRECATED_COMPONENT_MESSAGE =
  "Используется компонент, помеченный как устаревший или запрещённый для использования.";

const DEPRECATED_COMPONENT_NAME_PATTERN =
  /(?:don['’]?t\s+use|не\s+использовать)/iu;

function isComponentLikeNode(node: SceneNode): node is ComponentNode | InstanceNode {
  return node.type === "COMPONENT" || node.type === "INSTANCE";
}

export function hasDeprecatedComponentName(name: string): boolean {
  return DEPRECATED_COMPONENT_NAME_PATTERN.test(name);
}

export function collectDeprecatedComponentNodes(): SceneNode[] {
  const nodes: SceneNode[] = [];

  const walk = (node: SceneNode) => {
    if (!node.visible) {
      return;
    }

    if (isComponentLikeNode(node)) {
      nodes.push(node);
    }

    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const child of figma.currentPage.children) {
    walk(child);
  }

  return nodes;
}

export const deprecatedComponentCheck = {
  id: "deprecated-component-check",
  name: "Компонент помечен как «Не использовать»",
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [
    "Не используем компоненты и инстансы, в названии которых есть пометка «Don't use» или «Не использовать».",
  ],
  check(node: SceneNode) {
    if (
      !isComponentLikeNode(node) ||
      !hasDeprecatedComponentName(node.name)
    ) {
      return [];
    }

    const hit: FigmaRuleHit = {
      ruleId: deprecatedComponentCheck.id,
      message: DEPRECATED_COMPONENT_MESSAGE,
      match: node.name,
      replacement: "",
      start: 0,
      end: 0,
    };

    return [hit];
  },
} satisfies FigmaRule;
