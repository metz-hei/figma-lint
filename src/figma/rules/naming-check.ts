import type { FigmaRule, FigmaRuleHit } from "../../types";

type NamingNode = ComponentNode | ComponentSetNode;
type NamingHit = FigmaRuleHit & { node: SceneNode };

const RULE_ID = "naming-check";
const VALID_NAME = /^[A-Z][a-z]*(?: [A-Z][a-z]*)*$/;

function visible(node: SceneNode): boolean {
  return node.visible !== false;
}

export function collectNamingNodes(roots: readonly SceneNode[]): SceneNode[] {
  const result: SceneNode[] = [];
  const seen = new Set<string>();

  const walk = (node: SceneNode) => {
    if (!visible(node) || seen.has(node.id)) return;
    seen.add(node.id);

    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      result.push(node);
    }

    if ("children" in node) {
      for (const child of node.children) walk(child);
    }
  };

  for (const root of roots) walk(root);
  return result;
}

function displayPropertyName(apiName: string): string {
  return apiName.replace(/#\d+(?::\d+)*$/, "");
}

function validationProblems(value: string, limited: boolean): string[] {
  const problems: string[] = [];
  if (!VALID_NAME.test(value)) {
    problems.push("используйте Title Case, только латинские буквы и пробелы");
  }
  if (limited && value.split(" ").length > 2) {
    problems.push("не больше 2 слов");
  }
  if (limited && value.replace(/ /g, "").length > 13) {
    problems.push("не больше 13 букв без учёта пробелов");
  }
  return problems;
}

function componentNameProblems(name: string): string[] {
  let plainName: string;
  if (name.startsWith("💻 ")) plainName = name.slice("💻 ".length);
  else if (name.startsWith("🍎 🤖 ")) plainName = name.slice("🍎 🤖 ".length);
  else if (name.startsWith("🍎🤖 ")) plainName = name.slice("🍎🤖 ".length);
  else return ["название должно начинаться с «💻 » или «🍎🤖 »"];

  if (plainName.endsWith(" 💙") || plainName.endsWith(" 🧡")) {
    plainName = plainName.slice(0, -3);
  }

  return validationProblems(plainName, false);
}

function hit(node: NamingNode, subject: string, value: string, problems: string[]): NamingHit {
  return {
    ruleId: RULE_ID,
    node,
    message: `${subject} «${value}»: ${problems.join("; ")}.`,
    match: value,
    replacement: "",
    start: 0,
    end: 0,
  };
}

function addNamedValue(
  issues: NamingHit[],
  node: NamingNode,
  subject: string,
  value: string,
) {
  const problems = validationProblems(value, true);
  if (problems.length > 0) issues.push(hit(node, subject, value, problems));
}

function isVariantOfComponentSet(node: NamingNode): boolean {
  return node.type === "COMPONENT" && node.parent?.type === "COMPONENT_SET";
}

function getComponentPropertyDefinitions(
  node: NamingNode,
): ComponentPropertyDefinitions | null {
  if (isVariantOfComponentSet(node)) {
    return null;
  }

  try {
    return node.componentPropertyDefinitions ?? null;
  } catch {
    return null;
  }
}

export const NamingCheck = {
  id: RULE_ID,
  name: "Нейминг",
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  guide: [
    "Названия мастер-компонентов начинаются с «💻 » или «🍎🤖 ».",
    "Название компонента, props и их значения пишутся латиницей в Title Case, без цифр и специальных символов.",
    "Названия и значения props содержат не больше 2 слов и 13 букв без учёта пробелов.",
  ],
  check(node: SceneNode) {
    if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") return [];

    const issues: NamingHit[] = [];
    const checkedProperties = new Set<string>();
    const checkedValues = new Set<string>();

    // Имя варианта внутри сета Figma генерирует сама из значений свойств
    // («State=Default, Size=Large») — переименовать его нельзя, поэтому
    // проверяем только названия и значения props.
    if (!isVariantOfComponentSet(node)) {
      const nameProblems = componentNameProblems(node.name);
      if (nameProblems.length > 0) {
        issues.push(hit(node, "Название компонента", node.name, nameProblems));
      }
    }

    const definitions = getComponentPropertyDefinitions(node);
    for (const [apiName, definition] of Object.entries(definitions ?? {})) {
      const propertyName = displayPropertyName(apiName);
      if (!checkedProperties.has(propertyName)) {
        checkedProperties.add(propertyName);
        addNamedValue(issues, node, "Название prop", propertyName);
      }

      if (definition.type === "VARIANT") {
        for (const value of definition.variantOptions ?? []) {
          const key = `${propertyName}\0${value}`;
          if (!checkedValues.has(key)) {
            checkedValues.add(key);
            addNamedValue(issues, node, `Значение prop «${propertyName}»`, value);
          }
        }
      } else if (definition.type === "TEXT" && typeof definition.defaultValue === "string") {
        addNamedValue(
          issues,
          node,
          `Значение prop «${propertyName}»`,
          definition.defaultValue,
        );
      }
    }

    if (node.type === "COMPONENT" && node.variantProperties) {
      for (const [propertyName, value] of Object.entries(node.variantProperties)) {
        if (!checkedProperties.has(propertyName)) {
          checkedProperties.add(propertyName);
          addNamedValue(issues, node, "Название prop", propertyName);
        }
        const key = `${propertyName}\0${value}`;
        if (!checkedValues.has(key)) {
          checkedValues.add(key);
          addNamedValue(issues, node, `Значение prop «${propertyName}»`, value);
        }
      }
    }

    return issues;
  },
} satisfies FigmaRule;
