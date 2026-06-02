import type { Rule } from "../types";

/**
 * Ловит суммы с нулевыми копейками перед валютой: «50,00 ₽», «120,0 $» и т.п.
 *
 * Исходный паттерн: [,][0]{0,}\s[₽|$|€|¥]
 * В JS: запятая + нули + пробел + символ валюты.
 */
const ZERO_CENTS_REGEX = /,\s*0+\s*[₽$€¥]/g;

export const zeroCentsRule: Rule = {
  id: "zero-cents",
  name: "Копейки в суммах",
  severity: "error",
  guide: [
    "Копейки пишем через запятую без пробелов. Если есть хотя бы одна копейка — в дробной части всегда две цифры. Если копеек в сумме нет — не показываем их.",
    "Копейки могут отличаться от суммы по размеру и цвету. Для правильного написания используйте компоненты Amount (для веба) и List / AccountInfo (для мобилы). Их можно найти в файле 01 ✅ Headers & Text, Tabel & List.",
    "В таблицах и списках, где суммы нужно сравнивать по правому краю, показываем копейки везде — даже если это 50,00. Так данные легче сравнивать.",
  ],
  check(text, context) {
    if (context.inLayerNamed("td")) return [];

    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(ZERO_CENTS_REGEX)) {
      if (match.index === undefined) continue;

      issues.push({
        ruleId: "zero-cents",
        message: `Не показывай нулевые копейки: «${match[0].trim()}» → убери ,00`,
        severity: "error",
        match: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
