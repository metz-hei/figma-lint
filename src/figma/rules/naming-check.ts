import type { FigmaRule, FigmaRuleHit } from "../../types";

type NamingNode = ComponentNode | ComponentSetNode;
type NamingHit = FigmaRuleHit & { node: SceneNode };

const RULE_ID = "naming-check";

export const NAMING_TITLE = "Нейминг";
// Описание правила для списка настроек (SettingsView). В guide не попадает:
// guide показывается в карточке ошибки, где нужны только формулировки ошибок.
export const NAMING_DESCRIPTION =
  "Наименование компонентов, пропсов и их значений";
export const NAMING_PLATFORM_PREFIX =
  "Название компонента должно начинаться с маркировки платформы: 💻, 🍎 или 🤖";
export const NAMING_PLATFORM_SPACE =
  "Маркировка платформы и название компонента должны быть разделены пробелом";
export const NAMING_MOBILE_PAIR_ORDER =
  "Иконки мобильной платформы пишутся в порядке 🍎🤖";
export const NAMING_MOBILE_PAIR_SPACE =
  "Маркировка мобильной платформы пишется без пробела между иконками 🍎🤖";
export const NAMING_SUFFIX_POSITION =
  "Маркировка бизнеса 💙 или 🧡 ставится в конце названия";
export const NAMING_BOTH_BUSINESS = "Компонент для обоих бизнесов не маркируется";
export const NAMING_WORD_SPACES =
  "Слова в названии компонента разделяются пробелами";
export const NAMING_COMPONENT_FORMAT =
  "Название компонента набирается латиницей в стиле Title Case, без цифр и специальных символов";
export const NAMING_PROP_NAME_FORMAT =
  "Название пропсов набирается латиницей в стиле Title Case, без цифр и специальных символов";
export const NAMING_PROP_VALUE_FORMAT =
  "Значение пропсов набирается латиницей в стиле Title Case, без цифр и специальных символов";
export const NAMING_SUFFIX_SPACE =
  "Маркировка бизнеса отбивается от названия компонента пробелом";

// Эмодзи — суррогатные пары, поэтому во всех классах обязателен флаг `u`:
// без него класс матчит отдельный суррогат и replace рвёт эмодзи пополам.
const TITLE_CASE = /^[A-Z][a-z]*(?: [A-Z][a-z]*)*$/u;
// Маркировка платформы: 💻, одиночные 🍎/🤖 или пара 🍎🤖.
const PLATFORM_PREFIX = /^(?:💻|🍎🤖|🍎|🤖)/u;
const MOBILE_PAIR_ORDER = /^🤖🍎/u;
const MOBILE_PAIR_SPACED = /^[🍎🤖]\s+[🍎🤖]/u;
const BUSINESS_MARK = /[💙🧡]/u;
const BUSINESS_MARK_AT_START = /^[💙🧡]/u;
const BUSINESS_MARK_GLOBAL = /[💙🧡]/gu;
const BUSINESS_PAIR = /💙\s*🧡|🧡\s*💙/u;
const GLUED_BUSINESS = /[^\s💙🧡][💙🧡]/u;
const TRAILING_BUSINESS = / ?[💙🧡]$/u;
const WORD_SEPARATOR = /[-_]/u;
const IGNORED_COMPONENT_SYMBOLS = /[.()]/gu;

function visible(node: SceneNode): boolean {
  return node.visible !== false;
}

export function collectNamingNodes(roots: readonly SceneNode[]): SceneNode[] {
  const result: SceneNode[] = [];
  const seen = new Set<string>();

  const walk = (node: SceneNode) => {
    if (!visible(node) || seen.has(node.id)) return;
    seen.add(node.id);

    if (
      (node.type === "COMPONENT" && !isVariantOfComponentSet(node)) ||
      node.type === "COMPONENT_SET"
    ) {
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

function formatProblems(value: string, error: string): string[] {
  return TITLE_CASE.test(value) ? [] : [error];
}

function componentNameProblems(name: string): string[] {
  // 3. Парная маркировка мобильной платформы пишется только в порядке 🍎🤖,
  // иначе 🤖🍎 прошло бы проверку как одиночная 🤖.
  if (MOBILE_PAIR_ORDER.test(name)) return [NAMING_MOBILE_PAIR_ORDER];
  if (MOBILE_PAIR_SPACED.test(name)) return [NAMING_MOBILE_PAIR_SPACE];

  // 1–2. Маркировка платформы и пробел после неё.
  const prefix = name.match(PLATFORM_PREFIX)?.[0];
  if (prefix === undefined) return [NAMING_PLATFORM_PREFIX];

  const body = name.slice(prefix.length);

  // 4. Марка бизнеса вплотную к платформе — это прежде всего проблема
  // позиции марки, а не отсутствующего пробела.
  if (BUSINESS_MARK_AT_START.test(body)) return [NAMING_SUFFIX_POSITION];

  if (!body.startsWith(" ")) return [NAMING_PLATFORM_SPACE];

  const rest = body.trim();

  // 5. Компонент для обоих бизнесов не маркируется.
  if (BUSINESS_PAIR.test(rest)) return [NAMING_BOTH_BUSINESS];

  const problems: string[] = [];

  // 10. Марка бизнеса не отбита пробелом от названия.
  if (GLUED_BUSINESS.test(rest)) problems.push(NAMING_SUFFIX_SPACE);

  // 4. Марка бизнеса допустима только в самом конце названия: снимаем
  // последнюю марку, и если в названии остались ещё 💙/🧡 — они стоят не там.
  const core = rest.replace(TRAILING_BUSINESS, "");
  if (BUSINESS_MARK.test(core)) problems.push(NAMING_SUFFIX_POSITION);

  // 7. Имя проверяем без марок бизнеса; точки и круглые скобки допустимы.
  const words = core
    .replace(BUSINESS_MARK_GLOBAL, " ")
    .replace(IGNORED_COMPONENT_SYMBOLS, " ")
    .replace(/ {2,}/g, " ")
    .trim();

  // 6. Разделители слов — только пробелы.
  if (WORD_SEPARATOR.test(words)) {
    problems.push(NAMING_WORD_SPACES);
  } else if (!TITLE_CASE.test(words)) {
    problems.push(NAMING_COMPONENT_FORMAT);
  }

  return problems;
}

function hit(node: NamingNode, value: string, problems: string[]): NamingHit {
  return {
    ruleId: RULE_ID,
    node,
    message: problems.join("; "),
    match: value,
    replacement: "",
    start: 0,
    end: 0,
  };
}

function addNamedValue(
  issues: NamingHit[],
  node: NamingNode,
  value: string,
  formatError: string,
) {
  const problems = formatProblems(value, formatError);
  if (problems.length > 0) issues.push(hit(node, value, problems));
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
  name: NAMING_TITLE,
  severity: "error" as const,
  type: "Figma" as const,
  category: "figma" as const,
  description: NAMING_DESCRIPTION,
  guide: [
    NAMING_PLATFORM_PREFIX,
    NAMING_PLATFORM_SPACE,
    NAMING_MOBILE_PAIR_ORDER,
    NAMING_MOBILE_PAIR_SPACE,
    NAMING_SUFFIX_POSITION,
    NAMING_BOTH_BUSINESS,
    NAMING_WORD_SPACES,
    NAMING_COMPONENT_FORMAT,
    NAMING_PROP_NAME_FORMAT,
    NAMING_PROP_VALUE_FORMAT,
    NAMING_SUFFIX_SPACE,
  ],
  check(node: SceneNode) {
    if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") return [];
    if (node.type === "COMPONENT" && isVariantOfComponentSet(node)) return [];

    const issues: NamingHit[] = [];
    const checkedProperties = new Set<string>();
    const checkedValues = new Set<string>();

    // Имя варианта внутри сета Figma генерирует сама из значений свойств
    // («State=Default, Size=Large») — переименовать его нельзя, поэтому
    // проверяем только названия и значения props.
    if (!isVariantOfComponentSet(node)) {
      const nameProblems = componentNameProblems(node.name);
      if (nameProblems.length > 0) {
        issues.push(hit(node, node.name, nameProblems));
      }
    }

    const definitions = getComponentPropertyDefinitions(node);
    for (const [apiName, definition] of Object.entries(definitions ?? {})) {
      const propertyName = displayPropertyName(apiName);
      if (!checkedProperties.has(propertyName)) {
        checkedProperties.add(propertyName);
        addNamedValue(issues, node, propertyName, NAMING_PROP_NAME_FORMAT);
      }

      if (definition.type === "VARIANT") {
        for (const value of definition.variantOptions ?? []) {
          const key = `${propertyName}\0${value}`;
          if (!checkedValues.has(key)) {
            checkedValues.add(key);
            addNamedValue(issues, node, value, NAMING_PROP_VALUE_FORMAT);
          }
        }
      } else if (definition.type === "TEXT" && typeof definition.defaultValue === "string") {
        addNamedValue(
          issues,
          node,
          definition.defaultValue,
          NAMING_PROP_VALUE_FORMAT,
        );
      }
    }

    if (node.type === "COMPONENT" && node.variantProperties) {
      for (const [propertyName, value] of Object.entries(node.variantProperties)) {
        if (!checkedProperties.has(propertyName)) {
          checkedProperties.add(propertyName);
          addNamedValue(issues, node, propertyName, NAMING_PROP_NAME_FORMAT);
        }
        const key = `${propertyName}\0${value}`;
        if (!checkedValues.has(key)) {
          checkedValues.add(key);
          addNamedValue(issues, node, value, NAMING_PROP_VALUE_FORMAT);
        }
      }
    }

    return issues;
  },
} satisfies FigmaRule;
