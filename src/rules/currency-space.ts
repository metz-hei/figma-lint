import type { Rule } from "../types";

/**
 * Ловит суммы без пробела перед валютой: «50₽», «99€», «100$» и т.п.
 */
const CURRENCY_SPACE_REGEX = /\d[₽$€¥£₸₼]/g;

export const currencySpaceRule: Rule = {
  id: "currency-space",
  name: "Символ валюты пишется отдельно от числа",
  severity: "error",
  guide: [
    "Если сумма в рублях — используем знак ₽. Если в долларах — $. В обоих случаях знак ставим после суммы, через неразрывный пробел.",
    "Если знак ₽ недоступен по техническим причинам — пишем руб. с точкой.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(CURRENCY_SPACE_REGEX)) {
      if (match.index === undefined) continue;

      const digit = match[0][0];
      const currency = match[0].slice(1);

      issues.push({
        ruleId: "currency-space",
        message: "",
        severity: "error",
        match: match[0],
        replacement: `${digit} ${currency}`,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
