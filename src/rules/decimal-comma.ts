import type { Rule } from "../types";

/**
 * Ловит суммы с точкой вместо запятой перед валютой: «50.50 ₽», «120.0 $» и т.п.
 */
const DECIMAL_COMMA_REGEX = /\d+\.\d+\s*[₽$€¥]/g;

export const decimalCommaRule: Rule = {
  id: "decimal-comma",
  name: "Копейки ставятся через запятую",
  severity: "error",
  guide: [
    "Копейки пишем через запятую без пробелов. Если есть хотя бы одна копейка — в дробной части всегда две цифры. Если копеек в сумме нет — не показываем их.",
    "Копейки могут отличаться от суммы по размеру и цвету. Для правильного написания используйте компоненты Amount (для веба) и List / AccountInfo (для мобилы). Их можно найти в файле 01 ✅ Headers & Text, Tabel & List.",
    "В таблицах и списках, где суммы нужно сравнивать по правому краю, показываем копейки везде — даже если это 50,00. Так данные легче сравнивать.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(DECIMAL_COMMA_REGEX)) {
      if (match.index === undefined) continue;

      const fixed = match[0].replace(".", ",");

      issues.push({
        ruleId: "decimal-comma",
        message: `Копейки через запятую: «${match[0].trim()}» → «${fixed.trim()}»`,
        severity: "error",
        match: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
