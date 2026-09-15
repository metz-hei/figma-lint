import type { FigmaRule, FigmaRuleHit } from "../../types";
import { getScanRoots } from "../scope";

const PRIMARY_BUTTON_DISABLED_RULE_ID = "PrimaryButtonDisabledCheck";
const PRIMARY_BUTTON_DISABLED_TITLE = "Primary Button не должна быть Disabled";
const PRIMARY_BUTTON_DISABLED_MESSAGE =
  "Кнопка формы должна оставаться активной";

const PRIMARY_BUTTON_PATTERN = /(?:primary.*button|button.*primary)/iu;
const DISABLED_PATTERN = /disabled/iu;
const AUTH_FORM_PATTERN =
  /(?:login|sign\s+in|authorization|auth|авторизация|вход)/iu;

function isInstanceNode(node: SceneNode): node is InstanceNode {
  return node.type === "INSTANCE";
}

function isStatePropertyName(name: string): boolean {
  const baseName = name.split("#")[0].trim().toLowerCase();

  return baseName === "variant" || baseName === "state";
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
      isStatePropertyName(name) &&
      typeof property.value === "string" &&
      DISABLED_PATTERN.test(property.value),
  );
}

function isDisabled(node: InstanceNode): boolean {
  if (DISABLED_PATTERN.test(node.name)) {
    return true;
  }

  if (
    node.variantProperties &&
    Object.entries(node.variantProperties).some(
      ([name, value]) => isStatePropertyName(name) && DISABLED_PATTERN.test(value),
    )
  ) {
    return true;
  }

  return isDisabledComponentProperty(node.componentProperties);
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

/**
 * Собирает только инстансы: мастер-компоненты в дизайн-системе намеренно
 * содержат вариант Disabled, и проверка на них срабатывать не должна.
 */
export function collectPrimaryButtonInstances(
  roots: readonly SceneNode[] = getScanRoots(),
): SceneNode[] {
  const nodes: SceneNode[] = [];

  const walk = (node: SceneNode) => {
    if (!node.visible) {
      return;
    }

    if (isInstanceNode(node)) {
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
    "Основная кнопка отправки формы всегда активна.",
    "Она запускает валидацию формы, подсвечивает ошибки и помогает пользователю сориентироваться.",
    "Исключение — формы авторизации.",
  ],
  check(node: SceneNode) {
    if (
      !isInstanceNode(node) ||
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
