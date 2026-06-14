import type { Rule } from "../types";

/**
 * Ловит суммы с одной цифрой в копейках перед валютой: «40,4 ₽», «120,5 $» и т.п.
 * Нулевые копейки вроде «50,0 ₽» обрабатывает правило zero-cents.
 */
const INCOMPLETE_CENTS_REGEX =
  /(\d[\d\s]*),([1-9])(?!\d)(\s*[₽$€¥£₸₼])/g;

export const incompleteCentsRule: Rule = {
  id: "incomplete-cents",
  name: "Дописываем копейки до двух знаков",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Копейки пишем через запятую без пробелов. Если есть хотя бы одна копейка — в дробной части всегда две цифры. Если копеек в сумме нет — не показываем их.",
    "Копейки могут отличаться от суммы по размеру и цвету. Для правильного написания используйте компоненты Amount (для веба) и List / AccountInfo (для мобилы). Их можно найти в файле 01 ✅ Headers & Text, Tabel & List.",
    "В таблицах и списках, где суммы нужно сравнивать по правому краю, показываем копейки везде — даже если это 50,00. Так данные легче сравнивать.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(INCOMPLETE_CENTS_REGEX)) {
      if (match.index === undefined) continue;

      const [, integerPart, centDigit, currencyPart] = match;
      const fixed = `${integerPart},${centDigit}0${currencyPart}`;

      issues.push({
        ruleId: "incomplete-cents",
        message: "",
        match: match[0],
        replacement: fixed,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
