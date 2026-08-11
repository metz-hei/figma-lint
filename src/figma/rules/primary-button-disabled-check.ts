import type { FigmaRule, FigmaRuleHit } from "../../types";

const PRIMARY_BUTTON_DISABLED_RULE_ID = "PrimaryButtonDisabledCheck";
const PRIMARY_BUTTON_DISABLED_TITLE = "Primary Button не должна быть Disabled";
const PRIMARY_BUTTON_DISABLED_MESSAGE =
  "Кнопка формы должна оставаться активной.";

const PRIMARY_BUTTON_PATTERN = /(?:primary.*button|button.*primary)/iu;
const DISABLED_PATTERN = /disabled/iu;
const AUTH_FORM_PATTERN =
  /(?:login|sign\s+in|authorization|auth|авторизация|вход)/iu;

function isComponentLikeNode(
  node: SceneNode,
): node is ComponentNode | InstanceNode {
  return node.type === "COMPONENT" || node.type === "INSTANCE";
}

function isPrimaryButton(node: SceneNode): boolean {
  let current: BaseNode | null = node;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (
      "name" in current &&
      PRIMARY_BUTTON_PATTERN.test(current.name)
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isDisabledComponentProperty(
  properties: InstanceNode["componentProperties"],
): boolean {
  return Object.entries(properties).some(
    ([name, property]) =>
      (name.toLowerCase() === "variant" || name.toLowerCase() === "state") &&
      typeof property.value === "string" &&
      DISABLED_PATTERN.test(property.value),
  );
}

function isDisabled(node: ComponentNode | InstanceNode): boolean {
  if (DISABLED_PATTERN.test(node.name)) {
    return true;
  }

  if (
    node.variantProperties &&
    Object.entries(node.variantProperties).some(
      ([name, value]) =>
        (name.toLowerCase() === "variant" || name.toLowerCase() === "state") &&
        DISABLED_PATTERN.test(value),
    )
  ) {
    return true;
  }

  return node.type === "INSTANCE" && isDisabledComponentProperty(node.componentProperties);
}

function isInsideAuthForm(node: SceneNode): boolean {
  let current = node.parent;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if (
      (current.type === "COMPONENT" ||
        current.type === "COMPONENT_SET" ||
        current.type === "FRAME") &&
      AUTH_FORM_PATTERN.test(current.name)
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

export function collectPrimaryButtonNodes(
  roots: readonly SceneNode[] = figma.currentPage.children,
): SceneNode[] {
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

  for (const root of roots) {
    walk(root);
  }

  return nodes;
}

export const PrimaryButtonDisabledCheck = {
  id: PRIMARY_BUTTON_DISABLED_RULE_ID,
  name: PRIMARY_BUTTON_DISABLED_TITLE,
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [
    "Основная кнопка отправки формы всегда должна быть активной.",
    "Если обязательные поля не заполнены, по нажатию запускается валидация формы: подсвечиваются ошибки и выполняется прокрутка к первому ошибочному полю.",
    "Исключение — формы авторизации.",
  ],
  check(node: SceneNode) {
    if (
      !isComponentLikeNode(node) ||
      !isPrimaryButton(node) ||
      !isDisabled(node) ||
      isInsideAuthForm(node)
    ) {
      return [];
    }

    const hit: FigmaRuleHit = {
      ruleId: PRIMARY_BUTTON_DISABLED_RULE_ID,
      message: PRIMARY_BUTTON_DISABLED_MESSAGE,
      match: node.name,
      replacement: "",
      start: 0,
      end: 0,
    };

    return [hit];
  },
} satisfies FigmaRule;
